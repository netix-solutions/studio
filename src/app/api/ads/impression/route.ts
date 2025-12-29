import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Set to true to log individual impression events to ad_events collection
// Disabled by default to reduce database writes - batch impressions are preferred
const LOG_IMPRESSION_EVENTS = process.env.LOG_IMPRESSION_EVENTS === 'true';

/**
 * Get dynamic CORS headers based on request origin.
 * When credentials are included in requests, browsers require a specific origin instead of wildcard '*'.
 */
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const adId = searchParams.get('id');

    if (adId) {
      const db = getAdminFirestore();

      // Increment impression count (fire and forget for performance)
      db.collection('live_ads').doc(adId).update({
        impressions: FieldValue.increment(1),
      }).catch((err) => console.error('Failed to increment impressions:', err));

      // Log the impression event only if enabled (disabled by default to save writes)
      // Note: The new batch-impressions endpoint is preferred for efficiency
      if (LOG_IMPRESSION_EVENTS) {
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
