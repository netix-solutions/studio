
import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { Separator } from '../ui/separator';

interface LegalPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 px-4 shadow-sm backdrop-blur-sm md:px-6">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl">
            <Image src="/logo.png" alt="Community-Websites.com Logo" width={81} height={45} style={{height: '45px', width: 'auto'}} />
            <span className="font-headline font-semibold text-gray-700 hidden sm:inline">Community-Websites.com</span>
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

      <footer className="py-8 bg-blue-900 text-blue-200">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-3 gap-8">
                {/* Branding */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                         <Image src="/logo.png" alt="Community-Websites.com Logo" width={40} height={22} className="h-[22px] w-auto" />
                         <span className="font-headline text-white text-lg tracking-wider">Community-Websites.com</span>
                    </div>
                    <p className="text-sm text-blue-300 max-w-xs">
                        Affordable, effective local advertising for Pasco County small businesses.
                    </p>
                </div>

                {/* Links */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
                    <div>
                        <h4 className="font-semibold text-white mb-3">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-3">Account</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/login" className="hover:text-white transition-colors">Customer Login</Link></li>
                            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-white mb-3">Contact</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="tel:813-544-8383" className="hover:text-white transition-colors">813-544-8383</a></li>
                            <li><a href="mailto:support@community-websites.com" className="hover:text-white transition-colors">support@community-websites.com</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-blue-800 text-center text-xs text-blue-400">
                &copy; {new Date().getFullYear()} Community-Websites.com. All Rights Reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}
