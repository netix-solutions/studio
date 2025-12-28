
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Phone, Users, TrendingUp, Zap, PenTool, Shield, ChevronRight, Star, Clock, Award, Building2, Utensils, Briefcase, Home, Car, Scissors, ShoppingBag, Stethoscope, User as UserIcon, Palette, Sparkles, MousePointerClick, Monitor } from 'lucide-react';
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

      {/* What's Included - Compact Grid */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline text-brand-primary">
              Everything Included
            </h2>
            <p className="mt-3 text-gray-600 text-base md:text-lg">
              No hidden fees. Simple, transparent pricing.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 max-w-5xl mx-auto">
            {[
              { icon: PenTool, label: 'Free Design' },
              { icon: TrendingUp, label: 'Clickable Ads' },
              { icon: Zap, label: 'Free Updates' },
              { icon: Shield, label: 'No Contracts' },
              { icon: Users, label: 'Local Reach' },
              { icon: Clock, label: '48hr Launch' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 md:p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md hover:border-brand-primary/20 transition-all duration-200">
                <item.icon className="h-6 w-6 md:h-7 md:w-7 text-brand-primary mx-auto mb-2.5" />
                <span className="text-xs md:text-sm font-semibold text-gray-700">{item.label}</span>
              </div>
            ))}
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
              Connect with Your Community
            </h2>
            <p className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed">
              Our community websites are where Pasco County residents go for local news, events, and recommendations. Put your business right in front of neighbors who are ready to shop local.
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
              Trusted by Local Businesses
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
            {[
              { quote: "The local targeting is exactly what our restaurant needed. New customers every week!", name: "Maria S.", business: "Family Restaurant", icon: Utensils },
              { quote: "At $16 a month, this is the most affordable advertising we've found.", name: "James T.", business: "HVAC Services", icon: Building2 },
              { quote: "Beautiful ad designed for us in 2 days. Already renewed for a second year!", name: "Dr. Sarah K.", business: "Family Dentistry", icon: Stethoscope },
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
                    Ready to Grow Your Business?
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm md:text-base">
                    Fill out the form to see our pricing plans.
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
