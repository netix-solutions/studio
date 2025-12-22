
import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { Separator } from '../ui/separator';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 px-4 shadow-sm backdrop-blur-sm md:px-6">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl">
            <Image src="/logo.png" alt="Community-Websites.com Logo" width={81} height={45} style={{height: '45px', width: 'auto'}} />
            <span className="font-headline text-lg tracking-tight text-gray-700 hidden sm:inline">Community-Websites.com</span>
          </Link>
          <Button variant="outline" asChild>
            <Link href="/login">
              <User className="mr-2 h-4 w-4" />
              Existing Customer Login
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl py-16 px-4 md:px-6">
        <div className="space-y-4 mb-8">
            <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl">{title}</h1>
            <p className="text-muted-foreground">Last Updated: {lastUpdated}</p>
        </div>
        <Separator />
        <div className="mt-8">
            {children}
        </div>
        <div className="mt-12 text-center">
            <Button asChild>
                <Link href="/">
                    &larr; Back to Homepage
                </Link>
            </Button>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-muted/50 text-card-foreground mt-16">
        <div className="container mx-auto py-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Community-Websites.com. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

    