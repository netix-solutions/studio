
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  signInWithEmail,
  sendSignInLink,
  setupRecaptcha,
  sendPhoneVerificationCode,
  completePhoneSignIn,
} from '@/lib/firebase/auth';
import { normalizePhoneNumber } from '@/lib/utils';
import { Loader2, ArrowLeft, Phone, Shield, Lock, User as UserIcon, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';

const passwordFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const emailLinkFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

const phoneFormSchema = z.object({
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
});

const codeFormSchema = z.object({
  code: z.string().length(6, { message: 'Verification code must be 6 digits.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkSending, setIsLinkSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Phone auth state
  const [isCodeSending, setIsCodeSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);


  // Set up reCAPTCHA on mount when the container is ready
  useEffect(() => {
    if (auth && recaptchaContainerRef.current) {
        const verifier = setupRecaptcha(auth, recaptchaContainerRef.current);
        setRecaptchaVerifier(verifier);
    }
  }, [auth]);

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      router.replace('/account');
    }
  }, [user, isUserLoading, router, firestore]);

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailLinkForm = useForm<z.infer<typeof emailLinkFormSchema>>({
    resolver: zodResolver(emailLinkFormSchema),
    defaultValues: { email: '' },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm<z.infer<typeof codeFormSchema>>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: '' },
  });

  async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      await signInWithEmail(auth, values.email, values.password);
    } catch (error: any) {
      console.error('Login failed:', error);
      let errorMessage = 'Invalid credentials. Please check your email and password.';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. Please check your email and password.';
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  }

  async function onEmailLinkSubmit(values: z.infer<typeof emailLinkFormSchema>) {
    if (!auth) return;
    setIsLinkSending(true);
    setLinkSent(false);
    try {
      await sendSignInLink(auth, values.email);
      window.localStorage.setItem('emailForSignIn', values.email);
      setLinkSent(true);
      toast({
        title: 'Check your email',
        description: `A sign-in link has been sent to ${values.email}.`,
      });
    } catch (error: any) {
      console.error('Email link sign in failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not send sign-in link.',
        variant: 'destructive',
      });
    } finally {
      setIsLinkSending(false);
    }
  }

  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    if (!auth || !recaptchaVerifier) return;
    setIsCodeSending(true);
    setCodeSent(false);
    try {
      // Normalize phone number to E.164 format for Firebase
      const normalizedPhone = normalizePhoneNumber(values.phone);
      if (!normalizedPhone) {
        toast({
          title: 'Invalid Phone Number',
          description: 'Please enter a valid 10-digit phone number.',
          variant: 'destructive',
        });
        setIsCodeSending(false);
        return;
      }

      const result = await sendPhoneVerificationCode(auth, normalizedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setCodeSent(true);
      toast({
        title: 'Verification Code Sent',
        description: `A code has been sent to ${values.phone}.`,
      });
    } catch (error: any) {
      console.error('Phone sign in failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not send verification code.',
        variant: 'destructive',
      });
    } finally {
      setIsCodeSending(false);
    }
  }

  async function onCodeSubmit(values: z.infer<typeof codeFormSchema>) {
    if (!confirmationResult) return;
    setIsSubmitting(true);
    try {
      // Get the phone number from the form to use for account merging
      const phoneNumber = phoneForm.getValues('phone');
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      if (!normalizedPhone) {
        toast({
          title: 'Error',
          description: 'Invalid phone number. Please try again.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Complete phone sign-in with account merging
      const { credential, mergeResult } = await completePhoneSignIn(
        confirmationResult,
        values.code,
        normalizedPhone
      );

      // Show appropriate message based on merge result
      if (mergeResult.merged) {
        toast({
          title: 'Welcome Back!',
          description: 'Your account has been linked with your phone number.',
        });
      } else if (mergeResult.success) {
        toast({
          title: 'Signed In',
          description: 'You have successfully signed in.',
        });
      }

      // Navigation will happen automatically via the auth state listener
    } catch (error: any) {
      console.error('Code verification failed:', error);
      toast({
        title: 'Error',
        description: 'Invalid verification code. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-sm border-b border-gray-100 safe-area-inset">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Community-Websites.com" width={48} height={27} className="h-[30px] md:h-[32px] w-auto" />
              <span className="font-headline font-bold text-brand-primary text-base tracking-tight">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <a
                href="tel:813-544-8383"
                className="hidden md:flex items-center gap-1.5 text-brand-primary hover:text-brand-secondary transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">813-544-8383</span>
              </a>
              <Button variant="ghost" size="sm" asChild className="h-9 w-9 sm:w-auto sm:px-3">
                <Link href="/login">
                  <UserIcon className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-6 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>

          <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden relative z-10">
            <CardContent className="p-5 md:p-8">
              <div className="text-center mb-6 md:mb-7">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 font-headline">
                  Advertiser Login
                </h1>
                <p className="text-gray-600 mt-1.5 text-sm md:text-base">
                  Access your account portal
                </p>
              </div>

              <Tabs defaultValue="password">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="email-link">Email Link</TabsTrigger>
                  <TabsTrigger value="phone">Phone</TabsTrigger>
                </TabsList>

                <TabsContent value="password" className="pt-4">
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      {/* Password form fields */}
                      <FormField
                        control={passwordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium text-sm md:text-base">Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="you@company.com"
                                className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-colors text-base rounded-lg"
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
                      <FormField
                        control={passwordForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-gray-700 font-medium text-sm md:text-base">Password</FormLabel>
                              <Link
                                href="/forgot-password"
                                className="text-sm text-blue-600 hover:underline touch-manipulation"
                              >
                                Forgot password?
                              </Link>
                            </div>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-colors text-base rounded-lg"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs md:text-sm" />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-12 md:h-14 text-base md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation rounded-xl mt-2" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Signing In...</> : 'Sign In'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="email-link" className="pt-4">
                  {/* Email link form */}
                  {!linkSent ? (
                     <Form {...emailLinkForm}>
                        <form onSubmit={emailLinkForm.handleSubmit(onEmailLinkSubmit)} className="space-y-4">
                            <FormField control={emailLinkForm.control} name="email" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 font-medium text-sm md:text-base">Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="you@company.com" className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-colors text-base rounded-lg" inputMode="email" autoCapitalize="off" autoCorrect="off" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs md:text-sm" />
                              </FormItem>
                            )} />
                            <Button type="submit" className="w-full h-12 md:h-14 text-base md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation rounded-xl mt-2" disabled={isLinkSending}>
                              {isLinkSending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Sending...</> : <><Mail className="mr-2 h-5 w-5" />Send Sign-in Link</>}
                            </Button>
                        </form>
                    </Form>
                  ) : (
                    <div className="text-center py-4">
                      <Mail className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="font-bold text-lg">Check Your Inbox</h3>
                      <p className="text-muted-foreground mt-2">A sign-in link has been sent to your email address. Click the link to log in.</p>
                      <Button variant="link" onClick={() => setLinkSent(false)} className="mt-4">Send again</Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="phone" className="pt-4">
                  {/* Phone form */}
                  {!codeSent ? (
                    <Form {...phoneForm}>
                      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                        <FormField control={phoneForm.control} name="phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium text-sm md:text-base">Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+1 555 123 4567" className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-colors text-base rounded-lg" inputMode="tel" {...field} />
                            </FormControl>
                            <FormMessage className="text-xs md:text-sm" />
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full h-12 md:h-14 text-base md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation rounded-xl mt-2" disabled={isCodeSending}>
                          {isCodeSending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Sending Code...</> : 'Send Verification Code'}
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    <Form {...codeForm}>
                      <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
                        <FormField control={codeForm.control} name="code" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium text-sm md:text-base">Verification Code</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="Enter 6-digit code" className="h-11 md:h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-colors text-base rounded-lg" inputMode="numeric" {...field} />
                            </FormControl>
                            <FormMessage className="text-xs md:text-sm" />
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full h-12 md:h-14 text-base md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation rounded-xl mt-2" disabled={isSubmitting}>
                          {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verifying...</> : 'Sign In with Code'}
                        </Button>
                        <Button variant="link" size="sm" onClick={() => setCodeSent(false)} className="w-full">Send code again</Button>
                      </form>
                    </Form>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-blue-600 font-medium hover:underline touch-manipulation">
                    Register here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
          <div ref={recaptchaContainerRef} className={`mt-4 ${codeSent ? 'pointer-events-none' : ''}`}></div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 text-xs md:text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-green-500" />
              <span>Secure Login</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-500" />
              <span>256-bit SSL</span>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm mb-2">Need help?</p>
            <a href="tel:813-544-8383" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline touch-manipulation">
              <Phone className="h-4 w-4" />
              Call 813-544-8383
            </a>
          </div>
        </div>
      </main>

      <footer className="py-8 bg-blue-900 text-blue-200">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                         <Image src="/logo.png" alt="Community-Websites.com Logo" width={40} height={22} className="h-[22px] w-auto" />
                         <span className="font-headline text-white text-lg tracking-wider">Community-Websites.com</span>
                    </div>
                    <p className="text-sm text-blue-300 max-w-xs">
                        Affordable, effective local advertising for Pasco County small businesses.
                    </p>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
                    <div>
                        <h4 className="font-semibold text-white mb-3">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-3">Account</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/login" className="hover:text-white transition-colors">Customer Login</Link></li>
                            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-white mb-3">Contact</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="tel:813-544-8383" className="hover:text-white transition-colors">813-544-8383</a></li>
                            <li><a href="mailto:support@community-websites.com" className="hover:text-white transition-colors">support@community-websites.com</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-blue-800 text-center text-xs text-blue-400">
                &copy; {new Date().getFullYear()} Community-Websites.com. All Rights Reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}
