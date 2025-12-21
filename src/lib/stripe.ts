
'use client';
import {
  createCheckoutSession,
  getStripePayments,
} from '@stripe/firestore-stripe-payments';
import { firebaseApp, type useFirestore } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// Initialize the Stripe Payments SDK on-demand
export const getPayments = (firestore: Firestore) => {
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
    // Pass auth to getFunctions to ensure the call is authenticated
    const functions = getFunctions(firebaseApp, 'us-central1');
    const functionRef = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');

    const { data } = await functionRef({ returnUrl: returnUrl });
    window.location.assign((data as any).url);
}
