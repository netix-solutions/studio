# Business Directory System

## Overview

The Business Directory supports multiple listing tiers:
- **Free Listings** - Limited time promotion, creates a lead in the system
- **Included with Ad** - Free listing automatically created with ad subscriptions
- **Legacy** - Migrated from old system

---

## How It Works

### Free Signup (Lead Generation)
```
Business Signs Up → Lead Created + Listing Created (PENDING) → Admin Approves → Listing Goes Live
```

1. **Business visits** `/directory-signup`
2. **Fills out form** with business info and contact details
3. **Content is validated** (no all-caps, spam detection, URL validation)
4. **Lead is created** in leads collection (source: `directory_signup`)
5. **Listing is created** with `tier: 'free'` and `status: 'pending'`
6. **Admin reviews** at `/directory-listings` and approves/rejects
7. **Once approved**, listing appears in directories
8. **Admin can follow up** to convert them to paid ad customer

### With Ad Subscription (Automatic)
```
Customer Purchases Ad → Cloud Function Auto-Creates Directory Listing → Listing Appears on Community Websites
```

1. **Customer buys ad** using existing pricing/checkout flow
2. **Cloud Function triggers** when subscription becomes active
3. **Directory listing created** automatically (no manual work)
4. **Listing appears** on Wesley Chapel & Pasco websites via embed
5. **Customer can edit** their listing at `/my-directory-listing`
6. **When subscription expires** → listing deactivates automatically

---

## Key Files

### Free Signup
- `src/app/directory-signup/page.tsx` - Public signup form
- `src/app/api/directory/signup/route.ts` - Creates lead + listing

### Cloud Function
- `functions/src/index.ts` - `onAdSubscriptionCreateDirectoryListing`
  - Triggers on subscription create/update
  - Creates listing for any active subscription
  - Deactivates listing when subscription expires

### Database
- **Collection:** `directory_listings`
- **Collection:** `leads` (with source: `directory_signup`)
- **Indexes:** `firestore.indexes.json`
- **Rules:** `firestore.rules`
- **Types:** `src/lib/types.ts` (DirectoryListing interface)

### API Routes
- `/api/directory/signup` - Free listing signup (creates lead + listing)
- `/api/directory/embed/full` - Full directory HTML (for iframes)
- `/api/directory/public/listings` - JSON API
- `/api/directory/track/impression` - View tracking
- `/api/directory/track/click` - Click tracking

### Admin Pages
- `/embed-codes` - Generate embed codes (unified for ads + directory)
- `/directory-listings` - View all listings

### Customer Pages
- `/my-directory-listing` - Customer edits their listing

### Embeddable Assets
- `public/directory-sdk.js` - JavaScript SDK for native embedding
- `public/directory-sdk.css` - Styles for SDK

---

## Embedding the Directory

### Method 1: iframe (Recommended)

```html
<iframe
  src="https://yourdomain.com/api/directory/embed/full?theme=light"
  width="100%"
  style="min-height: 800px; border: none;"
  title="Business Directory">
</iframe>
```

**Parameters:**
- `theme=light|dark|auto` - Color scheme
- `columns=2|3|4|auto` - Grid layout
- `category=retail` - Filter to category
- `featured=true` - Show featured only

### Method 2: JavaScript SDK

```html
<link rel="stylesheet" href="https://yourdomain.com/directory-sdk.css">
<script src="https://yourdomain.com/directory-sdk.js"></script>

<div id="business-directory"></div>

<script>
  BusinessDirectory.init({
    container: '#business-directory',
    theme: 'light',
    columns: 'auto'
  });
</script>
```

**Benefits:**
- Native rendering (no iframe)
- Full CSS control
- Better performance

---

## Deployment

### 1. Deploy Cloud Function

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 2. Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Test

1. Purchase an ad (test mode)
2. Check `directory_listings` collection in Firestore
3. Visit `/my-directory-listing` as customer
4. Visit `/embed-codes` to get embed code
5. Test embed on local HTML file

