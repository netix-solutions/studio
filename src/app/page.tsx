
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Phone, Users, TrendingUp, Zap, PenTool, Shield, ChevronRight, Star, Clock, Award, Building2, Utensils, Briefcase, Home, Car, Scissors, ShoppingBag, Stethoscope, User as UserIcon, Palette, Sparkles, MousePointerClick, Monitor, BookOpen, Globe, Search, MapPin, Dumbbell, CreditCard, X, Check, Gift, Newspaper } from 'lucide-react';
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
              {/* Phone - hidden on mobile, visible with number on larger screens */}
              <a
                href="tel:813-544-8383"
                className="hidden md:flex items-center gap-1.5 text-brand-primary hover:text-brand-secondary transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">813-544-8383</span>
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
              <div className="flex justify-center lg:justify-start">
                <Image
                  src="/logo.png"
                  alt="Community Website Logo"
                  width={110}
                  height={110}
                  className="drop-shadow-lg"
                />
              </div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm border border-white/20">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                </span>
                <span className="font-medium">1,000+ local customers reached daily</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-headline leading-[1.1]">
                Your Neighbors Are Looking for a
                <span className="text-success"> Business Like Yours</span>
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Every day, thousands of Pasco County residents visit our community websites looking for local services. Put your business in front of them for less than <span className="font-bold text-success">$1 a day</span>.
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
                    <h2 className="text-xl md:text-2xl font-bold text-brand-primary font-headline">Get Your Free Quote</h2>
                    <p className="text-gray-600 mt-1.5 text-sm md:text-base">See how affordable it is to reach your neighbors</p>
                  </div>
                  <GetStartedForm />
                </CardContent>
              </Card>
              {/* Trust Signals Below Form */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-white/90 text-xs md:text-sm">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-success" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Gift className="h-4 w-4 text-success" />
                  <span>Free spotlight article with yearly plans</span>
                </div>
              </div>
              <p className="mt-3 text-center text-white/70 text-xs italic">
                "We got 23 new customers in our first month alone." — Maria S., Local Restaurant Owner
              </p>
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

      {/* Perfect for Local Businesses Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Built for Every Kind of Local Business
            </h2>
            <p className="text-gray-600 mt-3 text-base md:text-lg max-w-2xl mx-auto">
              Whether you run a restaurant, a dental practice, or a home repair company—if your customers live nearby, we'll help them find you.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 max-w-5xl mx-auto">
            {[
              { icon: Utensils, label: 'Restaurants & Cafes' },
              { icon: Home, label: 'Home Services' },
              { icon: Stethoscope, label: 'Healthcare & Dental' },
              { icon: Car, label: 'Auto Services' },
              { icon: ShoppingBag, label: 'Retail & Shopping' },
              { icon: Briefcase, label: 'Professional Services' },
              { icon: Scissors, label: 'Salons & Beauty' },
              { icon: Dumbbell, label: 'Fitness & Wellness' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center p-4 md:p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-primary/20 transition-all duration-200"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <item.icon className="h-6 w-6 md:h-7 md:w-7 text-brand-primary" />
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 md:mt-10">
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
              <Link href="#get-started">
                See Pricing for Your Business <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Where Ads Appear - Premium Placement */}
      <section className="py-14 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <span className="text-brand-secondary font-semibold text-xs md:text-sm uppercase tracking-wider">Premium Placement</span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary mt-3 md:mt-4 mb-5 md:mb-6">
                Your Ad on Pasco County's Top Community Sites
              </h2>
              <p className="text-gray-600 text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
                Your ad runs on the same pages residents visit daily for local news, events, and school updates. They already trust these sites—and they'll trust your business too.
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

      {/* Two Ways to Get Your Ad - Design Options */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white via-gray-50/50 to-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <span className="inline-flex items-center gap-2 text-brand-secondary font-semibold text-xs md:text-sm uppercase tracking-wider mb-4">
              <Sparkles className="h-4 w-4" />
              You Choose How
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary mb-4">
              Two Ways to Create Your Ad
            </h2>
            <p className="text-gray-600 text-base md:text-lg">
              Whether you want our experts to handle everything or prefer to design it yourself, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Option 1: Professional Design */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative h-full bg-white border-2 border-brand-primary/20 hover:border-brand-primary/40 transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/25">
                      <PenTool className="h-7 w-7 md:h-8 md:w-8 text-white" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 bg-success-light text-success-dark text-xs md:text-sm font-bold px-3 py-1.5 rounded-full">
                      <Sparkles className="h-3.5 w-3.5" />
                      FREE
                    </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold text-brand-primary mb-3 font-headline">
                    Let Our Team Design It
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base mb-6 leading-relaxed">
                    Sit back and relax while our professional design team creates a stunning, eye-catching ad for your business at no extra cost.
                  </p>

                  <ul className="space-y-3 mb-6">
                    {[
                      'Professional graphic designers',
                      'Unlimited revisions until you\'re happy',
                      'Ready within 48 hours',
                      'Optimized for clicks & engagement',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm md:text-base text-gray-700">
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2">
                      <Award className="h-4 w-4 text-brand-secondary" />
                      Most popular choice for busy business owners
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Option 2: DIY Design */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-success to-brand-secondary rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative h-full bg-white border-2 border-success/20 hover:border-success/40 transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-success to-success-dark rounded-2xl flex items-center justify-center shadow-lg shadow-success/25">
                      <Palette className="h-7 w-7 md:h-8 md:w-8 text-white" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary text-xs md:text-sm font-bold px-3 py-1.5 rounded-full">
                      <Monitor className="h-3.5 w-3.5" />
                      INSTANT
                    </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold text-brand-primary mb-3 font-headline">
                    Design Your Own Instantly
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base mb-6 leading-relaxed">
                    Use our easy online ad designer right from your computer. No design experience needed—create your perfect ad in minutes.
                  </p>

                  <ul className="space-y-3 mb-6">
                    {[
                      'Easy drag-and-drop editor',
                      'Add your logo, photos & text',
                      'Preview in real-time',
                      'Make changes anytime you want',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm md:text-base text-gray-700">
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2">
                      <MousePointerClick className="h-4 w-4 text-success" />
                      Perfect for hands-on business owners
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="text-center mt-10 md:mt-12">
            <p className="text-gray-600 text-sm md:text-base mb-5">
              Both options included with every plan—choose what works best for you!
            </p>
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
              <Link href="#get-started">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Directory Listing Feature - Bonus Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-primary overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm border border-white/20 mb-6">
                <span className="font-bold text-success">BONUS</span>
                <span className="text-white/80">Included with Every Ad</span>
              </div>

              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline mb-5 md:mb-6">
                Free Business Directory Listing
              </h2>

              <p className="text-base md:text-lg text-white/85 mb-6 md:mb-8 leading-relaxed">
                While your ad is live, your business is automatically featured in our community sponsor directory. Get discovered by local residents searching for businesses like yours.
              </p>

              <div className="space-y-4 md:space-y-5">
                <div className="flex items-start gap-4 md:gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm md:text-base">Your Own Business Profile</div>
                    <div className="text-xs md:text-sm text-white/70">Showcase your business with logo, description, contact info, and social links</div>
                  </div>
                </div>

                <div className="flex items-start gap-4 md:gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Search className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm md:text-base">Get Found by Local Customers</div>
                    <div className="text-xs md:text-sm text-white/70">Appear when residents browse our sponsor directory for local services</div>
                  </div>
                </div>

                <div className="flex items-start gap-4 md:gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm md:text-base">Multiple Touchpoints</div>
                    <div className="text-xs md:text-sm text-white/70">Your ad AND directory listing work together to maximize visibility</div>
                  </div>
                </div>
              </div>

              <Button size="lg" asChild className="mt-8 md:mt-10 h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg bg-white text-brand-primary hover:bg-white/90">
                <Link href="#get-started">
                  Get Your Listing <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 md:-inset-6 bg-white/10 rounded-3xl -z-10" />
              <Card className="bg-white rounded-2xl shadow-2xl overflow-hidden border-0">
                <CardContent className="p-0">
                  {/* Mock Directory Card Preview */}
                  <div className="p-5 md:p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-brand-secondary text-xs md:text-sm font-semibold mb-4">
                      <MapPin className="h-4 w-4" />
                      Community Sponsor Directory
                    </div>
                    <div className="text-center text-gray-400 text-xs uppercase tracking-wider mb-3">Example Listing</div>
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-8 w-8 md:h-10 md:w-10 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-brand-primary text-base md:text-lg mb-1">Your Business Name</div>
                        <div className="text-gray-600 text-xs md:text-sm mb-2">Your tagline or specialty goes here</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary text-xs px-2 py-1 rounded-full">
                            <Phone className="h-3 w-3" />
                            Phone
                          </span>
                          <span className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary text-xs px-2 py-1 rounded-full">
                            <Globe className="h-3 w-3" />
                            Website
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-gray-600 text-sm leading-relaxed line-clamp-3">
                      A brief description of your business, services, and what makes you stand out in the local community. Residents can learn about you at a glance.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 bg-success text-white px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-lg">
                FREE with your ad!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Compact */}
      <section className="py-14 md:py-20 bg-brand-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline">
              Live in 3 Easy Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Choose Your Plan', desc: 'Pick a budget that works for you. No contracts required.' },
              { step: '2', title: 'Create Your Ad', desc: 'Let us design it free, or use our online ad designer yourself.' },
              { step: '3', title: 'Go Live', desc: 'Approve your ad and start reaching customers in 48 hours.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-success rounded-xl flex items-center justify-center mx-auto mb-4 text-lg md:text-xl font-bold shadow-lg shadow-success/30">
                  {item.step}
                </div>
                <h3 className="text-base md:text-lg font-bold mb-2 font-headline">{item.title}</h3>
                <p className="text-white/70 text-sm md:text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Yearly Plan Bonus - Free Spotlight Article */}
      <section className="py-14 md:py-20 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-y border-amber-200/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 rounded-full px-5 py-2 text-xs md:text-sm font-bold mb-6 border border-amber-200">
              <Gift className="h-4 w-4" />
              YEARLY PLAN EXCLUSIVE BONUS
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary mb-4">
              Get a Free Spotlight Article About Your Business
            </h2>
            <p className="text-gray-700 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Sign up for any yearly plan and we'll write and publish a dedicated feature article about your business on our community websites—a <span className="font-bold text-amber-700">$250+ value</span>, yours free.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto mb-8">
              <div className="flex flex-col items-center p-5 bg-white rounded-xl shadow-sm border border-amber-100">
                <Newspaper className="h-7 w-7 text-amber-600 mb-3" />
                <span className="text-sm font-semibold text-gray-800">Professionally Written</span>
                <span className="text-xs text-gray-500 mt-1">Our writers craft your story</span>
              </div>
              <div className="flex flex-col items-center p-5 bg-white rounded-xl shadow-sm border border-amber-100">
                <Users className="h-7 w-7 text-amber-600 mb-3" />
                <span className="text-sm font-semibold text-gray-800">Seen by Thousands</span>
                <span className="text-xs text-gray-500 mt-1">Published across our community sites</span>
              </div>
              <div className="flex flex-col items-center p-5 bg-white rounded-xl shadow-sm border border-amber-100">
                <TrendingUp className="h-7 w-7 text-amber-600 mb-3" />
                <span className="text-sm font-semibold text-gray-800">Builds Trust & SEO</span>
                <span className="text-xs text-gray-500 mt-1">Boosts your online credibility</span>
              </div>
            </div>
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
              <Link href="#get-started">
                Claim Your Free Article <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-xs text-gray-500 mt-3">Choose yearly billing at checkout to receive your free spotlight article</p>
          </div>
        </div>
      </section>

      {/* What's Included - Compact Grid */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Everything You Get—No Surprises
            </h2>
            <p className="mt-3 text-gray-600 text-base md:text-lg">
              No hidden fees, no upsells. Every feature is included from day one.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto">
            {[
              { icon: PenTool, label: 'Free Ad Design' },
              { icon: TrendingUp, label: 'Clickable Ads' },
              { icon: Zap, label: 'Unlimited Updates' },
              { icon: Shield, label: 'No Contracts' },
              { icon: Users, label: '100% Local Reach' },
              { icon: Clock, label: '48hr Launch' },
              { icon: BookOpen, label: 'Directory Listing' },
              { icon: Newspaper, label: 'Spotlight Article*' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 md:p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md hover:border-brand-primary/20 transition-all duration-200">
                <item.icon className="h-6 w-6 md:h-7 md:w-7 text-brand-primary mx-auto mb-2.5" />
                <span className="text-xs md:text-sm font-semibold text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-3 max-w-5xl mx-auto">*Spotlight article included free with yearly plans (a $250+ value)</p>
        </div>
      </section>

      {/* Why Local Advertising Works - Comparison Section */}
      <section className="py-14 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Why Smart Business Owners Choose Us
            </h2>
            <p className="mt-3 text-gray-600 text-base md:text-lg">
              See how community website advertising stacks up against the alternatives.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
            {/* Facebook/Instagram */}
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-100 p-4 md:p-5 border-b border-gray-200">
                <h3 className="font-bold text-brand-primary text-base md:text-lg text-center">Facebook / Instagram</h3>
              </div>
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Reaches strangers states away</span>
                </div>
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Algorithm changes constantly</span>
                </div>
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">$500+/month typical spend</span>
                </div>
              </CardContent>
            </Card>

            {/* Google Ads */}
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-100 p-4 md:p-5 border-b border-gray-200">
                <h3 className="font-bold text-brand-primary text-base md:text-lg text-center">Google Ads</h3>
              </div>
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Complex, expensive per click</span>
                </div>
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Requires ongoing management</span>
                </div>
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">$300+/month typical spend</span>
                </div>
              </CardContent>
            </Card>

            {/* Community Websites - Highlighted */}
            <Card className="bg-white border-2 border-success rounded-xl overflow-hidden shadow-lg shadow-success/10 relative">
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2">
                <span className="bg-success text-white text-xs font-bold px-3 py-1 rounded-b-lg">BEST VALUE</span>
              </div>
              <div className="bg-success/10 p-4 md:p-5 border-b border-success/20">
                <h3 className="font-bold text-success-dark text-base md:text-lg text-center">Community Websites</h3>
              </div>
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium">100% Pasco County residents</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium">Set it and forget it—we handle everything</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium">From just $16/month + free spotlight article</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8 md:mt-10">
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
              <Link href="#get-started">
                Get Started for $16/month <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Community Connection Section with Background */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/overhead1.jpg"
            alt="Pasco County Community"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-primary/90 to-brand-primary/80" />
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto md:mx-0">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-headline text-white mb-6">
              Your Customers Are Already Here
            </h2>
            <p className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed">
              These aren't random internet users—they're your neighbors. People who drive past your business every day, who are actively looking for local services, and who prefer to spend their money close to home.
            </p>
            <div className="flex flex-wrap gap-8 md:gap-12">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-1">50K+</div>
                <div className="text-sm text-white/60">Monthly Visitors</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-white/60">Local Audience</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-1">$16</div>
                <div className="text-sm text-white/60">Starting Price</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Compact Testimonials */}
      <section className="py-14 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-12">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 md:h-6 md:w-6 text-amber-400 fill-current" />
              ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-brand-primary">
              Real Results from Real Local Businesses
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
            {[
              { quote: "We got 23 new dine-in customers in our first month. The local targeting is exactly what our restaurant needed—people who can actually drive here!", name: "Maria S.", business: "Family Restaurant", icon: Utensils },
              { quote: "Best ROI we've seen. 3 service calls just from the first week, and at $16/month it paid for itself before the month was over.", name: "James T.", business: "HVAC Services", icon: Building2 },
              { quote: "12 new patient appointments within 6 weeks. We tried Facebook ads before but kept getting leads from Tampa. This actually reaches our neighbors.", name: "Dr. Sarah K.", business: "Family Dentistry", icon: Stethoscope },
            ].map((item, i) => (
              <Card key={i} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-xl">
                <CardContent className="p-5 md:p-6">
                  <p className="text-gray-700 text-sm md:text-base mb-4 leading-relaxed">"{item.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-brand-primary text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.business}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form Section */}
      <section id="get-started" className="py-14 md:py-24 bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-primary scroll-mt-16 md:scroll-mt-[72px]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-xl mx-auto">
            <Card className="bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
              <CardContent className="p-6 md:p-8 lg:p-10">
                <div className="text-center mb-7 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-brand-primary font-headline">
                    Start Reaching Local Customers Today
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm md:text-base">
                    Plans built for small business budgets—see pricing instantly.
                  </p>
                </div>

                <GetStartedForm />

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-center text-gray-500 text-xs md:text-sm">
                    Questions? Call or text{' '}
                    <a href="tel:813-544-8383" className="text-brand-secondary font-semibold hover:underline">
                      813-544-8383
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-6 md:gap-8 mt-6 text-white/85 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">No Spam</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span className="font-medium">30-Day Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Minimal */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-brand-primary">
              Common Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {[
              { q: 'Do I need to design my own ad?', a: 'No! You can let our professional team design it for you at no extra cost, or use our easy online designer to create it yourself—whichever you prefer.' },
              { q: 'How quickly will my ad go live?', a: 'Most ads go live within 48 hours of approval. We\'ll send you a preview to approve first.' },
              { q: 'Can I update my ad later?', a: 'Yes! Update your ad anytime at no extra charge. Design it yourself using our online tool, or just email us your changes.' },
              { q: 'What is the directory listing?', a: 'While your ad is live, you get a free business profile in our community sponsor directory. Add your logo, description, contact info, and social links so local residents can find and learn about your business.' },
              { q: 'What do I get with a yearly plan?', a: 'Yearly plan subscribers save up to 20% on monthly pricing AND receive a free professionally written spotlight article about their business, published on our community websites. That\'s a $250+ value—included at no extra cost. It\'s our way of rewarding businesses that commit to growing locally.' },
              { q: 'Can I cancel anytime?', a: 'Absolutely. No contracts, no cancellation fees. Cancel anytime through your portal.' },
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-gray-50 rounded-xl px-5 md:px-6 border border-gray-100">
                <AccordionTrigger className="hover:no-underline py-4 md:py-5">
                  <span className="text-left font-semibold text-sm md:text-base pr-4 text-brand-primary">{item.q}</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4 md:pb-5 text-sm md:text-base leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="text-center mt-10">
            <a
              href="tel:813-544-8383"
              className="inline-flex items-center gap-2 text-brand-secondary font-semibold hover:text-brand-primary text-base touch-manipulation transition-colors"
            >
              <Phone className="h-5 w-5" />
              More questions? Call 813-544-8383
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-16 bg-brand-dark text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline mb-4 md:mb-5">
            Don't Let Your Competition Get There First
          </h2>
          <p className="text-white/70 text-base md:text-lg mb-7 md:mb-8 max-w-2xl mx-auto">
            Ad space is limited. Secure your spot on Pasco County's most visited community websites before another business in your industry does.
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
                &copy; {new Date().getFullYear()} Community-Websites.com. All rights reserved.
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
