import { initializeApp, getApps, cert, applicationDefault, type App, type Credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminFirestore: Firestore;
let adminAuth: Auth;

/**
 * Get the appropriate credential for Firebase Admin SDK initialization.
 *
 * Priority:
 * 1. GOOGLE_SERVICE_ACCOUNT_KEY env var (JSON string) - works in all environments
 * 2. Application Default Credentials with quota project disabled - avoids permission errors
 *
 * Using cert() with a service account key is preferred because:
 * - It works correctly with Firestore's gRPC client
 * - It doesn't have quota project issues that can affect Auth operations
 * - It works in non-GCP environments (Vercel, local dev, etc.)
 *
 * When falling back to ADC, we disable the quota project header by setting
 * GOOGLE_CLOUD_QUOTA_PROJECT to empty string. This prevents USER_PROJECT_DENIED
 * errors when calling Firebase Auth (Identity Toolkit) APIs.
 */
function getCredential(): Credential {
  // Check for service account key in environment variable
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      // Parse the JSON service account key
      const serviceAccount = JSON.parse(serviceAccountKey);
      console.log('Using GOOGLE_SERVICE_ACCOUNT_KEY for Firebase Admin initialization');
      return cert(serviceAccount);
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', error);
      // Fall through to ADC
    }
  }

  // Disable quota project header to prevent USER_PROJECT_DENIED errors
  // when calling Identity Toolkit APIs (createUser, generatePasswordResetLink, etc.)
  // The quota project header (x-goog-user-project) requires serviceusage.services.use
  // permission which may not be granted. Firebase services bill to the project automatically.
  if (!process.env.GOOGLE_CLOUD_QUOTA_PROJECT) {
    process.env.GOOGLE_CLOUD_QUOTA_PROJECT = '';
  }

  console.log('Using Application Default Credentials for Firebase Admin initialization');
  return applicationDefault();
}

function initializeAdminApp() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'studio-4614023416-d45cd';

    try {
      adminApp = initializeApp({
        credential: getCredential(),
        projectId,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('default credentials') || errorMessage.includes('Could not load')) {
        throw new Error(
          'Firebase Admin SDK initialization failed: Application Default Credentials are not available. ' +
          'Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable with your service account JSON key. ' +
          'In Cloud Workstations, ensure the environment variable is configured.'
        );
      }
      throw error;
    }
  } else {
    adminApp = getApps()[0];
  }

  try {
    adminFirestore = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    if (errorMessage.includes('default credentials') || errorMessage.includes('Could not load')) {
      throw new Error(
        'Firebase Admin SDK initialization failed: Application Default Credentials are not available. ' +
        'Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable with your service account JSON key. ' +
        'In Cloud Workstations, ensure the environment variable is configured.'
      );
    }
    throw error;
  }
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

/**
 * Initialize and get both Admin Auth and Firestore
 * Convenience function for API routes
 */
export function initAdmin(): { auth: Auth; db: Firestore } {
  if (!adminAuth || !adminFirestore) {
    initializeAdminApp();
  }
  return { auth: adminAuth, db: adminFirestore };
}

export { adminApp, adminFirestore, adminAuth };
