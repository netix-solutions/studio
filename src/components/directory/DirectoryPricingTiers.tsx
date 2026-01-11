'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Sparkles, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
  priceId?: string;
  tier: 'basic' | 'featured' | 'premium';
}

const TIERS: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic Listing',
    price: 49,
    description: 'Perfect for getting started with directory advertising',
    tier: 'basic',
    features: [
      'Business name, logo & description',
      'Phone, email & website links',
      'Social media links (6 platforms)',
      'Category badge',
      'Search visibility',
      'Basic analytics',
    ],
  },
  {
    id: 'featured',
    name: 'Featured Listing',
    price: 99,
    description: 'Stand out with enhanced visibility',
    tier: 'featured',
    popular: true,
    features: [
      'Everything in Basic',
      'Featured badge (gold star)',
      'Appears at top of category',
      'Banner/header image',
      'Priority in search results',
      'Enhanced card styling',
      'Detailed analytics',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Listing',
    price: 149,
    description: 'Maximum exposure and priority placement',
    tier: 'premium',
    features: [
      'Everything in Featured',
      'Appears first on ALL pages',
      'Larger card display',
      'Enhanced analytics dashboard',
      'Priority support',
      'Custom CTA button',
      'Monthly performance report',
    ],
  },
];

interface DirectoryPricingTiersProps {
  selectedTier?: string;
  onSelectTier: (tierId: string, tier: 'basic' | 'featured' | 'premium', priceId?: string) => void;
  pricesFromStripe?: Array<{ id: string; tier: string; unit_amount: number }>;
}

export function DirectoryPricingTiers({ 
  selectedTier, 
  onSelectTier,
  pricesFromStripe 
}: DirectoryPricingTiersProps) {
  
  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'basic':
        return <Check className="h-5 w-5" />;
      case 'featured':
        return <Star className="h-5 w-5" />;
      case 'premium':
        return <Crown className="h-5 w-5" />;
      default:
        return <Check className="h-5 w-5" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic':
        return 'text-slate-600';
      case 'featured':
        return 'text-amber-600';
      case 'premium':
        return 'text-purple-600';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {TIERS.map((tier) => {
        // Find matching price from Stripe if available
        const stripePrice = pricesFromStripe?.find(p => p.tier === tier.tier);
        const displayPrice = stripePrice ? stripePrice.unit_amount / 100 : tier.price;
        const priceId = stripePrice?.id;
        
        const isSelected = selectedTier === tier.id;
        
        return (
          <Card
            key={tier.id}
            className={cn(
              'relative flex flex-col transition-all duration-200',
              tier.popular && 'border-2 border-primary shadow-lg',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-4">
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4', 
                tier.id === 'basic' && 'bg-slate-100',
                tier.id === 'featured' && 'bg-amber-100',
                tier.id === 'premium' && 'bg-purple-100'
              )}>
                <span className={getTierColor(tier.id)}>
                  {getTierIcon(tier.id)}
                </span>
              </div>
              
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription className="text-sm">{tier.description}</CardDescription>
              
              <div className="pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${displayPrice}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => onSelectTier(tier.id, tier.tier, priceId)}
              >
                {isSelected ? 'Selected' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
