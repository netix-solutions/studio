'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Phone, Users, TrendingUp, Zap, PenTool, Shield, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GetStartedForm } from '@/components/landing/get-started-form';
import { LiveStatsBar } from '@/components/landing/stats';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Community-Websites.com" width={60} height={33} style={{height: '33px', width: 'auto'}} />
              <span className="font-headline font-semibold text-gray-900 hidden sm:inline">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-3">
              <a
                href="tel:813-544-8383"
                className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>813-544-8383</span>
              </a>
              <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="#get-started">
                  Get Started <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Height with Background */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/bg.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Copy */}
            <div className="text-white space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>Reaching 1,000+ local residents daily</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline leading-tight">
                Get Your Business in Front of
                <span className="text-blue-400"> Local Customers</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-200 max-w-xl">
                Affordable advertising on Pasco County's most visited community websites. Plans from just <span className="font-semibold text-white">$24/month</span>.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-lg h-14 px-8">
                  <Link href="#get-started">
                    See Pricing <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <a
                  href="tel:813-544-8383"
                  className="flex items-center justify-center gap-2 h-14 px-6 rounded-md border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  <span className="font-medium">Call 813-544-8383</span>
                </a>
              </div>

              {/* Quick Benefits */}
              <div className="grid grid-cols-2 gap-4 pt-6">
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">No contracts required</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">Free ad design included</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">Go live in 48 hours</span>
                </div>
              </div>
            </div>

            {/* Right - Form */}
            <div className="lg:pl-8">
              <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 font-headline">See Our Pricing</h2>
                    <p className="text-gray-600 mt-1">Fill out the form to view current rates</p>
                  </div>
                  <GetStartedForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce hidden md:block">
          <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <LiveStatsBar />

      {/* Value Propositions */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-gray-900">
              Why Local Businesses Choose Us
            </h2>
            <p className="mt-4 text-gray-600 text-lg">
              Simple, affordable, and effective local advertising
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 font-headline">Hyper-Local Reach</h3>
              <p className="text-gray-600">
                Your ad appears on the websites Pasco County residents visit for local news, events, and community updates.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-5">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 font-headline">Drive Real Traffic</h3>
              <p className="text-gray-600">
                Every ad is clickable and links directly to your website, booking page, or special offer.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-5">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 font-headline">Quick & Easy</h3>
              <p className="text-gray-600">
                No design skills needed. We'll create a professional ad for you and have it live within 48 hours.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="#get-started">
                Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Where Ads Appear */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Premium Placement</span>
              <h2 className="text-3xl md:text-4xl font-bold font-headline text-gray-900 mt-3 mb-6">
                Your Ad on Pasco County's Top Community Sites
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Reach engaged local residents on the websites they trust for community news and information.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">WesleyChapelCommunity.com</div>
                    <div className="text-sm text-gray-600">Wesley Chapel's #1 local news source</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">PascoCommunity.com</div>
                    <div className="text-sm text-gray-600">Covering all of Pasco County</div>
                  </div>
                </div>
              </div>

              <Button size="lg" asChild className="mt-8 bg-blue-600 hover:bg-blue-700">
                <Link href="#get-started">
                  Advertise on Both Sites <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl -z-10" />
              <div className="rounded-xl overflow-hidden shadow-xl">
                <Image
                  src="/adhere.png"
                  alt="Example of ad placement on community website"
                  width={600}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section className="py-16 md:py-24 bg-gray-900 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">
              Get Started in 3 Simple Steps
            </h2>
            <p className="mt-4 text-gray-400 text-lg">
              From signup to live ad in as little as 48 hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold mb-3 font-headline">Choose Your Plan</h3>
              <p className="text-gray-400">
                Pick a plan that fits your budget. No contracts, cancel anytime.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold mb-3 font-headline">We Design Your Ad</h3>
              <p className="text-gray-400">
                Upload your own or let our team create a professional ad for you.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold mb-3 font-headline">Go Live</h3>
              <p className="text-gray-400">
                Approve your ad and start reaching local customers immediately.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild className="bg-white text-gray-900 hover:bg-gray-100">
              <Link href="#get-started">
                Start Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-gray-900">
              Everything You Need to Succeed
            </h2>
            <p className="mt-4 text-gray-600 text-lg">
              No hidden fees. The price you see is the price you pay.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: PenTool, title: "Free Ad Design", desc: "Professional banner created for you" },
              { icon: TrendingUp, title: "Clickable Ads", desc: "Drive traffic to your website or offer" },
              { icon: Zap, title: "Quick Updates", desc: "Change your ad anytime, for free" },
              { icon: Shield, title: "No Contracts", desc: "Month-to-month, cancel anytime" },
              { icon: Users, title: "Local Targeting", desc: "Reach Pasco County residents" },
              { icon: CheckCircle, title: "Rotating Display", desc: "Fair exposure across all pages" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form Section - Primary Conversion Point */}
      <section id="get-started" className="py-16 md:py-24 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-xl mx-auto">
            <Card className="bg-white shadow-2xl border-0">
              <CardContent className="p-8 md:p-10">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-headline">
                    Ready to Grow Your Business?
                  </h2>
                  <p className="text-gray-600 mt-2">
                    Fill out the form below to see our current pricing and plans.
                  </p>
                </div>

                <GetStartedForm />

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-center text-gray-500 text-sm">
                    Questions? Call or text us anytime at{' '}
                    <a href="tel:813-544-8383" className="text-blue-600 font-medium hover:underline">
                      813-544-8383
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 mt-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Secure Form</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>No Spam</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Condensed */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-gray-900">
              Common Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-white rounded-lg px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-5">
                <span className="text-left font-semibold">What types of businesses do you work with?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-5">
                We work with all local businesses in Pasco County—restaurants, real estate agents, contractors, medical offices, retailers, and more. If you serve the local community, we can help you reach more customers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white rounded-lg px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-5">
                <span className="text-left font-semibold">Do I need to provide my own ad design?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-5">
                No! Our design team will create a professional, mobile-friendly banner for your business at no extra cost. Just provide your logo, website, and any messaging preferences.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white rounded-lg px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-5">
                <span className="text-left font-semibold">How quickly will my ad go live?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-5">
                Most ads go live within 48 hours of approval. We'll send you a preview to approve before your ad starts running.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-white rounded-lg px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-5">
                <span className="text-left font-semibold">Can I cancel anytime?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-5">
                Absolutely. There are no contracts or cancellation fees. You can cancel your subscription anytime through your customer portal.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-white rounded-lg px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-5">
                <span className="text-left font-semibold">Can I update my ad later?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-5">
                Yes! Just email us with your updates and we'll refresh your ad within 1-2 business days at no extra charge.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-10">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <a
              href="tel:813-544-8383"
              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline"
            >
              <Phone className="h-5 w-5" />
              Call or text us: 813-544-8383
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
            Ready to Reach More Local Customers?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Join local businesses already advertising on Pasco County's most visited community websites.
          </p>
          <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 h-14 px-10 text-lg">
            <Link href="#get-started">
              Get Started Now <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 bg-gray-950 text-gray-400">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Community-Websites.com" width={50} height={28} style={{height: '28px', width: 'auto'}} />
              <span className="text-sm">© {new Date().getFullYear()} Community-Websites.com</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="tel:813-544-8383" className="hover:text-white transition-colors">813-544-8383</a>
              <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
