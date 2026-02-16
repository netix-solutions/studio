"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAdSubscriptionCreateDirectoryListing = exports.processScheduledLeadEmails = exports.sendThreeHourDiscountEmails = exports.onSubscriptionCreated = exports.onSubscriptionDeleted = exports.onSubscriptionStatusChange = exports.syncAllAdminClaims = exports.removeAdminClaim = exports.setAdminClaim = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
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
/**
 * Cloud Function that triggers when a subscription document is updated.
 * When a subscription status changes to an inactive state (canceled, unpaid, past_due),
 * it automatically:
 * 1. Updates all advertisements for that customer to 'canceled' status
 * 2. Archives any associated live_ads
 *
 * This ensures ads stop showing immediately when payments fail or subscriptions are canceled.
 */
exports.onSubscriptionStatusChange = functions.firestore
    .document('customers/{customerId}/subscriptions/{subscriptionId}')
    .onUpdate(async (change, context) => {
    const customerId = context.params.customerId;
    const subscriptionId = context.params.subscriptionId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const previousStatus = beforeData === null || beforeData === void 0 ? void 0 : beforeData.status;
    const newStatus = afterData === null || afterData === void 0 ? void 0 : afterData.status;
    // Only process if status actually changed
    if (previousStatus === newStatus) {
        return null;
    }
    console.log(`Subscription ${subscriptionId} for customer ${customerId} status changed: ${previousStatus} -> ${newStatus}`);
    // If transitioning from active to inactive, cancel all ads
    if (ACTIVE_SUBSCRIPTION_STATUSES.includes(previousStatus) &&
        INACTIVE_SUBSCRIPTION_STATUSES.includes(newStatus)) {
        console.log(`Subscription ${subscriptionId} became inactive. Canceling ads for customer ${customerId}`);
        await cancelAdsForCustomer(customerId, subscriptionId, newStatus);
    }
    // If transitioning from inactive to active (reactivation), we could potentially
    // reactivate ads, but that's a business decision - for now we just log it
    if (INACTIVE_SUBSCRIPTION_STATUSES.includes(previousStatus) &&
        ACTIVE_SUBSCRIPTION_STATUSES.includes(newStatus)) {
        console.log(`Subscription ${subscriptionId} reactivated for customer ${customerId}. Ads may need manual reactivation.`);
    }
    return null;
});
/**
 * Cloud Function that triggers when a subscription is deleted.
 * This handles the case where a subscription is completely removed from Stripe.
 */
