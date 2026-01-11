import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const listingId = request.nextUrl.searchParams.get('id');

  if (!listingId) {
    return new NextResponse('Missing listing ID', { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get listing
    const listingDoc = await db.collection('directory_listings').doc(listingId).get();
    
    if (!listingDoc.exists) {
      return new NextResponse('Listing not found', { status: 404 });
    }

    const listing = listingDoc.data();
    const targetUrl = listing?.websiteUrl;

    if (!targetUrl) {
      return new NextResponse('No website URL', { status: 404 });
    }

    // Update main listing analytics
    await listingDoc.ref.update({
      'analytics.totalClicks': FieldValue.increment(1),
    });

    // Update daily analytics
    const analyticsRef = listingDoc.ref.collection('analytics').doc(today);
    await analyticsRef.set({
      date: today,
      views: FieldValue.increment(0),
      clicks: FieldValue.increment(1),
      timestamp: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Redirect to business website
    return NextResponse.redirect(targetUrl, 302);
  } catch (error) {
    console.error('Error tracking click:', error);
    return new NextResponse('Error processing click', { status: 500 });
  }
}
