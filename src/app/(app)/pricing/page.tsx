'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mockPricings, Pricing } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

export default function PricingPage() {
  const [pricings, setPricings] = useState<Pricing[]>(mockPricings);
  const { toast } = useToast();

  const handlePriceChange = (websiteId: string, plan: 'monthly' | 'quarterly' | 'yearly', value: string) => {
    const newPricings = pricings.map((p) => {
      if (p.id === websiteId) {
        return { ...p, [plan]: parseFloat(value) || 0 };
      }
      return p;
    });
    setPricings(newPricings);
  };
  
  const handleSaveChanges = () => {
    // Here you would typically send the updated pricings to your backend
    console.log('Saving changes:', pricings);
    toast({
      title: 'Success!',
      description: 'Pricing has been updated.',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Ad Campaign Pricing</CardTitle>
            <CardDescription>Set prices for ad campaigns on various community websites.</CardDescription>
        </div>
        <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[40%]">Website</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Quarterly Fee</TableHead>
                    <TableHead>Yearly Fee</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {pricings.map((p) => (
                    <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.website}</TableCell>
                    <TableCell>
                        <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                            type="number"
                            value={p.monthly}
                            onChange={(e) => handlePriceChange(p.id, 'monthly', e.target.value)}
                            className="pl-6"
                        />
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                            type="number"
                            value={p.quarterly}
                            onChange={(e) => handlePriceChange(p.id, 'quarterly', e.target.value)}
                            className="pl-6"
                        />
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                            type="number"
                            value={p.yearly}
                            onChange={(e) => handlePriceChange(p.id, 'yearly', e.target.value)}
                            className="pl-6"
                        />
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
