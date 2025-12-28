'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { sendEmail } from '@/lib/firebase/email';
import { wrapEmailContent, replaceEmailPlaceholders, generateEmailUrls } from '@/lib/email-utils';
import { defaultTemplates } from '@/lib/email-templates';
import {
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  calculateLeadScore,
  type LeadSource,
} from '@/lib/types';

const formSchema = z.object({
  businessName: z
    .string()
    .min(2, { message: 'Business name must be at least 2 characters.' }),
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z
    .string()
    .min(10, { message: 'Please enter a valid phone number.' }),
  siteCoverage: z.array(z.string()).refine((value) => value && value.length > 0, {
    message: 'Please select at least one site.',
  }),
});

export function GetStartedForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();

  // Capture UTM parameters on mount
  const [utmParams, setUtmParams] = useState<{
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    source: LeadSource;
  }>({
    source: LEAD_SOURCES.WEBSITE,
  });

  useEffect(() => {
    // Extract UTM parameters from URL
    const utmSource = searchParams.get('utm_source') || undefined;
    const utmMedium = searchParams.get('utm_medium') || undefined;
    const utmCampaign = searchParams.get('utm_campaign') || undefined;
    const utmTerm = searchParams.get('utm_term') || undefined;
    const utmContent = searchParams.get('utm_content') || undefined;
    const ref = searchParams.get('ref') || undefined;

    // Determine lead source based on UTM parameters
    let source: LeadSource = LEAD_SOURCES.WEBSITE;
    if (utmSource) {
      const sourceLower = utmSource.toLowerCase();
      if (sourceLower.includes('google')) source = LEAD_SOURCES.GOOGLE_ADS;
      else if (
        sourceLower.includes('facebook') ||
        sourceLower.includes('fb') ||
        sourceLower.includes('instagram')
      )
        source = LEAD_SOURCES.FACEBOOK_ADS;
      else if (
        sourceLower.includes('twitter') ||
        sourceLower.includes('linkedin') ||
        sourceLower.includes('social')
      )
        source = LEAD_SOURCES.SOCIAL_MEDIA;
      else if (sourceLower.includes('email') || sourceLower.includes('newsletter'))
        source = LEAD_SOURCES.EMAIL_CAMPAIGN;
      else if (sourceLower.includes('partner')) source = LEAD_SOURCES.PARTNER;
    }
    if (ref) source = LEAD_SOURCES.REFERRAL;

    setUtmParams({
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      source,
    });
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      siteCoverage: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!firestore) {
      toast({
        title: 'Error',
        description: 'Services are not available. Please try again later.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const contactName = `${values.firstName} ${values.lastName}`.trim();

      // Create lead data with enhanced tracking fields
      const leadData = {
        ...values,
        contactName: contactName,

        // Pipeline status - new leads start in 'new' stage
        stage: LEAD_STAGES.NEW,
        priority: LEAD_PRIORITIES.MEDIUM,

        // Source tracking from UTM parameters
        source: utmParams.source,
        utmSource: utmParams.utmSource || null,
        utmMedium: utmParams.utmMedium || null,
        utmCampaign: utmParams.utmCampaign || null,
        utmTerm: utmParams.utmTerm || null,
        utmContent: utmParams.utmContent || null,

        // Calculate initial lead score
        score: calculateLeadScore({
          email: values.email,
          phone: values.phone,
          businessName: values.businessName,
          siteCoverage: values.siteCoverage,
          source: utmParams.source,
          stage: LEAD_STAGES.NEW,
        }),

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create the lead document
      const leadDocRef = await addDoc(collection(firestore, 'leads'), leadData);

      // Send auto-response email with pricing link
      try {
        // Try to fetch the pricing_link email template from Firestore, fall back to local template
        let template: { subject: string; html: string } | null = null;

        try {
          const templateRef = doc(firestore, 'emailTemplates', 'pricing_link');
          const templateSnap = await getDoc(templateRef);
          if (templateSnap.exists()) {
            template = templateSnap.data() as { subject: string; html: string };
          }
        } catch (firestoreError) {
          console.warn('Could not fetch template from Firestore, using local template:', firestoreError);
        }

        // Fall back to local template if Firestore template doesn't exist
        if (!template) {
          const localTemplate = defaultTemplates.find(t => t.id === 'pricing_link');
          if (localTemplate) {
            template = { subject: localTemplate.subject, html: localTemplate.html };
          }
        }

        if (template) {
          const urls = generateEmailUrls(leadDocRef.id);

          // Replace placeholders in subject and body
          const emailData = {
            contactName: contactName,
            businessName: values.businessName,
            pricingLink: urls.pricingLink,
          };

          const processedSubject = replaceEmailPlaceholders(template.subject, emailData);
          const processedHtml = wrapEmailContent(replaceEmailPlaceholders(template.html, emailData));

          // Send the email
          await sendEmail(firestore, {
            to: values.email,
            subject: processedSubject,
            html: processedHtml,
          }, {
            recipientId: leadDocRef.id,
            templateId: 'pricing_link',
            triggerType: 'interest_form_submission',
          });
        } else {
          console.error('No pricing_link template found in Firestore or local templates');
        }
      } catch (emailError) {
        // Log but don't fail the form submission if email fails
        console.error('Error sending auto-response email:', emailError);
      }

      toast({
        title: 'Success!',
        description: "We've received your information. Redirecting to pricing...",
      });

      // Redirect to pricing page after successful submission
      const params = new URLSearchParams({
        businessName: values.businessName,
        email: values.email,
      });
      router.push(`/pricing?${params.toString()}`);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast({
        title: 'An Error Occurred',
        description: 'Could not submit your information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const siteCoverageOptions = [
    { id: 'wesley-chapel', label: 'WesleyChapelCommunity.com' },
    { id: 'pasco', label: 'PascoCommunity.com' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
        {/* Business Name - Full Width */}
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium text-sm md:text-base">
                Business Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Your business name"
                  className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-secondary focus:ring-brand-secondary/20 transition-colors text-base rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs md:text-sm" />
            </FormItem>
          )}
        />

        {/* First Name / Last Name Row */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium text-sm md:text-base">
                  First Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="First"
                    className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-secondary focus:ring-brand-secondary/20 transition-colors text-base rounded-xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs md:text-sm" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium text-sm md:text-base">
                  Last Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Last"
                    className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-secondary focus:ring-brand-secondary/20 transition-colors text-base rounded-xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs md:text-sm" />
              </FormItem>
            )}
          />
        </div>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium text-sm md:text-base">
                Email Address
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-secondary focus:ring-brand-secondary/20 transition-colors text-base rounded-xl"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs md:text-sm" />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium text-sm md:text-base">
                Phone Number
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-secondary focus:ring-brand-secondary/20 transition-colors text-base rounded-xl"
                  inputMode="tel"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs md:text-sm" />
            </FormItem>
          )}
        />

        {/* Site Selection - Mobile-optimized touch targets */}
        <FormField
          control={form.control}
          name="siteCoverage"
          render={() => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium text-sm md:text-base">
                Which sites interest you?
              </FormLabel>
              <div className="grid grid-cols-1 gap-2 md:gap-3 mt-2">
                {siteCoverageOptions.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="siteCoverage"
                    render={({ field }) => {
                      const isChecked = field.value?.includes(item.id);
                      return (
                        <FormItem key={item.id}>
                          <FormControl>
                            <label
                              className={`flex items-center gap-3 p-3.5 md:p-4 rounded-xl border-2 cursor-pointer transition-all touch-manipulation active:scale-[0.98] ${
                                isChecked
                                  ? 'border-success bg-success-light/40'
                                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 active:border-gray-400'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item.id
                                        )
                                      );
                                }}
                                className="h-5 w-5 data-[state=checked]:bg-success data-[state=checked]:border-success"
                              />
                              <span
                                className={`font-medium text-sm md:text-base ${
                                  isChecked ? 'text-brand-primary' : 'text-gray-700'
                                }`}
                              >
                                {item.label}
                              </span>
                              {isChecked && (
                                <Check className="h-4 w-4 text-success ml-auto flex-shrink-0" />
                              )}
                            </label>
                          </FormControl>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage className="text-xs md:text-sm" />
            </FormItem>
          )}
        />

        {/* Submit Button - Large touch target */}
        <Button
          type="submit"
          size="lg"
          variant="success"
          className="w-full h-12 md:h-14 text-base md:text-lg touch-manipulation rounded-xl shadow-lg shadow-success/25"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              See Pricing & Plans
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

        {/* Micro-copy for trust */}
        <p className="text-center text-xs text-gray-500 pt-1">
          No credit card required. View pricing instantly.
        </p>
      </form>
    </Form>
  );
}
