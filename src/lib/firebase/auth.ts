
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
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User,
  PhoneAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getFirestore, collection, query, where, getDocs, limit, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { normalizePhoneNumber } from '@/lib/utils';
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

// --- Phone Number Authentication ---

/**
 * Sets up a reCAPTCHA verifier for phone number authentication.
 * This should be called once when the component mounts.
 * @param auth - Firebase Auth instance
 * @param container - The HTML element where reCAPTCHA will be rendered
 * @returns {RecaptchaVerifier} The reCAPTCHA verifier instance
 */
export const setupRecaptcha = (auth: Auth, container: HTMLElement): RecaptchaVerifier => {
    // This will be attached to window by the Firebase SDK
    const globalRecaptcha = (window as any).recaptchaVerifier;

    if (globalRecaptcha) {
        // If it already exists, clear the previous instance to avoid conflicts
        globalRecaptcha.clear();
    }

    const recaptchaVerifier = new RecaptchaVerifier(auth, container, {
        size: 'invisible',
        callback: (response: any) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
            console.log('reCAPTCHA solved');
        },
    });

    (window as any).recaptchaVerifier = recaptchaVerifier;
    return recaptchaVerifier;
};

/**
 * Sends a verification code to the user's phone number.
 * @param auth - Firebase Auth instance
 * @param phoneNumber - The phone number in E.164 format (e.g., +15551234567)
 * @param appVerifier - The reCAPTCHA verifier instance
 * @returns {Promise<ConfirmationResult>} A confirmation result object to use for signing in
 */
export const sendPhoneVerificationCode = (auth: Auth, phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};

/**
 * Signs the user in with the verification code.
 * @param confirmationResult - The result object from sendPhoneVerificationCode
 * @param verificationCode - The 6-digit code from the SMS message
 * @returns {Promise<UserCredential>} The user credential on successful sign-in
 */
export const signInWithCode = (confirmationResult: ConfirmationResult, verificationCode: string): Promise<UserCredential> => {
    return confirmationResult.confirm(verificationCode);
};

// --- Account Merging for Phone Sign-in ---

interface MergeResult {
    success: boolean;
    merged: boolean;
    existingUserId?: string;
    message?: string;
}

/**
 * After phone sign-in, this function checks if the phone number matches an existing
 * user or lead, and sets up the user document appropriately.
 *
 * This ensures that:
 * 1. If a user exists with this phone number, their data is linked
 * 2. If a lead exists with this phone number, their data is copied to the user
 * 3. The phone number is stored in the user document for future lookups
 *
 * @param user - The Firebase user from phone sign-in
 * @param phoneNumber - The phone number used for sign-in
 * @returns {Promise<MergeResult>} Result of the merge operation
 */
