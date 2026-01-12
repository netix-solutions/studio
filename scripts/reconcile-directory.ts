#!/usr/bin/env tsx

/**
 * Reconciliation Script: Fix directory listings that should be visible but aren't
 * 
 * This script:
 * 1. Finds all live_ads with directoryListing.directoryStatus === 'approved'
 * 2. Checks why they might not be visible (status !== 'active', showInDirectory === false)
 * 3. Optionally fixes the issues (--fix flag)
 * 
 * Usage: 
 *   npx tsx scripts/reconcile-directory.ts           # Dry run - just report issues
 *   npx tsx scripts/reconcile-directory.ts --fix     # Actually fix the issues
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json';

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.error('Service account file not found. Please set FIREBASE_SERVICE_ACCOUNT_PATH');
    process.exit(1);
  }
}

const db = admin.firestore();
const shouldFix = process.argv.includes('--fix');

interface IssueReport {
  liveAdId: string;
  businessName: string;
  directoryStatus: string;
  adStatus: string;
  showInDirectory: boolean | undefined;
  issues: string[];
  wouldBeFixed: boolean;
}

async function reconcileDirectory() {
  console.log('🔍 Reconciling directory listings...\n');
  console.log(shouldFix ? '⚠️  FIX MODE ENABLED - Will make changes\n' : '📋 DRY RUN - No changes will be made\n');

  const issues: IssueReport[] = [];
  const visible: string[] = [];
  let fixedCount = 0;

  try {
    // Query ALL live_ads
    const liveAdsSnapshot = await db.collection('live_ads').get();
    console.log(`📊 Found ${liveAdsSnapshot.size} total live ads\n`);

    // Separate by directory listing status
    const withApprovedListing: admin.firestore.QueryDocumentSnapshot[] = [];
    const withOtherListing: admin.firestore.QueryDocumentSnapshot[] = [];
    const withoutListing: admin.firestore.QueryDocumentSnapshot[] = [];

    liveAdsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.directoryListing) {
        if (data.directoryListing.directoryStatus === 'approved') {
          withApprovedListing.push(doc);
        } else {
          withOtherListing.push(doc);
        }
      } else {
        withoutListing.push(doc);
      }
    });

    console.log(`📁 Directory Status Breakdown:`);
    console.log(`   Approved listings: ${withApprovedListing.length}`);
    console.log(`   Other status listings: ${withOtherListing.length}`);
    console.log(`   No listing: ${withoutListing.length}\n`);

    console.log('─'.repeat(80));
    console.log('Analyzing APPROVED directory listings for visibility issues...\n');

    for (const doc of withApprovedListing) {
      const data = doc.data();
      const liveAdId = doc.id;
      const businessName = data.directoryListing?.businessName || data.customerName || data.name || 'Unknown';
      const adStatus = data.status || 'unknown';
      const showInDirectory = data.showInDirectory;
      const directoryStatus = data.directoryListing?.directoryStatus || 'unknown';

      const issuesList: string[] = [];

      // Check visibility conditions
      if (adStatus !== 'active') {
        issuesList.push(`Ad status is '${adStatus}' (must be 'active')`);
      }
      if (showInDirectory === false) {
        issuesList.push(`showInDirectory is explicitly false`);
      }
      if (!data.directoryListing) {
        issuesList.push(`No directoryListing object`);
      }

      if (issuesList.length > 0) {
        issues.push({
          liveAdId,
          businessName,
          directoryStatus,
          adStatus,
          showInDirectory,
          issues: issuesList,
          wouldBeFixed: false,
        });

        console.log(`❌ ${businessName} (${liveAdId})`);
        issuesList.forEach(issue => console.log(`   └─ ${issue}`));

        // Fix if requested
        if (shouldFix) {
          const updates: Record<string, any> = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // Fix ad status if it's paused or similar
          if (adStatus !== 'active' && ['paused', 'pending', 'scheduled'].includes(adStatus)) {
            updates.status = 'active';
            console.log(`   ✏️  Setting status to 'active'`);
          }

          // Fix showInDirectory if it's false
          if (showInDirectory === false) {
            updates.showInDirectory = true;
            console.log(`   ✏️  Setting showInDirectory to true`);
          }

          if (Object.keys(updates).length > 1) { // More than just updatedAt
            await db.collection('live_ads').doc(liveAdId).update(updates);
            fixedCount++;
            console.log(`   ✅ Fixed!`);
          }
        }
        console.log('');
      } else {
        visible.push(`${businessName} (${liveAdId})`);
      }
    }

    console.log('─'.repeat(80));
    console.log('\n📊 SUMMARY\n');

    console.log(`✅ Visible in directory: ${visible.length}`);
    visible.forEach(item => console.log(`   └─ ${item}`));

    console.log(`\n❌ Hidden due to issues: ${issues.length}`);
    issues.forEach(issue => console.log(`   └─ ${issue.businessName}: ${issue.issues.join(', ')}`));

    if (shouldFix) {
      console.log(`\n🔧 Fixed: ${fixedCount} ads`);
    } else {
      console.log(`\n💡 To fix these issues, run: npx tsx scripts/reconcile-directory.ts --fix`);
    }

    // Also check other listing statuses for reference
    console.log('\n─'.repeat(80));
    console.log('\n📋 Other directory listing statuses:\n');

    const statusCounts: Record<string, number> = { pending: 0, hidden: 0, rejected: 0 };
    withOtherListing.forEach((doc) => {
      const data = doc.data();
      const status = data.directoryListing?.directoryStatus || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run reconciliation
reconcileDirectory()
  .then(() => {
    console.log('\n✅ Reconciliation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
