import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const db = getAdminFirestore();
    
    const snapshot = await db.collection('directory_listings')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        listing: null,
      });
    }

    const listing = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    };

    return NextResponse.json({
      success: true,
      listing,
    });

  } catch (error: any) {
    console.error('Error fetching my listing:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