exports.onSubscriptionDeleted = functions.firestore
    .document('customers/{customerId}/subscriptions/{subscriptionId}')
    .onDelete(async (snap, context) => {
    const customerId = context.params.customerId;
    const subscriptionId = context.params.subscriptionId;
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
async function checkForActiveSubscriptions(customerId) {
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
async function cancelAdsForCustomer(customerId, subscriptionId, reason) {
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
        const liveAdIds = [];
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
                if ((liveAdData === null || liveAdData === void 0 ? void 0 : liveAdData.status) === 'active' || (liveAdData === null || liveAdData === void 0 ? void 0 : liveAdData.status) === 'scheduled') {
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
            if (liveAdIds.includes(liveAdDoc.id))
                continue;
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
        }
        else {
            console.log(`No active ads found to cancel for customer ${customerId}`);
        }
    }
    catch (error) {
        console.error(`Error canceling ads for customer ${customerId}:`, error);
        throw error;
    }
}
/**
 * Cloud Function that triggers when a subscription is created.
 * This marks the lead as converted to a customer.
 */
exports.onSubscriptionCreated = functions.firestore
    .document('customers/{customerId}/subscriptions/{subscriptionId}')
    .onCreate(async (snap, context) => {
    const customerId = context.params.customerId;
    const subscriptionData = snap.data();
    console.log(`New subscription created for customer ${customerId}`);
    try {
        const db = admin.firestore();
        // Find the lead by checking if there's a lead with this email that hasn't been converted
        const userDoc = await db.collection('users').doc(customerId).get();
        if (!userDoc.exists) {
            console.log(`User document not found for ${customerId}`);
            return null;
        }
        const userData = userDoc.data();
        const userEmail = userData === null || userData === void 0 ? void 0 : userData.email;
        if (!userEmail) {
            console.log(`No email found for user ${customerId}`);
            return null;
        }
        // Find lead by email that hasn't been converted yet
        const leadsSnapshot = await db
            .collection('leads')
            .where('email', '==', userEmail)
            .where('convertedToCustomerId', '==', null)
            .limit(1)
            .get();
        if (leadsSnapshot.empty) {
            console.log(`No unconverted lead found for email ${userEmail}`);
            return null;
        }
        const leadDoc = leadsSnapshot.docs[0];
        // Mark the lead as converted
        await leadDoc.ref.update({
            convertedToCustomerId: customerId,
            convertedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Marked lead ${leadDoc.id} as converted for customer ${customerId}`);
        // Log activity in the lead's activities subcollection
        const activityRef = db
            .collection('leads')
            .doc(leadDoc.id)
            .collection('activities')
            .doc();
        await activityRef.set({
            type: 'conversion',
            title: 'Converted to Customer',
            description: `Lead converted to customer with subscription ${context.params.subscriptionId}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: customerId,
            metadata: {
                subscriptionId: context.params.subscriptionId,
                subscriptionStatus: subscriptionData.status,
            },
        });
        return { success: true, leadId: leadDoc.id };
    }
    catch (error) {
        console.error(`Error marking lead as converted for customer ${customerId}:`, error);
        throw error;
    }
});
/**
 * Scheduled function that runs every hour to check for leads that should receive
 * the 3-hour discount email (TAKE10OFF)
 */
exports.sendThreeHourDiscountEmails = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const threeHoursAgo = new Date(now.toMillis() - 3 * 60 * 60 * 1000);
    console.log('Starting 3-hour discount email job...');
    try {
        // Find leads created 3+ hours ago that haven't converted and haven't received the discount email
        const leadsSnapshot = await db
            .collection('leads')
            .where('convertedToCustomerId', '==', null)
            .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(threeHoursAgo))
            .get();
        let emailsSent = 0;
        let alreadySent = 0;
        let errors = 0;
        for (const leadDoc of leadsSnapshot.docs) {
            const leadData = leadDoc.data();
            const leadId = leadDoc.id;
            // Check if we've already sent the 3-hour discount email
            if (leadData.discountEmailSent) {
                alreadySent++;
                continue;
            }
            // Get the discount email template
            const templateDoc = await db.collection('emailTemplates').doc('discount_offer').get();
            if (!templateDoc.exists) {
                console.error('Discount email template not found');
                continue;
            }
            const template = templateDoc.data();
            try {
                // Replace placeholders
                const contactName = leadData.contactName || leadData.firstName || 'there';
                const businessName = leadData.businessName || 'your business';
                const pricingLink = `${process.env.APP_URL || 'https://community-websites.com'}/pricing`;
                let emailContent = template.html
                    .replace(/\{\{contactName\}\}/g, contactName)
                    .replace(/\{\{businessName\}\}/g, businessName)
                    .replace(/\{\{pricingLink\}\}/g, pricingLink);
                const subject = template.subject
                    .replace(/\{\{contactName\}\}/g, contactName)
                    .replace(/\{\{businessName\}\}/g, businessName);
                // Send email via API
                const sendEmailResponse = await fetch(`${process.env.APP_URL || 'https://community-websites.com'}/api/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to: [leadData.email],
                        subject: subject,
                        html: emailContent,
                        recipientId: leadId,
                        templateId: 'discount_offer',
                        triggerType: 'automated_3hour_discount',
                        categories: ['automated', 'lead_nurture', 'discount_offer'],
                    }),
                });
                if (!sendEmailResponse.ok) {
                    throw new Error(`Email API returned ${sendEmailResponse.status}`);
                }
                // Mark that we sent the email
                await leadDoc.ref.update({
                    discountEmailSent: true,
                    discountEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                // Log activity
                await db
                    .collection('leads')
                    .doc(leadId)
                    .collection('activities')
                    .add({
                    type: 'email_sent',
                    title: 'Discount Email Sent',
                    description: 'Automated 3-hour discount email sent (TAKE10OFF)',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: 'system',
                    metadata: {
                        templateId: 'discount_offer',
                        triggerType: 'automated_3hour_discount',
                    },
                });
                emailsSent++;
                console.log(`Sent 3-hour discount email to lead ${leadId} (${leadData.email})`);
            }
            catch (emailError) {
                console.error(`Error sending email to lead ${leadId}:`, emailError);
                errors++;
            }
        }
        console.log(`3-hour discount email job completed: ${emailsSent} sent, ${alreadySent} already sent, ${errors} errors`);
        return { success: true, emailsSent, alreadySent, errors };
    }
    catch (error) {
        console.error('Error in 3-hour discount email job:', error);
        throw error;
    }
});
/**
 * Scheduled function that runs every hour to process scheduled lead emails
 */
exports.processScheduledLeadEmails = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    console.log('Starting scheduled lead emails job...');
    try {
        // Find scheduled emails that are due to be sent
        const scheduledEmailsSnapshot = await db
            .collection('scheduledLeadEmails')
            .where('status', '==', 'pending')
            .where('scheduledFor', '<=', now)
            .get();
        let emailsSent = 0;
        let errors = 0;
        for (const emailDoc of scheduledEmailsSnapshot.docs) {
            const emailData = emailDoc.data();
            const emailId = emailDoc.id;
            try {
                // Get the lead
                const leadDoc = await db.collection('leads').doc(emailData.leadId).get();
                if (!leadDoc.exists) {
                    console.error(`Lead ${emailData.leadId} not found`);
                    await emailDoc.ref.update({
                        status: 'failed',
                        error: 'Lead not found',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    errors++;
                    continue;
                }
                const leadData = leadDoc.data();
                // Check if lead has been converted - if so, skip
                if (leadData.convertedToCustomerId) {
                    console.log(`Lead ${emailData.leadId} has been converted, skipping email`);
                    await emailDoc.ref.update({
                        status: 'skipped',
                        skipReason: 'Lead converted to customer',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    continue;
                }
                // Get the email template
                const templateDoc = await db.collection('emailTemplates').doc(emailData.templateId).get();
                if (!templateDoc.exists) {
                    console.error(`Template ${emailData.templateId} not found`);
                    await emailDoc.ref.update({
                        status: 'failed',
                        error: 'Template not found',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    errors++;
                    continue;
                }
                const template = templateDoc.data();
                // Replace placeholders
                const contactName = leadData.contactName || leadData.firstName || 'there';
                const businessName = leadData.businessName || 'your business';
                const pricingLink = `${process.env.APP_URL || 'https://community-websites.com'}/pricing`;
                let emailContent = template.html
                    .replace(/\{\{contactName\}\}/g, contactName)
                    .replace(/\{\{businessName\}\}/g, businessName)
                    .replace(/\{\{pricingLink\}\}/g, pricingLink);
                const subject = template.subject
                    .replace(/\{\{contactName\}\}/g, contactName)
                    .replace(/\{\{businessName\}\}/g, businessName);
                // Send email via API
                const sendEmailResponse = await fetch(`${process.env.APP_URL || 'https://community-websites.com'}/api/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to: [leadData.email],
                        subject: subject,
                        html: emailContent,
                        recipientId: emailData.leadId,
                        templateId: emailData.templateId,
                        triggerType: 'scheduled_lead_email',
                        categories: ['scheduled', 'lead_nurture'],
                    }),
                });
                if (!sendEmailResponse.ok) {
                    throw new Error(`Email API returned ${sendEmailResponse.status}`);
                }
                // Mark email as sent
                await emailDoc.ref.update({
                    status: 'sent',
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                // Log activity
                await db
                    .collection('leads')
                    .doc(emailData.leadId)
                    .collection('activities')
                    .add({
                    type: 'email_sent',
                    title: 'Scheduled Email Sent',
                    description: `Scheduled email sent: ${template.name}`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: 'system',
                    metadata: {
                        templateId: emailData.templateId,
                        triggerType: 'scheduled_lead_email',
                        scheduledEmailId: emailId,
                    },
                });
                emailsSent++;
                console.log(`Sent scheduled email ${emailId} to lead ${emailData.leadId}`);
            }
            catch (emailError) {
                console.error(`Error sending scheduled email ${emailId}:`, emailError);
                await emailDoc.ref.update({
                    status: 'failed',
                    error: emailError.message,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                errors++;
            }
        }
        console.log(`Scheduled lead emails job completed: ${emailsSent} sent, ${errors} errors`);
        return { success: true, emailsSent, errors };
    }
    catch (error) {
        console.error('Error in scheduled lead emails job:', error);
        throw error;
    }
});
/**
 * Cloud Function that triggers when a subscription is created or updated.
 * Automatically creates a FREE directory listing for any ad subscription.
 *
 * When an ad subscription becomes active:
 * - Creates a directory listing (free benefit)
 * - Uses user/business data from their account
 * - Links to the ad subscription
 *
 * When subscription expires/cancels:
 * - Updates listing status to 'expired'
 */
