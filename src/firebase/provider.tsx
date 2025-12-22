
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth, User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// This interface defines the shape of the context's value.
// It includes the core Firebase services and the user's authentication state.
export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
}

// This is the actual React Context object. It's what components will consume.
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// This is a standard React Provider component. It will wrap the part of the app
// that needs access to Firebase services.
export function FirebaseProvider({
  children,
  firebaseApp,
  auth,
  firestore,
}: {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsUserLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  // We use useMemo to prevent unnecessary re-renders of consumers.
  // The context value will only be recalculated if the dependencies change.
  const value = useMemo(
    () => ({
      firebaseApp,
      auth,
      firestore,
      user,
      isUserLoading,
    }),
    [firebaseApp, auth, firestore, user, isUserLoading]
  );

  return (
    <FirebaseContext.Provider value={value}>
        {children}
    </FirebaseContext.Provider>
  );
}

// Custom hook to easily access the Firebase context.
// This simplifies consuming the context in other components.
export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

// A specific hook to get just the user state.
// This is useful for components that only need to know about the user.
export function useUser() {
  const { user, isUserLoading } = useFirebase();
  return { user, isUserLoading };
}

// A specific hook to get just the Auth service.
export function useAuth() {
    const { auth } = useFirebase();
    return auth;
}

// A specific hook to get just the Firestore service.
export function useFirestore() {
  const { firestore } = useFirebase();
  return firestore;
}
