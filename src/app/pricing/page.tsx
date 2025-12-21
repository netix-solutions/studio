'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockPricings } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

const plans = [
    {
        name: "Monthly",
        price: 100,
        description: "Billed monthly",
        features: ["Billed Monthly", "Cancel Anytime"],
        priceKey: "monthly" as const,
    },
    {
        name: "Quarterly",
        price: 270,
        description: "Billed quarterly (Save 10%)",
        features: ["Billed Quarterly", "Save 10%", "Cancel Anytime"],
        priceKey: "quarterly" as const,
    },
    {
        name: "Yearly",
        price: 960,
        description: "Billed yearly (Save 20%)",
        features: ["Billed Annually", "Best Value", "Cancel Anytime"],
        priceKey: "yearly" as const,
    }
];

// Assuming a single pricing structure for now for simplicity.
const adCampaign = mockPricings[0];


export default function PricingPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handlePurchase = (planName: string, planPrice: number) => {
    // Store selected plan in sessionStorage to retrieve after login/registration
    sessionStorage.setItem('selectedPlan', JSON.stringify({ name: planName, price: planPrice }));
    
    toast({
      title: 'Plan Selected!',
      description: `You've selected the ${planName} plan. Please create an account to proceed.`,
    });
    router.push('/register');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline">Choose Your Plan</h1>
                <p className="text-muted-foreground mt-2 text-lg">Select the perfect plan for your business advertising needs.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <Card key={plan.name} className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <div className="mb-6">
                                <span className="text-4xl font-bold">${adCampaign[plan.priceKey]}</span>
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
                            <Button className="w-full" size="lg" onClick={() => handlePurchase(plan.name, adCampaign[plan.priceKey])}>
                                Get Started
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
             <div className="text-center mt-8">
                <Button variant="link" onClick={() => router.back()}>
                    &larr; Go Back
                </Button>
            </div>
        </div>
    </main>
  );
}
