import { initializeApp, getApps, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { GoogleAuth } from 'google-auth-library';

let adminApp: App;
let adminFirestore: Firestore;
let adminAuth: Auth;

/**
 * Helper to make Identity Toolkit API calls without quota project header.
 * This avoids the "serviceusage.services.use" permission error that occurs
 * when the service account doesn't have the "Service Usage Consumer" role.
 *
 * Used as a fallback when standard Auth methods fail with USER_PROJECT_DENIED.
 */
async function getAuthClientWithoutQuota(): Promise<{ accessToken: string }> {
  const googleAuth = new GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase',
    ],
    clientOptions: {
      quotaProjectId: '',
    },
  });
  const client = await googleAuth.getClient();
  if ('quotaProjectId' in client) {
    (client as { quotaProjectId?: string }).quotaProjectId = undefined;
  }
  const tokenResponse = await client.getAccessToken();
  return { accessToken: tokenResponse.token || '' };
}

// Export for use in Auth operations that need quota-free credentials
export { getAuthClientWithoutQuota };

function initializeAdminApp() {
  if (getApps().length === 0) {
    // Use standard Application Default Credentials for initialization
    // This works correctly with Firestore's gRPC client
    // For Auth operations that fail with quota project errors, we handle them separately
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'studio-4614023416-d45cd',
    });
  } else {
    adminApp = getApps()[0];
  }

  adminFirestore = getFirestore(adminApp);
  adminAuth = getAuth(adminApp);
  return { adminApp, adminFirestore, adminAuth };
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    initializeAdminApp();
  }
  return adminFirestore;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    initializeAdminApp();
  }
  return adminAuth;
}

export { adminApp, adminFirestore, adminAuth };
