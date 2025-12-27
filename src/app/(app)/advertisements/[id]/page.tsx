
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirebase, useUser as useAuthUser } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, User, Mail, Phone, Globe, FileText, Calendar, Save, Upload, Send, ArrowLeft, CheckCircle, Clock, Palette, Image as ImageIcon, Eye, RefreshCw, X, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { sendEmail } from '@/lib/firebase/email';
import { wrapEmailContent } from '@/lib/email-utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    AD_WORKFLOW_STEPS,
    AD_DIMENSIONS,
    calculateAutoApprovalDeadline,
    shouldAutoApprove,
    type AdStatus,
    type Advertisement,
    type AdDesignPreferences
} from '@/lib/types';

interface UserDetails {
    id: string;
    contactName: string;
    email: string;
    businessName?: string;
    phone?: string;
    adWebsiteUrl?: string;
    adText?: string;
    adNotes?: string;
    designPreferences?: AdDesignPreferences;
    customerSampleAdUrl?: string;
    fileUploads?: string[];
}

interface AdDetails extends Advertisement {
    // Extended for this page
}

// Workflow steps for admin view (more detailed)
const adminWorkflowSteps = [
    { id: 'pending_info', title: 'Customer Info', description: 'Waiting for customer to submit business details' },
    { id: 'pending_internal_review', title: 'Internal Review', description: 'Review customer submission' },
    { id: 'pending_ad_creation', title: 'Ad Creation', description: 'Creating ad with external application' },
    { id: 'pending_customer_approval', title: 'Customer Approval', description: 'Waiting for customer to approve' },
    { id: 'live', title: 'Live', description: 'Ad is active on websites' },
];