---

## Admin Guide

### Viewing Listings
- Go to `/directory-listings`
- See all active listings
- Filter by status or tier
- View analytics (views/clicks)

### Generating Embed Codes
- Go to `/embed-codes`
- Select "Business Directory" tab
- Configure appearance
- Copy embed code
- Paste on Wesley Chapel or Pasco website

---

## Customer Guide

### Editing Your Listing
1. Login to your account
2. Go to `/my-directory-listing`
3. Edit business information
4. Click "Save Changes"

### Managing Your Subscription
- Click "Manage Subscription" button
- Opens Stripe billing portal
- Upgrade, downgrade, or cancel

---

## Troubleshooting

### Listing not created after ad purchase
1. Check Cloud Function logs: `firebase functions:log`
2. Verify subscription status is `active`
3. Check user data exists in `users` collection

### Embed not showing
1. Test direct URL in browser
2. Check CORS headers
3. Verify Firestore rules deployed

### Customer can't edit listing
1. Verify they're logged in
2. Check listing `userId` matches their account
3. Verify Firestore rules allow update

---

## Security

- Public can only read **active** listings
- Customers can only edit **their own** listing
- Admins have full access
- Only Cloud Functions can create listings
- Analytics writes are server-side only

---

## Analytics

Tracked automatically:
- **Impressions:** When listing is viewed in directory
- **Clicks:** When "Visit Website" is clicked
- **Daily breakdown:** Stored in `analytics/{YYYY-MM-DD}` subcollection

---

## Directory Tiers

| Tier | Description | Created By | Auto-Approved? |
|------|-------------|------------|----------------|
| `free` | Free signup (lead gen) | `/directory-signup` form | ❌ No - requires admin approval |
| `included` | Included with ad plan | Cloud Function on subscription | ✅ Yes - auto-approved |
| `legacy` | Migrated from old system | Migration script | ✅ Yes |

---

## Business Categories (12 max)

| Category | Label | Icon |
|----------|-------|------|
| `restaurants_food` | Restaurants & Food | 🍽️ |
| `home_services` | Home Services | 🏠 |
| `health_medical` | Health & Medical | 🏥 |
| `beauty_wellness` | Beauty & Wellness | 💆 |
| `professional_services` | Professional Services | 💼 |
| `automotive` | Automotive | 🚗 |
| `retail_shopping` | Retail & Shopping | 🛍️ |
| `real_estate` | Real Estate | 🏘️ |
| `education_childcare` | Education & Childcare | 📚 |
| `fitness_recreation` | Fitness & Recreation | 🏋️ |
| `pets_animals` | Pets & Animals | 🐾 |
| `other` | Other | 📌 |

---

## Content Safeguards

Free signups go through validation:

1. **No All-Caps:** Business names and descriptions with >50% uppercase are auto-converted to Title Case
2. **Spam Detection:** Blocks promotional phrases, excessive punctuation, repeated characters
3. **URL Validation:** Verifies website and social URLs are properly formatted
4. **Category Validation:** Must select from predefined categories

---

## Lead Generation

Free directory signups create leads that can be followed up:

1. **View Directory Leads:** `/leads?source=directory_signup`
2. **Lead Score:** Directory signups get +18 points (high intent)
3. **Follow-up Goal:** Convert to paid ad subscription
4. **Tracking:** All leads have activities logged

---

## URLs

| Purpose | URL |
|---------|-----|
| Free Signup | `/directory-signup` |
| Embed Codes (Admin) | `/embed-codes` |
| All Listings (Admin) | `/directory-listings` |
| My Listing (Customer) | `/my-directory-listing` |
| Directory Leads | `/leads?source=directory_signup` |

---

## Notes

- Free listings are a **limited time promotion**
- Eventually, only ad subscribers will get listings
- Free signups create valuable leads for ad sales
- All Wix-specific code has been removed
- Embedded directory includes CTA to sign up
