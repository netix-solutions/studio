import {
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

export const signInWithEmail = (auth: Auth, email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = (auth: Auth, email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signOutUser = (auth: Auth | null) => {
  if (!auth) {
    return Promise.resolve();
  }
  return signOut(auth);
};

export const sendPasswordReset = (auth: Auth, email: string) => {
    return sendPasswordResetEmail(auth, email);
};
