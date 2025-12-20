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

const formSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  contactName: z.string().min(2, { message: "Contact name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  siteCoverage: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one site.",
  }),
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
      siteCoverage: [],
    },
  });
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    console.log(values);

    // Simulate API call to store lead
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Information Received!",
      description: "Here are the available pricing plans.",
    });
    router.push('/pricing');
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
                <FormLabel>Full Name</FormLabel>
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
            'View Pricing'
          )}
        </Button>
      </form>
    </Form>
  );
}
