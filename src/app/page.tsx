'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockPricings } from '@/lib/mock-data';
import { ArrowRight, CheckCircle, Target, Users } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12.5 4.66a2 2 0 0 0-5 0V6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1.5V4.66Z"/><path d="M9 14h6"/><path d="M12 11v6"/></svg>
            <span className="font-headline">CommunityAds</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="container mx-auto flex flex-col items-center justify-center space-y-6 px-4 py-20 text-center md:px-6 lg:py-32">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
            Reach Local Customers Where They Live
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Place your ads on a network of trusted community websites and connect with a highly-engaged local audience. Simple, affordable, and effective.
          </p>
          <Button size="lg" asChild>
            <Link href="/login">
              Start Advertising Today <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </section>

        {/* Features Section */}
        <section className="bg-muted py-20 lg:py-24">
          <div className="container mx-auto grid gap-12 px-4 md:grid-cols-3 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-primary p-4 text-primary-foreground">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold font-headline">Hyper-Local Targeting</h3>
              <p className="text-muted-foreground">
                Connect with customers in specific neighborhoods by advertising on their local community websites.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-primary p-4 text-primary-foreground">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold font-headline">Engaged Audience</h3>
              <p className="text-muted-foreground">
                Our community portals are the go-to resource for local news and events, ensuring your ads are seen by active community members.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-primary p-4 text-primary-foreground">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold font-headline">Simple & Transparent</h3>
              <p className="text-muted-foreground">
                Easy-to-understand pricing and a simple dashboard to manage your campaigns. No hidden fees, no complex metrics.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        Straightforward Pricing
                    </h2>
                    <p className="mt-4 text-muted-foreground md:text-xl">
                        Choose a plan that fits your budget. Cancel anytime.
                    </p>
                </div>
                <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {mockPricings.map((plan) => (
                        <Card key={plan.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl font-headline text-center">{plan.website.split('.')[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <span className="text-4xl font-bold">${plan.monthly}</span>
                                        <span className="text-muted-foreground">/month</span>
                                    </div>
                                    <ul className="space-y-2 text-muted-foreground">
                                        <li className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>Featured on {plan.website}</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>Quarterly discounts available</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>Yearly discounts available</span>
                                        </li>
                                    </ul>
                                </div>
                                <Button className="w-full" asChild>
                                    <Link href="/login">Choose Plan</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>


        {/* CTA Section */}
        <section className="bg-muted py-20 lg:py-24">
          <div className="container mx-auto flex flex-col items-center space-y-6 px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
              Ready to Grow Your Local Business?
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Create an account in minutes and launch your first ad campaign today.
            </p>
            <Button size="lg" asChild>
              <Link href="/login">
                Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CommunityAds. All rights reserved.
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="#" className="text-sm hover:underline">
              Terms of Service
            </Link>
            <Link href="#" className="text-sm hover:underline">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}