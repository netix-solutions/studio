import {
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { firebaseApp } from '@/firebase';

export const signInWithEmail = (auth: Auth, email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (auth: Auth, email: string, password: string) => {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user) {
        // Create a document in the 'users' collection
        const firestore = getFirestore(firebaseApp);
        const userDocRef = doc(firestore, 'users', user.uid);
        
        // When registering with email/password, there isn't a display name or photo URL by default
        const contactName = user.displayName || email.split('@')[0];
        const [firstName, lastName] = contactName.split(' ');

        await setDoc(userDocRef, {
            id: user.uid,
            email: user.email,
            contactName: contactName,
            firstName: firstName || '',
            lastName: lastName || '',
            role: 'user', // Default role
        }, { merge: true });
    }
    
    return userCredential;
};

export const signOutUser = (auth: Auth) => {
  return signOut(auth);
};

export const sendPasswordReset = (auth: Auth, email: string) => {
    return sendPasswordResetEmail(auth, email);
};

    