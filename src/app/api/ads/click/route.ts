import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adId = searchParams.get('id');

    if (!adId) {
      return NextResponse.json(
        { error: 'Missing ad ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = getAdminFirestore();

    // Get the ad to find the target URL
    const adDoc = await db.collection('live_ads').doc(adId).get();

    if (!adDoc.exists) {
      return NextResponse.json(
        { error: 'Ad not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const adData = adDoc.data();
    const targetUrl = adData?.targetUrl;

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Ad has no target URL' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Increment click count (fire and forget for performance)
    db.collection('live_ads').doc(adId).update({
      clicks: FieldValue.increment(1),
    }).catch((err) => console.error('Failed to increment clicks:', err));

    // Log the click event
    const referrer = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';

    db.collection('ad_events').add({
      adId,
      type: 'click',
      referrer,
      userAgent,
      timestamp: FieldValue.serverTimestamp(),
    }).catch((err) => console.error('Failed to log click event:', err));

    // Redirect to the target URL
    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error handling ad click:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
