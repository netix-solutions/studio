
'use client';
import { addDoc, collection, type Firestore } from "firebase/firestore";

export interface EmailData {
    to: string | string[];
    from?: string; // If not provided, uses the default 'from' in the extension config
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
}

/**
 * Sends an email by creating a document in the 'mail' collection.
 * The Firebase Trigger Email extension must be installed and configured.
 * @param {Firestore} firestore - The Firestore instance.
 * @param {EmailData} emailData - The email content.
 */
export async function sendEmail(firestore: Firestore, emailData: EmailData) {
    if (!firestore) {
        throw new Error("Firestore is not initialized.");
    }
    
    const { to, from, replyTo, subject, text, html } = emailData;

    const mailCollection = collection(firestore, 'mail');

    // The Trigger Email extension expects a specific document structure.
    const emailDoc = {
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
        await addDoc(mailCollection, emailDoc);
        console.log("Email document created successfully. The Trigger Email extension will now process it.");
    } catch (error) {
        console.error("Error adding document to mail collection: ", error);
        throw new Error("Failed to queue email for sending.");
    }
}

    