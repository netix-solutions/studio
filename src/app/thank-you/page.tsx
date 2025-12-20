'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">We've received your order!</CardTitle>
          <CardDescription>Thank you for choosing Community-Websites.com.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Here's what happens next:
          </p>
          <ul className="space-y-2 text-left text-muted-foreground list-decimal list-inside">
            <li>We will review your ad submission or begin designing your banner.</li>
            <li>You will receive an email with a preview for your approval.</li>
            <li>Once you approve it, your ad will go live on the selected sites.</li>
          </ul>
          <p className="text-sm text-muted-foreground pt-4">
            Keep an eye on your inbox for the ad proof. If you have any immediate questions, feel free to contact our support team.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Return to Homepage</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
