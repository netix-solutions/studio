
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

// Define interfaces for our data structures
interface Price {
  id: string;
  active: boolean;
  unit_amount: number;
  interval: 'month' | 'year' | string;
  description: string | null;
}

interface Product {
  id: string;
  active: boolean;
  name: string;
  description: string | null;
  prices: Price[];
}

// Function to fetch products and their prices
async function fetchProductsAndPrices(firestore: any): Promise<Product[]> {
  console.log('[PricingPage] Starting to fetch all products (no filters)...');
  const productsColRef = collection(firestore, 'products');
  const productQuery = query(productsColRef); // No 'where' clause, fetch everything
  const productSnapshot = await getDocs(productQuery);

  if (productSnapshot.empty) {
    console.log('[PricingPage] The "products" collection is empty or not readable.');
    return [];
  }
  
  console.log(`[PricingPage] Raw product snapshot contains ${productSnapshot.docs.length} documents.`);

  const productPromises = productSnapshot.docs.map(async (productDoc: QueryDocumentSnapshot<DocumentData>) => {
    const productData = productDoc.data();

    // Client-side filter for active products
    if (productData.active !== true) {
      console.log(`[PricingPage] Skipping inactive product: ${productDoc.id}`);
      return null;
    }

    const pricesColRef = collection(firestore, 'products', productDoc.id, 'prices');
    const priceQuery = query(pricesColRef); // No 'where' clause, fetch everything
    const priceSnapshot = await getDocs(priceQuery);

    const prices: Price[] = [];
    priceSnapshot.forEach(priceDoc => {
      const priceData = priceDoc.data();
      // Client-side filter for active prices
      if (priceData.active === true) {
        // Correctly determine the interval, checking recurring for Stripe extension v0.3.1+
        const interval = priceData.interval ?? priceData.recurring?.interval;
        if (interval) {
          prices.push({
            id: priceDoc.id,
            active: priceData.active,
            unit_amount: priceData.unit_amount,
            interval: interval,
            description: priceData.description,
          });
        }
      }
    });

    if (prices.length > 0) {
      return {
        id: productDoc.id,
        active: productData.active,
        name: productData.name,
        description: productData.description,
        prices,
      };
    }
    return null;
  });

  const resolvedProducts = (await Promise.all(productPromises)).filter(p => p !== null) as Product[];
  console.log(`[PricingPage] Found ${resolvedProducts.length} active product(s) with active prices.`);
  return resolvedProducts;
}

export default function PricingPage() {
  const { firestore, user } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (firestore) {
      setLoading(true);
      fetchProductsAndPrices(firestore)
        .then(setProducts)
        .catch(error => {
          console.error('[PricingPage] Error fetching products:', error);
          toast({
            title: 'Error Loading Plans',
            description: 'Could not fetch pricing plans. Please try again later.',
            variant: 'destructive',
          });
        })
        .finally(() => {
            console.log("[PricingPage] Fetching finished.");
            setLoading(false)
        });
    }
  }, [firestore, toast]);

  const handleCheckout = async (priceId: string) => {
    setIsRedirecting(priceId);
    if (!user) {
      sessionStorage.setItem('selectedPriceId', priceId);
      router.push('/register');
      return;
    }
    try {
      await createCheckout(user.uid, priceId, window.location.origin + '/account');
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not redirect to checkout. Please try again.',
        variant: 'destructive',
      });
      setIsRedirecting(null);
    }
  };
  
  const features = [
      "Rotating Banner Ad",
      "Clickable Traffic to Your Site",
      "Ad Placement on WesleyChapelCommunity.com",
      "Ad Placement on PascoCommunity.com",
      "Creative Support (We can build your ad)",
      "Cancel Anytime"
  ];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Filter for products that have at least one monthly and one yearly price
  const displayProducts = products.filter(p => {
      const hasMonth = p.prices.some(price => price.interval === 'month');
      const hasYear = p.prices.some(price => price.interval === 'year');
      return hasMonth && hasYear;
  });

  if (displayProducts.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl text-center py-10">
        <Card className="m-auto">
          <CardHeader>
            <CardTitle>Pricing Not Available</CardTitle>
            <CardDescription>
              Pricing plans have not been configured correctly. Please ensure your product in Stripe is marked as "active" and has at least one active monthly and one active yearly price.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button variant="link" onClick={() => router.back()}>&larr; Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Our Advertising Plans</h1>
        <p className="mt-2 text-lg text-muted-foreground">Choose a plan that fits your business needs. Simple, transparent, and effective.</p>
      </div>

      {displayProducts.map((product) => {
        const monthlyPrice = product.prices.find(p => p.interval === 'month');
        const yearlyPrice = product.prices.find(p => p.interval === 'year');
        const yearlyDiscount = (monthlyPrice && yearlyPrice) ? Math.round( (1 - (yearlyPrice.unit_amount / 12) / monthlyPrice.unit_amount) * 100 ) : 0;

        return (
          <div key={product.id} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            {monthlyPrice && (
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Monthly Plan</CardTitle>
                  <CardDescription>{product.description || 'Perfect for getting started or for seasonal promotions.'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-6">
                  <div className="text-4xl font-bold">
                    ${monthlyPrice.unit_amount / 100}
                    <span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(monthlyPrice.id)}
                    disabled={isRedirecting !== null}
                  >
                    {isRedirecting === monthlyPrice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Get Started
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Yearly Plan */}
            {yearlyPrice && (
              <Card className="flex flex-col border-primary ring-2 ring-primary relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                    Save {yearlyDiscount}%
                </div>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Yearly Plan</CardTitle>
                  <CardDescription>Best value for long-term growth and brand visibility.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-6">
                  <div className="text-4xl font-bold">
                    ${yearlyPrice.unit_amount / 100}
                    <span className="text-lg font-normal text-muted-foreground">/year</span>
                  </div>
                   <ul className="space-y-2 text-muted-foreground">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(yearlyPrice.id)}
                    disabled={isRedirecting !== null}
                  >
                     {isRedirecting === yearlyPrice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Go Yearly & Save
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        );
      })}
       <div className="text-center mt-8">
            <Button variant="link" onClick={() => router.back()}>
                &larr; Go Back
            </Button>
        </div>
    </div>
  );
}

    