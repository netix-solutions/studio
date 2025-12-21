'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Global Not Found Page
 *
 * This component is automatically rendered by Next.js when a route is not found.
 * It immediately triggers a client-side redirect to the homepage ('/')
 * to provide a better user experience than a standard 404 error page.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect the user to the landing page.
    router.replace('/');
  }, [router]);

  // Display a loading indicator while the redirect is in progress.
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Page not found. Redirecting...</p>
    </div>
  );
}
