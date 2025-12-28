export interface EmailTemplate {
    id: string;
    name: string;
    description: string;
    subject: string;
    html: string;
    triggerName?: string;
    triggerDescription?: string;
    placeholders?: { key: string; description: string }[];
    /** Version number for tracking updates to system templates */
    version?: number;
    /** True if this is a system-provided default template */
    isSystemTemplate?: boolean;
}

/** Current version for all default templates - increment when making updates */
export const TEMPLATE_VERSION = 3;

export const defaultTemplates: EmailTemplate[] = [
    {
        id: 'pricing_link',
        name: 'Pricing Link (Auto-response)',
        description: 'Sent to users after they fill out the "Get Started" interest form.',
        subject: 'Here is your link to our pricing, {{contactName}}!',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Thanks for your interest in advertising with Community-Websites.com! We're excited to help <strong>{{businessName}}</strong> reach more local customers.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">You can view our current plans and get started by clicking the button below:</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 6px;" bgcolor="#1e3a5f">
            <a href="{{pricingLink}}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View Pricing &amp; Sign Up
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Have questions? We're here for you <strong>24/7</strong>! Call or text us anytime at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>.</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'interest_form_submission',
        triggerDescription: 'This email is automatically sent immediately after a potential customer submits the "Get Started" interest form on the landing page.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the person who submitted the form." },
            { key: '{{businessName}}', description: "The business name entered in the form." },
            { key: '{{pricingLink}}', description: "The unique, auto-generated link to the pricing page." },
        ]
    },
    {
        id: 'new_customer_welcome',
        name: 'New Customer Welcome',
        description: 'Sent to a new customer immediately after they complete their first subscription purchase.',
        subject: 'Welcome to Community-Websites.com, {{contactName}}!',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Thank you for your purchase and welcome aboard! We're thrilled to have you as an advertising partner.</p>
<div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
    <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #166534;">What's Next?</p>
    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #166534;">Please log in to your account and fill out the "Advertisement Details" form. This is where you can provide us with your business information, ad text, and upload any logos or images you'd like us to use.</p>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 6px;" bgcolor="#1e3a5f">
            <a href="{{accountLink}}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Go to My Account
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Once we receive your details, our design team will get to work on creating your ad. We'll send you a proof for approval before it goes live.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Have questions? Our team is available <strong>24/7</strong> to help! Call or text us anytime at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>.</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'new_subscription_purchase',
        triggerDescription: 'This email is automatically sent immediately after a customer successfully completes their first subscription purchase.',
        placeholders: [
            { key: '{{contactName}}', description: "The customer's full name from their user profile." },
            { key: '{{accountLink}}', description: "A direct link to the user's account page." },
        ]
    },
    {
        id: 'manual_follow_up',
        name: 'Manual Follow-Up',
        description: 'A general-purpose follow-up email to send to leads.',
        subject: 'Following up from Community-Websites.com',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Just wanted to follow up on your interest in advertising with us at Community-Websites.com. We help local businesses like <strong>{{businessName}}</strong> connect with thousands of potential customers in the area.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Is there any information I can provide to help you decide if our service is a good fit for your business?</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Feel free to reply to this email, or reach out to us <strong>24/7</strong> by calling or texting <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>.</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. It must be sent manually from the lead or user detail page.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead or user." },
            { key: '{{businessName}}', description: "The business name of the lead or user." },
        ]
    },
    {
        id: 'still_interested',
        name: 'Still Interested Check-In',
        description: 'A friendly check-in email to see if a lead is still interested in advertising.',
        subject: 'Quick question about advertising for {{businessName}}',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I wanted to reach out and see if you're still considering advertising with Community-Websites.com for <strong>{{businessName}}</strong>.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I know things can get busy, so I just wanted to check in and see if:</p>
<ul style="margin: 16px 0; padding-left: 24px; color: #3f3f46;">
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">You have any questions I can help answer</li>
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">There's anything holding you back from getting started</li>
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">You'd like me to walk you through the process</li>
</ul>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Our local advertising platform reaches thousands of residents in your community, and we'd love to help {{businessName}} connect with more customers.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Just reply to this email, or call/text us <strong>24/7</strong> at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a> - we're always here to help!</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to check in with leads who showed interest but haven\'t moved forward.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
        ]
    },
    {
        id: 'discount_offer',
        name: 'Exclusive Discount Offer',
        description: 'Offer a 10% discount to encourage leads to sign up.',
        subject: '🎉 {{businessName}} - Your Exclusive 10% Discount Inside!',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">We have something special for <strong>{{businessName}}</strong>...</p>

<!-- Hero Banner Section -->
<div style="margin: 0 0 32px 0; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 16px; overflow: hidden;">
    <div style="padding: 40px 32px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #93c5fd; text-transform: uppercase; letter-spacing: 2px;">Exclusive Offer</p>
        <p style="margin: 0 0 8px 0; font-size: 64px; font-weight: 800; color: #ffffff; line-height: 1;">10% OFF</p>
        <p style="margin: 0; font-size: 18px; color: #e0f2fe;">Your First Month of Local Advertising</p>
    </div>
</div>

<!-- Coupon Code Box -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
    <tr>
        <td align="center">
            <div style="display: inline-block; background-color: #fef3c7; border: 3px dashed #f59e0b; border-radius: 12px; padding: 24px 48px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">Your Discount Code</p>
                <p style="margin: 0 0 8px 0; font-size: 36px; font-weight: 800; color: #1e3a5f; letter-spacing: 4px; font-family: 'Courier New', monospace;">TAKE10OFF</p>
                <p style="margin: 0; font-size: 13px; color: #78716c;">Use at checkout to save 10%</p>
            </div>
        </td>
    </tr>
</table>

<!-- Benefits Section -->
<p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #18181b; text-align: center;">Why Advertise With Us?</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdf4; border-radius: 12px; margin-bottom: 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td width="48" valign="top">
                        <div style="width: 40px; height: 40px; background-color: #22c55e; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">👥</div>
                    </td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #166534;">Reach Thousands</p>
                        <p style="margin: 0; font-size: 14px; color: #15803d; line-height: 1.5;">Get your business in front of local residents who are actively looking for services like yours.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr><td style="height: 12px;"></td></tr>
    <tr>
        <td style="padding: 16px; background-color: #eff6ff; border-radius: 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td width="48" valign="top">
                        <div style="width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">⭐</div>
                    </td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1e40af;">Build Your Brand</p>
                        <p style="margin: 0; font-size: 14px; color: #1d4ed8; line-height: 1.5;">Become a recognized name in your community with consistent local visibility.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr><td style="height: 12px;"></td></tr>
    <tr>
        <td style="padding: 16px; background-color: #fef3c7; border-radius: 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td width="48" valign="top">
                        <div style="width: 40px; height: 40px; background-color: #f59e0b; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">📈</div>
                    </td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #92400e;">Drive More Business</p>
                        <p style="margin: 0; font-size: 14px; color: #a16207; line-height: 1.5;">More calls, more foot traffic, more customers walking through your door.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<!-- CTA Button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
    <tr>
        <td align="center">
            <a href="{{pricingLink}}" target="_blank" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 14px rgba(30, 58, 95, 0.4);">
                Claim Your 10% Discount →
            </a>
        </td>
    </tr>
</table>

<!-- Footer Note -->
<div style="margin: 0 0 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border-left: 4px solid #1e3a5f;">
    <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
        <strong style="color: #1e3a5f;">Questions?</strong> We're available <strong>24/7</strong>! Call or text us anytime at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 600;">813-544-8383</a>.
    </p>
</div>

<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to offer the TAKE10OFF discount code (10% off) to leads who need an extra incentive.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
            { key: '{{pricingLink}}', description: "The link to the pricing page." },
        ]
    },
    {
        id: 'advertise_discount',
        name: 'ADVERTISE 25% Discount Offer',
        description: 'Offer a 25% discount using the ADVERTISE code to encourage leads to sign up for an ad plan.',
        subject: '🎁 {{businessName}} - Save 25% on Your Ad Plan!',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Great news for <strong>{{businessName}}</strong>! We're offering you an exclusive discount on our advertising plans...</p>

<!-- Hero Banner Section -->
<div style="margin: 0 0 32px 0; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 16px; overflow: hidden;">
    <div style="padding: 40px 32px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #a7f3d0; text-transform: uppercase; letter-spacing: 2px;">Special Offer</p>
        <p style="margin: 0 0 8px 0; font-size: 64px; font-weight: 800; color: #ffffff; line-height: 1;">25% OFF</p>
        <p style="margin: 0; font-size: 18px; color: #d1fae5;">Your Ad Plan on Community-Websites.com</p>
    </div>
</div>

<!-- Coupon Code Box -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
    <tr>
        <td align="center">
            <div style="display: inline-block; background-color: #d1fae5; border: 3px dashed #059669; border-radius: 12px; padding: 24px 48px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">Your Discount Code</p>
                <p style="margin: 0 0 8px 0; font-size: 36px; font-weight: 800; color: #059669; letter-spacing: 4px; font-family: 'Courier New', monospace;">ADVERTISE</p>
                <p style="margin: 0; font-size: 13px; color: #047857;">Use at checkout to save 25%</p>
            </div>
        </td>
    </tr>
</table>

<!-- Benefits Section -->
<p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #18181b; text-align: center;">Why Advertise With Us?</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdf4; border-radius: 12px; margin-bottom: 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td width="48" valign="top">
                        <div style="width: 40px; height: 40px; background-color: #22c55e; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">👥</div>
                    </td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #166534;">Reach Thousands</p>
                        <p style="margin: 0; font-size: 14px; color: #15803d; line-height: 1.5;">Get your business in front of local residents who are actively looking for services like yours.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr><td style="height: 12px;"></td></tr>
    <tr>
        <td style="padding: 16px; background-color: #eff6ff; border-radius: 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td width="48" valign="top">
                        <div style="width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">⭐</div>
                    </td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1e40af;">Build Your Brand</p>
                        <p style="margin: 0; font-size: 14px; color: #1d4ed8; line-height: 1.5;">Become a recognized name in your community with consistent local visibility.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr><td style="height: 12px;"></td></tr>
    <tr>
        <td style="padding: 16px; background-color: #fef3c7; border-radius: 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td width="48" valign="top">
                        <div style="width: 40px; height: 40px; background-color: #f59e0b; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">📈</div>
                    </td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #92400e;">Drive More Business</p>
                        <p style="margin: 0; font-size: 14px; color: #a16207; line-height: 1.5;">More calls, more foot traffic, more customers walking through your door.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<!-- CTA Button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
    <tr>
        <td align="center">
            <a href="{{pricingLink}}" target="_blank" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
                Claim Your 25% Discount →
            </a>
        </td>
    </tr>
</table>

<!-- Footer Note -->
<div style="margin: 0 0 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border-left: 4px solid #059669;">
    <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
        <strong style="color: #059669;">Questions?</strong> We're available <strong>24/7</strong>! Call or text us anytime at <a href="tel:813-544-8383" style="color: #059669; text-decoration: none; font-weight: 600;">813-544-8383</a>.
    </p>
</div>

<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to offer the ADVERTISE discount code (25% off ad plans) to leads who need an extra incentive.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
            { key: '{{pricingLink}}', description: "The link to the pricing page." },
        ]
    },
    {
        id: 'last_chance',
        name: 'Last Chance Reminder',
        description: 'A final follow-up for leads who haven\'t responded to previous outreach.',
        subject: 'Last chance to connect about {{businessName}} advertising',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I've reached out a couple of times about advertising opportunities for <strong>{{businessName}}</strong>, and I wanted to send one final message before I close out your inquiry.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I completely understand if the timing isn't right or if you've decided to go a different direction - no worries at all!</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">However, if you're still interested in reaching more local customers through Community-Websites.com, I'm here to help. Just reply to this email or call/text us <strong>24/7</strong> at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>, and we can pick up where we left off.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Either way, I wish you and {{businessName}} all the best!</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
<p style="margin: 24px 0 0 0; padding: 16px; background-color: #f8fafc; border-radius: 6px; font-size: 14px; color: #64748b; font-style: italic;">
    P.S. If you'd like to move forward, reply with "interested" and I'll send over all the details.
</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this as a final follow-up for leads who haven\'t responded to previous emails.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
        ]
    },
    {
        id: 'value_highlight',
        name: 'Why Local Advertising Works',
        description: 'An educational email highlighting the benefits of local advertising.',
        subject: '3 ways local advertising can grow {{businessName}}',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I wanted to share some insights on how local advertising through Community-Websites.com can help grow <strong>{{businessName}}</strong>.</p>
<p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #18181b;">Here's what our advertising partners typically see:</p>
<div style="margin: 0 0 16px 0; padding: 16px 20px; background-color: #f8fafc; border-left: 4px solid #1e3a5f; border-radius: 0 6px 6px 0;">
    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #18181b;">1. Increased Local Visibility</p>
    <p style="margin: 0; font-size: 15px; color: #64748b;">Your business appears on community websites that local residents visit regularly for news and information.</p>
</div>
<div style="margin: 0 0 16px 0; padding: 16px 20px; background-color: #f8fafc; border-left: 4px solid #1e3a5f; border-radius: 0 6px 6px 0;">
    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #18181b;">2. Targeted Reach</p>
    <p style="margin: 0; font-size: 15px; color: #64748b;">Your ads are seen by people who actually live and shop in your area - not random clicks from across the country.</p>
</div>
<div style="margin: 0 0 24px 0; padding: 16px 20px; background-color: #f8fafc; border-left: 4px solid #1e3a5f; border-radius: 0 6px 6px 0;">
    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #18181b;">3. Cost-Effective Marketing</p>
    <p style="margin: 0; font-size: 15px; color: #64748b;">Get your message in front of thousands of local residents for a fraction of what traditional advertising costs.</p>
</div>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Would you like to learn more about how this could work for {{businessName}}? I'm happy to answer any questions - call or text us <strong>24/7</strong> at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 6px;" bgcolor="#1e3a5f">
            <a href="{{pricingLink}}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                See Our Advertising Options
            </a>
        </td>
    </tr>
</table>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to educate leads about the benefits of local advertising.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
            { key: '{{pricingLink}}', description: "The link to the pricing page." },
        ]
    },
    {
        id: 'thank_you_no_commitment',
        name: 'Thank You (No Pressure)',
        description: 'A warm thank you email that keeps the door open without being pushy.',
        subject: 'Thanks for considering Community-Websites.com, {{contactName}}',
        version: TEMPLATE_VERSION,
        isSystemTemplate: true,
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I just wanted to take a moment to thank you for considering Community-Websites.com for <strong>{{businessName}}</strong>'s advertising needs.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Whether you're ready to get started now or want to keep us in mind for the future, we appreciate your interest and are here whenever the time is right.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">In the meantime, feel free to:</p>
<ul style="margin: 16px 0; padding-left: 24px; color: #3f3f46;">
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Save our contact info: <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a> (call or text <strong>24/7</strong>)</li>
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Browse our <a href="{{pricingLink}}" style="color: #1e3a5f; text-decoration: underline;">advertising options</a> at your convenience</li>
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Reach out anytime with questions - no pressure, ever</li>
</ul>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">We're a small team that genuinely cares about helping local businesses succeed. Whenever you're ready, we'll be here.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Wishing you success with {{businessName}}!</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to thank leads and keep the relationship warm without pressure.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
            { key: '{{pricingLink}}', description: "The link to the pricing page." },
        ]
    }
];
