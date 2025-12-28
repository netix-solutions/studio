'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { WorkflowProgress, WorkflowStatusBanner } from './WorkflowProgress';
import { BusinessInfoStep, type BusinessInfoFormData } from './steps/BusinessInfoStep';
import { DesignStep } from './steps/DesignStep';
import { ApprovalStep, WaitingForReviewStep, ApprovedStep, LiveStep, AdManagementCard } from './steps/ApprovalStep';
import { AdChangeRequest, PendingChangeRequest } from './steps/AdChangeRequest';
import { AdHistory } from './AdHistory';
import {
    type Advertisement,
    type AdStatus,
    type UserProfile,
    normalizeAdStatus,
    AD_DIMENSIONS,
} from '@/lib/types';

interface CustomerWorkflowProps {
    userId: string;
    userProfile: UserProfile;
    advertisement: Advertisement | null;
    subscriptionId: string;
    isAdmin?: boolean;
    onRefresh?: () => void;
    allAdvertisements?: Advertisement[];  // All ads for this subscription (for history)
}

export function CustomerWorkflow({
    userId,
    userProfile,
    advertisement,
    subscriptionId,
    isAdmin = false,
    onRefresh,
    allAdvertisements = []
}: CustomerWorkflowProps) {
    const router = useRouter();
    const { firestore, storage, firebaseApp } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const status: AdStatus = advertisement?.status
        ? normalizeAdStatus(advertisement.status)
        : 'info_needed';

    // Check if there's a pending change request for this ad
    const pendingChangeRequest = allAdvertisements.find(
        ad => ad.parentAdId === advertisement?.id &&
            !['live', 'completed', 'canceled', 'archived'].includes(ad.status)
    );

    // Get auth token for API calls
    const getAuthToken = useCallback(async (): Promise<string> => {
        const auth = getAuth(firebaseApp);
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        return user.getIdToken();
    }, [firebaseApp]);

    // Handle change request created
    const handleChangeRequested = (newAdId: string, changeType: 'self_design' | 'team_design') => {
        toast({
            title: 'Change request created',
            description: changeType === 'self_design'
                ? 'You can now design your new ad.'
                : 'Our team will start working on your new design.',
        });
        onRefresh?.();
        // Navigate to the new ad if self-design
        if (changeType === 'self_design') {
            router.push('/design-ad');
        }
    };

    // Handle viewing pending change request
    const handleViewPendingRequest = () => {
        onRefresh?.();
    };

    // Handle business info submission
    const handleBusinessInfoSubmit = async (data: BusinessInfoFormData) => {
        if (!firestore) return;

        try {
            // Update user profile
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });

            // Update or create advertisement
            if (advertisement) {
                const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
                await updateDoc(adRef, {
                    ...data,
                    status: 'design_pending',
                    infoSubmittedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastActionBy: isAdmin ? 'admin' : 'customer',
                    lastActionAt: serverTimestamp(),
                });
            }

            toast({
                title: 'Business info saved',
                description: 'Now you can design your advertisement.',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error saving business info:', error);
            toast({
                title: 'Error',
                description: 'Failed to save business info. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handle logo upload
    const handleLogoUpload = async (file: File): Promise<string> => {
        if (!storage || !firestore) throw new Error('Storage not available');

        const filePath = `users/${userId}/logo/${file.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        // Update user profile with logo
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, { logoUrl: url, updatedAt: serverTimestamp() });

        return url;
    };

    // Handle image uploads
    const handleImageUpload = async (files: File[]): Promise<string[]> => {
        if (!storage) throw new Error('Storage not available');

        const uploadPromises = files.map(async (file) => {
            const filePath = `users/${userId}/uploads/${Date.now()}-${file.name}`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, file);
            return getDownloadURL(fileRef);
        });

        return Promise.all(uploadPromises);
    };

    // Handle design submission
    const handleDesignSubmit = async (data: {
        requestCustomDesign: boolean;
        adTitle?: string;
        adText?: string;
        logoUrl?: string;
        uploadedImages?: string[];
        customerSampleAdUrl?: string;
    }) => {
        if (!firestore || !advertisement) return;

        try {
            const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
            await updateDoc(adRef, {
                requestCustomDesign: data.requestCustomDesign,
                adTitle: data.adTitle || null,
                adText: data.adText || null,
                logoUrl: data.logoUrl || null,
                customerUploads: data.uploadedImages || null,
                customerSampleAdUrl: data.customerSampleAdUrl || null,
                status: 'in_review',
                designSubmittedAt: serverTimestamp(),
                sentForReviewAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActionBy: isAdmin ? 'admin' : 'customer',
                lastActionAt: serverTimestamp(),
            });

            toast({
                title: 'Design submitted',
                description: data.requestCustomDesign
                    ? 'Our team will create your custom ad design.'
                    : 'Your ad has been submitted for review.',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error submitting design:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit design. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handle approval
    const handleApprove = async () => {
        if (!firestore || !advertisement) return;

        try {
            const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
            await updateDoc(adRef, {
                status: 'approved',
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActionBy: isAdmin ? 'admin' : 'customer',
                lastActionAt: serverTimestamp(),
            });

            toast({
                title: 'Ad approved!',
                description: isAdmin
                    ? 'The ad is now ready to be published.'
                    : 'Your ad will be live soon!',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error approving ad:', error);
            toast({
                title: 'Error',
                description: 'Failed to approve ad. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handle revision request
    const handleRequestRevision = async (notes: string) => {
        if (!firestore || !advertisement) return;

        try {
            const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
            await updateDoc(adRef, {
                status: 'in_review',
                revisionNotes: notes,
                revisionCount: (advertisement.revisionCount || 0) + 1,
                updatedAt: serverTimestamp(),
                lastActionBy: isAdmin ? 'admin' : 'customer',
                lastActionAt: serverTimestamp(),
            });

            toast({
                title: 'Revision requested',
                description: 'We\'ll update your ad and send a new proof.',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error requesting revision:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit revision request. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handle pause ad
    const handlePauseAd = async () => {
        if (!firestore || !advertisement) return;

        try {
            const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
            await updateDoc(adRef, {
                status: 'paused',
                pausedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActionBy: isAdmin ? 'admin' : 'customer',
                lastActionAt: serverTimestamp(),
            });

            // Also pause the live ad if it exists
            if (advertisement.liveAdId) {
                const liveAdRef = doc(firestore, 'live_ads', advertisement.liveAdId);
                await updateDoc(liveAdRef, {
                    status: 'paused',
                    updatedAt: serverTimestamp(),
                });
            }

            toast({
                title: 'Ad paused',
                description: 'Your advertisement has been paused and will not be shown.',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error pausing ad:', error);
            toast({
                title: 'Error',
                description: 'Failed to pause ad. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handle resume ad
    const handleResumeAd = async () => {
        if (!firestore || !advertisement) return;

        try {
            const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
            await updateDoc(adRef, {
                status: 'live',
                resumedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActionBy: isAdmin ? 'admin' : 'customer',
                lastActionAt: serverTimestamp(),
            });

            // Also resume the live ad if it exists
            if (advertisement.liveAdId) {
                const liveAdRef = doc(firestore, 'live_ads', advertisement.liveAdId);
                await updateDoc(liveAdRef, {
                    status: 'active',
                    updatedAt: serverTimestamp(),
                });
            }

            toast({
                title: 'Ad resumed',
                description: 'Your advertisement is now live again.',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error resuming ad:', error);
            toast({
                title: 'Error',
                description: 'Failed to resume ad. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handle cancel ad
    const handleCancelAd = async () => {
        if (!firestore || !advertisement) return;

        try {
            const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
            await updateDoc(adRef, {
                status: 'canceled',
                canceledAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActionBy: isAdmin ? 'admin' : 'customer',
                lastActionAt: serverTimestamp(),
            });

            // Also archive the live ad if it exists
            if (advertisement.liveAdId) {
                const liveAdRef = doc(firestore, 'live_ads', advertisement.liveAdId);
                await updateDoc(liveAdRef, {
                    status: 'archived',
                    updatedAt: serverTimestamp(),
                });
            }

            toast({
                title: 'Ad canceled',
                description: 'Your advertisement has been canceled and will no longer be shown.',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error canceling ad:', error);
            toast({
                title: 'Error',
                description: 'Failed to cancel ad. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handle publish to ad manager (admin only)
    const handlePublish = async () => {
        if (!firestore || !advertisement) return;

        try {
            // Import the ad to live_ads collection
            const { addDoc, collection } = await import('firebase/firestore');

            const liveAdData = {
                name: `${advertisement.businessName} - ${advertisement.id.slice(0, 6)}`,
                description: `Advertisement for ${advertisement.businessName}`,
                imageUrl: advertisement.adProofUrl,
                targetUrl: advertisement.adProofDestinationUrl || advertisement.adWebsiteUrl || '',
                altText: `Advertisement for ${advertisement.businessName}`,
                placement: 'inline',
                width: AD_DIMENSIONS.WIDTH,
                height: AD_DIMENSIONS.HEIGHT,
                weight: 50,
                status: 'active',
                targetWebsites: [],
                startDate: null,
                endDate: null,
                sourceAdvertisementId: advertisement.id,
                customerId: userId,
                customerName: advertisement.businessName,
                impressions: 0,
                clicks: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const liveAdRef = await addDoc(collection(firestore, 'live_ads'), liveAdData);

            // Update the advertisement status to live
            const adRef = doc(firestore, 'users', userId, 'advertisements', advertisement.id);
            await updateDoc(adRef, {
                status: 'live',
                liveAdId: liveAdRef.id,
                publishedAt: serverTimestamp(),
                liveAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActionBy: 'admin',
                lastActionAt: serverTimestamp(),
            });

            // If this is a change request, archive the parent ad
            if (advertisement.isChangeRequest && advertisement.parentAdId) {
                const parentAdRef = doc(firestore, 'users', userId, 'advertisements', advertisement.parentAdId);
                await updateDoc(parentAdRef, {
                    status: 'archived',
                    archivedAt: serverTimestamp(),
                    replacedByAdId: advertisement.id,
                    updatedAt: serverTimestamp(),
                    notes: `Archived - replaced by ad ${advertisement.id}`,
                });

                // Also deactivate the parent's live ad if it exists
                const parentAd = allAdvertisements.find(ad => ad.id === advertisement.parentAdId);
                if (parentAd?.liveAdId) {
                    const parentLiveAdRef = doc(firestore, 'live_ads', parentAd.liveAdId);
                    await updateDoc(parentLiveAdRef, {
                        status: 'archived',
                        updatedAt: serverTimestamp(),
                    });
                }
            }

            toast({
                title: 'Ad published!',
                description: advertisement.isChangeRequest
                    ? 'The new ad is now live and the previous version has been archived.'
                    : 'The ad is now live on community websites.',
            });

            onRefresh?.();
        } catch (error) {
            console.error('Error publishing ad:', error);
            toast({
                title: 'Error',
                description: 'Failed to publish ad. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Render step based on status
    const renderStep = () => {
        switch (status) {
            case 'info_needed':
                return (
                    <BusinessInfoStep
                        defaultValues={{
                            businessName: userProfile.businessName || advertisement?.businessName,
                            contactName: userProfile.contactName || advertisement?.contactName,
                            contactTitle: userProfile.contactTitle || advertisement?.contactTitle,
                            email: userProfile.email || advertisement?.email,
                            cellPhone: userProfile.cellPhone || advertisement?.cellPhone,
                            businessPhone: userProfile.businessPhone || advertisement?.businessPhone,
                            adWebsiteUrl: userProfile.adWebsiteUrl || advertisement?.adWebsiteUrl,
                        }}
                        onSubmit={handleBusinessInfoSubmit}
                        isAdmin={isAdmin}
                    />
                );

            case 'design_pending':
                return (
                    <DesignStep
                        defaultValues={{
                            adTitle: advertisement?.adTitle,
                            adText: advertisement?.adText,
                            logoUrl: advertisement?.logoUrl || userProfile.logoUrl,
                            uploadedImages: advertisement?.customerUploads,
                            customerSampleAdUrl: advertisement?.customerSampleAdUrl,
                            requestCustomDesign: advertisement?.requestCustomDesign,
                        }}
                        onSubmit={handleDesignSubmit}
                        onLogoUpload={handleLogoUpload}
                        onImageUpload={handleImageUpload}
                        isAdmin={isAdmin}
                    />
                );

            case 'in_review':
                return (
                    <WaitingForReviewStep
                        requestCustomDesign={advertisement?.requestCustomDesign}
                        isAdmin={isAdmin}
                    />
                );

            case 'customer_approval':
                if (!advertisement?.adProofUrl) {
                    return (
                        <WaitingForReviewStep
                            requestCustomDesign={advertisement?.requestCustomDesign}
                            isAdmin={isAdmin}
                        />
                    );
                }
                return (
                    <ApprovalStep
                        adProofUrl={advertisement.adProofUrl}
                        adProofDestinationUrl={advertisement.adProofDestinationUrl}
                        sentForApprovalAt={advertisement.sentForApprovalAt}
                        autoApprovalAt={advertisement.autoApprovalAt}
                        revisionCount={advertisement.revisionCount}
                        onApprove={handleApprove}
                        onRequestRevision={handleRequestRevision}
                        isAdmin={isAdmin}
                    />
                );

            case 'approved':
                return (
                    <ApprovedStep
                        adProofUrl={advertisement?.adProofUrl}
                        liveAdId={advertisement?.liveAdId}
                        isAdmin={isAdmin}
                        onPublish={isAdmin ? handlePublish : undefined}
                    />
                );

            case 'live':
                return (
                    <div className="space-y-6">
                        <LiveStep
                            adProofUrl={advertisement?.adProofUrl}
                            impressions={advertisement?.impressions}
                            clicks={advertisement?.clicks}
                            isAdmin={isAdmin}
                        />

                        {/* Ad Management Card for customers */}
                        {advertisement && !isAdmin && (
                            <AdManagementCard
                                status="live"
                                onPause={handlePauseAd}
                                onCancel={handleCancelAd}
                                isAdmin={isAdmin}
                            />
                        )}

                        {/* Show pending change request or change request option */}
                        {advertisement && (
                            pendingChangeRequest ? (
                                <PendingChangeRequest
                                    pendingAd={pendingChangeRequest}
                                    onViewPending={handleViewPendingRequest}
                                />
                            ) : (
                                <AdChangeRequest
                                    advertisement={advertisement}
                                    userId={userId}
                                    onChangeRequested={handleChangeRequested}
                                    getAuthToken={getAuthToken}
                                    isAdmin={isAdmin}
                                />
                            )
                        )}
                    </div>
                );

            case 'paused':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-600">
                                    <Clock className="h-5 w-5" />
                                    Ad Paused
                                </CardTitle>
                                <CardDescription>
                                    This advertisement is currently paused and not being displayed.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        {/* Ad Management Card for customers */}
                        {advertisement && !isAdmin && (
                            <AdManagementCard
                                status="paused"
                                onResume={handleResumeAd}
                                onCancel={handleCancelAd}
                                isAdmin={isAdmin}
                            />
                        )}

                        {/* Show pending change request or change request option */}
                        {advertisement && (
                            pendingChangeRequest ? (
                                <PendingChangeRequest
                                    pendingAd={pendingChangeRequest}
                                    onViewPending={handleViewPendingRequest}
                                />
                            ) : (
                                <AdChangeRequest
                                    advertisement={advertisement}
                                    userId={userId}
                                    onChangeRequested={handleChangeRequested}
                                    getAuthToken={getAuthToken}
                                    isAdmin={isAdmin}
                                />
                            )
                        )}
                    </div>
                );

            case 'completed':
            case 'canceled':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                <AlertCircle className="h-5 w-5" />
                                {status === 'completed' ? 'Advertising Complete' : 'Subscription Canceled'}
                            </CardTitle>
                            <CardDescription>
                                {status === 'completed'
                                    ? 'Your advertising period has ended. Thank you for advertising with us!'
                                    : 'This subscription has been canceled.'}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                );

            case 'archived':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                <AlertCircle className="h-5 w-5" />
                                Archived Ad Version
                            </CardTitle>
                            <CardDescription>
                                This advertisement has been replaced by a newer version.
                                {advertisement?.replacedByAdId && ' Check Ad History for the current version.'}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                );

            default:
                return (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Unknown status: {status}</AlertDescription>
                    </Alert>
                );
        }
    };

    if (!advertisement && status === 'info_needed') {
        // First time user - no advertisement yet
        return (
            <div className="space-y-6">
                <WorkflowStatusBanner currentStatus={status} />
                <WorkflowProgress currentStatus={status} className="mb-8" />
                <BusinessInfoStep
                    defaultValues={{
                        businessName: userProfile.businessName,
                        contactName: userProfile.contactName,
                        contactTitle: userProfile.contactTitle,
                        email: userProfile.email,
                        cellPhone: userProfile.cellPhone,
                        businessPhone: userProfile.businessPhone,
                        adWebsiteUrl: userProfile.adWebsiteUrl,
                    }}
                    onSubmit={handleBusinessInfoSubmit}
                    isAdmin={isAdmin}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <WorkflowStatusBanner currentStatus={status} />
            <WorkflowProgress currentStatus={status} className="mb-8" />
            {renderStep()}

            {/* Show ad history if there are multiple versions */}
            {allAdvertisements.length > 1 && (
                <AdHistory
                    advertisements={allAdvertisements}
                    currentAdId={advertisement?.id}
                    isAdmin={isAdmin}
                />
            )}
        </div>
    );
}
