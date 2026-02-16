import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const now = new Date();

    // Get overdue tasks
    const overdueTasks = await db.collection('tasks')
      .where('status', 'in', ['pending', 'in_progress'])
      .where('dueAt', '<=', now)
      .get();

    if (overdueTasks.empty) {
      return NextResponse.json({
        success: true,
        data: { reminders: 0, message: 'No overdue tasks' },
      });
    }

    // Group tasks by assignee
    const tasksByAssignee: Record<string, any[]> = {};
    for (const taskDoc of overdueTasks.docs) {
      const task = taskDoc.data();
      const assignee = task.assignedTo || 'unassigned';
      if (!tasksByAssignee[assignee]) tasksByAssignee[assignee] = [];
      tasksByAssignee[assignee].push({ id: taskDoc.id, ...task });
    }

    let reminders = 0;

    // Send reminder emails (using mail collection for SendGrid)
    for (const [assigneeId, tasks] of Object.entries(tasksByAssignee)) {
      if (assigneeId === 'unassigned') continue;

      // Try to get assignee email from users collection
      try {
        const userDoc = await db.collection('users').doc(assigneeId).get();
        const userData = userDoc.data();
        const email = userData?.email;

        if (email) {
          const taskList = tasks.map(t => {
            const dueDate = t.dueAt?.toDate?.() || new Date(t.dueAt);
            return `- ${t.title} (due: ${dueDate.toLocaleDateString()})`;
          }).join('\n');

          await db.collection('mail').add({
            to: email,
            message: {
              subject: `You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}`,
              html: `
                <h2>Overdue Tasks</h2>
                <p>You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} that need attention:</p>
                <ul>
                  ${tasks.map(t => {
                    const dueDate = t.dueAt?.toDate?.() || new Date(t.dueAt);
                    return `<li><strong>${t.title}</strong> - Due: ${dueDate.toLocaleDateString()}${t.description ? `<br/><em>${t.description}</em>` : ''}</li>`;
                  }).join('')}
                </ul>
                <p>Please log in to review and complete these tasks.</p>
              `,
            },
          });
          reminders++;
        }
      } catch (err) {
        console.error(`Error sending reminder to ${assigneeId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      data: { reminders, overdueTasks: overdueTasks.size },
    });
  } catch (error) {
    console.error('Error sending task reminders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send task reminders' },
      { status: 500 }
    );
  }
}
