
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

// The user-provided test function to get the real error code
async function testProductsRead(firestore: any) {
  try {
    console.log("[PricingPage] TEST: Attempting to read 'products' collection...");
    const snap = await getDocs(collection(firestore, "products"));
    console.log("[PricingPage] TEST SUCCESS: products size:", snap.size);
    if (snap.size > 0) {
        snap.forEach(doc => {
            console.log("[PricingPage] TEST DATA:", doc.id, "=>", doc.data());
        });
    }
  } catch (e: any) {
    console.error("[PricingPage] TEST FAILED: Products read failed.");
    console.error("code:", e?.code);
    console.error("message:", e?.message);
  }
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
      // Call the test function provided by the user
      testProductsRead(firestore).finally(() => {
        setLoading(false);
      });
    }
  }, [firestore]);

  // The rest of the component remains for now, but will show "No Products Found"
  // as we are not setting the products state in this test.

  const handleCheckout = async (priceId: string) => {
    // This function will not be used in this test version
  };
  
  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Running diagnostic test...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
       <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Running Diagnostic</h1>
        <p className="mt-2 text-lg text-muted-foreground">Please check the browser console for logs from the test function.</p>
      </div>
       <Card className="m-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
             The developer console will show the results of the database read attempt, including any specific error codes.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button variant="link" onClick={() => router.back()}>&larr; Go Back</Button>
          </CardContent>
        </Card>
    </div>
  );
}
