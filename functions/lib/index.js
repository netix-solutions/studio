"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAllAdminClaims = exports.removeAdminClaim = exports.setAdminClaim = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
// Initialize Firebase Admin SDK
admin.initializeApp();
/**
 * Cloud Function that triggers when a document is created in the roles_admin collection.
 * It sets the 'admin' custom claim on the user's Firebase Auth token.
 *
 * This is required for Firebase Storage rules to recognize admin users,
 * since Storage rules cannot query Firestore directly.
 */
exports.setAdminClaim = functions.firestore
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
    }
    catch (error) {
        console.error(`Error setting admin claim for user ${userId}:`, error);
        throw error;
    }
});
/**
 * Cloud Function that triggers when a document is deleted from the roles_admin collection.
 * It removes the 'admin' custom claim from the user's Firebase Auth token.
 */
exports.removeAdminClaim = functions.firestore
    .document('roles_admin/{userId}')
    .onDelete(async (snap, context) => {
    const userId = context.params.userId;
    try {
        // Remove the admin custom claim by setting it to null
        await admin.auth().setCustomUserClaims(userId, { admin: null });
        console.log(`Successfully removed admin claim for user: ${userId}`);
        return { success: true, userId };
    }
    catch (error) {
        console.error(`Error removing admin claim for user ${userId}:`, error);
        throw error;
    }
});
/**
 * HTTP callable function to sync admin claims for all existing admins in roles_admin.
 * Call this once after deploying to set claims for existing admins.
 *
 * Usage: Call from Firebase Console or via HTTP request (requires authentication)
 */
exports.syncAllAdminClaims = functions.https.onCall(async (data, context) => {
    // Verify the caller is an admin (check Firestore since claims might not be set yet)
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const callerUid = context.auth.uid;
    const callerDoc = await admin.firestore().collection('roles_admin').doc(callerUid).get();
    if (!callerDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin to sync claims');
    }
    try {
        const rolesSnapshot = await admin.firestore().collection('roles_admin').get();
        const results = [];
        for (const doc of rolesSnapshot.docs) {
            const userId = doc.id;
            try {
                await admin.auth().setCustomUserClaims(userId, { admin: true });
                await doc.ref.update({
                    claimSet: true,
                    claimSetAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                results.push({ userId, success: true });
                console.log(`Set admin claim for: ${userId}`);
            }
            catch (error) {
                results.push({ userId, success: false, error: error.message });
                console.error(`Failed to set claim for ${userId}:`, error);
            }
        }
        return {
            success: true,
            totalAdmins: rolesSnapshot.size,
            results,
        };
    }
    catch (error) {
        console.error('Error syncing admin claims:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=index.js.map