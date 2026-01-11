import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { type LiveAd, type LiveAdDirectoryListing, type DirectoryStatus } from '@/lib/types';

/**
 * GET /api/admin/directory
 *
 * Fetches all directory listings for admin management.
 * Supports filtering by status, search, and pagination.
 *
 * Query params:
 * - status: Filter by directory status (pending, approved, hidden, rejected)
 * - search: Search by business name
 * - limit: Number of results (default 50)
 * - featured: Filter featured listings only (true/false)
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

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const status = request.nextUrl.searchParams.get('status') as DirectoryStatus | null;
    const search = request.nextUrl.searchParams.get('search');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const featured = request.nextUrl.searchParams.get('featured');
    const showInDirectory = request.nextUrl.searchParams.get('showInDirectory');

    // Query live_ads collection
    let query: FirebaseFirestore.Query = db.collection('live_ads');

    // Filter by showInDirectory
    if (showInDirectory === 'true') {
      query = query.where('showInDirectory', '==', true);
    } else if (showInDirectory === 'false') {
      query = query.where('showInDirectory', '==', false);
    }

    // Get all results first (we'll filter in memory for complex conditions)
    const snapshot = await query.limit(500).get();

    let listings: Array<{
      liveAdId: string;
      liveAd: Partial<LiveAd>;
      directoryListing: LiveAdDirectoryListing | null;
    }> = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as LiveAd;
      const listing = data.directoryListing;

      // Filter by directory status if specified
      if (status && listing?.directoryStatus !== status) {
        return;
      }

      // Filter by featured status if specified
      if (featured === 'true' && !listing?.isFeatured) {
        return;
      }

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        const businessName = (listing?.businessName || data.customerName || data.name || '').toLowerCase();
        if (!businessName.includes(searchLower)) {
          return;
        }
      }

      listings.push({
        liveAdId: doc.id,
        liveAd: {
          id: doc.id,
          name: data.name,
          imageUrl: data.imageUrl,
          targetUrl: data.targetUrl,
          status: data.status,
          showInDirectory: data.showInDirectory ?? true,
          customerId: data.customerId,
          customerName: data.customerName,
          impressions: data.impressions || 0,
          clicks: data.clicks || 0,
          targetWebsites: data.targetWebsites,
          createdAt: data.createdAt,
        },
        directoryListing: listing || null,
      });
    });

    // Sort by status priority: pending first, then by name
    listings.sort((a, b) => {
      const statusOrder = { pending: 0, approved: 1, hidden: 2, rejected: 3 };
      const aStatus = a.directoryListing?.directoryStatus || 'pending';
      const bStatus = b.directoryListing?.directoryStatus || 'pending';
      const aOrder = statusOrder[aStatus as keyof typeof statusOrder] ?? 4;
      const bOrder = statusOrder[bStatus as keyof typeof statusOrder] ?? 4;

      if (aOrder !== bOrder) return aOrder - bOrder;

      // Then by business name
      const aName = a.directoryListing?.businessName || a.liveAd.customerName || '';
      const bName = b.directoryListing?.businessName || b.liveAd.customerName || '';
      return aName.localeCompare(bName);
    });

    // Apply limit
    listings = listings.slice(0, limit);

    // Calculate summary stats
    const allSnapshot = await db.collection('live_ads').get();
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      hidden: 0,
      rejected: 0,
      featured: 0,
      withListing: 0,
      withoutListing: 0,
    };

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      stats.total++;

      if (data.directoryListing) {
        stats.withListing++;
        const listingStatus = data.directoryListing.directoryStatus || 'pending';
        if (listingStatus in stats) {
          (stats as any)[listingStatus]++;
        }
        if (data.directoryListing.isFeatured) {
          stats.featured++;
        }
      } else {
        stats.withoutListing++;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        listings,
        stats,
      },
    });

  } catch (error: any) {
    console.error('Error fetching directory listings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/directory
 *
 * Updates a directory listing (admin moderation).
 * Allows admins to approve, reject, hide, or edit listings.
 *
 * Body:
 * - liveAdId: ID of the live ad
 * - action: 'approve' | 'reject' | 'hide' | 'update' | 'feature' | 'unfeature'
 * - directoryListing: (optional) Updated directory listing data
 * - rejectionReason: (optional) Reason for rejection
 * - moderationNotes: (optional) Admin notes
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

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      liveAdId,
      action,
      directoryListing,
      rejectionReason,
      moderationNotes,
      showInDirectory,
      featuredUntil,
    } = body;

    if (!liveAdId) {
      return NextResponse.json(
        { error: 'Missing required field: liveAdId' },
        { status: 400 }
      );
    }

    // Get admin info
    const adminUserDoc = await db.collection('users').doc(decodedToken.uid).get();
    const adminData = adminUserDoc.data();
    const adminName = adminData?.contactName || adminData?.email || 'Admin';

    // Fetch the live ad
    const liveAdRef = db.collection('live_ads').doc(liveAdId);
    const liveAdDoc = await liveAdRef.get();

    if (!liveAdDoc.exists) {
      return NextResponse.json(
        { error: 'Live ad not found' },
        { status: 404 }
      );
    }

    const existingAd = liveAdDoc.data() as LiveAd;
    const existingListing = existingAd.directoryListing || {};

    let updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Handle different actions
    switch (action) {
      case 'approve':
        updateData['directoryListing.directoryStatus'] = 'approved';
        updateData['directoryListing.directoryApprovedAt'] = FieldValue.serverTimestamp();
        updateData['directoryListing.directoryApprovedBy'] = decodedToken.uid;
        updateData['directoryListing.directoryRejectionReason'] = FieldValue.delete();
        if (moderationNotes) {
          updateData['directoryListing.moderationNotes'] = moderationNotes;
        }
        break;

      case 'reject':
        updateData['directoryListing.directoryStatus'] = 'rejected';
        updateData['directoryListing.directoryRejectionReason'] = rejectionReason || 'No reason provided';
        if (moderationNotes) {
          updateData['directoryListing.moderationNotes'] = moderationNotes;
        }
        break;

      case 'hide':
        updateData['directoryListing.directoryStatus'] = 'hidden';
        if (moderationNotes) {
          updateData['directoryListing.moderationNotes'] = moderationNotes;
        }
        break;

      case 'feature':
        updateData['directoryListing.isFeatured'] = true;
        if (featuredUntil) {
          updateData['directoryListing.featuredUntil'] = new Date(featuredUntil);
        }
        break;

      case 'unfeature':
        updateData['directoryListing.isFeatured'] = false;
        updateData['directoryListing.featuredUntil'] = FieldValue.delete();
        break;

      case 'update':
        // Full update of directory listing
        if (directoryListing) {
          updateData.directoryListing = {
            ...existingListing,
            ...directoryListing,
            directoryListingUpdatedAt: FieldValue.serverTimestamp(),
          };
        }
        break;

      default:
        // No specific action - just update fields provided
        if (directoryListing) {
          updateData.directoryListing = {
            ...existingListing,
            ...directoryListing,
            directoryListingUpdatedAt: FieldValue.serverTimestamp(),
          };
        }
    }

    // Handle showInDirectory toggle
    if (showInDirectory !== undefined) {
      updateData.showInDirectory = showInDirectory;
    }

    await liveAdRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await liveAdRef.get();
    const updatedAd = updatedDoc.data() as LiveAd;

    return NextResponse.json({
      success: true,
      data: {
        liveAdId,
        action,
        directoryListing: updatedAd.directoryListing,
        showInDirectory: updatedAd.showInDirectory,
        message: getActionMessage(action),
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
 * POST /api/admin/directory
 *
 * Create a directory listing for an ad that doesn't have one yet.
 * Admin can initialize a listing on behalf of a customer.
 */
