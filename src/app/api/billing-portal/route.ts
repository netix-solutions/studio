import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import Stripe from 'stripe';

// Lazy-initialize Stripe to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, returnUrl } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    let stripeClient: Stripe;

    try {
      stripeClient = getStripe();
    } catch {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Get the customer document to find the Stripe customer ID
    const customerDoc = await db.collection('customers').doc(userId).get();

    if (!customerDoc.exists) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data();
    const stripeCustomerId = customerData?.stripeId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe customer ID not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Create a billing portal session
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://community-websites.com/account',
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
