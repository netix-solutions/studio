export interface EmailTemplate {
    id: string;
    name: string;
    description: string;
    subject: string;
    html: string;
    triggerName?: string;
    triggerDescription?: string;
    placeholders?: { key: string; description: string }[];
}

export const defaultTemplates: EmailTemplate[] = [
    {
        id: 'pricing_link',
        name: 'Pricing Link (Auto-response)',
        description: 'Sent to users after they fill out the "Get Started" interest form.',
        subject: 'Here is your link to our pricing, {{contactName}}!',
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
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">If you have any questions, feel free to reply to this email or call/text us at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>.</p>
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
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">If you have any questions, please don't hesitate to reach out!</p>
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
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Just wanted to follow up on your interest in advertising with us at Community-Websites.com. We help local businesses like <strong>{{businessName}}</strong> connect with thousands of potential customers in the area.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Is there any information I can provide to help you decide if our service is a good fit for your business?</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Feel free to reply to this email with any questions, or give us a call at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>.</p>
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
        id: 'ad_proof_approval',
        name: 'Ad Proof for Your Approval',
        description: 'Sent to a customer with their ad proof for them to approve.',
        subject: 'Your Ad Proof for {{businessName}} is Ready for Review!',
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Great news! Your ad creative for <strong>{{businessName}}</strong> is ready for your review.</p>
<div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your Ad Creative</p>
    <a href="{{viewUrl}}" target="_blank" style="display: inline-block;">
        <img src="{{adProofUrl}}" alt="Ad Proof for {{businessName}}" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"/>
    </a>
    <p style="margin: 16px 0 0 0; font-size: 14px; color: #64748b;">
        <strong>Click destination:</strong> <a href="{{adProofDestinationUrl}}" target="_blank" style="color: #1e3a5f; text-decoration: underline;">{{adProofDestinationUrl}}</a>
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
                        <a href="{{approveUrl}}" target="_blank" style="display: inline-block; padding: 14px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                            &#10003; Approve Ad
                        </a>
                    </td>
                    <!-- Request Changes Button -->
                    <td style="padding: 0 8px;">
                        <a href="{{requestChangesUrl}}" target="_blank" style="display: inline-block; padding: 14px 24px; background-color: #f4f4f5; color: #3f3f46; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; border: 1px solid #e4e4e7;">
                            Request Changes
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-top: 16px;">
            <a href="{{viewUrl}}" target="_blank" style="font-size: 14px; color: #1e3a5f; text-decoration: underline;">
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
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. It must be sent manually from the customer detail page after an ad proof has been uploaded.',
        placeholders: [
            { key: '{{contactName}}', description: "The customer's full name." },
            { key: '{{businessName}}', description: "The customer's business name." },
            { key: '{{adProofUrl}}', description: "The URL of the ad image creative." },
            { key: '{{adProofDestinationUrl}}', description: "The URL the ad will link to." },
            { key: '{{approveUrl}}', description: "The URL to approve the ad (auto-generated with token)." },
            { key: '{{requestChangesUrl}}', description: "The URL to request changes (auto-generated with token)." },
            { key: '{{viewUrl}}', description: "The URL to view ad details online (auto-generated with token)." },
        ]
    },
    {
        id: 'still_interested',
        name: 'Still Interested Check-In',
        description: 'A friendly check-in email to see if a lead is still interested in advertising.',
        subject: 'Quick question about advertising for {{businessName}}',
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
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Just reply to this email or give me a call at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a> - I'm happy to help!</p>
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
        subject: 'A special offer for {{businessName}} - 10% off your first month',
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I wanted to share an exclusive offer with you. As a thank you for your interest in Community-Websites.com, we'd like to offer <strong>{{businessName}}</strong> <strong style="color: #1e3a5f;">10% off your first month</strong> of advertising.</p>
<div style="margin: 24px 0; padding: 24px; background-color: #f0f9ff; border: 2px dashed #1e3a5f; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #0369a1;">Your exclusive discount code:</p>
    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1e3a5f; letter-spacing: 3px; font-family: monospace;">TAKE10OFF</p>
    <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b;">Enter this code at checkout</p>
</div>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">This is a great opportunity to get your business in front of local customers at a reduced rate. Our advertising packages help businesses like yours:</p>
<ul style="margin: 16px 0; padding-left: 24px; color: #3f3f46;">
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Reach thousands of local residents</li>
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Build brand recognition in your community</li>
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Drive more foot traffic and calls</li>
</ul>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 6px;" bgcolor="#1e3a5f">
            <a href="{{pricingLink}}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View Plans &amp; Use Your Discount
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">If you have any questions, just reply to this email or call us at <a href="tel:813-544-8383" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">813-544-8383</a>.</p>
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
        id: 'last_chance',
        name: 'Last Chance Reminder',
        description: 'A final follow-up for leads who haven\'t responded to previous outreach.',
        subject: 'Last chance to connect about {{businessName}} advertising',
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I've reached out a couple of times about advertising opportunities for <strong>{{businessName}}</strong>, and I wanted to send one final message before I close out your inquiry.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I completely understand if the timing isn't right or if you've decided to go a different direction - no worries at all!</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">However, if you're still interested in reaching more local customers through Community-Websites.com, I'm here to help. Just reply to this email and we can pick up where we left off.</p>
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
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Would you like to learn more about how this could work for {{businessName}}? I'm happy to answer any questions.</p>
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
        html: `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">I just wanted to take a moment to thank you for considering Community-Websites.com for <strong>{{businessName}}</strong>'s advertising needs.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Whether you're ready to get started now or want to keep us in mind for the future, we appreciate your interest and are here whenever the time is right.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">In the meantime, feel free to:</p>
<ul style="margin: 16px 0; padding-left: 24px; color: #3f3f46;">
    <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Save our contact info for when you're ready</li>
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
