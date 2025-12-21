'use server';
/**
 * @fileOverview A flow for listing all Firebase Authentication users.
 * This is a server-side flow intended for admin use.
 */

import { z } from 'zod';
import admin from 'firebase-admin';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import type { App } from 'firebase-admin/app';

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

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * It uses Application Default Credentials, which is the recommended approach
 * for server-side environments like Firebase App Hosting.
 */
function initializeAdminApp(): App {
    if (admin.apps.length > 0) {
        return admin.app();
    }
    
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
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

        // Catch potential ADC initialization errors.
        if (error.code === 'app/invalid-credential' || error.message.includes('Could not load the default credentials')) {
             return { error: 'Firebase Admin SDK not configured. The server environment is missing credentials.' };
        }

        return {
            error: error.message || 'An unknown error occurred while listing users.',
        };
    }
}
