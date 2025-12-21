'use server';
/**
 * @fileOverview A flow for listing all Firebase Authentication users.
 * This is a server-side flow intended for admin use.
 */

import { z } from 'zod';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';

// Define the shape of a single user for the output
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

// Initialize Firebase Admin SDK if it hasn't been already.
function getAdminApp(): App | null {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin features will be disabled.");
        return null;
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        return initializeApp({
            credential: cert(serviceAccount),
        });
    } catch(error: any) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error.message);
        return null;
    }
}


export async function listAllUsers(): Promise<z.infer<typeof ListUsersOutputSchema>> {
    const adminApp = getAdminApp();
    if (!adminApp) {
        return {
            error: "Firebase Admin SDK is not configured. Please set the FIREBASE_SERVICE_ACCOUNT_KEY."
        }
    }

    try {
        const userRecords: UserRecord[] = [];
        let pageToken;

        do {
            const listUsersResult = await getAuth(adminApp).listUsers(1000, pageToken);
            userRecords.push(...listUsersResult.users);
            pageToken = listUsersResult.pageToken;
        } while (pageToken);


        const users = userRecords.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
        }));

        return { users };

    } catch (error: any) {
        console.error('Error listing users:', error);
        return {
            error: error.message || 'An unknown error occurred while listing users.',
        };
    }
}
