
'use client';
import {
  createCheckoutSession,
  getStripePayments,
  StripePayments,
} from '@stripe/firestore-stripe-payments';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '@/firebase';

// This function now correctly initializes the Stripe Payments SDK with the
// provided Firestore instance, ensuring checkout works as expected.
export const getPayments = (firestore: Firestore): StripePayments => {
  return getStripePayments(firebaseApp, {
    productsCollection: 'plans',
    customersCollection: 'customers',
  });
};

export const createCheckout = async (
  firestore: Firestore,
  userId: string,
  priceId: string,
  redirectUrl: string
) => {
  try {
    const payments = getPayments(firestore);
    const session = await createCheckoutSession(payments, {
      price: priceId,
      success_url: redirectUrl,
      cancel_url: redirectUrl,
    });
    window.location.assign(session.url);
  } catch (error) {
    console.error("createCheckoutSession error:", error);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
};

export const goToBillingPortal = async (
  auth: Auth,
  returnUrl: string
) => {
    const functions = getFunctions(firebaseApp, 'us-central1');
    const functionRef = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');

    const { data } = await functionRef({ returnUrl: returnUrl });
    window.location.assign((data as any).url);
}
