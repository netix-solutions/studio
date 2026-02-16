import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('leadSequences').orderBy('createdAt', 'desc').get();

    const sequences = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: sequences });
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sequences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, trigger, triggerStage, steps, userId, userName } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!trigger) {
      return NextResponse.json(
        { success: false, error: 'Trigger type is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const docRef = await db.collection('leadSequences').add({
      name: name.trim(),
      description: description?.trim() || '',
      trigger,
      triggerStage: triggerStage || null,
      steps: steps || [],
      isActive: true,
      enrollmentCount: 0,
      createdBy: userId || 'unknown',
      createdByName: userName || 'Unknown',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: { id: docRef.id },
    });
  } catch (error) {
    console.error('Error creating sequence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sequence' },
      { status: 500 }
    );
  }
}
