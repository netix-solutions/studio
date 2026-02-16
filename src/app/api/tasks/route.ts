import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore();
    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    let q: FirebaseFirestore.Query = db.collection('tasks');

    if (leadId) {
      q = q.where('leadId', '==', leadId);
    }
    if (status) {
      q = q.where('status', '==', status);
    }
    if (assignedTo) {
      q = q.where('assignedTo', '==', assignedTo);
    }

    q = q.orderBy('createdAt', 'desc');

    const snapshot = await q.get();
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, title, description, type, dueAt, assignedTo, assignedToName, userId, userName } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const taskData: Record<string, any> = {
      title: title.trim(),
      description: description?.trim() || '',
      status: 'pending',
      type: type || 'custom',
      createdBy: userId || 'unknown',
      createdByName: userName || 'Unknown',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (leadId) taskData.leadId = leadId;
    if (dueAt) taskData.dueAt = new Date(dueAt);
    if (assignedTo) taskData.assignedTo = assignedTo;
    if (assignedToName) taskData.assignedToName = assignedToName;

    const docRef = await db.collection('tasks').add(taskData);

    // Log activity on lead if linked
    if (leadId) {
      await db.collection('leads').doc(leadId).collection('activities').add({
        leadId,
        type: 'task_created',
        title: `Task created: ${title.trim()}`,
        metadata: { taskTitle: title.trim() },
        createdBy: userId || 'system',
        createdByName: userName || 'System',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      data: { id: docRef.id },
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
