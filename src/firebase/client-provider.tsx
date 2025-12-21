'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { firebaseApp, auth, firestore } from '@/firebase';
import { Loader2 } from 'lucide-react';

/**
 * This provider is responsible for ensuring that Firebase is initialized
 * on the client-side and that the services are ready before rendering
 * the rest of the application. It shows a loading screen while waiting.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  useEffect(() => {
    // The mere act of importing from '@/firebase' initializes the services.
    // We use a state to track that this client-side effect has run.
    setIsFirebaseInitialized(true);
  }, []);

  // While waiting for the client-side effect to run, show a loading screen.
  // This prevents any child components from trying to use Firebase too early.
  if (!isFirebaseInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
