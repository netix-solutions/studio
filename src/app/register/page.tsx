
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirebase } from '@/firebase';
import { registerWithEmail } from '@/lib/firebase/auth';
import { Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import { createCheckout } from '@/lib/stripe';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountExistsDialog, setShowAccountExistsDialog] = useState(false);
  const [existingEmail, setExistingEmail] = useState('');
  const emailFromQuery = searchParams.get('email');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: emailFromQuery || '',
      password: '',
    },
  });

  useEffect(() => {
    if(emailFromQuery) {
        form.reset({ email: emailFromQuery, password: '' });
    }
  }, [emailFromQuery, form]);

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
        // Check if there is a pending purchase
        const selectedPriceId = sessionStorage.getItem('selectedPriceId');
        if (selectedPriceId && user.uid && user.email) {
            // Clear the stored price ID and initiate checkout
            sessionStorage.removeItem('selectedPriceId');
            createCheckout(firestore, user.uid, user.email, selectedPriceId, window.location.origin + '/account')
                .catch(error => {
                    console.error("Stripe checkout error after registration:", error);
                    toast({
                        title: 'Error starting purchase',
                        description: error.message || 'Could not redirect to checkout. Please log in and try again from the pricing page.',
                        variant: 'destructive',
                    });
                     router.replace('/account');
                });
        } else {
            // If no plan was selected, just go to the dashboard
             toast({
                title: 'Account Created!',
                description: 'You have been successfully registered and logged in.',
            });
            router.replace('/account');
        }
    }
  }, [user, isUserLoading, router, toast, firestore]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) {
        toast({
            title: 'Error',
            description: 'Authentication service not available. Please try again later.',
            variant: 'destructive',
        });
        return;
    }
    setIsSubmitting(true);
    try {
      await registerWithEmail(auth, values.email, values.password);
      // The useEffect hook will handle redirection and checkout.
    } catch (error: any) {
      console.error('Registration failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        setExistingEmail(values.email);
        setShowAccountExistsDialog(true);
      } else {
         toast({
          title: 'Error',
          description: 'There was an error registering. Please try again.',
          variant: 'destructive',
        });
      }
      setIsSubmitting(false);
    }
  }
  
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight font-headline">
              Create Your Account
            </CardTitle>
            <CardDescription>Register to complete your ad purchase.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Set a password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                   {isSubmitting ? (
                      <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                      </>
                  ) : (
                      'Create Account & Proceed'
                  )}
                </Button>
              </form>
            </Form>

             <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button variant="link" className="p-0 h-auto" asChild>
                   <Link href="/login">
                      Sign In
                  </Link>
                </Button>
              </p>
            </div>

          </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/">
                        <Home className="mr-2 h-4 w-4" />
                        Return to Homepage
                    </Link>
                </Button>
            </CardFooter>
        </Card>
      </main>

      <AlertDialog open={showAccountExistsDialog} onOpenChange={setShowAccountExistsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Exists</AlertDialogTitle>
            <AlertDialogDescription>
              An account with the email <span className="font-medium">{existingEmail}</span> already exists.
              Would you like to log in or reset your password?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
             <Button variant="outline" onClick={() => router.push('/forgot-password')}>
                Reset Password
            </Button>
            <AlertDialogAction asChild>
                <Link href="/login">Login</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <RegisterPageContent />
        </Suspense>
    )
}
