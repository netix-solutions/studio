'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { ACTIVITY_TYPES } from '@/lib/types';

// Friendly page names for common routes
const PAGE_TITLES: Record<string, string> = {
  '/account': 'Account',
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/users': 'Users',
  '/subscriptions': 'Subscriptions',
  '/advertisements': 'Advertisements',
  '/pipeline': 'Pipeline',
  '/ad-server': 'Ad Server',
  '/directory': 'Directory',
  '/directory-listings': 'Directory Listings',
  '/automated-emails': 'Automated Emails',
  '/import': 'Import',
  '/legal': 'Legal',
  '/reconciliation': 'Reconciliation',
  '/financials': 'Financials',
  '/manual-entry': 'Manual Entry',
  '/embed-codes': 'Embed Codes',
  '/admin-notifications': 'Admin Notifications',
  '/approve-ad': 'Approve Ad',
};

function getPageTitle(pathname: string): string {
  // Check for exact match first
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  // Check for partial matches (e.g., /subscriptions/123)
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(route + '/')) {
      // Extract the ID if present
      const parts = pathname.split('/');
      if (parts.length > 2) {
        return `${title} Details`;
      }
      return title;
    }
  }

  // Fallback: convert pathname to title case
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Page';
}

/**
 * Hook to track page visits for logged-in users.
 * Records visits in the lead's activity timeline when a converted lead visits pages.
 */
export function usePageVisitTracking() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const leadIdCache = useRef<string | null>(null);
  const hasCheckedLead = useRef(false);

  useEffect(() => {
    // Skip if no user or firestore, or if we've already tracked this path
    if (!user || !firestore || !pathname) return;
    if (lastTrackedPath.current === pathname) return;

    const trackVisit = async () => {
      try {
        let leadId = leadIdCache.current;

        // Find the lead associated with this user (only once per session)
        if (!hasCheckedLead.current) {
          hasCheckedLead.current = true;

          // Query for leads where convertedToCustomerId matches the user's UID
          const leadsRef = collection(firestore, 'leads');
          const leadQuery = query(
            leadsRef,
            where('convertedToCustomerId', '==', user.uid),
            limit(1)
          );
          const leadSnapshot = await getDocs(leadQuery);

          if (!leadSnapshot.empty) {
            leadId = leadSnapshot.docs[0].id;
            leadIdCache.current = leadId;
          }
        }

        // If no lead found for this user, nothing to track
        if (!leadId) return;

        // Record the page visit activity
        const pageTitle = getPageTitle(pathname);

        await addDoc(collection(firestore, 'leads', leadId, 'activities'), {
          leadId: leadId,
          type: ACTIVITY_TYPES.PAGE_VISIT,
          title: `Visited ${pageTitle}`,
          description: `User visited the ${pageTitle} page`,
          metadata: {
            pageUrl: pathname,
            pageTitle: pageTitle,
          },
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Customer',
          createdAt: serverTimestamp(),
        });

        // Update the last tracked path
        lastTrackedPath.current = pathname;
      } catch (error) {
        // Silently fail - we don't want to disrupt user experience for tracking failures
        console.error('Failed to track page visit:', error);
      }
    };

    trackVisit();
  }, [user, firestore, pathname]);
}
