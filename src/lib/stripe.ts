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

        // Instead of a generic error, check for the specific error from the extension
        if (data.error) {
          unsub();
          // Safely access the error message, providing a fallback.
          const errorMessage = data.error.message || 'An unknown Stripe error occurred.';
          reject(new Error(errorMessage));
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
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not signed in.');
  }

  // Ensure the customer document exists before creating the portal link.
  // This triggers the extension to create a Stripe customer if one doesn't exist.
  const firestore = getFirestore(firebaseApp);
  await setDoc(doc(firestore, 'customers', user.uid), {
      email: user.email,
  }, { merge: true });


  const functions = getFunctions(firebaseApp, 'us-central1');
  const fn = httpsCallable(
    functions,
    'ext-firestore-stripe-payments-createPortalLink'
  );
  const { data } = await fn({ returnUrl });
  window.location.assign((data as any).url);
};
