'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { useUser, useFirebase } from '@/firebase';
import { createCheckout } from '@/lib/stripe';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { collection, query, where, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Price {
    id: string;
    description: string | null;
    unit_amount: number;
    currency: string;
    interval: 'month' | 'year' | 'week' | 'day';
    interval_count: number;
}

interface Product {
    id: string;
    name: string;
    description: string;
    prices: Price[];
}


export default function PricingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');

  useEffect(() => {
    if (!firestore) return;

    const productsQuery = query(
      collection(firestore, 'products'),
      where('active', '==', true)
    );

    const unsubscribe: Unsubscribe = onSnapshot(productsQuery, async (querySnapshot) => {
        setIsLoading(true);
        const productsPromises = querySnapshot.docs.map(async (doc) => {
            const productData = doc.data();
            const pricesCol = collection(doc.ref, 'prices');
            const pricesSnap = await getDocs(query(pricesCol, where('active', '==', true)));
            
            const prices: Price[] = pricesSnap.docs.map(priceDoc => ({
                id: priceDoc.id,
                ...priceDoc.data()
            } as Price)).sort((a, b) => a.unit_amount - b.unit_amount);

            return {
                id: doc.id,
                name: productData.name,
                description: productData.description,
                prices: prices,
            };
        });

        const fetchedProducts = await Promise.all(productsPromises);
        setProducts(fetchedProducts);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching products:", error);
        toast({
            title: 'Error',
            description: 'Could not fetch pricing plans. Please check console for details.',
            variant: 'destructive',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
}, [firestore, toast]);
  

  const handlePurchase = async (priceId: string) => {
    setIsSubmitting(priceId);
    if (!user) {
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
        await createCheckout(user.uid, priceId, window.location.origin + '/account');
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

  const mainProduct = useMemo(() => products.find(p => p.prices.length > 0), [products]);

  const { monthlyPrice, annualPrice } = useMemo(() => {
    if (!mainProduct) return { monthlyPrice: null, annualPrice: null };
    const monthly = mainProduct.prices.find(p => p.interval === 'month' && p.interval_count === 1);
    const annual = mainProduct.prices.find(p => p.interval === 'year');
    return { monthlyPrice: monthly, annualPrice: annual };
  }, [mainProduct]);

  const displayedPrice = billingCycle === 'monthly' ? monthlyPrice : annualPrice;
  const effectiveMonthlyRate = billingCycle === 'annually' && annualPrice ? annualPrice.unit_amount / 12 : monthlyPrice?.unit_amount;

  const features = [
      "Rotating Banner Ad",
      "Clickable Traffic to Your Site",
      "Creative Support Included",
      "Easy Ad Updates",
      "Cancel Anytime"
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-headline">Choose Your Plan</h1>
                <p className="text-muted-foreground mt-2 text-lg">Select the perfect plan for your business advertising needs.</p>
            </div>
            
            <div className="flex justify-center items-center gap-4 mb-12">
                <Label htmlFor="billing-cycle" className={billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}>Monthly</Label>
                <Switch 
                    id="billing-cycle"
                    checked={billingCycle === 'annually'}
                    onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
                />
                <Label htmlFor="billing-cycle" className={billingCycle === 'annually' ? 'text-foreground' : 'text-muted-foreground'}>Annually</Label>
                 <Badge variant="secondary" className="ml-2">Save with Annual!</Badge>
            </div>

            {isLoading ? (
                 <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : mainProduct && displayedPrice ? (
                <div className="flex justify-center">
                    <Card className="flex flex-col max-w-md w-full">
                        <CardHeader>
                            <CardTitle>{mainProduct.name}</CardTitle>
                            <CardDescription>
                                {billingCycle === 'annually' && annualPrice ?
                                    `Billed as one payment of $${(annualPrice.unit_amount / 100).toFixed(2)}` :
                                    'Billed monthly, cancel anytime.'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="mb-6">
                                {effectiveMonthlyRate ? (
                                    <>
                                        <span className="text-4xl font-bold">${(effectiveMonthlyRate / 100).toFixed(2)}</span>
                                        <span className="text-muted-foreground">/month</span>
                                    </>
                                ) : (
                                    <span className="text-2xl font-bold">Contact for pricing</span>
                                )}
                            </div>
                            <ul className="space-y-3">
                                {features.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" size="lg" onClick={() => handlePurchase(displayedPrice.id)} disabled={isUserLoading || !!isSubmitting}>
                                {isSubmitting === displayedPrice.id ? (
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
                </div>
            ) : (
                <Alert variant="default" className="max-w-2xl mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pricing Not Available</AlertTitle>
                    <AlertDescription>
                        Pricing plans have not been configured yet. To add plans, please create a monthly and a yearly price for your product in the Stripe Dashboard. The Stripe Firebase Extension will automatically sync them here.
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
