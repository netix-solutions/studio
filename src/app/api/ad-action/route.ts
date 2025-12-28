import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { verifyApprovalToken, type TokenPayload } from '@/lib/approval-tokens';
import { FieldValue } from 'firebase-admin/firestore';

// Escape HTML special characters to prevent XSS
function escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEntities[char]);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, revisionNotes } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Verify and decode the token
        let payload: TokenPayload;
        try {
            payload = verifyApprovalToken(token);
        } catch (error: any) {
            return NextResponse.json(
                { error: error.message || 'Invalid token' },
                { status: 401 }
            );
        }

        const { adId, userId, action } = payload;
        const db = getAdminFirestore();

        // Fetch the advertisement
        const adRef = db.collection('users').doc(userId).collection('advertisements').doc(adId);
        const adDoc = await adRef.get();

        if (!adDoc.exists) {
            return NextResponse.json(
                { error: 'Advertisement not found' },
                { status: 404 }
            );
        }

        const adData = adDoc.data()!;

        // Check if the ad is in a state where actions can be taken
        const validStatuses = ['customer_approval', 'pending_customer_approval'];
        if (!validStatuses.includes(adData.status)) {
            // If already approved/live, return success with the current status
            if (adData.status === 'approved' || adData.status === 'live') {
                return NextResponse.json({
                    success: true,
                    message: 'This advertisement has already been approved.',
                    status: adData.status,
                    alreadyProcessed: true,
                });
            }
            return NextResponse.json(
                { error: `This advertisement is not pending approval (current status: ${adData.status})` },
                { status: 400 }
            );
        }

        // Handle the action
        switch (action) {
            case 'approve': {
                await adRef.update({
                    status: 'approved',
                    approvedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    approvedVia: 'email_link',
                });

                // Fetch user details for the notification email
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();

                // Send confirmation email to admin
                if (userData) {
                    const mailRef = db.collection('mail');
                    await mailRef.add({
                        to: ['admin@community-websites.com'],
                        message: {
                            subject: `Ad Approved via Email - ${adData.businessName || userData.businessName}`,
                            html: `
                                <p>A customer has approved their advertisement via email link.</p>
                                <p><strong>Business:</strong> ${adData.businessName || userData.businessName}</p>
                                <p><strong>Contact:</strong> ${adData.contactName || userData.contactName}</p>
                                <p><strong>Email:</strong> ${adData.email || userData.email}</p>
                                <p>The ad is now ready to go live.</p>
                            `,
                        },
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Your advertisement has been approved and will go live shortly!',
                    status: 'approved',
                });
            }

            case 'request_changes': {
                if (!revisionNotes || !revisionNotes.trim()) {
                    return NextResponse.json(
                        { error: 'Please provide details about what changes you would like.' },
                        { status: 400 }
                    );
                }

                await adRef.update({
                    status: 'in_review',
                    revisionNotes: revisionNotes.trim(),
                    revisionCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                    lastActionBy: 'customer',
                    lastActionAt: FieldValue.serverTimestamp(),
                    revisionRequestedVia: 'email_link',
                });

                // Send notification to admin
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();

                const mailRef = db.collection('mail');
                await mailRef.add({
                    to: ['admin@community-websites.com'],
                    message: {
                        subject: `Revision Requested via Email - ${adData.businessName || userData?.businessName}`,
                        html: `
                            <p>A customer has requested revisions to their advertisement via email link.</p>
                            <p><strong>Business:</strong> ${adData.businessName || userData?.businessName}</p>
                            <p><strong>Contact:</strong> ${adData.contactName || userData?.contactName}</p>
                            <p><strong>Email:</strong> ${adData.email || userData?.email}</p>
                            <hr/>
                            <p><strong>Revision Notes:</strong></p>
                            <p style="background: #fef3c7; padding: 12px; border-radius: 4px;">${escapeHtml(revisionNotes).replace(/\n/g, '<br/>')}</p>
                        `,
                    },
                });

                return NextResponse.json({
                    success: true,
                    message: 'Your revision request has been submitted. Our team will make the changes and send you a new proof.',
                    status: 'in_review',
                });
            }

            case 'view': {
                // Just return the ad data for viewing
                return NextResponse.json({
                    success: true,
                    ad: {
                        id: adDoc.id,
                        businessName: adData.businessName,
                        adProofUrl: adData.adProofUrl,
                        adProofDestinationUrl: adData.adProofDestinationUrl,
                        status: adData.status,
                        sentForApprovalAt: adData.sentForApprovalAt?.toDate?.() || adData.sentForApprovalAt,
                        autoApprovalAt: adData.autoApprovalAt?.toDate?.() || adData.autoApprovalAt,
                    },
                });
            }

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error processing ad action:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred processing your request' },
            { status: 500 }
        );
    }
}

// GET endpoint for initial page load (validates token and returns ad info)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Verify and decode the token
        let payload: TokenPayload;
        try {
            payload = verifyApprovalToken(token);
        } catch (error: any) {
            return NextResponse.json(
                { error: error.message || 'Invalid token' },
                { status: 401 }
            );
        }

        const { adId, userId, action } = payload;
        const db = getAdminFirestore();

        // Fetch the advertisement
        const adRef = db.collection('users').doc(userId).collection('advertisements').doc(adId);
        const adDoc = await adRef.get();

        if (!adDoc.exists) {
            return NextResponse.json(
                { error: 'Advertisement not found' },
                { status: 404 }
            );
        }

        const adData = adDoc.data()!;

        // Fetch user details
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        return NextResponse.json({
            success: true,
            action,
            ad: {
                id: adDoc.id,
                businessName: adData.businessName || userData?.businessName,
                contactName: adData.contactName || userData?.contactName,
                adProofUrl: adData.adProofUrl,
                adProofDestinationUrl: adData.adProofDestinationUrl,
                status: adData.status,
                sentForApprovalAt: adData.sentForApprovalAt?.toDate?.() || adData.sentForApprovalAt,
                autoApprovalAt: adData.autoApprovalAt?.toDate?.() || adData.autoApprovalAt,
            },
        });
    } catch (error: any) {
        console.error('Error fetching ad info:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred' },
            { status: 500 }
        );
    }
}
