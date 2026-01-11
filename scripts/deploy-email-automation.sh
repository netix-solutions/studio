#!/bin/bash

# Deployment Script for Lead Email Automation System
# Run this script to deploy all components

set -e  # Exit on error

echo "========================================="
echo "Lead Email Automation Deployment"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "${YELLOW}Step 1: Building Cloud Functions...${NC}"
cd functions
npm install
npm run build
cd ..
echo "${GREEN}✓ Cloud Functions built${NC}"
echo ""

# 2. Deploy Firestore Rules
echo "${YELLOW}Step 2: Deploying Firestore Rules...${NC}"
firebase deploy --only firestore:rules
echo "${GREEN}✓ Firestore rules deployed${NC}"
echo ""

# 3. Deploy Cloud Functions
echo "${YELLOW}Step 3: Deploying Cloud Functions...${NC}"
echo "This will deploy:"
echo "  - onSubscriptionCreated (lead conversion tracking)"
echo "  - sendThreeHourDiscountEmails (3-hour discount automation)"
echo "  - processScheduledLeadEmails (scheduled email processor)"
echo ""
firebase deploy --only functions
echo "${GREEN}✓ Cloud Functions deployed${NC}"
echo ""

# 4. Set environment variables (if not already set)
echo "${YELLOW}Step 4: Checking environment variables...${NC}"
echo "Make sure APP_URL is set in Firebase Functions config:"
echo "  firebase functions:config:set app.url=\"https://your-domain.com\""
echo ""

# 5. Build and deploy frontend
echo "${YELLOW}Step 5: Building frontend...${NC}"
npm run build
echo "${GREEN}✓ Frontend built${NC}"
echo ""

echo "========================================="
echo "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Deploy the frontend build to your hosting provider"
echo "2. Verify Cloud Scheduler jobs are running:"
echo "   - Go to Firebase Console > Functions > Cloud Scheduler"
echo "3. Test the system:"
echo "   - Create a test lead"
echo "   - Schedule a test email"
echo "   - Monitor Cloud Function logs"
echo ""
echo "Monitoring commands:"
echo "  firebase functions:log --only sendThreeHourDiscountEmails"
echo "  firebase functions:log --only processScheduledLeadEmails"
echo "  firebase functions:log --only onSubscriptionCreated"
echo ""
echo "Documentation:"
echo "  docs/LEAD_EMAIL_AUTOMATION.md"
echo "  docs/IMPLEMENTATION_SUMMARY.md"
echo ""
