
'use client';
import Script from 'next/script';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export default function PricingPage() {
  const { user } = useUser();
  const router = useRouter();
  
  // These are the keys you provided.
  const pricingTableId = 'prctbl_1Sge4WJs4fNBuypsE2PWllzc';
  const publishableKey = 'pk_live_51MahdyJs4fNBuypsDimJcnYgDByn4dMpGPSKJEyvS2u2gOnnZHvIkpHwo7u2oWG839LrF3D41d9tSnFfqQgKHxq400sp63EOGG';

  return (
    <>
      <Script async src="https://js.stripe.com/v3/pricing-table.js"></Script>
       <div className="flex-1 space-y-4">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold font-headline">Our Advertising Plans</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Choose a plan that fits your business needs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                   <stripe-pricing-table 
                        pricing-table-id={pricingTableId}
                        publishable-key={publishableKey}
                        client-reference-id={user ? user.uid : undefined}
                        customer-email={user ? user.email : undefined}
                    >
                    </stripe-pricing-table>
                    <p className="mt-6 text-sm text-muted-foreground max-w-2xl text-center">
                        Selecting a plan will take you to Stripe's secure checkout. If you are not logged in, you will be prompted to create an account first. Your ad details will be collected after checkout is complete.
                    </p>
                </CardContent>
            </Card>
            <div className="text-center mt-4">
                <Button variant="link" onClick={() => router.back()}>
                    &larr; Go Back
                </Button>
            </div>
        </div>
    </>
  );
}
