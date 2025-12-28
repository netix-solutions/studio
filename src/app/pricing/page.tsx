
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { createCheckout } from '@/lib/stripe';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  User,
  Check,
  Shield,
  Clock,
  Star,
  Phone,
  Zap,
  TrendingUp,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Price {
  id: string;
  interval?: 'month' | 'year';
  unit_amount: number;
  currency: string;
  active: boolean;
}

interface Plan {
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

async function fetchPlansAndPrices(firestore: any): Promise<Plan[]> {
  const plansColRef = collection(firestore, 'plans');
  const q = query(plansColRef, where('active', '==', true));
  const planDocs = await getDocs(q);

  const allPlans: Plan[] = await Promise.all(
    planDocs.docs.map(async (planDoc) => {
      const planData = planDoc.data();

      const pricesColRef = collection(firestore, 'plans', planDoc.id, 'prices');
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
        id: planDoc.id,
        name: planData.name,
        description: planData.description,
        active: planData.active,
        prices: prices,
        features: planData.features,
        metadata: planData.metadata,
      };
    })
  );

  const sortedPlans = allPlans
    .filter(p => p.active && p.prices.length > 0)
    .sort((a, b) => {
        const aPrice = a.prices.find(p => p.interval === 'month')?.unit_amount || a.prices[0]?.unit_amount || 0;
        const bPrice = b.prices.find(p => p.interval === 'month')?.unit_amount || b.prices[0]?.unit_amount || 0;
        return aPrice - bPrice;
    });

  return sortedPlans;
}

