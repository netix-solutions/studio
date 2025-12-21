'use server';
/**
 * @fileOverview A flow for creating a new Firebase Authentication user.
 * This is a server-side flow that should be called from a client component.
 */

import { z } from 'zod';
import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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
      // Fallback or throw an error, depending on desired behavior.
      // Here we'll let it fallback to ADC and potentially fail there if not configured.
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

        if (error.code === 'app/invalid-credential' || (error.message && error.message.includes('Could not load the default credentials'))) {
             return { error: 'Firebase Admin SDK not configured. The server environment is missing credentials. Please set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.' };
        }

        return {
            error: error.message || 'An unknown error occurred during user creation.',
        };
    }
}