export const mergePhoneUserWithExistingAccount = async (
    user: User,
    phoneNumber: string
): Promise<MergeResult> => {
    const firestore = getFirestore(firebaseApp);
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
        return { success: false, merged: false, message: 'Invalid phone number format' };
    }

    try {
        // First, check if this user already has a document (returning phone user)
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            // User document exists, just ensure phone is stored
            const userData = userDocSnap.data();
            if (!userData.phoneNumber && !userData.phone && !userData.cellPhone) {
                await updateDoc(userDocRef, {
                    phoneNumber: normalizedPhone,
                    updatedAt: serverTimestamp(),
                });
            }
            return { success: true, merged: false, message: 'Existing user document found' };
        }

        // No user document exists for this phone user, look for matching accounts
        const batch = writeBatch(firestore);
        let userData: { [key: string]: any } = {
            id: user.uid,
            phoneNumber: normalizedPhone,
            role: 'user',
            createdAt: serverTimestamp(),
        };
        let foundExistingUser = false;
        let existingUserId: string | undefined;

        // Strategy 1: Look for a user document with matching phone number
        const usersRef = collection(firestore, 'users');

        // Check multiple phone fields that might contain the phone number
        const phoneVariants = [normalizedPhone];
        // Also check without +1 prefix for legacy data
        if (normalizedPhone.startsWith('+1')) {
            phoneVariants.push(normalizedPhone.substring(2)); // Remove +1
            phoneVariants.push(`(${normalizedPhone.substring(2, 5)}) ${normalizedPhone.substring(5, 8)}-${normalizedPhone.substring(8)}`); // Formatted
        }

        for (const phoneVariant of phoneVariants) {
            // Check phoneNumber field
            let userQuery = query(usersRef, where('phoneNumber', '==', phoneVariant), limit(1));
            let userSnapshot = await getDocs(userQuery);

            if (userSnapshot.empty) {
                // Check phone field
                userQuery = query(usersRef, where('phone', '==', phoneVariant), limit(1));
                userSnapshot = await getDocs(userQuery);
            }

            if (userSnapshot.empty) {
                // Check cellPhone field
                userQuery = query(usersRef, where('cellPhone', '==', phoneVariant), limit(1));
                userSnapshot = await getDocs(userQuery);
            }

            if (!userSnapshot.empty) {
                const existingUserDoc = userSnapshot.docs[0];
                const existingUserData = existingUserDoc.data();
                existingUserId = existingUserDoc.id;

                // Merge existing user data into new user
                userData = {
                    ...existingUserData,
                    ...userData,
                    email: existingUserData.email || user.email,
                    linkedFromUserId: existingUserId,
                    linkedAt: serverTimestamp(),
                };

                // Update the old user document to indicate it's been linked
                const oldUserRef = doc(firestore, 'users', existingUserId);
                batch.update(oldUserRef, {
                    linkedToPhoneUserId: user.uid,
                    linkedAt: serverTimestamp(),
                });

                // Copy advertisements from the old user to the new user
                try {
                    const oldAdsRef = collection(firestore, 'users', existingUserId, 'advertisements');
                    const oldAdsSnapshot = await getDocs(oldAdsRef);

                    for (const adDoc of oldAdsSnapshot.docs) {
                        const adData = adDoc.data();
                        const newAdRef = doc(firestore, 'users', user.uid, 'advertisements', adDoc.id);
                        batch.set(newAdRef, {
                            ...adData,
                            userId: user.uid,
                            linkedFromUserId: existingUserId,
                            linkedAt: serverTimestamp(),
                        });
                    }
                } catch (adError) {
                    console.warn('Could not copy advertisements:', adError);
                }

                // Copy subscriptions from the old customer to the new one
                try {
                    // First, ensure the customer document exists for the new user
                    const newCustomerRef = doc(firestore, 'customers', user.uid);
                    const oldCustomerRef = doc(firestore, 'customers', existingUserId);
                    const oldCustomerSnap = await getDoc(oldCustomerRef);

                    if (oldCustomerSnap.exists()) {
                        const oldCustomerData = oldCustomerSnap.data();
                        batch.set(newCustomerRef, {
                            ...oldCustomerData,
                            linkedFromCustomerId: existingUserId,
                            linkedAt: serverTimestamp(),
                        }, { merge: true });

                        // Copy subscriptions
                        const oldSubsRef = collection(firestore, 'customers', existingUserId, 'subscriptions');
                        const oldSubsSnapshot = await getDocs(oldSubsRef);

                        for (const subDoc of oldSubsSnapshot.docs) {
                            const subData = subDoc.data();
                            const newSubRef = doc(firestore, 'customers', user.uid, 'subscriptions', subDoc.id);
                            batch.set(newSubRef, {
                                ...subData,
                                linkedFromCustomerId: existingUserId,
                                linkedAt: serverTimestamp(),
                            });
                        }
                    }
                } catch (subError) {
                    console.warn('Could not copy subscriptions:', subError);
                }

                foundExistingUser = true;
                break;
            }
        }

        // Strategy 2: If no user found, look for a lead with matching phone
        if (!foundExistingUser) {
            const leadsRef = collection(firestore, 'leads');

            for (const phoneVariant of phoneVariants) {
                const leadQuery = query(leadsRef, where('phone', '==', phoneVariant), limit(1));
                const leadSnapshot = await getDocs(leadQuery);

                if (!leadSnapshot.empty) {
                    const leadDoc = leadSnapshot.docs[0];
                    const leadData = leadDoc.data();

                    // Merge lead data into user data
                    userData = {
                        ...userData,
                        businessName: leadData.businessName || '',
                        contactName: leadData.contactName || `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim(),
                        firstName: leadData.firstName || '',
                        lastName: leadData.lastName || '',
                        email: leadData.email || user.email || '',
                        phone: leadData.phone || normalizedPhone,
                    };

                    // Mark lead as converted
                    const leadDocRef = doc(firestore, 'leads', leadDoc.id);
                    batch.update(leadDocRef, {
                        convertedToCustomerId: user.uid,
                        convertedAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });

                    break;
                }
            }
        }

        // Create the user document
        batch.set(userDocRef, userData, { merge: true });

        // Commit all changes
        await batch.commit();

        return {
            success: true,
            merged: foundExistingUser,
            existingUserId,
            message: foundExistingUser
                ? `Account merged with existing user ${existingUserId}`
                : 'New user document created',
        };
    } catch (error: any) {
        console.error('Error merging phone user with existing account:', error);
        return {
            success: false,
            merged: false,
            message: error.message || 'Failed to merge accounts',
        };
    }
};

/**
 * Complete phone sign-in flow that includes account merging.
 * This is the main function to use for phone sign-in.
 *
 * @param confirmationResult - The result object from sendPhoneVerificationCode
 * @param verificationCode - The 6-digit code from the SMS message
 * @param phoneNumber - The original phone number used for sign-in
 * @returns {Promise<{credential: UserCredential, mergeResult: MergeResult}>}
 */
export const completePhoneSignIn = async (
    confirmationResult: ConfirmationResult,
    verificationCode: string,
    phoneNumber: string
): Promise<{ credential: UserCredential; mergeResult: MergeResult }> => {
    // First, complete the sign-in
    const credential = await confirmationResult.confirm(verificationCode);

    // Then, attempt to merge with existing account
    const mergeResult = await mergePhoneUserWithExistingAccount(credential.user, phoneNumber);

    return { credential, mergeResult };
};
