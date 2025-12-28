import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { generateEmailActionUrls } from '@/lib/approval-tokens';
import { wrapEmailContent } from '@/lib/email-utils';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { adId, userId } = body;

        if (!adId || !userId) {
            return NextResponse.json(
                { error: 'adId and userId are required' },
                { status: 400 }
            );
        }

        const db = getAdminFirestore();

        // Fetch advertisement and user details
        const [adDoc, userDoc] = await Promise.all([
            db.collection('users').doc(userId).collection('advertisements').doc(adId).get(),
            db.collection('users').doc(userId).get(),
        ]);

        if (!adDoc.exists) {
            return NextResponse.json(
                { error: 'Advertisement not found' },
                { status: 404 }
            );
        }

        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const adData = adDoc.data()!;
        const userData = userDoc.data()!;

        // Validate required fields
        if (!adData.adProofUrl) {
            return NextResponse.json(
                { error: 'Ad proof URL is required before sending approval email' },
                { status: 400 }
            );
        }

        if (!adData.adProofDestinationUrl && !userData.adWebsiteUrl) {
            return NextResponse.json(
                { error: 'Ad destination URL is required' },
                { status: 400 }
            );
        }

        const recipientEmail = userData.email;
        if (!recipientEmail) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // Generate token-based action URLs
        const actionUrls = generateEmailActionUrls(adId, userId);

        const contactName = adData.contactName || userData.contactName || 'Valued Customer';
        const businessName = adData.businessName || userData.businessName || 'Your Business';
        const adProofUrl = adData.adProofUrl;
        const adProofDestinationUrl = adData.adProofDestinationUrl || userData.adWebsiteUrl;

        // Build the email HTML
        const subject = `Your Ad Proof for ${businessName} is Ready for Review!`;
        const htmlContent = `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi ${contactName},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Great news! Your ad creative for <strong>${businessName}</strong> is ready for your review.</p>
<div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your Ad Creative</p>
    <a href="${actionUrls.viewUrl}" target="_blank" style="display: inline-block;">
        <img src="${adProofUrl}" alt="Ad Proof for ${businessName}" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"/>
    </a>
    <p style="margin: 16px 0 0 0; font-size: 14px; color: #64748b;">
        <strong>Click destination:</strong> <a href="${adProofDestinationUrl}" target="_blank" style="color: #1e3a5f; text-decoration: underline;">${adProofDestinationUrl}</a>
    </p>
</div>

<!-- Action Buttons -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
    <tr>
        <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <!-- Approve Button -->
                    <td style="padding: 0 8px;">
                        <a href="${actionUrls.approveUrl}" target="_blank" style="display: inline-block; padding: 14px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                            &#10003; Approve Ad
                        </a>
                    </td>
                    <!-- Request Changes Button -->
                    <td style="padding: 0 8px;">
                        <a href="${actionUrls.requestChangesUrl}" target="_blank" style="display: inline-block; padding: 14px 24px; background-color: #f4f4f5; color: #3f3f46; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; border: 1px solid #e4e4e7;">
                            Request Changes
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-top: 16px;">
            <a href="${actionUrls.viewUrl}" target="_blank" style="font-size: 14px; color: #1e3a5f; text-decoration: underline;">
                View Online
            </a>
        </td>
    </tr>
</table>

<div style="margin: 24px 0; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde047;">
    <p style="margin: 0; font-size: 15px; color: #854d0e;"><strong>Important:</strong> If you don't respond within 48 hours, your ad will be automatically approved and go live.</p>
</div>

<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">We're excited to get your ad live!</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `;

        // Wrap in professional email template
        const wrappedHtml = wrapEmailContent(htmlContent);

        // Calculate auto-approval deadline (48 hours from now)
        const autoApprovalDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

        // Send email via Firestore mail collection (Firebase Extension)
        const mailRef = db.collection('mail');
        const mailDoc = await mailRef.add({
            to: [recipientEmail],
            message: {
                subject,
                html: wrappedHtml,
            },
        });

        // Log the email in sent_emails collection
        await db.collection('sent_emails').add({
            mailDocId: mailDoc.id,
            recipientEmail,
            recipientId: userId,
            templateId: 'ad_proof_approval',
            triggerType: 'manual_send',
            subject,
            html: wrappedHtml,
            sentAt: FieldValue.serverTimestamp(),
            adId,
        });

        // Update the advertisement status
        const adRef = db.collection('users').doc(userId).collection('advertisements').doc(adId);
        await adRef.update({
            status: 'customer_approval',
            sentForApprovalAt: FieldValue.serverTimestamp(),
            autoApprovalAt: autoApprovalDeadline,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: `Approval email sent to ${recipientEmail}`,
            autoApprovalAt: autoApprovalDeadline.toISOString(),
        });
    } catch (error: any) {
        console.error('Error sending approval email:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send approval email' },
            { status: 500 }
        );
    }
}
