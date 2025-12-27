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

// Mobile-optimized pricing card
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
        "relative rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer",
        isSelected
          ? "border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100"
          : "border-gray-200 bg-white hover:border-gray-300",
        isFeatured && !isSelected && "border-blue-200"
      )}
    >
      {/* Best Value Badge */}
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1 text-xs font-semibold shadow-md">
            <Star className="h-3 w-3 mr-1 fill-current" />
            BEST VALUE
          </Badge>
        </div>
      )}

      {/* Selection indicator */}
      <div className={cn(
        "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
        isSelected
          ? "border-blue-600 bg-blue-600"
          : "border-gray-300 bg-white"
      )}>
        {isSelected && <Check className="h-4 w-4 text-white" />}
      </div>

      <div className="flex items-start gap-4">
        {/* Plan Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          isFeatured ? "bg-blue-100" : "bg-gray-100"
        )}>
          {isFeatured ? (
            <Sparkles className="h-6 w-6 text-blue-600" />
          ) : (
            <TrendingUp className="h-6 w-6 text-gray-600" />
          )}
        </div>

        {/* Plan Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-gray-900 font-headline">{plan.name}</h3>
            {savings > 0 && billingCycle === 'yearly' && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                Save {savings}%
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">{planDetails.description}</p>
        </div>
      </div>

      {/* Price Display */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">
            {displayPrice !== undefined
              ? `$${Math.round(displayPrice / 100)}`
              : 'N/A'}
          </span>
          <span className="text-gray-500 text-sm">/month</span>
        </div>
        {billingCycle === 'yearly' && yearlyPrice && (
          <p className="text-xs text-gray-500 mt-1">
            Billed as ${(yearlyPrice.unit_amount / 100).toFixed(0)}/year
          </p>
        )}
      </div>

      {/* Features Preview */}
      <div className="mt-4 space-y-2">
        {planDetails.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
        {planDetails.features.length > 3 && (
          <p className="text-xs text-blue-600 font-medium pl-6">
            +{planDetails.features.length - 3} more benefits
          </p>
        )}
      </div>
    </div>
  );
}

// Billing toggle component
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
    <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 rounded-full w-fit mx-auto">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          "px-5 py-2.5 rounded-full text-sm font-medium transition-all",
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
          "px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
          value === 'yearly'
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        Yearly
        {savings > 0 && (
          <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">
            -{savings}%
          </Badge>
        )}
      </button>
    </div>
  );
}

// Trust indicators component
function TrustIndicators() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-500">
      <div className="flex items-center gap-1.5">
        <Shield className="h-4 w-4 text-green-500" />
        <span>Secure Checkout</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-blue-500" />
        <span>Cancel Anytime</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Zap className="h-4 w-4 text-yellow-500" />
        <span>Live in 48 Hours</span>
      </div>
    </div>
  );
}

// FAQ Section
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
      <h2 className="text-2xl font-bold text-center mb-6 font-headline text-gray-900">
        Common Questions
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="bg-white rounded-xl px-5 shadow-sm border border-gray-100"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-left">
              <span className="font-semibold text-gray-900 text-sm">{faq.q}</span>
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 pb-4 text-sm">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// Feature comparison for selected plan
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
      <h3 className="font-bold text-lg mb-4 font-headline text-gray-900 flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-500" />
        What's Included
      </h3>
      <div className="space-y-3">
        {allFeatures.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature.text}</span>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Community-Websites.com" width={50} height={28} style={{height: '28px', width: 'auto'}} />
              <span className="font-headline font-semibold text-gray-900 text-sm hidden sm:inline">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-3">
              <a
                href="tel:813-544-8383"
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">813-544-8383</span>
              </a>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <User className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-32 md:pb-16">
        {/* Hero Section */}
        <section className="bg-white py-8 md:py-12 border-b border-gray-100">
          <div className="container mx-auto px-4 text-center">
            {businessName && (
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-2 text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Special pricing for {businessName}
              </div>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-headline text-gray-900 leading-tight">
              {businessName
                ? `Get ${businessName} in Front of Local Customers`
                : 'Simple, Affordable Local Advertising'}
            </h1>
            <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">
              Choose your plan and start reaching thousands of Pasco County residents today. No contracts, cancel anytime.
            </p>

            {/* Trust indicators */}
            <div className="mt-6">
              <TrustIndicators />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  What Happens Next
                </h2>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-green-600">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Create Your Account</h3>
                      <p className="text-sm text-gray-600">Quick signup with your email address</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-green-600">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">We Design Your Ad</h3>
                      <p className="text-sm text-gray-600">Our team creates a professional banner for you</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-green-600">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Go Live in 48 Hours</h3>
                      <p className="text-sm text-gray-600">Approve your ad and start reaching customers</p>
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
                  className="inline-flex items-center gap-2 text-blue-600 font-semibold text-lg hover:text-blue-700"
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
                  className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg"
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

      {/* Sticky Mobile CTA */}
      {!loading && plans.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-500">
                {selectedPlan?.name || 'Select a plan'}
              </p>
              <p className="font-bold text-lg text-gray-900">
                {getSelectedPrice() ? `$${getSelectedPrice()}/mo` : '—'}
              </p>
            </div>
            <Button
              size="lg"
              className="flex-1 h-12 font-semibold bg-blue-600 hover:bg-blue-700"
              onClick={handlePurchase}
              disabled={!selectedPlan || !!isPurchasing}
            >
              {isPurchasing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            Secure checkout • Cancel anytime
          </p>
        </div>
      )}
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
