'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Construction } from 'lucide-react';

export default function DiscountsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Discounts & Promotions</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage discount codes and promotional offers
          </p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          <Construction className="mr-1 h-3 w-3" />
          Coming Soon
        </Badge>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Ticket className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Discount Management Coming Soon</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            We're building a powerful discount and promotion system to help you attract new customers and reward loyal ones.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="grid sm:grid-cols-3 gap-4 mt-6 max-w-2xl mx-auto">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Promo Codes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create custom discount codes for marketing campaigns
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Bulk Discounts</p>
              <p className="text-xs text-muted-foreground mt-1">
                Offer discounts for multiple site coverage
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Seasonal Offers</p>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule time-limited promotional campaigns
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
