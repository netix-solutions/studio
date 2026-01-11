import { NextRequest, NextResponse } from 'next/server';
import { sendEmailWithSendGrid, isSendGridConfigured, isValidEmail } from '@/lib/sendgrid';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/send-email
 * 
 * Sends an email using SendGrid and logs it to Firestore.
 * 
 * Request body:
 * - to: string | string[] - Recipient email address(es)
 * - subject: string - Email subject
 * - html: string - HTML content of the email
 * - text?: string - Plain text content (optional fallback)
 * - replyTo?: string - Reply-to email address
 * - recipientId?: string - ID of the recipient (for logging)
 * - templateId?: string - ID of the template used (for logging)
 * - triggerType?: string - Type of trigger (for logging)
 * - categories?: string[] - SendGrid categories for analytics
 */
export async function POST(request: NextRequest) {
    try {
        // Check SendGrid configuration
        if (!isSendGridConfigured()) {
            return NextResponse.json(
                { error: 'Email service is not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const {
            to,
            subject,
            html,
            text,
            replyTo,
            recipientId,
            templateId,
            triggerType = 'api_call',
            categories,
        } = body;

        // Validate required fields
        if (!to) {
            return NextResponse.json(
                { error: 'Recipient email (to) is required' },
                { status: 400 }
            );
        }

        if (!subject) {
            return NextResponse.json(
                { error: 'Email subject is required' },
                { status: 400 }
            );
        }

        if (!html && !text) {
            return NextResponse.json(
                { error: 'Email must have either HTML or text content' },
                { status: 400 }
            );
        }

        // Validate email addresses
        const recipients = Array.isArray(to) ? to : [to];
        for (const email of recipients) {
            if (!isValidEmail(email)) {
                return NextResponse.json(
                    { error: `Invalid email address: ${email}` },
                    { status: 400 }
                );
            }
        }

        // Send the email via SendGrid
        const result = await sendEmailWithSendGrid({
            to: recipients,
            subject,
            html,
            text,
            replyTo,
            categories,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        // Log the email in Firestore
        try {
            const db = getAdminFirestore();
            await db.collection('sent_emails').add({
                recipientEmail: recipients.join(', '),
                recipientId: recipientId || null,
                subject,
                html: html || text || '',
                sentAt: FieldValue.serverTimestamp(),
                templateId: templateId || null,
                triggerType,
                messageId: result.messageId || null,
                provider: 'sendgrid',
            });
        } catch (logError) {
            // Log error but don't fail the request since email was sent
            console.error('Failed to log email to Firestore:', logError);
        }

        return NextResponse.json({
            success: true,
            message: `Email sent successfully to ${recipients.join(', ')}`,
            messageId: result.messageId,
        });
    } catch (error: any) {
        console.error('Error in send-email API:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        );
    }
}
