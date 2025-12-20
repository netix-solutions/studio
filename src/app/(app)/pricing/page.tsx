'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mockPricings, Pricing } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const [pricings, setPricings] = useState<Pricing[]>(mockPricings);
  const { toast } = useToast();
  const router = useRouter();

  const handlePriceChange = (websiteId: string, plan: 'monthly' | 'quarterly' | 'yearly', value: string) => {
    const newPricings = pricings.map((p) => {
      if (p.id === websiteId) {
        return { ...p, [plan]: parseFloat(value) || 0 };
      }
      return p;
    });
    setPricings(newPricings);
  };
  
  const handlePurchase = (plan: string, website:string) => {
    // In a real app, you would handle the purchase flow here
    console.log(`Purchasing ${plan} for ${website}`);
    toast({
      title: 'Plan Selected!',
      description: `You are now proceeding to checkout for the ${plan} plan.`,
    });
    router.push('/thank-you');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Ad Campaign Pricing</CardTitle>
            <CardDescription>Select a plan to get started. All plans are billed monthly and can be cancelled anytime.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[30%]">Website</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Quarterly</TableHead>
                    <TableHead>Yearly</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {pricings.map((p) => (
                    <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.website}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span>${p.monthly}</span>
                            <Button size="sm" onClick={() => handlePurchase('Monthly', p.website)}>Select</Button>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span>${p.quarterly}</span>
                            <Button size="sm" onClick={() => handlePurchase('Quarterly', p.website)}>Select</Button>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span>${p.yearly}</span>
                             <Button size="sm" onClick={() => handlePurchase('Yearly', p.website)}>Select</Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
