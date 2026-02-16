import { NextRequest, NextResponse } from 'next/server';
import { sendEmailWithSendGrid, isSendGridConfigured } from '@/lib/sendgrid';

export async function POST(request: NextRequest) {
    try {
        const { businessName, ownerName, email } = await request.json();

        if (!isSendGridConfigured()) {
            return NextResponse.json(
                { error: 'Email service is not configured' },
                { status: 500 }
            );
        }

        const adminEmail = process.env.ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL;
        if (!adminEmail) {
            return NextResponse.json(
                { error: 'Admin email not configured' },
                { status: 500 }
            );
        }

        await sendEmailWithSendGrid({
            to: [adminEmail],
            subject: `New Spotlight Article Submission: ${businessName}`,
            html: `
                <h2>New Spotlight Article Submission</h2>
                <p>A yearly subscriber has submitted their spotlight article intake form.</p>
                <ul>
                    <li><strong>Business:</strong> ${businessName}</li>
                    <li><strong>Owner:</strong> ${ownerName}</li>
                    <li><strong>Email:</strong> ${email}</li>
                </ul>
                <p>View the full submission in the <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://studio.community-websites.com'}/dashboard">admin dashboard</a>.</p>
            `,
            categories: ['spotlight-article-notification'],
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error sending spotlight article notification:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send notification' },
            { status: 500 }
        );
    }
}
