'use server';
/**
 * @fileOverview A flow for creating a new Firebase Authentication user.
 * This is a server-side flow that should be called from a client component.
 */

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
let adminApp: App;
if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    adminApp = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    adminApp = getApps()[0];
}


export async function createUser(
  input: z.infer<typeof CreateUserInputSchema>
): Promise<z.infer<typeof CreateUserOutputSchema>> {
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
