import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { wrapEmailContent, emailStyles, createEmailSignature } from '@/lib/email-utils';
import { sendEmailWithSendGrid, isSendGridConfigured, isValidEmail } from '@/lib/sendgrid';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        // Check SendGrid configuration
        if (!isSendGridConfigured()) {
            return NextResponse.json(
                { error: 'Email service is not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { email, designUrl, userName, businessName } = body;

        if (!email || !isValidEmail(email)) {
            return NextResponse.json(
                { error: 'Valid email is required' },
                { status: 400 }
            );
        }

        if (!designUrl) {
            return NextResponse.json(
                { error: 'Design URL is required' },
                { status: 400 }
            );
        }

        const db = getAdminFirestore();
        const displayName = userName || 'there';
        const displayBusiness = businessName ? ` for ${businessName}` : '';

        // Build the email HTML content
        const subject = `Continue Your Ad Design on Desktop${displayBusiness}`;
        const htmlContent = `
<p style="${emailStyles.paragraph}">Hi ${displayName},</p>

<p style="${emailStyles.paragraph}">You started designing your ad on a mobile device. For the best experience with our Design Canvas - including shapes, colors, gradients, and more - we recommend using a desktop or laptop computer.</p>

<!-- Desktop Preview Card -->
<div style="margin: 32px 0; text-align: center;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 4px; border-radius: 16px; display: inline-block;">
        <div style="background: #ffffff; padding: 24px 40px; border-radius: 14px;">
            <div style="margin-bottom: 16px;">
                <span style="font-size: 48px;">🖥️</span>
            </div>
            <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1e293b;">
                Continue on Desktop
            </h2>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b;">
                Better tools. Better designs. Better results.
            </p>
            <a href="${designUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                Open Design Canvas
            </a>
        </div>
    </div>
</div>

<!-- Features List -->
<div style="${emailStyles.infoBox}">
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1e3a5f;">
        What you can do with the Design Canvas:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
        <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                <span style="color: #22c55e; font-size: 18px;">✓</span>
            </td>
            <td style="padding: 8px 0; font-size: 15px; color: #3f3f46;">
                Add shapes with <strong>solid colors</strong> or <strong>beautiful gradients</strong>
            </td>
        </tr>
        <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                <span style="color: #22c55e; font-size: 18px;">✓</span>
            </td>
            <td style="padding: 8px 0; font-size: 15px; color: #3f3f46;">
                Choose from rectangles, circles, stars, triangles & more
            </td>
        </tr>
        <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                <span style="color: #22c55e; font-size: 18px;">✓</span>
            </td>
            <td style="padding: 8px 0; font-size: 15px; color: #3f3f46;">
                Customize text with 10+ professional fonts
            </td>
        </tr>
        <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                <span style="color: #22c55e; font-size: 18px;">✓</span>
            </td>
            <td style="padding: 8px 0; font-size: 15px; color: #3f3f46;">
                Upload your logo and images
            </td>
        </tr>
        <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                <span style="color: #22c55e; font-size: 18px;">✓</span>
            </td>
            <td style="padding: 8px 0; font-size: 15px; color: #3f3f46;">
                Layer, rotate, and resize elements with precision
            </td>
        </tr>
    </table>
</div>

<p style="${emailStyles.paragraph}">Simply click the button above from your desktop browser to pick up right where you left off.</p>

<div style="${emailStyles.warningBox}">
    <p style="margin: 0; font-size: 14px; color: #854d0e;">
        <strong>Not comfortable designing?</strong> No problem! You can always request our team to create a professional design for you at no extra cost. Just click "Let Us Design It" in the ad designer.
    </p>
</div>

${createEmailSignature()}
        `;

        // Wrap in the professional email template
        const wrappedHtml = wrapEmailContent(htmlContent, { headerButton: 'my-account' });

        // Send email via SendGrid
        const emailResult = await sendEmailWithSendGrid({
            to: email,
            subject,
            html: wrappedHtml,
            categories: ['desktop-link', 'transactional'],
        });

        if (!emailResult.success) {
            return NextResponse.json(
                { error: emailResult.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        // Log the email in sent_emails collection
        await db.collection('sent_emails').add({
            messageId: emailResult.messageId || null,
            recipientEmail: email,
            templateId: 'desktop_link',
            triggerType: 'user_request',
            subject,
            designUrl,
            sentAt: FieldValue.serverTimestamp(),
            provider: 'sendgrid',
        });

        return NextResponse.json({
            success: true,
            message: `Desktop link email sent to ${email}`,
            messageId: emailResult.messageId,
        });
    } catch (error: any) {
        console.error('Error sending desktop link email:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        );
    }
}
