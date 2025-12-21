
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { collection, getDocs, doc, query, where } from 'firebase/firestore';
import { createCheckout } from '@/lib/stripe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Define interfaces for our data structures
interface Price {
  id: string;
  unit_amount: number;
  interval: 'month' | 'year';
  description: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  prices: Price[];
}

// Function to fetch products and their prices
async function fetchProductsAndPrices(firestore: any): Promise<Product[]> {
  const productsColRef = collection(firestore, 'products');
  const productQuery = query(productsColRef, where('active', '==', true));
  const productSnapshot = await getDocs(productQuery);

  if (productSnapshot.empty) {
    console.log('[PricingPage] No active products found.');
    return [];
  }

  const products: Product[] = [];

  for (const productDoc of productSnapshot.docs) {
    const productData = productDoc.data();
    const pricesColRef = collection(firestore, 'products', productDoc.id, 'prices');
    const priceQuery = query(pricesColRef, where('active', '==', true));
    const priceSnapshot = await getDocs(priceQuery);

    const prices: Price[] = [];
    priceSnapshot.forEach(priceDoc => {
      const priceData = priceDoc.data();
      prices.push({
        id: priceDoc.id,
        unit_amount: priceData.unit_amount,
        interval: priceData.interval,
        description: priceData.description,
      });
    });

    if (prices.length > 0) {
      products.push({
        id: productDoc.id,
        name: productData.name,
        description: productData.description,
        prices,
      });
    }
  }

  return products;
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
        .finally(() => setLoading(false));
    }
  }, [firestore, toast]);

  const handleCheckout = async (priceId: string) => {
    setIsRedirecting(priceId);
    if (!user) {
      // If user is not logged in, store the selected price and redirect to register
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

  const getPriceByInterval = (product: Product, interval: 'month' | 'year') => {
    return product.prices.find(p => p.interval === interval);
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

  if (products.length === 0) {
    return (
      <Card className="m-auto max-w-2xl text-center">
        <CardHeader>
          <CardTitle>Pricing Not Available</CardTitle>
          <CardDescription>
            Pricing plans have not been configured yet. To add plans, please create a monthly and a yearly price for your product in the Stripe Dashboard. The Stripe Firebase Extension will automatically sync them here.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button variant="link" onClick={() => router.back()}>&larr; Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex-1 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Our Advertising Plans</h1>
        <p className="mt-2 text-lg text-muted-foreground">Choose a plan that fits your business needs. Simple, transparent, and effective.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {products.map((product) => {
          const monthlyPrice = getPriceByInterval(product, 'month');
          const yearlyPrice = getPriceByInterval(product, 'year');

          if (!monthlyPrice || !yearlyPrice) return null;

          const yearlyDiscount = Math.round(
            (1 - (yearlyPrice.unit_amount / 12) / monthlyPrice.unit_amount) * 100
          );

          return (
            <React.Fragment key={product.id}>
              {/* Monthly Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Monthly Plan</CardTitle>
                  <CardDescription>Perfect for getting started or for seasonal promotions.</CardDescription>
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

              {/* Yearly Plan */}
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
            </React.Fragment>
          );
        })}
      </div>
       <div className="text-center mt-8">
            <Button variant="link" onClick={() => router.back()}>
                &larr; Go Back
            </Button>
        </div>
    </div>
  );
}
