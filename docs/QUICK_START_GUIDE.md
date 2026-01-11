# Quick Start Guide: Lead Email Automation

## For Admins

### Automated Emails (No Action Required)

The system automatically handles these emails:

1. **Pricing Link Email** - Sent immediately when lead fills form
2. **10% Discount Email** - Sent 3 hours after lead creation if they haven't purchased
   - Code: **TAKE10OFF**
   - Automatic - no setup needed!

### Scheduling Follow-Up Emails

Want to schedule a follow-up email? Here's how:

1. Go to **Leads** page
2. Click on a lead to view details
3. Click **"Schedule Email"** button
4. Fill in the form:
   - **Template**: Choose from pre-built templates
   - **Date**: When to send
   - **Time**: What time to send
   - **Notes**: Optional reminder for yourself
5. Click **"Schedule Email"**

The email will be sent automatically at the scheduled time!

### Viewing Scheduled Emails

On any lead detail page, scroll down to the **"Scheduled Emails"** section to see:
- Pending emails (not yet sent)
- Sent emails (with send date)
- Failed emails (with error message)
- Cancelled emails

### Cancelling Scheduled Emails

1. Go to the lead detail page
2. Find the scheduled email in the **"Scheduled Emails"** section
3. Click the trash icon
4. Confirm cancellation

**Note:** You can only cancel pending emails. Once sent, they cannot be cancelled.

## Email Templates

### Pre-Built Templates

The system includes these ready-to-use templates:

**For Leads:**
- **Exclusive Discount Offer** (10% off - TAKE10OFF) ⚡ Auto-sent at 3 hours
- **Manual Follow-Up** - General follow-up
- **Still Interested Check-In** - Check if still interested
- **Why Local Advertising Works** - Educational email
- **Last Chance Reminder** - Final follow-up
- **Thank You (No Pressure)** - Warm thank you

**For Customers:**
- **New Customer Welcome** ⚡ Auto-sent after first purchase
- **Complete Directory Listing** - Encourage directory signup
- **Complete Ad Setup** - Remind to finish ad setup

### Creating Custom Templates

Want to create your own template?

1. Go to **Email Templates** page
2. Click **"Create Template"**
3. Fill in:
   - **Name**: Template name (e.g., "5-Day Check-In")
   - **Description**: What it's for
   - **Subject**: Email subject line
   - **HTML Content**: Email body
4. Use placeholders:
   - `{{contactName}}` - Lead's name
   - `{{businessName}}` - Business name
   - `{{pricingLink}}` - Link to pricing page
5. Click **"Create"**

Now you can use this template when scheduling emails!

## Example Email Campaigns

### Campaign 1: Standard Nurture (Recommended)

- **Day 0, 10:00 AM**: Lead fills form → Pricing email (automatic)
- **Day 0, 1:00 PM**: Discount email sent (automatic)
- **Day 2, 10:00 AM**: Schedule "Still Interested Check-In"
- **Day 7, 10:00 AM**: Schedule "Why Local Advertising Works"
- **Day 14, 10:00 AM**: Schedule "Last Chance Reminder"

### Campaign 2: Quick Follow-Up

- **Day 0**: Lead fills form → Pricing email (automatic)
- **Day 0 + 3 hours**: Discount email (automatic)
- **Day 1**: Schedule "Manual Follow-Up"
- **Day 5**: Schedule "Last Chance Reminder"

### Campaign 3: High-Value Lead

- **Day 0**: Lead fills form → Pricing email (automatic)
- **Day 0 + 3 hours**: Discount email (automatic)
- **Day 1, 9:00 AM**: Schedule "Manual Follow-Up" with personal note
- **Day 3, 2:00 PM**: Schedule another "Manual Follow-Up"
- **Day 7, 10:00 AM**: Schedule "Still Interested Check-In"

## Tips & Best Practices

### Timing

- **Morning emails** (9-11 AM) tend to get better open rates
- **Avoid weekends** for business emails
- **Space emails** at least 2 days apart to avoid overwhelming leads

### Personalization

- Always add notes when scheduling to remind yourself why you're sending
- Review the lead's activity timeline before scheduling
- Customize templates if needed for specific situations

### Monitoring

Check your scheduled emails regularly:
- Make sure emails are being sent on time
- Cancel emails if lead has already responded
- Adjust timing based on what works

### What to Do When a Lead Converts

**Don't worry!** The system automatically:
- Skips any scheduled emails
- Marks them as "skipped" with reason "Lead converted to customer"
- No action needed from you

## Common Questions

### "Can I send the same email to multiple leads?"

Yes! Use the bulk send feature:
1. Go to Leads page
2. Select multiple leads (checkboxes)
3. Click "Bulk Actions" → "Send Email"

### "What happens if I schedule an email in the past?"

The system won't let you. You must schedule at least 1 minute in the future.

### "Can I reschedule an email?"

Not directly, but you can:
1. Cancel the old scheduled email
2. Schedule a new one with the correct time

### "How do I know if an email was sent?"

Check the lead's:
1. **Activity Timeline** - Shows all emails sent
2. **Scheduled Emails Section** - Shows status (pending/sent/failed)

### "What if an email fails to send?"

The system will:
1. Mark it as "failed" with error message
2. Log the error in Cloud Functions logs
3. Show the error in the Scheduled Emails section

You can then reschedule it manually.

## Need Help?

1. **Check documentation**: `docs/LEAD_EMAIL_AUTOMATION.md`
2. **View activity timeline**: See what emails were sent
3. **Check Cloud Functions logs**: See system activity
4. **Test with a sample lead**: Create a test lead and try scheduling

## Quick Reference

### Automatic Emails
- ✅ Pricing link (immediate)
- ✅ 10% discount at 3 hours (TAKE10OFF)
- ✅ Welcome email on first purchase

### Manual Actions
- 📧 Schedule follow-up emails
- 📝 Create custom templates
- 🚫 Cancel scheduled emails
- 📊 View email history

### Discount Codes
- **TAKE10OFF** - 10% off (auto-sent at 3 hours)
- **ADVERTISE** - 25% off (manual use only)

---

**Last Updated**: January 2026
**Questions?** Check the full documentation in `docs/LEAD_EMAIL_AUTOMATION.md`
