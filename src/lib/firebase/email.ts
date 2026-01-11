
'use client';

/**
 * Client-side email sending utilities
 * 
 * This module provides functions for sending emails from client components.
 * Emails are sent via the /api/send-email endpoint which uses SendGrid.
 */

export interface EmailData {
    to: string | string[];
    from?: string; // If not provided, uses the default from SendGrid config
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
}

// Options for logging
export interface EmailLogOptions {
    recipientId?: string;
    templateId?: string;
    triggerType?: string;
}

/**
 * Sends an email via the SendGrid API endpoint.
 * This replaces the previous Firebase Trigger Email extension approach.
 * 
 * @param _firestore - Kept for backwards compatibility (not used)
 * @param emailData - The email content
 * @param logOptions - Optional data for logging
 */
export async function sendEmail(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _firestore: unknown,
    emailData: EmailData,
    logOptions: EmailLogOptions = {}
): Promise<void> {
    const { to, subject, text, html, replyTo } = emailData;

    const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            to: Array.isArray(to) ? to : [to],
            subject,
            text,
            html,
            replyTo,
            recipientId: logOptions.recipientId,
            templateId: logOptions.templateId,
            triggerType: logOptions.triggerType || 'manual_send',
        }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
    }
}
