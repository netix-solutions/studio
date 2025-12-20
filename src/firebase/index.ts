'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// This function initializes and returns a SINGLETON instance of Firebase services.
// It ensures that Firebase is initialized only once, whether on the server or client.
export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    // Client-side initialization
    if (!getApps().length) {
      // Initialize with config if no apps are present.
      // This is the standard client-side pattern.
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      // Use the existing app if already initialized.
      firebaseApp = getApp();
    }
  } else {
    // Server-side initialization
    if (!getApps().length) {
      // On the server, we also initialize if no app exists.
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      // And get the existing app if it's there.
      firebaseApp = getApp();
    }
  }

  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);

  // Return the initialized services. These will now be stable.
  return { firebaseApp, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';