export async function POST(request: NextRequest) {
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

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { liveAdId, directoryListing } = body;

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

    const existingAd = liveAdDoc.data() as LiveAd;

    // Create the directory listing
    const newListing: LiveAdDirectoryListing = {
      businessName: directoryListing?.businessName || existingAd.customerName || existingAd.name || 'Business',
      tagline: directoryListing?.tagline || '',
      description: directoryListing?.description || '',
      phone: directoryListing?.phone || '',
      email: directoryListing?.email || '',
      websiteUrl: directoryListing?.websiteUrl || existingAd.targetUrl || '',
      showContactInfo: directoryListing?.showContactInfo ?? true,
      showSocialLinks: directoryListing?.showSocialLinks ?? true,
      showAddress: directoryListing?.showAddress ?? false,
      directoryStatus: directoryListing?.directoryStatus || 'approved', // Admin-created listings can be auto-approved
      directoryListingCreatedAt: FieldValue.serverTimestamp() as any,
      directoryListingUpdatedAt: FieldValue.serverTimestamp() as any,
      directoryApprovedAt: FieldValue.serverTimestamp() as any,
      directoryApprovedBy: decodedToken.uid,
      ...directoryListing,
    };

    await liveAdRef.update({
      showInDirectory: true,
      directoryListing: newListing,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        liveAdId,
        directoryListing: newListing,
        message: 'Directory listing created successfully',
      },
    });

  } catch (error: any) {
    console.error('Error creating directory listing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function getActionMessage(action: string): string {
  switch (action) {
    case 'approve':
      return 'Directory listing approved and now visible.';
    case 'reject':
      return 'Directory listing rejected.';
    case 'hide':
      return 'Directory listing hidden from public view.';
    case 'feature':
      return 'Directory listing marked as featured.';
    case 'unfeature':
      return 'Directory listing removed from featured.';
    case 'update':
      return 'Directory listing updated.';
    default:
      return 'Directory listing updated.';
  }
}
