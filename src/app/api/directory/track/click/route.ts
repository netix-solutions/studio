import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { type LiveAd } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const listingId = request.nextUrl.searchParams.get('id');

  if (!listingId) {
    return new NextResponse('Missing listing ID', { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let targetUrl: string | undefined;
    let docRef: FirebaseFirestore.DocumentReference | null = null;

    // Check if this is a free listing (prefixed with "free_")
    if (listingId.startsWith('free_')) {
      const actualId = listingId.replace('free_', '');
      const listingDoc = await db.collection('directory_listings').doc(actualId).get();
      
      if (listingDoc.exists) {
        const listing = listingDoc.data();
        targetUrl = listing?.websiteUrl;
        docRef = listingDoc.ref;
      }
    } else {
      // First try live_ads collection (for approved advertiser listings)
      const liveAdDoc = await db.collection('live_ads').doc(listingId).get();
      
      if (liveAdDoc.exists) {
        const liveAd = liveAdDoc.data() as LiveAd;
        targetUrl = liveAd.directoryListing?.websiteUrl || liveAd.targetUrl;
        docRef = liveAdDoc.ref;
      } else {
        // Fallback to directory_listings collection
        const listingDoc = await db.collection('directory_listings').doc(listingId).get();
        
        if (listingDoc.exists) {
          const listing = listingDoc.data();
          targetUrl = listing?.websiteUrl;
          docRef = listingDoc.ref;
        }
      }
    }

    if (!targetUrl) {
      return new NextResponse('No website URL found', { status: 404 });
    }

    // Ensure URL has protocol
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Update analytics if we have a document reference
    if (docRef) {
      try {
        await docRef.update({
          'analytics.totalClicks': FieldValue.increment(1),
        });

        // Update daily analytics
        const analyticsRef = docRef.collection('analytics').doc(today);
        await analyticsRef.set({
          date: today,
          views: FieldValue.increment(0),
          clicks: FieldValue.increment(1),
          timestamp: FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (analyticsError) {
        // Don't fail the redirect if analytics update fails
        console.error('Error updating analytics:', analyticsError);
      }
    }

    // Redirect to business website
    return NextResponse.redirect(targetUrl, 302);
  } catch (error) {
    console.error('Error tracking click:', error);
    return new NextResponse('Error processing click', { status: 500 });
  }
}
