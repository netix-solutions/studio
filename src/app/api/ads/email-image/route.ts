import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { type LiveAd, type CommunityWebsiteId, selectAdByWeight, COMMUNITY_WEBSITES } from '@/lib/types';

/**
 * Email-Optimized Ad Image Route
 *
 * This endpoint serves ad images directly for use in email campaigns.
 * It's designed for Wix emails and other email platforms that don't support JavaScript.
 *
 * Key features:
 * - Returns the actual image binary (not JSON)
 * - Tracks impressions automatically when the image is loaded
 * - Supports dynamic mode (different ad each request) or static mode (specific ad)
 * - Works with any email client that supports images
 *
 * Usage in email:
 * <a href="https://your-domain/api/ads/email-click?website=wesley-chapel">
 *   <img src="https://your-domain/api/ads/email-image?website=wesley-chapel" alt="Sponsor" />
 * </a>
 */

// Valid website IDs for validation
const VALID_WEBSITE_IDS = Object.values(COMMUNITY_WEBSITES) as string[];

// CORS and caching headers
const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Short cache to allow for rotation while reducing server load
  'Cache-Control': 'public, max-age=60, s-maxage=60',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: baseHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const website = searchParams.get('website') as CommunityWebsiteId | null;
    const adId = searchParams.get('id'); // For static mode - specific ad
    const mode = searchParams.get('mode') || 'dynamic'; // 'dynamic' or 'static'

    const db = getAdminFirestore();
    const now = new Date();

    let selectedAd: LiveAd | null = null;

    if (mode === 'static' && adId) {
      // Static mode - serve a specific ad
      const adDoc = await db.collection('live_ads').doc(adId).get();
      if (adDoc.exists) {
        const ad = { id: adDoc.id, ...adDoc.data() } as LiveAd;
        // Verify ad is active
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

    if (!selectedAd || !selectedAd.imageUrl) {
      // Return a 1x1 transparent pixel if no ad available
      const transparentPixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      return new NextResponse(transparentPixel, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'image/gif',
          'Content-Length': transparentPixel.length.toString(),
        },
      });
    }

    // Track impression (fire and forget - don't wait)
    db.collection('live_ads')
      .doc(selectedAd.id)
      .update({
        impressions: FieldValue.increment(1),
      })
      .catch((err) => console.error('[EmailImage] Failed to track impression:', err));

    // Fetch the actual image from the ad's imageUrl
    try {
      const imageResponse = await fetch(selectedAd.imageUrl, {
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'CommunityAds-EmailProxy/1.0',
        },
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/png';

      // Return the image with the selected ad ID in a header (for debugging/tracking)
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': contentType,
          'Content-Length': imageBuffer.byteLength.toString(),
          'X-Ad-Id': selectedAd.id,
          'X-Ad-Name': encodeURIComponent(selectedAd.name || ''),
          // Allow email clients to cache for a short time
          'Cache-Control': 'public, max-age=300, s-maxage=60',
        },
      });
    } catch (fetchError) {
      console.error('[EmailImage] Failed to fetch ad image:', fetchError);

      // Return a 1x1 transparent pixel on error
      const transparentPixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      return new NextResponse(transparentPixel, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'image/gif',
        },
      });
    }
  } catch (error) {
    console.error('[EmailImage] Error serving email image:', error);

    // Return a 1x1 transparent pixel on error
    const transparentPixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    return new NextResponse(transparentPixel, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': 'image/gif',
      },
    });
  }
}
