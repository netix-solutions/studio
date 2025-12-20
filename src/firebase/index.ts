'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!firebaseApp && typeof window !== 'undefined') {
    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      try {
        // This will use the Firebase App Hosting environment variables
        firebaseApp = initializeApp();
      } catch (e) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
        }
        // Fallback to the explicit config for development or if auto-init fails
        firebaseApp = initializeApp(firebaseConfig);
      }
    }
    
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }

  if (!firebaseApp || !auth || !firestore) {
    // This case can happen during Server-Side Rendering.
    // The client-side `FirebaseClientProvider` will handle the actual initialization.
    // We return a structure that won't immediately crash the app if accessed cautiously.
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
    };
  }

  return { firebaseApp, auth, firestore };
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
