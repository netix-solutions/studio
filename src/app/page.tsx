'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Phone, Users, TrendingUp, Zap, PenTool, Shield, ChevronRight, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GetStartedForm } from '@/components/landing/get-started-form';
import { LiveStatsBar } from '@/components/landing/stats';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Mobile-First Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 safe-area-inset">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Community-Websites.com" width={48} height={27} className="h-[27px] md:h-[33px] w-auto" />
              <span className="font-headline font-semibold text-gray-900 text-[11px] sm:text-sm md:text-base tracking-tight">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile: Icon only phone button */}
              <a
                href="tel:813-544-8383"
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                aria-label="Call us"
              >
                <Phone className="h-5 w-5" />
              </a>
              {/* Desktop: Full phone number */}
              <a
                href="tel:813-544-8383"
                className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>813-544-8383</span>
              </a>
              <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 h-10 px-4 md:px-5 text-sm font-medium">
                <Link href="#get-started">
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Start</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile-First with Background */}
      <section className="relative min-h-[100dvh] flex items-center pt-14 md:pt-16">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/bg.png"
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Stronger gradient on mobile for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-black/80 via-black/70 to-black/50 md:from-black/70 md:via-black/50 md:to-black/30" />
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-6 py-8 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Copy */}
            <div className="text-white space-y-4 md:space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>Reaching 1,000+ local residents daily</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-headline leading-tight">
                Get Your Business in Front of
                <span className="text-blue-400"> Local Customers</span>
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-gray-200 max-w-xl mx-auto lg:mx-0">
                Affordable advertising on Pasco County's most visited community websites. Plans from just <span className="font-semibold text-white">$24/month</span>.
              </p>

              {/* Mobile: Single prominent CTA */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
                <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-base md:text-lg h-12 md:h-14 px-6 md:px-8 w-full sm:w-auto touch-manipulation">
                  <Link href="#get-started">
                    See Pricing <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <a
                  href="tel:813-544-8383"
                  className="flex items-center justify-center gap-2 h-12 md:h-14 px-5 md:px-6 rounded-lg border-2 border-white/30 text-white hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
                >
                  <Phone className="h-5 w-5" />
                  <span className="font-medium">813-544-8383</span>
                </a>
              </div>

              {/* Quick Benefits - 2x2 grid, more compact on mobile */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:gap-4 pt-4 md:pt-6 max-w-md mx-auto lg:mx-0">
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">No contracts</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">Free ad design</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">Live in 48 hours</span>
                </div>
              </div>
            </div>

            {/* Right - Form Card */}
            <div className="lg:pl-8 mt-4 lg:mt-0">
              <Card className="bg-white/95 backdrop-blur-md shadow-2xl border-0 rounded-2xl overflow-hidden">
                <CardContent className="p-5 md:p-8">
                  <div className="text-center mb-5 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 font-headline">See Our Pricing</h2>
                    <p className="text-gray-600 mt-1 text-sm md:text-base">Fill out the form to view current rates</p>
                  </div>
                  <GetStartedForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Scroll indicator - hidden on mobile */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce hidden lg:block">
          <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <LiveStatsBar />

      {/* Value Propositions */}
      <section className="py-12 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-gray-900">
              Why Local Businesses Choose Us
            </h2>
            <p className="mt-3 md:mt-4 text-gray-600 text-base md:text-lg">
              Simple, affordable, and effective local advertising
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            <div className="bg-white rounded-xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow active:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 md:mb-5">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3 font-headline">Hyper-Local Reach</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Your ad appears on the websites Pasco County residents visit for local news, events, and community updates.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow active:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 md:mb-5">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3 font-headline">Drive Real Traffic</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Every ad is clickable and links directly to your website, booking page, or special offer.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow active:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 md:mb-5">
                <Zap className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3 font-headline">Quick & Easy</h3>
              <p className="text-gray-600 text-sm md:text-base">
                No design skills needed. We'll create a professional ad for you and have it live within 48 hours.
              </p>
            </div>
          </div>

          <div className="text-center mt-8 md:mt-12">
            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 h-12 md:h-14 px-6 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation">
              <Link href="#get-started">
                Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Where Ads Appear */}
      <section className="py-12 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <span className="text-blue-600 font-semibold text-xs md:text-sm uppercase tracking-wide">Premium Placement</span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-gray-900 mt-2 md:mt-3 mb-4 md:mb-6">
                Your Ad on Pasco County's Top Community Sites
              </h2>
              <p className="text-gray-600 text-base md:text-lg mb-6 md:mb-8">
                Reach engaged local residents on the websites they trust for community news and information.
              </p>

              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm md:text-base">WesleyChapelCommunity.com</div>
                    <div className="text-xs md:text-sm text-gray-600">Wesley Chapel's #1 local news source</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm md:text-base">PascoCommunity.com</div>
                    <div className="text-xs md:text-sm text-gray-600">Covering all of Pasco County</div>
                  </div>
                </div>
              </div>

              <Button size="lg" asChild className="mt-6 md:mt-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 h-12 md:h-14 px-6 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation">
                <Link href="#get-started">
                  Advertise on Both Sites <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="relative order-1 lg:order-2">
              <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl md:rounded-2xl -z-10" />
              <div className="rounded-xl overflow-hidden shadow-xl">
                <Image
                  src="/adhere.png"
                  alt="Example of ad placement on community website"
                  width={600}
                  height={500}
                  className="w-full h-auto"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section className="py-12 md:py-24 bg-gray-900 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline">
              Get Started in 3 Simple Steps
            </h2>
            <p className="mt-3 md:mt-4 text-gray-400 text-base md:text-lg">
              From signup to live ad in as little as 48 hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-5 text-xl md:text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 font-headline">Choose Your Plan</h3>
              <p className="text-gray-400 text-sm md:text-base">
                Pick a plan that fits your budget. No contracts, cancel anytime.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-5 text-xl md:text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 font-headline">We Design Your Ad</h3>
              <p className="text-gray-400 text-sm md:text-base">
                Upload your own or let our team create a professional ad for you.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-5 text-xl md:text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 font-headline">Go Live</h3>
              <p className="text-gray-400 text-sm md:text-base">
                Approve your ad and start reaching local customers immediately.
              </p>
            </div>
          </div>

          <div className="text-center mt-8 md:mt-12">
            <Button size="lg" asChild className="bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200 h-12 md:h-14 px-6 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation">
              <Link href="#get-started">
                Start Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-12 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-gray-900">
              Everything You Need to Succeed
            </h2>
            <p className="mt-3 md:mt-4 text-gray-600 text-base md:text-lg">
              No hidden fees. The price you see is the price you pay.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 max-w-5xl mx-auto">
            {[
              { icon: PenTool, title: "Free Ad Design", desc: "Professional banner created for you" },
              { icon: TrendingUp, title: "Clickable Ads", desc: "Drive traffic to your website or offer" },
              { icon: Zap, title: "Quick Updates", desc: "Change your ad anytime, for free" },
              { icon: Shield, title: "No Contracts", desc: "Month-to-month, cancel anytime" },
              { icon: Users, title: "Local Targeting", desc: "Reach Pasco County residents" },
              { icon: CheckCircle, title: "Rotating Display", desc: "Fair exposure across all pages" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 md:gap-4 p-4 md:p-5 bg-white rounded-xl shadow-sm">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base">{item.title}</h3>
                  <p className="text-gray-600 text-xs md:text-sm mt-0.5 md:mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form Section - Primary Conversion Point */}
      <section id="get-started" className="py-12 md:py-24 bg-gradient-to-br from-blue-600 to-blue-800 scroll-mt-14 md:scroll-mt-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-xl mx-auto">
            <Card className="bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
              <CardContent className="p-5 md:p-8 lg:p-10">
                <div className="text-center mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 font-headline">
                    Ready to Grow Your Business?
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm md:text-base">
                    Fill out the form below to see our current pricing and plans.
                  </p>
                </div>

                <GetStartedForm />

                <div className="mt-5 md:mt-6 pt-5 md:pt-6 border-t border-gray-100">
                  <p className="text-center text-gray-500 text-xs md:text-sm">
                    Questions? Call or text us anytime at{' '}
                    <a href="tel:813-544-8383" className="text-blue-600 font-medium hover:underline">
                      813-544-8383
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 md:gap-8 mt-6 md:mt-8 text-white/80 text-xs md:text-sm">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Shield className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Secure Form</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>No Spam</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Condensed */}
      <section className="py-12 md:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-gray-900">
              Common Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3 md:space-y-4">
            <AccordionItem value="item-1" className="bg-white rounded-xl px-4 md:px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4">What types of businesses do you work with?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base">
                We work with all local businesses in Pasco County—restaurants, real estate agents, contractors, medical offices, retailers, and more. If you serve the local community, we can help you reach more customers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white rounded-xl px-4 md:px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4">Do I need to provide my own ad design?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base">
                No! Our design team will create a professional, mobile-friendly banner for your business at no extra cost. Just provide your logo, website, and any messaging preferences.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white rounded-xl px-4 md:px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4">How quickly will my ad go live?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base">
                Most ads go live within 48 hours of approval. We'll send you a preview to approve before your ad starts running.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-white rounded-xl px-4 md:px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4">Can I cancel anytime?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base">
                Absolutely. There are no contracts or cancellation fees. You can cancel your subscription anytime through your customer portal.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-white rounded-xl px-4 md:px-6 shadow-sm border-0">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4">Can I update my ad later?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base">
                Yes! Just email us with your updates and we'll refresh your ad within 1-2 business days at no extra charge.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-8 md:mt-10">
            <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Still have questions?</p>
            <a
              href="tel:813-544-8383"
              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline text-base md:text-lg touch-manipulation"
            >
              <Phone className="h-5 w-5" />
              Call or text us: 813-544-8383
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline mb-3 md:mb-4">
            Ready to Reach More Local Customers?
          </h2>
          <p className="text-gray-400 text-base md:text-lg mb-6 md:mb-8 max-w-2xl mx-auto">
            Join local businesses already advertising on Pasco County's most visited community websites.
          </p>
          <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 h-12 md:h-14 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto touch-manipulation">
            <Link href="#get-started">
              Get Started Now <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Mobile-Friendly Footer */}
      <footer className="py-6 md:py-8 bg-gray-950 text-gray-400">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Image src="/logo.png" alt="Community-Websites.com" width={40} height={22} className="h-[22px] md:h-[28px] w-auto" />
              <span className="text-xs md:text-sm">© {new Date().getFullYear()} Community-Websites.com</span>
            </div>
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm">
              <a href="tel:813-544-8383" className="hover:text-white active:text-white transition-colors touch-manipulation py-1">813-544-8383</a>
              <Link href="/terms-of-service" className="hover:text-white active:text-white transition-colors touch-manipulation py-1">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-white active:text-white transition-colors touch-manipulation py-1">Privacy</Link>
              <Link href="/login" className="hover:text-white active:text-white transition-colors touch-manipulation py-1">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