exports.onAdSubscriptionCreateDirectoryListing = functions.firestore
    .document('customers/{userId}/subscriptions/{subscriptionId}')
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const subscriptionId = context.params.subscriptionId;
    // Handle deletion
    if (!change.after.exists) {
        console.log(`Subscription ${subscriptionId} deleted for user ${userId}`);
        await deactivateDirectoryListingForSubscription(userId, subscriptionId, 'deleted');
        return null;
    }
    const subscription = change.after.data();
    if (!subscription)
        return null;
    const status = subscription.status;
    try {
        // Create or update directory listing when subscription becomes active
        if (status === 'active' || status === 'trialing') {
            await createDirectoryListingFromSubscription(userId, subscriptionId, subscription);
        }
        // Deactivate listing when subscription becomes inactive
        else if (['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(status)) {
            await deactivateDirectoryListingForSubscription(userId, subscriptionId, status);
        }
        return null;
    }
    catch (error) {
        console.error(`Error handling directory listing for subscription ${subscriptionId}:`, error);
        throw error;
    }
});
/**
 * Create or update a FREE directory listing from an ad subscription
 */
async function createDirectoryListingFromSubscription(userId, subscriptionId, subscription) {
    const db = admin.firestore();
    try {
        // Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found, skipping directory listing creation`);
            return;
        }
        const userData = userDoc.data();
        // Check if listing already exists for this user
        const existingListingsSnapshot = await db
            .collection('directory_listings')
            .where('userId', '==', userId)
            .limit(1)
            .get();
        const listingData = {
            businessName: (userData === null || userData === void 0 ? void 0 : userData.businessName) || (userData === null || userData === void 0 ? void 0 : userData.displayName) || 'Business Name Needed',
            contactEmail: (userData === null || userData === void 0 ? void 0 : userData.email) || '',
            contactName: (userData === null || userData === void 0 ? void 0 : userData.contactName) || (userData === null || userData === void 0 ? void 0 : userData.displayName) || '',
            phone: (userData === null || userData === void 0 ? void 0 : userData.phone) || '',
            websiteUrl: (userData === null || userData === void 0 ? void 0 : userData.websiteUrl) || '',
            description: (userData === null || userData === void 0 ? void 0 : userData.businessDescription) || 'Please update your business description',
            category: (userData === null || userData === void 0 ? void 0 : userData.businessCategory) || 'other',
            logoUrl: (userData === null || userData === void 0 ? void 0 : userData.logoUrl) || '',
            bannerImageUrl: (userData === null || userData === void 0 ? void 0 : userData.bannerImageUrl) || '',
            address: (userData === null || userData === void 0 ? void 0 : userData.address) || '',
            city: (userData === null || userData === void 0 ? void 0 : userData.city) || '',
            state: (userData === null || userData === void 0 ? void 0 : userData.state) || '',
            zipCode: (userData === null || userData === void 0 ? void 0 : userData.zipCode) || '',
            socialLinks: (userData === null || userData === void 0 ? void 0 : userData.socialLinks) || {},
            userId,
            subscriptionStatus: 'active',
            subscriptionId,
            stripeCustomerId: subscription.customer || subscription.stripeCustomerId,
            currentPeriodEnd: subscription.current_period_end,
            status: 'active',
            tier: 'included', // Free with ad subscription
            isFeatured: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (!existingListingsSnapshot.empty) {
            // Update existing listing
            const listingRef = existingListingsSnapshot.docs[0].ref;
            await listingRef.update(listingData);
            console.log(`Updated directory listing ${listingRef.id} for user ${userId} with subscription ${subscriptionId}`);
        }
        else {
            // Create new listing
            const listingRef = db.collection('directory_listings').doc();
            await listingRef.set(Object.assign(Object.assign({}, listingData), { id: listingRef.id, sortOrder: 0, analytics: {
                    totalViews: 0,
                    totalClicks: 0,
                }, createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: 'auto_from_ad_subscription' }));
            console.log(`Created FREE directory listing ${listingRef.id} for user ${userId} with ad subscription`);
        }
    }
    catch (error) {
        console.error(`Error creating/updating directory listing for user ${userId}:`, error);
        throw error;
    }
}
/**
 * Deactivate a directory listing when the associated subscription expires/cancels
 */
async function deactivateDirectoryListingForSubscription(userId, subscriptionId, reason) {
    const db = admin.firestore();
    try {
        // Find listing by userId (since one user = one listing)
        const listingsSnapshot = await db
            .collection('directory_listings')
            .where('userId', '==', userId)
            .get();
        if (listingsSnapshot.empty) {
            console.log(`No directory listing found for user ${userId}`);
            return;
        }
        const batch = db.batch();
        for (const listingDoc of listingsSnapshot.docs) {
            batch.update(listingDoc.ref, {
                status: 'expired',
                subscriptionStatus: reason === 'deleted' ? 'canceled' : reason,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Deactivated directory listing ${listingDoc.id} for user ${userId} (reason: ${reason})`);
        }
        await batch.commit();
    }
    catch (error) {
        console.error(`Error deactivating directory listing for user ${userId}:`, error);
        throw error;
    }
}
//# sourceMappingURL=index.js.map