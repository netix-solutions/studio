'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Target, Users, Newspaper, PenTool, RefreshCw, Calendar, FileCheck, DollarSign, Smartphone, Monitor, Phone, Globe } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GetStartedForm } from '@/components/landing/get-started-form';
import { Facebook, Twitter, Instagram } from 'lucide-react';
import { sampleAds } from '@/lib/mock-data';
import { StatsSection } from '@/components/landing/stats';

export default function LandingPage() {
  const howItWorksSteps = [
    {
      icon: DollarSign,
      title: "Step 1: Pick Your Plan",
      description: "Choose a tier that fits your business goals and budget."
    },
    {
      icon: Users,
      title: "Step 2: Submit Your Details",
      description: "Provide your business name, contact info, and website link."
    },
    {
      icon: PenTool,
      title: "Step 3: Provide Your Ad",
      description: "Upload your existing banner or let our team design one for you."
    },
    {
      icon: FileCheck,
      title: "Step 4: Approve The Proof",
      description: "We'll build or verify your ad and send you a preview for approval."
    },
    {
      icon: Calendar,
      title: "Step 5: Go Live",
      description: "Once approved, billing starts and your ad goes live on the network."
    },
    {
      icon: RefreshCw,
      title: "Step 6: Renew Monthly",
      description: "Your plan renews automatically, and you can cancel anytime."
    }
  ];

  const whatYouGet = [
      {
          icon: Newspaper,
          title: "Rotating Banner Ad",
          description: "Your ad is placed into a rotation on high-traffic pages that residents view daily."
      },
      {
          icon: Target,
          title: "Clickable Traffic",
          description: "Each ad links to a destination you choose, driving readers to your site, offer, or booking page."
      },
      {
          icon: PenTool,
          title: "Creative Support",
          description: "Don't have a banner? Our team can design a clean, mobile-friendly ad for you."
      },
      {
          icon: RefreshCw,
          title: "Easy Updates",
          description: "Need to change your link or message? Just send us the new info and we'll refresh it."
      },
      {
          icon: Calendar,
          title: "Month-to-Month Billing",
          description: "No long-term contracts. Your plan renews monthly and you can cancel anytime."
      },
      {
          icon: FileCheck,
          title: "Basic Reporting",
          description: "We provide basic performance updates on clicks and impressions upon request."
      }
  ];

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm border-border/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
             <Globe className="h-6 w-6 text-primary" />
            <span className="font-headline">Community-Websites.com</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
             <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <a href="tel:813-544-8383" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>813-544-8383</span>
              </a>
            </Button>
            <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="#get-started">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="container mx-auto flex flex-col items-center justify-center space-y-6 px-4 py-20 text-center md:px-6 lg:py-32">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline">
            Reach thousands of local readers every day.
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Your clickable ad runs on WesleyChapelCommunity.com and PascoCommunity.com.
          </p>
          <div className="text-lg text-muted-foreground">Plans as low as $24 per month.</div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <Link href="#get-started">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#get-started">
                View Pricing
              </Link>
            </Button>
          </div>
        </section>

        {/* How it works section */}
        <section id="how-it-works" className="bg-muted/50 py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        How It Works
                    </h2>
                    <p className="mt-4 text-muted-foreground md:text-xl">
                        A simple, transparent process to get your business seen.
                    </p>
                </div>
                <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {howItWorksSteps.map((step, index) => (
                        <Card key={index} className="flex flex-col items-center text-center p-6 bg-card/80">
                            <div className="rounded-full bg-primary p-3 text-primary-foreground mb-4">
                                <step.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 font-headline">{step.title}</h3>
                            <p className="text-muted-foreground text-sm">{step.description}</p>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* What you get section */}
        <section id="what-you-get" className="py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        What You Get Each Month
                    </h2>
                    <p className="mt-4 text-muted-foreground md:text-xl">
                        Everything you need for effective local advertising.
                    </p>
                </div>
                <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                     {whatYouGet.map((item, index) => (
                        <div key={index} className="flex items-start gap-4">
                            <div className="rounded-full bg-primary/10 p-3 text-primary">
                                <item.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold font-headline">{item.title}</h3>
                                <p className="text-muted-foreground">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <StatsSection />

        {/* Where your ad appears section */}
        <section id="placements" className="bg-muted/50 py-20 lg:py-24">
            <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center px-4 md:px-6">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        Where Your Ad Appears
                    </h2>
                    <p className="text-muted-foreground md:text-lg">
                        Your ad appears on pages residents visit for local news, events, and community updates. Ads rotate to keep exposure consistent across our network, reaching Pasco County residents where they are most engaged.
                    </p>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span>WesleyChapelCommunity.com</span>
                        </li>
                         <li className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span>PascoCommunity.com</span>
                        </li>
                    </ul>
                </div>
                <div className="flex justify-center">
                    <div className="relative w-full max-w-md">
                        <Smartphone className="relative z-10 h-auto w-full text-foreground" />
                        <div className="absolute inset-[13px] sm:inset-[16px] rounded-[20px] sm:rounded-[24px] overflow-hidden bg-background">
                            <Image src="https://picsum.photos/seed/news/400/800" alt="Community News Site on Mobile" layout="fill" objectFit="cover" />
                             <div className="absolute bottom-4 left-4 right-4 bg-gray-200/80 backdrop-blur-sm p-2 rounded-md">
                                <p className="text-center text-xs text-black font-semibold">Your Ad Here</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Examples Section */}
        <section id="examples" className="py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        Ad Examples
                    </h2>
                    <p className="mt-4 text-muted-foreground md:text-xl">
                        See how your business could look. We can help design an effective ad for you.
                    </p>
                </div>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {sampleAds.map((ad) => (
                        <div key={ad.id} className="w-full aspect-[3/1] rounded-lg overflow-hidden">
                           <Image 
                            src={ad.imageUrl}
                            alt={ad.alt}
                            width={300}
                            height={100}
                            className="w-full h-full object-cover"
                            data-ai-hint={ad.imageHint}
                           />
                        </div>
                    ))}
                </div>
                 <div className="mt-12 mx-auto max-w-5xl p-6 bg-muted/50 rounded-lg flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                        <Smartphone className="h-32 w-auto text-foreground" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-bold font-headline">Optimized for All Devices</h3>
                        <p className="text-muted-foreground mt-2">
                           Your ads are designed to be clean, readable, and effective whether they are viewed on a desktop computer or a mobile phone. We ensure your message reaches local customers clearly, no matter how they browse.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Get Started Form Section */}
        <section id="get-started" className="bg-muted/50 py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <Card className="max-w-3xl mx-auto bg-card/80">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold font-headline">Get Started Today</CardTitle>
                        <CardDescription>
                            Fill out this form to see our pricing and plans.
                            <br />
                            Have questions? Call us at <a href="tel:813-544-8383" className="text-primary font-medium hover:underline">813-544-8383</a>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <GetStartedForm />
                    </CardContent>
                </Card>
            </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 lg:py-24">
            <div className="container mx-auto max-w-3xl px-4 md:px-6">
                 <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        Frequently Asked Questions
                    </h2>
                </div>
                <Accordion type="single" collapsible className="w-full mt-12">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>What kind of businesses do you work with?</AccordionTrigger>
                        <AccordionContent>
                        We work with all types of local businesses targeting residents in Pasco County, including restaurants, real estate agents, home service providers, medical offices, and local retailers.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>Can I see how my ad is performing?</AccordionTrigger>
                        <AccordionContent>
                        Yes, basic performance reporting (impressions and clicks) is available upon request. We can provide you with updates to see how your ad is doing.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>What if I need to change my ad?</AccordionTrigger>
                        <AccordionContent>
                        It's easy! Just email us your updated banner, link, or message, and we will refresh it for you. We typically process updates within 1-2 business days.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger>How do I cancel my subscription?</AccordionTrigger>
                        <AccordionContent>
                        You can cancel your month-to-month subscription at any time before your next billing date. Simply contact us, and we'll take care of it.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card text-card-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 md:flex-row md:px-6">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2">
                    <Globe className="h-6 w-6 text-primary" />
                    <span className="font-headline font-semibold">Community-Websites.com</span>
                </div>
                 <a href="tel:813-544-8383" className="text-muted-foreground hover:text-foreground text-sm">
                    813-544-8383
                </a>
            </div>
            <div className="flex gap-4">
                <Link href="https://www.facebook.com/wesleychapelflorida" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Facebook className="h-5 w-5" />
                    <span className="sr-only">Facebook</span>
                </Link>
                <Link href="https://x.com/wesleychapel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Twitter className="h-5 w-5" />
                    <span className="sr-only">X</span>
                </Link>
                <Link href="https://www.instagram.com/wesleychapelfl/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Instagram className="h-5 w-5" />
                    <span className="sr-only">Instagram</span>
                </Link>
            </div>
            <div className="text-sm text-muted-foreground text-center md:text-left">
                &copy; {new Date().getFullYear()} Community-Websites.com. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}

    

    