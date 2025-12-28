/**
 * Email utilities for creating professional, consistent emails
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://community-websites.com';

/**
 * Generate URLs for email placeholders
 */
export function generateEmailUrls(leadId?: string, userId?: string) {
    return {
        pricingLink: `${APP_URL}/pricing${leadId ? `?ref=${leadId}` : ''}`,
        accountLink: `${APP_URL}/account`,
        approveAdLink: (adId: string) => `${APP_URL}/approve-ad/${adId}`,
    };
}

export interface EmailWrapperOptions {
    /** Type of header button to show */
    headerButton?: 'get-started' | 'my-account' | 'none';
    /** Custom pricing link for the Get Started button */
    pricingLink?: string;
}

/**
 * Professional email wrapper that provides consistent styling across all emails
 */
export function wrapEmailContent(bodyContent: string, options: EmailWrapperOptions = {}): string {
    const { headerButton = 'get-started', pricingLink } = options;
    const finalPricingLink = pricingLink || `${APP_URL}/pricing`;

    // Generate header button based on type
    let headerButtonHtml = '';
    if (headerButton === 'get-started') {
        headerButtonHtml = `
                                    <td style="vertical-align: middle; text-align: right;" width="140">
                                        <a href="${finalPricingLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #22c55e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                            Get Started
                                        </a>
                                    </td>`;
    } else if (headerButton === 'my-account') {
        headerButtonHtml = `
                                    <td style="vertical-align: middle; text-align: right;" width="140">
                                        <a href="${APP_URL}/account" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #22c55e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                            My Account
                                        </a>
                                    </td>`;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Community-Websites.com</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f4f8;">
        <tr>
            <td style="padding: 32px 16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; width: 100%; margin: 0 auto;">

                    <!-- Modern Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%); padding: 0; border-radius: 12px 12px 0 0;">
                            <!-- Top Bar with Phone -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 12px 32px; background-color: rgba(0,0,0,0.15); border-radius: 12px 12px 0 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="text-align: center;">
                                                    <p style="margin: 0; font-size: 13px; color: #93c5fd;">
                                                        <span style="color: #86efac; font-weight: 600;">24/7 Support</span>
                                                        &nbsp;&nbsp;|&nbsp;&nbsp;
                                                        Call or Text: <a href="tel:813-544-8383" style="color: #ffffff; text-decoration: none; font-weight: 600;">813-544-8383</a>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Main Header -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 24px 32px 28px 32px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 16px;" width="56">
                                                    <a href="${APP_URL}" target="_blank" style="text-decoration: none;">
                                                        <img src="${APP_URL}/logo.png" alt="Community-Websites.com" width="48" height="48" style="display: block; border: 0; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                                    </a>
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
                                                        <a href="${APP_URL}" target="_blank" style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">
                                                            <!--[if mso]><span style="color: #ffffff;"><![endif]-->
                                                            Community-Websites.com
                                                            <!--[if mso]></span><![endif]-->
                                                        </a>
                                                    </h1>
                                                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #bfdbfe;">
                                                        Local Advertising Made Simple
                                                    </p>
                                                </td>
${headerButtonHtml}
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px 36px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                            ${bodyContent}
                        </td>
                    </tr>

                    <!-- Modern Footer -->
                    <tr>
                        <td style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); padding: 32px 36px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <!-- Contact Section -->
                                <tr>
                                    <td style="text-align: center; padding-bottom: 20px;">
                                        <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1e3a5f;">
                                            Need Help? We're Available 24/7!
                                        </p>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td style="padding: 0 12px;">
                                                    <a href="tel:813-544-8383" style="display: inline-block; padding: 10px 20px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                                        📞 813-544-8383
                                                    </a>
                                                </td>
                                                <td style="padding: 0 12px;">
                                                    <a href="mailto:support@community-websites.com" style="display: inline-block; padding: 10px 20px; background-color: #ffffff; color: #1e3a5f; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; border: 2px solid #1e3a5f;">
                                                        ✉️ Email Us
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Divider -->
                                <tr>
                                    <td style="padding: 0 0 20px 0;">
                                        <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #cbd5e1 50%, transparent 100%);"></div>
                                    </td>
                                </tr>

                                <!-- Copyright -->
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                                            Helping local businesses grow since 2020
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                            &copy; ${new Date().getFullYear()} Community-Websites.com. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Style constants for email components
 */
export const emailStyles = {
    paragraph: 'margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;',
    heading: 'margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b;',
    link: 'color: #1e3a5f; text-decoration: underline;',
    button: 'display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;',
    buttonSecondary: 'display: inline-block; padding: 14px 28px; background-color: #f4f4f5; color: #3f3f46; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; border: 1px solid #e4e4e7;',
    list: 'margin: 16px 0; padding-left: 24px; color: #3f3f46;',
    listItem: 'margin: 8px 0; font-size: 16px; line-height: 1.6;',
    divider: 'border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;',
    infoBox: 'margin: 24px 0; padding: 20px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1;',
    warningBox: 'margin: 24px 0; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde047;',
    successBox: 'margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;',
    signature: 'margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;',
};

/**
 * Create a styled button for emails
 */
export function createEmailButton(text: string, href: string, variant: 'primary' | 'secondary' = 'primary'): string {
    const style = variant === 'primary' ? emailStyles.button : emailStyles.buttonSecondary;
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
            <tr>
                <td style="border-radius: 6px;" bgcolor="${variant === 'primary' ? '#1e3a5f' : '#f4f4f5'}">
                    <a href="${href}" target="_blank" style="${style}">
                        ${text}
                    </a>
                </td>
            </tr>
        </table>
    `.trim();
}

/**
 * Create the email signature block
 */
export function createEmailSignature(): string {
    return `
        <div style="${emailStyles.signature}">
            <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
        </div>
    `.trim();
}

/**
 * Replace all email placeholders with actual values
 */
export function replaceEmailPlaceholders(
    content: string,
    data: {
        contactName?: string;
        businessName?: string;
        pricingLink?: string;
        accountLink?: string;
        adProofUrl?: string;
        adProofDestinationUrl?: string;
        approveUrl?: string;
        requestChangesUrl?: string;
        viewUrl?: string;
    }
): string {
    let result = content;

    if (data.contactName) {
        result = result.replace(/\{\{contactName\}\}/g, data.contactName);
    }
    if (data.businessName) {
        result = result.replace(/\{\{businessName\}\}/g, data.businessName);
    }
    if (data.pricingLink) {
        result = result.replace(/\{\{pricingLink\}\}/g, data.pricingLink);
    }
    if (data.accountLink) {
        result = result.replace(/\{\{accountLink\}\}/g, data.accountLink);
    }
    if (data.adProofUrl) {
        result = result.replace(/\{\{adProofUrl\}\}/g, data.adProofUrl);
    }
    if (data.adProofDestinationUrl) {
        result = result.replace(/\{\{adProofDestinationUrl\}\}/g, data.adProofDestinationUrl);
    }
    if (data.approveUrl) {
        result = result.replace(/\{\{approveUrl\}\}/g, data.approveUrl);
    }
    if (data.requestChangesUrl) {
        result = result.replace(/\{\{requestChangesUrl\}\}/g, data.requestChangesUrl);
    }
    if (data.viewUrl) {
        result = result.replace(/\{\{viewUrl\}\}/g, data.viewUrl);
    }

    return result;
}