// Mobile-optimized pricing card with improved touch targets
function MobilePricingCard({
  plan,
  onSelect,
  isSelected,
  isFeatured,
  billingCycle
}: {
  plan: Plan;
  onSelect: () => void;
  isSelected: boolean;
  isFeatured?: boolean;
  billingCycle: 'monthly' | 'yearly';
}) {
  const monthlyPrice = plan.prices.find(p => p.interval === 'month');
  const yearlyPrice = plan.prices.find(p => p.interval === 'year');

  const displayPrice = billingCycle === 'yearly' && yearlyPrice
    ? yearlyPrice.unit_amount / 12
    : monthlyPrice?.unit_amount;

  const savings = monthlyPrice && yearlyPrice
    ? Math.round(((monthlyPrice.unit_amount * 12 - yearlyPrice.unit_amount) / (monthlyPrice.unit_amount * 12)) * 100)
    : 0;

  // Plan-specific features and descriptions
  const planDetails = plan.name === 'Multi-Site' ? {
    tagline: 'Maximum Reach',
    description: 'Advertise on ALL community sites',
    features: [
      'Display on WesleyChapelCommunity.com',
      'Display on PascoCommunity.com',
      'Priority rotating placement',
      'Free professional ad design',
      'Unlimited ad updates',
      'Performance analytics dashboard'
    ],
    highlight: '2x the exposure'
  } : {
    tagline: 'Focused Reach',
    description: 'Advertise on one community site',
    features: [
      'Choose Wesley Chapel OR Pasco site',
      'Rotating banner placement',
      'Free professional ad design',
      'Ad updates included',
      'Cancel anytime'
    ],
    highlight: 'Great for targeting'
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border-2 p-5 md:p-6 transition-all duration-200 cursor-pointer touch-manipulation active:scale-[0.99]",
        isSelected
          ? "border-success bg-success-light/30 shadow-lg shadow-success/10"
          : "border-gray-200 bg-white hover:border-gray-300 active:border-gray-400",
        isFeatured && !isSelected && "border-brand-primary/30"
      )}
    >
      {/* Best Value Badge */}
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white px-4 md:px-5 py-1.5 text-[10px] md:text-xs font-semibold shadow-md whitespace-nowrap">
            <Star className="h-3 w-3 mr-1.5 fill-current" />
            BEST VALUE
          </Badge>
        </div>
      )}

      {/* Selection indicator - larger touch target */}
      <div className={cn(
        "absolute top-4 md:top-5 right-4 md:right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
        isSelected
          ? "border-success bg-success"
          : "border-gray-300 bg-white"
      )}>
        {isSelected && <Check className="h-4 w-4 text-white" />}
      </div>

      <div className="flex items-start gap-4 md:gap-5">
        {/* Plan Icon */}
        <div className={cn(
          "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0",
          isFeatured ? "bg-brand-primary/10" : "bg-gray-100"
        )}>
          {isFeatured ? (
            <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-brand-primary" />
          ) : (
            <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-gray-600" />
          )}
        </div>

        {/* Plan Details */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2.5 mb-1 md:mb-1.5 flex-wrap">
            <h3 className="font-bold text-base md:text-lg text-brand-primary font-headline">{plan.name}</h3>
            {savings > 0 && billingCycle === 'yearly' && (
              <Badge variant="secondary" className="bg-success-light text-success-dark text-[10px] md:text-xs font-semibold">
                Save {savings}%
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-600">{planDetails.description}</p>
        </div>
      </div>

      {/* Price Display */}
      <div className="mt-4 md:mt-5 pt-4 md:pt-5 border-t border-gray-100">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl md:text-3xl font-bold text-brand-primary">
            {displayPrice !== undefined
              ? `$${Math.round(displayPrice / 100)}`
              : 'N/A'}
          </span>
          <span className="text-gray-500 text-xs md:text-sm font-medium">/month</span>
        </div>
        {billingCycle === 'yearly' && yearlyPrice && (
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">
            Billed as ${(yearlyPrice.unit_amount / 100).toFixed(0)}/year
          </p>
        )}
      </div>

      {/* Features Preview */}
      <div className="mt-4 md:mt-5 space-y-2 md:space-y-2.5">
        {planDetails.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2.5 text-xs md:text-sm text-gray-600">
            <Check className="h-4 w-4 md:h-4.5 md:w-4.5 text-success flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
        {planDetails.features.length > 3 && (
          <p className="text-[10px] md:text-xs text-brand-secondary font-semibold pl-6 md:pl-7">
            +{planDetails.features.length - 3} more benefits
          </p>
        )}
      </div>
    </div>
  );
}

// Billing toggle component - Mobile optimized with larger touch targets
function BillingToggle({
  value,
  onChange,
  savings
}: {
  value: 'monthly' | 'yearly';
  onChange: (v: 'monthly' | 'yearly') => void;
  savings: number;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 p-1 bg-gray-100 rounded-full w-fit mx-auto">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          "px-4 md:px-5 py-2.5 md:py-2.5 rounded-full text-sm font-medium transition-all touch-manipulation active:scale-[0.98]",
          value === 'monthly'
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('yearly')}
        className={cn(
          "px-4 md:px-5 py-2.5 md:py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 md:gap-2 touch-manipulation active:scale-[0.98]",
          value === 'yearly'
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        Yearly
        {savings > 0 && (
          <Badge className="bg-green-500 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5">
            -{savings}%
          </Badge>
        )}
      </button>
    </div>
  );
}

// Trust indicators component - Mobile optimized
function TrustIndicators() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 md:gap-x-6 gap-y-2 md:gap-y-3 text-xs md:text-sm text-gray-500">
      <div className="flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
        <span>Secure Checkout</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500" />
        <span>Cancel Anytime</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-500" />
        <span>Live in 48 Hours</span>
      </div>
    </div>
  );
}

// FAQ Section - Mobile optimized
function PricingFAQ() {
  const faqs = [
    {
      q: "When will my ad go live?",
      a: "Most ads go live within 48 hours of completing signup. We'll design your ad and send a preview for your approval first."
    },
    {
      q: "Do I need to create my own ad?",
      a: "No! Our design team creates a professional, eye-catching banner for you at no extra charge. Just provide your logo and website."
    },
    {
      q: "Can I change my ad later?",
      a: "Absolutely. Request unlimited updates anytime—seasonal promotions, new offers, or fresh designs. It's all included."
    },
    {
      q: "What if I want to cancel?",
      a: "No contracts, no hassle. Cancel anytime through your account dashboard. Your ad runs until the end of your billing period."
    },
    {
      q: "How do I know it's working?",
      a: "Every ad is clickable and tracks visits to your website. You'll be able to see how many people are clicking through to learn more."
    }
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-5 md:mb-6 font-headline text-gray-900">
        Common Questions
      </h2>
      <Accordion type="single" collapsible className="space-y-2 md:space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="bg-white rounded-xl px-4 md:px-5 shadow-sm border border-gray-100"
          >
            <AccordionTrigger className="hover:no-underline py-3.5 md:py-4 text-left">
              <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 pb-3.5 md:pb-4 text-sm">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// Feature comparison for selected plan - Mobile optimized
function SelectedPlanDetails({ plan, billingCycle }: { plan: Plan; billingCycle: 'monthly' | 'yearly' }) {
  const isMultiSite = plan.name === 'Multi-Site';

  const allFeatures = isMultiSite ? [
    { text: 'Display on WesleyChapelCommunity.com', included: true },
    { text: 'Display on PascoCommunity.com', included: true },
    { text: 'Priority rotating banner placement', included: true },
    { text: 'Professional ad design (FREE)', included: true },
    { text: 'Unlimited ad updates', included: true },
    { text: 'Clickable link to your website', included: true },
    { text: 'Mobile-optimized display', included: true },
    { text: 'Cancel anytime - no contracts', included: true },
  ] : [
    { text: 'Display on your choice of community site', included: true },
    { text: 'Rotating banner placement', included: true },
    { text: 'Professional ad design (FREE)', included: true },
    { text: 'Ad updates included', included: true },
    { text: 'Clickable link to your website', included: true },
    { text: 'Mobile-optimized display', included: true },
    { text: 'Cancel anytime - no contracts', included: true },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 mt-4 md:mt-6">
      <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 font-headline text-gray-900 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
        What's Included
      </h3>
      <div className="space-y-2.5 md:space-y-3">
        {allFeatures.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2.5 md:gap-3">
            <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700 text-sm md:text-base">{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingPageContent() {
  const { firestore, user } = useFirebase();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const businessName = searchParams.get('businessName');
  const email = searchParams.get('email');

  // Prevent body scroll when sticky footer is visible on mobile
  useEffect(() => {
    // Add safe area padding for iOS
    document.body.classList.add('pb-safe');
    return () => {
      document.body.classList.remove('pb-safe');
    };
  }, []);

  useEffect(() => {
    if (firestore) {
      setLoading(true);
      fetchPlansAndPrices(firestore)
        .then(fetchedPlans => {
          setPlans(fetchedPlans);
          // Auto-select the featured plan or first plan
          const featured = fetchedPlans.find(p => p.metadata?.isFeatured === 'true');
          setSelectedPlanId(featured?.id || fetchedPlans[0]?.id || null);
        })
        .catch(error => {
          console.error("Error fetching plans and prices:", error);
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

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Calculate savings for the billing toggle
  const maxSavings = plans.reduce((max, plan) => {
    const monthly = plan.prices.find(p => p.interval === 'month')?.unit_amount || 0;
    const yearly = plan.prices.find(p => p.interval === 'year')?.unit_amount || 0;
    if (monthly && yearly) {
      const savings = Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
      return Math.max(max, savings);
    }
    return max;
  }, 0);

  const handlePurchase = async () => {
    if (!selectedPlan || !firestore) {
      toast({ title: 'Error', description: 'Please select a plan.', variant: 'destructive' });
      return;
    }

    const price = billingCycle === 'yearly'
      ? selectedPlan.prices.find(p => p.interval === 'year')
      : selectedPlan.prices.find(p => p.interval === 'month');

    if (!price) {
      toast({ title: 'Error', description: 'Price not available.', variant: 'destructive' });
      return;
    }

    setIsPurchasing(price.id);

    if (!user) {
      sessionStorage.setItem('selectedPriceId', price.id);
      const registerUrl = email ? `/register?email=${encodeURIComponent(email)}` : '/register';
      router.push(registerUrl);
      return;
    }

    try {
      await createCheckout(firestore, user.uid, user.email, price.id, window.location.origin + '/account');
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({ title: 'Error Starting Checkout', description: error.message || 'Could not redirect to checkout.', variant: 'destructive' });
      setIsPurchasing(null);
    }
  };

  // Get selected plan price for sticky CTA
  const getSelectedPrice = () => {
    if (!selectedPlan) return null;
    const price = billingCycle === 'yearly'
      ? selectedPlan.prices.find(p => p.interval === 'year')
      : selectedPlan.prices.find(p => p.interval === 'month');
    if (!price) return null;
    const displayAmount = billingCycle === 'yearly'
      ? Math.round(price.unit_amount / 12 / 100)
      : Math.round(price.unit_amount / 100);
    return displayAmount;
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-gray-100/80 safe-area-inset shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Community-Websites.com" width={44} height={24} className="h-[26px] md:h-[30px] w-auto" />
              <span className="font-headline font-bold text-brand-primary hidden sm:inline text-lg tracking-tight">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-3 md:gap-4">
              {/* Mobile: Icon-only phone */}
              <a
                href="tel:813-544-8383"
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 active:bg-brand-primary/30 transition-all duration-200"
                aria-label="Call us"
              >
                <Phone className="h-4 w-4" />
              </a>
              {/* Desktop: Full phone number */}
              <a
                href="tel:813-544-8383"
                className="hidden md:flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-secondary font-medium transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>813-544-8383</span>
              </a>
              <Button variant="ghost" size="sm" asChild className="h-10 px-4 text-brand-primary hover:bg-brand-primary/10">
                <Link href="/login">
                  <User className="h-4 w-4 md:mr-1.5" />
                  <span className="hidden md:inline font-medium">Login</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-40 md:pb-16">
        {/* Hero Section */}
        <section className="bg-white py-8 md:py-14 border-b border-gray-100">
          <div className="container mx-auto px-4 text-center">
            {businessName && (
              <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-medium mb-4 md:mb-5">
                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Special pricing for {businessName}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-headline text-brand-primary leading-tight">
              {businessName
                ? `Get ${businessName} in Front of Local Customers`
                : 'Simple, Affordable Local Advertising'}
            </h1>
            <p className="mt-4 md:mt-5 text-gray-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Choose your plan and start reaching thousands of Pasco County residents today. No contracts, cancel anytime.
            </p>

            {/* Trust indicators */}
            <div className="mt-6 md:mt-8">
              <TrustIndicators />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
          </div>
        ) : plans.length > 0 ? (
          <>
            {/* Billing Toggle */}
            <section className="py-6 bg-white border-b border-gray-100">
              <div className="container mx-auto px-4">
                <BillingToggle
                  value={billingCycle}
                  onChange={setBillingCycle}
                  savings={maxSavings}
                />
              </div>
            </section>

            {/* Plan Selection */}
            <section className="py-8">
              <div className="container mx-auto px-4 max-w-xl">
                <h2 className="text-lg font-semibold text-brand-primary mb-4 flex items-center gap-2.5">
                  <span className="w-7 h-7 bg-brand-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                  Select Your Plan
                </h2>

                <div className="space-y-4">
                  {plans.map((plan) => (
                    <MobilePricingCard
                      key={plan.id}
                      plan={plan}
                      onSelect={() => setSelectedPlanId(plan.id)}
                      isSelected={selectedPlanId === plan.id}
                      isFeatured={plan.metadata?.isFeatured === 'true'}
                      billingCycle={billingCycle}
                    />
                  ))}
                </div>

                {/* Selected Plan Details */}
                {selectedPlan && (
                  <SelectedPlanDetails plan={selectedPlan} billingCycle={billingCycle} />
                )}
              </div>
            </section>

            {/* What Happens Next */}
            <section className="py-8 bg-white border-t border-b border-gray-100">
              <div className="container mx-auto px-4 max-w-xl">
                <h2 className="text-lg font-semibold text-brand-primary mb-5 flex items-center gap-2.5">
                  <span className="w-7 h-7 bg-brand-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                  What Happens Next
                </h2>

                <div className="space-y-5">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 bg-success-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-success-dark">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-brand-primary">Create Your Account</h3>
                      <p className="text-sm text-gray-600 mt-0.5">Quick signup with your email address</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-11 h-11 bg-success-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-success-dark">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-brand-primary">We Design Your Ad</h3>
                      <p className="text-sm text-gray-600 mt-0.5">Our team creates a professional banner for you</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-11 h-11 bg-success-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-success-dark">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-brand-primary">Go Live in 48 Hours</h3>
                      <p className="text-sm text-gray-600 mt-0.5">Approve your ad and start reaching customers</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="py-10 bg-gray-50">
              <div className="container mx-auto px-4">
                <PricingFAQ />
              </div>
            </section>

            {/* Contact Section */}
            <section className="py-8 bg-white border-t border-gray-100">
              <div className="container mx-auto px-4 text-center">
                <p className="text-gray-600 mb-3">Questions? We're here to help.</p>
                <a
                  href="tel:813-544-8383"
                  className="inline-flex items-center gap-2 text-brand-secondary font-semibold text-lg hover:text-brand-primary transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  Call or text: 813-544-8383
                </a>
              </div>
            </section>

            {/* Desktop CTA */}
            <div className="hidden md:block py-8">
              <div className="container mx-auto px-4 max-w-xl">
                <Button
                  size="lg"
                  variant="success"
                  className="w-full h-14 text-lg shadow-lg shadow-success/25"
                  onClick={handlePurchase}
                  disabled={!selectedPlan || !!isPurchasing}
                >
                  {isPurchasing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Continue to Checkout
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="container mx-auto px-4 py-16">
            <Card className="max-w-md mx-auto text-center p-8 border-dashed">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-2">Plans Not Available</h2>
                <p className="text-gray-600 mb-6">
                  Pricing plans are being updated. Please check back soon or contact us directly.
                </p>
                <Button variant="outline" asChild>
                  <a href="tel:813-544-8383">
                    <Phone className="mr-2 h-4 w-4" />
                    Call 813-544-8383
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Sticky Mobile CTA - Enhanced for better mobile UX */}
      {!loading && plans.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] pb-safe md:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0 min-w-0">
              <p className="text-[11px] text-gray-500 truncate font-medium">
                {selectedPlan?.name || 'Select a plan'}
              </p>
              <p className="font-bold text-lg text-brand-primary">
                {getSelectedPrice() ? `$${getSelectedPrice()}/mo` : '—'}
              </p>
            </div>
            <Button
              size="lg"
              variant="success"
              className="flex-1 h-12 touch-manipulation rounded-xl max-w-[180px] shadow-lg shadow-success/25"
              onClick={handlePurchase}
              disabled={!selectedPlan || !!isPurchasing}
            >
              {isPurchasing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-center text-gray-500 mt-2">
            Secure checkout • Cancel anytime
          </p>
        </div>
      )}

      {/* Modern Footer */}
      <footer className="py-10 md:py-12 bg-brand-primary text-white/80">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-3 gap-10">
                {/* Branding */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <Image src="/logo.png" alt="Community-Websites.com Logo" width={44} height={24} className="h-[26px] w-auto" />
                         <span className="font-headline text-white text-lg font-bold tracking-wide">Community-Websites.com</span>
                    </div>
                    <p className="text-sm text-white/60 max-w-xs leading-relaxed">
                        Affordable, effective local advertising for Pasco County small businesses.
                    </p>
                </div>

                {/* Links */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-4">Account</h4>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link href="/login" className="hover:text-white transition-colors">Customer Login</Link></li>
                            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-white mb-4">Contact</h4>
                        <ul className="space-y-2.5 text-sm">
                            <li><a href="tel:813-544-8383" className="hover:text-white transition-colors">813-544-8383</a></li>
                            <li><a href="mailto:support@community-websites.com" className="hover:text-white transition-colors">support@community-websites.com</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/50">
                &copy; {new Date().getFullYear()} Community-Websites.com. All Rights Reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}
