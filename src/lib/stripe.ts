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
  userEmail: string | null | undefined,
  priceId: string,
  redirectUrl: string
) => {
  // 1) Ensure the customer doc exists (doc id MUST equal Firebase UID)
  await setDoc(
    doc(firestore, 'customers', userId),
    {
      email: userEmail ?? null,
      createdAt: serverTimestamp(),
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
    cancel_url: redirectUrl,
    allow_promotion_codes: true,
    createdAt: serverTimestamp(),
  });

  // 3) Wait for extension to attach url (or error)
  await new Promise<void>((resolve, reject) => {
    const unsub = onSnapshot(
      docRef,
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
  const fn = httpsCallable(
    functions,
    'ext-firestore-stripe-payments-createPortalLink'
  );
  const { data } = await fn({ returnUrl });
  window.location.assign((data as any).url);
};
