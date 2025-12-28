import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

/**
 * POST /api/ad-change-request
 *
 * Creates a new advertisement as a change request from an existing live/paused ad.
 * The new ad goes through the workflow while the old one stays live.
 * When the new ad goes live, the old one is archived.
 *
 * Required: User authentication token in Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
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

    // Verify the token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const {
      userId,
      adId,
      changeRequestType, // 'self_design' | 'team_design'
    } = body;

    // Validate required fields
    if (!userId || !adId || !changeRequestType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, adId, changeRequestType' },
        { status: 400 }
      );
    }

    if (!['self_design', 'team_design'].includes(changeRequestType)) {
      return NextResponse.json(
        { error: 'changeRequestType must be "self_design" or "team_design"' },
        { status: 400 }
      );
    }

    // Verify the user is the owner of the ad or is an admin
    const isAdmin = (await db.collection('roles_admin').doc(decodedToken.uid).get()).exists;
    if (decodedToken.uid !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only request changes on your own ads' },
        { status: 403 }
      );
    }

    // Get the current advertisement
    const currentAdRef = db.collection('users').doc(userId).collection('advertisements').doc(adId);
    const currentAdDoc = await currentAdRef.get();

    if (!currentAdDoc.exists) {
      return NextResponse.json(
        { error: 'Advertisement not found' },
        { status: 404 }
      );
    }

    const currentAd = currentAdDoc.data()!;

    // Check if the ad is in a valid state for change request (live or paused)
    if (!['live', 'paused'].includes(currentAd.status)) {
      return NextResponse.json(
        { error: 'Can only request changes on live or paused ads' },
        { status: 400 }
      );
    }

    // Check if there's already a pending change request for this ad
    const pendingChangeQuery = await db.collection('users').doc(userId)
      .collection('advertisements')
      .where('parentAdId', '==', adId)
      .where('status', 'not-in', ['live', 'completed', 'canceled', 'archived'])
      .get();

    if (!pendingChangeQuery.empty) {
      const pendingAd = pendingChangeQuery.docs[0];
      return NextResponse.json(
        {
          error: 'There is already a pending change request for this ad',
          pendingAdId: pendingAd.id
        },
        { status: 400 }
      );
    }

    // Create the new advertisement as a change request
    const newAdId = `ad_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newAdRef = db.collection('users').doc(userId).collection('advertisements').doc(newAdId);

    // Determine initial status based on change type
    const initialStatus = changeRequestType === 'self_design' ? 'design_pending' : 'in_review';

    const newAdData: Record<string, any> = {
      id: newAdId,
      userId,
      subscriptionId: currentAd.subscriptionId,
      status: initialStatus,

      // Copy over business info from current ad
      businessName: currentAd.businessName || '',
      contactName: currentAd.contactName || '',
      contactTitle: currentAd.contactTitle || '',
      email: currentAd.email || '',
      phone: currentAd.phone || '',
      cellPhone: currentAd.cellPhone || '',
      businessPhone: currentAd.businessPhone || '',
      adWebsiteUrl: currentAd.adWebsiteUrl || '',
      adTitle: currentAd.adTitle || '',
      adText: currentAd.adText || '',
      adNotes: currentAd.adNotes || '',

      // Copy design preferences
      designPreferences: currentAd.designPreferences || null,
      logoUrl: currentAd.logoUrl || null,
      customerUploads: currentAd.customerUploads || null,

      // Mark as change request
      isChangeRequest: true,
      changeRequestType,
      changeRequestedAt: FieldValue.serverTimestamp(),
      parentAdId: adId,

      // If team design, mark that they've requested custom design
      requestCustomDesign: changeRequestType === 'team_design',

      // Since business info is already submitted from parent ad
      infoSubmittedAt: FieldValue.serverTimestamp(),

      // If team design, also mark design as submitted (they're requesting team to do it)
      ...(changeRequestType === 'team_design' ? {
        designSubmittedAt: FieldValue.serverTimestamp(),
        sentForReviewAt: FieldValue.serverTimestamp(),
      } : {}),

      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastActionBy: isAdmin ? 'admin' : 'customer',
      lastActionAt: FieldValue.serverTimestamp(),
    };

    await newAdRef.set(newAdData);

    // Log activity on the parent ad
    await currentAdRef.update({
      updatedAt: FieldValue.serverTimestamp(),
      notes: `Change request created (${changeRequestType}). New ad ID: ${newAdId}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        newAdId,
        parentAdId: adId,
        changeRequestType,
        initialStatus,
        message: changeRequestType === 'self_design'
          ? 'Change request created. You can now design your new ad.'
          : 'Change request created. Our team will start working on your new design.',
      },
    });

  } catch (error: any) {
    console.error('Error creating ad change request:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ad-change-request?userId=xxx&adId=xxx
 *
 * Gets the change request status for a given ad
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const adId = searchParams.get('adId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Verify permission
    const isAdmin = (await db.collection('roles_admin').doc(decodedToken.uid).get()).exists;
    if (decodedToken.uid !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If adId provided, get change requests for that specific ad
    if (adId) {
      const changeRequestsQuery = await db.collection('users').doc(userId)
        .collection('advertisements')
        .where('parentAdId', '==', adId)
        .orderBy('createdAt', 'desc')
        .get();

      const changeRequests = changeRequestsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({
        success: true,
        data: changeRequests,
      });
    }

    // Otherwise, get all change requests for the user
    const allChangeRequestsQuery = await db.collection('users').doc(userId)
      .collection('advertisements')
      .where('isChangeRequest', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const allChangeRequests = allChangeRequestsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: allChangeRequests,
    });

  } catch (error: any) {
    console.error('Error fetching ad change requests:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
