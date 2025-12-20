'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { signInWithGoogle } from '@/lib/firebase/auth';
import { GoogleIcon } from '@/components/icons/google-icon';
import { Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = auth;

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async () => {
    const user = await signInWithGoogle();
    if (user) {
      toast({
        title: 'Success!',
        description: 'You have successfully logged in.',
      });
      router.push('/dashboard');
    } else {
      toast({
        title: 'Error',
        description: 'There was an error logging in. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight font-headline">
            Existing Advertiser Login
          </CardTitle>
          <CardDescription>Access your admin panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button onClick={handleLogin} className="w-full">
              <GoogleIcon className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          </div>
          
          <Separator className="my-6" />

          <div className="text-center">
            <h3 className="font-semibold text-lg">New Customer?</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
                Ready to advertise with us? Get started here.
            </p>
            <Button variant="outline" asChild>
                <Link href="/#get-started">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
