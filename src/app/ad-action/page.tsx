'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle, Clock, ExternalLink, ThumbsUp, MessageSquare, Eye, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';

interface AdInfo {
    id: string;
    businessName: string;
    contactName: string;
    adProofUrl: string;
    adProofDestinationUrl: string;
    status: string;
    sentForApprovalAt: string | null;
    autoApprovalAt: string | null;
}

type ActionType = 'approve' | 'request_changes' | 'view';
type PageState = 'loading' | 'ready' | 'processing' | 'success' | 'error' | 'already_processed';

export default function AdActionPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [pageState, setPageState] = useState<PageState>('loading');
    const [action, setAction] = useState<ActionType | null>(null);
    const [ad, setAd] = useState<AdInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [revisionNotes, setRevisionNotes] = useState('');

    // Fetch ad info on mount
    useEffect(() => {
        if (!token) {
            setError('No token provided. Please use the link from your email.');
            setPageState('error');
            return;
        }

        const fetchAdInfo = async () => {
            try {
                const response = await fetch(`/api/ad-action?token=${encodeURIComponent(token)}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load advertisement');
                }

                setAction(data.action);
                setAd(data.ad);

                // Check if already processed
                if (data.ad.status === 'approved' || data.ad.status === 'live') {
                    setPageState('already_processed');
                } else if (data.action === 'approve') {
                    // Auto-approve when the approve link is clicked
                    handleApprove();
                } else {
                    setPageState('ready');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load advertisement');
                setPageState('error');
            }
        };

        fetchAdInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleApprove = async () => {
        setPageState('processing');
        try {
            const response = await fetch('/api/ad-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'approve' }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to approve advertisement');
            }

            if (data.alreadyProcessed) {
                setPageState('already_processed');
            } else {
                setSuccessMessage(data.message);
                setPageState('success');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to approve advertisement');
            setPageState('error');
        }
    };

    const handleRequestChanges = async () => {
        if (!revisionNotes.trim()) {
            setError('Please describe what changes you would like.');
            return;
        }

        setPageState('processing');
        try {
            const response = await fetch('/api/ad-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    action: 'request_changes',
                    revisionNotes: revisionNotes.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit revision request');
            }

            setSuccessMessage(data.message);
            setPageState('success');
        } catch (err: any) {
            setError(err.message || 'Failed to submit revision request');
            setPageState('error');
        }
    };

    // Loading state
    if (pageState === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading your advertisement...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (pageState === 'error') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <CardTitle className="text-center text-red-700">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <p className="text-center text-muted-foreground mt-4 text-sm">
                            If this problem persists, please contact us at{' '}
                            <a href="mailto:email@community-websites.com" className="text-primary hover:underline">
                                email@community-websites.com
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state
    if (pageState === 'success') {
        const isApproval = action === 'approve';
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className={`max-w-lg w-full ${isApproval ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
                    <CardHeader className="text-center">
                        <div className={`mx-auto w-20 h-20 ${isApproval ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mb-4`}>
                            {isApproval ? (
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            ) : (
                                <MessageSquare className="h-12 w-12 text-blue-600" />
                            )}
                        </div>
                        <CardTitle className={`text-2xl ${isApproval ? 'text-green-700' : 'text-blue-700'}`}>
                            {isApproval ? 'Advertisement Approved!' : 'Revision Request Submitted'}
                        </CardTitle>
                        <CardDescription className={isApproval ? 'text-green-600' : 'text-blue-600'}>
                            {successMessage}
                        </CardDescription>
                    </CardHeader>
                    {ad?.adProofUrl && isApproval && (
                        <CardContent>
                            <div className="border rounded-lg p-4 bg-white">
                                <Image
                                    src={ad.adProofUrl}
                                    alt="Your approved advertisement"
                                    width={600}
                                    height={200}
                                    className="mx-auto rounded"
                                />
                            </div>
                        </CardContent>
                    )}
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground text-center">
                            You can close this window. We&apos;ll be in touch if we need anything else.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Already processed state
    if (pageState === 'already_processed') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-lg w-full border-green-200 bg-green-50">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl text-green-700">Already Approved!</CardTitle>
                        <CardDescription className="text-green-600">
                            {ad?.status === 'live'
                                ? 'Your advertisement is already live on our community websites.'
                                : 'This advertisement has already been approved and will go live shortly.'}
                        </CardDescription>
                    </CardHeader>
                    {ad?.adProofUrl && (
                        <CardContent>
                            <div className="border rounded-lg p-4 bg-white">
                                <Image
                                    src={ad.adProofUrl}
                                    alt="Your advertisement"
                                    width={600}
                                    height={200}
                                    className="mx-auto rounded"
                                />
                            </div>
                        </CardContent>
                    )}
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            You can close this window.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Processing state
    if (pageState === 'processing') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        {action === 'approve' ? 'Approving your advertisement...' : 'Submitting your request...'}
                    </p>
                </div>
            </div>
        );
    }

    // Ready state - show the ad and action options
    const autoApprovalDate = ad?.autoApprovalAt ? new Date(ad.autoApprovalAt) : null;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">
                        {action === 'view' ? 'View Your Advertisement' : 'Request Changes'}
                    </h1>
                    <p className="text-muted-foreground">
                        {action === 'view'
                            ? 'Review your advertisement proof below.'
                            : 'Let us know what changes you would like to your ad.'}
                    </p>
                </div>

                {/* Auto-approval warning */}
                {autoApprovalDate && action !== 'view' && (
                    <Alert className="border-amber-300 bg-amber-50">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Approval Deadline</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            This ad will be automatically approved{' '}
                            {formatDistanceToNow(autoApprovalDate, { addSuffix: true })} if no action is taken.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Ad Preview Card */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{ad?.businessName || 'Your Advertisement'}</CardTitle>
                                <CardDescription>Advertisement Proof</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Ad Image */}
                        {ad?.adProofUrl ? (
                            <div className="border-2 rounded-lg p-6 bg-muted/30">
                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-medium">Your Ad Preview</h3>
                                    <p className="text-sm text-muted-foreground">
                                        This is how your ad will appear on our community websites.
                                    </p>
                                </div>
                                <div className="flex justify-center">
                                    <Image
                                        src={ad.adProofUrl}
                                        alt="Your advertisement proof"
                                        width={600}
                                        height={200}
                                        className="border rounded shadow-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-[200px] bg-muted rounded flex items-center justify-center">
                                <p className="text-muted-foreground">No preview available</p>
                            </div>
                        )}

                        {/* Destination URL */}
                        {ad?.adProofDestinationUrl && (
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium mb-1">When clicked, your ad will link to:</p>
                                <a
                                    href={ad.adProofDestinationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                >
                                    {ad.adProofDestinationUrl}
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        )}

                        {/* Request Changes Form */}
                        {action === 'request_changes' && (
                            <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <Label htmlFor="revision-notes" className="text-base font-medium">
                                        What changes would you like?
                                    </Label>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Please describe the changes you&apos;d like us to make to your advertisement.
                                    </p>
                                    <Textarea
                                        id="revision-notes"
                                        placeholder="e.g., Please change the background color to blue, update the phone number to..."
                                        value={revisionNotes}
                                        onChange={(e) => setRevisionNotes(e.target.value)}
                                        className="min-h-[120px]"
                                    />
                                </div>

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        size="lg"
                                        className="flex-1"
                                        onClick={handleRequestChanges}
                                        disabled={!revisionNotes.trim()}
                                    >
                                        <MessageSquare className="mr-2 h-5 w-5" />
                                        Submit Revision Request
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="flex-1 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                        onClick={handleApprove}
                                    >
                                        <ThumbsUp className="mr-2 h-5 w-5" />
                                        Actually, Approve It!
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* View mode actions */}
                        {action === 'view' && (
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                                <Button
                                    size="lg"
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={handleApprove}
                                >
                                    <ThumbsUp className="mr-2 h-5 w-5" />
                                    Approve & Go Live
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setAction('request_changes')}
                                >
                                    <MessageSquare className="mr-2 h-5 w-5" />
                                    Request Changes
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contact info */}
                <div className="text-center text-sm text-muted-foreground">
                    <p>
                        Questions? Contact us at{' '}
                        <a href="mailto:email@community-websites.com" className="text-primary hover:underline">
                            email@community-websites.com
                        </a>{' '}
                        or call{' '}
                        <a href="tel:813-544-8383" className="text-primary hover:underline">
                            813-544-8383
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
