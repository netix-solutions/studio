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
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string) - works in all environments
 * 2. GOOGLE_APPLICATION_CREDENTIALS env var (file path) - uses applicationDefault()
 * 3. Google Cloud environment (automatic ADC) - uses applicationDefault()
 *
 * Using cert() with a service account key is preferred because:
 * - It works correctly with Firestore's gRPC client
 * - It doesn't have quota project issues that can affect Auth operations
 * - It works in non-GCP environments (Vercel, local dev, etc.)
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
      // Fall through to applicationDefault
    }
  }

  // Fall back to Application Default Credentials
  // This works when:
  // - GOOGLE_APPLICATION_CREDENTIALS env var points to a service account file
  // - Running in Google Cloud (Cloud Run, Cloud Functions, App Engine, etc.)
  console.log('Using Application Default Credentials for Firebase Admin initialization');
  return applicationDefault();
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
