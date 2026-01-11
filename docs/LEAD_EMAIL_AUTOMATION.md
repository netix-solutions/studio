# Lead-to-Customer Tracking & Automated Email System

## Overview

This document describes the automated lead-to-customer conversion tracking and email automation system implemented for the Community-Websites.com platform.

## Features

### 1. Automatic Lead-to-Customer Conversion Detection

The system automatically detects when a lead becomes a paying customer and marks them as converted.

**How it works:**
- When a lead fills out the "Get Started" form, a lead document is created in the `leads` collection
- When a user registers and makes their first subscription payment, the system:
  - Looks up the lead by email
  - Marks the lead as converted by setting `convertedToCustomerId` and `convertedAt` fields
  - Logs a conversion activity in the lead's activity timeline

**Implementation:**
- Cloud Function: `onSubscriptionCreated` in `/functions/src/index.ts`
- Triggers: When a subscription document is created in `customers/{customerId}/subscriptions/{subscriptionId}`

### 2. 3-Hour Discount Email Automation

Leads who don't convert within 3 hours automatically receive a discount email with the code **TAKE10OFF** (10% off).

**How it works:**
- A scheduled Cloud Function runs every hour
- It finds leads that:
  - Were created 3+ hours ago
  - Haven't converted to customers (`convertedToCustomerId` is null)
  - Haven't received the discount email yet (`discountEmailSent` is false)
- Sends each qualifying lead the "Exclusive Discount Offer" email template
- Marks the lead with `discountEmailSent: true` and `discountEmailSentAt`

**Implementation:**
- Cloud Function: `sendThreeHourDiscountEmails` in `/functions/src/index.ts`
- Schedule: Every 1 hour (runs via Cloud Scheduler)
- Template: Uses the `discount_offer` email template from `emailTemplates` collection

**Discount Code:**
- Code: **TAKE10OFF**
- Discount: 10% off
- Already configured in Stripe and referenced in the email template

### 3. Flexible Scheduled Email System

Admins can schedule emails to be sent to leads at specific times with any email template.

**How it works:**
- Admins can schedule emails via the UI (on lead detail pages)
- Scheduled emails are stored in the `scheduledLeadEmails` collection
- A scheduled Cloud Function runs every hour to process pending emails
- The system automatically:
  - Sends emails at the scheduled time
  - Skips emails if the lead has converted to a customer
  - Logs activities on the lead timeline
  - Handles failures and retries

**Implementation:**
- Cloud Function: `processScheduledLeadEmails` in `/functions/src/index.ts`
- Schedule: Every 1 hour
- API Routes: `/api/schedule-lead-email` (POST, GET, DELETE)
- UI Components:
  - `ScheduleLeadEmailDialog` - Schedule new emails
  - `ScheduledLeadEmailsList` - View and manage scheduled emails

## Database Schema

### Lead Document Updates

```typescript
interface Lead {
  // Existing fields...
  
  // Conversion tracking
  convertedToCustomerId?: string;
  convertedAt?: Timestamp;
  
  // Email automation tracking
  discountEmailSent?: boolean;
  discountEmailSentAt?: Timestamp;
}
```

### Scheduled Lead Emails Collection

```typescript
interface ScheduledLeadEmail {
  id: string;
  leadId: string;
  templateId: string;
  scheduledFor: Timestamp;
  status: 'pending' | 'sent' | 'failed' | 'skipped' | 'cancelled';
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  sentAt?: Timestamp;
  error?: string;
  skipReason?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
}
```

## Usage Guide

### Setting Up Automated Emails

#### 3-Hour Discount Email

