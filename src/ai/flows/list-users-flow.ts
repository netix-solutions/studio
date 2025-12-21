'use server';
/**
 * @fileOverview A flow for listing all Firebase Authentication users.
 * This is a server-side flow intended for admin use.
 */

import { z } from 'zod';
import admin from 'firebase-admin';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import type { App } from 'firebase-admin/app';

const UserSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  creationTime: z.string(),
  lastSignInTime: z.string(),
});

const ListUsersOutputSchema = z.object({
  users: z.array(UserSchema).optional(),
  error: z.string().optional(),
});

/**
 * Initializes the Firebase Admin SDK, reusing the existing instance if available.
 * It prioritizes using a service account key from environment variables,
 * falling back to Application Default Credentials if the key is not present.
 */
function initializeAdminApp(): App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      // The key is stored as a stringified JSON, so it needs to be parsed.
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount);
    } catch (e: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      // Fallback to ADC, which will likely fail and produce the "not configured" error,
      // which is the desired behavior if the key is present but invalid.
      credential = admin.credential.applicationDefault();
    }
  } else {
    // Use Application Default Credentials if the service account key is not provided.
    credential = admin.credential.applicationDefault();
  }
  
  admin.initializeApp({
    credential,
  });
  
  return admin.app();
}

export async function listAllUsers(): Promise<z.infer<typeof ListUsersOutputSchema>> {
    try {
        const adminApp = initializeAdminApp();
        const userRecords: UserRecord[] = [];
        let pageToken;

        do {
            const listUsersResult = await getAuth(adminApp).listUsers(1000, pageToken);
            userRecords.push(...listUsersr