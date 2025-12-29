import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { type LiveAd, type CommunityWebsiteId, selectAdByWeight, COMMUNITY_WEBSITES } from '@/lib/types';

/**
 * Email-Optimized Ad Click Handler
 *
 * This endpoint handles clicks from email ad embeds and redirects to the advertiser's site.
 * It supports two modes:
 *
 * 1. Static mode (with 'id' param): Redirects to a specific ad's target URL
 *    - Use when you want a specific ad to be shown in the email
 *    - Example: /api/ads/email-click?id=abc123
 *
 * 2. Dynamic mode (with 'website' param): Selects a random eligible ad and redirects
 *    - Use for dynamic ad rotation in emails
 *    - Note: The ad clicked may differ from the ad image shown (selected independently)
 *    - Example: /api/ads/email-click?website=wesley-chapel
 *
 * Usage in email:
 * <a href="https://your-domain/api/ads/email-click?id=abc123">
 *   <img src="https://your-domain/api/ads/email-image?id=abc123&mode=static" alt="Sponsor" />
 * </a>
 */

// Valid website IDs for validation
const VALID_WEBSITE_IDS = Object.values(COMMUNITY_WEBSITES) as string[];

// CORS headers
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
    const website = searchParams.get('website') as CommunityWebsiteId | null;
    const fallbackUrl = searchParams.get('fallback') || '';

    const db = getAdminFirestore();
    const now = new Date();

    let selectedAd: LiveAd | null = null;

    if (adId) {
      // Static mode - use specific ad
      const adDoc = await db.collection('live_ads').doc(adId).get();
      if (adDoc.exists) {
        const ad = { id: adDoc.id, ...adDoc.data() } as LiveAd;
        if (ad.status === 'active' || ad.status === 'scheduled') {
          selectedAd = ad;
        }
      }
    } else {
      // Dynamic mode - select an ad based on weight and targeting
      let query = db.collection('live_ads').where('status', 'in', ['active', 'scheduled']);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        const eligibleAds: LiveAd[] = [];

        snapshot.forEach((doc) => {
          const ad = { id: doc.id, ...doc.data() } as LiveAd;

          // Check date range
          if (ad.startDate) {
            const startDate = ad.startDate.toDate ? ad.startDate.toDate() : new Date(ad.startDate);
            if (now < startDate) return;
          }

          if (ad.endDate) {
            const endDate = ad.endDate.toDate ? ad.endDate.toDate() : new Date(ad.endDate);
            if (now > endDate) return;
          }

          // Check website targeting
          if (website && VALID_WEBSITE_IDS.includes(website)) {
            if (ad.targetWebsites && ad.targetWebsites.length > 0) {
              if (!ad.targetWebsites.includes(website)) return;
            }
          }

          eligibleAds.push(ad);
        });

        if (eligibleAds.length > 0) {
          selectedAd = selectAdByWeight(eligibleAds);
        }
      }
    }

    if (!selectedAd || !selectedAd.targetUrl) {
      // No ad found - redirect to fallback URL or return error
      if (fallbackUrl) {
        return NextResponse.redirect(fallbackUrl, {
          status: 302,
          headers: corsHeaders,
        });
      }

      return NextResponse.json(
        { error: 'No ad available' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Track the click (fire and forget)
    db.collection('live_ads')
      .doc(selectedAd.id)
      .update({
        clicks: FieldValue.increment(1),
      })
      .catch((err) => console.error('[EmailClick] Failed to track click:', err));

    // Log the click event
    const referrer = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';

    db.collection('ad_events')
      .add({
        adId: selectedAd.id,
        type: 'email_click',
        source: 'email',
        website: website || null,
        referrer,
        userAgent,
        timestamp: FieldValue.serverTimestamp(),
      })
      .catch((err) => console.error('[EmailClick] Failed to log click event:', err));

    // Redirect to the advertiser's URL
    return NextResponse.redirect(selectedAd.targetUrl, {
      status: 302,
      headers: {
        ...corsHeaders,
        'X-Ad-Id': selectedAd.id,
      },
    });
  } catch (error) {
    console.error('[EmailClick] Error handling email click:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
