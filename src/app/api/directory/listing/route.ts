import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  type DirectoryListing,
  type LiveAd,
  type Advertisement,
  createDefaultDirectoryListing,
  BUSINESS_CATEGORIES,
} from '@/lib/types';

/**
 * GET /api/directory/listing
 *
 * Fetches the customer's directory listing data.
 * Returns the directory listing from their live ad, or a default if none exists.
 *
 * Query params:
 * - liveAdId: (optional) Specific live ad ID to fetch
 *
 * Returns the directory listing data and associated live ad info.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const liveAdIdParam = request.nextUrl.searchParams.get('liveAdId');

    // Get user info for default values
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // If a specific liveAdId is provided, fetch that one
    if (liveAdIdParam) {
      const liveAdDoc = await db.collection('live_ads').doc(liveAdIdParam).get();

      if (!liveAdDoc.exists) {
        return NextResponse.json(
          { error: 'Live ad not found' },
          { status: 404 }
        );
      }

      const liveAd = { id: liveAdDoc.id, ...liveAdDoc.data() } as LiveAd;

      // Verify this live ad belongs to the user
      if (liveAd.customerId !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized - this ad does not belong to you' },
          { status: 403 }
        );
      }

      // Return the directory listing or create default
      const directoryListing = liveAd.directoryListing || createDefaultDirectoryListing(
        userData as Partial<Advertisement>,
        liveAd.customerName
      );

      return NextResponse.json({
        success: true,
        data: {
          liveAdId: liveAd.id,
          liveAd: {
            id: liveAd.id,
            name: liveAd.name,
            imageUrl: liveAd.imageUrl,
            targetUrl: liveAd.targetUrl,
            status: liveAd.status,
            showInDirectory: liveAd.showInDirectory ?? true,
            impressions: liveAd.impressions || 0,
            clicks: liveAd.clicks || 0,
          },
          directoryListing,
          hasExistingListing: !!liveAd.directoryListing,
        },
      });
    }

    // Find all live ads for this user
    const liveAdsSnapshot = await db.collection('live_ads')
      .where('customerId', '==', userId)
      .get();

    if (liveAdsSnapshot.empty) {
      // No live ads yet - check if they have any advertisements in progress
      const adsSnapshot = await db
        .collectionGroup('advertisements')
        .where('userId', '==', userId)
        .get();

      const advertisements = adsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Advertisement[];

      // Find the most relevant ad (prefer live, then approved, then in progress)
      const activeAd = advertisements.find(ad =>
        ['live', 'approved', 'customer_approval', 'in_review'].includes(ad.status)
      );

      return NextResponse.json({
        success: true,
        data: {
          liveAdId: null,
          liveAd: null,
          directoryListing: activeAd
            ? createDefaultDirectoryListing(activeAd, userData?.contactName)
            : createDefaultDirectoryListing(userData as Partial<Advertisement>, userData?.contactName),
          hasExistingListing: false,
          advertisementStatus: activeAd?.status || null,
          message: activeAd
            ? 'Your directory listing will be available once your ad goes live.'
            : 'No active advertisements found.',
        },
      });
    }

    // Get all live ads with their directory listings
    const liveAds = liveAdsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as LiveAd[];

    // Prefer active ads, then get the most recent
    const activeLiveAd = liveAds.find(ad => ad.status === 'active') || liveAds[0];

    const directoryListing = activeLiveAd.directoryListing || createDefaultDirectoryListing(
      userData as Partial<Advertisement>,
      activeLiveAd.customerName
    );

    return NextResponse.json({
      success: true,
      data: {
        liveAdId: activeLiveAd.id,
        liveAd: {
          id: activeLiveAd.id,
          name: activeLiveAd.name,
          imageUrl: activeLiveAd.imageUrl,
          targetUrl: activeLiveAd.targetUrl,
          status: activeLiveAd.status,
          showInDirectory: activeLiveAd.showInDirectory ?? true,
          impressions: activeLiveAd.impressions || 0,
          clicks: activeLiveAd.clicks || 0,
        },
        directoryListing,
        hasExistingListing: !!activeLiveAd.directoryListing,
        allLiveAds: liveAds.map(ad => ({
          id: ad.id,
          name: ad.name,
          status: ad.status,
          showInDirectory: ad.showInDirectory ?? true,
          hasDirectoryListing: !!ad.directoryListing,
        })),
      },
    });

  } catch (error: any) {
    console.error('Error fetching directory listing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/directory/listing
 *
 * Updates the customer's directory listing on their live ad.
 * Requires the liveAdId and the updated directory listing data.
 *
 * After update, sets directoryStatus to 'pending' for admin review
 * (unless the listing was already approved and only minor changes were made).
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const body = await request.json();
    const { liveAdId, directoryListing, showInDirectory } = body;

    if (!liveAdId) {
      return NextResponse.json(
        { error: 'Missing required field: liveAdId' },
        { status: 400 }
      );
    }

    // Fetch the live ad
    const liveAdRef = db.collection('live_ads').doc(liveAdId);
    const liveAdDoc = await liveAdRef.get();

    if (!liveAdDoc.exists) {
      return NextResponse.json(
        { error: 'Live ad not found' },
        { status: 404 }
      );
    }

    const liveAd = { id: liveAdDoc.id, ...liveAdDoc.data() } as LiveAd;

    // Verify ownership
    if (liveAd.customerId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - this ad does not belong to you' },
        { status: 403 }
      );
    }

    // Validate and sanitize directory listing data
    const sanitizedListing = sanitizeDirectoryListing(directoryListing);

    // Determine if this is a new listing or an update
    const existingListing = liveAd.directoryListing;
    const isNewListing = !existingListing;

    // Set the status - new listings start as pending, updates may stay approved for minor changes
    let newStatus = sanitizedListing.directoryStatus || 'pending';
    if (isNewListing) {
      newStatus = 'pending';
    } else if (existingListing?.directoryStatus === 'approved') {
      // Check if significant changes were made that require re-review
      const significantChanges = hasSignificantChanges(existingListing, sanitizedListing);
      if (significantChanges) {
        newStatus = 'pending';
      } else {
        newStatus = 'approved';
      }
    }

    // Update the live ad document
    const updateData: Record<string, any> = {
      showInDirectory: showInDirectory ?? true,
      directoryListing: {
        ...sanitizedListing,
        directoryStatus: newStatus,
        directoryListingUpdatedAt: FieldValue.serverTimestamp(),
        lastSubmittedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Set created timestamp if new listing
    if (isNewListing) {
      updateData.directoryListing.directoryListingCreatedAt = FieldValue.serverTimestamp();
    } else {
      // Preserve the created timestamp
      updateData.directoryListing.directoryListingCreatedAt = existingListing?.directoryListingCreatedAt || FieldValue.serverTimestamp();
    }

    await liveAdRef.update(updateData);

    return NextResponse.json({
      success: true,
      data: {
        liveAdId,
        directoryStatus: newStatus,
        showInDirectory: showInDirectory ?? true,
        requiresReview: newStatus === 'pending',
        message: newStatus === 'pending'
          ? 'Your directory listing has been submitted for review.'
          : 'Your directory listing has been updated.',
      },
    });

  } catch (error: any) {
    console.error('Error updating directory listing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Sanitize and validate directory listing data
 */
