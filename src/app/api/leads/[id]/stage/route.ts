import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { LEAD_STAGES, LEAD_STAGE_LABELS, type LeadStage, getStatusFromStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_STAGES = Object.values(LEAD_STAGES);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { stage, lostReason, note, userId, userName } = body as {
      stage: LeadStage;
      lostReason?: string;
      note?: string;
      userId: string;
      userName: string;
    };

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { success: false, error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const leadRef = db.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const leadData = leadDoc.data()!;
    const fromStage = leadData.stage || 'new';

    if (fromStage === stage) {
      return NextResponse.json(
        { success: false, error: 'Lead is already in this stage' },
        { status: 400 }
      );
    }

    // Update lead document
    const updateData: Record<string, any> = {
      stage,
      status: getStatusFromStage(stage),
      stageChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (stage === 'lost' && lostReason) {
      updateData.lostReason = lostReason;
    }

    await leadRef.update(updateData);

    // Log activity
    const activityData: Record<string, any> = {
      leadId,
      type: 'stage_change',
      title: `Stage changed from ${LEAD_STAGE_LABELS[fromStage as LeadStage] || fromStage} to ${LEAD_STAGE_LABELS[stage]}`,
      description: note || undefined,
      metadata: {
        fromStage,
        toStage: stage,
        ...(lostReason ? { lostReason } : {}),
      },
      createdBy: userId,
      createdByName: userName || 'Unknown',
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection('leads').doc(leadId).collection('activities').add(activityData);

    // Auto-cancel active sequence enrollments if moved to won/lost
    if (stage === 'won' || stage === 'lost') {
      const enrollments = await db.collection('leadSequenceEnrollments')
        .where('leadId', '==', leadId)
        .where('status', '==', 'active')
        .get();

      const batch = db.batch();
      enrollments.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'cancelled',
          cancelledAt: FieldValue.serverTimestamp(),
        });
      });
      if (!enrollments.empty) {
        await batch.commit();
      }
    }

    // Auto-enroll in matching sequences on stage change
    if (stage !== 'won' && stage !== 'lost') {
      const matchingSequences = await db.collection('leadSequences')
        .where('trigger', '==', 'stage_enter')
        .where('triggerStage', '==', stage)
        .where('isActive', '==', true)
        .get();

      for (const seqDoc of matchingSequences.docs) {
        const seq = seqDoc.data();
        // Check if already enrolled
        const existing = await db.collection('leadSequenceEnrollments')
          .where('sequenceId', '==', seqDoc.id)
          .where('leadId', '==', leadId)
          .where('status', '==', 'active')
          .limit(1)
          .get();

        if (existing.empty && seq.steps?.length > 0) {
          const firstStep = seq.steps[0];
          const nextStepDate = new Date();
          nextStepDate.setDate(nextStepDate.getDate() + (firstStep.delayDays || 0));

          await db.collection('leadSequenceEnrollments').add({
            sequenceId: seqDoc.id,
            sequenceName: seq.name,
            leadId,
            leadName: leadData.contactName || leadData.businessName || 'Unknown',
            currentStepIndex: 0,
            status: 'active',
            nextStepScheduledAt: nextStepDate,
            enrolledAt: FieldValue.serverTimestamp(),
            createdBy: userId,
            createdByName: userName || 'Unknown',
          });

          // Log enrollment activity
          await db.collection('leads').doc(leadId).collection('activities').add({
            leadId,
            type: 'sequence_enrolled',
            title: `Auto-enrolled in sequence: ${seq.name}`,
            metadata: { sequenceId: seqDoc.id, sequenceName: seq.name },
            createdBy: 'system',
            createdByName: 'System',
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Auto-create follow-up task on stage change
    if (stage === 'contacted') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      await db.collection('tasks').add({
        leadId,
        title: 'Follow up with lead',
        description: `Follow up with ${leadData.contactName || leadData.businessName} after initial contact`,
        status: 'pending',
        type: 'follow_up',
        dueAt: dueDate,
        assignedTo: userId,
        assignedToName: userName || 'Unknown',
        createdBy: userId,
        createdByName: userName || 'Unknown',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (stage === 'proposal') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);
      await db.collection('tasks').add({
        leadId,
        title: 'Send proposal to lead',
        description: `Prepare and send proposal to ${leadData.contactName || leadData.businessName}`,
        status: 'pending',
        type: 'follow_up',
        dueAt: dueDate,
        assignedTo: userId,
        assignedToName: userName || 'Unknown',
        createdBy: userId,
        createdByName: userName || 'Unknown',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      data: { stage, fromStage, status: getStatusFromStage(stage) },
    });
  } catch (error) {
    console.error('Error updating lead stage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lead stage' },
      { status: 500 }
    );
  }
}
