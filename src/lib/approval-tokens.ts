/**
 * Token-based email action system for ad approvals
 *
 * This allows customers to approve ads or request changes directly from email
 * without needing to log in. Tokens are signed with HMAC-SHA256 and expire after 7 days.
 */

import crypto from 'crypto';

// Token expiration: 7 days (matches the typical ad approval window)
const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

// Use environment variable for secret, with a fallback for development
const getTokenSecret = (): string => {
    const secret = process.env.EMAIL_ACTION_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        // In development, use a default secret (not secure for production)
        if (process.env.NODE_ENV === 'development') {
            return 'dev-secret-key-not-for-production';
        }
        throw new Error('EMAIL_ACTION_TOKEN_SECRET or NEXTAUTH_SECRET environment variable is required');
    }
    return secret;
};

export type EmailActionType = 'approve' | 'request_changes' | 'view';

export interface TokenPayload {
    adId: string;
    userId: string;
    action: EmailActionType;
    exp: number; // Expiration timestamp
}

/**
 * Generate a signed token for email actions
 */
export function generateApprovalToken(
    adId: string,
    userId: string,
    action: EmailActionType
): string {
    const payload: TokenPayload = {
        adId,
        userId,
        action,
        exp: Date.now() + TOKEN_EXPIRATION_MS,
    };

    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString('base64url');

    const signature = crypto
        .createHmac('sha256', getTokenSecret())
        .update(payloadBase64)
        .digest('base64url');

    return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a token
 * Returns the payload if valid, throws an error if invalid or expired
 */
export function verifyApprovalToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 2) {
        throw new Error('Invalid token format');
    }

    const [payloadBase64, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
        .createHmac('sha256', getTokenSecret())
        .update(payloadBase64)
        .digest('base64url');

    if (signature !== expectedSignature) {
        throw new Error('Invalid token signature');
    }

    // Decode payload
    let payload: TokenPayload;
    try {
        const payloadString = Buffer.from(payloadBase64, 'base64url').toString();
        payload = JSON.parse(payloadString);
    } catch {
        throw new Error('Invalid token payload');
    }

    // Check expiration
    if (Date.now() > payload.exp) {
        throw new Error('Token has expired');
    }

    // Validate required fields
    if (!payload.adId || !payload.userId || !payload.action) {
        throw new Error('Invalid token payload - missing required fields');
    }

    return payload;
}

/**
 * Generate all three action URLs for an email
 */
export function generateEmailActionUrls(
    adId: string,
    userId: string,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://community-websites.com'
): {
    approveUrl: string;
    requestChangesUrl: string;
    viewUrl: string;
} {
    const approveToken = generateApprovalToken(adId, userId, 'approve');
    const requestChangesToken = generateApprovalToken(adId, userId, 'request_changes');
    const viewToken = generateApprovalToken(adId, userId, 'view');

    return {
        approveUrl: `${baseUrl}/ad-action?token=${encodeURIComponent(approveToken)}`,
        requestChangesUrl: `${baseUrl}/ad-action?token=${encodeURIComponent(requestChangesToken)}`,
        viewUrl: `${baseUrl}/ad-action?token=${encodeURIComponent(viewToken)}`,
    };
}
