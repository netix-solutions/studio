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
let adminApp: App;
if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    adminApp = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    adminApp = getApps()[0];
}


export async function listAllUsers(): Promise<z.infer<typeof ListUsersOutputSchema>> {
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
