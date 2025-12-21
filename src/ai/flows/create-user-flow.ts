'use server';
/**
 * @fileOverview A flow for creating a new Firebase Authentication user.
 * This is a server-side flow that should be called from a client component.
 */

import { z } from 'zod';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import type { App } from 'firebase-admin/app';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  email: z.string().email().optional(),
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


export async function createUser(
  input: z.infer<typeof CreateUserInputSchema>
): Promise<z.infer<typeof CreateUserOutputSchema>> {
    try {
        const adminApp = initializeAdminApp();
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

        if (error.code === 'auth/email-already-exists') {
            return { error: 'A user with this email address already exists.' };
        }

        // Catch potential ADC initialization errors.
        if (error.code === 'app/invalid-credential' || error.message.includes('Could not load the default credentials')) {
             return { error: 'Firebase Admin SDK not configured. The server environment is missing credentials.' };
        }

        return {
            error: error.message || 'An unknown error occurred during user creation.',
        };
    }
}
