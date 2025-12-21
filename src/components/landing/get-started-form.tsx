
'use client';
import { useState } from 'react';
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
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { sendEmail } from '@/lib/firebase/email';
import type { EmailTemplate } from '@/app/(app)/automated-emails/page';

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
  const { firestore } = useFirebase();

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
      // 1. Create a new document in the 'leads' collection
      const leadDocRef = await addDoc(collection(firestore, "leads"), {
        ...values,
        contactName: contactName,
        createdAt: serverTimestamp(),
      });

      // 2. Send the automated email associated with this trigger
      const templatesQuery = query(
        collection(firestore, 'emailTemplates'), 
        where('triggerName', '==', 'interest_form_submission')
      );
      const templateSnap = await getDocs(templatesQuery);

      if (!templateSnap.empty) {
        const templateDoc = templateSnap.docs[0]; // Use the first template found for this trigger
        const template = templateDoc.data() as EmailTemplate;

        const pricingParams = new URLSearchParams({
          businessName: values.businessName,
          email: values.email,
        });
        const pricingLink = `${window.location.origin}/pricing?${pricingParams.toString()}`;

        // Replace placeholders
        const subject = template.subject
            .replace(/{{contactName}}/g, contactName)
            .replace(/{{businessName}}/g, values.businessName);
        
        const html = template.html
            .replace(/{{contactName}}/g, contactName)
            .replace(/{{businessName}}/g, values.businessName)
            .replace(/{{pricingLink}}/g, pricingLink);

        await sendEmail(firestore, {
          to: values.email,
          subject: subject,
          html: html,
        }, {
          recipientId: leadDocRef.id,
          templateId: template.id,
          triggerType: 'interest_form_submission',
        });

      } else {
        console.warn("Could not find an email template for the 'interest_form_submission' trigger. Skipping email.");
      }


      toast({
        title: "Information Received!",
        description: "We've sent you an email with a link to our pricing. Let's find a plan that works for you.",
      });
      
      // 3. Redirect to pricing page after successful submission
      const params = new URLSearchParams({
        businessName: values.businessName,
        email: values.email,
      });
      router.push(`/pricing?${params.toString()}`);

    } catch(error: any) {
       console.error("Error creating lead and sending email:", error);
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

    