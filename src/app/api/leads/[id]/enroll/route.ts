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
    const { sequenceId, userId, userName } = await request.json();

    if (!sequenceId) {
      return NextResponse.json(
        { success: false, error: 'sequenceId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Verify lead exists
    const leadDoc = await db.collection('leads').doc(leadId).get();
    if (!leadDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Verify sequence exists and is active
    const seqDoc = await db.collection('leadSequences').doc(sequenceId).get();
    if (!seqDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Sequence not found' },
        { status: 404 }
      );
    }

    const seq = seqDoc.data()!;
    if (!seq.isActive) {
      return NextResponse.json(
        { success: false, error: 'Sequence is not active' },
        { status: 400 }
      );
    }

    if (!seq.steps || seq.steps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sequence has no steps' },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existing = await db.collection('leadSequenceEnrollments')
      .where('sequenceId', '==', sequenceId)
      .where('leadId', '==', leadId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: 'Lead is already enrolled in this sequence' },
        { status: 400 }
      );
    }

    const leadData = leadDoc.data()!;
    const firstStep = seq.steps[0];
    const nextStepDate = new Date();
    nextStepDate.setDate(nextStepDate.getDate() + (firstStep.delayDays || 0));

    // Create enrollment
    const enrollmentRef = await db.collection('leadSequenceEnrollments').add({
      sequenceId,
      sequenceName: seq.name,
      leadId,
      leadName: leadData.contactName || leadData.businessName || 'Unknown',
      currentStepIndex: 0,
      status: 'active',
      nextStepScheduledAt: nextStepDate,
      enrolledAt: FieldValue.serverTimestamp(),
      createdBy: userId || 'system',
      createdByName: userName || 'System',
    });

    // Update enrollment count
    await seqDoc.ref.update({
      enrollmentCount: FieldValue.increment(1),
    });

    // Log activity
    await db.collection('leads').doc(leadId).collection('activities').add({
      leadId,
      type: 'sequence_enrolled',
      title: `Enrolled in sequence: ${seq.name}`,
      metadata: { sequenceId, sequenceName: seq.name },
      createdBy: userId || 'system',
      createdByName: userName || 'System',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: { enrollmentId: enrollmentRef.id },
    });
  } catch (error) {
    console.error('Error enrolling lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enroll lead' },
      { status: 500 }
    );
  }
}
