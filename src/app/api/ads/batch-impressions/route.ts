import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Get dynamic CORS headers based on request origin.
 * When credentials are included in requests (sendBeacon, fetch with keepalive),
 * browsers require a specific origin instead of wildcard '*'.
 */
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

interface ImpressionBatch {
  adId: string;
  count: number;
}

/**
 * Batch impression tracking endpoint.
 * Accepts an array of {adId, count} pairs and updates all counters in a single batch.
 * This dramatically reduces database writes compared to tracking each impression individually.
 */
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const impressions: ImpressionBatch[] = body.impressions;

    if (!impressions || !Array.isArray(impressions) || impressions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid impressions data' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate and sanitize input
    const validImpressions = impressions.filter(
      (imp) => imp.adId && typeof imp.adId === 'string' && typeof imp.count === 'number' && imp.count > 0
    );

    if (validImpressions.length === 0) {
      return NextResponse.json(
        { error: 'No valid impressions to process' },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = getAdminFirestore();
    const batch = db.batch();

    // Aggregate impressions by adId (in case of duplicates)
    const aggregated = new Map<string, number>();
    for (const imp of validImpressions) {
      const current = aggregated.get(imp.adId) || 0;
      aggregated.set(imp.adId, current + imp.count);
    }

    // Update all impression counters in a single batch
    for (const [adId, count] of aggregated) {
      const adRef = db.collection('live_ads').doc(adId);
      batch.update(adRef, {
        impressions: FieldValue.increment(count),
      });
    }

    // Commit all updates atomically
    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        processed: aggregated.size,
        totalImpressions: Array.from(aggregated.values()).reduce((a, b) => a + b, 0)
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error processing batch impressions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
