'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone,
  Zap,
  Clock,
  Shield,
  MousePointer,
  Smartphone,
  RefreshCw,
  BarChart3,
  HeartHandshake,
  Check,
  ArrowRight,
  Sparkles,
  Users,
  Palette,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="text-center p-4 md:p-6">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h4 className="font-semibold text-foreground mb-1.5 text-sm md:text-base">{title}</h4>
      <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BenefitItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm md:text-base text-foreground">
      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <Check className="h-3 w-3 text-green-600" />
      </div>
      <span>{children}</span>
    </div>
  );
}

export function SubscriptionPitch() {
  return (
    <div className="space-y-8 md:space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-primary/10">
          <Megaphone className="h-10 w-10 md:h-12 md:w-12 text-primary" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            Reach Thousands of Local Customers
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Affordable advertising on Pasco County's most visited community websites.
            Get your business in front of people who live nearby and are ready to buy local.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground pt-2">
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
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        <div className="text-center p-4 rounded-xl bg-muted/50">
          <div className="text-2xl md:text-3xl font-bold text-primary">50K+</div>
          <div className="text-xs md:text-sm text-muted-foreground">Monthly Visitors</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/50">
          <div className="text-2xl md:text-3xl font-bold text-primary">100%</div>
          <div className="text-xs md:text-sm text-muted-foreground">Local Audience</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/50">
          <div className="text-2xl md:text-3xl font-bold text-primary">48hr</div>
          <div className="text-xs md:text-sm text-muted-foreground">Launch Time</div>
        </div>
      </div>

      {/* Two Ways to Create Your Ad */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <CardContent className="p-6 md:p-8">
          <div className="text-center mb-6">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Included with All Plans
            </Badge>
            <h3 className="text-xl md:text-2xl font-bold mb-2">Two Ways to Create Your Ad</h3>
            <p className="text-muted-foreground text-sm md:text-base">
              Every plan includes access to both options—choose what works best for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* DIY Option */}
            <div className="bg-background rounded-xl p-5 md:p-6 border">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-bold text-lg mb-2">Design It Yourself</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Use our state-of-the-art ad design tool right on your computer. Create professional ads instantly.
              </p>
              <div className="space-y-2">
                <BenefitItem>Instant access to design tool</BenefitItem>
                <BenefitItem>Professional templates</BenefitItem>
                <BenefitItem>Drag-and-drop editor</BenefitItem>
              </div>
            </div>

            {/* Done-for-you Option */}
            <div className="bg-background rounded-xl p-5 md:p-6 border">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-bold text-lg mb-2">Let Us Design It</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Prefer to leave it to the pros? Our design team will create a custom, eye-catching ad for your business.
              </p>
              <div className="space-y-2">
                <BenefitItem>Professional design team</BenefitItem>
                <BenefitItem>Custom branded ad</BenefitItem>
                <BenefitItem>Delivered within 48 hours</BenefitItem>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="space-y-4">
        <h3 className="text-lg md:text-xl font-bold text-center">Everything You Need to Succeed</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
          <FeatureCard
            icon={<MousePointer className="h-6 w-6 text-primary" />}
            title="Clickable Ad Link"
            description="Drive traffic directly to your website"
          />
          <FeatureCard
            icon={<Smartphone className="h-6 w-6 text-primary" />}
            title="Mobile Optimized"
            description="Looks great on all devices"
          />
          <FeatureCard
            icon={<RefreshCw className="h-6 w-6 text-primary" />}
            title="Unlimited Updates"
            description="Change your ad anytime"
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6 text-primary" />}
            title="Performance Tracking"
            description="See clicks and impressions"
          />
          <FeatureCard
            icon={<Clock className="h-6 w-6 text-primary" />}
            title="Cancel Anytime"
            description="No contracts or commitments"
          />
          <FeatureCard
            icon={<HeartHandshake className="h-6 w-6 text-primary" />}
            title="Dedicated Support"
            description="Real humans ready to help"
          />
        </div>
      </div>

      {/* CTA Section */}
      <Card className="border-primary bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6 md:p-10 text-center space-y-4">
          <h3 className="text-xl md:text-2xl font-bold">Ready to Grow Your Business?</h3>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Join local businesses already reaching thousands of Pasco County customers.
            Start advertising today with plans starting at just $49/month.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              asChild
            >
              <Link href="/pricing">
                View Plans & Pricing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-primary-foreground/60 pt-2">
            Questions? Call us at{' '}
            <a href="tel:813-544-8383" className="underline hover:no-underline">
              813-544-8383
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
