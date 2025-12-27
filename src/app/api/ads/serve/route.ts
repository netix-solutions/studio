import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { type LiveAd, type AdPlacement, type CommunityWebsiteId, selectAdByWeight, COMMUNITY_WEBSITES } from '@/lib/types';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placement = searchParams.get('placement') as AdPlacement | null;
    const website = searchParams.get('website') as CommunityWebsiteId | null;
    const site = searchParams.get('site'); // Legacy support - can be website ID or domain

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
        { error: 'No ads available', ad: null },
        { status: 200, headers: corsHeaders }
      );
    }

    // Determine the website ID to filter by
    // Priority: 1) explicit website param, 2) site param if it's a valid website ID
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
        // If ad has targetWebsites specified, it must include the requested website
        if (ad.targetWebsites && ad.targetWebsites.length > 0) {
          if (!ad.targetWebsites.includes(targetWebsiteId)) return; // Not targeted to this website
        }
        // If ad has no targetWebsites, it shows on all websites (pass through)
      }

      // Legacy: Check site targeting if specified (for backwards compatibility with domains)
      if (ad.targetSites && ad.targetSites.length > 0 && site && !VALID_WEBSITE_IDS.includes(site)) {
        if (!ad.targetSites.includes(site)) return; // Not targeted to this site domain
      }

      eligibleAds.push(ad);
    });

    if (eligibleAds.length === 0) {
      return NextResponse.json(
        { error: 'No eligible ads available', ad: null },
        { status: 200, headers: corsHeaders }
      );
    }

    // Select an ad based on weight
    const selectedAd = selectAdByWeight(eligibleAds);

    if (!selectedAd) {
      return NextResponse.json(
        { error: 'Failed to select ad', ad: null },
        { status: 200, headers: corsHeaders }
      );
    }

    // Return ad data for client-side rendering
    const response = {
      ad: {
        id: selectedAd.id,
        imageUrl: selectedAd.imageUrl,
        targetUrl: selectedAd.targetUrl,
        altText: selectedAd.altText || selectedAd.name,
        width: selectedAd.width,
        height: selectedAd.height,
        placement: selectedAd.placement,
      },
      // Provide absolute click tracking URL for cross-origin usage
      clickUrl: `${baseUrl}/api/ads/click?id=${selectedAd.id}`,
      // Provide absolute impression tracking URL for cross-origin usage
      impressionUrl: `${baseUrl}/api/ads/impression?id=${selectedAd.id}`,
    };

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error serving ad:', error);
    return NextResponse.json(
      { error: 'Internal server error', ad: null },
      { status: 500, headers: corsHeaders }
    );
  }
}
