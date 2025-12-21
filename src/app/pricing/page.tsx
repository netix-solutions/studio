
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { createCheckout } from '@/lib/stripe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Price {
  id: string;
  interval?: 'month' | 'year';
  unit_amount: number;
  currency: string;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: Price[];
  features?: string[];
  metadata?: {
    isFeatured?: string;
  };
}

async function fetchProductsAndPrices(firestore: any): Promise<Product[]> {
  const productsColRef = collection(firestore, 'plans');
  const q = query(productsColRef, where('active', '==', true));
  const productDocs = await getDocs(q);

  const allProducts: Product[] = await Promise.all(
    productDocs.docs.map(async (productDoc) => {
      const productData = productDoc.data();
      
      const pricesColRef = collection(firestore, 'plans', productDoc.id, 'prices');
      const pricesQuery = query(pricesColRef, where('active', '==', true));
      const priceDocs = await getDocs(pricesQuery);
      
      const prices: Price[] = priceDocs.docs.map((priceDoc) => {
        const priceData = priceDoc.data();
        return {
          id: priceDoc.id,
          interval: priceData.interval ?? priceData.recurring?.interval,
          unit_amount: priceData.unit_amount,
          currency: priceData.currency,
          active: priceData.active,
        };
      });

      return {
        id: productDoc.id,
        name: productData.name,
        description: productData.description,
        active: productData.active,
        prices: prices,
        features: productData.features || [
            "Rotating banner ad on high-traffic pages",
            "Clickable link to drive traffic",
            "Ad design support included",
            "Cancel anytime flexibility"
        ],
        metadata: productData.metadata,
      };
    })
  );
  
  const sortedProducts = allProducts
    .filter(p => p.active && p.prices.length > 0)
    .sort((a, b) => {
        const aPrice = a.prices.find(p => p.interval === 'month')?.unit_amount || a.prices[0]?.unit_amount || 0;
        const bPrice = b.prices.find(p => p.interval === 'month')?.unit_amount || b.prices[0]?.unit_amount || 0;
        return aPrice - bPrice;
    });

  return sortedProducts;
}

function PricingCard({ product, onPurchase, isPurchasing, isFeatured }: { product: Product; onPurchase: (priceId: string) => void; isPurchasing: string | null; isFeatured?: boolean }) {
    const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>('yearly');

    const monthlyPrice = product.prices.find(p => p.interval === 'month');
    const yearlyPrice = product.prices.find(p => p.interval === 'year');

    const handleCycleChange = (value: 'yearly' | 'monthly') => {
        if (value) setBillingCycle(value);
    };
    
    const displayPrice = billingCycle === 'yearly' && yearlyPrice
        ? yearlyPrice.unit_amount / 12
        : monthlyPrice?.unit_amount;

    const priceIdToPurchase = billingCycle === 'yearly' && yearlyPrice ? yearlyPrice.id : monthlyPrice?.id;
    
    const savings = monthlyPrice && yearlyPrice
        ? Math.round(((monthlyPrice.unit_amount * 12 - yearlyPrice.unit_amount) / (monthlyPrice.unit_amount * 12)) * 100)
        : 0;

    return (
        <Card className={cn("flex flex-col rounded-xl shadow-lg border-2 h-full relative overflow-hidden", isFeatured ? "border-primary" : "border-border/60")}>
             {isFeatured && (
                <Badge className="absolute top-4 right-4" variant="secondary">Best Value</Badge>
            )}
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                 <div className="flex justify-center my-6">
                    {(monthlyPrice && yearlyPrice) ? (
                        <ToggleGroup type="single" value={billingCycle} onValueChange={handleCycleChange} className="bg-muted p-1 rounded-full">
                            <ToggleGroupItem value="monthly" aria-label="Pay monthly" className="rounded-full data-[state=on]:bg-background data-[state=on]:shadow-sm px-4">Monthly</ToggleGroupItem>
                            <ToggleGroupItem value="yearly" aria-label="Pay yearly" className="rounded-full data-[state=on]:bg-background data-[state=on]:shadow-sm px-4 flex items-center gap-2">
                                Yearly
                                {savings > 0 && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] font-bold">Save {savings}%</Badge>}
                            </ToggleGroupItem>
                        </ToggleGroup>
                    ) : <div className="h-10"/> /* Spacer to keep alignment */}
                </div>
                <div className="text-center my-4">
                    {displayPrice !== undefined ? (
                        <>
                            <span className="text-5xl font-bold tracking-tight">
                                {(displayPrice / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-muted-foreground">/month</span>
                            {billingCycle === 'yearly' && yearlyPrice && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Billed as {(yearlyPrice.unit_amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} per year
                                </p>
                            )}
                        </>
                    ) : (
                         <p className="text-lg font-medium text-muted-foreground">Price not available</p>
                    )}
                </div>

                {product.description && (
                    <div className="my-8 flex-grow">
                         <p className="text-muted-foreground text-center px-4">{product.description}</p>
                    </div>
                )}


            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-4 bg-muted/50 p-6 mt-auto">
                 <Button
                    size="lg"
                    className={cn("w-full", isFeatured && "shadow-lg shadow-primary/30")}
                    onClick={() => priceIdToPurchase && onPurchase(priceIdToPurchase)}
                    disabled={!priceIdToPurchase || !!isPurchasing}
                    >
                    {isPurchasing === priceIdToPurchase ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        'Choose Plan'
                    )}
                    </Button>
            </CardFooter>
        </Card>
    );
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
      fetchProductsAndPrices(firestore)
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
    if (!firestore) {
      toast({ title: 'Error', description: 'Database not ready.', variant: 'destructive' });
      return;
    }
    setIsPurchasing(priceId);
    if (!user) {
      sessionStorage.setItem('selectedPriceId', priceId);
      router.push('/register');
      return;
    }
    try {
      await createCheckout(firestore, user.uid, user.email, priceId, window.location.origin + '/account');
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({ title: 'Error Starting Checkout', description: error.message || 'Could not redirect to checkout.', variant: 'destructive' });
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
    <div className="bg-background text-foreground">
        <div className="container mx-auto py-16 px-4 md:px-6">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl">Choose Your Plan</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Simple, transparent pricing to reach your community on WesleyChapelCommunity.com and PascoCommunity.com.</p>
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
                    {products.map((product) => (
                        <PricingCard 
                            key={product.id}
                            product={product}
                            onPurchase={handlePurchase}
                            isPurchasing={isPurchasing}
                            isFeatured={product.metadata?.isFeatured === 'true'}
                        />
                    ))}
                </div>
            ) : (
                <Card className="m-auto max-w-2xl text-center p-8 border-dashed">
                    <CardHeader>
                        <CardTitle>Pricing Not Available</CardTitle>
                        <CardDescription>
                            Pricing plans have not been configured or synced from Stripe. To add plans, please create a product with prices in your Stripe Dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={() => router.back()}>&larr; Go Back</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  );
}
