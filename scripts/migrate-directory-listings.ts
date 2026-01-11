#!/usr/bin/env tsx

/**
 * Migration Script: Migrate existing directory listings from live_ads to directory_listings
 * 
 * This script:
 * 1. Queries live_ads where directoryListing exists and directoryListingStatus = 'approved'
 * 2. Creates new directory_listings documents
 * 3. Marks them as 'legacy' tier with 'legacy' subscription status
 * 4. Logs migration results
 * 
 * Usage: npx tsx scripts/migrate-directory-listings.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

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

interface MigrationResult {
  success: boolean;
  liveAdId: string;
  newListingId?: string;
  error?: string;
}

async function migrateDirectoryListings() {
  console.log('🚀 Starting directory listings migration...\n');

  const results: MigrationResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  try {
    // Query live_ads with directory listings
    const liveAdsSnapshot = await db.collection('live_ads')
      .where('directoryListingStatus', '==', 'approved')
      .get();

    console.log(`📊 Found ${liveAdsSnapshot.size} approved directory listings in live_ads\n`);

    for (const liveAdDoc of liveAdsSnapshot.docs) {
      const liveAd = liveAdDoc.data();
      const liveAdId = liveAdDoc.id;

      console.log(`Processing: ${liveAd.directoryListing?.businessName || liveAd.name}...`);

      try {
        const directoryListing = liveAd.directoryListing;
        
        if (!directoryListing) {
          throw new Error('No directoryListing data found');
        }

        // Create new directory_listings document
        const newListingRef = db.collection('directory_listings').doc();
        
        await newListingRef.set({
          id: newListingRef.id,
          
          // Business info
          businessName: directoryListing.businessName || liveAd.name || 'Unknown Business',
          contactEmail: liveAd.customerEmail || directoryListing.email || '',
          contactName: liveAd.customerName || '',
          phone: directoryListing.phone || '',
          websiteUrl: directoryListing.websiteUrl || liveAd.targetUrl || '',
          description: directoryListing.description || '',
          category: directoryListing.category || 'other',
          logoUrl: directoryListing.logoUrl || '',
          bannerImageUrl: directoryListing.bannerImageUrl || liveAd.imageUrl || '',
          
          // Address
          address: directoryListing.address || '',
          city: directoryListing.city || '',
          state: directoryListing.state || '',
          zipCode: directoryListing.zipCode || '',
          
          // Social links
          socialLinks: {
            facebookUrl: directoryListing.facebookUrl || '',
            instagramUrl: directoryListing.instagramUrl || '',
            linkedinUrl: directoryListing.linkedinUrl || '',
            twitterUrl: directoryListing.twitterUrl || '',
            youtubeUrl: directoryListing.youtubeUrl || '',
            tiktokUrl: directoryListing.tiktokUrl || '',
          },
          
          // User & subscription (legacy)
          userId: liveAd.customerId || liveAd.userId || 'legacy',
          subscriptionStatus: 'legacy',
          subscriptionId: null,
          stripeCustomerId: null,
          priceId: null,
          currentPeriodEnd: null,
          
          // Status
          status: 'active',
          tier: 'legacy',
          isFeatured: directoryListing.isFeatured || false,
          sortOrder: 0,
          
          // Analytics
          analytics: {
            totalViews: 0,
            totalClicks: 0,
          },
          
          // Metadata
          createdAt: liveAd.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'migration',
          
          // Migration tracking
          migratedFromLiveAdId: liveAdId,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({
          success: true,
          liveAdId,
          newListingId: newListingRef.id,
        });
        
        successCount++;
        console.log(`  ✅ Migrated to ${newListingRef.id}`);

      } catch (error: any) {
        results.push({
          success: false,
          liveAdId,
          error: error.message,
        });
        
        errorCount++;
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // Create migration log
    const logRef = db.collection('migration_logs').doc();
    await logRef.set({
      id: logRef.id,
      type: 'directory_listings',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      totalProcessed: results.length,
      successCount,
      errorCount,
      results,
    });

    console.log(`\n✨ Migration Complete!`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n📝 Migration log saved to migration_logs/${logRef.id}`);

    // Write results to file
    const reportPath = path.join(__dirname, `../migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalProcessed: results.length,
      successCount,
      errorCount,
      results,
    }, null, 2));
    
    console.log(`📄 Report saved to: ${reportPath}\n`);

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateDirectoryListings()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
