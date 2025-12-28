
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirebase, useUser as useAuthUser } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, User, Mail, Phone, Globe, FileText, Calendar, Save, Upload, Send, ArrowLeft, CheckCircle, Clock, Palette, Image as ImageIcon, Eye, RefreshCw, X, ExternalLink, Radio, ChevronDown, Edit as EditIcon, Trash2 } from 'lucide-react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    AD_WORKFLOW_STEPS,
    AD_DIMENSIONS,
    AD_PLACEMENT_DIMENSIONS,
    calculateAutoApprovalDeadline,
    shouldAutoApprove,
    normalizeAdStatus,
    type AdStatus,
    type Advertisement,
    type AdDesignPreferences,
    type AdPlacement,
} from '@/lib/types';

interface UserDetails {
    id: string;
    contactName: string;
    contactTitle?: string;
    email: string;
    businessName?: string;
    phone?: string;
    cellPhone?: string;
    businessPhone?: string;
    adWebsiteUrl?: string;
    adText?: string;
    adTitle?: string;
    adNotes?: string;
    designPreferences?: AdDesignPreferences;
    customerSampleAdUrl?: string;
    fileUploads?: string[];
    logoUrl?: string;
    requestCustomDesign?: boolean;
}

interface AdDetails extends Advertisement {
    // Extended for this page
}

// Workflow steps for admin view (using normalized status names)
const adminWorkflowSteps = [
    { id: 'info_needed', title: 'Customer Info', description: 'Waiting for customer to submit business details' },
    { id: 'design_pending', title: 'Design', description: 'Customer designing ad or requesting custom design' },
    { id: 'in_review', title: 'In Review', description: 'Admin creating/finalizing ad' },
    { id: 'customer_approval', title: 'Customer Approval', description: 'Waiting for customer to approve' },
    { id: 'approved', title: 'Approved', description: 'Ready to go live' },
    { id: 'live', title: 'Live', description: 'Ad is active on websites' },
];

