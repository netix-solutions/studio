'use client';

import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

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

export const goToBillingPortal = async (firestore: Firestore, userId: string, returnUrl: string) => {
  // 1. Ensure customer doc exists
  await setDoc(doc(firestore, 'customers', userId), {}, { merge: true });

  // 2. Create a new portal link document
  const portalLinksRef = collection(firestore, 'customers', userId, 'portal_links');
  const docRef = await addDoc(portalLinksRef, {
    return_url: returnUrl,
    createdAt: serverTimestamp(),
  });

  // 3. Wait for the extension to write the URL
  return new Promise<void>((resolve, reject) => {
    const unsub = onSnapshot(docRef, (snap) => {
      const data = snap.data();
      if (data?.url) {
        unsub();
        window.location.assign(data.url);
        resolve();
      }
      if (data?.error) {
        unsub();
        const errorMessage = data.error.message || 'Could not create billing portal link.';
        reject(new Error(errorMessage));
      }
    }, (error) => {
      unsub();
      reject(error);
    });
  });
};
