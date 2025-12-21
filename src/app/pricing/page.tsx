'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { createCheckout } from '@/lib/stripe';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// In a real app, these would come from your Stripe products in Firestore
const plans = [
    {
        name: "Monthly",
        priceId: 'price_1PSc7iRXg1yHqXJ1t7xKzM3D',
        description: "Billed monthly",
        features: ["Billed Monthly", "Cancel Anytime"],
        price: 24,
    },
    {
        name: "Quarterly",
        priceId: 'price_1PSc8JRXg1yHqXJ1zG1d9Y2K',
        description: "Billed quarterly (Save 10%)",
        features: ["Billed Quarterly", "Save 10%", "Cancel Anytime"],
        price: 65,
    },
    {
        name: "Yearly",
        priceId: 'price_1PSc8nRXg1yHqXJ1y5eY9g6X',
        description: "Billed yearly (Save 20%)",
        features: ["Billed Annually", "Best Value", "Cancel Anytime"],
        price: 230,
    }
];

export default function PricingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handlePurchase = async (priceId: string) => {
    setIsSubmitting(priceId);
    if (!user) {
        // Store selected plan in sessionStorage to retrieve after login/registration
        sessionStorage.setItem('selectedPriceId', priceId);
        toast({
            title: 'Please sign in',
            description: `You need to create an account or sign in to purchase a plan.`,
            variant: 'default'
        });
        router.push('/login');
        return;
    }

    try {
        await createCheckout(user.uid, priceId, window.location.origin + '/dashboard');
        // The createCheckout function handles the redirect to Stripe
    } catch(error: any) {
        console.error("Stripe checkout error", error);
        toast({
            title: 'Error creating checkout',
            description: error.message || 'There was a problem redirecting you to checkout. Please try again.',
            variant: 'destructive',
        });
        setIsSubmitting(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline">Choose Your Plan</h1>
                <p className="text-muted-foreground mt-2 text-lg">Select the perfect plan for your business advertising needs.</p>
            </div>
            
            {plans.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <Card key={plan.name} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground">/ {plan.name.replace('ly','')}</span>
                                </div>
                                <ul className="space-y-3">
                                    {plan.features.map(feature => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" size="lg" onClick={() => handlePurchase(plan.priceId)} disabled={isUserLoading || !!isSubmitting}>
                                    {isSubmitting === plan.priceId ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Redirecting...
                                        </>
                                    ) : (
                                        'Get Started'
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Pricing Found</AlertTitle>
                    <AlertDescription>
                        Pricing information is not available at this time. Please check back later.
                    </AlertDescription>
                </Alert>
            )}

             <div className="text-center mt-8">
                <Button variant="link" onClick={() => router.back()}>
                    &larr; Go Back
                </Button>
            </div>
        </div>
    </main>
  );
}
