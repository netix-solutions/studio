import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { type LiveAd, type AdPlacement, type CommunityWebsiteId, COMMUNITY_WEBSITES } from '@/lib/types';

// Valid website IDs for validation
const VALID_WEBSITE_IDS = Object.values(COMMUNITY_WEBSITES) as string[];

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Serve ALL eligible ads for a given placement/website.
 * Used by the embed script for client-side rotation.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placement = searchParams.get('placement') as AdPlacement | null;
    const website = searchParams.get('website') as CommunityWebsiteId | null;
    const site = searchParams.get('site'); // Legacy support

    // Build absolute base URL for tracking endpoints
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.nextUrl.host;
    const baseUrl = `${protocol}://${host}`;

    const db = getAdminFirestore();
    const now = new Date();

    // Build query for active ads
    let query = db.collection('live_ads').where('status', 'in', ['active', 'scheduled']);

    if (placement) {
      query = query.where('placement', '==', placement);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'No ads available', ads: [] },
        { status: 200, headers: corsHeaders }
      );
    }

    // Determine the website ID to filter by
    const targetWebsiteId = website || (site && VALID_WEBSITE_IDS.includes(site) ? site as CommunityWebsiteId : null);

    // Filter ads based on schedule and website targeting
    const eligibleAds: LiveAd[] = [];

    snapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      // Check date range
      if (ad.startDate) {
        const startDate = ad.startDate.toDate ? ad.startDate.toDate() : new Date(ad.startDate);
        if (now < startDate) return; // Not started yet
      }

      if (ad.endDate) {
        const endDate = ad.endDate.toDate ? ad.endDate.toDate() : new Date(ad.endDate);
        if (now > endDate) return; // Already ended
      }

      // Check website targeting if a specific website is requested
      if (targetWebsiteId) {
        if (ad.targetWebsites && ad.targetWebsites.length > 0) {
          if (!ad.targetWebsites.includes(targetWebsiteId)) return;
        }
      }

      // Legacy: Check site targeting
      if (ad.targetSites && ad.targetSites.length > 0 && site && !VALID_WEBSITE_IDS.includes(site)) {
        if (!ad.targetSites.includes(site)) return;
      }

      eligibleAds.push(ad);
    });

    if (eligibleAds.length === 0) {
      return NextResponse.json(
        { error: 'No eligible ads available', ads: [] },
        { status: 200, headers: corsHeaders }
      );
    }

    // Return all ads with tracking URLs
    const ads = eligibleAds.map(ad => ({
      id: ad.id,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      altText: ad.altText || ad.name,
      name: ad.name, // Business name for tooltip
      customerName: ad.customerName, // Customer name as fallback
      width: ad.width,
      height: ad.height,
      placement: ad.placement,
      weight: ad.weight || 1,
      clickUrl: `${baseUrl}/api/ads/click?id=${ad.id}`,
      impressionUrl: `${baseUrl}/api/ads/impression?id=${ad.id}`,
    }));

    return NextResponse.json({ ads }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error serving ads:', error);
    return NextResponse.json(
      { error: 'Internal server error', ads: [] },
      { status: 500, headers: corsHeaders }
    );
  }
}
