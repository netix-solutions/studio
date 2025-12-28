import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminFirestore: Firestore;
let adminAuth: Auth;

function initializeAdminApp() {
  if (getApps().length === 0) {
    // When running on Firebase App Hosting, explicitly use Application Default Credentials (ADC)
    // This ensures proper authentication for all Firebase Admin SDK operations,
    // including Identity Toolkit API calls (createUser, generatePasswordResetLink, etc.)
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
