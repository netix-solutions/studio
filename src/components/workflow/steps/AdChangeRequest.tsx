'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Palette, Users, CheckCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Advertisement } from '@/lib/types';

interface AdChangeRequestProps {
    advertisement: Advertisement;
    userId: string;
    onChangeRequested: (newAdId: string, changeType: 'self_design' | 'team_design') => void;
    getAuthToken: () => Promise<string>;
    isAdmin?: boolean;
}

export function AdChangeRequest({
    advertisement,
    userId,
    onChangeRequested,
    getAuthToken,
    isAdmin = false
}: AdChangeRequestProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<'self_design' | 'team_design' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRequestChange = async () => {
        if (!selectedType) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const token = await getAuthToken();
            const response = await fetch('/api/ad-change-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId,
                    adId: advertisement.id,
                    changeRequestType: selectedType,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create change request');
            }

            setIsDialogOpen(false);
            onChangeRequested(data.data.newAdId, selectedType);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Card className="border-dashed">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <RefreshCw className="h-5 w-5" />
                        {isAdmin ? 'Request Ad Change for Customer' : 'Want to Update Your Ad?'}
                    </CardTitle>
                    <CardDescription>
                        {isAdmin
                            ? 'Create a new version of this ad. The current ad stays live until the new one is approved and published.'
                            : 'Request a change to your advertisement. Your current ad will stay live while the new one is being created.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setIsDialogOpen(true);
                            setSelectedType(null);
                            setError(null);
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Request Ad Change
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            Request Ad Change
                        </DialogTitle>
                        <DialogDescription>
                            Choose how you would like to create your new ad. Your current ad will remain live until the new one is approved and ready.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Option 1: Design yourself */}
                        <div
                            className={cn(
                                "p-4 border-2 rounded-lg transition-all cursor-pointer",
                                selectedType === 'self_design' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                            )}
                            onClick={() => setSelectedType('self_design')}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                                    selectedType === 'self_design' ? "border-primary bg-primary" : "border-muted-foreground"
                                )}>
                                    {selectedType === 'self_design' && <CheckCircle className="h-3 w-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Palette className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold">
                                            {isAdmin ? 'Customer Designs New Ad' : 'Design It Myself'}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs">Fastest</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {isAdmin
                                            ? 'Customer will use the ad designer to create a new ad.'
                                            : 'Use our visual ad designer to create your new ad instantly.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Option 2: Team design */}
                        <div
                            className={cn(
                                "p-4 border-2 rounded-lg transition-all cursor-pointer",
                                selectedType === 'team_design' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                            )}
                            onClick={() => setSelectedType('team_design')}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                                    selectedType === 'team_design' ? "border-primary bg-primary" : "border-muted-foreground"
                                )}>
                                    {selectedType === 'team_design' && <CheckCircle className="h-3 w-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold">
                                            {isAdmin ? 'Team Creates New Design' : 'Have Our Team Redesign'}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs">Professional</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {isAdmin
                                            ? 'Our design team will create a new ad for this customer.'
                                            : 'Our professional design team will create a new version based on your feedback.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                            <strong className="text-foreground">Note:</strong> Your current ad will continue running while the new one is being created. Once the new ad is approved and published, it will automatically replace the current one.
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRequestChange}
                            disabled={!selectedType || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * Component to show when there's an existing pending change request
 */
interface PendingChangeRequestProps {
    pendingAd: Advertisement;
    onViewPending: () => void;
}

export function PendingChangeRequest({ pendingAd, onViewPending }: PendingChangeRequestProps) {
    return (
        <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-700">
                    <RefreshCw className="h-5 w-5" />
                    Ad Change In Progress
                </CardTitle>
                <CardDescription className="text-amber-600">
                    You have a pending ad change request. Your current ad will remain live until the new one is ready.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div className="text-sm">
                    <span className="text-muted-foreground">Status: </span>
                    <Badge variant="outline" className="capitalize">
                        {pendingAd.status.replace('_', ' ')}
                    </Badge>
                </div>
                <Button variant="outline" onClick={onViewPending}>
                    View Progress
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardContent>
        </Card>
    );
}
