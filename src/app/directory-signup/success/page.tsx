'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, ArrowRight, Mail } from 'lucide-react';

export default function DirectorySignupSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const sessionId = searchParams?.get('session_id');

  useEffect(() => {
    // Simulate checking the subscription status
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing your subscription...</h2>
            <p className="text-muted-foreground">Please wait while we set up your directory listing</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl">Welcome to the Directory!</CardTitle>
          <CardDescription className="text-base">
            Your subscription is now active
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              We've sent a confirmation email with your account details and a link to set your password.
              Check your inbox at the email address you provided.
            </AlertDescription>
          </Alert>

          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg">What happens next?</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span>Your listing is now live and visible to customers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span>You can manage your listing, update information, and view analytics from your dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span>Your subscription will automatically renew each month</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span>You can upgrade, downgrade, or cancel anytime from your account</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1" 
              size="lg"
              onClick={() => router.push('/my-directory-listing')}
            >
              View Your Listing
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              size="lg"
              onClick={() => router.push('/account')}
            >
              Go to Account
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Need help? Contact us at support@community-websites.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
