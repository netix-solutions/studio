'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Globe,
  MapPin,
  CheckCircle,
  ArrowRight,
  Megaphone,
  User as UserIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function DirectorySignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header - Matches Landing Page */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Community-Websites.com" width={40} height={24} className="h-7 w-auto" />
              <span className="font-bold text-blue-900 text-sm sm:text-base">Community-Websites.com</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="tel:813-544-8383" className="hidden md:flex items-center gap-1.5 text-blue-900 hover:text-blue-700">
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">813-544-8383</span>
              </a>
              <Button variant="ghost" size="sm" asChild className="h-9 w-9 sm:w-auto sm:px-3">
                <Link href="/login">
                  <UserIcon className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
              <Button size="sm" asChild className="h-10 px-4 bg-blue-600 hover:bg-blue-700">
                <Link href="/pricing">
                  View Ad Plans
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4 text-sm px-4 py-1">
              <Megaphone className="w-4 h-4 mr-2 inline" />
              Advertise Your Business
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
              Get Your Business Listed
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Tell us about your business and we&apos;ll help you reach thousands of local residents.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: CheckCircle, text: 'Instant visibility' },
              { icon: MapPin, text: 'Reach local customers' },
              { icon: Globe, text: 'Link to your website' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/80 rounded-lg p-3 border border-gray-100">
                <item.icon className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <Card>
            <CardContent className="p-6">
              <iframe
                name="lc_contact_form"
                frameBorder="0"
                width="100%"
                height="600"
                src="https://700453.17hats.com/p#/embed/nwvshvdbhpxkkcsdwvfxggtpprrpbxhc"
              />
              <script
                type="text/javascript"
                src="https://700453.17hats.com/vendor/iframeSizer.min.js"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
