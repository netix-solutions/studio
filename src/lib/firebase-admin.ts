import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminFirestore: Firestore;

function initializeAdminApp() {
  if (getApps().length === 0) {
    // When running on Firebase App Hosting, credentials are automatically available
    // via Application Default Credentials (ADC)
    adminApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'studio-4614023416-d45cd',
    });
  } else {
    adminApp = getApps()[0];
  }

  adminFirestore = getFirestore(adminApp);
  return { adminApp, adminFirestore };
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    initializeAdminApp();
  }
  return adminFirestore;
}

export { adminApp, adminFirestore };
