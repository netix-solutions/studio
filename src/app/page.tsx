

'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Target, Users, Newspaper, PenTool, RefreshCw, Calendar, FileCheck, DollarSign, Smartphone, Monitor, Phone, Globe, User, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GetStartedForm } from '@/components/landing/get-started-form';
import { Facebook, Twitter, Instagram } from 'lucide-react';
import { sampleAds } from '@/lib/mock-data';
import { StatsSection } from '@/components/landing/stats';
import { Separator } from '@/components/ui/separator';

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
      title: "Step 6: Automatic Renewal",
      description: "Your plan renews automatically based on your chosen term. You can cancel anytime without hidden fees."
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
          title: "Choose Your Term",
          description: "Select the billing cycle that works for you, with no long-term contracts required."
      },
      {
          icon: ShieldCheck,
          title: "No Hidden Fees",
          description: "The price you see is the price you pay. Cancel your subscription easily at any time."
      }
  ];

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
       <header className="sticky top-2 z-30 w-full px-4 md:px-6">
        <div className="flex h-[70px] items-center gap-4 rounded-xl border border-border/40 bg-background/80 px-4 shadow-lg backdrop-blur-sm md:px-6">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl">
            <Image src="/logo.png" alt="Community-Websites.com Logo" width={81} height={45} style={{height: '45px', width: 'auto'}} />
            <span className="font-headline text-lg tracking-tight text-gray-700 hidden sm:inline">Community-Websites.com</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
             <Button variant="ghost" asChild>
              <a href="tel:813-544-8383" className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <span className="hidden sm:inline text-xs">Call/Text: 813-544-8383</span>
              </a>
            </Button>
            <Button variant="ghost" size="icon" asChild>
                <Link href="/login">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Login</span>
                </Link>
            </Button>
            <Button asChild>
              <Link href="#get-started">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="-mt-[88px]">
        {/* Hero Section */}
        <section className="relative w-full flex h-screen min-h-[700px] flex-col items-center justify-center text-center">
          <div className="absolute inset-0 z-0">
              <Image
                  src="/bg.png"
                  alt="Background"
                  layout="fill"
                  objectFit="cover"
                  className="blur-sm"
              />
              <div className="absolute inset-0 bg-black/30"></div>
          </div>
          <div className="relative container mx-auto z-10 text-white drop-shadow-lg px-4 md:px-6 pt-20">
            <Image src="/logo.png" alt="Community-Websites.com Logo" width={150} height={83} priority className="mx-auto mb-4 drop-shadow-lg" />
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline [text-shadow:_0_2px_4px_rgb(0_0_0_/_50%)]">
              Reach thousands of local readers every day.
            </h1>
            <p className="max-w-[700px] mx-auto text-gray-200 md:text-xl [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]">
              Your clickable ad runs on WesleyChapelCommunity.com and PascoCommunity.com.
            </p>
            <div className="text-lg text-gray-200 [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]">Plans start from just $24 per month.</div>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="shadow-lg">
                <Link href="#get-started">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild className="shadow-lg">
                <Link href="#get-started">
                  View Pricing
                </Link>
              </Button>
            </div>
             <p className="mt-6 font-bold text-lg text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]">
                Call or Text Us for Info: <a href="tel:813-544-8383" className="underline hover:text-gray-300">813-544-8383</a>
            </p>
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
                        <Card key={index} className="flex flex-col items-center text-center p-6 bg-card border-border/60">
                            <div className="rounded-full bg-primary p-3 text-primary-foreground mb-4">
                                <step.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 font-headline">{step.title}</h3>
                            <p className="text-muted-foreground text-sm">{step.description}</p>
                        </Card>
                    ))}
                </div>
                <div className="mt-12 text-center">
                    <Button asChild size="lg">
                        <Link href="#get-started">View Current Pricing</Link>
                    </Button>
                </div>
            </div>
        </section>

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
                    <div className="relative w-full max-w-md rounded-lg overflow-hidden shadow-lg">
                        <Image src="/adhere.png" alt="Community News Site Ad Example" width={600} height={500} layout="responsive" />
                    </div>
                </div>
            </div>
             <div className="mt-12 text-center">
                <Button asChild size="lg">
                    <Link href="#get-started">View Current Pricing</Link>
                </Button>
            </div>
        </section>

        {/* What you get section */}
        <section id="what-you-get" className="py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        What Your Business Gets
                    </h2>
                    <p className="mt-4 text-muted-foreground md:text-xl">
                        Everything you need for effective local advertising.
                    </p>
                </div>
                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
                    {whatYouGet.map((item, index) => (
                        <Card key={index} className="bg-card max-w-sm">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="rounded-full bg-primary/10 p-3 text-primary">
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg font-bold font-headline">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{item.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="mt-12 text-center">
                    <Button asChild size="lg">
                        <Link href="#get-started">View Current Pricing</Link>
                    </Button>
                </div>
            </div>
        </section>

        <StatsSection />

        {/* Get Started Form Section */}
        <section id="get-started" className="bg-muted/50 py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <Card className="max-w-3xl mx-auto bg-card border-border/60">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold font-headline">See Current Pricing</CardTitle>
                        <CardDescription>
                            Fill out this form to see our pricing and plans.
                            <br />
                            Have questions? Call or text us 24/7 at <a href="tel:813-544-8383" className="text-primary font-medium hover:underline">813-544-8383</a>.
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
                        We work with all types of local businesses targeting residents in Pasco County, including restaurants, real estate agents, home service providers, medical offices, and local retailers. Our platform is ideal for anyone looking to increase their visibility within the community.
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-2">
                        <AccordionTrigger>Do I need to have my own ad banner?</AccordionTrigger>
                        <AccordionContent>
                        Not at all! If you have an ad banner, that's great. If you don't, our talented design team will create a clean, professional, and mobile-friendly ad for you at no extra cost. We'll make sure your business looks its best.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>Can I track how my ad is performing?</AccordionTrigger>
                        <AccordionContent>
                        While we don't provide a public-facing analytics dashboard, we focus on driving real-world results: clicks to your website and calls to your business. The most effective way to track performance is to monitor the increase in your own website traffic, calls, and customer inquiries after your ad goes live.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger>Is my ad placement exclusive for my industry?</AccordionTrigger>
                        <AccordionContent>
                        To keep our advertising affordable for everyone, we don't offer industry exclusivity. However, our ad rotation system ensures all advertisers receive fair and consistent visibility to our large audience of local readers. This model helps a wide variety of businesses thrive.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-5">
                        <AccordionTrigger>What if I need to change my ad?</AccordionTrigger>
                        <AccordionContent>
                        It's easy! Just email us your updated banner, link, or message, and we will refresh it for you. We typically process updates within 1-2 business days to ensure your advertising stays current.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-6">
                        <AccordionTrigger>How do I cancel my subscription?</AccordionTrigger>
                        <AccordionContent>
                        You are in complete control. You can cancel your subscription at any time through your secure customer portal. There are no long-term contracts or cancellation fees.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/50 text-card-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 md:flex-row md:px-6">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="flex items-center gap-3">
                    <Image src="/logo.png" alt="Community-Websites.com Logo" width={81} height={45} style={{height: '45px', width: 'auto'}} />
                    <span className="font-headline text-lg tracking-tight text-gray-700">Community-Websites.com</span>
                </div>
                 <a href="tel:813-544-8383" className="text-muted-foreground hover:text-foreground text-sm">
                    Call or Text 24/7: 813-544-8383
                </a>
            </div>
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground md:items-end">
                <div className="flex gap-4">
                    <Link href="/terms-of-service" className="hover:text-primary">Terms of Service</Link>
                    <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
                </div>
                <p>&copy; {new Date().getFullYear()} Community-Websites.com. All rights reserved.</p>
            </div>
        </div>
        <Separator />
        <div className="container mx-auto text-center py-4">
            <Link href="/login" className="text-xs text-muted-foreground hover:text-primary">Existing Customer Login</Link>
        </div>
      </footer>
    </div>
  );
}

    