function WorkflowStepper({ currentStatus, onStatusChange }: { currentStatus: AdStatus, onStatusChange?: (status: AdStatus) => void }) {
    const getCurrentIndex = () => {
        const index = adminWorkflowSteps.findIndex(s => s.id === currentStatus);
        if (currentStatus === 'approved') return adminWorkflowSteps.length - 1;
        if (currentStatus === 'live') return adminWorkflowSteps.length - 1;
        return index;
    };

    const currentIndex = getCurrentIndex();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {adminWorkflowSteps.map((step, index) => {
                    const isCompleted = currentIndex > index;
                    const isActive = currentIndex === index;
                    const isPending = currentIndex < index;

                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center text-center flex-1">
                                <div className={cn(
                                    "h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all",
                                    isCompleted && "bg-green-500 border-green-500 text-white",
                                    isActive && "bg-primary border-primary text-primary-foreground",
                                    isPending && "bg-muted border-muted-foreground/30 text-muted-foreground"
                                )}>
                                    {isCompleted ? (
                                        <CheckCircle className="h-6 w-6" />
                                    ) : (
                                        <span className="font-bold">{index + 1}</span>
                                    )}
                                </div>
                                <p className={cn(
                                    "mt-2 text-sm font-medium",
                                    isActive && "text-primary",
                                    isCompleted && "text-green-600",
                                    isPending && "text-muted-foreground"
                                )}>
                                    {step.title}
                                </p>
                                <p className="text-xs text-muted-foreground hidden md:block">{step.description}</p>
                            </div>
                            {index < adminWorkflowSteps.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-1 mx-2 max-w-[80px]",
                                    isCompleted ? "bg-green-500" : "bg-border"
                                )} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

export default function AdvertisementDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { id: adId } = params;
    const userId = searchParams.get('userId');

    const { firestore, storage } = useFirebase();
    const { toast } = useToast();

    const [advertisement, setAdvertisement] = useState<AdDetails | null>(null);
    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [adProofFile, setAdProofFile] = useState<File | null>(null);
    const [adProofUrlInput, setAdProofUrlInput] = useState('');
    const [isSavingProof, setIsSavingProof] = useState(false);
    const [isRequestingApproval, setIsRequestingApproval] = useState(false);
    const [isGoingLive, setIsGoingLive] = useState(false);
    const [isResendingApproval, setIsResendingApproval] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        if (!firestore || typeof adId !== 'string' || !userId) {
            setLoading(false);
            setError("Invalid advertisement or user ID.");
            return;
        }

        const fetchDetails = async () => {
            try {
                setLoading(true);

                const adDocRef = doc(firestore, 'users', userId, 'advertisements', adId);
                const userDocRef = doc(firestore, 'users', userId);

                const [adDocSnap, userDocSnap] = await Promise.all([
                    getDoc(adDocRef),
                    getDoc(userDocRef),
                ]);

                if (!adDocSnap.exists()) {
                    throw new Error("Advertisement not found.");
                }
                if (!userDocSnap.exists()) {
                    throw new Error("Associated customer details not found.");
                }

                const adData = adDocSnap.data();
                const userData = userDocSnap.data();

                const fullAd: AdDetails = {
                    id: adDocSnap.id,
                    userId: adData.userId || userId!,
                    subscriptionId: adData.subscriptionId || '',
                    status: adData.status || 'pending_info',
                    adProofUrl: adData.adProofUrl,
                    adProofDestinationUrl: adData.adProofDestinationUrl,
                    customerSampleAdUrl: adData.customerSampleAdUrl,
                    designPreferences: adData.designPreferences,
                    businessName: adData.businessName,
                    contactName: adData.contactName,
                    email: adData.email,
                    phone: adData.phone,
                    adWebsiteUrl: adData.adWebsiteUrl,
                    adText: adData.adText,
                    adNotes: adData.adNotes,
                    customerUploads: adData.customerUploads,
                    infoSubmittedAt: adData.infoSubmittedAt,
                    sentForReviewAt: adData.sentForReviewAt,
                    sentForApprovalAt: adData.sentForApprovalAt,
                    approvedAt: adData.approvedAt,
                    autoApprovalAt: adData.autoApprovalAt,
                    liveAt: adData.liveAt,
                    revisionCount: adData.revisionCount,
                    revisionNotes: adData.revisionNotes,
                    createdAt: adData.createdAt,
                    updatedAt: adData.updatedAt,
                };

                const fullUser: UserDetails = {
                    id: userDocSnap.id,
                    contactName: userData.contactName || '',
                    email: userData.email || '',
                    businessName: userData.businessName,
                    phone: userData.phone,
                    adWebsiteUrl: userData.adWebsiteUrl,
                    adText: userData.adText,
                    adNotes: userData.adNotes,
                    designPreferences: userData.designPreferences,
                    customerSampleAdUrl: userData.customerSampleAdUrl,
                    fileUploads: userData.fileUploads,
                };

                setAdvertisement(fullAd);
                setUser(fullUser);
                setAdProofUrlInput(fullAd.adProofDestinationUrl || fullUser.adWebsiteUrl || '');

            } catch (err: any) {
                console.error("Error fetching details:", err);
                setError(err.message || "Failed to load details.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();

    }, [firestore, adId, userId]);

    const handleSaveProof = async () => {
        if (!firestore || !storage || !advertisement || !user) {
            toast({ title: 'Error', description: 'Required information is missing.', variant: 'destructive' });
            return;
        }

        const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
        const originalAdProofUrl = advertisement.adProofUrl;
        const originalAdDestinationUrl = advertisement.adProofDestinationUrl || user.adWebsiteUrl || '';

        const hasUrlChanged = adProofUrlInput !== originalAdDestinationUrl;

        if (!adProofFile && !hasUrlChanged) {
            toast({ title: 'No Changes', description: 'Please upload a new file or modify the destination URL to save.' });
            return;
        }

        setIsSavingProof(true);

        try {
            let newProofUrl = originalAdProofUrl;

            if (adProofFile) {
                const filePath = `advertisements/${advertisement.userId}/${advertisement.id}/${adProofFile.name}`;
                const fileStorageRef = storageRef(storage, filePath);

                await uploadBytes(fileStorageRef, adProofFile);
                newProofUrl = await getDownloadURL(fileStorageRef);
            }

            const updateData: { [key: string]: any } = {
                adProofDestinationUrl: adProofUrlInput,
                updatedAt: serverTimestamp(),
            };
            if (newProofUrl) {
                updateData.adProofUrl = newProofUrl;
            }

            await updateDoc(adDocRef, updateData);

            setAdvertisement(prev => prev ? {
                ...prev,
                adProofUrl: newProofUrl,
                adProofDestinationUrl: adProofUrlInput
            } : null);

            setAdProofFile(null);
            toast({ title: 'Success!', description: 'Advertisement proof has been saved.' });

        } catch (error: any) {
            console.error("Error saving proof:", error);
            toast({ title: 'Save Failed', description: error.message || 'Could not save the ad proof.', variant: 'destructive' });
        } finally {
            setIsSavingProof(false);
        }
    };

    const handleUpdateStatus = async (newStatus: AdStatus) => {
        if (!firestore || !advertisement) {
            toast({ title: 'Error', description: 'Required information is missing.', variant: 'destructive' });
            return;
        }

        setIsUpdatingStatus(true);
        try {
            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            const updateData: any = {
                status: newStatus,
                updatedAt: serverTimestamp(),
            };

            // Add relevant timestamps based on status transition
            if (newStatus === 'pending_ad_creation') {
                updateData.sentForReviewAt = serverTimestamp();
            }

            await updateDoc(adDocRef, updateData);
            setAdvertisement(prev => prev ? { ...prev, status: newStatus } : null);

            toast({ title: 'Status Updated', description: `Advertisement status changed to ${AD_STATUS_LABELS[newStatus]}.` });
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast({ title: 'Update Failed', description: error.message || 'Could not update status.', variant: 'destructive' });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleRequestApproval = async () => {
        if (!firestore || !user || !advertisement?.adProofUrl || !advertisement?.adProofDestinationUrl) {
            toast({ title: 'Error', description: 'A saved ad proof and destination URL are required before requesting approval.', variant: 'destructive' });
            return;
        }

        setIsRequestingApproval(true);
        try {
            const templateQuery = query(collection(firestore, 'emailTemplates'), where('id', '==', 'ad_proof_approval'));
            const templateSnapshot = await getDocs(templateQuery);

            let subject = `Your Ad Proof is Ready - ${user.businessName || 'Community-Websites.com'}`;
            let html = `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi ${user.contactName},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Great news! Your advertisement proof for <strong>${user.businessName}</strong> is ready for your review.</p>
<div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your Ad Creative</p>
    <a href="${advertisement.adProofDestinationUrl}" target="_blank" style="display: inline-block;">
        <img src="${advertisement.adProofUrl}" alt="Ad Proof for ${user.businessName}" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"/>
    </a>
    <p style="margin: 16px 0 0 0; font-size: 14px; color: #64748b;">
        <strong>Click destination:</strong> <a href="${advertisement.adProofDestinationUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">${advertisement.adProofDestinationUrl}</a>
    </p>
</div>
<div style="margin: 24px 0; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde047;">
    <p style="margin: 0; font-size: 16px; color: #854d0e;"><strong>Important:</strong> Please log in to your account to approve or request changes to your ad. If you don't respond within 48 hours, your ad will be automatically approved and go live.</p>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 6px;" bgcolor="#0284c7">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://community-websites.com'}/account" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Log In to Approve Your Ad
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Thank you for advertising with us!</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
            `;

            if (!templateSnapshot.empty) {
                const template = templateSnapshot.docs[0].data();
                subject = template.subject
                    .replace(/\{\{businessName\}\}/g, user.businessName || '')
                    .replace(/\{\{contactName\}\}/g, user.contactName);
                html = template.html
                    .replace(/\{\{contactName\}\}/g, user.contactName)
                    .replace(/\{\{adProofUrl\}\}/g, advertisement.adProofUrl)
                    .replace(/\{\{adProofDestinationUrl\}\}/g, advertisement.adProofDestinationUrl)
                    .replace(/\{\{businessName\}\}/g, user.businessName || '');
            }

            // Wrap email in professional template
            html = wrapEmailContent(html);

            await sendEmail(firestore, { to: user.email, subject, html }, {
                recipientId: user.id,
                templateId: 'ad_proof_approval',
                triggerType: 'manual_send',
            });

            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            const autoApprovalDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await updateDoc(adDocRef, {
                status: 'pending_customer_approval',
                sentForApprovalAt: serverTimestamp(),
                autoApprovalAt: autoApprovalDeadline,
                updatedAt: serverTimestamp(),
            });

            setAdvertisement(prev => prev ? {
                ...prev,
                status: 'pending_customer_approval',
                sentForApprovalAt: new Date(),
                autoApprovalAt: autoApprovalDeadline
            } : null);

            toast({ title: 'Approval Requested', description: `An email has been sent to ${user.email}. Auto-approval in 48 hours.` });
        } catch (error: any) {
            console.error("Error requesting approval:", error);
            toast({ title: 'Request Failed', description: error.message || 'Could not request approval.', variant: 'destructive' });
        } finally {
            setIsRequestingApproval(false);
        }
    };

    const handleGoLive = async () => {
        if (!firestore || !user || !advertisement) {
            toast({ title: 'Error', description: 'Required information is missing.', variant: 'destructive' });
            return;
        }

        setIsGoingLive(true);
        try {
            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            await updateDoc(adDocRef, {
                status: 'live',
                approvedAt: serverTimestamp(),
                liveAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Send confirmation email
            const subject = `Your Ad is Now Live! - ${user.businessName || 'Community-Websites.com'}`;
            let html = `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi ${user.contactName},</p>
<div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac; text-align: center;">
    <p style="margin: 0; font-size: 20px; font-weight: 600; color: #166534;">Your Ad is Now Live!</p>
</div>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Great news! Your advertisement for <strong>${user.businessName}</strong> is now live on our community websites.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Your ad is now being displayed to thousands of local residents.</p>
<div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #18181b;">Ad Details:</p>
    <p style="margin: 0; font-size: 15px; color: #3f3f46;"><strong>Ad Link:</strong> <a href="${advertisement.adProofDestinationUrl}" style="color: #0284c7; text-decoration: underline;">${advertisement.adProofDestinationUrl}</a></p>
</div>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">You can view and manage your advertisement anytime by logging into your account.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 6px;" bgcolor="#0284c7">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://community-websites.com'}/account" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View My Account
            </a>
        </td>
    </tr>
</table>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Thank you for advertising with us!</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
            `;

            // Wrap email in professional template
            html = wrapEmailContent(html);

            await sendEmail(firestore, { to: user.email, subject, html }, {
                recipientId: user.id,
                templateId: 'ad_live_notification',
                triggerType: 'manual_send',
            });

            setAdvertisement(prev => prev ? { ...prev, status: 'live' } : null);
            toast({ title: 'Ad is Live!', description: `The advertisement for ${user.businessName} is now live.` });
        } catch (error: any) {
            console.error("Error going live:", error);
            toast({ title: 'Error', description: error.message || 'Could not set ad to live.', variant: 'destructive' });
        } finally {
            setIsGoingLive(false);
        }
    };

    const handleResendApproval = async () => {
        if (!firestore || !user || !advertisement?.adProofUrl) {
            toast({ title: 'Error', description: 'Required information is missing.', variant: 'destructive' });
            return;
        }

        setIsResendingApproval(true);
        try {
            const subject = `Reminder: Your Ad Proof is Ready - ${user.businessName || 'Community-Websites.com'}`;
            let html = `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi ${user.contactName},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">This is a friendly reminder that your advertisement proof for <strong>${user.businessName}</strong> is still awaiting your approval.</p>
<div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your Ad Proof</p>
    <a href="${advertisement.adProofUrl}" target="_blank" style="display: inline-block;">
        <img src="${advertisement.adProofUrl}" alt="Ad Proof for ${user.businessName}" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"/>
    </a>
</div>
<div style="margin: 24px 0; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde047;">
    <p style="margin: 0; font-size: 16px; color: #854d0e;"><strong>Note:</strong> If you don't respond within 48 hours from the original request, your ad will be automatically approved and go live.</p>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 6px;" bgcolor="#0284c7">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://community-websites.com'}/account" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Log In to Approve Your Ad
            </a>
        </td>
    </tr>
</table>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
            `;

            // Wrap email in professional template
            html = wrapEmailContent(html);

            await sendEmail(firestore, { to: user.email, subject, html }, {
                recipientId: user.id,
                templateId: 'ad_proof_approval_reminder',
                triggerType: 'manual_send',
            });

            toast({ title: 'Email Resent', description: `Approval reminder sent to ${user.email}.` });
        } catch (error: any) {
            console.error("Error resending approval:", error);
            toast({ title: 'Error', description: error.message || 'Could not resend approval email.', variant: 'destructive' });
        } finally {
            setIsResendingApproval(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    if (!advertisement || !user) {
        return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Not Found</AlertTitle><AlertDescription>The requested advertisement could not be found.</AlertDescription></Alert>;
    }

    // Check if auto-approval should happen
    const shouldAutoApproveNow = advertisement.status === 'pending_customer_approval' &&
        advertisement.sentForApprovalAt &&
        shouldAutoApprove(advertisement.sentForApprovalAt);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Advertisements
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.location.href = `mailto:${user.email}`}>
                        Email Customer
                    </Button>
                </div>
            </div>

            {/* Header Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{user.businessName || 'Advertisement'}</CardTitle>
                            <CardDescription>Ad ID: {advertisement.id}</CardDescription>
                        </div>
                        <Badge
                            variant={AD_STATUS_COLORS[advertisement.status]?.variant || 'outline'}
                            className="text-sm"
                        >
                            {AD_STATUS_LABELS[advertisement.status] || advertisement.status}
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {/* Auto-approval Warning */}
            {shouldAutoApproveNow && (
                <Alert className="border-amber-500 bg-amber-50">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Auto-Approval Deadline Passed</AlertTitle>
                    <AlertDescription className="text-amber-700">
                        48 hours have passed since the approval request was sent. You can now mark this ad as approved and go live.
                        <Button
                            size="sm"
                            className="ml-4 bg-amber-600 hover:bg-amber-700"
                            onClick={handleGoLive}
                            disabled={isGoingLive}
                        >
                            {isGoingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Auto-Approve & Go Live'}
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Workflow Progress */}
            <Card>
                <CardHeader>
                    <CardTitle>Workflow Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <WorkflowStepper currentStatus={advertisement.status} />
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status-specific action cards */}

                    {/* Pending Internal Review */}
                    {advertisement.status === 'pending_internal_review' && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-700">
                                    <Eye className="h-5 w-5" />
                                    Review Customer Submission
                                </CardTitle>
                                <CardDescription>
                                    The customer has submitted their information. Review it and move to ad creation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleUpdateStatus('pending_ad_creation')}
                                        disabled={isUpdatingStatus}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Approve & Start Ad Creation
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateStatus('pending_info')}
                                        disabled={isUpdatingStatus}
                                    >
                                        Request More Info
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pending Ad Creation */}
                    {(advertisement.status === 'pending_ad_creation' || advertisement.status === 'revision_requested') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {advertisement.status === 'revision_requested' ? 'Create Revised Ad Proof' : 'Create Advertisement Proof'}
                                </CardTitle>
                                <CardDescription>
                                    Upload the ad creative designed in your external application.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Current Proof Preview */}
                                {advertisement.adProofUrl && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Current Proof</h4>
                                        <div className="border rounded-lg p-4 bg-muted/30">
                                            <Image
                                                src={advertisement.adProofUrl}
                                                alt="Advertisement Proof"
                                                width={AD_DIMENSIONS.WIDTH}
                                                height={AD_DIMENSIONS.HEIGHT}
                                                className="border bg-white mx-auto"
                                            />
                                            <p className="text-xs text-muted-foreground text-center mt-2">
                                                Destination: <a href={advertisement.adProofDestinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{advertisement.adProofDestinationUrl}</a>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Upload New Proof */}
                                <div className="space-y-4">
                                    <h4 className="font-medium">{advertisement.adProofUrl ? 'Upload New Proof' : 'Upload Proof'}</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="ad-proof-file">Ad Image File ({AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT})</Label>
                                            <Input
                                                id="ad-proof-file"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setAdProofFile(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ad-proof-url">Ad Destination URL</Label>
                                            <Input
                                                id="ad-proof-url"
                                                type="text"
                                                placeholder="https://example.com"
                                                value={adProofUrlInput}
                                                onChange={(e) => setAdProofUrlInput(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button onClick={handleSaveProof} disabled={isSavingProof}>
                                                {isSavingProof ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                {isSavingProof ? 'Saving...' : 'Save Proof'}
                                            </Button>
                                            {advertisement.adProofUrl && (
                                                <Button onClick={handleRequestApproval} disabled={isRequestingApproval}>
                                                    {isRequestingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                    {isRequestingApproval ? 'Sending...' : 'Send for Customer Approval'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pending Customer Approval */}
                    {advertisement.status === 'pending_customer_approval' && (
                        <Card className="border-amber-200 bg-amber-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-700">
                                    <Clock className="h-5 w-5" />
                                    Awaiting Customer Approval
                                </CardTitle>
                                <CardDescription>
                                    The ad proof has been sent to the customer. Waiting for their response.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {advertisement.sentForApprovalAt && (
                                    <div className="text-sm text-amber-700">
                                        <p>Sent: {formatDistanceToNow(advertisement.sentForApprovalAt.toDate ? advertisement.sentForApprovalAt.toDate() : new Date(advertisement.sentForApprovalAt), { addSuffix: true })}</p>
                                        <p>Auto-approval: {format(calculateAutoApprovalDeadline(advertisement.sentForApprovalAt), 'PPP p')}</p>
                                    </div>
                                )}

                                <div className="border rounded-lg p-4 bg-white">
                                    <Image
                                        src={advertisement.adProofUrl!}
                                        alt="Advertisement Proof"
                                        width={AD_DIMENSIONS.WIDTH}
                                        height={AD_DIMENSIONS.HEIGHT}
                                        className="border mx-auto"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button onClick={handleGoLive} disabled={isGoingLive} className="bg-green-600 hover:bg-green-700">
                                        {isGoingLive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Mark Approved & Go Live
                                    </Button>
                                    <Button variant="secondary" onClick={handleResendApproval} disabled={isResendingApproval}>
                                        {isResendingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        Resend Approval Email
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateStatus('pending_ad_creation')}
                                        disabled={isUpdatingStatus}
                                    >
                                        Back to Ad Creation
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Live */}
                    {advertisement.status === 'live' && (
                        <Card className="border-green-200 bg-green-50">
                            <CardHeader>
                                <CardTitle className="text-green-700 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    Advertisement is Live
                                </CardTitle>
                                <CardDescription>This ad is currently being displayed on community websites.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border rounded-lg p-4 bg-white">
                                    <Image
                                        src={advertisement.adProofUrl!}
                                        alt="Advertisement"
                                        width={AD_DIMENSIONS.WIDTH}
                                        height={AD_DIMENSIONS.HEIGHT}
                                        className="border mx-auto"
                                    />
                                    <p className="text-sm text-center mt-2">
                                        Links to: <a href={advertisement.adProofDestinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{advertisement.adProofDestinationUrl}</a>
                                    </p>
                                </div>
                                {advertisement.liveAt && (
                                    <p className="text-sm text-green-700">
                                        Live since: {format(advertisement.liveAt.toDate ? advertisement.liveAt.toDate() : new Date(advertisement.liveAt), 'PPP')}
                                    </p>
                                )}
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateStatus('paused')}
                                        disabled={isUpdatingStatus}
                                    >
                                        Pause Ad
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Customer Sample Ad & Uploads */}
                    {(user.customerSampleAdUrl || (user.fileUploads && user.fileUploads.length > 0)) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5" />
                                    Customer-Provided Assets
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {user.customerSampleAdUrl && (
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Sample Ad ({AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT})</h4>
                                        <Image
                                            src={user.customerSampleAdUrl}
                                            alt="Customer sample ad"
                                            width={AD_DIMENSIONS.WIDTH}
                                            height={AD_DIMENSIONS.HEIGHT}
                                            className="border rounded"
                                        />
                                    </div>
                                )}
                                {user.fileUploads && user.fileUploads.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Uploaded Files ({user.fileUploads.length})</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {user.fileUploads.map((url, index) => (
                                                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                                    <div className="relative aspect-square border rounded-lg overflow-hidden hover:ring-2 ring-primary">
                                                        <Image
                                                            src={url}
                                                            alt={`Upload ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{user.contactName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</a>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{user.phone || 'Not Provided'}</span>
                            </div>
                            <Separator />
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium">Business Name</p>
                                <p>{user.businessName || 'Not Provided'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium">Ad Link URL</p>
                                {user.adWebsiteUrl ? (
                                    <a href={user.adWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all flex items-center gap-1">
                                        {user.adWebsiteUrl} <ExternalLink className="h-3 w-3" />
                                    </a>
                                ) : (
                                    <p className="text-muted-foreground">Not Provided</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ad Content */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ad Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium">Ad Text / Slogan</p>
                                <p className="whitespace-pre-wrap">{user.adText || 'Not Provided'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium">Notes / Special Offers</p>
                                <p className="whitespace-pre-wrap">{user.adNotes || 'Not Provided'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Design Preferences */}
                    {user.designPreferences && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="h-5 w-5" />
                                    Design Preferences
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Primary</p>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-6 w-6 rounded border"
                                                style={{ backgroundColor: user.designPreferences.primaryColor }}
                                            />
                                            <span className="text-xs">{user.designPreferences.primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Secondary</p>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-6 w-6 rounded border"
                                                style={{ backgroundColor: user.designPreferences.secondaryColor }}
                                            />
                                            <span className="text-xs">{user.designPreferences.secondaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Background</p>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-6 w-6 rounded border"
                                                style={{ backgroundColor: user.designPreferences.backgroundColor }}
                                            />
                                            <span className="text-xs">{user.designPreferences.backgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Text</p>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-6 w-6 rounded border"
                                                style={{ backgroundColor: user.designPreferences.textColor }}
                                            />
                                            <span className="text-xs">{user.designPreferences.textColor}</span>
                                        </div>
                                    </div>
                                </div>
                                {user.designPreferences.fontStyle && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Font Style</p>
                                        <p className="capitalize">{user.designPreferences.fontStyle}</p>
                                    </div>
                                )}
                                {user.designPreferences.additionalNotes && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Additional Notes</p>
                                        <p className="text-sm whitespace-pre-wrap">{user.designPreferences.additionalNotes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Timeline</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {advertisement.createdAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Created</span>
                                    <span>{format(advertisement.createdAt.toDate ? advertisement.createdAt.toDate() : new Date(advertisement.createdAt), 'MMM d, yyyy')}</span>
                                </div>
                            )}
                            {advertisement.infoSubmittedAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Info Submitted</span>
                                    <span>{format(advertisement.infoSubmittedAt.toDate ? advertisement.infoSubmittedAt.toDate() : new Date(advertisement.infoSubmittedAt), 'MMM d, yyyy')}</span>
                                </div>
                            )}
                            {advertisement.sentForApprovalAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sent for Approval</span>
                                    <span>{format(advertisement.sentForApprovalAt.toDate ? advertisement.sentForApprovalAt.toDate() : new Date(advertisement.sentForApprovalAt), 'MMM d, yyyy')}</span>
                                </div>
                            )}
                            {advertisement.approvedAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Approved</span>
                                    <span>{format(advertisement.approvedAt.toDate ? advertisement.approvedAt.toDate() : new Date(advertisement.approvedAt), 'MMM d, yyyy')}</span>
                                </div>
                            )}
                            {advertisement.liveAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Went Live</span>
                                    <span>{format(advertisement.liveAt.toDate ? advertisement.liveAt.toDate() : new Date(advertisement.liveAt), 'MMM d, yyyy')}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
