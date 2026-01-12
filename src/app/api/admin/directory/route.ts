import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { type LiveAd, type LiveAdDirectoryListing, type DirectoryStatus, type DirectoryListing } from '@/lib/types';

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/admin/directory/route.ts:20',message:'API GET entry',data:{hasAuthHeader:!!authHeader,authHeaderPrefix:authHeader?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/admin/directory/route.ts:22',message:'missing auth header',data:{hasAuthHeader:!!authHeader},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/admin/directory/route.ts:34',message:'token verified',data:{uid:decodedToken.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } catch (tokenError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/admin/directory/route.ts:36',message:'token verification failed',data:{errorMessage:tokenError instanceof Error?tokenError.message:String(tokenError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/admin/directory/route.ts:44',message:'admin check',data:{uid:decodedToken.uid,isAdmin:adminDoc.exists},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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
      source: 'live_ads' | 'directory_listings';
      freeListingId?: string;
    }> = [];

    snapshot.forEach((doc) => {
      try {
        const data = doc.data() as LiveAd;
        const listing = data.directoryListing;

        // Filter by directory status if specified
        // If status is specified and there's no listing, skip it
        // If status is specified and listing status doesn't match, skip it
        if (status) {
          const listingStatus = listing?.directoryStatus || 'pending';
          if (listingStatus !== status) {
            return;
          }
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
          source: 'live_ads',
        });
      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
        // Continue processing other documents
      }
    });

    // Also fetch from directory_listings collection (free signups)
    const freeListingsSnapshot = await db.collection('directory_listings').limit(500).get();
    
    freeListingsSnapshot.forEach((doc) => {
      try {
        const data = doc.data() as DirectoryListing;
        
        // Map directory_listings status to directoryStatus format
        // directory_listings uses: 'pending', 'active', 'inactive', 'suspended'
        // We map: pending -> pending, active -> approved, inactive/suspended -> hidden
        let mappedStatus: DirectoryStatus = 'pending';
        if (data.status === 'active') {
          mappedStatus = 'approved';
        } else if (data.status === 'inactive' || data.status === 'suspended') {
          mappedStatus = 'hidden';
        } else if (data.status === 'pending') {
          mappedStatus = 'pending';
        }

        // Filter by directory status if specified
        if (status && mappedStatus !== status) {
          return;
        }

        // Filter by featured status if specified
        if (featured === 'true' && !data.isFeatured) {
          return;
        }

        // Filter by search term
        if (search) {
          const searchLower = search.toLowerCase();
          const businessName = (data.businessName || '').toLowerCase();
          if (!businessName.includes(searchLower)) {
            return;
          }
        }

        // Convert to the same format as live_ads listings
        const convertedListing: LiveAdDirectoryListing = {
          businessName: data.businessName,
          tagline: data.tagline,
          description: data.description,
          category: data.category,
          phone: data.phone,
          email: data.email || data.contactEmail,
          websiteUrl: data.websiteUrl,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          logoUrl: data.logoUrl,
          bannerImageUrl: data.bannerImageUrl,
          facebookUrl: data.facebookUrl,
          instagramUrl: data.instagramUrl,
          linkedinUrl: data.linkedinUrl,
          twitterUrl: data.twitterUrl,
          youtubeUrl: data.youtubeUrl,
          tiktokUrl: data.tiktokUrl,
          showContactInfo: data.showContactInfo ?? true,
          showSocialLinks: data.showSocialLinks ?? true,
          showAddress: data.showAddress ?? false,
          isFeatured: data.isFeatured || false,
          directoryStatus: mappedStatus,
          directoryListingCreatedAt: data.createdAt,
          directoryListingUpdatedAt: data.updatedAt,
        };

        listings.push({
          liveAdId: `free_${doc.id}`, // Prefix to identify free listings
          liveAd: {
            id: `free_${doc.id}`,
            name: data.businessName,
            imageUrl: data.logoUrl || data.bannerImageUrl,
            targetUrl: data.websiteUrl || '',
            status: data.status === 'active' ? 'active' : 'paused',
            showInDirectory: true,
            customerName: data.contactName || data.businessName,
            createdAt: data.createdAt,
          },
          directoryListing: convertedListing,
          source: 'directory_listings',
          freeListingId: doc.id,
        });
      } catch (docError) {
        console.error(`Error processing free listing ${doc.id}:`, docError);
      }
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

    // Calculate summary stats (including both live_ads and directory_listings)
    const allLiveAdsSnapshot = await db.collection('live_ads').get();
    const allFreeListingsSnapshot = await db.collection('directory_listings').get();
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      hidden: 0,
      rejected: 0,
      featured: 0,
      withListing: 0,
      withoutListing: 0,
      freeListings: 0,
    };

    // Count live_ads listings
    allLiveAdsSnapshot.forEach((doc) => {
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

    // Count free directory_listings
    allFreeListingsSnapshot.forEach((doc) => {
      const data = doc.data() as DirectoryListing;
      stats.total++;
      stats.freeListings++;

      // Map status
      if (data.status === 'pending') {
        stats.pending++;
      } else if (data.status === 'active') {
        stats.approved++;
      } else if (data.status === 'inactive' || data.status === 'suspended') {
        stats.hidden++;
      }

      if (data.isFeatured) {
        stats.featured++;
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/admin/directory/route.ts:189',message:'API catch block',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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

    // Check if this is a free listing (prefixed with 'free_')
    const isFreeListng = liveAdId.startsWith('free_');
    const actualId = isFreeListng ? liveAdId.replace('free_', '') : liveAdId;

    if (isFreeListng) {
      // Handle free directory_listings collection
      const freeListingRef = db.collection('directory_listings').doc(actualId);
      const freeListingDoc = await freeListingRef.get();

      if (!freeListingDoc.exists) {
        return NextResponse.json(
          { error: 'Free listing not found' },
          { status: 404 }
        );
      }

      const existingFreeListing = freeListingDoc.data() as DirectoryListing;
      let updateData: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Handle different actions for free listings
      switch (action) {
        case 'approve':
          updateData.status = 'active';
          updateData.approvedAt = FieldValue.serverTimestamp();
          updateData.approvedBy = decodedToken.uid;
          break;

        case 'reject':
          updateData.status = 'suspended';
          updateData.rejectionReason = rejectionReason || 'No reason provided';
          break;

        case 'hide':
          updateData.status = 'inactive';
          break;

        case 'feature':
          updateData.isFeatured = true;
          if (featuredUntil) {
            updateData.featuredUntil = new Date(featuredUntil);
          }
          break;

        case 'unfeature':
          updateData.isFeatured = false;
          updateData.featuredUntil = FieldValue.delete();
          break;

        case 'update':
          // Full update of listing fields
          if (directoryListing) {
            // Map directoryStatus back to status field
            if (directoryListing.directoryStatus) {
              if (directoryListing.directoryStatus === 'approved') {
                updateData.status = 'active';
              } else if (directoryListing.directoryStatus === 'pending') {
                updateData.status = 'pending';
              } else if (directoryListing.directoryStatus === 'hidden') {
                updateData.status = 'inactive';
              } else if (directoryListing.directoryStatus === 'rejected') {
                updateData.status = 'suspended';
              }
            }
            // Copy other fields
            if (directoryListing.businessName) updateData.businessName = directoryListing.businessName;
            if (directoryListing.tagline !== undefined) updateData.tagline = directoryListing.tagline;
            if (directoryListing.description !== undefined) updateData.description = directoryListing.description;
            if (directoryListing.category) updateData.category = directoryListing.category;
            if (directoryListing.phone !== undefined) updateData.phone = directoryListing.phone;
            if (directoryListing.email !== undefined) updateData.email = directoryListing.email;
            if (directoryListing.websiteUrl !== undefined) updateData.websiteUrl = directoryListing.websiteUrl;
            if (directoryListing.address !== undefined) updateData.address = directoryListing.address;
            if (directoryListing.city !== undefined) updateData.city = directoryListing.city;
            if (directoryListing.state !== undefined) updateData.state = directoryListing.state;
            if (directoryListing.zipCode !== undefined) updateData.zipCode = directoryListing.zipCode;
            if (directoryListing.logoUrl !== undefined) updateData.logoUrl = directoryListing.logoUrl;
            if (directoryListing.bannerImageUrl !== undefined) updateData.bannerImageUrl = directoryListing.bannerImageUrl;
            if (directoryListing.facebookUrl !== undefined) updateData.facebookUrl = directoryListing.facebookUrl;
            if (directoryListing.instagramUrl !== undefined) updateData.instagramUrl = directoryListing.instagramUrl;
            if (directoryListing.linkedinUrl !== undefined) updateData.linkedinUrl = directoryListing.linkedinUrl;
            if (directoryListing.twitterUrl !== undefined) updateData.twitterUrl = directoryListing.twitterUrl;
            if (directoryListing.youtubeUrl !== undefined) updateData.youtubeUrl = directoryListing.youtubeUrl;
            if (directoryListing.tiktokUrl !== undefined) updateData.tiktokUrl = directoryListing.tiktokUrl;
            if (directoryListing.showContactInfo !== undefined) updateData.showContactInfo = directoryListing.showContactInfo;
            if (directoryListing.showSocialLinks !== undefined) updateData.showSocialLinks = directoryListing.showSocialLinks;
            if (directoryListing.showAddress !== undefined) updateData.showAddress = directoryListing.showAddress;
            if (directoryListing.isFeatured !== undefined) updateData.isFeatured = directoryListing.isFeatured;
            if (directoryListing.moderationNotes !== undefined) updateData.moderationNotes = directoryListing.moderationNotes;
          }
          break;

        default:
          if (directoryListing) {
            // Same as update action
            if (directoryListing.directoryStatus) {
              if (directoryListing.directoryStatus === 'approved') updateData.status = 'active';
              else if (directoryListing.directoryStatus === 'pending') updateData.status = 'pending';
              else if (directoryListing.directoryStatus === 'hidden') updateData.status = 'inactive';
              else if (directoryListing.directoryStatus === 'rejected') updateData.status = 'suspended';
            }
          }
      }

      await freeListingRef.update(updateData);

      // Fetch updated document
      const updatedDoc = await freeListingRef.get();
      const updatedFreeListing = updatedDoc.data() as DirectoryListing;

      // Map back to directoryListing format for response
      let mappedStatus: DirectoryStatus = 'pending';
      if (updatedFreeListing.status === 'active') mappedStatus = 'approved';
      else if (updatedFreeListing.status === 'inactive' || updatedFreeListing.status === 'suspended') mappedStatus = 'hidden';

      return NextResponse.json({
        success: true,
        data: {
          liveAdId,
          action,
          directoryListing: {
            ...updatedFreeListing,
            directoryStatus: mappedStatus,
          },
          showInDirectory: updatedFreeListing.status === 'active',
          message: getActionMessage(action),
          source: 'directory_listings',
        },
      });
    }

    // Handle regular live_ads listings
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
        source: 'live_ads',
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