function WorkflowStepper({ currentStatus, onStatusChange, isUpdating }: { currentStatus: AdStatus, onStatusChange?: (status: AdStatus) => void, isUpdating?: boolean }) {
    const getCurrentIndex = () => {
        const index = adminWorkflowSteps.findIndex(s => s.id === currentStatus);
        if (currentStatus === 'live') return adminWorkflowSteps.length - 1;
        if (currentStatus === 'paused') return adminWorkflowSteps.length - 1; // Show as live step
        if (currentStatus === 'completed') return adminWorkflowSteps.length - 1;
        if (index === -1) return 0; // Default to first step if not found
        return index;
    };

    const currentIndex = getCurrentIndex();
    const isClickable = !!onStatusChange && !isUpdating;

    const handleStepClick = (stepId: string) => {
        if (onStatusChange && stepId !== currentStatus) {
            onStatusChange(stepId as AdStatus);
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-4">
                {/* Mobile view - vertical stepper */}
                <div className="md:hidden space-y-3">
                    {adminWorkflowSteps.map((step, index) => {
                        const isCompleted = currentIndex > index;
                        const isActive = currentIndex === index;
                        const isPending = currentIndex < index;

                        return (
                            <Tooltip key={step.id}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => handleStepClick(step.id)}
                                        disabled={!isClickable || step.id === currentStatus}
                                        className={cn(
                                            "flex items-center gap-3 w-full text-left",
                                            isClickable && step.id !== currentStatus && "cursor-pointer hover:opacity-80",
                                            (!isClickable || step.id === currentStatus) && "cursor-default"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                                            isCompleted && "bg-green-500 border-green-500 text-white",
                                            isActive && "bg-primary border-primary text-primary-foreground",
                                            isPending && "bg-muted border-muted-foreground/30 text-muted-foreground",
                                            isClickable && step.id !== currentStatus && "hover:ring-2 hover:ring-offset-2 hover:ring-primary/50"
                                        )}>
                                            {isCompleted ? (
                                                <CheckCircle className="h-4 w-4" />
                                            ) : (
                                                <span className="font-bold text-sm">{index + 1}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn(
                                                "text-sm font-medium",
                                                isActive && "text-primary",
                                                isCompleted && "text-green-600",
                                                isPending && "text-muted-foreground"
                                            )}>
                                                {step.title}
                                            </p>
                                        </div>
                                    </button>
                                </TooltipTrigger>
                                {isClickable && step.id !== currentStatus && (
                                    <TooltipContent>
                                        <p>Click to change status to &quot;{step.title}&quot;</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Desktop view - horizontal stepper */}
                <div className="hidden md:flex items-center justify-between">
                    {adminWorkflowSteps.map((step, index) => {
                        const isCompleted = currentIndex > index;
                        const isActive = currentIndex === index;
                        const isPending = currentIndex < index;

                        return (
                            <React.Fragment key={step.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => handleStepClick(step.id)}
                                            disabled={!isClickable || step.id === currentStatus}
                                            className={cn(
                                                "flex flex-col items-center text-center flex-1",
                                                isClickable && step.id !== currentStatus && "cursor-pointer group",
                                                (!isClickable || step.id === currentStatus) && "cursor-default"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all",
                                                isCompleted && "bg-green-500 border-green-500 text-white",
                                                isActive && "bg-primary border-primary text-primary-foreground",
                                                isPending && "bg-muted border-muted-foreground/30 text-muted-foreground",
                                                isClickable && step.id !== currentStatus && "group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-primary/50"
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
                                            <p className="text-xs text-muted-foreground">{step.description}</p>
                                        </button>
                                    </TooltipTrigger>
                                    {isClickable && step.id !== currentStatus && (
                                        <TooltipContent>
                                            <p>Click to change status to &quot;{step.title}&quot;</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
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
        </TooltipProvider>
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
    const [isPushingToAdServer, setIsPushingToAdServer] = useState(false);
    const [pushedToAdServer, setPushedToAdServer] = useState(false);
    const [isUsingCustomerSample, setIsUsingCustomerSample] = useState(false);
    const [isMovingToHolding, setIsMovingToHolding] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

                // Normalize status for consistent UI display
                const normalizedStatus = normalizeAdStatus(adData.status || 'info_needed');

                const fullAd: AdDetails = {
                    id: adDocSnap.id,
                    userId: adData.userId || userId!,
                    subscriptionId: adData.subscriptionId || '',
                    status: normalizedStatus,
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
                    contactTitle: userData.contactTitle,
                    email: userData.email || '',
                    businessName: userData.businessName,
                    phone: userData.phone,
                    cellPhone: userData.cellPhone,
                    businessPhone: userData.businessPhone,
                    adWebsiteUrl: userData.adWebsiteUrl,
                    adText: userData.adText,
                    adTitle: userData.adTitle,
                    adNotes: userData.adNotes,
                    designPreferences: userData.designPreferences,
                    customerSampleAdUrl: userData.customerSampleAdUrl,
                    fileUploads: userData.fileUploads,
                    logoUrl: userData.logoUrl,
                    requestCustomDesign: userData.requestCustomDesign,
                };

                setAdvertisement(fullAd);
                setUser(fullUser);
                setAdProofUrlInput(fullAd.adProofDestinationUrl || fullUser.adWebsiteUrl || '');

                // Check if already pushed to ad server
                if (adData.pushedToAdServerId) {
                    setPushedToAdServer(true);
                }

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
            const errorMessage = error?.message || String(error);
            const isCorsError =
                errorMessage.includes('CORS') ||
                errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('preflight');

            if (isCorsError) {
                toast({
                    title: 'Upload Error - CORS Configuration Required',
                    description: 'File upload failed due to CORS policy. Please run: gsutil cors set cors.json gs://studio-4614023416-d45cd.firebasestorage.app',
                    variant: 'destructive',
                });
            } else {
                toast({ title: 'Save Failed', description: errorMessage || 'Could not save the ad proof.', variant: 'destructive' });
            }
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
            if (newStatus === 'in_review') {
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
            // Call the API endpoint to send the approval email with action tokens
            const response = await fetch('/api/send-approval-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adId: advertisement.id,
                    userId: advertisement.userId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send approval email');
            }

            const autoApprovalDeadline = new Date(data.autoApprovalAt);

            setAdvertisement(prev => prev ? {
                ...prev,
                status: 'customer_approval',
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

    // Use customer's sample ad as the ad proof
    const handleUseCustomerSampleAd = async () => {
        if (!firestore || !user || !advertisement || !user.customerSampleAdUrl) {
            toast({ title: 'Error', description: 'Customer sample ad not found.', variant: 'destructive' });
            return;
        }

        setIsUsingCustomerSample(true);
        try {
            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            await updateDoc(adDocRef, {
                adProofUrl: user.customerSampleAdUrl,
                adProofDestinationUrl: user.adWebsiteUrl || adProofUrlInput,
                updatedAt: serverTimestamp(),
            });

            setAdvertisement(prev => prev ? {
                ...prev,
                adProofUrl: user.customerSampleAdUrl,
                adProofDestinationUrl: user.adWebsiteUrl || adProofUrlInput,
            } : null);

            toast({ title: 'Success!', description: 'Customer sample ad has been set as the ad proof.' });
        } catch (error: any) {
            console.error("Error using customer sample:", error);
            toast({ title: 'Error', description: error.message || 'Could not use customer sample ad.', variant: 'destructive' });
        } finally {
            setIsUsingCustomerSample(false);
        }
    };

    // Move to approved status after customer approval
    const handleMoveToHolding = async () => {
        if (!firestore || !user || !advertisement) {
            toast({ title: 'Error', description: 'Required information is missing.', variant: 'destructive' });
            return;
        }

        setIsMovingToHolding(true);
        try {
            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            await updateDoc(adDocRef, {
                status: 'approved',
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Send confirmation email
            const subject = `Your Ad Has Been Approved! - ${user.businessName || 'Community-Websites.com'}`;
            let html = `
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi ${user.contactName},</p>
<div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac; text-align: center;">
    <p style="margin: 0; font-size: 20px; font-weight: 600; color: #166534;">Your Ad Has Been Approved!</p>
</div>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Great news! Your advertisement for <strong>${user.businessName}</strong> has been approved and is now being prepared for launch.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">We're finalizing the display settings and your ad will be live soon!</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Thank you for advertising with us!</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
            `;

            html = wrapEmailContent(html);

            await sendEmail(firestore, { to: user.email, subject, html }, {
                recipientId: user.id,
                templateId: 'ad_approved_notification',
                triggerType: 'manual_send',
            });

            setAdvertisement(prev => prev ? { ...prev, status: 'approved' } : null);
            toast({ title: 'Ad Approved!', description: `The ad has been approved and is ready to go live.` });
        } catch (error: any) {
            console.error("Error moving to holding:", error);
            toast({ title: 'Error', description: error.message || 'Could not move to holding.', variant: 'destructive' });
        } finally {
            setIsMovingToHolding(false);
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
            // Resend using the same API (it will generate fresh tokens)
            const response = await fetch('/api/send-approval-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adId: advertisement.id,
                    userId: advertisement.userId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend approval email');
            }

            toast({ title: 'Email Resent', description: `Approval reminder sent to ${user.email}.` });
        } catch (error: any) {
            console.error("Error resending approval:", error);
            toast({ title: 'Error', description: error.message || 'Could not resend approval email.', variant: 'destructive' });
        } finally {
            setIsResendingApproval(false);
        }
    };

    const handlePushToAdServer = async () => {
        if (!firestore || !user || !advertisement?.adProofUrl || !advertisement?.adProofDestinationUrl) {
            toast({ title: 'Error', description: 'Ad proof and destination URL are required.', variant: 'destructive' });
            return;
        }

        setIsPushingToAdServer(true);
        try {
            // Determine placement type based on ad dimensions (default to inline for 600x200)
            const placement: AdPlacement = 'inline';
            const dimensions = AD_PLACEMENT_DIMENSIONS[placement];

            // Create a new live ad document
            const liveAdData = {
                name: `${user.businessName || 'Advertisement'} - ${advertisement.id.slice(0, 6)}`,
                description: `Customer advertisement for ${user.businessName}`,
                imageUrl: advertisement.adProofUrl,
                targetUrl: advertisement.adProofDestinationUrl,
                altText: `Advertisement for ${user.businessName}`,
                placement,
                width: dimensions.width,
                height: dimensions.height,
                weight: 50, // Default weight
                status: 'active',
                targetWebsites: [], // Empty array means show on all websites
                startDate: null,
                endDate: null,
                // Link back to source
                sourceAdvertisementId: advertisement.id,
                customerId: advertisement.userId,
                customerName: user.businessName || user.contactName,
                // Analytics
                impressions: 0,
                clicks: 0,
                // Timestamps
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const liveAdDocRef = await addDoc(collection(firestore, 'live_ads'), liveAdData);

            // Update the advertisement to mark it as pushed to ad server
            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            await updateDoc(adDocRef, {
                pushedToAdServerId: liveAdDocRef.id,
                pushedToAdServerAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setPushedToAdServer(true);
            toast({
                title: 'Pushed to Ad Server!',
                description: `The ad is now live on the ad server. You can manage it from the Ad Server page.`,
            });
        } catch (error: any) {
            console.error("Error pushing to ad server:", error);
            toast({ title: 'Error', description: error.message || 'Could not push to ad server.', variant: 'destructive' });
        } finally {
            setIsPushingToAdServer(false);
        }
    };

    const handleDeleteAdvertisement = async () => {
        if (!firestore || !advertisement) return;

        setIsDeleting(true);
        try {
            // Delete the advertisement
            await deleteDoc(doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id));

            // Also delete associated live_ad if it exists
            if (pushedToAdServer || (advertisement as any).pushedToAdServerId) {
                const liveAdId = (advertisement as any).pushedToAdServerId;
                if (liveAdId) {
                    try {
                        await deleteDoc(doc(firestore, 'live_ads', liveAdId));
                    } catch (liveAdErr) {
                        console.warn('Failed to delete associated live_ad:', liveAdErr);
                    }
                }
            }

            toast({
                title: 'Advertisement Deleted',
                description: `The advertisement for "${user?.businessName || 'Unknown'}" has been permanently deleted.`,
            });

            // Navigate back to advertisements list
            router.push('/advertisements');
        } catch (error: any) {
            console.error("Error deleting advertisement:", error);
            toast({
                title: 'Error',
                description: error.message || 'Could not delete advertisement.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
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
    const shouldAutoApproveNow = advertisement.status === 'customer_approval' &&
        advertisement.sentForApprovalAt &&
        shouldAutoApprove(advertisement.sentForApprovalAt);

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Advertisements
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => window.location.href = `mailto:${user.email}`} className="flex-1 sm:flex-none">
                        <Mail className="mr-2 h-4 w-4" />
                        Email Customer
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Header Card */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div>
                            <CardTitle className="text-xl md:text-2xl">{user.businessName || 'Advertisement'}</CardTitle>
                            <CardDescription className="break-all">Ad ID: {advertisement.id}</CardDescription>
                        </div>
                        <Badge
                            variant={AD_STATUS_COLORS[advertisement.status]?.variant || 'outline'}
                            className="text-sm w-fit"
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
                        48 hours have passed since the approval request was sent. You can now mark this ad as approved.
                        <Button
                            size="sm"
                            className="ml-4 bg-amber-600 hover:bg-amber-700"
                            onClick={handleMoveToHolding}
                            disabled={isMovingToHolding}
                        >
                            {isMovingToHolding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Auto-Approve & Move to Holding'}
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Workflow Progress */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle>Workflow Progress</CardTitle>
                        <CardDescription className="mt-1">Click any step to change status</CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isUpdatingStatus}>
                                {isUpdatingStatus ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <EditIcon className="mr-2 h-4 w-4" />
                                )}
                                Change Status
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Workflow Steps</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {adminWorkflowSteps.map((step) => (
                                <DropdownMenuItem
                                    key={step.id}
                                    onClick={() => handleUpdateStatus(step.id as AdStatus)}
                                    disabled={advertisement.status === step.id}
                                    className={cn(
                                        advertisement.status === step.id && "bg-muted font-medium"
                                    )}
                                >
                                    <span className="flex-1">{step.title}</span>
                                    {advertisement.status === step.id && (
                                        <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                                    )}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Other Statuses</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => handleUpdateStatus('paused')}
                                disabled={advertisement.status === 'paused'}
                                className={cn(
                                    advertisement.status === 'paused' && "bg-muted font-medium"
                                )}
                            >
                                <span className="flex-1">Paused</span>
                                {advertisement.status === 'paused' && (
                                    <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleUpdateStatus('canceled')}
                                disabled={advertisement.status === 'canceled'}
                                className="text-red-600 focus:text-red-600"
                            >
                                Canceled
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                    <WorkflowStepper
                        currentStatus={advertisement.status}
                        onStatusChange={handleUpdateStatus}
                        isUpdating={isUpdatingStatus}
                    />
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status-specific action cards */}

                    {/* Info Needed - Waiting for customer to submit info */}
                    {advertisement.status === 'info_needed' && (
                        <Card className="border-amber-200 bg-amber-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-700">
                                    <Clock className="h-5 w-5" />
                                    Waiting for Customer Info
                                </CardTitle>
                                <CardDescription>
                                    The customer hasn&apos;t submitted their business details yet. They need to complete the onboarding form.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Alert className="bg-amber-100 border-amber-300">
                                    <Mail className="h-4 w-4 text-amber-700" />
                                    <AlertDescription className="text-amber-800">
                                        The customer will receive automated reminders to complete their ad setup. You can also email them directly.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* In Review - Admin needs to create/finalize ad */}
                    {advertisement.status === 'in_review' && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-700">
                                    <Eye className="h-5 w-5" />
                                    Review Customer Submission
                                </CardTitle>
                                <CardDescription>
                                    The customer has submitted their information. Review it and create the ad proof.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleUpdateStatus('customer_approval')}
                                        disabled={isUpdatingStatus || !advertisement.adProofUrl}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Send for Customer Approval
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateStatus('info_needed')}
                                        disabled={isUpdatingStatus}
                                    >
                                        Request More Info
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Ad Creation/Upload section - shown for in_review and design_pending */}
                    {(advertisement.status === 'in_review' || advertisement.status === 'design_pending') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {advertisement.adProofUrl ? 'Update Advertisement Proof' : 'Create Advertisement Proof'}
                                </CardTitle>
                                <CardDescription>
                                    Edit the design in our visual designer, or upload an ad creative.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Open Ad Designer Button */}
                                <div className="p-4 border-2 border-dashed rounded-lg bg-muted/30 text-center">
                                    <Palette className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {advertisement.customerSampleAdUrl
                                            ? 'Edit the customer\'s design or create a new one'
                                            : 'Create an ad design for this customer'}
                                    </p>
                                    <Button
                                        onClick={() => router.push(`/design-ad?userId=${advertisement.userId}&adId=${advertisement.id}`)}
                                    >
                                        <Palette className="mr-2 h-4 w-4" />
                                        Open Ad Designer
                                    </Button>
                                </div>

                                <Separator />

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
                                    <h4 className="font-medium">{advertisement.adProofUrl ? 'Or Upload New Proof' : 'Or Upload Proof File'}</h4>
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

                    {/* Customer Approval - Waiting for customer response */}
                    {advertisement.status === 'customer_approval' && (
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

                                <div className="flex gap-3 flex-wrap">
                                    <Button onClick={handleMoveToHolding} disabled={isMovingToHolding} className="bg-green-600 hover:bg-green-700">
                                        {isMovingToHolding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Approve Ad
                                    </Button>
                                    <Button variant="secondary" onClick={handleResendApproval} disabled={isResendingApproval}>
                                        {isResendingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        Resend Approval Email
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateStatus('in_review')}
                                        disabled={isUpdatingStatus}
                                    >
                                        Back to Review
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Approved - Ready to go live */}
                    {advertisement.status === 'approved' && (
                        <Card className="border-indigo-200 bg-indigo-50">
                            <CardHeader>
                                <CardTitle className="text-indigo-700 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    Approved - Ready to Publish
                                </CardTitle>
                                <CardDescription>The ad has been approved by the customer. Ready to go live!</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {advertisement.adProofUrl && (
                                    <div className="border rounded-lg p-4 bg-white">
                                        <Image
                                            src={advertisement.adProofUrl}
                                            alt="Advertisement"
                                            width={AD_DIMENSIONS.WIDTH}
                                            height={AD_DIMENSIONS.HEIGHT}
                                            className="border mx-auto"
                                        />
                                        <p className="text-sm text-center mt-2">
                                            Links to: <a href={advertisement.adProofDestinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{advertisement.adProofDestinationUrl}</a>
                                        </p>
                                    </div>
                                )}
                                <Alert className="bg-indigo-100 border-indigo-300">
                                    <Radio className="h-4 w-4 text-indigo-700" />
                                    <AlertDescription className="text-indigo-800">
                                        After going live, configure display settings (weight, targeting) in the Ad Server.
                                    </AlertDescription>
                                </Alert>
                                <div className="flex gap-3 flex-wrap">
                                    <Button onClick={handleGoLive} disabled={isGoingLive} className="bg-green-600 hover:bg-green-700">
                                        {isGoingLive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Go Live
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleUpdateStatus('in_review')}
                                        disabled={isUpdatingStatus}
                                    >
                                        Back to Review
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
                                <div className="flex gap-3 flex-wrap">
                                    {!pushedToAdServer && (
                                        <Button
                                            onClick={handlePushToAdServer}
                                            disabled={isPushingToAdServer}
                                            className="bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            {isPushingToAdServer ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Radio className="mr-2 h-4 w-4" />
                                            )}
                                            Push to Ad Server
                                        </Button>
                                    )}
                                    {pushedToAdServer && (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push('/ad-server')}
                                            className="text-indigo-600 border-indigo-300"
                                        >
                                            <Radio className="mr-2 h-4 w-4" />
                                            View in Ad Server
                                        </Button>
                                    )}
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

                    {/* Customer-Provided Assets */}
                    {(user.customerSampleAdUrl || user.logoUrl || (user.fileUploads && user.fileUploads.length > 0) || user.requestCustomDesign) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5" />
                                    Customer-Provided Assets
                                </CardTitle>
                                {user.requestCustomDesign && (
                                    <Badge variant="secondary">Custom Design Requested</Badge>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Customer's Logo */}
                                {user.logoUrl && (
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Logo</h4>
                                        <div className="flex items-start gap-4">
                                            <Image
                                                src={user.logoUrl}
                                                alt="Customer logo"
                                                width={120}
                                                height={120}
                                                className="border rounded object-contain"
                                            />
                                            <a href={user.logoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                                <ExternalLink className="h-3 w-3" /> View Full Size
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Ad Title & Text for custom design requests */}
                                {user.requestCustomDesign && (user.adTitle || user.adText) && (
                                    <div className="space-y-4 p-4 bg-muted rounded-lg">
                                        {user.adTitle && (
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Title Text</p>
                                                <p className="text-lg font-semibold">{user.adTitle}</p>
                                            </div>
                                        )}
                                        {user.adText && (
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Ad Text</p>
                                                <p className="whitespace-pre-wrap">{user.adText}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Customer's designed ad */}
                                {user.customerSampleAdUrl && (
                                    <div className="space-y-3">
                                        <h4 className="font-medium">Customer-Designed Ad ({AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT})</h4>
                                        <Image
                                            src={user.customerSampleAdUrl}
                                            alt="Customer sample ad"
                                            width={AD_DIMENSIONS.WIDTH}
                                            height={AD_DIMENSIONS.HEIGHT}
                                            className="border rounded"
                                        />
                                        {(advertisement.status === 'in_review' || advertisement.status === 'design_pending') && (
                                            <Button
                                                onClick={handleUseCustomerSampleAd}
                                                disabled={isUsingCustomerSample}
                                                variant="secondary"
                                            >
                                                {isUsingCustomerSample ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ImageIcon className="mr-2 h-4 w-4" />
                                                )}
                                                Use This as Ad Proof
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Additional uploaded images */}
                                {user.fileUploads && user.fileUploads.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Additional Images ({user.fileUploads.length})</h4>
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
                                <div>
                                    <span className="font-medium">{user.contactName}</span>
                                    {user.contactTitle && (
                                        <span className="text-muted-foreground ml-1">({user.contactTitle})</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</a>
                            </div>
                            {user.cellPhone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <span className="text-muted-foreground text-xs">Cell: </span>
                                        <a href={`tel:${user.cellPhone}`} className="hover:underline">{user.cellPhone}</a>
                                    </div>
                                </div>
                            )}
                            {user.businessPhone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <span className="text-muted-foreground text-xs">Business: </span>
                                        <a href={`tel:${user.businessPhone}`} className="hover:underline">{user.businessPhone}</a>
                                    </div>
                                </div>
                            )}
                            {!user.cellPhone && !user.businessPhone && user.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{user.phone}</span>
                                </div>
                            )}
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Advertisement</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete the advertisement for &quot;{user?.businessName || 'Unknown'}&quot;?
                            {pushedToAdServer && " This will also remove the associated live ad from the ad server."}
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleDeleteAdvertisement}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete Advertisement
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
