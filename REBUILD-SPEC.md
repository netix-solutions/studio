# Community Websites Studio — Full Rebuild Specification

> **Purpose**: This document captures every feature, data model, business rule, and workflow in the current Firebase-based app so you can rebuild it from scratch on **Vercel + Supabase + Stripe** using Claude Code.
>
> **Current stack**: Next.js 14 (App Router), Firebase Auth, Firestore, Firebase Storage, Firebase Cloud Functions, Stripe (via Firebase extension), SendGrid
>
> **Target stack**: Next.js 14 (App Router), Supabase Auth, Supabase Postgres, Supabase Storage, Supabase Edge Functions (or Vercel cron), Stripe (direct webhooks), SendGrid

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Database Schema (Postgres)](#3-database-schema-postgres)
4. [Authentication](#4-authentication)
5. [Authorization & Row-Level Security](#5-authorization--row-level-security)
6. [Pages & Routes](#6-pages--routes)
7. [Lead Capture & Management](#7-lead-capture--management)
8. [Lead Scoring](#8-lead-scoring)
9. [Email System](#9-email-system)
10. [Lead Sequences (Drip Campaigns)](#10-lead-sequences-drip-campaigns)
11. [Pricing & Stripe Checkout](#11-pricing--stripe-checkout)
12. [Subscription Management](#12-subscription-management)
13. [Advertisement Pipeline](#13-advertisement-pipeline)
14. [Ad Server & Embed System](#14-ad-server--embed-system)
15. [Business Directory](#15-business-directory)
16. [File Storage](#16-file-storage)
17. [Background Jobs & Triggers](#17-background-jobs--triggers)
18. [Analytics & Tracking](#18-analytics--tracking)
19. [Admin Features](#19-admin-features)
20. [Customer (Non-Admin) Features](#20-customer-non-admin-features)
21. [Real-Time Subscriptions](#21-real-time-subscriptions)
22. [Environment Variables](#22-environment-variables)
23. [UI Component Library](#23-ui-component-library)
24. [Migration Notes & Gotchas](#24-migration-notes--gotchas)

---

## 1. Product Overview

**Community Websites Studio** is a B2B SaaS platform that sells rotating banner ad placements on local community websites (WesleyChapelCommunity.com, PascoCommunity.com). The app handles the full lifecycle:

1. **Lead capture** — Landing page form collects business info, creates a lead
2. **Lead nurture** — Automated emails, scoring, sequences, admin follow-up
3. **Checkout** — Self-service Stripe checkout with monthly/yearly plans
4. **Ad creation** — Customer designs their own ad (Konva canvas) or requests professional design
5. **Ad approval** — Admin reviews, sends proof to customer, customer approves (with 48hr auto-approval)
6. **Ad publishing** — Admin publishes approved ad to the ad server
7. **Ad serving** — Embeddable widgets/iframes serve rotating ads on community sites with impression/click tracking
8. **Directory** — Every paying customer gets a free business directory listing

**Users of the system:**
- **Visitors** — Browse landing/pricing pages, submit lead form
- **Customers** — Paying businesses who manage their ad, view stats, manage directory listing
- **Admins** — Manage leads, pipeline, subscriptions, ad design/approval, directory, email templates, users

**Business details:**
- Company: Community-Websites.com
- Phone: 813-544-8383
- Two community sites: Wesley Chapel and Pasco County
- Plans: Single-Site and Multi-Site, with monthly and yearly billing
- Yearly plans include a free spotlight article (~$250 value)

---

## 2. Tech Stack & Architecture

### Target Stack

```
Frontend:        Next.js 14 (App Router, React Server Components where possible)
Hosting:         Vercel
Database:        Supabase Postgres
Auth:            Supabase Auth (email/password + phone/SMS)
Storage:         Supabase Storage
Real-time:       Supabase Realtime (postgres changes)
Background Jobs: Vercel Cron (for scheduled tasks) + Supabase Database Triggers/Functions
Payments:        Stripe (direct API + webhooks, NOT a Firebase extension)
Email:           SendGrid (direct API calls)
Analytics:       Google Analytics 4 (GA4), Measurement ID: G-DF78ZBZW82
Ad Designer:     Konva.js (canvas-based, dynamically imported to avoid SSR)
UI Library:      shadcn/ui + Tailwind CSS
```

### Key Architecture Decisions

- **Supabase replaces Firebase entirely** — Auth, DB, Storage, and real-time
- **Stripe webhook handler** replaces Firebase Stripe Extension — you'll create a `/api/webhooks/stripe` route that handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Supabase Database triggers** replace Cloud Functions — Postgres functions that fire on INSERT/UPDATE/DELETE
- **Vercel Cron** replaces Firebase Pub/Sub scheduled functions — `vercel.json` cron config hitting API routes
- **Row-Level Security (RLS)** replaces Firestore security rules
- **Supabase Realtime** replaces Firestore `onSnapshot` listeners

---

## 3. Database Schema (Postgres)

### Core Tables

```sql
-- ============================================
-- LEADS
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  site_coverage TEXT[] DEFAULT '{}',  -- ['wesley-chapel', 'pasco']

  -- Pipeline
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Scoring
  lead_score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  lead_score_updated_at TIMESTAMPTZ,

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'website',
  -- Valid: website, referral, social_media, google_ads, facebook_ads, email_campaign, cold_outreach, event, partner, directory_signup, other
  source_detail TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Conversion
  converted_to_customer_id UUID REFERENCES auth.users(id),
  converted_at TIMESTAMPTZ,

  -- Nurture
  discount_email_sent BOOLEAN DEFAULT FALSE,
  discount_email_sent_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  estimated_value NUMERIC,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAD ACTIVITIES (timeline events)
-- ============================================
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  -- Valid types: note, email_sent, email_received, email_scheduled, call, meeting,
  -- priority_change, conversion, task_created, task_completed, assignment_change,
  -- page_visit, login, sequence_enrolled, sequence_email_sent, sequence_completed, sequence_cancelled
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS (extended profile, beyond auth.users)
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  contact_name TEXT,
  first_name TEXT,
  last_name TEXT,
  contact_title TEXT,
  business_name TEXT,
  phone TEXT,
  cell_phone TEXT,
  business_phone TEXT,
  business_description TEXT,
  business_category TEXT,

  -- Ad preferences
  ad_website_url TEXT,
  ad_text TEXT,
  ad_title TEXT,
  ad_notes TEXT,
  logo_url TEXT,
  banner_image_url TEXT,
  website_url TEXT,
  customer_sample_ad_url TEXT,
  request_custom_design BOOLEAN DEFAULT FALSE,

  -- Design preferences
  design_preferences JSONB DEFAULT '{}',
  -- { primaryColor, secondaryColor, backgroundColor, textColor, fontStyle, additionalNotes }

  -- File uploads (array of up to 3 URLs)
  file_uploads TEXT[] DEFAULT '{}',

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Social links
  social_links JSONB DEFAULT '{}',
  -- { facebookUrl, instagramUrl, linkedinUrl, twitterUrl, youtubeUrl, tiktokUrl, yelpUrl, googleBusinessUrl }

  -- Manual entry tracking
  is_manual_entry BOOLEAN DEFAULT FALSE,
  manual_entry_by UUID REFERENCES auth.users(id),
  manual_entry_at TIMESTAMPTZ,

  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,  -- Stripe subscription ID or manual UUID
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_customer_id TEXT,

  -- Plan info
  plan_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  -- Valid: active, trialing, canceled, unpaid, past_due, incomplete, incomplete_expired

  -- Pricing
  amount NUMERIC,
  currency TEXT DEFAULT 'usd',
  billing_period TEXT, -- monthly, quarterly, yearly, one_time, custom

  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Stripe raw data
  stripe_data JSONB DEFAULT '{}',

  -- Manual subscription fields
  is_manual_entry BOOLEAN DEFAULT FALSE,
  payment_method TEXT, -- cash, check, invoice, bank_transfer, credit_card_offline, other
  payment_notes TEXT,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTION COMMENTS (admin notes on subscriptions)
-- ============================================
CREATE TABLE subscription_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),  -- owner of subscription (for RLS)
  comment TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADVERTISEMENTS (customer ad tickets)
-- ============================================
CREATE TABLE advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_id TEXT REFERENCES subscriptions(id),

  status TEXT NOT NULL DEFAULT 'info_needed',
  -- Valid: info_needed, design_pending, in_review, customer_approval, approved, live, paused, completed, canceled, archived

  -- Customer info (denormalized)
  business_name TEXT,
  contact_name TEXT,
  contact_title TEXT,
  email TEXT,
  phone TEXT,
  cell_phone TEXT,
  business_phone TEXT,
  ad_website_url TEXT,
  ad_text TEXT,
  ad_title TEXT,
  ad_notes TEXT,
  logo_url TEXT,

  -- Ad creative
  ad_proof_url TEXT,
  ad_proof_destination_url TEXT,
  customer_sample_ad_url TEXT,
  customer_uploads TEXT[] DEFAULT '{}',  -- up to 3 files

  -- Design
  request_custom_design BOOLEAN DEFAULT FALSE,
  design_preferences JSONB DEFAULT '{}',
  design_draft JSONB,  -- { elements: DesignElement[], backgroundColor: string, savedAt: timestamp }

  -- Timeline timestamps
  info_submitted_at TIMESTAMPTZ,
  design_submitted_at TIMESTAMPTZ,
  sent_for_review_at TIMESTAMPTZ,
  sent_for_approval_at TIMESTAMPTZ,
  auto_approval_at TIMESTAMPTZ,  -- 48 hours after sent_for_approval_at
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Revision tracking
  revision_count INTEGER DEFAULT 0,
  revision_notes TEXT,

  -- Change request tracking
  is_change_request BOOLEAN DEFAULT FALSE,
  change_request_type TEXT,  -- self_design, team_design
  change_requested_at TIMESTAMPTZ,
  parent_ad_id UUID REFERENCES advertisements(id),
  replaced_by_ad_id UUID REFERENCES advertisements(id),

  -- Ad server link
  live_ad_id UUID,  -- references live_ads table

  -- Performance
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Admin tracking
  last_action_by UUID REFERENCES auth.users(id),
  last_action_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AD DESIGN VERSIONS (saved canvas states)
-- ============================================
CREATE TABLE ad_design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  elements JSONB NOT NULL DEFAULT '[]',
  background_color TEXT DEFAULT '#ffffff',
  preview_image_url TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LIVE ADS (published ads served to websites)
-- ============================================
CREATE TABLE live_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,

  -- Creative
  image_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  alt_text TEXT,

  -- Placement
  placement TEXT DEFAULT 'inline',
  width INTEGER DEFAULT 600,
  height INTEGER DEFAULT 200,

  -- Targeting
  target_websites TEXT[] DEFAULT '{}',  -- ['wesley-chapel', 'pasco-county']

  -- Display
  weight INTEGER DEFAULT 50 CHECK (weight >= 1 AND weight <= 100),
  status TEXT NOT NULL DEFAULT 'active',
  -- Valid: active, paused, scheduled, expired, archived

  -- Scheduling
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Relationships
  source_advertisement_id UUID REFERENCES advertisements(id),
  customer_id UUID REFERENCES auth.users(id),
  customer_name TEXT,

  -- Analytics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Directory listing (embedded)
  show_in_directory BOOLEAN DEFAULT FALSE,
  directory_listing JSONB DEFAULT '{}',

  -- Archive
  archived_at TIMESTAMPTZ,
  archive_reason TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AD EVENTS (impression/click log)
-- ============================================
CREATE TABLE ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES live_ads(id),
  type TEXT NOT NULL CHECK (type IN ('impression', 'click')),
  website TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DIRECTORY LISTINGS
-- ============================================
CREATE TABLE directory_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  stripe_customer_id TEXT,

  -- Business info
  business_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  category TEXT DEFAULT 'other',
  -- Valid categories: restaurants_food, home_services, health_medical, beauty_wellness,
  -- professional_services, automotive, retail_shopping, real_estate, education_childcare,
  -- fitness_recreation, pets_animals, other
  year_established INTEGER,

  -- Contact
  contact_name TEXT,
  contact_email TEXT,
  phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  website_url TEXT,
  appointment_url TEXT,
  menu_url TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Social
  social_links JSONB DEFAULT '{}',

  -- Visual
  logo_url TEXT,
  banner_image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',  -- max 6

  -- Hours & amenities
  business_hours JSONB DEFAULT '{}',
  payment_methods_accepted TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',

  -- Display toggles
  show_contact_info BOOLEAN DEFAULT TRUE,
  show_social_links BOOLEAN DEFAULT TRUE,
  show_address BOOLEAN DEFAULT TRUE,
  show_business_hours BOOLEAN DEFAULT FALSE,
  show_amenities BOOLEAN DEFAULT FALSE,

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending',
  -- Valid: pending, active, approved, hidden, rejected, expired
  tier TEXT DEFAULT 'free',  -- free, included (with ad subscription), premium
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMPTZ,
  is_premium BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  -- Subscription link
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,

  -- Moderation details
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  moderation_notes TEXT,

  -- Analytics
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  created_by TEXT,  -- 'auto_from_ad_subscription', user ID, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DIRECTORY DRAFTS (public signup before approval)
-- ============================================
CREATE TABLE directory_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,  -- e.g., 'pricing_link', 'new_customer_welcome'
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  trigger_name TEXT,  -- e.g., 'interest_form_submission', 'new_subscription_purchase'
  trigger_description TEXT,
  placeholders TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SENT EMAILS (delivery log)
-- ============================================
CREATE TABLE sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_id UUID,  -- lead or user ID
  template_id TEXT REFERENCES email_templates(id),
  trigger_type TEXT,
  subject TEXT,
  categories TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULED LEAD EMAILS
-- ============================================
CREATE TABLE scheduled_lead_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES email_templates(id),
  status TEXT NOT NULL DEFAULT 'pending',
  -- Valid: pending, sent, failed, skipped
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  skip_reason TEXT,
  error TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAD SEQUENCES (drip campaigns)
-- ============================================
CREATE TABLE lead_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL DEFAULT 'manual',  -- 'lead_created' or 'manual'
  steps JSONB NOT NULL DEFAULT '[]',
  -- Each step: { order, delayDays, templateId, templateName, skipIfContacted }
  is_active BOOLEAN DEFAULT TRUE,
  enrollment_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAD SEQUENCE ENROLLMENTS
-- ============================================
CREATE TABLE lead_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES lead_sequences(id) ON DELETE CASCADE,
  sequence_name TEXT,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lead_name TEXT,
  current_step_index INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  -- Valid: active, completed, paused, cancelled
  next_step_scheduled_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT
);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id),
  advertisement_id UUID REFERENCES advertisements(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Valid: pending, in_progress, completed, canceled
  type TEXT DEFAULT 'follow_up',
  -- Valid: follow_up, call, email, meeting, review, custom
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT,  -- daily, weekly, monthly
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLANS (synced from Stripe)
-- ============================================
CREATE TABLE plans (
  id TEXT PRIMARY KEY,  -- Stripe product ID
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  features TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_prices (
  id TEXT PRIMARY KEY,  -- Stripe price ID
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  unit_amount INTEGER NOT NULL,  -- cents
  currency TEXT DEFAULT 'usd',
  interval TEXT,  -- 'month' or 'year'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEGAL DOCUMENTS
-- ============================================
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY,  -- e.g., 'terms-of-service', 'privacy-policy'
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SPOTLIGHT SUBMISSIONS
-- ============================================
CREATE TABLE spotlight_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_leads_email_conversion ON leads(email, converted_to_customer_id);
CREATE INDEX idx_leads_conversion_created ON leads(converted_to_customer_id, created_at);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);

CREATE INDEX idx_advertisements_user ON advertisements(user_id, created_at DESC);
CREATE INDEX idx_advertisements_status ON advertisements(status, created_at DESC);
CREATE INDEX idx_advertisements_parent ON advertisements(parent_ad_id, status);
CREATE INDEX idx_advertisements_subscription ON advertisements(subscription_id);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_live_ads_status ON live_ads(status, created_at DESC);
CREATE INDEX idx_live_ads_customer ON live_ads(customer_id, status);
CREATE INDEX idx_live_ads_serving ON live_ads(status, weight DESC) WHERE status = 'active';

CREATE INDEX idx_ad_events_ad ON ad_events(ad_id, created_at DESC);
CREATE INDEX idx_ad_events_type ON ad_events(ad_id, type);

CREATE INDEX idx_directory_listings_status ON directory_listings(status, is_featured DESC, business_name);
CREATE INDEX idx_directory_listings_category ON directory_listings(status, category, is_featured DESC);
CREATE INDEX idx_directory_listings_user ON directory_listings(user_id, status);
CREATE INDEX idx_directory_listings_tier ON directory_listings(tier, created_at DESC);

CREATE INDEX idx_scheduled_emails_pending ON scheduled_lead_emails(status, scheduled_for) WHERE status = 'pending';

CREATE INDEX idx_enrollments_status ON lead_sequence_enrollments(status, next_step_scheduled_at);
CREATE INDEX idx_enrollments_sequence ON lead_sequence_enrollments(sequence_id, lead_id, status);

CREATE INDEX idx_tasks_status ON tasks(status, due_at);
```

---

## 4. Authentication

### Methods

1. **Email + Password** — Primary registration/login method
2. **Phone + SMS** — Secondary login with OTP verification
3. **Email Link (Passwordless)** — Send magic link to email

### Registration Flow

1. User submits email + password + accepts terms
2. Supabase creates auth user
3. App checks if a lead exists with that email
4. If lead found: create `user_profiles` row with lead data (businessName, contactName, phone), mark lead as `converted_to_customer_id`
5. If no lead: create `user_profiles` row with basic info
6. Check sessionStorage for `selectedPriceId` — if present, trigger Stripe checkout immediately
7. Track `sign_up` event in GA4

### Phone Auth Flow

1. User enters phone number
2. Supabase sends SMS OTP
3. User enters 6-digit code
4. On successful auth, check for existing user by phone number:
   - Search `user_profiles` by phone, cell_phone
   - Search `leads` by phone
   - If match found, merge/link the accounts
5. Create or update `user_profiles` row

### Account Merging Logic

When a phone auth user signs in, search for their phone number in multiple formats:
- E.164: `+15551234567`
- Without country code: `5551234567`
- Formatted: `(555) 123-4567`

Match against `user_profiles.phone`, `user_profiles.cell_phone`, and `leads.phone`. If found, associate the phone auth user with the existing profile/lead.

### Password Reset

Standard Supabase `resetPasswordForEmail()` flow.

### Admin Role

In the current app, admin is determined by existence of a document in `roles_admin` collection and custom claims. In Supabase:
- Use the `role` column in `user_profiles` table (`'admin'` or `'user'`)
- Enforce via RLS policies
- No need for custom claims — RLS checks `user_profiles.role` directly

---

## 5. Authorization & Row-Level Security

### Public Access (no auth)

- `legal_documents`: SELECT
- `plans` + `plan_prices`: SELECT where active = true
- `directory_listings`: SELECT where status = 'active'
- `live_ads`: SELECT where status = 'active' (for ad serving)
- `leads`: INSERT (form submission creates a lead)

### Authenticated User Access

- `user_profiles`: SELECT/UPDATE own row only
- `subscriptions`: SELECT own rows only
- `advertisements`: SELECT/UPDATE own rows only
- `ad_design_versions`: SELECT/INSERT own rows only
- `directory_listings`: SELECT/UPDATE own listing (limited fields: business info, contact, social, images)
- `spotlight_submissions`: INSERT own, SELECT own
- `sent_emails`: SELECT own (by recipient_id)

### Admin Access

- All tables: Full CRUD
- Admin check: `EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')`

### Special Rules

- `lead_activities`: Admins can read/create. Converted customers can create only `page_visit` and `login` type activities for their linked lead.
- `subscription_comments`: Admin create only. Owner + admin read. Immutable (no update/delete).
- `directory_listings`: Customers can only update specific fields (business info, contact, social, images). Cannot change status, tier, or moderation fields.

---

## 6. Pages & Routes

### Public Routes (no auth required)

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero with lead capture form, features, social proof, pricing preview, second CTA form at bottom |
| `/login` | Login with email/password, email link, or phone tabs |
| `/register` | Email/password registration with terms acceptance |
| `/forgot-password` | Password reset form |
| `/pricing` | Plan cards with monthly/yearly toggle, features comparison, design options (DIY vs Professional), FAQ accordion |
| `/thank-you` | Post-checkout confirmation with next steps |
| `/privacy-policy` | Legal page (content from DB) |
| `/terms-of-service` | Legal page (content from DB) |
| `/sponsors` | Sponsor information page |
| `/directory-signup` | Public directory listing signup form (creates lead + directory draft) |
| `/ad-action` | Token-based ad approval/revision handler (from email links) |

### Protected Routes — Customer

| Route | Description |
|-------|-------------|
| `/account` | Customer dashboard: subscription status, ad status, workflow progress, stats, quick actions. Tabs: Overview, Ads, Directory, Settings |
| `/design-ad` | Konva.js canvas ad designer with element tools, versioning, download |
| `/approve-ad/[id]` | View ad proof, approve or request revision with notes |
| `/my-directory-listing` | Manage own directory listing |
| `/spotlight-article` | Submit spotlight article |

### Protected Routes — Admin

| Route | Description |
|-------|-------------|
| `/dashboard` | Admin KPIs: pipeline stats, pending approvals, recent leads, ad network stats, activity feed |
| `/leads` | Lead table with search, filter (source, priority, status), sort, bulk actions |
| `/leads/[id]` | Lead detail: contact info, score gauge, activity timeline, email/schedule, tasks, sequence enrollment |
| `/leads/dashboard` | Lead analytics overview |
| `/leads/tasks` | Task management across all leads |
| `/leads/sequences` | Email sequence management: create/edit sequences, trigger config |
| `/leads/sequences/[id]` | Individual sequence config with steps |
| `/pipeline` | Kanban board: Info Needed → Design Pending → In Review → Customer Approval → Approved → Live (+ Paused, Completed, Canceled) |
| `/advertisements` | Ad table with filters, status tracking, bulk actions |
| `/advertisements/[id]` | Individual ad detail, proof upload, status changes |
| `/subscriptions` | All subscriptions table with customer info, status, ad status, comments |
| `/subscriptions/[id]` | Subscription detail |
| `/directory` | Directory management with preview cards |
| `/directory-listings` | Directory admin table: search, filter, featured controls, bulk actions |
| `/ad-server` | Live ad management: create/edit/delete, analytics, domain filtering, embed code generation |
| `/automated-emails` | Email template CRUD, test sending, grid/list views |
| `/users` | User management: roles, edit, make/remove admin |
| `/financials` | Revenue metrics (MRR, ARR), trends chart, forecast, breakdown by plan, churn |
| `/manual-entry` | Create customer + subscription + ad in one form (for offline sales) |
| `/import` | CSV bulk import of Stripe customers |
| `/reconciliation` | Data reconciliation tools |
| `/admin-notifications` | Notification settings |
| `/embed-codes` | Generate directory and ad embed codes with customization |
| `/legal` | Legal document management |

### Layout Structure

```
Root Layout (/)
├── Firebase/Supabase Provider
├── GA4 Script
├── Toast Provider
├── Public pages (landing, login, register, pricing, etc.)
└── Protected Layout (/(app)/)
    ├── Auth check → redirect to /login if not authenticated
    ├── Create user_profiles row if missing
    ├── Check admin role
    ├── Admin layout: Sidebar + Header + CommandPalette
    ├── Customer layout: Header only (no sidebar)
    └── Route protection:
        ├── Non-admins redirected away from admin routes
        └── Admins redirected to /leads as default
```

**Admin routes list** (for route protection): `/leads`, `/subscriptions`, `/advertisements`, `/dashboard`, `/users`, `/automated-emails`, `/import`, `/legal`, `/pipeline`, `/ad-server`, `/directory`, `/directory-listings`, `/manual-entry`, `/reconciliation`, `/admin-notifications`, `/financials`, `/embed-codes`

---

## 7. Lead Capture & Management

### Lead Form (Landing Page)

Fields: businessName, firstName, lastName, email, phone, siteCoverage (checkboxes: Wesley Chapel, Pasco)

On submit:
1. Create `leads` row with priority=medium, status=active
2. Detect source from UTM params (google → google_ads, facebook/fb/instagram → facebook_ads, etc.)
3. Track `generate_lead` event in GA4 (value=50)
4. Set GA4 user properties (source, siteCoverage)
5. Send auto-response email using `pricing_link` template with link to `/pricing`
6. Redirect to `/pricing?businessName=X&email=Y`

### Directory Signup Form

Fields: firstName, lastName, email, phone, businessName, tagline, description, category, websiteUrl, address, city, state, zipCode, facebookUrl, instagramUrl

On submit:
1. Validate (businessName, email, category required)
2. Duplicate email check
3. Create `leads` row with source=directory_signup, priority=high
4. Create `directory_drafts` row with form data
5. Show success page with ad upsell

### Lead Management Features

- **Search**: By name, business, email
- **Filter**: By source, priority, status
- **Sort**: By created date or lead score
- **Bulk actions**: Send email, delete
- **Quick actions**: Add note, snooze, send email
- **Lead detail**: Full contact info, score gauge, activity timeline, email history, task management, sequence enrollment

---

## 8. Lead Scoring

Scoring is 0-100, calculated based on engagement signals. **Recalculated periodically via cron job.**

### Scoring Rules

| Signal | Points | Max |
|--------|--------|-----|
| Form fill | +10 | 10 |
| Page visit | +2 per visit | 20 |
| Login | +5 per login | 25 |
| Email opened | +5 per open | 25 |
| Email link clicked | +10 per click | 30 |
| Call logged | +10 per call | 30 |
| Meeting logged | +15 per meeting | 30 |
| Source: referral | +15 | 15 |
| Source: google_ads | +10 | 10 |
| Has phone number | +5 | 5 |
| Has estimated value | +5 | 5 |

### Recency Decay

After 14 days of inactivity (no `last_contacted_at` update): -1 point per day.

### Score Breakdown

Store in `score_breakdown` JSONB: `{ engagement, profile, recency, source }` for display in the gauge component.

---

## 9. Email System

### Sending Method

Direct SendGrid API calls from API routes. No Firebase mail collection trigger.

```
POST /api/send-email
Body: { to, subject, html, recipientId, templateId, triggerType, categories }
→ Calls SendGrid API
→ Logs to sent_emails table
```

### Email Templates (seed data)

10 default templates to seed into `email_templates` table:

1. **pricing_link** — Auto-sent after lead form submission. Includes pricing page link. Placeholders: `{{contactName}}`, `{{businessName}}`, `{{pricingLink}}`
2. **new_customer_welcome** — Auto-sent after subscription purchase. Includes account link. Placeholders: `{{contactName}}`, `{{accountLink}}`
3. **manual_follow_up** — Manual send. Generic follow-up.
4. **still_interested** — Manual send. Check-in for inactive leads.
5. **discount_offer** — Auto-sent 3 hours after lead creation (if not converted). Discount code: TAKE10OFF (10%). Placeholders include `{{pricingLink}}`
6. **last_chance** — Manual send. Final follow-up.
7. **value_highlight** — Manual send. 3 benefits of local advertising.
8. **thank_you_no_commitment** — Manual send. Warm goodbye, keep door open.
9. **complete_directory_listing** — Manual send. Encourage completing directory profile.
10. Additional templates as needed.

### Email Wrapper

All outgoing emails are wrapped in a branded HTML template with:
- Header: "24/7 Support: 813-544-8383" with optional CTA button
- Company logo
- Body content
- Footer: Contact info, phone, unsubscribe

### Placeholder Replacement

Templates use `{{contactName}}`, `{{businessName}}`, `{{pricingLink}}`, `{{accountLink}}` — replaced at send time.

---

## 10. Lead Sequences (Drip Campaigns)

### Structure

A sequence has:
- Name, description, trigger (manual or lead_created)
- Steps: ordered array of `{ order, delayDays, templateId, templateName, skipIfContacted }`

### Enrollment

- Manual enrollment from lead detail page
- Auto-enrollment when trigger matches (lead_created)
- Track: currentStepIndex, status (active/completed/paused/cancelled), nextStepScheduledAt

### Processing (Cron — every hour)

1. Find all active enrollments where `next_step_scheduled_at <= now`
2. For each enrollment:
   - Check sequence still active
   - Check `skipIfContacted` — if lead was contacted since enrollment, skip this step
   - Send email via SendGrid
   - Log activity on lead
   - Update `last_contacted_at` on lead
   - Advance to next step (calculate next scheduled time) or mark complete

---

## 11. Pricing & Stripe Checkout

### Plans

Fetched from `plans` + `plan_prices` tables (originally synced from Stripe):
- **Single-Site**: Display on one community site
- **Multi-Site** (featured/best value): Display on all community sites
- Each plan has monthly and yearly prices
- Yearly plans include free spotlight article bonus

### Checkout Flow

1. User clicks plan button on `/pricing`
2. If not logged in: store `selectedPriceId` in sessionStorage, redirect to `/register`
3. After registration (or if already logged in): call checkout API
4. **Create Stripe Checkout Session** via API route:
   ```
   POST /api/checkout
   Body: { priceId, userId, userEmail, successUrl, cancelUrl }
   → stripe.checkout.sessions.create({
       customer: stripeCustomerId (create if needed),
       line_items: [{ price: priceId, quantity: 1 }],
       mode: 'subscription',
       allow_promotion_codes: true,
       success_url, cancel_url,
       metadata: { userId }
     })
   → Returns checkout URL
   ```
5. Redirect user to Stripe checkout
6. On success: Stripe webhook fires → creates subscription row → triggers downstream logic

### Stripe Webhook Handler

```
POST /api/webhooks/stripe
```

Handle these events:
- **`checkout.session.completed`**: Link Stripe customer to user, log conversion
- **`customer.subscription.created`**: Create subscription row, mark lead as converted, auto-create directory listing
- **`customer.subscription.updated`**: Update subscription row. If status changed active→inactive, cancel ads.
- **`customer.subscription.deleted`**: Update subscription row, check for other active subs, cancel ads if none.
- **`invoice.payment_failed`**: Update subscription status

### Billing Portal

```
POST /api/billing-portal
Body: { userId, returnUrl }
→ stripe.billingPortal.sessions.create({ customer, return_url })
→ Returns portal URL
```

---

## 12. Subscription Management

### Subscription Statuses

- `active` — Currently paying
- `trialing` — In trial period
- `canceled` — Canceled (may still be active until period end)
- `unpaid` — Payment failed
- `past_due` — Past due
- `incomplete` — Initial payment incomplete
- `incomplete_expired` — Incomplete and expired

### Active vs Inactive

- **Active**: `active`, `trialing`
- **Inactive**: `canceled`, `unpaid`, `past_due`, `incomplete_expired`

### Manual Subscriptions

Admin can create subscriptions manually via `/manual-entry` for offline sales (cash, check, invoice). These have `is_manual_entry = true` and include `payment_method`, `payment_notes`, `billing_period`, manual `start_date`/`end_date`.

### Subscription Comments

Admins can add comments to subscriptions. Comments are immutable (no edit/delete). Visible to subscription owner and admins.

---

## 13. Advertisement Pipeline

### Status Workflow

```
info_needed → design_pending → in_review → customer_approval → approved → live
                                                                          ↓
                                                              paused / completed / canceled / archived
```

### Step-by-Step

1. **info_needed** — Created when subscription starts. Customer fills business info, contact details, uploads logo, chooses DIY or professional design.
2. **design_pending** — If customer chose "Let Us Design It". Admin/design team creates ad.
3. **in_review** — Design complete, admin reviews. Can request revisions (increments `revision_count`).
4. **customer_approval** — Admin sends proof image to customer via email with token-based approve/revise links. 48-hour auto-approval deadline (`auto_approval_at`).
5. **approved** — Customer approved (or auto-approved). Ready for admin to publish.
6. **live** — Admin publishes to ad server. Impressions and clicks tracked.

### Auto-Approval

- Calculated: `auto_approval_at = sent_for_approval_at + 48 hours`
- Function: `shouldAutoApprove(ad)` — returns true if past deadline
- Checked periodically or on page load

### Change Requests

Once an ad is live, customer can request changes:
- Creates new advertisement with `is_change_request = true`, `parent_ad_id` pointing to original
- `change_request_type`: `self_design` or `team_design`
- Follows same workflow
- When new ad goes live, old ad archived with `replaced_by_ad_id`

### Ad Designer (Konva.js)

Canvas-based design tool with:
- Text elements: text, fontSize, fontFamily, fontStyle, fill, align
- Image elements: src, position, size
- Background color picker
- Undo/redo
- Version history (saved to `ad_design_versions`)
- Download preview as image
- Dynamic import to avoid SSR issues

---

## 14. Ad Server & Embed System

### Live Ad Serving

```
GET /api/ads/serve?website=wesley-chapel
→ Returns random active ad weighted by `weight` field
→ HTML with image, click-through link, tracking pixel

GET /api/ads/serve-all?website=wesley-chapel
→ Returns all active ads for rotation

POST /api/ads/impression
Body: { adId, website }
→ Increments live_ads.impressions, logs to ad_events

POST /api/ads/click
Body: { adId, website }
→ Increments live_ads.clicks, logs to ad_events, returns target_url
```

### Embed Methods

Generated from `/embed-codes` page:

1. **iframe embed**: `<iframe src="/api/ads/embed?website=X&responsive=true" />`
2. **Wix-specific embed**: `/api/ads/wix-embed?website=X`
3. **Directory widget**: `/api/directory/widget` and `/api/directory/embed/full`

### Ad Placement

- Inline placement: 600x200 pixels
- Responsive mode available
- Weight-based rotation (1-100, higher = more likely to show)

### Community Websites

- `wesley-chapel` — Wesley Chapel Community
- `pasco-county` — Pasco County Community

---

## 15. Business Directory

### How Listings Are Created

1. **Auto-created** when ad subscription becomes active (tier: `included`, free with subscription)
2. **Public signup** at `/directory-signup` (creates draft, needs admin approval)
3. **Admin-created** manually

### Listing Features

- Business info: name, tagline, description, category (12 categories), year established
- Contact: phone, email, website, appointment URL, menu URL
- Address: street, city, state, zip
- Social: Facebook, Instagram, LinkedIn, Twitter, YouTube, TikTok, Yelp, Google Business
- Visual: logo, banner image, gallery (max 6)
- Hours: per-day open/close times with 24hr and holiday support
- Amenities: 20 predefined options (wifi, parking, pet friendly, etc.)
- Payment methods: 10 options

### Directory Display

- Public-facing directory with search and category filters
- Featured listings shown first
- Embeddable via iframe/widget with theme customization (light/dark/auto, columns, accent color)

### Analytics

Track views and clicks per listing. Show to listing owner in their dashboard.

---

## 16. File Storage

### Supabase Storage Buckets

```
advertisements/
  {userId}/{fileName}                           — Direct uploads
  {userId}/sample-ad/{fileName}                 — Sample ad images
  {userId}/uploads/{fileName}                   — Logos and general images
  {userId}/{advertisementId}/versions/{fileName} — Design version previews
  {userId}/{advertisementId}/{fileName}          — Ad-specific files

live-ads/
  {adId}/{fileName}                             — Published ad creatives (PUBLIC READ)

user-uploads/
  {userId}/logo/{fileName}                      — User logos
  {userId}/uploads/{fileName}                   — General file uploads
```

### Access Rules

- `advertisements/` — Owner (by userId path) or admin can read/write
- `live-ads/` — Public read, admin-only write
- `user-uploads/` — Owner or admin can read/write

---

## 17. Background Jobs & Triggers

### Vercel Cron Jobs

Configure in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-discount-emails",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/process-scheduled-emails",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/process-sequences",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/recalculate-scores",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/task-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

All cron routes protected by `CRON_SECRET` env var check.

### Cron Job Details

1. **send-discount-emails** (hourly) — Find leads created 3+ hours ago, not converted, no discount email sent → send `discount_offer` template, mark `discount_email_sent = true`

2. **process-scheduled-emails** (hourly) — Find `scheduled_lead_emails` with `status = pending` and `scheduled_for <= now` → send email, update status, log activity. Skip if lead converted.

3. **process-sequences** (hourly) — Find active enrollments with `next_step_scheduled_at <= now` → execute step (send email), advance or complete. Check `skipIfContacted`.

4. **recalculate-scores** (every 6 hours) — Recalculate all lead scores based on activities and recency.

5. **task-reminders** (daily at 9am) — Send reminder emails for tasks due today.

### Database Triggers (Supabase)

Replace Firebase Cloud Functions with Postgres triggers + Supabase Edge Functions:

1. **On subscription INSERT** → Mark linked lead as converted, log conversion activity, auto-create directory listing
2. **On subscription UPDATE (status change)** → If active→inactive: cancel all linked ads, archive live_ads. If inactive→active: log reactivation.
3. **On subscription DELETE** → Check for other active subs, cancel ads if none remaining. Deactivate directory listing.
4. **On user_profiles INSERT/UPDATE where role changes** → (replaces admin claims) — no action needed since RLS reads role directly

---

## 18. Analytics & Tracking

### Google Analytics 4

Measurement ID: `G-DF78ZBZW82`

### Events Tracked

**Conversion Events:**
- `generate_lead` — Lead form submission (value: 50)
- `sign_up` — Account registration (method: email/google/other)
- `login` — User login
- `purchase` — Subscription purchase + `subscription_started`

**Ecommerce Funnel:**
- `view_item_list` — Pricing page view
- `select_item` — Plan selection
- `begin_checkout` — Checkout initiated
- `add_payment_info` — Pre-Stripe redirect

**Ad Funnel:**
- `ad_creation_started` — Design method chosen
- `ad_info_submitted` — Business info completed
- `ad_design_submitted` — Design submitted
- `ad_approved` — Customer approved ad
- `ad_live` — Ad published

**Engagement:**
- Custom page views with dimensions
- CTA clicks (name, location, destination)
- Phone number clicks
- FAQ interactions (expand/collapse)
- Form field focus events
- Form abandonment (fields completed, completion rate)

**Error Tracking:**
- `error` — General errors (type, message, context)
- `checkout_error` — Checkout failures (step: initiation/payment/confirmation)

### User Properties

- `customer_type` — Plan name + billing cycle
- `lead_source` — How they found the site
- `site_coverage` — Which sites they're interested in

### Page Visit & Login Tracking

For logged-in users who have a linked lead (via `converted_to_customer_id`), track:
- Page visits → log `page_visit` activity on lead
- Logins → log `login` activity on lead

This feeds into lead scoring.

---

## 19. Admin Features

### Dashboard

- **Pipeline stats**: Count of ads in each status (action required, pending, live)
- **Pending approvals**: Ads awaiting customer approval
- **Recent leads**: Latest leads with quick actions
- **Ad network stats**: Total impressions, clicks, CTR across all live ads
- **Recent activity feed**: Timeline of admin actions

### Lead Management

- Table view with search, multi-filter, sort
- Bulk email send and delete
- Individual lead detail with:
  - Contact info editing
  - Lead score gauge with breakdown
  - Activity timeline (all interactions)
  - Email sending (manual, scheduled, from template)
  - Task creation and management
  - Sequence enrollment
  - Priority/status changes
  - Snooze functionality
  - Assignment to team members
  - Estimated value tracking

### Pipeline (Kanban)

Drag-and-drop board with columns for each ad status. Cards show business name, status badges, auto-approval indicators.

### Financial Reporting

- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Total revenue
- Monthly trends chart
- Revenue forecast
- Breakdown by plan and billing period
- Churn metrics
- Renewal forecasts

### User Management

- View all users with roles
- Edit user details
- Make/remove admin
- Delete users
- View email history per user
- Sync admin roles

### Command Palette

Cmd+K navigation palette for quick access to any page or action.

---

## 20. Customer (Non-Admin) Features

### Account Dashboard

- Subscription status and plan info
- Billing portal link (Stripe)
- Active ad status with workflow progress visualization
- Ad statistics (impressions, clicks, CTR)
- Quick action cards: Design Ad, Manage Ads, View Directory Listing, Settings

### Ad Design Tool

- Konva.js canvas (dynamically imported)
- Add/edit text elements (font, size, color, alignment)
- Add/edit image elements
- Background color picker
- Drag, resize, rotate elements
- Version history with restore
- Download preview image
- Submit for review

### Ad Approval

- View proof image
- Approve or request revision (with notes)
- Auto-approval after 48 hours

### Directory Listing

- View and edit own listing (limited to business info fields)
- View analytics (views, clicks)

---

## 21. Real-Time Subscriptions

The current app uses Firestore `onSnapshot` for live data. In Supabase, use **Supabase Realtime** (postgres changes channel).

### Tables Needing Real-Time

| Table | Where Used | What Changes |
|-------|-----------|--------------|
| `leads` | Leads page | New leads, status changes |
| `advertisements` | Pipeline, ads page | Status changes, new ads |
| `subscriptions` | Subscriptions page | Status changes |
| `subscription_comments` | Comments dialog | New comments |
| `scheduled_lead_emails` | Schedule dialog | Status updates |
| `sent_emails` | Email history | New sends |
| `lead_activities` | Lead detail | New activities |
| `live_ads` | Ad server page | Status changes |
| `directory_listings` | Directory page | Status changes |
| `legal_documents` | Legal page | Content updates |
| `spotlight_submissions` | Spotlight page | New submissions |

### Implementation Pattern

```typescript
// Supabase Realtime subscription
const channel = supabase
  .channel('leads-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'leads'
  }, (payload) => {
    // Update local state
  })
  .subscribe()
```

---

## 22. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# App
NEXT_PUBLIC_APP_URL=https://community-websites.com
CRON_SECRET=           # Protects cron API routes
EMAIL_ACTION_TOKEN_SECRET=  # Signs ad approval email tokens
ADMIN_EMAIL=           # Admin notification recipient

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-DF78ZBZW82
```

---

## 23. UI Component Library

### Base: shadcn/ui + Tailwind CSS

All UI components are from shadcn/ui. Key components used:

`Accordion`, `Alert`, `AlertDialog`, `Avatar`, `Badge`, `Button`, `Calendar`, `Card`, `Carousel`, `Checkbox`, `Collapsible`, `Command` (for command palette), `Dialog`, `DropdownMenu`, `Form` (react-hook-form integration), `Input`, `Label`, `Menubar`, `Popover`, `Progress`, `RadioGroup`, `ScrollArea`, `Select`, `Separator`, `Sheet`, `Sidebar`, `Skeleton`, `Slider`, `Switch`, `Table`, `Tabs`, `Textarea`, `Toast`, `Toggle`, `ToggleGroup`, `Tooltip`

### Custom Components

- **Rich Text Editor** — For email template editing
- **Email Editor** — Template editor with preview
- **Chart components** — Revenue trends, subscriptions chart, forecast
- **Ad Designer** — Konva.js canvas component
- **Lead Score Gauge** — Visual 0-100 gauge
- **Workflow Progress** — Step-by-step visual progress indicator

### Brand Colors (Tailwind config)

The app uses custom brand colors defined in Tailwind:
- `brand-primary` — Primary brand blue
- `brand-secondary` — Secondary brand color
- `success` — Green for positive actions
- `success-light` — Light green backgrounds

### Fonts

- Headline font: Custom font class `font-headline`
- Body: Default system/sans-serif

---

## 24. Migration Notes & Gotchas

### Key Differences: Firebase → Supabase

1. **NoSQL → Relational**: Firestore subcollections become separate tables with foreign keys. `users/{id}/advertisements/{id}` becomes `advertisements` table with `user_id` column.

2. **Collection Group Queries** → Standard SQL joins. Firestore `collectionGroup('advertisements')` becomes `SELECT * FROM advertisements`.

3. **Server Timestamps**: `serverTimestamp()` → `NOW()` in SQL or `DEFAULT NOW()`.

4. **Firestore Triggers** → Postgres triggers + functions, or Supabase Edge Functions with database webhooks.

5. **Firebase Auth Custom Claims** → Not needed. Use `user_profiles.role` column checked in RLS policies.

6. **Firebase Stripe Extension** → Direct Stripe API integration with webhook handler.

7. **Firestore Mail Collection** → Direct SendGrid API calls.

8. **onSnapshot** → Supabase Realtime channels.

9. **Firebase Storage URLs** → Supabase Storage public/signed URLs.

10. **Batch Writes** → Postgres transactions.

### Data Migration

If migrating existing data:
1. Export Firestore collections to JSON
2. Transform nested documents into flat relational rows
3. Map Firestore document IDs to UUIDs (or keep as TEXT primary keys for Stripe IDs)
4. Import to Postgres via Supabase SQL or API
5. Upload Storage files to Supabase Storage buckets
6. Re-create Stripe webhook endpoints pointing to new app

### Stripe Integration Changes

Current app uses Firebase Stripe Extension which:
- Auto-creates checkout sessions from Firestore writes
- Auto-syncs subscription data to Firestore

New app will:
- Create checkout sessions via Stripe API directly in API routes
- Handle all subscription lifecycle via webhook at `/api/webhooks/stripe`
- Manually sync subscription data to Postgres

### Phone Format Utilities

Keep these utility functions:
- `formatPhoneNumber(value)` — Formats as (XXX) XXX-XXXX for display
- `normalizePhoneNumber(phone)` — Converts to E.164 (+1XXXXXXXXXX) for auth/matching
- `fixUrl(value)` — Adds https:// if missing

### Ad Approval Token System

Ad approval emails contain signed tokens for approve/revise actions without requiring login:
- Generate: JWT with adId, action, expiry
- Verify at `/ad-action` page and `/api/ad-action` route
- Signed with `EMAIL_ACTION_TOKEN_SECRET`

### Things to NOT Forget

- [ ] Seed email templates on first deploy
- [ ] Sync Stripe products/prices to plans tables
- [ ] Set up Stripe webhook endpoint in Stripe dashboard
- [ ] Configure Supabase RLS policies for every table
- [ ] Set up Supabase Storage bucket policies
- [ ] Configure Vercel cron jobs in vercel.json
- [ ] Set up Supabase database triggers for subscription lifecycle
- [ ] Configure SendGrid sender authentication
- [ ] Set up GA4 with measurement ID
- [ ] Create admin user and set role='admin' in user_profiles
- [ ] Test phone auth SMS verification
- [ ] Dynamic import Konva.js to prevent SSR issues
- [ ] 48-hour auto-approval logic for ads
- [ ] Weight-based random ad selection for serving
