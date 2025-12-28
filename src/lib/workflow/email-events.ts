/**
 * Email Events System
 *
 * Tracks email sends for idempotency and audit trail.
 * Prevents duplicate emails within a time window.
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import type { EmailEventType, EmailEvent } from '../types';

/**
 * Get the email events collection reference
 */
function getEmailEventsCollection(
  firestore: Firestore,
  userId: string,
  adId: string
) {
  return collection(firestore, 'users', userId, 'advertisements', adId, 'emailEvents');
}

/**
 * Generate an idempotency key for an email event
 * Uses a 60-minute window by default
 */
export function generateIdempotencyKey(
  adId: string,
  eventType: EmailEventType,
  timeWindowMinutes: number = 60
): string {
  const windowStart = Math.floor(Date.now() / (timeWindowMinutes * 60 * 1000));
  return `${adId}:${eventType}:${windowStart}`;
}

/**
 * Check if an email with the same idempotency key was already sent
 */
export async function checkEmailAlreadySent(
  firestore: Firestore,
  userId: string,
  adId: string,
  idempotencyKey: string
): Promise<EmailEvent | null> {
  const eventsRef = getEmailEventsCollection(firestore, userId, adId);
  const q = query(eventsRef, where('idempotencyKey', '==', idempotencyKey));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as EmailEvent;
}

/**
 * Record an email event after sending
 */
export async function recordEmailEvent(
  firestore: Firestore,
  userId: string,
  adId: string,
  event: Omit<EmailEvent, 'id'>
): Promise<EmailEvent> {
  const eventsRef = getEmailEventsCollection(firestore, userId, adId);

  const docRef = await addDoc(eventsRef, {
    ...event,
    sentAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...event,
  };
}

/**
 * Get all email events for an advertisement
 */
export async function getEmailEvents(
  firestore: Firestore,
  userId: string,
  adId: string
): Promise<EmailEvent[]> {
  const eventsRef = getEmailEventsCollection(firestore, userId, adId);
  const snapshot = await getDocs(eventsRef);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as EmailEvent));
}

/**
 * Send approval request email with idempotency check
 * Returns the email event if sent, or existing event if already sent
 */
export async function sendApprovalEmailWithIdempotency(
  firestore: Firestore,
  userId: string,
  adId: string,
  recipientEmail: string,
  emailSubject: string,
  emailHtml: string,
  sentByUserId: string,
  sendEmailFn: (to: string, subject: string, html: string) => Promise<string | null>
): Promise<{ sent: boolean; event: EmailEvent; message: string }> {
  const idempotencyKey = generateIdempotencyKey(adId, 'approval_request', 60);

  // Check if already sent within the time window
  const existing = await checkEmailAlreadySent(firestore, userId, adId, idempotencyKey);

  if (existing) {
    return {
      sent: false,
      event: existing,
      message: 'Approval email was already sent recently. Please wait before sending again.',
    };
  }

  // Send the email
  const mailDocId = await sendEmailFn(recipientEmail, emailSubject, emailHtml);

  // Record the event
  const event = await recordEmailEvent(firestore, userId, adId, {
    type: 'approval_request',
    recipientEmail,
    subject: emailSubject,
    sentAt: null, // Will be set by serverTimestamp()
    sentBy: 'admin',
    sentByUserId,
    idempotencyKey,
    ...(mailDocId && { mailDocId }),
    metadata: {
      adId,
    },
  });

  return {
    sent: true,
    event,
    message: 'Approval request email sent successfully.',
  };
}

/**
 * Send ad live notification email with idempotency
 */
export async function sendAdLiveEmailWithIdempotency(
  firestore: Firestore,
  userId: string,
  adId: string,
  recipientEmail: string,
  emailSubject: string,
  emailHtml: string,
  sentByUserId: string,
  sendEmailFn: (to: string, subject: string, html: string) => Promise<string | null>
): Promise<{ sent: boolean; event: EmailEvent; message: string }> {
  const idempotencyKey = generateIdempotencyKey(adId, 'ad_live', 1440); // 24 hour window

  // Check if already sent
  const existing = await checkEmailAlreadySent(firestore, userId, adId, idempotencyKey);

  if (existing) {
    return {
      sent: false,
      event: existing,
      message: 'Ad live notification was already sent.',
    };
  }

  // Send the email
  const mailDocId = await sendEmailFn(recipientEmail, emailSubject, emailHtml);

  // Record the event
  const event = await recordEmailEvent(firestore, userId, adId, {
    type: 'ad_live',
    recipientEmail,
    subject: emailSubject,
    sentAt: null,
    sentBy: 'admin',
    sentByUserId,
    idempotencyKey,
    ...(mailDocId && { mailDocId }),
    metadata: {
      adId,
    },
  });

  return {
    sent: true,
    event,
    message: 'Ad live notification sent successfully.',
  };
}
