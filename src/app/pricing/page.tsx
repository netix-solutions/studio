
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { createCheckout } from '@/lib/stripe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Price {
  id: string;
  interval?: 'month' | 'year';
  unit_amount: number;
  currency: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  prices: Price[];
}

async function fetchPlansAndPrices(firestore: any): Promise<Product[]> {
  const plansColRef = collection(firestore, 'plans');
  const planDocs = await getDocs(plansColRef);

  if (planDocs.empty) {
    console.warn("[PricingPage] The 'plans' collection is empty or not readable.");
    return [];
  }

  const allPlans: Product[] = await Promise.all(
    planDocs.docs.map(async (planDoc) => {
      const planData = planDoc.data();
      
      const pricesColRef = collection(firestore, 'plans', planDoc.id, 'prices');
      const priceDocs = await getDocs(pricesColRef);
      
      const prices: Price[] = priceDocs.docs
        .map((priceDoc) => {
          const priceData = priceDoc.data();
          if (!priceData.active) return null;

          const interval = priceData.interval ?? priceData.recurring?.interval;
          return {
            id: priceDoc.id,
            interval: interval,
            unit_amount: priceData.unit_amount,
            currency: priceData.currency,
          };
        })
        .filter((p): p is Price => p !== null);

      return {
        id: planDoc.id,
        name: planData.name,
        description: planData.description,
        prices: prices,
      };
    })
  );
  
  // Filter out products that are not active or have no active prices
  return allPlans.filter(plan => {
      const planData = planDocs.docs.find(doc => doc.id === plan.id)?.data();
      return planData?.active && plan.prices.length > 0;
  });
}


export default function PricingPage() {
  const { firestore, user } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (firestore) {
      setLoading(true);
      fetchPlansAndPrices(firestore)
        .then(setProducts)
        .catch(error => {
          console.error("Error fetching products and prices:", error);
          toast({
            title: 'Error Loading Plans',
            description: 'Could not fetch pricing information. Please try again later.',
            variant: 'destructive',
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [firestore, toast]);

  const handlePurchase = async (priceId: string) => {
    setIsPurchasing(priceId);
    if (!user) {
      sessionStorage.setItem('selectedPriceId', priceId);
      router.push('/register');
      return;
    }
    try {
      await createCheckout(user.uid, priceId, window.location.origin + '/account');
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      toast({
        title: 'Error',
        description: error.message || 'Could not redirect to checkout. Please try again.',
        variant: 'destructive',
      });
      setIsPurchasing(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl">Choose Your Plan</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Simple, transparent pricing to reach your community on WesleyChapelCommunity.com and PascoCommunity.com.</p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {products.map((product) => {
            const monthlyPrice = product.prices.find(p => p.interval === 'month');
            const yearlyPrice = product.prices.find(p => p.interval === 'year');

            return (
              <Card key={product.id} className="flex flex-col rounded-lg shadow-lg border border-border/60">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="font-headline text-2xl">{product.name}</CardTitle>
                  {product.description && <CardDescription className="pt-2">{product.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-grow">
                   <ul className="space-y-4 text-muted-foreground my-6">
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                            <span>Rotating banner ad on high-traffic pages</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                            <span>Clickable link to drive traffic to your website</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                            <span>Ad design support if you don't have a banner</span>
                        </li>
                         <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                            <span>Flexibility to cancel your subscription anytime</span>
                        </li>
                    </ul>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-4 bg-muted/50 p-6">
                  {monthlyPrice && (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => handlePurchase(monthlyPrice.id)}
                      disabled={!!isPurchasing}
                    >
                      {isPurchasing === monthlyPrice.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {(monthlyPrice.unit_amount / 100).toLocaleString('en-US', { style: 'currency', currency: monthlyPrice.currency })} / month
                        </>
                      )}
                    </Button>
                  )}
                  {yearlyPrice && (
                     <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => handlePurchase(yearlyPrice.id)}
                      disabled={!!isPurchasing}
                    >
                       {isPurchasing === yearlyPrice.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {(yearlyPrice.unit_amount / 100).toLocaleString('en-US', { style: 'currency', currency: yearlyPrice.currency })} / year
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="m-auto max-w-2xl text-center p-8 border-dashed">
          <CardHeader>
            <CardTitle>Pricing Not Available</CardTitle>
            <CardDescription>
             Pricing plans have not been configured or synced from Stripe. To add plans, please create a product with monthly and/or yearly prices in your Stripe Dashboard. The Stripe Firebase Extension will automatically sync them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button variant="outline" onClick={() => router.back()}>&larr; Go Back</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
