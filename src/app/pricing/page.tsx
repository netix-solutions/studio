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
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

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

  useEffect(() => {
    if (!firestore) return;

    const productsQuery = query(
      collection(firestore, 'products'),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(productsQuery, async (querySnapshot) => {
      const fetchedProducts: Product[] = [];
      for (const doc of querySnapshot.docs) {
        const productData = doc.data();
        const pricesCol = collection(doc.ref, 'prices');
        const pricesSnap = await getDocs(query(pricesCol, where('active', '==', true)));
        
        const prices: Price[] = pricesSnap.docs.map(priceDoc => ({
          id: priceDoc.id,
          ...priceDoc.data()
        } as Price)).sort((a, b) => a.unit_amount - b.unit_amount);

        fetchedProducts.push({
          id: doc.id,
          name: productData.name,
          description: productData.description,
          prices: prices,
        });
      }
      setProducts(fetchedProducts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);
  

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

  const formatInterval = (interval: Price['interval'], interval_count: number) => {
      if (interval_count > 1) {
          return `every ${interval_count} ${interval}s`;
      }
      return interval === 'month' ? 'monthly' : interval;
  }

  const getFeaturesForPrice = (price: Price) => {
      const features = ["Cancel Anytime"];
      if (price.interval === 'month' && price.interval_count === 3) {
          features.unshift("Save 10%");
          features.unshift("Billed Quarterly");
      } else if (price.interval === 'year') {
          features.unshift("Best Value");
          features.unshift("Billed Annually");
      } else {
           features.unshift("Billed Monthly");
      }
      return features;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline">Choose Your Plan</h1>
                <p className="text-muted-foreground mt-2 text-lg">Select the perfect plan for your business advertising needs.</p>
            </div>
            
            {isLoading ? (
                 <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : mainProduct && mainProduct.prices.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-8">
                    {mainProduct.prices.map((price) => (
                        <Card key={price.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{price.description || mainProduct.name}</CardTitle>
                                <CardDescription>Billed {formatInterval(price.interval, price.interval_count)}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">${(price.unit_amount / 100).toFixed(2)}</span>
                                    <span className="text-muted-foreground">/{price.interval}</span>
                                </div>
                                <ul className="space-y-3">
                                    {getFeaturesForPrice(price).map(feature => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" size="lg" onClick={() => handlePurchase(price.id)} disabled={isUserLoading || !!isSubmitting}>
                                    {isSubmitting === price.id ? (
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
                <Alert variant="default" className="max-w-2xl mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pricing Not Available</AlertTitle>
                    <AlertDescription>
                        Pricing plans have not been configured yet. To add plans, please create products and prices in your Stripe Dashboard. The Stripe Firebase Extension will automatically sync them here.
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
