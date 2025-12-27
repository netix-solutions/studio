import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adId = searchParams.get('id');

    if (adId) {
      const db = getAdminFirestore();

      // Increment impression count (fire and forget for performance)
      db.collection('live_ads').doc(adId).update({
        impressions: FieldValue.increment(1),
      }).catch((err) => console.error('Failed to increment impressions:', err));

      // Log the impression event
      const referrer = request.headers.get('referer') || '';
      const userAgent = request.headers.get('user-agent') || '';

      db.collection('ad_events').add({
        adId,
        type: 'impression',
        referrer,
        userAgent,
        timestamp: FieldValue.serverTimestamp(),
      }).catch((err) => console.error('Failed to log impression event:', err));
    }

    // Return a 1x1 transparent GIF
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Content-Length': TRACKING_PIXEL.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error tracking impression:', error);
    // Still return the pixel even on error
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Content-Length': TRACKING_PIXEL.length.toString(),
      },
    });
  }
}
