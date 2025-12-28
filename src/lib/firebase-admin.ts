import { initializeApp, getApps, cert, type App, type Credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { GoogleAuth, type GoogleAuthOptions } from 'google-auth-library';

let adminApp: App;
let adminFirestore: Firestore;
let adminAuth: Auth;

/**
 * Custom credential class that uses Application Default Credentials
 * but explicitly disables the quota project header.
 *
 * This prevents the "serviceusage.services.use" permission error that occurs
 * when the service account doesn't have the Service Usage Consumer role
 * on the quota project specified in ADC metadata.
 *
 * The quota project header (x-goog-user-project) is used for billing purposes
 * but Firebase Identity Toolkit API calls don't need it - they bill to the
 * Firebase project automatically.
 */
class ApplicationDefaultCredentialWithoutQuota implements Credential {
  private googleAuth: GoogleAuth;

  constructor() {
    const authOptions: GoogleAuthOptions = {
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase.database',
        'https://www.googleapis.com/auth/firebase.messaging',
        'https://www.googleapis.com/auth/identitytoolkit',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      clientOptions: {
        // Explicitly set quotaProjectId to empty string to disable quota project header
        // This prevents USER_PROJECT_DENIED errors when the service account
        // lacks serviceusage.services.use permission on the quota project
        quotaProjectId: '',
      },
    };

    this.googleAuth = new GoogleAuth(authOptions);
  }

  async getAccessToken(): Promise<{ access_token: string; expires_in: number }> {
    const client = await this.googleAuth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error('Failed to get access token from Application Default Credentials');
    }

    // Calculate expires_in from the expiry date if available
    // Default to 1 hour (3600 seconds) if not available
    let expiresIn = 3600;
    if ('expiryDate' in client && typeof client.expiryDate === 'number') {
      expiresIn = Math.floor((client.expiryDate - Date.now()) / 1000);
    }

    return {
      access_token: tokenResponse.token,
      expires_in: expiresIn,
    };
  }
}

/**
 * Get the appropriate credential for Firebase Admin SDK initialization.
 *
 * Priority:
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string) - works in all environments
 * 2. Application Default Credentials without quota project - avoids permission errors
 *
 * Using cert() with a service account key is preferred because:
 * - It works correctly with Firestore's gRPC client
 * - It doesn't have quota project issues that can affect Auth operations
 * - It works in non-GCP environments (Vercel, local dev, etc.)
 *
 * When falling back to ADC, we use a custom credential class that disables
 * the quota project header to avoid USER_PROJECT_DENIED errors when calling
 * Firebase Auth (Identity Toolkit) APIs.
 */
function getCredential(): Credential {
  // Check for service account key in environment variable
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      // Parse the JSON service account key
      const serviceAccount = JSON.parse(serviceAccountKey);
      console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY for Firebase Admin initialization');
      return cert(serviceAccount);
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      // Fall through to ADC without quota project
    }
  }

  // Fall back to Application Default Credentials without quota project header
  // This avoids USER_PROJECT_DENIED errors when the service account lacks
  // the serviceusage.services.use permission on the quota project
  console.log('Using Application Default Credentials (without quota project) for Firebase Admin initialization');
  return new ApplicationDefaultCredentialWithoutQuota();
}

function initializeAdminApp() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'studio-4614023416-d45cd';

    adminApp = initializeApp({
      credential: getCredential(),
      projectId,
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
