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
  getActiveOffers,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

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
    const hasOffersParam = request.nextUrl.searchParams.get('hasOffers') === 'true';
    const featuredOnlyParam = request.nextUrl.searchParams.get('featured') === 'true';
    const sortParam = request.nextUrl.searchParams.get('sort') || 'featured';
    const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '100');

    // Query active listings with directory enabled
    const query = db.collection('live_ads')
      .where('status', '==', 'active')
      .where('showInDirectory', '==', true);

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
      cardBackgroundColor?: string;
      cardTextColor?: string;
      facebookUrl?: string;
      instagramUrl?: string;
      linkedinUrl?: string;
      twitterUrl?: string;
      youtubeUrl?: string;
      tiktokUrl?: string;
      appointmentUrl?: string;
      specialOffers?: any[];
      yearEstablished?: number;
      serviceAreas?: string[];
      languages?: string[];
      showContactInfo: boolean;
      showSocialLinks: boolean;
      showAddress: boolean;
      showSpecialOffers: boolean;
      isFeatured: boolean;
      hasActiveOffers: boolean;
      targetUrl: string;
    }> = [];

    const categoryCounts: Record<string, number> = {};

    snapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      // Check if directory listing is visible (approved)
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
          ...(listing.tags || []),
          ...(listing.serviceAreas || []),
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) {
          return;
        }
      }

      // Check for active offers
      const activeOffers = getActiveOffers(listing as DirectoryListing);
      const hasActiveOffers = activeOffers.length > 0;

      if (hasOffersParam && !hasActiveOffers) {
        return;
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
        cardBackgroundColor: listing.cardBackgroundColor,
        cardTextColor: listing.cardTextColor,
        facebookUrl: listing.facebookUrl,
        instagramUrl: listing.instagramUrl,
        linkedinUrl: listing.linkedinUrl,
        twitterUrl: listing.twitterUrl,
        youtubeUrl: listing.youtubeUrl,
        tiktokUrl: listing.tiktokUrl,
        appointmentUrl: listing.appointmentUrl,
        specialOffers: hasActiveOffers ? activeOffers : undefined,
        yearEstablished: listing.yearEstablished,
        serviceAreas: listing.serviceAreas,
        languages: listing.languages,
        showContactInfo: listing.showContactInfo ?? true,
        showSocialLinks: listing.showSocialLinks ?? true,
        showAddress: listing.showAddress ?? false,
        showSpecialOffers: listing.showSpecialOffers ?? true,
        isFeatured: !!listing.isFeatured,
        hasActiveOffers,
        targetUrl: ad.targetUrl,
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

    return NextResponse.json({
      success: true,
      data: {
        listings: limitedListings,
        total: listings.length,
        categoryCounts,
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });

  } catch (error) {
    console.error('Error fetching public directory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch directory listings' },
      { status: 500 }
    );
  }
}
