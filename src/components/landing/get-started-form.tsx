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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  contactName: z.string().min(2, { message: "Contact name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  website: z.string().url({ message: "Please enter a valid URL." }),
  siteCoverage: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one site.",
  }),
  planTier: z.enum(['Starter', 'Standard', 'Premium'], {
    required_error: "You need to select a plan tier.",
  }),
  bannerOption: z.enum(['upload', 'design']),
  bannerFile: z.any().optional(),
  logoFile: z.any().optional(),
  brandColors: z.string().optional(),
  shortMessage: z.string().max(100).optional(),
  offer: z.string().optional(),
  restrictions: z.string().optional(),
}).refine(data => {
    if (data.bannerOption === 'upload') {
        return !!data.bannerFile && data.bannerFile.length > 0;
    }
    return true;
}, {
    message: 'Please upload your banner ad.',
    path: ['bannerFile'],
})
.refine(data => {
    if (data.bannerOption === 'design') {
        return !!data.logoFile && data.logoFile.length > 0;
    }
    return true;
}, {
    message: 'Please upload your company logo.',
    path: ['logoFile'],
});


export function GetStartedForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      siteCoverage: [],
      bannerOption: 'upload',
    },
  });
  
  const bannerOption = form.watch('bannerOption');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    console.log(values);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: "Submission Received!",
      description: "We've got your details. We'll be in touch shortly.",
    });
    router.push('/thank-you');
    setIsSubmitting(false);
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
            <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
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
                <FormLabel>Phone Number</FormLabel>
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
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website or Desired Link Destination</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/offer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="siteCoverage"
          render={() => (
            <FormItem>
              <FormLabel>Select Site Coverage</FormLabel>
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

        <FormField
          control={form.control}
          name="planTier"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Select Plan Tier</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col md:flex-row gap-4"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Starter" />
                    </FormControl>
                    <FormLabel className="font-normal">Starter</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Standard" />
                    </FormControl>
                    <FormLabel className="font-normal">Standard</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Premium" />
                    </FormControl>
                    <FormLabel className="font-normal">Premium</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bannerOption"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Banner Ad</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col md:flex-row gap-4"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="upload" />
                    </FormControl>
                    <FormLabel className="font-normal">I have a banner to upload</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="design" />
                    </FormControl>
                    <FormLabel className="font-normal">I need a banner designed</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
        
        {bannerOption === 'upload' && (
          <FormField
            control={form.control}
            name="bannerFile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload Banner</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {bannerOption === 'design' && (
          <div className="space-y-6 p-6 border rounded-lg bg-background">
            <h3 className="text-lg font-medium">Banner Design Details</h3>
             <FormField
                control={form.control}
                name="logoFile"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Upload Logo</FormLabel>
                    <FormControl>
                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="brandColors"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Brand Colors (Optional)</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g. #1a2b3c, blue, etc." {...field} />
                    </FormControl>
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="shortMessage"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Short Message (10-15 words)</FormLabel>
                    <FormControl>
                    <Textarea placeholder="e.g. 'Grand Opening this Saturday!'" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="offer"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Offer or Call to Action (Optional)</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g. 'Get 20% Off Your First Order'" {...field} />
                    </FormControl>
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="restrictions"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Any Restrictions (Optional)</FormLabel>
                    <FormControl>
                    <Textarea placeholder="e.g. 'Offer valid for new customers only.'" {...field} />
                    </FormControl>
                </FormItem>
                )}
            />
          </div>
        )}


        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Proceed to Payment'
          )}
        </Button>
      </form>
    </Form>
  );
}
