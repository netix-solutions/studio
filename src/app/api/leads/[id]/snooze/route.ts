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
    const { snoozeUntil, userId, userName } = await request.json();

    if (!snoozeUntil) {
      return NextResponse.json(
        { success: false, error: 'snoozeUntil date is required' },
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
    const snoozeDate = new Date(snoozeUntil);

    // Update lead's snoozedUntil
    await leadRef.update({
      snoozedUntil: snoozeDate,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create a follow-up task at snooze date
    await db.collection('tasks').add({
      leadId,
      title: `Follow up with ${leadData.contactName || leadData.businessName}`,
      description: 'Snoozed lead - follow up required',
      status: 'pending',
      type: 'follow_up',
      dueAt: snoozeDate,
      assignedTo: userId || undefined,
      assignedToName: userName || undefined,
      createdBy: userId || 'system',
      createdByName: userName || 'System',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error snoozing lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to snooze lead' },
      { status: 500 }
    );
  }
}
