'use client';

import { useEffect, useRef } from 'react';
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
import { trackLogin } from '@/lib/analytics';

/**
 * Hook to track user logins.
 * Records login events in the lead's activity timeline when a converted lead logs in.
 */
export function useLoginTracking() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const hasTrackedLogin = useRef(false);
  const lastTrackedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Skip if no user or firestore
    if (!user || !firestore) {
      // Reset tracking when user logs out
      if (!user) {
        hasTrackedLogin.current = false;
        lastTrackedUserId.current = null;
      }
      return;
    }

    // Only track once per login session (when user changes)
    if (hasTrackedLogin.current && lastTrackedUserId.current === user.uid) {
      return;
    }

    const trackLoginActivity = async () => {
      try {
        // Track login in Google Analytics
        trackLogin({
          method: 'email',
          userId: user.uid,
        });

        // Find the lead associated with this user
        const leadsRef = collection(firestore, 'leads');

        // First try to find by convertedToCustomerId
        let leadQuery = query(
          leadsRef,
          where('convertedToCustomerId', '==', user.uid),
          limit(1)
        );
        let leadSnapshot = await getDocs(leadQuery);

        // If not found by convertedToCustomerId, try finding by email
        if (leadSnapshot.empty && user.email) {
          leadQuery = query(
            leadsRef,
            where('email', '==', user.email.toLowerCase()),
            limit(1)
          );
          leadSnapshot = await getDocs(leadQuery);

          // Also try without lowercase
          if (leadSnapshot.empty) {
            leadQuery = query(
              leadsRef,
              where('email', '==', user.email),
              limit(1)
            );
            leadSnapshot = await getDocs(leadQuery);
          }
        }

        if (leadSnapshot.empty) {
          // No associated lead found, nothing to track
          hasTrackedLogin.current = true;
          lastTrackedUserId.current = user.uid;
          return;
        }

        const leadId = leadSnapshot.docs[0].id;

        // Record the login activity
        await addDoc(collection(firestore, 'leads', leadId, 'activities'), {
          leadId: leadId,
          type: ACTIVITY_TYPES.LOGIN,
          title: 'Logged in',
          description: 'Customer logged into their account',
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            userId: user.uid,
          },
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Customer',
          createdAt: serverTimestamp(),
        });

        hasTrackedLogin.current = true;
        lastTrackedUserId.current = user.uid;
      } catch (error) {
        // Silently fail - we don't want to disrupt user experience for tracking failures
        console.error('Failed to track login:', error);
        // Still mark as tracked to prevent retry loops
        hasTrackedLogin.current = true;
        lastTrackedUserId.current = user.uid;
      }
    };

    trackLoginActivity();
  }, [user, firestore]);
}
