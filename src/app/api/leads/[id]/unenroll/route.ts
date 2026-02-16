import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const { enrollmentId, userId, userName } = await request.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { success: false, error: 'enrollmentId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const enrollmentRef = db.collection('leadSequenceEnrollments').doc(enrollmentId);
    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    const enrollment = enrollmentDoc.data()!;
    if (enrollment.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Enrollment does not belong to this lead' },
        { status: 400 }
      );
    }

    if (enrollment.status !== 'active' && enrollment.status !== 'paused') {
      return NextResponse.json(
        { success: false, error: 'Enrollment is not active' },
        { status: 400 }
      );
    }

    await enrollmentRef.update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
    });

    // Log activity
    await db.collection('leads').doc(leadId).collection('activities').add({
      leadId,
      type: 'sequence_cancelled',
      title: `Removed from sequence: ${enrollment.sequenceName}`,
      metadata: { sequenceId: enrollment.sequenceId, sequenceName: enrollment.sequenceName },
      createdBy: userId || 'system',
      createdByName: userName || 'System',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unenrolling lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unenroll lead' },
      { status: 500 }
    );
  }
}
