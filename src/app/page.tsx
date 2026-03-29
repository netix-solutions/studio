
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
                Every day, thousands of Pasco County residents visit our community websites looking for local services. Put your business in front of them starting at just <span className="font-bold text-success">$16/month</span>.
              </p>

              {/* Dual CTAs - View Pricing (primary) + Call */}
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

              {/* Quick Benefits - 2x2 grid */}
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

      {/* Social Proof - Testimonials (MOVED UP for early trust) */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-10">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 md:h-6 md:w-6 text-amber-400 fill-current" />
              ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-brand-primary">
              Real Results from Real Local Businesses
            </h2>
            <p className="text-gray-500 mt-2 text-sm md:text-base">Join businesses already growing with community advertising</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
            {[
              { quote: "We got 23 new dine-in customers in our first month. The local targeting is exactly what our restaurant needed—people who can actually drive here!", name: "Maria S.", business: "Family Restaurant", icon: Utensils, metric: "23 new customers" },
              { quote: "Best ROI we've seen. 3 service calls just from the first week, and at $16/month it paid for itself before the month was over.", name: "James T.", business: "HVAC Services", icon: Building2, metric: "Paid for itself week 1" },
              { quote: "12 new patient appointments within 6 weeks. We tried Facebook ads before but kept getting leads from Tampa. This actually reaches our neighbors.", name: "Dr. Sarah K.", business: "Family Dentistry", icon: Stethoscope, metric: "12 new patients" },
            ].map((item, i) => (
              <Card key={i} className="bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl group">
                <CardContent className="p-5 md:p-6">
                  {/* Result badge */}
                  <div className="inline-flex items-center gap-1.5 bg-success-light text-success-dark text-xs font-bold px-3 py-1.5 rounded-full mb-4">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {item.metric}
                  </div>
                  <p className="text-gray-700 text-sm md:text-base mb-5 leading-relaxed">"{item.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
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

      {/* Why Choose Us - Value Proposition (drives to form) */}
      <section className="py-14 md:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
            <span className="inline-flex items-center gap-2 text-brand-secondary font-semibold text-xs md:text-sm uppercase tracking-wider mb-4">
              <Sparkles className="h-4 w-4" />
              Affordable Local Advertising
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary mb-4">
              Plans That Fit Any Small Business Budget
            </h2>
            <p className="text-gray-600 text-base md:text-lg">
              For less than the cost of a daily coffee, put your business in front of thousands of local customers every month.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Single-Site Teaser */}
            <div className="relative rounded-2xl md:rounded-3xl border-2 border-gray-200 bg-white p-6 md:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg md:text-xl text-gray-900 font-headline">Single-Site</h3>
                  <p className="text-xs md:text-sm text-gray-500">Focused Reach</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm md:text-base mb-6 leading-relaxed">
                Perfect for businesses that want to target a specific community. Choose one site and start getting seen by your neighbors.
              </p>

              <div className="space-y-3 mb-6">
                {['Choose your community site', 'Rotating banner placement', 'Free professional ad design', 'Unlimited ad updates', 'Business directory listing'].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm md:text-base text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-success-light flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-success-dark" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button size="lg" asChild variant="outline" className="w-full h-12 md:h-14 text-base font-semibold touch-manipulation rounded-xl border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-colors">
                <Link href="#get-started">
                  See Pricing <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Multi-Site Teaser */}
            <div className="relative rounded-2xl md:rounded-3xl border-2 border-brand-primary/40 bg-white p-6 md:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              {/* Best Value Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-light text-white px-5 py-1.5 text-xs font-bold shadow-lg whitespace-nowrap rounded-full">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  MOST POPULAR
                </span>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg md:text-xl text-gray-900 font-headline">Multi-Site</h3>
                  <p className="text-xs md:text-sm text-gray-500">Maximum Reach</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm md:text-base mb-6 leading-relaxed">
                Get maximum exposure across all our community websites. Your ad reaches every corner of Pasco County.
              </p>

              <div className="space-y-3 mb-6">
                {['Display on ALL community sites', 'Priority rotating placement', 'Maximum local exposure', 'Free professional ad design', 'Unlimited ad updates'].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm md:text-base text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-success-light flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-success-dark" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button size="lg" asChild variant="success" className="w-full h-12 md:h-14 text-base font-semibold touch-manipulation rounded-xl shadow-lg shadow-success/25">
                <Link href="#get-started">
                  See Pricing <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Yearly upsell banner */}
          <div className="max-w-4xl mx-auto mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 text-sm md:text-base text-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <Gift className="h-5 w-5 text-amber-600" />
                <span>Save more with yearly billing</span>
              </div>
              <span className="text-amber-600">+</span>
              <span>Get a <strong>free spotlight article</strong> about your business (a $250+ value)</span>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 md:gap-x-8 gap-y-3 mt-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="font-medium">Secure Checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="font-medium">Live in 48 Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-purple-500" />
              <span className="font-medium">Free Ad Design</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Moved Up for clarity */}
      <section className="py-14 md:py-20 bg-brand-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline">
              Live in 3 Easy Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Choose Your Plan', desc: 'Pick a budget that works for you. No contracts required.', icon: CreditCard },
              { step: '2', title: 'Create Your Ad', desc: 'Let us design it free, or use our online ad designer yourself.', icon: PenTool },
              { step: '3', title: 'Go Live', desc: 'Approve your ad and start reaching customers in 48 hours.', icon: Zap },
            ].map((item, i) => (
              <div key={i} className="text-center relative">
                {/* Connector line - hidden on mobile */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-0.5 bg-white/20" />
                )}
                <div className="w-14 h-14 bg-success rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-bold shadow-lg shadow-success/30 relative z-10">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Step {item.step}</div>
                <h3 className="text-base md:text-lg font-bold mb-2 font-headline">{item.title}</h3>
                <p className="text-white/70 text-sm md:text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button size="lg" asChild className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg touch-manipulation bg-white text-brand-primary hover:bg-white/90 shadow-lg">
              <Link href="#get-started">
                Choose Your Plan <ArrowRight className="ml-2 h-5 w-5" />
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
        </div>
      </section>

      {/* Why Choose Us - Comparison Section (IMPROVED) */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Why Smart Business Owners Choose Us
            </h2>
            <p className="mt-3 text-gray-600 text-base md:text-lg">
              See how community website advertising stacks up against the alternatives.
            </p>
          </div>

          {/* Comparison Table - Desktop */}
          <div className="hidden md:block max-w-5xl mx-auto">
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-4 bg-gray-50">
                <div className="p-4 md:p-5 font-semibold text-sm text-gray-500 border-r border-gray-200"></div>
                <div className="p-4 md:p-5 text-center border-r border-gray-200">
                  <span className="font-bold text-gray-700 text-sm md:text-base">Facebook / Instagram</span>
                </div>
                <div className="p-4 md:p-5 text-center border-r border-gray-200">
                  <span className="font-bold text-gray-700 text-sm md:text-base">Google Ads</span>
                </div>
                <div className="p-4 md:p-5 text-center bg-success/5 relative">
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2">
                    <span className="bg-success text-white text-[10px] font-bold px-3 py-0.5 rounded-b-md uppercase tracking-wider">Best Value</span>
                  </div>
                  <span className="font-bold text-success-dark text-sm md:text-base">Community Websites</span>
                </div>
              </div>

              {/* Table Rows */}
              {[
                { label: 'Monthly Cost', fb: '$500+/mo', google: '$300+/mo', us: 'From $16/mo' },
                { label: 'Audience', fb: 'Strangers, often out of area', google: 'Mixed, keyword-based', us: '100% Pasco County residents' },
                { label: 'Setup & Management', fb: 'Ongoing management required', google: 'Complex, requires expertise', us: 'We handle everything' },
                { label: 'Ad Design', fb: 'You create it', google: 'You create it', us: 'Free professional design' },
                { label: 'Contracts', fb: 'Varies by campaign', google: 'No guarantee of results', us: 'No contracts, cancel anytime' },
                { label: 'Bonus Features', fb: 'None', google: 'None', us: 'Directory listing + spotlight article' },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-t border-gray-200`}>
                  <div className="p-4 md:p-5 font-medium text-sm text-gray-700 border-r border-gray-200 flex items-center">{row.label}</div>
                  <div className="p-4 md:p-5 text-center border-r border-gray-200 flex items-center justify-center gap-2">
                    <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">{row.fb}</span>
                  </div>
                  <div className="p-4 md:p-5 text-center border-r border-gray-200 flex items-center justify-center gap-2">
                    <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">{row.google}</span>
                  </div>
                  <div className="p-4 md:p-5 text-center bg-success/5 flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-sm text-gray-700 font-medium">{row.us}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison Cards - Mobile */}
          <div className="md:hidden space-y-4 max-w-sm mx-auto">
            {/* Community Websites - Highlighted first on mobile */}
            <Card className="border-2 border-success rounded-2xl shadow-lg shadow-success/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 bg-success text-white text-center text-xs font-bold py-1.5 uppercase tracking-wider">
                Best Value
              </div>
              <CardContent className="p-5 pt-10 space-y-3">
                <h3 className="font-bold text-success-dark text-lg text-center font-headline">Community Websites</h3>
                <div className="text-center text-2xl font-bold text-gray-900">From $16/mo</div>
                {['100% Pasco County residents', 'We handle everything', 'Free professional ad design', 'No contracts, cancel anytime', 'Directory listing + spotlight article'].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Facebook */}
            <Card className="border border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-gray-500 text-base text-center">Facebook / Instagram</h3>
                <div className="text-center text-lg font-bold text-gray-400">$500+/mo</div>
                {['Reaches strangers states away', 'Algorithm changes constantly', 'You manage campaigns'].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-500">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Google */}
            <Card className="border border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-gray-500 text-base text-center">Google Ads</h3>
                <div className="text-center text-lg font-bold text-gray-400">$300+/mo</div>
                {['Complex and expensive per click', 'Requires ongoing management', 'No guarantee of local results'].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-500">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8 md:mt-10">
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-7 md:px-8 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/25">
              <Link href="#get-started">
                See Plans & Pricing <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Everything You Get - Combined What's Included + Design Options */}
      <section className="py-14 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Everything You Get—No Surprises
            </h2>
            <p className="mt-3 text-gray-600 text-base md:text-lg">
              No hidden fees, no upsells. Every feature is included from day one.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto mb-12">
            {[
              { icon: PenTool, label: 'Free Ad Design', desc: 'We design it or DIY—your choice' },
              { icon: TrendingUp, label: 'Clickable Ads', desc: 'Drive traffic to your website' },
              { icon: Zap, label: 'Unlimited Updates', desc: 'Change your ad anytime, free' },
              { icon: Shield, label: 'No Contracts', desc: 'Cancel anytime, no fees' },
              { icon: Users, label: '100% Local Reach', desc: 'Only Pasco County residents' },
              { icon: Clock, label: '48hr Launch', desc: 'Your ad goes live fast' },
              { icon: BookOpen, label: 'Directory Listing', desc: 'Free business profile included' },
              { icon: Newspaper, label: 'Spotlight Article*', desc: 'Free with yearly plans' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 md:p-5 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-brand-primary/20 transition-all duration-200">
                <item.icon className="h-6 w-6 md:h-7 md:w-7 text-brand-primary mx-auto mb-2.5" />
                <span className="text-xs md:text-sm font-semibold text-gray-700 block">{item.label}</span>
                <span className="text-[10px] md:text-xs text-gray-400 block mt-1">{item.desc}</span>
              </div>
            ))}
          </div>

          {/* Two Ways to Create Your Ad - Compact */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 text-brand-secondary font-semibold text-xs md:text-sm uppercase tracking-wider mb-3">
                <Sparkles className="h-4 w-4" />
                You Choose How
              </span>
              <h3 className="text-xl md:text-2xl font-bold font-headline text-brand-primary">
                Two Ways to Create Your Ad
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              {/* Professional Design */}
              <div className="flex items-start gap-4 p-5 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                  <PenTool className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-bold text-brand-primary text-base font-headline">Let Our Team Design It</h4>
                    <span className="text-xs font-bold text-success bg-success-light px-2 py-0.5 rounded-full">FREE</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Professional designers create your ad. Unlimited revisions, ready in 48 hours.</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-brand-secondary" />
                    Most popular choice
                  </p>
                </div>
              </div>

              {/* DIY Design */}
              <div className="flex items-start gap-4 p-5 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-success to-success-dark rounded-xl flex items-center justify-center flex-shrink-0">
                  <Palette className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-bold text-brand-primary text-base font-headline">Design Your Own Instantly</h4>
                    <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">INSTANT</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Easy drag-and-drop editor. Add your logo, photos & text. Make changes anytime.</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <MousePointerClick className="h-3.5 w-3.5 text-success" />
                    Perfect for hands-on owners
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 max-w-5xl mx-auto">*Spotlight article included free with yearly plans (a $250+ value)</p>
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

      {/* FAQ Section */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-brand-primary">
              Common Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {[
              { q: 'How much does it cost?', a: 'We have plans for every budget, starting at less than $1 a day. Fill out our quick form above to see current pricing and find the plan that fits your business.' },
              { q: 'Do I need to design my own ad?', a: 'No! You can let our professional team design it for you at no extra cost, or use our easy online designer to create it yourself—whichever you prefer.' },
              { q: 'How quickly will my ad go live?', a: 'Most ads go live within 48 hours of approval. We\'ll send you a preview to approve first.' },
              { q: 'Can I update my ad later?', a: 'Yes! Update your ad anytime at no extra charge. Design it yourself using our online tool, or just email us your changes.' },
              { q: 'What is the directory listing?', a: 'While your ad is live, you get a free business profile in our community sponsor directory. Add your logo, description, contact info, and social links so local residents can find and learn about your business.' },
              { q: 'What do I get with a yearly plan?', a: 'Yearly plan subscribers save up to 20% on monthly pricing AND receive a free professionally written spotlight article about their business, published on our community websites. That\'s a $250+ value—included at no extra cost.' },
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild variant="success" className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto touch-manipulation shadow-lg shadow-success/30">
              <Link href="#get-started">
                See Pricing Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" asChild className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto touch-manipulation bg-white/10 border-2 border-white/30 text-white hover:bg-white/20">
              <Link href="#get-started">
                Get a Free Quote <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
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
