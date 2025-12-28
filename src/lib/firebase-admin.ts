import { initializeApp, getApps, type App, type Credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { GoogleAuth, type AuthClient } from 'google-auth-library';

let adminApp: App;
let adminFirestore: Firestore;
let adminAuth: Auth;

/**
 * Custom credential that uses Application Default Credentials (ADC) without
 * specifying a quota project. This avoids the "serviceusage.services.use"
 * permission error that occurs when the service account doesn't have the
 * "Service Usage Consumer" role on the quota project.
 *
 * Firebase App Hosting's default service account may not have this role,
 * causing Identity Toolkit API calls (createUser, generatePasswordResetLink, etc.)
 * to fail with USER_PROJECT_DENIED errors.
 */
class ApplicationDefaultCredentialWithoutQuota implements Credential {
  private authClient: AuthClient | null = null;
  private googleAuth: GoogleAuth;

  constructor() {
    this.googleAuth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase',
      ],
      // Explicitly set quotaProjectId to empty string to disable quota project header
      // This prevents the "x-goog-user-project" header from being sent
      clientOptions: {
        quotaProjectId: '',
      },
    });
  }

  async getAccessToken(): Promise<{ access_token: string; expires_in: number }> {
    if (!this.authClient) {
      this.authClient = await this.googleAuth.getClient();
      // Clear quota project on the client as well
      if ('quotaProjectId' in this.authClient) {
        (this.authClient as { quotaProjectId?: string }).quotaProjectId = undefined;
      }
    }
    const tokenResponse = await this.authClient.getAccessToken();
    return {
      access_token: tokenResponse.token || '',
      expires_in: 3600, // Default to 1 hour, actual expiry is managed by the auth library
    };
  }
}

function initializeAdminApp() {
  if (getApps().length === 0) {
    // Use custom credential that doesn't include quota project
    // This avoids USER_PROJECT_DENIED errors on Firebase App Hosting
    // where the service account may not have serviceUsageConsumer role
    adminApp = initializeApp({
      credential: new ApplicationDefaultCredentialWithoutQuota(),
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
