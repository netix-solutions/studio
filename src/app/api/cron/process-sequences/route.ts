import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const now = new Date();

    // Get active enrollments with due steps
    const enrollments = await db.collection('leadSequenceEnrollments')
      .where('status', '==', 'active')
      .where('nextStepScheduledAt', '<=', now)
      .get();

    let processed = 0;
    let errors = 0;

    for (const enrollmentDoc of enrollments.docs) {
      try {
        const enrollment = enrollmentDoc.data();
        const seqDoc = await db.collection('leadSequences').doc(enrollment.sequenceId).get();

        if (!seqDoc.exists || !seqDoc.data()?.isActive) {
          await enrollmentDoc.ref.update({
            status: 'cancelled',
            cancelledAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        const sequence = seqDoc.data()!;
        const currentStep = sequence.steps[enrollment.currentStepIndex];

        if (!currentStep) {
          // Sequence completed
          await enrollmentDoc.ref.update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
          });

          await db.collection('leads').doc(enrollment.leadId).collection('activities').add({
            leadId: enrollment.leadId,
            type: 'sequence_completed',
            title: `Completed sequence: ${enrollment.sequenceName}`,
            metadata: { sequenceId: enrollment.sequenceId, sequenceName: enrollment.sequenceName },
            createdBy: 'system',
            createdByName: 'System',
            createdAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        // Check skipIfContacted
        if (currentStep.skipIfContacted) {
          const leadDoc = await db.collection('leads').doc(enrollment.leadId).get();
          const leadData = leadDoc.data();
          if (leadData?.lastContactedAt) {
            const lastContact = leadData.lastContactedAt.toDate?.() || new Date(leadData.lastContactedAt);
            const enrolledAt = enrollment.enrolledAt?.toDate?.() || new Date(enrollment.enrolledAt);
            if (lastContact > enrolledAt) {
              // Skip this step - move to next
              const nextIndex = enrollment.currentStepIndex + 1;
              if (nextIndex >= sequence.steps.length) {
                await enrollmentDoc.ref.update({
                  status: 'completed',
                  completedAt: FieldValue.serverTimestamp(),
                });
              } else {
                const nextStep = sequence.steps[nextIndex];
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + (nextStep.delayDays || 0));
                await enrollmentDoc.ref.update({
                  currentStepIndex: nextIndex,
                  nextStepScheduledAt: nextDate,
                });
              }
              continue;
            }
          }
        }

        // Send email for this step
        const leadDoc = await db.collection('leads').doc(enrollment.leadId).get();
        const leadData = leadDoc.data();

        if (leadData?.email && currentStep.templateId) {
          // Fetch email template
          let template: { subject: string; html: string } | null = null;
          try {
            const templateDoc = await db.collection('emailTemplates').doc(currentStep.templateId).get();
            if (templateDoc.exists) {
              template = templateDoc.data() as { subject: string; html: string };
            }
          } catch (e) {
            console.error('Failed to fetch template:', e);
          }

          if (template) {
            // Queue email via mail collection (SendGrid trigger)
            await db.collection('mail').add({
              to: leadData.email,
              message: {
                subject: template.subject
                  .replace('{{contactName}}', leadData.contactName || '')
                  .replace('{{businessName}}', leadData.businessName || ''),
                html: template.html
                  .replace('{{contactName}}', leadData.contactName || '')
                  .replace('{{businessName}}', leadData.businessName || ''),
              },
            });

            // Log email sent activity
            await db.collection('leads').doc(enrollment.leadId).collection('activities').add({
              leadId: enrollment.leadId,
              type: 'sequence_email_sent',
              title: `Sequence email sent: ${template.subject}`,
              metadata: {
                sequenceId: enrollment.sequenceId,
                sequenceName: enrollment.sequenceName,
                stepIndex: enrollment.currentStepIndex,
                emailSubject: template.subject,
              },
              createdBy: 'system',
              createdByName: 'System',
              createdAt: FieldValue.serverTimestamp(),
            });

            // Update lastContactedAt
            await db.collection('leads').doc(enrollment.leadId).update({
              lastContactedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }

        // Move to next step
        const nextIndex = enrollment.currentStepIndex + 1;
        if (nextIndex >= sequence.steps.length) {
          await enrollmentDoc.ref.update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
            currentStepIndex: nextIndex,
          });

          await db.collection('leads').doc(enrollment.leadId).collection('activities').add({
            leadId: enrollment.leadId,
            type: 'sequence_completed',
            title: `Completed sequence: ${enrollment.sequenceName}`,
            metadata: { sequenceId: enrollment.sequenceId },
            createdBy: 'system',
            createdByName: 'System',
            createdAt: FieldValue.serverTimestamp(),
          });
        } else {
          const nextStep = sequence.steps[nextIndex];
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + (nextStep.delayDays || 0));
          await enrollmentDoc.ref.update({
            currentStepIndex: nextIndex,
            nextStepScheduledAt: nextDate,
          });
        }

        processed++;
      } catch (err) {
        console.error(`Error processing enrollment ${enrollmentDoc.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { processed, errors, total: enrollments.size },
    });
  } catch (error) {
    console.error('Error processing sequences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process sequences' },
      { status: 500 }
    );
  }
}
