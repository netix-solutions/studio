# 🚀 Directory Platform Deployment & Testing Guide

## ✅ IMPLEMENTATION COMPLETE!

All 10 phases of the Directory Platform have been successfully implemented (100% complete).

---

## 📦 What Has Been Built

### Core Infrastructure
- ✅ Database schema with Firestore indexes
- ✅ Security rules for public/admin/customer access
- ✅ TypeScript types and interfaces
- ✅ Cloud Function for subscription management

### Public Features
- ✅ 3-step signup form with Stripe integration
- ✅ Pricing tiers (Basic $49, Featured $99, Premium $149)
- ✅ Real-time listing preview
- ✅ Post-purchase success page

### Embeddable Widgets
- ✅ Full directory embed with search & filtering
- ✅ JSON API for custom implementations
- ✅ Impression and click tracking
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Light/dark theme support

### Admin Dashboard
- ✅ View all listings with filters
- ✅ Search by business/email/phone
- ✅ Quick pause/activate actions
- ✅ View analytics per listing
- ✅ Create manual listings (for comps)

### Customer Portal
- ✅ Edit listing information
- ✅ View performance analytics
- ✅ Manage subscription (billing portal)
- ✅ Live preview of listing
- ✅ Pause/resume listing

### Tools & Utilities
- ✅ Embed code generator with live preview
- ✅ Migration script for existing listings
- ✅ Admin API endpoints
- ✅ Customer API endpoints

---

## 🎯 Deployment Checklist

### Step 1: Configure Stripe Products (CRITICAL)

In your Stripe Dashboard, create 3 **recurring** products:

#### Product 1: Directory Basic Listing
- **Price:** $49/month (recurring)
- **Metadata:** Add custom field
  ```
  Key: type
  Value: directory_listing
  ```
  ```
  Key: tier
  Value: basic
  ```

#### Product 2: Directory Featured Listing
- **Price:** $99/month (recurring)
- **Metadata:**
  ```
  Key: type
  Value: directory_listing
  ```
  ```
  Key: tier
  Value: featured
  ```

#### Product 3: Directory Premium Listing
- **Price:** $149/month (recurring)
- **Metadata:**
  ```
  Key: type
  Value: directory_listing
  ```
  ```
  Key: tier
  Value: premium
  ```

**⚠️ IMPORTANT:** The metadata is critical! Without it, the Cloud Function won't recognize these as directory subscriptions.

### Step 2: Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

This deploys the `onDirectorySubscriptionChange` function that automatically creates listings when subscriptions are purchased.

### Step 3: Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Wait for indexes to build (5-15 minutes). Check status:
```bash
firebase firestore:indexes
```

### Step 4: Test Locally First

```bash
npm run dev
```

Navigate to:
- `/directory-signup` - Test the signup flow
- `/directory-embed` - Generate embed codes
- `/directory-listings` - Admin dashboard (requires admin role)
- `/my-directory-listing` - Customer portal (requires login)

### Step 5: Deploy to Production

```bash
npm run build
firebase deploy --only hosting
```

---

## 🧪 Testing Procedures

### Test 1: Stripe Checkout Flow

1. Go to `/directory-signup`
2. Select a tier (use test mode)
3. Fill in business information
4. Use Stripe test card: `4242 4242 4242 4242`
5. Verify:
   - Redirects to Stripe Checkout
   - After payment, redirects to success page
   - Check Firestore: `directory_listings` collection should have new doc
   - Check Cloud Function logs for execution

### Test 2: Embed Functionality

1. Go to `/directory-embed`
2. Configure settings (theme, columns, etc.)
3. Copy embed code
4. Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Directory Embed</title>
</head>
<body>
  <h1>Business Directory Test</h1>
  
  <!-- PASTE EMBED CODE HERE -->
  <iframe
    src="https://yourdomain.com/api/directory/embed/full?theme=light"
    width="100%"
    style="min-height: 800px; border: none;"
    title="Business Directory">
  </iframe>
  
