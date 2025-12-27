import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function that triggers when a document is created in the roles_admin collection.
 * It sets the 'admin' custom claim on the user's Firebase Auth token.
 *
 * This is required for Firebase Storage rules to recognize admin users,
 * since Storage rules cannot query Firestore directly.
 */
export const setAdminClaim = functions.firestore
  .document('roles_admin/{userId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;

    try {
      // Set the admin custom claim on the user's token
      await admin.auth().setCustomUserClaims(userId, { admin: true });

      console.log(`Successfully set admin claim for user: ${userId}`);

      // Update the document to indicate the claim has been set
      await snap.ref.update({
        claimSet: true,
        claimSetAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, userId };
    } catch (error) {
      console.error(`Error setting admin claim for user ${userId}:`, error);
      throw error;
    }
  });

/**
 * Cloud Function that triggers when a document is deleted from the roles_admin collection.
 * It removes the 'admin' custom claim from the user's Firebase Auth token.
 */
export const removeAdminClaim = functions.firestore
  .document('roles_admin/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId;

    try {
      // Remove the admin custom claim by setting it to null
      await admin.auth().setCustomUserClaims(userId, { admin: null });

      console.log(`Successfully removed admin claim for user: ${userId}`);

      return { success: true, userId };
    } catch (error) {
      console.error(`Error removing admin claim for user ${userId}:`, error);
      throw error;
    }
  });
