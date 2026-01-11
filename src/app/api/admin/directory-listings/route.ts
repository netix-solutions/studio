import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { verifyAdminAuth } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    
    const snapshot = await db.collection('directory_listings').get();
    
    const listings: any[] = [];
    snapshot.forEach((doc) => {
      listings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by creation date (newest first)
    listings.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      listings,
      total: listings.length,
    });

  } catch (error: any) {
    console.error('Error fetching directory listings:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch listings',
    }, {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = getAdminFirestore();

    // Create manual listing (for comps/special cases)
    const listingRef = db.collection('directory_listings').doc();
    
    await listingRef.set({
      id: listingRef.id,
      businessName: body.businessName,
      contactEmail: body.contactEmail,
      contactName: body.contactName,
      phone: body.phone || '',
      websiteUrl: body.websiteUrl || '',
      description: body.description || '',
      category: body.category || 'other',
      logoUrl: body.logoUrl || '',
      bannerImageUrl: body.bannerImageUrl || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      zipCode: body.zipCode || '',
      socialLinks: body.socialLinks || {},
      userId: body.userId || authResult.userId,
      subscriptionStatus: body.subscriptionStatus || 'legacy',
      subscriptionId: body.subscriptionId || null,
      stripeCustomerId: body.stripeCustomerId || null,
      status: body.status || 'active',
      tier: body.tier || 'legacy',
      isFeatured: body.isFeatured || false,
      sortOrder: body.sortOrder || 0,
      analytics: {
        totalViews: 0,
        totalClicks: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      createdBy: authResult.userId,
    });

    return NextResponse.json({
      success: true,
      listingId: listingRef.id,
    });

  } catch (error: any) {
    console.error('Error creating directory listing:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create listing',
    }, {
      status: 500,
    });
  }
}
