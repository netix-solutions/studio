import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  type DirectoryListing,
  type LiveAd,
  isDirectoryListingActive,
  isDirectoryListingVisible,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const categoryParam = request.nextUrl.searchParams.get('category') || '';
  const featuredParam = request.nextUrl.searchParams.get('featured') === 'true';
  const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '100');

  try {
    const db = getAdminFirestore();
    const listings: any[] = [];
    const categoryStats: Record<string, number> = {};

    // 1. Fetch approved listings from live_ads collection
    const liveAdsSnapshot = await db.collection('live_ads')
      .where('status', '==', 'active')
      .get();

    liveAdsSnapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      // Check if directory listing is visible (approved, active, showInDirectory not false)
      if (!isDirectoryListingVisible(ad)) return;

      const listing = ad.directoryListing!;

      if (categoryParam && listing.category !== categoryParam) return;
      if (featuredParam && !listing.isFeatured) return;

      if (listing.category) {
        categoryStats[listing.category] = (categoryStats[listing.category] || 0) + 1;
      }

      listings.push({
        id: ad.id,
        businessName: listing.businessName || ad.customerName || 'Business',
        description: listing.description,
        tagline: listing.tagline,
        category: listing.category,
        categoryLabel: listing.category,
        logoUrl: listing.logoUrl,
        bannerImageUrl: listing.bannerImageUrl,
        imageUrl: ad.imageUrl,
        phone: listing.phone,
        email: listing.email,
        websiteUrl: listing.websiteUrl || ad.targetUrl,
        targetUrl: ad.targetUrl,
        city: listing.city,
        state: listing.state,
        zipCode: listing.zipCode,
        facebookUrl: listing.facebookUrl,
        instagramUrl: listing.instagramUrl,
        linkedinUrl: listing.linkedinUrl,
        twitterUrl: listing.twitterUrl,
        youtubeUrl: listing.youtubeUrl,
        tiktokUrl: listing.tiktokUrl,
        isFeatured: listing.isFeatured,
        showContactInfo: listing.showContactInfo ?? true,
        showSocialLinks: listing.showSocialLinks ?? true,
      });
    });

    // 2. Fetch active listings from directory_listings collection (free/standalone listings)
    const directoryListingsSnapshot = await db.collection('directory_listings')
      .where('status', '==', 'active')
      .get();

    directoryListingsSnapshot.forEach((doc) => {
      const listing = { id: doc.id, ...doc.data() } as DirectoryListing;

      if (!isDirectoryListingActive(listing)) return;
      if (categoryParam && listing.category !== categoryParam) return;
      if (featuredParam && !listing.isFeatured) return;

      if (listing.category) {
        categoryStats[listing.category] = (categoryStats[listing.category] || 0) + 1;
      }

      listings.push({
        id: `free_${listing.id}`,
        businessName: listing.businessName,
        description: listing.description,
        tagline: listing.tagline,
        category: listing.category,
        categoryLabel: listing.category,
        logoUrl: listing.logoUrl,
        bannerImageUrl: listing.bannerImageUrl,
        imageUrl: listing.bannerImageUrl || listing.logoUrl,
        phone: listing.phone,
        email: listing.email || listing.contactEmail,
        websiteUrl: listing.websiteUrl,
        targetUrl: listing.websiteUrl || '',
        city: listing.city,
        state: listing.state,
        zipCode: listing.zipCode,
        facebookUrl: listing.facebookUrl,
        instagramUrl: listing.instagramUrl,
        linkedinUrl: listing.linkedinUrl,
        twitterUrl: listing.twitterUrl,
        youtubeUrl: listing.youtubeUrl,
        tiktokUrl: listing.tiktokUrl,
        isFeatured: listing.isFeatured,
        showContactInfo: listing.showContactInfo ?? true,
        showSocialLinks: listing.showSocialLinks ?? true,
      });
    });

    // Sort: featured first, then alphabetically by business name
    listings.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return a.businessName.localeCompare(b.businessName);
    });

    const limitedListings = listings.slice(0, limitParam);

    return NextResponse.json({
      success: true,
      listings: limitedListings,
      total: listings.length,
      categoryCounts: categoryStats,
    }, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Error fetching directory listings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch listings',
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
