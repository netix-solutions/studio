import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { type LiveAd, isDirectoryListingVisible } from '@/lib/types';

/**
 * GET /api/admin/directory/reconcile
 * 
 * Analyzes directory listings and reports visibility issues.
 * Returns which approved listings are actually visible vs hidden due to data issues.
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

    // Get all live_ads
    const snapshot = await db.collection('live_ads').get();

    const results = {
      totalAds: 0,
      approvedListings: 0,
      visibleListings: 0,
      hiddenDueToIssues: 0,
      issues: [] as Array<{
        liveAdId: string;
        businessName: string;
        adStatus: string;
        showInDirectory: boolean | undefined;
        directoryStatus: string;
        problems: string[];
      }>,
      visible: [] as Array<{
        liveAdId: string;
        businessName: string;
      }>,
    };

    snapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;
      results.totalAds++;

      // Only analyze ads with approved directory listings
      if (ad.directoryListing?.directoryStatus === 'approved') {
        results.approvedListings++;

        const isVisible = isDirectoryListingVisible(ad);

        if (isVisible) {
          results.visibleListings++;
          results.visible.push({
            liveAdId: ad.id,
            businessName: ad.directoryListing?.businessName || ad.customerName || ad.name || 'Unknown',
          });
        } else {
          results.hiddenDueToIssues++;

          // Determine what's causing the visibility issue
          const problems: string[] = [];

          if (ad.status !== 'active') {
            problems.push(`Ad status is '${ad.status}' (must be 'active')`);
          }
          if (ad.showInDirectory === false) {
            problems.push(`showInDirectory is explicitly set to false`);
          }
          if (!ad.directoryListing) {
            problems.push(`No directoryListing object found`);
          }

          results.issues.push({
            liveAdId: ad.id,
            businessName: ad.directoryListing?.businessName || ad.customerName || ad.name || 'Unknown',
            adStatus: ad.status || 'unknown',
            showInDirectory: ad.showInDirectory,
            directoryStatus: ad.directoryListing?.directoryStatus || 'unknown',
            problems,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error: any) {
    console.error('Error analyzing directory:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/directory/reconcile
 * 
 * Fixes visibility issues for approved directory listings.
 * Sets status to 'active' and showInDirectory to true for approved listings.
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
    const { liveAdIds, fixAll } = body;

    // Get all live_ads with approved directory listings that have visibility issues
    const snapshot = await db.collection('live_ads').get();

    const adsToFix: Array<{ id: string; data: LiveAd }> = [];

    snapshot.forEach((doc) => {
      const ad = { id: doc.id, ...doc.data() } as LiveAd;

      // Only fix ads with approved directory listings
      if (ad.directoryListing?.directoryStatus !== 'approved') {
        return;
      }

      // Check if this ad should be fixed
      if (!fixAll && liveAdIds && !liveAdIds.includes(ad.id)) {
        return;
      }

      // Check if there are visibility issues to fix
      const hasIssues = ad.status !== 'active' || ad.showInDirectory === false;
      
      if (hasIssues) {
        adsToFix.push({ id: doc.id, data: ad });
      }
    });

    // Apply fixes
    const results: Array<{ liveAdId: string; businessName: string; fixed: boolean; error?: string }> = [];

    for (const { id, data } of adsToFix) {
      try {
        const updates: Record<string, any> = {
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (data.status !== 'active') {
          updates.status = 'active';
        }
        if (data.showInDirectory === false) {
          updates.showInDirectory = true;
        }

        await db.collection('live_ads').doc(id).update(updates);

        results.push({
          liveAdId: id,
          businessName: data.directoryListing?.businessName || data.customerName || data.name || 'Unknown',
          fixed: true,
        });
      } catch (error: any) {
        results.push({
          liveAdId: id,
          businessName: data.directoryListing?.businessName || data.customerName || data.name || 'Unknown',
          fixed: false,
          error: error.message,
        });
      }
    }

    const fixedCount = results.filter(r => r.fixed).length;
    const errorCount = results.filter(r => !r.fixed).length;

    return NextResponse.json({
      success: true,
      data: {
        totalFixed: fixedCount,
        totalErrors: errorCount,
        results,
        message: `Fixed ${fixedCount} directory listings. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}`,
      },
    });

  } catch (error: any) {
    console.error('Error reconciling directory:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
