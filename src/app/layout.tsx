
import type { Metadata } from 'next';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { Manrope, Inter, Bebas_Neue } from 'next/font/google';
import Script from 'next/script';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const bebas_neue = Bebas_Neue({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bebas-neue',
  weight: '400',
});

const siteUrl = "https://community-websites.com";

export const metadata: Metadata = {
  title: 'Local Advertising in Wesley Chapel & Pasco County | Community-Websites.com',
  description: 'Reach thousands of local residents daily. Advertise your business on WesleyChapelCommunity.com and PascoCommunity.com. Affordable, effective, and simple to set up.',
  keywords: ['local advertising', 'Pasco County advertising', 'Wesley Chapel advertising', 'small business marketing', 'community advertising', 'local news ads'],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'Local Advertising in Wesley Chapel & Pasco County',
    description: 'Reach thousands of local residents daily. Advertise your business on WesleyChapelCommunity.com and PascoCommunity.com. Affordable, effective, and simple to set up.',
    images: [
      {
        url: '/social-preview.png',
        width: 1200,
        height: 630,
        alt: 'Community-Websites.com Logo and a slogan: Advertise to your local community.',
      },
    ],
    siteName: 'Community-Websites.com',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@YourTwitterHandle', // Optional: Replace with your Twitter handle
    creator: '@YourTwitterHandle', // Optional: Replace with your Twitter handle
    title: 'Local Advertising in Wesley Chapel & Pasco County',
    description: 'Reach thousands of local residents daily. Advertise your business on WesleyChapelCommunity.com and PascoCommunity.com.',
    images: [
      {
        url: '/social-preview.png',
        alt: 'Community-Websites.com Logo and a slogan: Advertise to your local community.',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable} ${bebas_neue.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DF78ZBZW82"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DF78ZBZW82');
          `}
        </Script>
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
