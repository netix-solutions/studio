import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const db = getAdminFirestore();
    const listingRef = db.collection('directory_listings').doc(params.id);
    const listingDoc = await listingRef.get();

    if (!listingDoc.exists) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listingData = listingDoc.data();
    
    // Verify ownership
    if (listingData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'businessName',
      'description',
      'phone',
      'websiteUrl',
      'logoUrl',
      'bannerImageUrl',
      'socialLinks',
      'address',
      'city',
      'state',
      'zipCode',
    ];

    const updates: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    allowedFields.forEach(field => {
      if (field in body) {
        updates[field] = body[field];
      }
    });

    await listingRef.update(updates);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating listing:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
