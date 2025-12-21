'use client';
import {
  createCheckoutSession,
  getStripePayments,
} from '@stripe/firestore-stripe-payments';
import { firebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize the Stripe Payments SDK
const payments = getStripePayments(firebaseApp, {
  productsCollection: 'products',
  customersCollection: 'customers',
});

export const createCheckout = async (
  userId: string,
  priceId: string,
  redirectUrl: string
) => {
  const session = await createCheckoutSession(payments, {
    price: priceId,
    success_url: redirectUrl,
    cancel_url: redirectUrl,
  });
  window.location.assign(session.url);
};

export const goToBillingPortal = async (
  returnUrl: string
) => {
    const functions = getFunctions(firebaseApp, 'us-central1');
    const functionRef = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');

    const { data } = await functionRef({ returnUrl: returnUrl });
    window.location.assign((data as any).url);
}

export default payments;
