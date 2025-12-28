'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { createCheckout } from '@/lib/stripe';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Check,
  Shield,
  Clock,
  Star,
  Phone,
  Zap,
  ChevronDown,
  ArrowRight,
  Sparkles,
  CheckCircle,
  User as UserIcon,
  Palette,
  Wand2,
  Play,
  X,
  MousePointer,
  BarChart3,
  RefreshCw,
  Smartphone,
  Globe,
  HeartHandshake,
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

// Enhanced pricing card with modern design
function PricingCard({
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

  const isMultiSite = plan.name === 'Multi-Site';

  const planFeatures = isMultiSite ? [
    'Display on ALL community sites',
    'Priority rotating placement',
    'Maximum local exposure',
  ] : [
    'Choose your community site',
    'Rotating banner placement',
    'Targeted local reach',
  ];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl md:rounded-3xl border-2 p-5 md:p-8 transition-all duration-300 cursor-pointer touch-manipulation",
        "hover:shadow-xl hover:-translate-y-1",
        isSelected
          ? "border-success bg-gradient-to-br from-success-light/40 to-success-light/20 shadow-xl shadow-success/15 scale-[1.02]"
          : isFeatured
            ? "border-brand-primary/40 bg-white hover:border-brand-primary/60"
            : "border-gray-200 bg-white hover:border-gray-300",
      )}
    >
      {/* Best Value Badge */}
      {isFeatured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-light text-white px-5 py-1.5 text-xs font-bold shadow-lg whitespace-nowrap rounded-full">
            <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
            BEST VALUE
          </Badge>
        </div>
      )}

      {/* Selection indicator */}
      <div className={cn(
        "absolute top-4 md:top-6 right-4 md:right-6 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200",
        isSelected
          ? "border-success bg-success scale-110"
          : "border-gray-300 bg-white"
      )}>
        {isSelected && <Check className="h-4 w-4 text-white" />}
      </div>

      {/* Plan Name & Description */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center",
            isFeatured ? "bg-brand-primary/10" : "bg-gray-100"
          )}>
            {isFeatured ? (
              <Globe className="h-5 w-5 md:h-6 md:w-6 text-brand-primary" />
            ) : (
              <MousePointer className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg md:text-xl text-gray-900 font-headline">{plan.name}</h3>
            <p className="text-xs md:text-sm text-gray-500">{isMultiSite ? 'Maximum Reach' : 'Focused Reach'}</p>
          </div>
        </div>
      </div>

      {/* Price Display */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-bold text-gray-900">
            {displayPrice !== undefined
              ? `$${Math.round(displayPrice / 100)}`
              : 'N/A'}
          </span>
          <span className="text-gray-500 text-sm md:text-base font-medium">/month</span>
        </div>
        {billingCycle === 'yearly' && yearlyPrice ? (
          <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-2">
            <span className="font-semibold text-success-dark">${(yearlyPrice.unit_amount / 100).toFixed(0)}</span> billed annually
            {savings > 0 && (
              <Badge variant="secondary" className="bg-success-light text-success-dark text-xs font-semibold">
                Save {savings}%
              </Badge>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500 mt-1.5">
            Billed monthly • Switch to yearly to save
          </p>
        )}
      </div>

      {/* Features */}
      <div className="space-y-3">
        {planFeatures.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm md:text-base text-gray-700">
            <div className="w-5 h-5 rounded-full bg-success-light flex items-center justify-center flex-shrink-0">
              <Check className="h-3 w-3 text-success-dark" />
            </div>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {/* Selection hint */}
      <div className={cn(
        "mt-6 pt-5 border-t text-center text-sm font-medium transition-colors",
        isSelected ? "border-success/30 text-success-dark" : "border-gray-100 text-gray-400"
      )}>
        {isSelected ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Selected
          </span>
        ) : (
          <span>Click to select this plan</span>
        )}
      </div>
    </div>
  );
}

// Billing toggle component with modern design
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
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 p-1.5 bg-gray-100 rounded-full">
        <button
          onClick={() => onChange('monthly')}
          className={cn(
            "px-5 md:px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all touch-manipulation",
            value === 'monthly'
              ? "bg-white shadow-md text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => onChange('yearly')}
          className={cn(
            "px-5 md:px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all flex items-center gap-2 touch-manipulation",
            value === 'yearly'
              ? "bg-white shadow-md text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Yearly
          {savings > 0 && (
            <Badge className="bg-gradient-to-r from-success to-green-400 text-white text-xs px-2 py-0.5 rounded-full">
              -{savings}%
            </Badge>
          )}
        </button>
      </div>
      <p className="text-sm text-gray-500">
        {value === 'yearly'
          ? 'Save more with annual billing'
          : 'Flexible month-to-month'}
      </p>
    </div>
  );
}

// Ad Design Options Section - Highlighting both options
function AdDesignOptions() {
  return (
    <div className="bg-gradient-to-br from-brand-primary/5 via-white to-brand-secondary/5 rounded-3xl p-6 md:p-10 border border-brand-primary/10">
      <div className="text-center mb-8">
        <Badge className="bg-brand-primary/10 text-brand-primary border-0 mb-4">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Included with All Plans
        </Badge>
        <h3 className="text-2xl md:text-3xl font-bold font-headline text-gray-900 mb-3">
          Two Ways to Create Your Ad
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Every plan includes access to both options—choose what works best for you
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* DIY Option */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-secondary to-brand-light flex items-center justify-center mb-5">
            <Palette className="h-7 w-7 text-white" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-3 font-headline">
            Design It Yourself
          </h4>
          <p className="text-gray-600 mb-5">
            Use our state-of-the-art ad design tool right on your computer. Create professional ads instantly with easy-to-use templates and drag-and-drop editing.
          </p>
          <ul className="space-y-2.5">
            {['Instant access to design tool', 'Professional templates', 'Drag-and-drop editor', 'Download & preview anytime'].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                <Check className="h-4 w-4 text-brand-secondary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Done-for-you Option */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success to-green-400 flex items-center justify-center mb-5">
            <Wand2 className="h-7 w-7 text-white" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-3 font-headline">
            Let Us Design It
          </h4>
          <p className="text-gray-600 mb-5">
            Prefer to leave it to the pros? Our design team will create a custom, eye-catching ad for your business—just send us your logo and we'll handle the rest.
          </p>
          <ul className="space-y-2.5">
            {['Professional design team', 'Custom branded ad', 'Revision included', 'Delivered within 48 hours'].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// What's included section
function WhatsIncluded() {
  const features = [
    {
      icon: MousePointer,
      title: 'Clickable Ad Link',
      description: 'Drive traffic directly to your website with every click',
    },
    {
      icon: Smartphone,
      title: 'Mobile Optimized',
      description: 'Your ad looks great on phones, tablets, and desktops',
    },
    {
      icon: RefreshCw,
      title: 'Unlimited Updates',
      description: 'Change your ad anytime—seasonal promos, new offers',
    },
    {
      icon: BarChart3,
      title: 'Performance Tracking',
      description: 'See how many people click through to your site',
    },
    {
      icon: Clock,
      title: 'Cancel Anytime',
      description: 'No contracts, no commitments. Cancel with one click',
    },
    {
      icon: HeartHandshake,
      title: 'Dedicated Support',
      description: 'Real humans ready to help via phone or email',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {features.map((feature, idx) => (
        <div key={idx} className="text-center p-4 md:p-6">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-4">
            <feature.icon className="h-6 w-6 md:h-7 md:w-7 text-brand-primary" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-1.5 text-sm md:text-base">{feature.title}</h4>
          <p className="text-xs md:text-sm text-gray-500">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}

// Trust indicators component
function TrustIndicators() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 md:gap-x-8 gap-y-3 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-green-500" />
        <span className="font-medium">Secure Checkout</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-500" />
        <span className="font-medium">Cancel Anytime</span>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <span className="font-medium">Live in 48 Hours</span>
      </div>
    </div>
  );
}

// FAQ Section with improved design
function PricingFAQ() {
  const faqs = [
    {
      q: "When will my ad go live?",
      a: "Most ads go live within 48 hours of completing signup. If you design your own ad, it can go live even faster. If our team designs it, we'll send a preview for your approval first."
    },
    {
      q: "Do I need to create my own ad?",
      a: "You have two options: use our state-of-the-art design tool to create your ad instantly on your computer, or let our professional design team create a custom ad for you at no extra charge. Both options are included with every plan!"
    },
    {
      q: "Can I change my ad later?",
      a: "Absolutely. Request unlimited updates anytime—seasonal promotions, new offers, or fresh designs. Whether you DIY or use our team, changes are always included."
    },
    {
      q: "What if I want to cancel?",
      a: "No contracts, no hassle. Cancel anytime through your account dashboard with just one click. Your ad runs until the end of your billing period."
    },
    {
      q: "How do I know it's working?",
      a: "Every ad is clickable and tracks visits to your website. You'll be able to see exactly how many people are clicking through to learn more about your business."
    },
    {
      q: "What's the difference between Single-Site and Multi-Site?",
      a: "Single-Site displays your ad on one community website of your choice. Multi-Site displays your ad on ALL our community websites, giving you maximum exposure across Pasco County."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-2xl md:text-3xl font-bold font-headline text-gray-900 mb-3">
          Questions? We've Got Answers
        </h2>
        <p className="text-gray-600">Everything you need to know about advertising with us</p>
      </div>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="bg-white rounded-xl md:rounded-2xl px-5 md:px-6 shadow-sm border border-gray-100 data-[state=open]:shadow-md transition-shadow"
          >
            <AccordionTrigger className="hover:no-underline py-4 md:py-5 text-left">
              <span className="font-semibold text-gray-900 text-sm md:text-base pr-4">{faq.q}</span>
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// How it works timeline
function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Choose Your Plan',
      description: 'Pick the coverage that fits your goals',
    },
    {
      number: '2',
      title: 'Create Your Ad',
      description: 'Design it yourself or let us handle it',
    },
    {
      number: '3',
      title: 'Go Live',
      description: 'Start reaching local customers in 48 hours',
    },
  ];

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <div className="flex md:flex-col items-center gap-4 md:gap-3 text-center w-full md:w-auto">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-brand-primary text-white flex items-center justify-center text-xl md:text-2xl font-bold flex-shrink-0">
              {step.number}
            </div>
            <div className="text-left md:text-center flex-1 md:flex-initial">
              <h4 className="font-bold text-gray-900 text-base md:text-lg">{step.title}</h4>
              <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
            </div>
          </div>
          {idx < steps.length - 1 && (
            <div className="hidden md:block w-20 lg:w-32 h-0.5 bg-gradient-to-r from-brand-primary/30 to-brand-primary/10 mx-4" />
          )}
        </React.Fragment>
      ))}
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
    <div className="min-h-[100dvh] bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100 safe-area-inset">
        <div className="container mx-auto px-4">
          <div className="flex h-16 md:h-18 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Community-Websites.com" width={44} height={24} className="h-[26px] md:h-[32px] w-auto" />
              <span className="font-headline font-bold text-brand-primary text-base md:text-lg tracking-tight hidden sm:inline">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              <a
                href="tel:813-544-8383"
                className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-brand-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                813-544-8383
              </a>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" className="font-medium">
                  <UserIcon className="h-4 w-4 md:mr-1.5" />
                  <span className="hidden md:inline">Login</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-32 md:pb-24">
        {/* Hero Section with Background Image */}
        <section className="relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/overhead1.jpg"
              alt="Florida Community"
              fill
              className="object-cover"
              priority
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/90 via-brand-primary/80 to-brand-secondary/70" />
          </div>

          {/* Content */}
          <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 lg:py-32">
            <div className="max-w-4xl mx-auto text-center">
              {businessName && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm font-medium mb-6 border border-white/20">
                  <Sparkles className="h-4 w-4" />
                  Special pricing for {businessName}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-white leading-tight mb-6">
                {businessName
                  ? `Get ${businessName} in Front of Local Customers`
                  : 'Reach Thousands of Local Customers'}
              </h1>

              <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-8">
                Affordable advertising on Pasco County's most visited community websites. Design your own ad or let us create one for you.
              </p>

              {/* Key Benefits Pills */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm border border-white/20">
                  <Check className="h-4 w-4 text-green-300" />
                  Cancel anytime
                </span>
                <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm border border-white/20">
                  <Check className="h-4 w-4 text-green-300" />
                  No design skills needed
                </span>
                <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm border border-white/20">
                  <Check className="h-4 w-4 text-green-300" />
                  Live in 48 hours
                </span>
              </div>

              {/* Scroll indicator */}
              <button
                onClick={() => document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors group"
              >
                <span className="text-sm font-medium">View Plans</span>
                <ChevronDown className="h-5 w-5 animate-bounce" />
              </button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-16 bg-gray-50 border-b border-gray-100">
          <div className="container mx-auto px-4">
            <HowItWorks />
          </div>
        </section>

        {loading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
          </div>
        ) : plans.length > 0 ? (
          <>
            {/* Pricing Plans Section */}
            <section id="pricing-plans" className="py-12 md:py-20 scroll-mt-20">
              <div className="container mx-auto px-4">
                <div className="text-center mb-10 md:mb-12">
                  <h2 className="text-2xl md:text-4xl font-bold font-headline text-gray-900 mb-4">
                    Choose Your Plan
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                    All plans include professional ad design (DIY or done-for-you), unlimited updates, and the ability to cancel anytime.
                  </p>
                  <BillingToggle
                    value={billingCycle}
                    onChange={setBillingCycle}
                    savings={maxSavings}
                  />
                </div>

                {/* Plan Cards */}
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8">
                  {plans.map((plan) => (
                    <PricingCard
                      key={plan.id}
                      plan={plan}
                      onSelect={() => setSelectedPlanId(plan.id)}
                      isSelected={selectedPlanId === plan.id}
                      isFeatured={plan.metadata?.isFeatured === 'true'}
                      billingCycle={billingCycle}
                    />
                  ))}
                </div>

                {/* CTA Button (Desktop) */}
                <div className="hidden md:block text-center mt-10">
                  <Button
                    size="lg"
                    variant="success"
                    className="h-14 px-12 text-lg shadow-xl shadow-success/25 hover:shadow-2xl hover:shadow-success/30 transition-all"
                    onClick={handlePurchase}
                    disabled={!selectedPlan || !!isPurchasing}
                  >
                    {isPurchasing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Get Started Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-green-500" />
                      Secure checkout
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Cancel anytime
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* Ad Design Options Section */}
            <section className="py-12 md:py-20 bg-gray-50">
              <div className="container mx-auto px-4">
                <AdDesignOptions />
              </div>
            </section>

            {/* Second Hero with Background */}
            <section className="relative py-20 md:py-28 overflow-hidden">
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <Image
                  src="/overhead1.jpg"
                  alt="Florida Neighborhood"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-primary/90 to-brand-primary/80" />
              </div>

              <div className="relative z-10 container mx-auto px-4">
                <div className="max-w-3xl">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-headline text-white mb-6">
                    Connect with Your Neighbors
                  </h2>
                  <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
                    Our community websites are where Pasco County residents go for local news, events, and recommendations. Your ad puts your business right in front of people who live nearby and are ready to buy local.
                  </p>
                  <div className="flex flex-wrap gap-6">
                    <div className="text-center">
                      <div className="text-4xl md:text-5xl font-bold text-white mb-1">50K+</div>
                      <div className="text-sm text-white/60">Monthly Visitors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl md:text-5xl font-bold text-white mb-1">100%</div>
                      <div className="text-sm text-white/60">Local Audience</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl md:text-5xl font-bold text-white mb-1">48hr</div>
                      <div className="text-sm text-white/60">Launch Time</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* What's Included Section */}
            <section className="py-12 md:py-20">
              <div className="container mx-auto px-4">
                <div className="text-center mb-10 md:mb-12">
                  <h2 className="text-2xl md:text-4xl font-bold font-headline text-gray-900 mb-4">
                    Everything You Need to Succeed
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Every plan comes loaded with features to help your business stand out
                  </p>
                </div>
                <WhatsIncluded />
              </div>
            </section>

            {/* FAQ Section */}
            <section className="py-12 md:py-20 bg-gray-50">
              <div className="container mx-auto px-4">
                <PricingFAQ />
              </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-16 md:py-24 bg-brand-primary">
              <div className="container mx-auto px-4 text-center">
                <h2 className="text-2xl md:text-4xl font-bold font-headline text-white mb-4">
                  Ready to Grow Your Business?
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                  Join local businesses already reaching thousands of Pasco County customers.
                </p>
                <Button
                  size="lg"
                  className="h-14 px-10 text-lg bg-white text-brand-primary hover:bg-gray-100 shadow-xl"
                  onClick={() => document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View Plans
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-sm text-white/60 mt-6">
                  Questions? Call us at <a href="tel:813-544-8383" className="text-white hover:underline font-medium">813-544-8383</a>
                </p>
              </div>
            </section>

            {/* Spacer for sticky footer */}
            <div className="h-4" />
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] pb-safe md:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0 min-w-0">
              <p className="text-xs text-gray-500 truncate font-medium">
                {selectedPlan?.name || 'Select a plan'} • {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
              </p>
              <p className="font-bold text-xl text-gray-900">
                {getSelectedPrice() ? `$${getSelectedPrice()}/mo` : '—'}
              </p>
            </div>
            <Button
              size="lg"
              variant="success"
              className="flex-1 h-12 touch-manipulation rounded-xl max-w-[160px] shadow-lg shadow-success/25 text-base font-semibold"
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
        </div>
      )}

      {/* Sticky Desktop CTA */}
      {!loading && plans.length > 0 && (
        <div className="hidden md:block fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between max-w-5xl mx-auto gap-6">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    {selectedPlan?.name || 'Select a plan'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="font-bold text-2xl text-gray-900">
                      {getSelectedPrice() ? `$${getSelectedPrice()}/mo` : '—'}
                    </p>
                    {billingCycle === 'yearly' && selectedPlan && (
                      <span className="text-sm text-gray-500">billed annually</span>
                    )}
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-5 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-green-500" />
                    Secure checkout
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Cancel anytime
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Live in 48 hours
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                variant="success"
                className="h-12 px-8 text-base shadow-lg shadow-success/25"
                onClick={handlePurchase}
                disabled={!selectedPlan || !!isPurchasing}
              >
                {isPurchasing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 md:py-16 bg-gray-900 text-white/70">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-10">
            {/* Branding */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="Community-Websites.com Logo" width={44} height={24} className="h-[28px] w-auto brightness-0 invert" />
                <span className="font-headline text-white text-lg font-bold">Community-Websites.com</span>
              </div>
              <p className="text-sm text-white/50 max-w-sm leading-relaxed">
                Affordable, effective local advertising for Pasco County small businesses. Reach your neighbors where they already spend time online.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Customer Login</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact Us</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="tel:813-544-8383" className="hover:text-white transition-colors flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    813-544-8383
                  </a>
                </li>
                <li>
                  <a href="mailto:support@community-websites.com" className="hover:text-white transition-colors">
                    support@community-websites.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-white/40">
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
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}
