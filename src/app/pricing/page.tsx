
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { collection, query, getDocs, type DocumentData } from 'firebase/firestore';

interface RawPrice extends DocumentData {
    id: string;
}

interface RawProduct extends DocumentData {
    id: string;
    prices: RawPrice[];
}

export default function PricingPage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const [products, setProducts] = useState<RawProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductsAndPrices = useCallback(async () => {
    if (!firestore) {
      setError("Database connection is not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log("[PricingPage] Starting to fetch all products (no filters)...");

    try {
        const productsQuery = query(collection(firestore, 'products'));
        const productSnapshot = await getDocs(productsQuery);
        console.log(`[PricingPage] Raw product snapshot contains ${productSnapshot.docs.length} documents.`);

        if (productSnapshot.empty) {
            console.log("[PricingPage] The 'products' collection is empty or not readable.");
            setProducts([]);
        } else {
            const productsData = await Promise.all(
                productSnapshot.docs.map(async (productDoc) => {
                    const product = { id: productDoc.id, ...productDoc.data() };
                    console.log(`[PricingPage] Processing product: ${product.name} (${product.id})`);

                    const pricesQuery = query(collection(firestore, 'products', productDoc.id, 'prices'));
                    const pricesSnapshot = await getDocs(pricesQuery);
                    
                    const prices = pricesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RawPrice));
                    console.log(`[PricingPage] Found ${prices.length} price(s) for product ${product.id}`);

                    return { ...product, prices } as RawProduct;
                })
            );
            console.log("[PricingPage] Final combined data to be set in state:", productsData);
            setProducts(productsData);
        }
    } catch (err: any) {
        console.error("[PricingPage] Error fetching products and prices:", err);
        setError(`An error occurred while fetching data. Check the console for details. Error: ${err.message}`);
    } finally {
        setIsLoading(false);
        console.log("[PricingPage] Fetching finished.");
    }
  }, [firestore]);
  
  useEffect(() => {
    fetchProductsAndPrices();
  }, [fetchProductsAndPrices]);

  const renderContent = () => {
    if (isLoading) {
         return (
             <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading products from database...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Data</AlertTitle>
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
                   The app successfully connected to the database but found zero products in the 'products' collection. Please ensure the Stripe Payments extension has synced your data correctly.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-8">
            {products.map(product => (
                <Card key={product.id} className="w-full max-w-md shadow-lg bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg">{product.name || 'Unnamed Product'}</CardTitle>
                        <CardDescription>
                            Product ID: {product.id} <br/>
                            Active: {String(product.active)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <h4 className="font-semibold mb-2">Prices Found: {product.prices.length}</h4>
                        {product.prices.length > 0 ? (
                            <ul className="space-y-2 text-sm">
                                {product.prices.map(price => (
                                    <li key={price.id} className="border p-3 rounded-md bg-muted/50">
                                        <div><strong>Price ID:</strong> {price.id}</div>
                                        <div><strong>Amount:</strong> {price.unit_amount ? `$(${(price.unit_amount / 100).toFixed(2)})` : 'N/A'} {String(price.currency).toUpperCase()}</div>
                                        <div><strong>Interval:</strong> {price.interval || 'N/A'}</div>
                                        <div><strong>Active:</strong> {String(price.active)}</div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">No prices found for this product.</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted/40 p-4 pt-12">
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
