import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Active subscription statuses that allow ads to be shown
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

// Inactive subscription statuses that should cancel ads
const INACTIVE_SUBSCRIPTION_STATUSES = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];

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

/**
 * HTTP callable function to sync admin claims for all existing admins in roles_admin.
 * Call this once after deploying to set claims for existing admins.
 *
 * Usage: Call from Firebase Console or via HTTP request (requires authentication)
 */
export const syncAllAdminClaims = functions.https.onCall(async (data, context) => {
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
    const results: { userId: string; success: boolean; error?: string }[] = [];

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
      } catch (error: any) {
        results.push({ userId, success: false, error: error.message });
        console.error(`Failed to set claim for ${userId}:`, error);
      }
    }

    return {
      success: true,
      totalAdmins: rolesSnapshot.size,
      results,
    };
  } catch (error: any) {
    console.error('Error syncing admin claims:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function that triggers when a subscription document is updated.
 * When a subscription status changes to an inactive state (canceled, unpaid, past_due),
 * it automatically:
 * 1. Updates all advertisements for that customer to 'canceled' status
 * 2. Archives any associated live_ads
 *
 * This ensures ads stop showing immediately when payments fail or subscriptions are canceled.
 */
export const onSubscriptionStatusChange = functions.firestore
  .document('customers/{customerId}/subscriptions/{subscriptionId}')
  .onUpdate(async (change, context) => {
    const customerId = context.params.customerId;
    const subscriptionId = context.params.subscriptionId;

    const beforeData = change.before.data();
    const afterData = change.after.data();

    const previousStatus = beforeData?.status;
    const newStatus = afterData?.status;

    // Only process if status actually changed
    if (previousStatus === newStatus) {
      return null;
    }

    console.log(`Subscription ${subscriptionId} for customer ${customerId} status changed: ${previousStatus} -> ${newStatus}`);

    // If transitioning from active to inactive, cancel all ads
    if (
      ACTIVE_SUBSCRIPTION_STATUSES.includes(previousStatus) &&
      INACTIVE_SUBSCRIPTION_STATUSES.includes(newStatus)
    ) {
      console.log(`Subscription ${subscriptionId} became inactive. Canceling ads for customer ${customerId}`);
      await cancelAdsForCustomer(customerId, subscriptionId, newStatus);
    }

    // If transitioning from inactive to active (reactivation), we could potentially
    // reactivate ads, but that's a business decision - for now we just log it
    if (
      INACTIVE_SUBSCRIPTION_STATUSES.includes(previousStatus) &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(newStatus)
    ) {
      console.log(`Subscription ${subscriptionId} reactivated for customer ${customerId}. Ads may need manual reactivation.`);
    }

    return null;
  });

/**
 * Cloud Function that triggers when a subscription is deleted.
 * This handles the case where a subscription is completely removed from Stripe.
 */
export const onSubscriptionDeleted = functions.firestore
  .document('customers/{customerId}/subscriptions/{subscriptionId}')
  .onDelete(async (snap, context) => {
    const customerId = context.params.customerId;
    const subscriptionId = context.params.subscriptionId;
    const deletedData = snap.data();

    console.log(`Subscription ${subscriptionId} deleted for customer ${customerId}`);

    // Check if customer has any other active subscriptions
    const hasActiveSubscription = await checkForActiveSubscriptions(customerId);

    if (!hasActiveSubscription) {
      console.log(`Customer ${customerId} has no remaining active subscriptions. Canceling all ads.`);
      await cancelAdsForCustomer(customerId, subscriptionId, 'deleted');
    }

    return null;
  });

/**
 * Check if a customer has any active subscriptions
 */
async function checkForActiveSubscriptions(customerId: string): Promise<boolean> {
  const db = admin.firestore();
  const subscriptionsSnapshot = await db
    .collection('customers')
    .doc(customerId)
    .collection('subscriptions')
    .where('status', 'in', ACTIVE_SUBSCRIPTION_STATUSES)
    .limit(1)
    .get();

  return !subscriptionsSnapshot.empty;
}

/**
 * Cancel all advertisements and archive live_ads for a customer
 */
async function cancelAdsForCustomer(
  customerId: string,
  subscriptionId: string,
  reason: string
): Promise<void> {
  const db = admin.firestore();
  const batch = db.batch();
  let updatesCount = 0;

  try {
    // 1. Find and update all advertisements for this customer that are linked to this subscription
    const adsSnapshot = await db
      .collection('users')
      .doc(customerId)
      .collection('advertisements')
      .where('subscriptionId', '==', subscriptionId)
      .get();

    const liveAdIds: string[] = [];

    for (const adDoc of adsSnapshot.docs) {
      const adData = adDoc.data();
      const currentStatus = adData.status;

      // Only cancel ads that are in an active workflow state
      if (['info_needed', 'design_pending', 'in_review', 'customer_approval', 'approved', 'live', 'paused'].includes(currentStatus)) {
        batch.update(adDoc.ref, {
          status: 'canceled',
          canceledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelReason: `Subscription ${reason}`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          notes: `Auto-canceled: subscription status changed to ${reason}`,
        });
        updatesCount++;
        console.log(`Marked advertisement ${adDoc.id} as canceled`);

        // Collect live ad IDs to archive
        if (adData.liveAdId) {
          liveAdIds.push(adData.liveAdId);
        }
      }
    }

    // 2. Archive any associated live_ads
    for (const liveAdId of liveAdIds) {
      const liveAdRef = db.collection('live_ads').doc(liveAdId);
      const liveAdDoc = await liveAdRef.get();

      if (liveAdDoc.exists) {
        const liveAdData = liveAdDoc.data();
        if (liveAdData?.status === 'active' || liveAdData?.status === 'scheduled') {
          batch.update(liveAdRef, {
            status: 'archived',
            archivedAt: admin.firestore.FieldValue.serverTimestamp(),
            archiveReason: `Subscription ${reason}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          updatesCount++;
          console.log(`Archived live_ad ${liveAdId}`);
        }
      }
    }

    // 3. Also find any live_ads directly linked to this customer (in case some aren't linked to ads)
    const liveAdsSnapshot = await db
      .collection('live_ads')
      .where('customerId', '==', customerId)
      .where('status', 'in', ['active', 'scheduled'])
      .get();

    for (const liveAdDoc of liveAdsSnapshot.docs) {
      // Skip if already in our batch
      if (liveAdIds.includes(liveAdDoc.id)) continue;

      batch.update(liveAdDoc.ref, {
        status: 'archived',
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        archiveReason: `Subscription ${reason}`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updatesCount++;
      console.log(`Archived live_ad ${liveAdDoc.id} (direct customer link)`);
    }

    // Commit all updates
    if (updatesCount > 0) {
      await batch.commit();
      console.log(`Successfully canceled ${updatesCount} ads/live_ads for customer ${customerId}`);
    } else {
      console.log(`No active ads found to cancel for customer ${customerId}`);
    }

  } catch (error) {
    console.error(`Error canceling ads for customer ${customerId}:`, error);
    throw error;
  }
}
