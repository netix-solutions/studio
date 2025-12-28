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

/**
 * Professional email wrapper that provides consistent styling across all emails
 */
export function wrapEmailContent(bodyContent: string): string {
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
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; width: 100%; margin: 0 auto;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #1e3a5f; padding: 24px 40px; border-radius: 8px 8px 0 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="vertical-align: middle; padding-right: 16px;" width="60">
                                        <a href="${APP_URL}" target="_blank" style="text-decoration: none;">
                                            <img src="${APP_URL}/logo.png" alt="Community-Websites.com" width="50" height="50" style="display: block; border: 0; border-radius: 8px;">
                                        </a>
                                    </td>
                                    <td style="vertical-align: middle;">
                                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                                            <a href="${APP_URL}" target="_blank" style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">
                                                <!--[if mso]><span style="color: #ffffff;"><![endif]-->
                                                Community-Websites.com
                                                <!--[if mso]></span><![endif]-->
                                            </a>
                                        </h1>
                                        <p style="margin: 4px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">
                                            Local Advertising Made Simple
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7;">
                            ${bodyContent}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #fafafa; padding: 24px 40px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">
                                            Questions? We're here to help!
                                        </p>
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e3a5f;">
                                            Call or Text 24/7
                                        </p>
                                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #3f3f46;">
                                            <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>
                                            &nbsp;&bull;&nbsp;
                                            <a href="mailto:email@community-websites.com" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">email@community-websites.com</a>
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
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
