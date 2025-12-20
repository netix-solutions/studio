
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  getAuth,
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

const { auth } = initializeFirebase();
const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google: ', error);
    return null;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
  }
};
