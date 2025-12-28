'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { History, ChevronDown, ChevronRight, Eye, Calendar, Archive, CheckCircle2, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AD_DIMENSIONS, AD_STATUS_LABELS, AD_PIPELINE_STAGE_COLORS, type Advertisement } from '@/lib/types';

interface AdHistoryProps {
    advertisements: Advertisement[];
    currentAdId?: string;
    isAdmin?: boolean;
    onSelectAd?: (ad: Advertisement) => void;
}

export function AdHistory({ advertisements, currentAdId, isAdmin = false, onSelectAd }: AdHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);

    // Sort ads by created date, newest first
    const sortedAds = [...advertisements].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });

    // Group ads: current/active and archived
    const activeAds = sortedAds.filter(ad => ad.status !== 'archived');
    const archivedAds = sortedAds.filter(ad => ad.status === 'archived');

    const formatDate = (date: any) => {
        if (!date) return 'Unknown';
        const d = date.toDate?.() || new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'live':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'archived':
                return <Archive className="h-4 w-4 text-gray-500" />;
            case 'in_review':
            case 'customer_approval':
            case 'approved':
                return <Clock className="h-4 w-4 text-amber-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    if (sortedAds.length <= 1 && !archivedAds.length) {
        return null; // Don't show history if there's only one ad and no archived ones
    }

    return (
        <>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <Card>
                    <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-muted-foreground" />
                                    <CardTitle className="text-base">Ad History</CardTitle>
                                    <Badge variant="secondary" className="ml-2">
                                        {sortedAds.length} version{sortedAds.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                                {isOpen ? (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                            <CardDescription className="text-left">
                                View all versions of your advertisement
                            </CardDescription>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="pt-0">
                            <div className="space-y-4">
                                {/* Active Ads */}
                                {activeAds.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-muted-foreground">Active</h4>
                                        {activeAds.map((ad) => (
                                            <AdHistoryItem
                                                key={ad.id}
                                                ad={ad}
                                                isCurrent={ad.id === currentAdId}
                                                formatDate={formatDate}
                                                getStatusIcon={getStatusIcon}
                                                onView={() => setSelectedAd(ad)}
                                                onSelect={onSelectAd ? () => onSelectAd(ad) : undefined}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Archived Ads */}
                                {archivedAds.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Archive className="h-4 w-4" />
                                            Archived Versions
                                        </h4>
                                        {archivedAds.map((ad) => (
                                            <AdHistoryItem
                                                key={ad.id}
                                                ad={ad}
                                                isCurrent={false}
                                                formatDate={formatDate}
                                                getStatusIcon={getStatusIcon}
                                                onView={() => setSelectedAd(ad)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Ad Preview Dialog */}
            <Dialog open={!!selectedAd} onOpenChange={() => setSelectedAd(null)}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            {selectedAd?.status === 'archived' ? 'Archived Ad Version' : 'Ad Preview'}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedAd && (
                        <div className="space-y-4">
                            {/* Status and dates */}
                            <div className="flex items-center gap-4 text-sm">
                                <Badge
                                    className={cn(
                                        AD_PIPELINE_STAGE_COLORS[selectedAd.status]?.bg,
                                        AD_PIPELINE_STAGE_COLORS[selectedAd.status]?.text,
                                        'border',
                                        AD_PIPELINE_STAGE_COLORS[selectedAd.status]?.border
                                    )}
                                    variant="outline"
                                >
                                    {AD_STATUS_LABELS[selectedAd.status]}
                                </Badge>
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Created: {formatDate(selectedAd.createdAt)}
                                </span>
                                {selectedAd.archivedAt && (
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Archive className="h-4 w-4" />
                                        Archived: {formatDate(selectedAd.archivedAt)}
                                    </span>
                                )}
                            </div>

                            {/* Change request info */}
                            {selectedAd.isChangeRequest && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                    <RefreshCw className="h-4 w-4" />
                                    This was a change request ({selectedAd.changeRequestType === 'self_design' ? 'self-designed' : 'team-designed'})
                                </div>
                            )}

                            {/* Replacement info */}
                            {selectedAd.replacedByAdId && (
                                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                    <RefreshCw className="h-4 w-4" />
                                    This ad was replaced by a newer version
                                </div>
                            )}

                            {/* Ad Image */}
                            {selectedAd.adProofUrl ? (
                                <div className="border rounded-lg overflow-hidden">
                                    <Image
                                        src={selectedAd.adProofUrl}
                                        alt="Ad proof"
                                        width={AD_DIMENSIONS.WIDTH}
                                        height={AD_DIMENSIONS.HEIGHT}
                                        className="w-full"
                                    />
                                </div>
                            ) : selectedAd.customerSampleAdUrl ? (
                                <div className="border rounded-lg overflow-hidden">
                                    <Image
                                        src={selectedAd.customerSampleAdUrl}
                                        alt="Customer designed ad"
                                        width={AD_DIMENSIONS.WIDTH}
                                        height={AD_DIMENSIONS.HEIGHT}
                                        className="w-full"
                                    />
                                </div>
                            ) : (
                                <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted/50">
                                    No ad image available
                                </div>
                            )}

                            {/* Destination URL */}
                            {(selectedAd.adProofDestinationUrl || selectedAd.adWebsiteUrl) && (
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Destination: </span>
                                    <a
                                        href={selectedAd.adProofDestinationUrl || selectedAd.adWebsiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        {selectedAd.adProofDestinationUrl || selectedAd.adWebsiteUrl}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}

                            {/* Performance stats if available */}
                            {(selectedAd.impressions !== undefined || selectedAd.clicks !== undefined) && (
                                <div className="flex gap-6 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Impressions: </span>
                                        <span className="font-medium">{selectedAd.impressions?.toLocaleString() || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Clicks: </span>
                                        <span className="font-medium">{selectedAd.clicks?.toLocaleString() || 0}</span>
                                    </div>
                                    {selectedAd.impressions && selectedAd.impressions > 0 && (
                                        <div>
                                            <span className="text-muted-foreground">CTR: </span>
                                            <span className="font-medium">
                                                {((selectedAd.clicks || 0) / selectedAd.impressions * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

interface AdHistoryItemProps {
    ad: Advertisement;
    isCurrent: boolean;
    formatDate: (date: any) => string;
    getStatusIcon: (status: string) => React.ReactNode;
    onView: () => void;
    onSelect?: () => void;
}

function AdHistoryItem({ ad, isCurrent, formatDate, getStatusIcon, onView, onSelect }: AdHistoryItemProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between p-3 border rounded-lg",
                isCurrent ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                ad.status === 'archived' ? "opacity-75" : ""
            )}
        >
            <div className="flex items-center gap-3">
                {/* Thumbnail */}
                {(ad.adProofUrl || ad.customerSampleAdUrl) ? (
                    <div className="w-16 h-8 border rounded overflow-hidden bg-muted shrink-0">
                        <Image
                            src={ad.adProofUrl || ad.customerSampleAdUrl || ''}
                            alt="Ad thumbnail"
                            width={64}
                            height={32}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-16 h-8 border rounded bg-muted shrink-0 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                )}

                {/* Info */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {getStatusIcon(ad.status)}
                        <span className="text-sm font-medium truncate">
                            {AD_STATUS_LABELS[ad.status]}
                        </span>
                        {isCurrent && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                        {ad.isChangeRequest && (
                            <Badge variant="outline" className="text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Change
                            </Badge>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Created {formatDate(ad.createdAt)}
                        {ad.liveAt && ` • Live ${formatDate(ad.liveAt)}`}
                        {ad.archivedAt && ` • Archived ${formatDate(ad.archivedAt)}`}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onView}>
                    <Eye className="h-4 w-4" />
                </Button>
                {onSelect && !isCurrent && ad.status !== 'archived' && (
                    <Button variant="outline" size="sm" onClick={onSelect}>
                        View Details
                    </Button>
                )}
            </div>
        </div>
    );
}
