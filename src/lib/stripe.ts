'use client';

import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '@/firebase';

export const createCheckout = async (
  firestore: Firestore,
  userId: string,
  userEmail: string,
  priceId: string,
  redirectUrl: string
) => {
  // 1) Ensure customer doc exists so the extension can create the Stripe customer
  // if it doesn't exist. This is a crucial step.
  await setDoc(
    doc(firestore, 'customers', userId),
    { email: userEmail },
    { merge: true }
  );

  // 2) Create checkout session doc where the extension expects it.
  // The extension will listen for this document, create the session, and write back the URL.
  const sessionsRef = collection(firestore, 'customers', userId, 'checkout_sessions');

  const sessionRef = await addDoc(sessionsRef, {
    price: priceId, // must be "price_..."
    success_url: redirectUrl,
    cancel_url: redirectUrl,
    allow_promotion_codes: true,
    createdAt: serverTimestamp(),
  });

  // 3) Wait for extension to write back url (or error)
  return new Promise<void>((resolve, reject) => {
    const unsub = onSnapshot(
      sessionRef,
      (snap) => {
        const data = snap.data() as any;
        if (!data) return;

        if (data.error) {
          unsub();
          reject(new Error(data.error?.message || 'Stripe checkout failed.'));
          return;
        }

        if (data.url) {
          unsub();
          window.location.assign(data.url);
          resolve();
        }
      },
      (err) => {
        unsub();
        reject(err);
      }
    );
  });
};

export const goToBillingPortal = async (auth: Auth, returnUrl: string) => {
  const functions = getFunctions(firebaseApp, 'us-central1');
  const fn = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');
  const { data } = await fn({ returnUrl });
  window.location.assign((data as any).url);
};
