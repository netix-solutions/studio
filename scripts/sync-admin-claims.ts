/**
 * Script to sync admin custom claims for all existing admins.
 * Run this once after deploying Cloud Functions to set claims for existing admins.
 *
 * Usage:
 *   npx ts-node scripts/sync-admin-claims.ts
 *
 * Or from the browser console while logged in as an admin:
 *   const { getFunctions, httpsCallable } = await import('firebase/functions');
 *   const functions = getFunctions();
 *   const syncClaims = httpsCallable(functions, 'syncAllAdminClaims');
 *   const result = await syncClaims();
 *   console.log(result);
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Your Firebase config - copy from your firebase config file
const firebaseConfig = {
  // TODO: Add your Firebase config here
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const functions = getFunctions(app);

  // Get credentials from environment or prompt
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
    console.log('\nUsage:');
    console.log('  ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword npx ts-node scripts/sync-admin-claims.ts');
    process.exit(1);
  }

  try {
    console.log('Signing in as admin...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in successfully');

    console.log('Calling syncAllAdminClaims...');
    const syncClaims = httpsCallable(functions, 'syncAllAdminClaims');
    const result = await syncClaims();

    console.log('\nResult:', JSON.stringify(result.data, null, 2));
    console.log('\n✅ Admin claims synced successfully!');
    console.log('\nIMPORTANT: Admins must sign out and sign back in for the new claims to take effect.');
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
