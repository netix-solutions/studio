/**
 * SendGrid Email Service
 * 
 * This module provides email sending functionality using SendGrid.
 * Configure your SendGrid API key in environment variables:
 * - SENDGRID_API_KEY: Your SendGrid API key
 * - SENDGRID_FROM_EMAIL: Default sender email address (verified in SendGrid)
 * - SENDGRID_FROM_NAME: Default sender name (optional)
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
    sgMail.setApiKey(apiKey);
}

/**
 * Email data interface for sending emails
 */
export interface SendGridEmailData {
    /** Recipient email address(es) */
    to: string | string[];
    /** Email subject */
    subject: string;
    /** HTML content of the email */
    html?: string;
    /** Plain text content (fallback) */
    text?: string;
    /** Optional sender email (defaults to SENDGRID_FROM_EMAIL) */
    from?: string;
    /** Optional sender name (defaults to SENDGRID_FROM_NAME) */
    fromName?: string;
    /** Optional reply-to email address */
    replyTo?: string;
    /** Optional categories for SendGrid analytics */
    categories?: string[];
    /** Optional custom tracking settings */
    trackingSettings?: {
        clickTracking?: { enable: boolean };
        openTracking?: { enable: boolean };
    };
}

/**
 * Response from SendGrid email send operation
 */
export interface SendGridResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Check if SendGrid is properly configured
 */
export function isSendGridConfigured(): boolean {
    return !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
}

/**
 * Get the default sender configuration
 */
function getDefaultSender(): { email: string; name?: string } {
    const email = process.env.SENDGRID_FROM_EMAIL;
    const name = process.env.SENDGRID_FROM_NAME;
    
    if (!email) {
        throw new Error('SENDGRID_FROM_EMAIL environment variable is not set');
    }
    
    return { email, ...(name && { name }) };
}

/**
 * Send an email using SendGrid
 * 
 * @param emailData - The email data to send
 * @returns Promise with send result
 */
export async function sendEmailWithSendGrid(emailData: SendGridEmailData): Promise<SendGridResponse> {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API key is not configured');
        return {
            success: false,
            error: 'SendGrid API key is not configured. Set SENDGRID_API_KEY environment variable.',
        };
    }

    try {
        const defaultSender = getDefaultSender();
        
        // Ensure at least one content type is provided
        if (!emailData.html && !emailData.text) {
            return {
                success: false,
                error: 'Email must have either HTML or text content',
            };
        }
        
        // Prepare the email message with required fields
        const msg = {
            to: emailData.to,
            from: {
                email: emailData.from || defaultSender.email,
                name: emailData.fromName || defaultSender.name || 'Community-Websites.com',
            },
            subject: emailData.subject,
            // Provide text fallback if only HTML is provided
            text: emailData.text || (emailData.html ? 'Please view this email in an HTML-capable client.' : ''),
            html: emailData.html || emailData.text || '',
            ...(emailData.replyTo && { replyTo: emailData.replyTo }),
            ...(emailData.categories && { categories: emailData.categories }),
            ...(emailData.trackingSettings && { trackingSettings: emailData.trackingSettings }),
        };

        // Send the email
        const [response] = await sgMail.send(msg);
        
        return {
            success: true,
            messageId: response.headers['x-message-id'] as string | undefined,
        };
    } catch (error: any) {
        console.error('SendGrid email error:', error);
        
        // Extract error message from SendGrid response
        let errorMessage = 'Failed to send email';
        if (error.response?.body?.errors) {
            errorMessage = error.response.body.errors.map((e: any) => e.message).join(', ');
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Send a batch of emails using SendGrid
 * Useful for sending personalized emails to multiple recipients
 * 
 * @param emails - Array of email data to send
 * @returns Promise with array of send results
 */
export async function sendBatchEmails(
    emails: SendGridEmailData[]
): Promise<SendGridResponse[]> {
    // Send emails in parallel with a concurrency limit
    const BATCH_SIZE = 10;
    const results: SendGridResponse[] = [];
    
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(email => sendEmailWithSendGrid(email))
        );
        results.push(...batchResults);
    }
    
    return results;
}

/**
 * Validate an email address format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