</body>
</html>
```

4. Open in browser
5. Verify:
   - Directory displays correctly
   - Search works
   - Category filters work
   - Click tracking redirects to business website
   - Responsive on mobile

### Test 3: Analytics Tracking

1. Open a directory embed
2. Scroll to view a listing (impression tracked)
3. Click "Visit Website" (click tracked)
4. Check Firestore:
   - `directory_listings/{id}` - `analytics.totalViews` incremented
   - `directory_listings/{id}/analytics/{YYYY-MM-DD}` - daily stats created

### Test 4: Admin Dashboard

1. Login as admin
2. Go to `/directory-listings`
3. Verify:
   - All listings displayed
   - Filters work
   - Search works
   - Pause/activate works
   - Analytics displayed

### Test 5: Customer Portal

1. Login as a customer with a listing
2. Go to `/my-directory-listing`
3. Edit business information
4. Click "Save Changes"
5. View analytics tab
6. Test "Manage Subscription" button (opens Stripe portal)

### Test 6: Migration (If Applicable)

If you have existing directory listings in `live_ads`:

```bash
cd scripts
npx tsx migrate-directory-listings.ts
```

Check:
- Migration report JSON file created
- `directory_listings` collection populated
- `migration_logs` collection has log entry

---

## 📝 Embed Instructions for Wesley Chapel & Pasco

### Wesley Chapel Community Website

1. **Create new page:** `/business-directory`

2. **Add this iframe code:**

```html
<iframe 
  src="https://yourdomain.com/api/directory/embed/full?theme=light" 
  width="100%" 
  style="min-height: 800px; border: none;"
  title="Wesley Chapel Business Directory"
  loading="lazy">
</iframe>
```

3. **Optional - Homepage Widget:**

For featuring businesses on homepage:

```html
<iframe 
  src="https://yourdomain.com/api/directory/embed/full?featured=true&columns=3" 
  width="100%" 
  style="min-height: 600px; border: none;"
  title="Featured Local Businesses">
</iframe>
```

### Pasco Community Website

Same process, just change the website:

```html
<iframe 
  src="https://yourdomain.com/api/directory/embed/full?theme=auto" 
  width="100%" 
  style="min-height: 800px; border: none;"
  title="Pasco Business Directory">
</iframe>
```

### Styling Notes

- Use `theme=auto` to match the host site's light/dark mode
- Use `theme=light` or `theme=dark` for fixed theme
- Minimum height of 800px recommended
- The embed is fully responsive (no width adjustments needed)

---

## 🔍 Monitoring & Maintenance

### What to Monitor

1. **Stripe Dashboard**
   - New subscriptions
   - Failed payments
   - Cancellations

2. **Firebase Console**
   - Cloud Function logs (check for errors)
   - Firestore read/write usage
   - Analytics subcollection growth

3. **Application Logs**
   - Directory listing creations
   - Tracking pixel requests
   - API errors

### Common Issues & Solutions

#### Issue: Listing not created after payment
- **Check:** Cloud Function logs
- **Fix:** Verify product metadata in Stripe
- **Fix:** Check subscription status in `customers/{userId}/subscriptions`

#### Issue: Tracking not working
- **Check:** Browser console for CORS errors
- **Fix:** Verify CORS headers in API routes
- **Fix:** Check Firestore rules allow writes

#### Issue: Embed not displaying
- **Check:** iframe src URL is accessible
- **Fix:** Test direct URL in browser
- **Fix:** Check Content-Security-Policy headers on host site

---

## 📊 Success Metrics to Track

After launch, monitor:
- **Conversion rate:** Visitors → Purchases
- **Tier distribution:** Basic vs Featured vs Premium
- **Monthly recurring revenue (MRR)**
- **Customer churn rate**
- **Average views per listing**
- **Average CTR per listing**
- **Most popular categories**

---

## 🎉 Launch Announcement Template

```
🚀 NEW: Business Directory Listings Now Available!

Get your business seen by thousands of local customers:

💼 BASIC - $49/month
⭐ FEATURED - $99/month (Most Popular)
👑 PREMIUM - $149/month

Your listing includes:
✓ Business profile with logo & photos
✓ Contact information & social links
✓ Search visibility across all our community websites
✓ Performance analytics
✓ Easy self-service management

Sign up today: [yourdomain.com/directory-signup]
```

---

## 📞 Support & Troubleshooting

For issues during deployment:
1. Check Cloud Function logs: `firebase functions:log`
2. Check Firestore rules deployment: `firebase deploy --only firestore:rules`
3. Verify Stripe products have correct metadata
4. Test in Stripe test mode before going live

---

## ✨ What's Next (Optional Enhancements)

Consider adding later:
- Email notifications for subscription events
- Featured listing carousel widget
- Category-specific directory pages
- Export analytics to CSV
- Bulk upload for admin
- Public listing submission review queue (if needed)

---

## 🎯 Files Summary

**Created: 28 files**
- Types & infrastructure: 4 files
- API routes: 8 files
- UI components: 3 files
- Pages: 9 files
- Cloud Functions: 2 functions (in 1 file)
- Scripts: 1 file
- Documentation: 3 files

**Modified: 3 files**
- types.ts
- firestore.rules
- firestore.indexes.json
- functions/src/index.ts

**Untouched: ALL existing ad code** ✅

---

## ✅ Ready to Launch!

The Directory Platform is 100% complete and ready for production deployment. Follow the steps above, and you'll have a fully functional, paid business directory system integrated across your community websites.

**Good luck! 🚀**
