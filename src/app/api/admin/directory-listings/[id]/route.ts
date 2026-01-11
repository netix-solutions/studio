import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { verifyAdminAuth } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const listingDoc = await db.collection('directory_listings').doc(params.id).get();

    if (!listingDoc.exists) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      listing: {
        id: listingDoc.id,
        ...listingDoc.data(),
      },
    });

  } catch (error: any) {
    console.error('Error fetching listing:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = getAdminFirestore();
    const listingRef = db.collection('directory_listings').doc(params.id);

    await listingRef.update({
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating listing:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    await db.collection('directory_listings').doc(params.id).delete();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting listing:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
