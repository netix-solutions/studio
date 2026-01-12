import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  type LiveAd,
  type DirectoryListing,
  type CommunityWebsiteId,
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
  isDirectoryListingVisible,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

// CORS headers for cross-origin requests (web components, external apps)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Public Directory API
 * Returns all approved, visible directory listings for public display
 */
export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore();

    // Get query parameters
    const websiteParam = request.nextUrl.searchParams.get('website') || '';
    const categoryParam = request.nextUrl.searchParams.get('category') || '';
    const searchParam = request.nextUrl.searchParams.get('search') || '';
    const featuredOnlyParam = request.nextUrl.searchParams.get('featured') === 'true';
    const sortParam = request.nextUrl.searchParams.get('sort') || 'featured';
    const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '100');

    // Query active listings
    // Note: We don't filter by showInDirectory in Firestore query because documents
    // without this field won't match. Instead, we filter in JavaScript to include
    // ads where showInDirectory is not explicitly false.
    const query = db.collection('live_ads')
      .where('status', '==', 'active');

    const snapshot = await query.get();

    // Process and filter listings
    const listings: Array<{
      id: string;
      businessName: string;
      tagline?: string;
      description?: string;
      category?: string;
      categoryLabel?: string;
      categoryIcon?: string;
      phone?: string;
      email?: string;
      websiteUrl?: string;
      address?: string;
      city?: string;
      state?: string;
      imageUrl?: string;
      logoUrl?: string;
      bannerImageUrl?: string;
      facebookUrl?: string;
      instagramUrl?: string;
      linkedinUrl?: string;
      twitterUrl?: string;
      youtubeUrl?: string;
      tiktokUrl?: string;
      appointmentUrl?: string;
      yearEstablished?: number;
      showContactInfo: boolean;
      showSocialLinks: boolean;
      showAddress: boolean;
      isFeatured: boolean;
      targetUrl: string;
    }> = [];

    const categoryCounts: Record<string, number> = {};

    snapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      // Check if directory listing is visible (approved, active, showInDirectory not false)
      if (!isDirectoryListingVisible(ad)) {
        return;
      }

      // Check website targeting
      if (websiteParam && ad.targetWebsites && ad.targetWebsites.length > 0) {
        if (!ad.targetWebsites.includes(websiteParam as CommunityWebsiteId)) {
          return;
        }
      }

      const listing = ad.directoryListing!;

      // Category filter
      if (categoryParam && listing.category !== categoryParam) {
        return;
      }

      // Featured only filter
      if (featuredOnlyParam && !listing.isFeatured) {
        return;
      }

      // Search filter
      if (searchParam) {
        const searchLower = searchParam.toLowerCase();
        const searchableText = [
          listing.businessName,
          listing.tagline,
          listing.description,
          listing.category,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) {
          return;
        }
      }

      // Track category counts
      if (listing.category) {
        categoryCounts[listing.category] = (categoryCounts[listing.category] || 0) + 1;
      }

      const categoryLabel = listing.category
        ? BUSINESS_CATEGORY_LABELS[listing.category as BusinessCategory]
        : undefined;
      const categoryIcon = listing.category
        ? BUSINESS_CATEGORY_ICONS[listing.category as BusinessCategory]
        : undefined;

      listings.push({
        id: ad.id,
        businessName: listing.businessName || ad.customerName || 'Business',
        tagline: listing.tagline,
        description: listing.description,
        category: listing.category,
        categoryLabel,
        categoryIcon,
        phone: listing.phone,
        email: listing.email,
        websiteUrl: listing.websiteUrl || ad.targetUrl,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        imageUrl: ad.imageUrl,
        logoUrl: listing.logoUrl,
        bannerImageUrl: listing.bannerImageUrl,
        facebookUrl: listing.facebookUrl,
        instagramUrl: listing.instagramUrl,
        linkedinUrl: listing.linkedinUrl,
        twitterUrl: listing.twitterUrl,
        youtubeUrl: listing.youtubeUrl,
        tiktokUrl: listing.tiktokUrl,
        appointmentUrl: listing.appointmentUrl,
        yearEstablished: listing.yearEstablished,
        showContactInfo: listing.showContactInfo ?? true,
        showSocialLinks: listing.showSocialLinks ?? true,
        showAddress: listing.showAddress ?? false,
        isFeatured: !!listing.isFeatured,
        targetUrl: ad.targetUrl,
      });
    });

    // Also fetch approved free listings from directory_listings collection
    const freeListingsSnapshot = await db.collection('directory_listings')
      .where('status', '==', 'active')
      .get();

    freeListingsSnapshot.forEach((doc) => {
      const freeListing = { id: doc.id, ...doc.data() } as DirectoryListing;

      // Category filter
      if (categoryParam && freeListing.category !== categoryParam) {
        return;
      }

      // Featured only filter
      if (featuredOnlyParam && !freeListing.isFeatured) {
        return;
      }

      // Search filter
      if (searchParam) {
        const searchLower = searchParam.toLowerCase();
        const searchableText = [
          freeListing.businessName,
          freeListing.tagline,
          freeListing.description,
          freeListing.category,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) {
          return;
        }
      }

      // Track category counts
      if (freeListing.category) {
        categoryCounts[freeListing.category] = (categoryCounts[freeListing.category] || 0) + 1;
      }

      const categoryLabel = freeListing.category
        ? BUSINESS_CATEGORY_LABELS[freeListing.category as BusinessCategory]
        : undefined;
      const categoryIcon = freeListing.category
        ? BUSINESS_CATEGORY_ICONS[freeListing.category as BusinessCategory]
        : undefined;

      listings.push({
        id: `free_${freeListing.id}`,
        businessName: freeListing.businessName || 'Business',
        tagline: freeListing.tagline,
        description: freeListing.description,
        category: freeListing.category,
        categoryLabel,
        categoryIcon,
        phone: freeListing.phone,
        email: freeListing.email || freeListing.contactEmail,
        websiteUrl: freeListing.websiteUrl,
        address: freeListing.address,
        city: freeListing.city,
        state: freeListing.state,
        imageUrl: freeListing.bannerImageUrl || freeListing.logoUrl,
        logoUrl: freeListing.logoUrl,
        bannerImageUrl: freeListing.bannerImageUrl,
        facebookUrl: freeListing.facebookUrl,
        instagramUrl: freeListing.instagramUrl,
        linkedinUrl: freeListing.linkedinUrl,
        twitterUrl: freeListing.twitterUrl,
        youtubeUrl: freeListing.youtubeUrl,
        tiktokUrl: freeListing.tiktokUrl,
        appointmentUrl: freeListing.appointmentUrl,
        yearEstablished: freeListing.yearEstablished,
        showContactInfo: freeListing.showContactInfo ?? true,
        showSocialLinks: freeListing.showSocialLinks ?? true,
        showAddress: freeListing.showAddress ?? false,
        isFeatured: !!freeListing.isFeatured,
        targetUrl: freeListing.websiteUrl || '',
      });
    });

    // Sort listings
    listings.sort((a, b) => {
      if (sortParam === 'featured') {
        // Featured first, then alphabetically
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return a.businessName.localeCompare(b.businessName);
      } else if (sortParam === 'alphabetical') {
        return a.businessName.localeCompare(b.businessName);
      } else if (sortParam === 'newest') {
        // For now, just use alphabetical for newest
        return a.businessName.localeCompare(b.businessName);
      }
      return 0;
    });

    // Apply limit
    const limitedListings = listings.slice(0, limitParam);

    return new NextResponse(JSON.stringify({
      success: true,
      listings: limitedListings,
      total: listings.length,
      categoryCounts,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });

  } catch (error) {
    console.error('Error fetching public directory:', error);
    return new NextResponse(JSON.stringify({ success: false, error: 'Failed to fetch directory listings' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}
