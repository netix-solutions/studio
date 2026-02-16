import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection('leadSequences').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'Sequence not found' },
        { status: 404 }
      );
    }

    // Get enrollment count
    const enrollments = await db.collection('leadSequenceEnrollments')
      .where('sequenceId', '==', id)
      .get();

    const enrollmentsByStatus: Record<string, number> = {};
    enrollments.docs.forEach(d => {
      const status = d.data().status;
      enrollmentsByStatus[status] = (enrollmentsByStatus[status] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
        enrollmentsByStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching sequence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sequence' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, trigger, steps, isActive } = body;

    const db = getAdminFirestore();
    const docRef = db.collection('leadSequences').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'Sequence not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (trigger !== undefined) updateData.trigger = trigger;
    if (steps !== undefined) updateData.steps = steps;
    if (isActive !== undefined) updateData.isActive = isActive;

    await docRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating sequence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update sequence' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminFirestore();

    // Cancel all active enrollments
    const enrollments = await db.collection('leadSequenceEnrollments')
      .where('sequenceId', '==', id)
      .where('status', '==', 'active')
      .get();

    const batch = db.batch();
    enrollments.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: FieldValue.serverTimestamp(),
      });
    });

    batch.delete(db.collection('leadSequences').doc(id));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sequence' },
      { status: 500 }
    );
  }
}
