
'use client';
import { addDoc, collection, serverTimestamp, type Firestore } from "firebase/firestore";

export interface EmailData {
    to: string | string[];
    from?: string; // If not provided, uses the default 'from' in the extension config
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
}

// New interface for logging options
export interface EmailLogOptions {
    recipientId?: string;
    templateId?: string;
    triggerType?: string;
}

/**
 * Sends an email by creating a document in the 'mail' collection
 * and logs the email in the 'sent_emails' collection.
 * The Firebase Trigger Email extension must be installed and configured.
 * @param {Firestore} firestore - The Firestore instance.
 * @param {EmailData} emailData - The email content.
 * @param {EmailLogOptions} logOptions - Optional data for logging.
 */
export async function sendEmail(firestore: Firestore, emailData: EmailData, logOptions: EmailLogOptions = {}) {
    if (!firestore) {
        throw new Error("Firestore is not initialized.");
    }
    
    const { to, from, replyTo, subject, text, html } = emailData;

    // 1. Queue the email for the Trigger Email extension
    const mailCollection = collection(firestore, 'mail');
    const emailDocPayload = {
        to: Array.isArray(to) ? to : [to],
        ...(from && { from }),
        ...(replyTo && { replyTo }),
        message: {
            subject,
            ...(text && { text }),
            ...(html && { html }),
        },
    };

    try {
        await addDoc(mailCollection, emailDocPayload);
    } catch (error) {
        console.error("Error adding document to mail collection: ", error);
        throw new Error("Failed to queue email for sending.");
    }

    // 2. Log the email in the 'sent_emails' collection
    const sentEmailsCollection = collection(firestore, 'sent_emails');
    const recipientEmail = Array.isArray(to) ? to.join(', ') : to;
    const emailLogPayload = {
        recipientEmail: recipientEmail,
        recipientId: logOptions.recipientId || null,
        subject: subject,
        html: html || text || '',
        sentAt: serverTimestamp(),
        templateId: logOptions.templateId || null,
        triggerType: logOptions.triggerType || 'unknown',
    };

    try {
        await addDoc(sentEmailsCollection, emailLogPayload);
    } catch (error) {
        // Log this error but don't throw, as the email is already queued.
        // This is a non-critical failure in the context of the user action.
        console.error("Error adding document to sent_emails collection: ", error);
    }
}
