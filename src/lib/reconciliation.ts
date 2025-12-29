/**
 * Database Reconciliation Utilities
 *
 * This module provides functions to check and reconcile data consistency
 * across the database, including customers, subscriptions, revenue metrics,
 * advertisements, and leads.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  collectionGroup,
  Firestore,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

import {
  ReconciliationIssue,
  ReconciliationSummary,
  ReconciliationReport,
  ReconciliationOptions,
  ISSUE_CATEGORIES,
  ISSUE_SEVERITY,
  type IssueCategory,
  type IssueSeverity,
} from './types';

/**
 * Generate a unique ID for issues
 */
function generateIssueId(): string {
  return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique ID for reconciliation reports
 */
function generateReportId(): string {
  return `recon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an empty summary object
 */
function createEmptySummary(): ReconciliationSummary {
  return {
    totalCustomers: 0,
    totalSubscriptions: 0,
    totalActiveSubscriptions: 0,
    totalAdvertisements: 0,
    totalLeads: 0,
    totalUsers: 0,
    calculatedMRR: 0,
    calculatedARR: 0,
    issuesCount: {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    },
  };
}

/**
 * Calculate MRR from a subscription
 */
function calculateSubscriptionMRR(subData: any): number {
  const amount = subData.items?.[0]?.price?.unit_amount || 0;
  const interval = subData.items?.[0]?.price?.recurring?.interval;

  if (interval === 'year') {
    return amount / 12 / 100; // Convert yearly to monthly, cents to dollars
  }
  return amount / 100; // Monthly, cents to dollars
}

/**
 * Calculate ARR from a subscription
 */
function calculateSubscriptionARR(subData: any): number {
  const amount = subData.items?.[0]?.price?.unit_amount || 0;
  const interval = subData.items?.[0]?.price?.recurring?.interval;

  if (interval === 'year') {
    return amount / 100; // Yearly plan, cents to dollars
  }
  return (amount * 12) / 100; // Monthly to yearly, cents to dollars
}

/**
 * Check for customer data issues
 */
async function checkCustomerData(
  firestore: Firestore,
  issues: ReconciliationIssue[],
  summary: ReconciliationSummary
): Promise<void> {
  // Get all customers
  const customersSnapshot = await getDocs(collection(firestore, 'customers'));
  summary.totalCustomers = customersSnapshot.size;

  // Get all users
  const usersSnapshot = await getDocs(collection(firestore, 'users'));
  const usersMap = new Map<string, any>();
  usersSnapshot.forEach(userDoc => {
    usersMap.set(userDoc.id, { id: userDoc.id, ...userDoc.data() });
  });
  summary.totalUsers = usersSnapshot.size;

  // Check each customer
  for (const customerDoc of customersSnapshot.docs) {
    const customerId = customerDoc.id;
    const customerData = customerDoc.data();

    // Check if customer has corresponding user document
    if (!usersMap.has(customerId)) {
      issues.push({
        id: generateIssueId(),
        category: ISSUE_CATEGORIES.CUSTOMER_DATA,
        severity: ISSUE_SEVERITY.WARNING,
        title: 'Customer without user profile',
        description: `Customer ${customerId} exists in customers collection but has no corresponding user profile in users collection. Customer email from Stripe: ${customerData.email || 'N/A'}`,
        affectedEntityId: customerId,
        affectedEntityType: 'customer',
        suggestedFix: 'Create a user profile for this customer or verify if this is a valid customer',
        canAutoFix: false,
        metadata: { email: customerData.email },
      });
    } else {
      // User exists, check for data consistency
      const userData = usersMap.get(customerId);

      // Check for email mismatch
      if (customerData.email && userData.email && customerData.email !== userData.email) {
        issues.push({
          id: generateIssueId(),
          category: ISSUE_CATEGORIES.CUSTOMER_DATA,
          severity: ISSUE_SEVERITY.INFO,
          title: 'Email mismatch between customer and user',
          description: `Customer ${customerId} has email "${customerData.email}" in Stripe but "${userData.email}" in user profile`,
          affectedEntityId: customerId,
          affectedEntityType: 'customer',
          suggestedFix: 'Verify which email is correct and update accordingly',
          canAutoFix: false,
          metadata: { stripeEmail: customerData.email, userEmail: userData.email },
        });
      }
    }
  }

  // Check for users without customer records (may not have purchased yet)
  for (const [userId, userData] of usersMap) {
    const hasCustomerDoc = customersSnapshot.docs.some(doc => doc.id === userId);
    if (!hasCustomerDoc) {
      // This is informational - users without purchases are normal
      issues.push({
        id: generateIssueId(),
        category: ISSUE_CATEGORIES.USER_DATA,
        severity: ISSUE_SEVERITY.INFO,
        title: 'User without customer record',
        description: `User ${userId} (${userData.email || 'no email'}) has no customer record. They may not have made a purchase yet.`,
        affectedEntityId: userId,
        affectedEntityType: 'user',
        suggestedFix: 'No action needed unless this user should have a subscription',
        canAutoFix: false,
        metadata: { email: userData.email },
      });
    }
  }
}

/**
 * Check for subscription data issues
 */
async function checkSubscriptionData(
  firestore: Firestore,
  issues: ReconciliationIssue[],
  summary: ReconciliationSummary
): Promise<void> {
  const customersSnapshot = await getDocs(collection(firestore, 'customers'));

  let totalSubscriptions = 0;
  let totalActiveSubscriptions = 0;
  let totalMRR = 0;
  let totalARR = 0;

  for (const customerDoc of customersSnapshot.docs) {
    const customerId = customerDoc.id;

    // Get all subscriptions for this customer
    const subsSnapshot = await getDocs(
      collection(firestore, 'customers', customerId, 'subscriptions')
    );

    totalSubscriptions += subsSnapshot.size;

    for (const subDoc of subsSnapshot.docs) {
      const subData = subDoc.data();
      const status = subData.status;

      // Check for active subscriptions
      if (status === 'active' || status === 'trialing') {
        totalActiveSubscriptions++;
        totalMRR += calculateSubscriptionMRR(subData);
        totalARR += calculateSubscriptionARR(subData);
      }

      // Check for missing price data
      if (!subData.items || !subData.items[0]?.price) {
        issues.push({
          id: generateIssueId(),
          category: ISSUE_CATEGORIES.SUBSCRIPTION_DATA,
          severity: ISSUE_SEVERITY.ERROR,
          title: 'Subscription missing price data',
          description: `Subscription ${subDoc.id} for customer ${customerId} is missing price information`,
          affectedEntityId: subDoc.id,
          affectedEntityType: 'subscription',
          suggestedFix: 'Re-sync subscription data from Stripe or check Stripe webhook logs',
          canAutoFix: false,
          metadata: { customerId, subscriptionId: subDoc.id, status },
        });
      }

      // Check for missing timestamps
      if (!subData.created) {
        issues.push({
          id: generateIssueId(),
          category: ISSUE_CATEGORIES.SUBSCRIPTION_DATA,
          severity: ISSUE_SEVERITY.WARNING,
          title: 'Subscription missing creation date',
          description: `Subscription ${subDoc.id} for customer ${customerId} has no created timestamp`,
          affectedEntityId: subDoc.id,
          affectedEntityType: 'subscription',
          suggestedFix: 'Re-sync subscription data from Stripe',
          canAutoFix: false,
          metadata: { customerId, subscriptionId: subDoc.id },
        });
      }

      // Check for stale "active" subscriptions that should have ended
      if ((status === 'active' || status === 'trialing') && subData.current_period_end) {
        const endDate = subData.current_period_end.seconds
          ? new Date(subData.current_period_end.seconds * 1000)
          : new Date(subData.current_period_end);

        // If end date is more than 3 days in the past, flag it
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        if (endDate < threeDaysAgo) {
          issues.push({
            id: generateIssueId(),
            category: ISSUE_CATEGORIES.SUBSCRIPTION_DATA,
            severity: ISSUE_SEVERITY.ERROR,
            title: 'Subscription may be stale',
            description: `Subscription ${subDoc.id} shows as "${status}" but period ended on ${endDate.toISOString()}. The webhook may have failed to update the status.`,
            affectedEntityId: subDoc.id,
            affectedEntityType: 'subscription',
            suggestedFix: 'Re-sync subscription status from Stripe Dashboard',
            canAutoFix: false,
            metadata: { customerId, subscriptionId: subDoc.id, status, periodEnd: endDate.toISOString() },
          });
        }
      }
    }
  }

  summary.totalSubscriptions = totalSubscriptions;
  summary.totalActiveSubscriptions = totalActiveSubscriptions;
  summary.calculatedMRR = Math.round(totalMRR * 100) / 100;
  summary.calculatedARR = Math.round(totalARR * 100) / 100;
}

/**
 * Check for advertisement data issues
 */
async function checkAdvertisementData(
  firestore: Firestore,
  issues: ReconciliationIssue[],
  summary: ReconciliationSummary
): Promise<void> {
  // Get all advertisements using collection group query
  const adsSnapshot = await getDocs(collectionGroup(firestore, 'advertisements'));
  summary.totalAdvertisements = adsSnapshot.size;

  // Build a map of all subscriptions
  const customersSnapshot = await getDocs(collection(firestore, 'customers'));
  const subscriptionMap = new Map<string, { customerId: string; status: string; data: any }>();

  for (const customerDoc of customersSnapshot.docs) {
    const subsSnapshot = await getDocs(
      collection(firestore, 'customers', customerDoc.id, 'subscriptions')
    );
    subsSnapshot.forEach(subDoc => {
      subscriptionMap.set(subDoc.id, {
        customerId: customerDoc.id,
        status: subDoc.data().status,
        data: subDoc.data(),
      });
    });
  }

  // Check each advertisement
  for (const adDoc of adsSnapshot.docs) {
    const adData = adDoc.data();
    const adId = adDoc.id;
    const userId = adData.userId;
    const subscriptionId = adData.subscriptionId;

    // Check if ad has a valid subscription link
    if (subscriptionId) {
      const subscription = subscriptionMap.get(subscriptionId);

      if (!subscription) {
        issues.push({
          id: generateIssueId(),
          category: ISSUE_CATEGORIES.ADVERTISEMENT_DATA,
          severity: ISSUE_SEVERITY.ERROR,
          title: 'Advertisement linked to non-existent subscription',
          description: `Advertisement ${adId} references subscription ${subscriptionId} which does not exist`,
          affectedEntityId: adId,
          affectedEntityType: 'advertisement',
          suggestedFix: 'Link this advertisement to a valid subscription or mark as orphaned',
          canAutoFix: false,
          metadata: { userId, subscriptionId },
        });
      } else if (subscription.customerId !== userId) {
        issues.push({
          id: generateIssueId(),
          category: ISSUE_CATEGORIES.ADVERTISEMENT_DATA,
          severity: ISSUE_SEVERITY.ERROR,
          title: 'Advertisement-subscription user mismatch',
          description: `Advertisement ${adId} belongs to user ${userId} but subscription ${subscriptionId} belongs to customer ${subscription.customerId}`,
          affectedEntityId: adId,
          affectedEntityType: 'advertisement',
          suggestedFix: 'Verify ownership and correct the subscription link or user ID',
          canAutoFix: false,
          metadata: { adUserId: userId, subscriptionCustomerId: subscription.customerId },
        });
      } else {
        // Check for ad status vs subscription status mismatches
        const subStatus = subscription.status;
        const adStatus = adData.status;

        // If subscription is canceled but ad is still "live"
        if ((subStatus === 'canceled' || subStatus === 'unpaid') && adStatus === 'live') {
          issues.push({
            id: generateIssueId(),
            category: ISSUE_CATEGORIES.ADVERTISEMENT_DATA,
            severity: ISSUE_SEVERITY.CRITICAL,
            title: 'Live ad with canceled subscription',
            description: `Advertisement ${adId} is marked as "live" but subscription ${subscriptionId} is "${subStatus}"`,
            affectedEntityId: adId,
            affectedEntityType: 'advertisement',
            suggestedFix: 'Update ad status to "canceled_inactive" since subscription is no longer active',
            canAutoFix: true,
            metadata: { adStatus, subscriptionStatus: subStatus, subscriptionId },
          });
        }
      }
    } else {
      // Ad without subscription - check if this is expected based on status
      if (adData.status !== 'pending_info') {
        issues.push({
          id: generateIssueId(),
          category: ISSUE_CATEGORIES.ADVERTISEMENT_DATA,
          severity: ISSUE_SEVERITY.WARNING,
          title: 'Advertisement without subscription link',
          description: `Advertisement ${adId} (status: ${adData.status}) has no linked subscription`,
          affectedEntityId: adId,
          affectedEntityType: 'advertisement',
          suggestedFix: 'Link this advertisement to its corresponding subscription',
          canAutoFix: false,
          metadata: { userId, status: adData.status },
        });
      }
    }

    // Check for missing required fields
    if (!adData.businessName && adData.status !== 'pending_info') {
      issues.push({
        id: generateIssueId(),
        category: ISSUE_CATEGORIES.ADVERTISEMENT_DATA,
        severity: ISSUE_SEVERITY.WARNING,
        title: 'Advertisement missing business name',
        description: `Advertisement ${adId} has no business name set (status: ${adData.status})`,
        affectedEntityId: adId,
        affectedEntityType: 'advertisement',
        suggestedFix: 'Update the advertisement with the business name',
        canAutoFix: false,
        metadata: { userId, status: adData.status },
      });
    }
  }

  // Check for subscriptions without advertisements
  for (const [subId, subInfo] of subscriptionMap) {
    if (subInfo.status === 'active' || subInfo.status === 'trialing') {
      const hasAd = adsSnapshot.docs.some(adDoc => adDoc.data().subscriptionId === subId);

      if (!hasAd) {
        issues.push({
          id: generateIssueId(),
          category: ISSUE_CATEGORIES.ADVERTISEMENT_DATA,
          severity: ISSUE_SEVERITY.WARNING,
          title: 'Active subscription without advertisement',
          description: `Subscription ${subId} for customer ${subInfo.customerId} is active but has no associated advertisement`,
          affectedEntityId: subId,
          affectedEntityType: 'subscription',
          suggestedFix: 'Create an advertisement for this subscription',
          canAutoFix: true,
          metadata: { customerId: subInfo.customerId, subscriptionStatus: subInfo.status },
        });
      }
    }
  }
}

/**
 * Check for lead data issues
 */
async function checkLeadData(
  firestore: Firestore,
  issues: ReconciliationIssue[],
  summary: ReconciliationSummary
): Promise<void> {
  const leadsSnapshot = await getDocs(collection(firestore, 'leads'));
  summary.totalLeads = leadsSnapshot.size;

  // Get all customers for cross-reference
  const customersSnapshot = await getDocs(collection(firestore, 'customers'));
  const customerEmails = new Set<string>();
  customersSnapshot.forEach(doc => {
    const email = doc.data().email;
    if (email) customerEmails.add(email.toLowerCase());
  });

  for (const leadDoc of leadsSnapshot.docs) {
    const leadData = leadDoc.data();
    const leadId = leadDoc.id;

    // Check for missing required fields
    if (!leadData.email && !leadData.phone) {
      issues.push({
        id: generateIssueId(),
        category: ISSUE_CATEGORIES.LEAD_DATA,
        severity: ISSUE_SEVERITY.ERROR,
        title: 'Lead without contact information',
        description: `Lead ${leadId} (${leadData.businessName || 'Unknown'}) has no email or phone`,
        affectedEntityId: leadId,
        affectedEntityType: 'lead',
        suggestedFix: 'Add contact information or remove this lead',
        canAutoFix: false,
        metadata: { businessName: leadData.businessName },
      });
    }
  }
}

/**
 * Apply an automatic fix for an issue
 */
export async function applyAutoFix(
  firestore: Firestore,
  issue: ReconciliationIssue
): Promise<{ success: boolean; message: string }> {
  if (!issue.canAutoFix) {
    return { success: false, message: 'This issue cannot be auto-fixed' };
  }

  try {
    switch (issue.title) {
      case 'Live ad with canceled subscription': {
        const { subscriptionId } = issue.metadata || {};
        if (!subscriptionId || !issue.affectedEntityId) {
          return { success: false, message: 'Missing required metadata' };
        }

        // Find the advertisement and update its status
        const adsSnapshot = await getDocs(collectionGroup(firestore, 'advertisements'));
        const adDoc = adsSnapshot.docs.find(doc => doc.id === issue.affectedEntityId);

        if (adDoc) {
          await updateDoc(adDoc.ref, {
            status: 'canceled_inactive',
            updatedAt: Timestamp.now(),
          });
          return { success: true, message: `Updated advertisement ${issue.affectedEntityId} status to canceled_inactive` };
        }
        return { success: false, message: 'Advertisement not found' };
      }

      case 'Active subscription without advertisement': {
        const { customerId } = issue.metadata || {};
        if (!customerId || !issue.affectedEntityId) {
          return { success: false, message: 'Missing required metadata' };
        }

        // Get the subscription to find the customer email
        const subDoc = await getDoc(
          doc(firestore, 'customers', customerId, 'subscriptions', issue.affectedEntityId)
        );

        if (!subDoc.exists()) {
          return { success: false, message: 'Subscription not found' };
        }

        // Create a new advertisement for this subscription
        const adRef = doc(collection(firestore, 'users', customerId, 'advertisements'));
        await setDoc(adRef, {
          userId: customerId,
          subscriptionId: issue.affectedEntityId,
          status: 'pending_info',
          createdAt: Timestamp.now(),
        });

        return { success: true, message: `Created advertisement ${adRef.id} for subscription ${issue.affectedEntityId}` };
      }

      default:
        return { success: false, message: `No auto-fix handler for: ${issue.title}` };
    }
  } catch (error) {
    return { success: false, message: `Error applying fix: ${error}` };
  }
}

/**
 * Run a full reconciliation check
 */
export async function runReconciliation(
  firestore: Firestore,
  options: ReconciliationOptions,
  onProgress?: (message: string) => void
): Promise<ReconciliationReport> {
  const reportId = generateReportId();
  const issues: ReconciliationIssue[] = [];
  const summary = createEmptySummary();

  const report: ReconciliationReport = {
    id: reportId,
    createdAt: Timestamp.now(),
    status: 'running',
    summary,
    issues,
    fixesApplied: 0,
  };

  try {
    // Run customer checks
    if (options.checkCustomers) {
      onProgress?.('Checking customer data...');
      await checkCustomerData(firestore, issues, summary);
    }

    // Run subscription checks
    if (options.checkSubscriptions || options.checkRevenue) {
      onProgress?.('Checking subscription and revenue data...');
      await checkSubscriptionData(firestore, issues, summary);
    }

    // Run advertisement checks
    if (options.checkAdvertisements) {
      onProgress?.('Checking advertisement data...');
      await checkAdvertisementData(firestore, issues, summary);
    }

    // Run lead checks
    if (options.checkLeads) {
      onProgress?.('Checking lead data...');
      await checkLeadData(firestore, issues, summary);
    }

    // Count issues by severity
    for (const issue of issues) {
      summary.issuesCount[issue.severity]++;
    }

    // Apply auto-fixes if enabled
    if (options.autoFixEnabled) {
      onProgress?.('Applying automatic fixes...');
      const fixableIssues = issues.filter(i => i.canAutoFix);

      for (const issue of fixableIssues) {
        const result = await applyAutoFix(firestore, issue);
        if (result.success) {
          report.fixesApplied++;
          // Update the issue to indicate it was fixed
          issue.suggestedFix = `[FIXED] ${result.message}`;
          issue.canAutoFix = false;
        }
      }
    }

    report.status = 'completed';
    report.completedAt = Timestamp.now();

  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : 'Unknown error occurred';
  }

  return report;
}

/**
 * Get a quick summary of database health without full reconciliation
 */
export async function getQuickHealthCheck(
  firestore: Firestore
): Promise<{ healthy: boolean; summary: ReconciliationSummary }> {
  const summary = createEmptySummary();

  try {
    // Count customers
    const customersSnapshot = await getDocs(collection(firestore, 'customers'));
    summary.totalCustomers = customersSnapshot.size;

    // Count users
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    summary.totalUsers = usersSnapshot.size;

    // Count subscriptions and calculate revenue
    for (const customerDoc of customersSnapshot.docs) {
      const subsSnapshot = await getDocs(
        collection(firestore, 'customers', customerDoc.id, 'subscriptions')
      );

      summary.totalSubscriptions += subsSnapshot.size;

      for (const subDoc of subsSnapshot.docs) {
        const subData = subDoc.data();
        if (subData.status === 'active' || subData.status === 'trialing') {
          summary.totalActiveSubscriptions++;
          summary.calculatedMRR += calculateSubscriptionMRR(subData);
          summary.calculatedARR += calculateSubscriptionARR(subData);
        }
      }
    }

    summary.calculatedMRR = Math.round(summary.calculatedMRR * 100) / 100;
    summary.calculatedARR = Math.round(summary.calculatedARR * 100) / 100;

    // Count advertisements
    const adsSnapshot = await getDocs(collectionGroup(firestore, 'advertisements'));
    summary.totalAdvertisements = adsSnapshot.size;

    // Count leads
    const leadsSnapshot = await getDocs(collection(firestore, 'leads'));
    summary.totalLeads = leadsSnapshot.size;

    return { healthy: true, summary };
  } catch (error) {
    return { healthy: false, summary };
  }
}
