'use server';
/**
 * @fileOverview A flow for creating a new Firebase Authentication user.
 * This is a server-side flow that should be called from a client component.
 */

import 'dotenv/config';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  email: z.string().email().optional(),
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


export async function createUser(
  input: z.infer<typeof CreateUserInputSchema>
): Promise<z.infer<typeof CreateUserOutputSchema>> {
    const adminApp = getAdminApp();
    if (!adminApp) {
        return {
            error: "Firebase Admin SDK is not configured. Please set the FIREBASE_SERVICE_ACCOUNT_KEY."
        }
    }

    try {
        const validatedInput = CreateUserInputSchema.parse(input);
        const userRecord = await getAuth(adminApp).createUser({
            email: validatedInput.email,
            password: validatedInput.password,
        });
        return {
            uid: userRecord.uid,
            email: userRecord.email,
        };
    } catch (error: any) {
        console.error('Error creating user:', error);
        
        if (error instanceof z.ZodError) {
            return {
                error: error.errors.map(e => e.message).join(', '),
            };
        }

        return {
            error: error.message || 'An unknown error occurred during user creation.',
        };
    }
}
