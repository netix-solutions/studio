'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, ArrowRight, Clock, ThumbsUp, MessageSquare, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { format, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { AD_DIMENSIONS } from '@/lib/types';

interface ApprovalStepProps {
    adProofUrl: string;
    adProofDestinationUrl?: string;
    sentForApprovalAt?: Date | { toDate: () => Date };
    autoApprovalAt?: Date | { toDate: () => Date };
    revisionCount?: number;
    onApprove: () => Promise<void>;
    onRequestRevision: (notes: string) => Promise<void>;
    isAdmin?: boolean;
}

export function ApprovalStep({
    adProofUrl,
    adProofDestinationUrl,
    sentForApprovalAt,
    autoApprovalAt,
    revisionCount = 0,
    onApprove,
    onRequestRevision,
    isAdmin
}: ApprovalStepProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);
    const [showRevisionForm, setShowRevisionForm] = useState(false);
    const [revisionNotes, setRevisionNotes] = useState('');

    const sentAt = sentForApprovalAt
        ? (sentForApprovalAt as { toDate?: () => Date }).toDate?.() ?? new Date(sentForApprovalAt as Date)
        : null;

    const autoAt = autoApprovalAt
        ? (autoApprovalAt as { toDate?: () => Date }).toDate?.() ?? new Date(autoApprovalAt as Date)
        : null;

    const hoursRemaining = autoAt ? differenceInHours(autoAt, new Date()) : null;
    const isNearAutoApproval = hoursRemaining !== null && hoursRemaining <= 12 && hoursRemaining > 0;

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            await onApprove();
        } finally {
            setIsApproving(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!revisionNotes.trim()) return;
        setIsRequestingRevision(true);
        try {
            await onRequestRevision(revisionNotes);
            setRevisionNotes('');
            setShowRevisionForm(false);
        } finally {
            setIsRequestingRevision(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {isAdmin ? 'Customer Ad Proof Review' : 'Review Your Advertisement'}
                </CardTitle>
                <CardDescription>
                    {isAdmin
                        ? 'This ad proof is awaiting customer approval.'
                        : 'Please review your ad proof below and approve it or request changes.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Auto-approval notice */}
                {hoursRemaining !== null && hoursRemaining > 0 && (
                    <Alert variant={isNearAutoApproval ? "default" : "default"}>
                        <Clock className={cn("h-4 w-4", isNearAutoApproval && "text-amber-500")} />
                        <AlertTitle>Auto-Approval Notice</AlertTitle>
                        <AlertDescription>
                            {isNearAutoApproval
                                ? `This ad will be auto-approved in ${hoursRemaining} hours if no action is taken.`
                                : `This ad will be auto-approved in ${Math.ceil(hoursRemaining)} hours if not reviewed.`}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Revision count notice */}
                {revisionCount > 0 && (
                    <Alert>
                        <MessageSquare className="h-4 w-4" />
                        <AlertTitle>Updated Proof</AlertTitle>
                        <AlertDescription>
                            {isAdmin
                                ? `This proof includes changes from ${revisionCount} revision request${revisionCount > 1 ? 's' : ''}.`
                                : `This proof has been updated based on your feedback. (${revisionCount} revision${revisionCount > 1 ? 's' : ''} made)`}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Ad proof display */}
                <div className="space-y-4">
                    <Label>Ad Preview ({AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT})</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 bg-muted/30">
                        <Image
                            src={adProofUrl}
                            alt="Ad Proof"
                            width={AD_DIMENSIONS.WIDTH}
                            height={AD_DIMENSIONS.HEIGHT}
                            className="mx-auto border rounded shadow-sm"
                        />
                    </div>
                </div>

                {/* Destination URL */}
                {adProofDestinationUrl && (
                    <div className="space-y-2">
                        <Label>Clicking the ad will go to:</Label>
                        <div className="p-3 bg-muted rounded-lg">
                            <a
                                href={adProofDestinationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all"
                            >
                                {adProofDestinationUrl}
                            </a>
                        </div>
                    </div>
                )}

                {/* Sent date */}
                {sentAt && (
                    <p className="text-sm text-muted-foreground">
                        Proof sent on {format(sentAt, 'MMMM d, yyyy \'at\' h:mm a')}
                    </p>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                {!showRevisionForm ? (
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={() => setShowRevisionForm(true)}
                            className="flex-1"
                            disabled={isApproving}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Request Changes
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={isApproving}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            size="lg"
                        >
                            {isApproving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <ThumbsUp className="mr-2 h-4 w-4" />
                                    Approve Ad
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="w-full space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="revisionNotes">What changes would you like?</Label>
                            <Textarea
                                id="revisionNotes"
                                value={revisionNotes}
                                onChange={(e) => setRevisionNotes(e.target.value)}
                                placeholder="Please describe the changes you'd like..."
                                rows={4}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowRevisionForm(false);
                                    setRevisionNotes('');
                                }}
                                disabled={isRequestingRevision}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRequestRevision}
                                disabled={isRequestingRevision || !revisionNotes.trim()}
                                className="flex-1"
                            >
                                {isRequestingRevision ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Submit Revision Request
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}

interface WaitingForReviewStepProps {
    requestCustomDesign?: boolean;
    isAdmin?: boolean;
}

export function WaitingForReviewStep({ requestCustomDesign, isAdmin }: WaitingForReviewStepProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {isAdmin ? 'Ad Pending Your Action' : 'We\'re Working on Your Ad'}
                </CardTitle>
                <CardDescription>
                    {isAdmin
                        ? 'This ad is awaiting admin review and creation.'
                        : requestCustomDesign
                            ? 'Our design team is creating your custom advertisement.'
                            : 'We\'re reviewing your submission and preparing your ad.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <p className="text-muted-foreground">
                    {isAdmin
                        ? 'Use the admin panel to upload an ad proof when ready.'
                        : 'We\'ll notify you by email when your ad proof is ready for review.'}
                </p>
            </CardContent>
        </Card>
    );
}

interface ApprovedStepProps {
    adProofUrl?: string;
    liveAdId?: string;
    isAdmin?: boolean;
    onPublish?: () => Promise<void>;
}

export function ApprovedStep({ adProofUrl, liveAdId, isAdmin, onPublish }: ApprovedStepProps) {
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        if (!onPublish) return;
        setIsPublishing(true);
        try {
            await onPublish();
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    {isAdmin ? 'Ad Approved - Ready to Publish' : 'Your Ad is Approved!'}
                </CardTitle>
                <CardDescription>
                    {isAdmin
                        ? 'This ad has been approved and is ready to be published to the Ad Manager.'
                        : 'Great news! Your ad has been approved and will go live soon.'}
                </CardDescription>
            </CardHeader>
            {adProofUrl && (
                <CardContent className="space-y-4">
                    <Label>Approved Ad:</Label>
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <Image
                            src={adProofUrl}
                            alt="Approved Ad"
                            width={AD_DIMENSIONS.WIDTH}
                            height={AD_DIMENSIONS.HEIGHT}
                            className="mx-auto border rounded shadow-sm"
                        />
                    </div>
                </CardContent>
            )}
            {isAdmin && onPublish && !liveAdId && (
                <CardFooter>
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="lg"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Publishing...
                            </>
                        ) : (
                            <>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Publish to Ad Manager
                            </>
                        )}
                    </Button>
                </CardFooter>
            )}
            {liveAdId && (
                <CardFooter>
                    <Alert>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription>
                            This ad has been published to the Ad Manager (ID: {liveAdId})
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            )}
        </Card>
    );
}

interface LiveStepProps {
    adProofUrl?: string;
    impressions?: number;
    clicks?: number;
    isAdmin?: boolean;
    onPause?: () => Promise<void>;
}

export function LiveStep({ adProofUrl, impressions = 0, clicks = 0, isAdmin, onPause }: LiveStepProps) {
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    {isAdmin ? 'Ad is Live' : 'Your Ad is Live!'}
                </CardTitle>
                <CardDescription>
                    {isAdmin
                        ? 'This advertisement is currently active on community websites.'
                        : 'Your advertisement is now showing on our community websites!'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {adProofUrl && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <Image
                            src={adProofUrl}
                            alt="Live Ad"
                            width={AD_DIMENSIONS.WIDTH}
                            height={AD_DIMENSIONS.HEIGHT}
                            className="mx-auto border rounded shadow-sm"
                        />
                    </div>
                )}

                {/* Performance Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold">{impressions.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Impressions</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold">{clicks.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Clicks</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold">{ctr}%</p>
                        <p className="text-sm text-muted-foreground">CTR</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Ad Management Card for customers to pause/cancel their ad
interface AdManagementCardProps {
    status: 'live' | 'paused';
    onPause?: () => Promise<void>;
    onResume?: () => Promise<void>;
    onCancel?: () => Promise<void>;
    isAdmin?: boolean;
}

export function AdManagementCard({ status, onPause, onResume, onCancel, isAdmin }: AdManagementCardProps) {
    const [isPausing, setIsPausing] = useState(false);
    const [isResuming, setIsResuming] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const handlePause = async () => {
        if (!onPause) return;
        setIsPausing(true);
        try {
            await onPause();
        } finally {
            setIsPausing(false);
        }
    };

    const handleResume = async () => {
        if (!onResume) return;
        setIsResuming(true);
        try {
            await onResume();
        } finally {
            setIsResuming(false);
        }
    };

    const handleCancel = async () => {
        if (!onCancel) return;
        setIsCanceling(true);
        try {
            await onCancel();
            setShowCancelConfirm(false);
        } finally {
            setIsCanceling(false);
        }
    };

    // Don't show for admins - they have different controls
    if (isAdmin) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Ad Management</CardTitle>
                <CardDescription>
                    Control your advertisement display
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!showCancelConfirm ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                        {status === 'live' && onPause && (
                            <Button
                                variant="outline"
                                onClick={handlePause}
                                disabled={isPausing}
                                className="flex-1"
                            >
                                {isPausing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Pausing...
                                    </>
                                ) : (
                                    <>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Pause Ad
                                    </>
                                )}
                            </Button>
                        )}
                        {status === 'paused' && onResume && (
                            <Button
                                variant="default"
                                onClick={handleResume}
                                disabled={isResuming}
                                className="flex-1"
                            >
                                {isResuming ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resuming...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Resume Ad
                                    </>
                                )}
                            </Button>
                        )}
                        {onCancel && (
                            <Button
                                variant="destructive"
                                onClick={() => setShowCancelConfirm(true)}
                                className="flex-1"
                            >
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Cancel Ad
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Are you sure?</AlertTitle>
                            <AlertDescription>
                                Canceling your ad will stop it from being displayed. This action cannot be undone.
                                Your subscription will remain active - contact support to cancel your subscription.
                            </AlertDescription>
                        </Alert>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowCancelConfirm(false)}
                                disabled={isCanceling}
                                className="flex-1"
                            >
                                Go Back
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleCancel}
                                disabled={isCanceling}
                                className="flex-1"
                            >
                                {isCanceling ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Canceling...
                                    </>
                                ) : (
                                    'Yes, Cancel My Ad'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
