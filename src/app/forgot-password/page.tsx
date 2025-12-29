'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { useAuth } from '@/firebase';
import { sendPasswordReset } from '@/lib/firebase/auth';
import { Loader2, ArrowLeft, Phone, Shield, Lock, User as UserIcon, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) {
        toast({
            title: 'Error',
            description: 'Authentication service is not available. Please try again later.',
            variant: 'destructive',
        });
        return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordReset(auth, values.email);
      setEmailSent(true);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox for a link to reset your password.',
      });
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not send password reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Mobile-First Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-6 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          {/* Card */}
          <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden relative z-10">
            <CardContent className="p-5 md:p-8">
              {!emailSent ? (
                <>
                  <div className="text-center mb-6 md:mb-7">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 font-headline">
                      Forgot Password
                    </h1>
                    <p className="text-gray-600 mt-1.5 text-sm md:text-base">
                      Enter your email to receive a reset link
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
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
                      <Button
                        type="submit"
                        className="w-full h-12 md:h-14 text-base md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation rounded-xl mt-2"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-5 w-5" />
                            Send Reset Link
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-center text-sm text-gray-600">
                      Remember your password?{' '}
                      <Link href="/login" className="text-blue-600 font-medium hover:underline touch-manipulation">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 font-headline mb-2">
                    Check Your Email
                  </h2>
                  <p className="text-gray-600 text-sm md:text-base mb-6">
                    We've sent a password reset link to your email address. Click the link to create a new password.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setEmailSent(false)}
                    className="h-11 rounded-xl touch-manipulation"
                  >
                    Send Again
                  </Button>
                  <div className="mt-4">
                    <Link href="/login" className="text-blue-600 font-medium text-sm hover:underline touch-manipulation">
                      Back to Login
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 text-xs md:text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-green-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-500" />
              <span>256-bit SSL</span>
            </div>
          </div>

          {/* Help Section */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm mb-2">Need help?</p>
            <a
              href="tel:813-544-8383"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline touch-manipulation"
            >
              <Phone className="h-4 w-4" />
              Call 813-544-8383
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
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
