
'use client';

import type { Firestore } from 'firebase/firestore';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

// Note: goToBillingPortal now uses our own API route instead of the Stripe extension
// This is more reliable as the extension's createPortalLink function was not working

const STRIPE_TIMEOUT_MS = 30000; // 30 second timeout for Stripe operations

export const createCheckout = async (
  firestore: Firestore,
  userId: string,
  userEmail: string | null | undefined,
  priceId: string,
  redirectUrl: string
) => {
  // 1) Ensure the customer doc exists (doc id MUST equal Firebase UID)
  await setDoc(
    doc(firestore, 'customers', userId),
    {
      email: userEmail ?? null,
    },
    { merge: true }
  );

  // 2) Create checkout session doc where the extension listens
  const sessionsRef = collection(
    firestore,
    'customers',
    userId,
    'checkout_sessions'
  );

  const docRef = await addDoc(sessionsRef, {
    price: priceId, // must be Stripe price id: price_...
    success_url: redirectUrl,
    cancel_url: window.location.origin + '/pricing',
    allow_promotion_codes: true, // Enable promotion codes on the checkout session
    createdAt: serverTimestamp(),
  });

  // 3) Wait for extension to attach url (or error) with timeout
  await new Promise<void>((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        const data = snap.data() as any;
        if (!data) return;

        // Instead of a generic error, check for the specific error from the extension
        if (data.error) {
          clearTimeout(timeoutId);
          unsub();
          // Safely access the error message, providing a fallback.
          const errorMessage = data.error.message || 'An unknown Stripe error occurred.';
          reject(new Error(errorMessage));
          return;
        }

        if (data.url) {
          clearTimeout(timeoutId);
          unsub();
          window.location.assign(data.url);
          resolve();
        }
      },
      (err) => {
        clearTimeout(timeoutId);
        unsub();
        reject(err);
      }
    );

    // Set timeout to prevent infinite waiting
    timeoutId = setTimeout(() => {
      unsub();
      reject(new Error('Checkout session timed out. Please try again.'));
    }, STRIPE_TIMEOUT_MS);
  });
};

export const goToBillingPortal = async (
  firestore: Firestore,
  userId: string,
  userEmail: string | null | undefined,
  returnUrl: string
) => {
  // Call our API route directly to create a billing portal session
  // This bypasses the Stripe extension which may have issues
  const response = await fetch('/api/billing-portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      returnUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create billing portal session');
  }

  const data = await response.json();

  if (data.url) {
    window.location.assign(data.url);
  } else {
    throw new Error('No billing portal URL returned');
  }
};
