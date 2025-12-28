
import {
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  type ActionCodeSettings,
} from 'firebase/auth';
import { doc, setDoc, getFirestore, collection, query, where, getDocs, limit, writeBatch, serverTimestamp } from 'firebase/firestore';
import { firebaseApp } from '@/firebase';

export const signInWithEmail = (auth: Auth, email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (auth: Auth, email: string, password: string): Promise<UserCredential> => {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user) {
        const firestore = getFirestore(firebaseApp);
        const batch = writeBatch(firestore);

        // 1. Find the original lead document by email
        const leadsRef = collection(firestore, 'leads');
        const q = query(leadsRef, where('email', '==', email), limit(1));
        const leadSnapshot = await getDocs(q);

        let userData: { [key: string]: any } = {
            id: user.uid,
            email: user.email,
            role: 'user', // Default role
        };

        if (!leadSnapshot.empty) {
            const leadDoc = leadSnapshot.docs[0];
            const leadData = leadDoc.data();

            // 2. Merge lead data into the new user data
            userData = {
                ...userData,
                businessName: leadData.businessName || '',
                contactName: leadData.contactName || `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim(),
                phone: leadData.phone || '',
                // Carry over any other relevant fields from the lead
            };

            // 3. Mark the lead as converted
            const leadDocRef = doc(firestore, 'leads', leadDoc.id);
            batch.update(leadDocRef, {
                convertedToCustomerId: user.uid,
                convertedAt: serverTimestamp(),
                stage: 'won',
                updatedAt: serverTimestamp(),
            });
        } else {
             // Fallback if no lead is found (user registers directly)
             const contactName = user.displayName || email.split('@')[0];
             const nameParts = contactName.split(' ');
             const firstName = nameParts[0] || '';
             const lastName = nameParts.slice(1).join(' ') || '';
             userData.contactName = contactName;
             userData.firstName = firstName;
             userData.lastName = lastName;
        }

        // 4. Create the user document in a batch write
        const userDocRef = doc(firestore, 'users', user.uid);
        batch.set(userDocRef, userData, { merge: true });

        // Commit all batched writes (user creation and lead update if applicable)
        await batch.commit();
    }
    
    return userCredential;
};


export const signOutUser = (auth: Auth) => {
  return signOut(auth);
};

export const sendPasswordReset = (auth: Auth, email: string) => {
    return sendPasswordResetEmail(auth, email);
};

// --- Email Link Authentication ---

const actionCodeSettings: ActionCodeSettings = {
    // URL you want to redirect back to. The domain (www.example.com) for this
    // URL must be whitelisted in the Firebase Console.
    url: typeof window !== 'undefined' ? `${window.location.origin}/account` : 'http://localhost:3000/account',
    // This must be true.
    handleCodeInApp: true,
};

export const sendSignInLink = (auth: Auth, email: string) => {
    return sendSignInLinkToEmail(auth, email, actionCodeSettings);
};

export const checkIsSignInWithEmailLink = (auth: Auth, emailLink: string) => {
    return isSignInWithEmailLink(auth, emailLink);
};

export const signInWithEmailLink = (auth: Auth, email: string, emailLink: string) => {
    return firebaseSignInWithEmailLink(auth, email, emailLink);
}
