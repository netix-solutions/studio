
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

export const goToBillingPortal = async (firestore: Firestore, userId: string, returnUrl: string) => {
  // 1. Create a new portal link document in the /customers/{uid}/portal_links collection
  const portalLinksRef = collection(firestore, 'customers', userId, 'portal_links');
  const docRef = await addDoc(portalLinksRef, {
    return_url: returnUrl,
    createdAt: serverTimestamp(),
  });

  // 2. Wait for the Stripe extension to write the URL to the document with timeout
  return new Promise<void>((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;

    const unsub = onSnapshot(docRef, (snap) => {
      const data = snap.data();
      if (data?.url) {
        clearTimeout(timeoutId);
        unsub();
        window.location.assign(data.url);
        resolve();
      }
      if (data?.error) {
        clearTimeout(timeoutId);
        unsub();
        const errorMessage = data.error.message || 'Could not create billing portal link.';
        reject(new Error(errorMessage));
      }
    }, (error) => {
      clearTimeout(timeoutId);
      unsub();
      console.error("onSnapshot error:", error);
      reject(new Error("Permission denied. Could not listen for billing portal link."));
    });

    // Set timeout to prevent infinite waiting
    timeoutId = setTimeout(() => {
      unsub();
      reject(new Error('Billing portal request timed out. Please try again.'));
    }, STRIPE_TIMEOUT_MS);
  });
};
