import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  type DirectoryListing,
  isDirectoryListingActive,
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
    const query = db.collection('directory_listings')
      .where('status', '==', 'active');

    const snapshot = await query.get();

    const listings: any[] = [];
    const categoryStats: Record<string, number> = {};

    snapshot.forEach((doc) => {
      const listing = { id: doc.id, ...doc.data() } as DirectoryListing;

      if (!isDirectoryListingActive(listing)) return;
      if (categoryParam && listing.category !== categoryParam) return;
      if (featuredParam && !listing.isFeatured) return;

      if (listing.category) {
        categoryStats[listing.category] = (categoryStats[listing.category] || 0) + 1;
      }

      // Return only public data
      listings.push({
        id: listing.id,
        businessName: listing.businessName,
        description: listing.description,
        category: listing.category,
        logoUrl: listing.logoUrl,
        bannerImageUrl: listing.bannerImageUrl,
        phone: listing.phone,
        websiteUrl: listing.websiteUrl,
        city: listing.city,
        state: listing.state,
        zipCode: listing.zipCode,
        socialLinks: listing.socialLinks,
        isFeatured: listing.isFeatured,
        tier: listing.tier,
      });
    });

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
