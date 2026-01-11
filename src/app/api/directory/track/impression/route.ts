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

    // Update main listing analytics
    const listingRef = db.collection('directory_listings').doc(listingId);
    await listingRef.update({
      'analytics.totalViews': FieldValue.increment(1),
      'analytics.lastViewed': FieldValue.serverTimestamp(),
    });

    // Update daily analytics
    const analyticsRef = listingRef.collection('analytics').doc(today);
    await analyticsRef.set({
      date: today,
      views: FieldValue.increment(1),
      clicks: FieldValue.increment(0),
      timestamp: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error tracking impression:', error);
    // Return pixel anyway so it doesn't break the page
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    return new NextResponse(pixel, {
      status: 200,
      headers: { 'Content-Type': 'image/gif' },
    });
  }
}