This is **automatic** - no setup required! The system automatically sends the discount email 3 hours after a lead is created (if they haven't converted).

To customize:
1. Go to "Email Templates" in the admin panel
2. Find the "Exclusive Discount Offer" template
3. Edit the content as needed
4. The TAKE10OFF discount code is already configured in Stripe

#### Scheduling Custom Follow-Up Emails

1. Navigate to the Leads page
2. Click on a lead to view their details
3. Click "Schedule Email" button
4. Select an email template (e.g., "Still Interested Check-In", "Manual Follow-Up")
5. Choose the date and time to send
6. Add optional notes
7. Click "Schedule Email"

The email will be sent automatically at the scheduled time!

### Creating Custom Email Templates

You can create custom email templates for different scenarios:

1. Go to "Email Templates" in the admin panel
2. Click "Create Template"
3. Fill in:
   - Name (e.g., "7-Day Follow-Up")
   - Description
   - Subject line (with placeholders)
   - HTML content (with placeholders)
4. Available placeholders:
   - `{{contactName}}` - Lead's name
   - `{{businessName}}` - Lead's business name
   - `{{pricingLink}}` - Link to pricing page

5. Save the template

Now you can use this template when scheduling emails!

### Example Email Campaigns

#### Campaign 1: Nurture Sequence
- **Day 0**: Lead fills form → Automatic pricing email sent
- **Day 0 + 3 hours**: If not converted → Automatic 10% discount email (TAKE10OFF)
- **Day 2**: Schedule "Still Interested Check-In"
- **Day 7**: Schedule "Why Local Advertising Works"
- **Day 14**: Schedule "Last Chance Reminder"

#### Campaign 2: Quick Follow-Up
- **Day 0**: Lead fills form → Automatic pricing email sent
- **Day 0 + 3 hours**: Automatic discount email
- **Day 1**: Schedule "Manual Follow-Up"
- **Day 5**: Schedule "Last Chance Reminder"

### Monitoring Email Performance

1. **Lead Activity Timeline**: View all emails sent to a lead
2. **Scheduled Emails Section**: See upcoming scheduled emails
3. **Email Status**: Track if emails were sent, failed, or skipped

## Cloud Functions

### Deploying Functions

After making changes to the Cloud Functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Function Schedules

The scheduled functions use Cloud Scheduler and run automatically:

- `sendThreeHourDiscountEmails`: Every 1 hour
- `processScheduledLeadEmails`: Every 1 hour

### Environment Variables

Make sure these are set in your Firebase project:

```bash
firebase functions:config:set app.url="https://your-domain.com"
```

Or in `.env` for local development:

```
APP_URL=http://localhost:3000
```

## Security Rules

The following Firestore security rules have been added:

```javascript
// SCHEDULED LEAD EMAILS
// Only admins can manage scheduled lead emails
match /scheduledLeadEmails/{emailId} {
  allow read, list, create, update, delete: if isAdmin();
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

## Testing

### Test the 3-Hour Discount Email

1. Create a test lead via the "Get Started" form
2. Wait 3 hours (or modify the Cloud Function to use 5 minutes for testing)
3. Check the lead's activity timeline to confirm the email was sent
4. Check the email inbox for the discount email

### Test Scheduled Emails

1. Go to a lead's detail page
2. Schedule an email for 5 minutes in the future
3. Wait for the scheduled time
4. Verify the email was sent by checking:
   - Lead activity timeline
   - The "Scheduled Emails" section (status should change to "sent")
   - The recipient's inbox

## Troubleshooting

### Discount Email Not Sending

1. Check Cloud Scheduler logs in Firebase Console
2. Verify the `sendThreeHourDiscountEmails` function is deployed
3. Check that the `discount_offer` template exists
4. Verify lead has `discountEmailSent: false`

### Scheduled Email Not Sending

1. Check the scheduled email status in the `scheduledLeadEmails` collection
2. Verify the `processScheduledLeadEmails` function is deployed
3. Check Cloud Function logs for errors
4. Ensure the scheduled time has passed

### Email Template Issues

1. Verify the template exists in the `emailTemplates` collection
2. Check that placeholders are properly formatted: `{{placeholderName}}`
3. Test by sending a manual email first

## Future Enhancements

Potential improvements to consider:

1. **Email Analytics**: Track open rates and click-through rates
2. **A/B Testing**: Test different email templates and subject lines
3. **Smart Scheduling**: AI-powered optimal send times based on lead behavior
4. **Email Sequences**: Create multi-step email campaigns with conditional logic
5. **SMS Integration**: Add SMS notifications for high-value leads
6. **Lead Scoring**: Automatically adjust lead scores based on email engagement

## Support

For issues or questions:
1. Check the Cloud Function logs in Firebase Console
2. Review the lead's activity timeline
3. Verify email template configuration
4. Contact the development team

---

**Last Updated**: January 2026
**Version**: 1.0
