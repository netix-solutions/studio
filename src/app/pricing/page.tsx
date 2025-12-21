
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUser, useFirebase } from '@/firebase';
import { createCheckout } from '@/lib/stripe';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { collection, query, getDocs, type DocumentData } from 'firebase/firestore';

interface Price extends DocumentData {
    id: string;
    description: string | null;
    unit_amount: number;
    currency: string;
    interval: 'month' | 'year' | 'day';
    interval_count: number;
    active: boolean;
    product: string;
}

interface Product extends DocumentData {
    id: string;
    name: string;
    description: string;
    prices: Price[];
    active: boolean;
}


export default function PricingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProductsAndPrices = useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    setError(null);
    console.log("[PricingPage] Starting to fetch all products (no filters)...");

    try {
        const productsQuery = query(collection(firestore, 'products'));
        const productSnapshot = await getDocs(productsQuery);
        console.log(`[PricingPage] Found ${productSnapshot.docs.length} total product document(s).`);

        if (productSnapshot.empty) {
            console.log("[PricingPage] The 'products' collection is empty.");
            setProducts([]);
            setIsLoading(false);
            return;
        }

        const allProducts = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const productsWithPrices = await Promise.all(
            allProducts.map(async (product) => {
                const pricesQuery = query(collection(firestore, 'products', product.id, 'prices'));
                const pricesSnapshot = await getDocs(pricesQuery);
                const prices = pricesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Price));
                
                console.log(`[PricingPage] Product "${product.name}" (${product.id}) has ${prices.length} price(s) in its sub-collection.`, prices);
                return { ...product, prices } as Product;
            })
        );
        
        console.log("[PricingPage] Final combined data:", productsWithPrices);
        setProducts(productsWithPrices);

    } catch (err: any) {
        console.error("[PricingPage] Error fetching products:", err);
        setError("Could not fetch pricing plans. Please try again later.");
    } finally {
        setIsLoading(false);
        console.log("[PricingPage] Fetching finished.");
    }
  }, [firestore]);
  
  useEffect(() => {
    fetchProductsAndPrices();
  }, [fetchProductsAndPrices]);

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


  const renderContent = () => {
    if (isLoading) {
         return (
             <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (products.length === 0) {
        return (
            <Alert variant="default" className="max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Products Found</AlertTitle>
                <AlertDescription>
                   The app could not find any products in your Firestore database. Please ensure the Stripe Payments extension has synced your data correctly.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-8">
            {products.map(product => (
                <Card key={product.id} className="w-full max-w-md shadow-lg">
                    <CardHeader>
                        <CardTitle>{product.name || 'Unnamed Product'}</CardTitle>
                        <CardDescription>ID: {product.id} / Active: {String(product.active)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold mb-2">Prices Found: {product.prices.length}</p>
                        {product.prices.length > 0 ? (
                            <ul className="space-y-2">
                                {product.prices.map(price => (
                                    <li key={price.id} className="border p-2 rounded-md">
                                        <p>Amount: ${(price.unit_amount / 100).toFixed(2)} {price.currency.toUpperCase()}</p>
                                        <p>Interval: {price.interval}</p>
                                        <p>Active: {String(price.active)}</p>
                                        <p className="text-xs text-muted-foreground">Price ID: {price.id}</p>
                                        <Button className="w-full mt-2" size="sm" onClick={() => handlePurchase(price.id)} disabled={isUserLoading || !!isSubmitting}>
                                            {isSubmitting === price.id ? 'Redirecting...' : `Purchase (${price.interval})`}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground">No prices found for this product.</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
  };


  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
        <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-headline">Raw Product Data</h1>
                <p className="text-muted-foreground mt-2 text-lg">Displaying all products found in the database without any filters.</p>
            </div>
            
            {renderContent()}

             <div className="text-center mt-8">
                <Button variant="link" onClick={() => router.back()}>
                    &larr; Go Back
                </Button>
            </div>
        </div>
    </main>
  );
}
