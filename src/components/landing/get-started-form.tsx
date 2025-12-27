
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
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LEAD_STAGES, LEAD_SOURCES, LEAD_PRIORITIES, calculateLeadScore, type LeadSource } from '@/lib/types';

const formSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid cell phone number." }),
  siteCoverage: z.array(z.string()).refine((value) => value && value.length > 0, {
    message: "You have to select at least one site.",
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
      else if (sourceLower.includes('facebook') || sourceLower.includes('fb') || sourceLower.includes('instagram')) source = LEAD_SOURCES.FACEBOOK_ADS;
      else if (sourceLower.includes('twitter') || sourceLower.includes('linkedin') || sourceLower.includes('social')) source = LEAD_SOURCES.SOCIAL_MEDIA;
      else if (sourceLower.includes('email') || sourceLower.includes('newsletter')) source = LEAD_SOURCES.EMAIL_CAMPAIGN;
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
        title: "Error",
        description: "Services are not available. Please try again later.",
        variant: "destructive",
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

      // The ONLY action is to create the lead.
      // This is the most critical step and removing other DB writes
      // will prevent permission errors for unauthenticated users.
      await addDoc(collection(firestore, "leads"), leadData);

      toast({
        title: "Information Received!",
        description: "We've sent you an email with a link to our pricing. Let's find a plan that works for you.",
      });
      
      // Redirect to pricing page after successful submission
      const params = new URLSearchParams({
        businessName: values.businessName,
        email: values.email,
      });
      router.push(`/pricing?${params.toString()}`);

    } catch(error: any) {
       console.error("Error creating lead:", error);
       toast({
         title: "An Error Occurred",
         description: "Could not submit your information. Please try again.",
         variant: 'destructive'
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. The Local Cafe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Jane" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                    <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cell Phone Number</FormLabel>
                <FormControl>
                    <Input type="tel" placeholder="e.g. (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="siteCoverage"
          render={() => (
            <FormItem>
              <FormLabel>Which site(s) are you interested in?</FormLabel>
              {siteCoverageOptions.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="siteCoverage"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
               <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'View Pricing & Continue'
          )}
        </Button>
      </form>
    </Form>
  );
}
