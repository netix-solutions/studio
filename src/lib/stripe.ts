'use client';

import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '@/firebase';

export const createCheckout = async (
  firestore: Firestore,
  userId: string,
  priceId: string,
  redirectUrl: string
) => {
  // 1) Create a checkout session doc where the extension expects it
  const sessionsRef = collection(firestore, 'customers', userId, 'checkout_sessions');

  const docRef = await addDoc(sessionsRef, {
    price: priceId,                 // must be the Stripe price id: price_...
    success_url: redirectUrl,
    cancel_url: redirectUrl,
    allow_promotion_codes: true,
    // Add a client field to indicate the checkout was initiated from the web client
    client: 'web',
    mode: 'subscription',
    createdAt: serverTimestamp(),
  });

  // 2) Wait for the extension to write back the URL (or an error)
  await new Promise<void>((resolve, reject) => {
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        const data = snap.data() as any;
        if (!data) return;

        // If the extension writes an error, reject the promise with a user-friendly message.
        if (data.error) {
          unsub();
          // The error object might be complex. Safely access the message.
          const errorMessage = data.error.message || 'An unknown error occurred with Stripe checkout.';
          reject(new Error(errorMessage));
          return;
        }

        // If the extension writes the checkout URL, redirect the user.
        if (data.url) {
          unsub();
          window.location.assign(data.url);
          resolve();
        }
      },
      (err) => {
        // Handle Firestore listener errors.
        unsub();
        reject(err);
      }
    );
  });
};

export const goToBillingPortal = async (auth: Auth, returnUrl: string) => {
  // NOTE: region must match the extension install region
  const functions = getFunctions(firebaseApp, 'us-central1');
  const fn = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');
  const { data } = await fn({ returnUrl });
  window.location.assign((data as any).url);
};
