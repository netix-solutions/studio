import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';

/**
 * API endpoint to schedule an email to be sent to a lead at a specific time
 * 
 * POST /api/schedule-lead-email
 * Body: {
 *   leadId: string;
 *   templateId: string;
 *   scheduledFor: string; // ISO date string
 *   notes?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { auth, db } = initAdmin();

    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { leadId, templateId, scheduledFor, notes } = body;

    // Validate required fields
    if (!leadId || !templateId || !scheduledFor) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, templateId, scheduledFor' },
        { status: 400 }
      );
    }

    // Validate the scheduled date
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledFor date format' },
        { status: 400 }
      );
    }

    // Check if the date is in the future
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    // Verify the lead exists
    const leadDoc = await db.collection('leads').doc(leadId).get();
    if (!leadDoc.exists) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Verify the template exists
    const templateDoc = await db.collection('emailTemplates').doc(templateId).get();
    if (!templateDoc.exists) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    // Create the scheduled email document
    const scheduledEmailRef = db.collection('scheduledLeadEmails').doc();
    await scheduledEmailRef.set({
      leadId,
      templateId,
      scheduledFor: scheduledDate,
      status: 'pending',
      notes: notes || '',
      createdAt: new Date(),
      createdBy: decodedToken.uid,
      updatedAt: new Date(),
    });

    // Log activity on the lead
    await db
      .collection('leads')
      .doc(leadId)
      .collection('activities')
      .add({
        type: 'email_scheduled',
        title: 'Email Scheduled',
        description: `Email scheduled to be sent on ${scheduledDate.toLocaleString()}`,
        createdAt: new Date(),
        createdBy: decodedToken.uid,
        metadata: {
          templateId,
          scheduledEmailId: scheduledEmailRef.id,
          scheduledFor: scheduledDate,
        },
      });

    return NextResponse.json({
      success: true,
      scheduledEmailId: scheduledEmailRef.id,
      scheduledFor: scheduledDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Error scheduling lead email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/schedule-lead-email?leadId=xxx
 * Get all scheduled emails for a lead
 */
export async function GET(request: NextRequest) {
  try {
    const { auth, db } = initAdmin();

    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json(
        { error: 'Missing required parameter: leadId' },
        { status: 400 }
      );
    }

    // Get all scheduled emails for the lead
    const scheduledEmailsSnapshot = await db
      .collection('scheduledLeadEmails')
      .where('leadId', '==', leadId)
      .orderBy('scheduledFor', 'asc')
      .get();

    const scheduledEmails = scheduledEmailsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledFor: doc.data().scheduledFor?.toDate?.()?.toISOString() || doc.data().scheduledFor,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || doc.data().sentAt,
    }));

    return NextResponse.json({
      success: true,
      scheduledEmails,
    });
  } catch (error: any) {
    console.error('Error getting scheduled lead emails:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedule-lead-email?emailId=xxx
 * Cancel a scheduled email
 */
export async function DELETE(request: NextRequest) {
  try {
    const { auth, db } = initAdmin();

    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json(
        { error: 'Missing required parameter: emailId' },
        { status: 400 }
      );
    }

    const emailDoc = await db.collection('scheduledLeadEmails').doc(emailId).get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Scheduled email not found' },
        { status: 404 }
      );
    }

    const emailData = emailDoc.data();

    // Can only cancel pending emails
    if (emailData?.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending emails' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await emailDoc.ref.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: decodedToken.uid,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled email cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling scheduled lead email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
