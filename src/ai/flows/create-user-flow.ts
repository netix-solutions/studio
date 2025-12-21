'use server';
/**
 * @fileOverview A flow for creating a new Firebase Authentication user.
 * This is a server-side flow that should be called from a client component.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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
if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async ({ email, password }) => {
    try {
      const userRecord = await getAuth().createUser({
        email,
        password,
      });
      return {
        uid: userRecord.uid,
        email: userRecord.email,
      };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return {
        error: error.message || 'An unknown error occurred during user creation.',
      };
    }
  }
);

export async function createUser(
  input: z.infer<typeof CreateUserInputSchema>
): Promise<z.infer<typeof CreateUserOutputSchema>> {
  return createUserFlow(input);
}
