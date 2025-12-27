'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let firebaseApp: FirebaseApp;

// This function initializes and returns a SINGLETON instance of Firebase services.
// It ensures that Firebase is initialized only once.
if (!getApps().length) {
  // Initialize with config if no apps are present.
  firebaseApp = initializeApp(firebaseConfig);
} else {
  // Use the existing app if already initialized.
  firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export { firebaseApp, auth, firestore, storage };
export * from './provider';
export * from './client-provider';
export * from './errors';
