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
import { 
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, addDoc } from 'firebase/firestore';

const formSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  contactName: z.string().min(2, { message: "Contact name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid cell phone number." }),
  siteCoverage: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one site.",
  }),
});


export function GetStartedForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { auth, firestore } = useFirebase();

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
    if (!auth || !firestore) {
      toast({
        title: "Error",
        description: "Services are not available. Please try again later.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Check if user already exists in Firestore 'users' collection
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where("email", "==", values.email));
      const querySnapshot = await getDocs(q);

      let userId;

      if (!querySnapshot.empty) {
        // User exists, use their existing ID
        const existingUserDoc = querySnapshot.docs[0];
        userId = existingUserDoc.id;
        // Optionally update their info
        const userDocRef = doc(firestore, 'users', userId);
        await setDoc(userDocRef, {
            contactName: values.contactName,
            businessName: values.businessName,
            phone: values.phone,
        }, { merge: true });
         toast({
          title: "Welcome Back!",
          description: "We've updated your info. Redirecting to pricing...",
        });

      } else {
        // User doesn't exist, create a new record. We won't create an auth user yet.
        const newUserRef = await addDoc(collection(firestore, "users"), {
            email: values.email,
            contactName: values.contactName,
            businessName: values.businessName,
            phone: values.phone,
            role: 'user',
        });
        userId = newUserRef.id;
        toast({
          title: "Information Received!",
          description: "Let's find a plan that works for you.",
        });
      }
      
      // We don't need to sign in or link accounts here.
      // The user will be prompted to create a password-based account
      // during the checkout flow if they are not already logged in.
      router.push('/pricing');

    } catch(error: any) {
       console.error("Error processing form:", error);
       toast({
         title: "An Error Occurred",
         description: error.message || "Could not process your request. Please try again.",
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
            'View Pricing'
          )}
        </Button>
      </form>
    </Form>
  );
}