function sanitizeDirectoryListing(data: Partial<DirectoryListing>): Partial<DirectoryListing> {
  const sanitized: Partial<DirectoryListing> = {};

  // Business identity
  if (data.businessName) {
    sanitized.businessName = String(data.businessName).trim().slice(0, 100);
  }
  if (data.tagline !== undefined) {
    sanitized.tagline = String(data.tagline || '').trim().slice(0, 100);
  }
  if (data.description !== undefined) {
    sanitized.description = String(data.description || '').trim().slice(0, 500);
  }

  // Contact info
  if (data.phone !== undefined) {
    sanitized.phone = String(data.phone || '').trim().slice(0, 20);
  }
  if (data.email !== undefined) {
    sanitized.email = String(data.email || '').trim().slice(0, 100);
  }
  if (data.websiteUrl !== undefined) {
    sanitized.websiteUrl = sanitizeUrl(data.websiteUrl);
  }
  if (data.address !== undefined) {
    sanitized.address = String(data.address || '').trim().slice(0, 200);
  }
  if (data.city !== undefined) {
    sanitized.city = String(data.city || '').trim().slice(0, 50);
  }
  if (data.state !== undefined) {
    sanitized.state = String(data.state || '').trim().slice(0, 50);
  }
  if (data.zipCode !== undefined) {
    sanitized.zipCode = String(data.zipCode || '').trim().slice(0, 10);
  }

  // Social media
  if (data.facebookUrl !== undefined) {
    sanitized.facebookUrl = sanitizeUrl(data.facebookUrl);
  }
  if (data.instagramUrl !== undefined) {
    sanitized.instagramUrl = sanitizeUrl(data.instagramUrl);
  }
  if (data.linkedinUrl !== undefined) {
    sanitized.linkedinUrl = sanitizeUrl(data.linkedinUrl);
  }
  if (data.twitterUrl !== undefined) {
    sanitized.twitterUrl = sanitizeUrl(data.twitterUrl);
  }
  if (data.youtubeUrl !== undefined) {
    sanitized.youtubeUrl = sanitizeUrl(data.youtubeUrl);
  }

  // Visual customization
  if (data.logoUrl !== undefined) {
    sanitized.logoUrl = sanitizeUrl(data.logoUrl);
  }
  if (data.cardBackgroundColor !== undefined) {
    sanitized.cardBackgroundColor = sanitizeColor(data.cardBackgroundColor);
  }
  if (data.cardTextColor !== undefined) {
    sanitized.cardTextColor = sanitizeColor(data.cardTextColor);
  }

  // Business categorization
  if (data.category !== undefined) {
    const validCategories = Object.values(BUSINESS_CATEGORIES);
    if (validCategories.includes(data.category as any)) {
      sanitized.category = data.category;
    }
  }
  if (data.subcategory !== undefined) {
    sanitized.subcategory = String(data.subcategory || '').trim().slice(0, 50);
  }
  if (data.tags !== undefined && Array.isArray(data.tags)) {
    sanitized.tags = data.tags
      .filter(t => typeof t === 'string')
      .map(t => String(t).trim().slice(0, 30))
      .slice(0, 10);
  }

  // Display preferences
  if (data.showContactInfo !== undefined) {
    sanitized.showContactInfo = Boolean(data.showContactInfo);
  }
  if (data.showSocialLinks !== undefined) {
    sanitized.showSocialLinks = Boolean(data.showSocialLinks);
  }
  if (data.showAddress !== undefined) {
    sanitized.showAddress = Boolean(data.showAddress);
  }

  return sanitized;
}

/**
 * Sanitize URL input
 */
function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';

  // Basic URL validation
  try {
    // Add protocol if missing
    const urlWithProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    new URL(urlWithProtocol);
    return urlWithProtocol.slice(0, 500);
  } catch {
    return '';
  }
}

/**
 * Sanitize hex color input
 */
function sanitizeColor(color: string | undefined): string {
  if (!color) return '';
  const trimmed = String(color).trim();
  // Match hex color pattern
  if (/^#?[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }
  return '';
}

/**
 * Check if there are significant changes that require re-review
 */
function hasSignificantChanges(
  existing: DirectoryListing,
  updated: Partial<DirectoryListing>
): boolean {
  // Fields that require re-review when changed
  const significantFields = [
    'businessName',
    'tagline',
    'description',
    'websiteUrl',
    'logoUrl',
  ];

  for (const field of significantFields) {
    const existingValue = (existing as any)[field];
    const updatedValue = (updated as any)[field];

    // If the updated value is different and not undefined, it's a significant change
    if (updatedValue !== undefined && updatedValue !== existingValue) {
      return true;
    }
  }

  return false;
}
