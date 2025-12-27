
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, Clock, ExternalLink, ArrowLeft, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { sendEmail } from '@/lib/firebase/email';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_DIMENSIONS,
    calculateAutoApprovalDeadline,
    type AdStatus,
    type Advertisement
} from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export default function ApproveAdPage() {
    const params = useParams();
    const router = useRouter();
    const { id: adId } = params;
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);
    const [revisionNotes, setRevisionNotes] = useState('');
    const [showRevisionDialog, setShowRevisionDialog] = useState(false);
    const [approvalComplete, setApprovalComplete] = useState(false);

    useEffect(() => {
        if (!firestore || !user || typeof adId !== 'string') {
            if (!user) {
                setError("Please log in to view your advertisement proof.");
            }
            setLoading(false);
            return;
        }

        const fetchAd = async () => {
            try {
                setLoading(true);

                // Look for the ad in the user's advertisements collection
                const adDocRef = doc(firestore, 'users', user.uid, 'advertisements', adId);
                const adDocSnap = await getDoc(adDocRef);

                if (!adDocSnap.exists()) {
                    throw new Error("Advertisement not found. Please check that you're logged in with the correct account.");
                }

                const adData = adDocSnap.data();
                const fullAd: Advertisement = {
                    id: adDocSnap.id,
                    userId: adData.userId || user.uid,
                    subscriptionId: adData.subscriptionId || '',
                    status: adData.status || 'pending_customer_approval',
                    adProofUrl: adData.adProofUrl,
                    adProofDestinationUrl: adData.adProofDestinationUrl,
                    businessName: adData.businessName,
                    contactName: adData.contactName,
                    email: adData.email,
                    sentForApprovalAt: adData.sentForApprovalAt,
                    autoApprovalAt: adData.autoApprovalAt,
                    approvedAt: adData.approvedAt,
                    liveAt: adData.liveAt,
                    revisionCount: adData.revisionCount || 0,
                    createdAt: adData.createdAt,
                    updatedAt: adData.updatedAt,
                };

                setAdvertisement(fullAd);
            } catch (err: any) {
                console.error("Error fetching ad:", err);
                setError(err.message || "Failed to load advertisement.");
            } finally {
                setLoading(false);
            }
        };

        fetchAd();
    }, [firestore, user, adId]);

    const handleApprove = async () => {
        if (!firestore || !user || !advertisement) return;

        setIsApproving(true);
        try {
            const adDocRef = doc(firestore, 'users', user.uid, 'advertisements', advertisement.id);
            await updateDoc(adDocRef, {
                status: 'approved',
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setAdvertisement(prev => prev ? { ...prev, status: 'approved' } : null);
            setApprovalComplete(true);

            toast({
                title: "Advertisement Approved!",
                description: "Thank you! Your advertisement will go live shortly.",
            });
        } catch (error: any) {
            console.error("Error approving:", error);
            toast({
                title: "Approval Failed",
                description: error.message || "Could not approve the advertisement. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsApproving(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!firestore || !user || !advertisement || !revisionNotes.trim()) {
            toast({
                title: "Notes Required",
                description: "Please describe what changes you'd like made to your ad.",
                variant: "destructive",
            });
            return;
        }

        setIsRequestingRevision(true);
        try {
            const adDocRef = doc(firestore, 'users', user.uid, 'advertisements', advertisement.id);
            await updateDoc(adDocRef, {
                status: 'revision_requested',
                revisionNotes: revisionNotes,
                revisionCount: (advertisement.revisionCount || 0) + 1,
                updatedAt: serverTimestamp(),
            });

            // Send notification email to admin
            const subject = `Revision Requested - ${advertisement.businessName}`;
            const html = `
                <p>A customer has requested revisions to their advertisement.</p>
                <p><strong>Business:</strong> ${advertisement.businessName}</p>
                <p><strong>Contact:</strong> ${advertisement.contactName} (${advertisement.email})</p>
                <p><strong>Revision Notes:</strong></p>
                <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #ccc; margin: 10px 0;">
                    ${revisionNotes.replace(/\n/g, '<br/>')}
                </blockquote>
                <p>Please review and make the necessary changes.</p>
            `;

            // Note: In production, this would go to an admin email
            await sendEmail(firestore, {
                to: 'admin@community-websites.com', // Replace with actual admin email
                subject,
                html
            }, {
                recipientId: 'admin',
                templateId: 'revision_requested',
                triggerType: 'customer_action',
            });

            setAdvertisement(prev => prev ? { ...prev, status: 'revision_requested' } : null);
            setShowRevisionDialog(false);

            toast({
                title: "Revision Requested",
                description: "We've received your feedback and will update your ad shortly.",
            });
        } catch (error: any) {
            console.error("Error requesting revision:", error);
            toast({
                title: "Request Failed",
                description: error.message || "Could not submit your revision request. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsRequestingRevision(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading your advertisement...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="mt-6 text-center">
                    <Link href="/account">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go to My Account
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!advertisement) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Found</AlertTitle>
                    <AlertDescription>Advertisement not found.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // Already approved
    if (advertisement.status === 'approved' || advertisement.status === 'live' || approvalComplete) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-green-700 text-2xl">Advertisement Approved!</CardTitle>
                        <CardDescription className="text-green-600">
                            {advertisement.status === 'live'
                                ? "Your advertisement is now live on our community websites."
                                : "Thank you! Your advertisement will go live shortly."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border rounded-lg p-4 bg-white">
                            {advertisement.adProofUrl && (
                                <Image
                                    src={advertisement.adProofUrl}
                                    alt="Your approved advertisement"
                                    width={AD_DIMENSIONS.WIDTH}
                                    height={AD_DIMENSIONS.HEIGHT}
                                    className="mx-auto border rounded"
                                />
                            )}
                            {advertisement.adProofDestinationUrl && (
                                <p className="text-sm text-center mt-4 text-muted-foreground">
                                    Links to: <a href={advertisement.adProofDestinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{advertisement.adProofDestinationUrl}</a>
                                </p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Link href="/account">
                            <Button>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to My Account
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Revision requested
    if (advertisement.status === 'revision_requested') {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="h-10 w-10 text-amber-600" />
                        </div>
                        <CardTitle className="text-amber-700 text-2xl">Revision Requested</CardTitle>
                        <CardDescription className="text-amber-600">
                            We've received your feedback. Our team will make the necessary changes and send you a new proof.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-white border rounded-lg p-4">
                            <p className="text-sm text-muted-foreground mb-2">Your revision notes:</p>
                            <p className="whitespace-pre-wrap">{advertisement.revisionNotes}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Link href="/account">
                            <Button>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to My Account
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Pending approval
    const autoApprovalDeadline = advertisement.sentForApprovalAt
        ? calculateAutoApprovalDeadline(advertisement.sentForApprovalAt)
        : null;

    return (
        <div className="max-w-3xl mx-auto py-4 md:py-8 space-y-4 md:space-y-6 px-4 md:px-0">
            <div className="text-center mb-4 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Review Your Advertisement</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    Please review the ad proof below and let us know if you're happy with it.
                </p>
            </div>

            {/* Auto-approval warning */}
            {autoApprovalDeadline && (
                <Alert className="border-amber-300 bg-amber-50">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Approval Deadline</AlertTitle>
                    <AlertDescription className="text-amber-700">
                        This ad will be automatically approved {formatDistanceToNow(autoApprovalDeadline, { addSuffix: true })} if no action is taken.
                        Please review and respond before {format(autoApprovalDeadline, 'PPP p')}.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                            <CardTitle className="text-lg md:text-xl">{advertisement.businessName}</CardTitle>
                            <CardDescription>Advertisement Proof</CardDescription>
                        </div>
                        <Badge variant="default" className="w-fit">Awaiting Your Approval</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Ad Preview */}
                    <div className="border-2 rounded-lg p-6 bg-muted/30">
                        <div className="text-center mb-4">
                            <h3 className="text-lg font-medium">Your Ad Preview</h3>
                            <p className="text-sm text-muted-foreground">
                                This is how your ad will appear on our community websites.
                            </p>
                        </div>
                        {advertisement.adProofUrl ? (
                            <div className="flex justify-center">
                                <Image
                                    src={advertisement.adProofUrl}
                                    alt="Your advertisement proof"
                                    width={AD_DIMENSIONS.WIDTH}
                                    height={AD_DIMENSIONS.HEIGHT}
                                    className="border rounded shadow-sm"
                                />
                            </div>
                        ) : (
                            <div className="h-[200px] bg-muted rounded flex items-center justify-center">
                                <p className="text-muted-foreground">No preview available</p>
                            </div>
                        )}
                    </div>

                    {/* Destination URL */}
                    {advertisement.adProofDestinationUrl && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium mb-1">When clicked, your ad will link to:</p>
                            <a
                                href={advertisement.adProofDestinationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                            >
                                {advertisement.adProofDestinationUrl}
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button
                            size="lg"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={handleApprove}
                            disabled={isApproving}
                        >
                            {isApproving ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <ThumbsUp className="mr-2 h-5 w-5" />
                                    Approve & Go Live
                                </>
                            )}
                        </Button>

                        <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
                            <DialogTrigger asChild>
                                <Button size="lg" variant="outline" className="flex-1">
                                    <MessageSquare className="mr-2 h-5 w-5" />
                                    Request Changes
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Request Revisions</DialogTitle>
                                    <DialogDescription>
                                        Please describe what changes you'd like us to make to your advertisement.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="revision-notes">What would you like changed?</Label>
                                    <Textarea
                                        id="revision-notes"
                                        placeholder="e.g., Please change the background color to blue, or update the phone number to..."
                                        value={revisionNotes}
                                        onChange={(e) => setRevisionNotes(e.target.value)}
                                        className="mt-2 min-h-[120px]"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleRequestRevision}
                                        disabled={isRequestingRevision || !revisionNotes.trim()}
                                    >
                                        {isRequestingRevision ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            'Submit Request'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <p className="text-sm text-center text-muted-foreground">
                        By approving, you confirm that your advertisement is ready to go live on our community websites.
                    </p>
                </CardContent>
            </Card>

            {/* Back Link */}
            <div className="text-center">
                <Link href="/account">
                    <Button variant="ghost">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to My Account
                    </Button>
                </Link>
            </div>
        </div>
    );
}
