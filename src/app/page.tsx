
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Phone, Users, TrendingUp, Zap, PenTool, Shield, ChevronRight, Star, DollarSign, Target, BarChart3, Clock, Award, Building2, Utensils, Briefcase, Home, Heart, Car, Scissors, ShoppingBag, Stethoscope, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GetStartedForm } from '@/components/landing/get-started-form';
import { LiveStatsBar } from '@/components/landing/stats';

export default function LandingPage() {
  const [showMobileCta, setShowMobileCta] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show floating CTA after scrolling past hero section (roughly 100vh)
      const scrollThreshold = window.innerHeight * 0.8;
      setShowMobileCta(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile-First Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100/80 safe-area-inset shadow-sm">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 md:h-[72px] items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Community-Websites.com" width={48} height={27} className="h-[30px] md:h-[36px] w-auto" />
              <span className="font-headline font-bold text-brand-primary text-base tracking-tight">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {/* Phone - icon only on mobile, full number on larger screens */}
              <a
                href="tel:813-544-8383"
                className="flex items-center gap-1.5 text-brand-primary hover:text-brand-secondary transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden md:inline text-sm font-medium">813-544-8383</span>
              </a>
              {/* Login - icon only on mobile, with text on larger screens */}
              <Button variant="ghost" size="sm" asChild className="h-9 w-9 sm:w-auto sm:px-3">
                <Link href="/login">
                  <UserIcon className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
              {/* View Pricing - always visible */}
              <Button size="sm" asChild variant="success" className="h-11 md:h-10 px-5 sm:px-5 md:px-6 text-sm touch-manipulation">
                <Link href="#get-started">
                  View Pricing
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile-First with Background */}
      <section className="relative min-h-[100dvh] flex items-center pt-16 md:pt-[72px]">
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
          {/* Modern gradient overlay with brand colors */}
          <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-brand-dark/90 via-brand-primary/80 to-brand-primary/60 md:from-brand-dark/85 md:via-brand-primary/70 md:to-brand-primary/40" />
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-6 py-8 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Copy */}
            <div className="text-white space-y-5 md:space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm border border-white/20">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                </span>
                <span className="font-medium">Reaching 1,000+ local residents daily</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-headline leading-[1.1]">
                Get Your Business in Front of
                <span className="text-success"> Local Customers</span>
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Affordable advertising on Pasco County's most visited community websites. Plans from just <span className="font-bold text-success">$16/month</span>.
              </p>

              {/* Mobile: Single prominent CTA */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
                <Button size="lg" asChild variant="success" className="text-base md:text-lg h-14 md:h-14 px-7 md:px-8 w-full sm:w-auto touch-manipulation shadow-lg shadow-success/30">
                  <Link href="#get-started">
                    View Pricing <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <a
                  href="tel:813-544-8383"
                  className="flex items-center justify-center gap-2 h-14 md:h-14 px-6 md:px-7 rounded-xl border-2 border-white/50 text-white hover:bg-white/15 active:bg-white/25 transition-all duration-200 touch-manipulation backdrop-blur-sm font-semibold"
                >
                  <Phone className="h-5 w-5" />
                  <span>813-544-8383</span>
                </a>
              </div>

              {/* Quick Benefits - 2x2 grid, more compact on mobile */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:gap-4 pt-4 md:pt-6 max-w-md mx-auto lg:mx-0">
                <div className="flex items-center gap-2.5 text-white/95">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium">No contracts</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/95">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium">Free ad design</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/95">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium">Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/95">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium">Live in 48 hours</span>
                </div>
              </div>
            </div>

            {/* Right - Form Card */}
            <div className="lg:pl-8 mt-4 lg:mt-0">
              <Card className="bg-white backdrop-blur-md shadow-2xl border-0 rounded-2xl overflow-hidden ring-1 ring-white/20">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center mb-6 md:mb-7">
                    <h2 className="text-xl md:text-2xl font-bold text-brand-primary font-headline">See Our Pricing</h2>
                    <p className="text-gray-600 mt-1.5 text-sm md:text-base">Fill out the form to view current rates</p>
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

      {/* Business Types We Serve */}
      <section className="py-10 md:py-16 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-6 md:mb-10">
            <p className="text-gray-600 text-sm md:text-base font-medium">
              Trusted by Local Businesses Across Pasco County
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 lg:gap-12">
            {[
              { icon: Utensils, label: 'Restaurants' },
              { icon: Home, label: 'Real Estate' },
              { icon: Stethoscope, label: 'Medical' },
              { icon: Car, label: 'Auto Services' },
              { icon: Scissors, label: 'Salons & Spas' },
              { icon: Briefcase, label: 'Professional Services' },
              { icon: ShoppingBag, label: 'Retail' },
              { icon: Building2, label: 'Home Services' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                <item.icon className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-xs md:text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-14 md:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Why Local Businesses Choose Us
            </h2>
            <p className="mt-3 md:mt-4 text-gray-600 text-base md:text-lg">
              Simple, affordable, and effective local advertising
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-8">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-5 md:mb-6 group-hover:bg-brand-primary/15 transition-colors">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-brand-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-brand-primary mb-2 md:mb-3 font-headline">Hyper-Local Reach</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                Your ad appears on the websites Pasco County residents visit for local news, events, and community updates.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-success-light rounded-xl flex items-center justify-center mb-5 md:mb-6 group-hover:bg-success/20 transition-colors">
                <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-success-dark" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-brand-primary mb-2 md:mb-3 font-headline">Drive Real Traffic</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                Every ad is clickable and links directly to your website, booking page, or special offer.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-secondary/10 rounded-xl flex items-center justify-center mb-5 md:mb-6 group-hover:bg-brand-secondary/15 transition-colors">
                <Zap className="h-6 w-6 md:h-7 md:w-7 text-brand-secondary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-brand-primary mb-2 md:mb-3 font-headline">Quick & Easy</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                No design skills needed. We'll create a professional ad for you and have it live within 48 hours.
              </p>
            </div>
          </div>

          <div className="text-center mt-10 md:mt-14">
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
              <Link href="#get-started">
                Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Where Ads Appear */}
      <section className="py-14 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <span className="text-brand-secondary font-semibold text-xs md:text-sm uppercase tracking-wider">Premium Placement</span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary mt-3 md:mt-4 mb-5 md:mb-6">
                Your Ad on Pasco County's Top Community Sites
              </h2>
              <p className="text-gray-600 text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
                Reach engaged local residents on the websites they trust for community news and information.
              </p>

              <div className="space-y-4 md:space-y-5">
                <div className="flex items-center gap-4 md:gap-5 p-4 md:p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <CheckCircle className="h-6 w-6 md:h-7 md:w-7 text-success flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-brand-primary text-sm md:text-base">WesleyChapelCommunity.com</div>
                    <div className="text-xs md:text-sm text-gray-600">Wesley Chapel's #1 local news source</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:gap-5 p-4 md:p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <CheckCircle className="h-6 w-6 md:h-7 md:w-7 text-success flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-brand-primary text-sm md:text-base">PascoCommunity.com</div>
                    <div className="text-xs md:text-sm text-gray-600">Covering all of Pasco County</div>
                  </div>
                </div>
              </div>

              <Button size="lg" asChild variant="success" className="mt-7 md:mt-8 h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
                <Link href="#get-started">
                  Advertise on Both Sites <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="relative order-1 lg:order-2">
              <div className="absolute -inset-3 md:-inset-5 bg-gradient-to-br from-brand-primary/10 via-brand-secondary/10 to-success/10 rounded-2xl md:rounded-3xl -z-10" />
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gray-200">
                <Image
                  src="/adhere.png"
                  alt="Example of ad placement on community website"
                  width={600}
                  height={500}
                  className="w-full h-auto"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition - Why Community Websites */}
      <section className="py-14 md:py-24 bg-gradient-to-br from-gray-50 via-white to-brand-primary/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Main Value Card */}
            <div className="relative bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 text-center">
              <span className="inline-flex items-center gap-2 text-success-dark font-semibold text-xs md:text-sm uppercase tracking-wider mb-4">
                <DollarSign className="h-4 w-4" />
                Smart Investment
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary mb-4">
                Get More Reach for Your Dollar
              </h2>
              <p className="text-gray-600 text-base md:text-lg mb-8 max-w-2xl mx-auto">
                Reach thousands of local customers every month without breaking the bank
              </p>

              {/* Price Highlight */}
              <div className="inline-flex items-center gap-3 bg-success-light/50 rounded-2xl px-6 py-4 md:px-8 md:py-5 mb-8">
                <div className="text-left">
                  <p className="text-sm text-gray-600 font-medium">Advertise for as little as</p>
                  <p className="text-3xl md:text-4xl font-bold text-success-dark">$16<span className="text-lg md:text-xl font-semibold text-gray-500"> p/m</span></p>
                </div>
              </div>

              {/* Benefits Grid */}
              <div className="grid sm:grid-cols-2 gap-4 md:gap-5 max-w-xl mx-auto mb-8">
                <div className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">20,000+ monthly impressions</span>
                </div>
                <div className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Hyper-local targeting</span>
                </div>
                <div className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Clickable to your website</span>
                </div>
                <div className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm md:text-base text-gray-700">Free ad design included</span>
                </div>
              </div>

              <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
                <Link href="#get-started">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section className="py-14 md:py-24 bg-brand-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline">
              Get Started in 3 Simple Steps
            </h2>
            <p className="mt-3 md:mt-4 text-white/70 text-base md:text-lg">
              From signup to live ad in as little as 48 hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 md:w-18 md:h-18 bg-success rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 text-xl md:text-2xl font-bold shadow-lg shadow-success/30">
                1
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 font-headline">Choose Your Plan</h3>
              <p className="text-white/70 text-sm md:text-base leading-relaxed">
                Pick a plan that fits your budget. No contracts, cancel anytime.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 md:w-18 md:h-18 bg-success rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 text-xl md:text-2xl font-bold shadow-lg shadow-success/30">
                2
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 font-headline">We Design Your Ad</h3>
              <p className="text-white/70 text-sm md:text-base leading-relaxed">
                Upload your own or let our team create a professional ad for you.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 md:w-18 md:h-18 bg-success rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 text-xl md:text-2xl font-bold shadow-lg shadow-success/30">
                3
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 font-headline">Go Live</h3>
              <p className="text-white/70 text-sm md:text-base leading-relaxed">
                Approve your ad and start reaching local customers immediately.
              </p>
            </div>
          </div>

          <div className="text-center mt-10 md:mt-14">
            <Button size="lg" asChild className="bg-white text-brand-primary hover:bg-gray-100 active:bg-gray-200 h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation font-bold shadow-lg">
              <Link href="#get-started">
                Start Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <span className="inline-flex items-center gap-2 text-brand-secondary font-semibold text-xs md:text-sm uppercase tracking-wider mb-3">
              <Star className="h-4 w-4 fill-current" />
              Success Stories
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Hear From Local Business Owners
            </h2>
            <p className="mt-3 md:mt-4 text-gray-600 text-base md:text-lg">
              Join businesses already growing with community advertising
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-8 max-w-6xl mx-auto">
            {[
              {
                quote: "We saw an increase in new customers within the first week. The local targeting is exactly what our restaurant needed.",
                name: "Maria S.",
                business: "Family Restaurant",
                type: "Wesley Chapel",
                icon: Utensils,
              },
              {
                quote: "At $16 a month, this is the most cost-effective advertising we've found. Our phone started ringing from day one.",
                name: "James T.",
                business: "HVAC Services",
                type: "Pasco County",
                icon: Building2,
              },
              {
                quote: "The team designed a beautiful ad for us and it was live in 2 days. We've already renewed for a second year!",
                name: "Dr. Sarah K.",
                business: "Family Dentistry",
                type: "Wesley Chapel",
                icon: Stethoscope,
              },
            ].map((testimonial, i) => (
              <Card key={i} className="bg-gray-50 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                <CardContent className="p-6 md:p-7">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm md:text-base mb-5 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <div className="w-11 h-11 bg-brand-primary/10 rounded-full flex items-center justify-center">
                      <testimonial.icon className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-brand-primary text-sm">{testimonial.name}</div>
                      <div className="text-xs text-gray-500">{testimonial.business} • {testimonial.type}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Local Advertising Works - Statistics */}
      <section className="py-14 md:py-24 bg-gradient-to-br from-brand-secondary to-brand-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline">
              Why Local Advertising Works
            </h2>
            <p className="mt-3 md:mt-4 text-white/75 text-base md:text-lg">
              The numbers don't lie—local consumers prefer local businesses
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8 max-w-5xl mx-auto">
            {[
              { stat: "82%", label: "of consumers use search engines to find local businesses", icon: Target },
              { stat: "72%", label: "of local searches result in a visit within 5 miles", icon: BarChart3 },
              { stat: "88%", label: "of consumers trust online reviews as much as personal recommendations", icon: Star },
              { stat: "46%", label: "of all Google searches are looking for local information", icon: Users },
            ].map((item, i) => (
              <div key={i} className="text-center p-5 md:p-6 bg-white/5 rounded-2xl backdrop-blur-sm">
                <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 text-success">{item.stat}</div>
                <p className="text-white/75 text-xs md:text-sm leading-snug">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 md:mt-16">
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/30">
              <Link href="#get-started">
                Get Found by Local Customers <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-14 md:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Everything You Need to Succeed
            </h2>
            <p className="mt-3 md:mt-4 text-gray-600 text-base md:text-lg">
              No hidden fees. The price you see is the price you pay.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {[
              { icon: PenTool, title: "Free Ad Design", desc: "Professional banner created for you" },
              { icon: TrendingUp, title: "Clickable Ads", desc: "Drive traffic to your website or offer" },
              { icon: Zap, title: "Quick Updates", desc: "Change your ad anytime, for free" },
              { icon: Shield, title: "No Contracts", desc: "Month-to-month, cancel anytime" },
              { icon: Users, title: "Local Targeting", desc: "Reach Pasco County residents" },
              { icon: CheckCircle, title: "Rotating Display", desc: "Fair exposure across all pages" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 md:gap-5 p-5 md:p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 md:w-12 md:h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 md:h-6 md:w-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-primary text-sm md:text-base">{item.title}</h3>
                  <p className="text-gray-600 text-xs md:text-sm mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form Section - Primary Conversion Point */}
      <section id="get-started" className="py-14 md:py-24 bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-primary scroll-mt-16 md:scroll-mt-[72px]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-xl mx-auto">
            <Card className="bg-white shadow-2xl border-0 rounded-2xl overflow-hidden ring-1 ring-white/20">
              <CardContent className="p-6 md:p-8 lg:p-10">
                <div className="text-center mb-7 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-brand-primary font-headline">
                    Ready to Grow Your Business?
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm md:text-base">
                    Fill out the form below to see our current pricing and plans.
                  </p>
                </div>

                <GetStartedForm />

                <div className="mt-6 md:mt-7 pt-6 md:pt-7 border-t border-gray-100">
                  <p className="text-center text-gray-500 text-xs md:text-sm">
                    Questions? Call or text us anytime at{' '}
                    <a href="tel:813-544-8383" className="text-brand-secondary font-semibold hover:underline">
                      813-544-8383
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 md:gap-8 mt-7 md:mt-8 text-white/85 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Secure Form</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">No Spam</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-success-light via-success-light/50 to-white rounded-2xl md:rounded-3xl p-7 md:p-10 border border-success/20 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-7 md:gap-10">
                <div className="flex-shrink-0">
                  <div className="w-22 h-22 md:w-28 md:h-28 bg-success/15 rounded-2xl flex items-center justify-center">
                    <Award className="h-11 w-11 md:h-14 md:w-14 text-success-dark" />
                  </div>
                </div>
                <div className="text-center md:text-left flex-grow">
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-brand-primary font-headline mb-3 md:mb-4">
                    Our Satisfaction Promise
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base lg:text-lg mb-5 md:mb-6 leading-relaxed">
                    We're confident you'll love advertising with us. If you're not completely satisfied with your ad within the first 30 days, we'll work with you to make it right—no questions asked. Your success is our success.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-5 md:gap-6">
                    <div className="flex items-center gap-2.5 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm md:text-base font-medium">30-Day Guarantee</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm md:text-base font-medium">No Lock-In Contracts</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm md:text-base font-medium">Cancel Anytime</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Trust Badges */}
            <div className="mt-10 md:mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                <Clock className="h-7 w-7 text-brand-primary mx-auto mb-3" />
                <div className="font-semibold text-brand-primary text-sm">48-Hour Launch</div>
                <div className="text-xs text-gray-500 mt-0.5">Go live in 2 days</div>
              </div>
              <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                <Users className="h-7 w-7 text-brand-primary mx-auto mb-3" />
                <div className="font-semibold text-brand-primary text-sm">Local Support</div>
                <div className="text-xs text-gray-500 mt-0.5">Real people, real help</div>
              </div>
              <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                <Shield className="h-7 w-7 text-brand-primary mx-auto mb-3" />
                <div className="font-semibold text-brand-primary text-sm">Secure Payments</div>
                <div className="text-xs text-gray-500 mt-0.5">SSL encrypted</div>
              </div>
              <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                <Star className="h-7 w-7 text-brand-primary mx-auto mb-3" />
                <div className="font-semibold text-brand-primary text-sm">5-Star Rated</div>
                <div className="text-xs text-gray-500 mt-0.5">By local businesses</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Condensed */}
      <section className="py-14 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Common Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3 md:space-y-4">
            <AccordionItem value="item-1" className="bg-white rounded-xl px-5 md:px-6 shadow-sm border border-gray-100">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4 text-brand-primary">What types of businesses do you work with?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base leading-relaxed">
                We work with all local businesses in Pasco County—restaurants, real estate agents, contractors, medical offices, retailers, and more. If you serve the local community, we can help you reach more customers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white rounded-xl px-5 md:px-6 shadow-sm border border-gray-100">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4 text-brand-primary">How many times will my ad be shown?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base leading-relaxed">
                In most cases, your ad will be shown over 20,000 times per month, if not more. This provides significant exposure to a targeted local audience.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white rounded-xl px-5 md:px-6 shadow-sm border border-gray-100">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4 text-brand-primary">How quickly will my ad go live?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base leading-relaxed">
                Most ads go live within 48 hours of approval. We'll send you a preview to approve before your ad starts running.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-white rounded-xl px-5 md:px-6 shadow-sm border border-gray-100">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4 text-brand-primary">Can I cancel anytime?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base leading-relaxed">
                Absolutely. There are no contracts or cancellation fees. You can cancel your subscription anytime through your customer portal.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-white rounded-xl px-5 md:px-6 shadow-sm border border-gray-100">
              <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                <span className="text-left font-semibold text-sm md:text-base pr-4 text-brand-primary">Can I update my ad later?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base leading-relaxed">
                Yes! Just email us with your updates and we'll refresh your ad within 1-2 business days at no extra charge.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-10 md:mt-12">
            <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Still have questions?</p>
            <a
              href="tel:813-544-8383"
              className="inline-flex items-center gap-2 text-brand-secondary font-semibold hover:text-brand-primary hover:underline text-base md:text-lg touch-manipulation transition-colors"
            >
              <Phone className="h-5 w-5" />
              Call or text us: 813-544-8383
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 md:py-18 bg-brand-dark text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline mb-4 md:mb-5">
            Ready to Reach More Local Customers?
          </h2>
          <p className="text-white/70 text-base md:text-lg mb-7 md:mb-8 max-w-2xl mx-auto">
            Join local businesses already advertising on Pasco County's most visited community websites.
          </p>
          <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/30">
            <Link href="#get-started">
              Get Started Now <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="py-10 md:py-12 bg-brand-primary text-white/80 pb-24 sm:pb-10 md:pb-12">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-3 gap-10">
                {/* Branding */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <Image src="/logo.png" alt="Community-Websites.com Logo" width={44} height={24} className="h-[26px] w-auto" loading="lazy" />
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
                            <li><Link href="#get-started" className="hover:text-white transition-colors">Pricing</Link></li>
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

      {/* Floating Mobile CTA - Only visible on small screens when scrolled */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden transition-all duration-300 safe-area-inset-bottom ${
          showMobileCta
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3">
          <div className="flex items-center gap-3">
            <a
              href="tel:813-544-8383"
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary active:bg-brand-primary/20 transition-colors touch-manipulation"
              aria-label="Call us"
            >
              <Phone className="h-5 w-5" />
            </a>
            <Button asChild variant="success" className="flex-1 h-12 text-base font-semibold touch-manipulation shadow-lg shadow-success/25">
              <Link href="#get-started">
                View Pricing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
