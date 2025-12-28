'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, collectionGroup, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  Clock,
  CheckCircle2,
  Play,
  ArrowUpRight,
  Eye,
  FileEdit,
  RotateCcw,
  Pause,
  X,
  Mail,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Advertisement,
  AdStatus,
  AD_STATUS_LABELS,
  AD_PIPELINE_STAGE_COLORS,
  calculateAutoApprovalDeadline,
  shouldAutoApprove,
  normalizeAdStatus,
} from '@/lib/types';

// Pipeline stages for the main workflow (in order of progression) - Updated for new workflow
const PIPELINE_STAGES: AdStatus[] = [
  'info_needed',
  'design_pending',
  'in_review',
  'customer_approval',
  'approved',
  'live',
];

// Labels for each stage in the pipeline - Updated for new workflow
const STAGE_LABELS: Record<AdStatus, string> = {
  info_needed: 'Info Needed',
  design_pending: 'Design Pending',
  in_review: 'In Review',
  customer_approval: 'Customer Approval',
  approved: 'Ready to Publish',
  live: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  canceled: 'Canceled',
  archived: 'Archived',
};

// Special stages section - Updated for new workflow
const SPECIAL_STAGES: AdStatus[] = ['paused', 'completed', 'canceled'];

type AdWithMeta = Advertisement & {
  shouldAutoApprove?: boolean;
};

interface StageColumnProps {
  stage: AdStatus;
  ads: AdWithMeta[];
  onMoveToStage: (ad: AdWithMeta, newStage: AdStatus) => void;
  onAdClick: (ad: AdWithMeta) => void;
  isFirst: boolean;
  isLast: boolean;
}

function StageColumn({ stage, ads, onMoveToStage, onAdClick, isFirst, isLast }: StageColumnProps) {
  const colors = AD_PIPELINE_STAGE_COLORS[stage];
  const prevStage = isFirst ? null : PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage) - 1];
  const nextStage = isLast ? null : PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage) + 1];

  const getStageIcon = () => {
    switch (stage) {
      case 'info_needed':
        return <Clock className="h-4 w-4" />;
      case 'design_pending':
        return <FileEdit className="h-4 w-4" />;
      case 'in_review':
        return <Eye className="h-4 w-4" />;
      case 'customer_approval':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'live':
        return <Play className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-w-[240px] md:min-w-[280px] max-w-[240px] md:max-w-[280px] h-full">
      {/* Column Header */}
      <div className={cn('rounded-t-lg p-3 border-b-2', colors.bg, colors.border)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={colors.text}>{getStageIcon()}</span>
            <h3 className={cn('font-semibold text-sm', colors.text)}>
              {STAGE_LABELS[stage]}
            </h3>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {ads.length}
          </Badge>
        </div>
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1 bg-muted/20 rounded-b-lg border border-t-0">
        <div className="p-2 space-y-2 min-h-[400px]">
          {ads.map((ad) => (
            <Card
              key={ad.id}
              className={cn(
                'cursor-pointer hover:shadow-md transition-all group border-l-4',
                colors.border,
                ad.shouldAutoApprove && 'bg-green-50 border-l-green-500'
              )}
              onClick={() => onAdClick(ad)}
            >
              <CardContent className="p-3">
                {/* Business Name */}
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm truncate">
                      {ad.businessName || 'Unnamed Business'}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {ad.contactName || ad.email || 'No contact'}
                    </p>
                  </div>
                </div>

                {/* Auto-approval indicator */}
                {stage === 'customer_approval' && ad.sentForApprovalAt && (
                  <div className="mb-2">
                    {ad.shouldAutoApprove ? (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200 w-full justify-center">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready for Auto-Approval
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs w-full justify-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Auto-approves {formatDistanceToNow(
                          calculateAutoApprovalDeadline(ad.sentForApprovalAt),
                          { addSuffix: true }
                        )}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Revision indicator */}
                {ad.revisionCount && ad.revisionCount > 0 && (
                  <Badge variant="outline" className="text-xs mb-2">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {ad.revisionCount} revision{ad.revisionCount > 1 ? 's' : ''}
                  </Badge>
                )}

                {/* Date */}
                <div className="text-xs text-muted-foreground mb-2">
                  {ad.createdAt && (
                    <span>
                      Created {format(
                        ad.createdAt.toDate ? ad.createdAt.toDate() : new Date(ad.createdAt),
                        'MMM d'
                      )}
                    </span>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t">
                  {prevStage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToStage(ad, prevStage);
                      }}
                      title={`Move to ${STAGE_LABELS[prevStage]}`}
                    >
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      Back
                    </Button>
                  )}
                  <div className="flex-1" />
                  {nextStage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToStage(ad, nextStage);
                      }}
                      title={`Move to ${STAGE_LABELS[nextStage]}`}
                    >
                      Next
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {ads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
              <p>No ads in this stage</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function PipelinePage() {
  const [ads, setAds] = useState<AdWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) {
      setError('Firestore is not available.');
      setLoading(false);
      return;
    }

    const adsQuery = query(collectionGroup(firestore, 'advertisements'));

    const unsubscribe = onSnapshot(
      adsQuery,
      (snapshot) => {
        const adsData: AdWithMeta[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const ad: AdWithMeta = {
            id: doc.id,
            userId: data.userId,
            subscriptionId: data.subscriptionId || '',
            status: data.status || 'pending_info',
            adProofUrl: data.adProofUrl,
            adProofDestinationUrl: data.adProofDestinationUrl,
            businessName: data.businessName,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            sentForApprovalAt: data.sentForApprovalAt,
            revisionCount: data.revisionCount,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };

          if (ad.status === 'customer_approval' && ad.sentForApprovalAt) {
            ad.shouldAutoApprove = shouldAutoApprove(ad.sentForApprovalAt);
          }

          return ad;
        });

        // Sort by creation date (oldest first for pipeline view)
        adsData.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return aTime - bTime;
        });

        setAds(adsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching advertisements:', err);
        setError('You do not have permission to view this data.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  const handleMoveToStage = async (ad: AdWithMeta, newStage: AdStatus) => {
    if (!firestore) return;

    try {
      const adRef = doc(firestore, 'users', ad.userId, 'advertisements', ad.id);
      const updateData: Record<string, any> = {
        status: newStage,
        updatedAt: serverTimestamp(),
      };

      // Add timestamp tracking for specific transitions
      if (newStage === 'in_review') {
        updateData.infoSubmittedAt = serverTimestamp();
      } else if (newStage === 'customer_approval') {
        updateData.sentForApprovalAt = serverTimestamp();
        updateData.autoApprovalAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      } else if (newStage === 'live') {
        updateData.approvedAt = serverTimestamp();
        updateData.liveAt = serverTimestamp();
      } else if (newStage === 'completed') {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(adRef, updateData);

      toast({
        title: 'Ad Updated',
        description: `Moved to ${STAGE_LABELS[newStage]}`,
      });
    } catch (err) {
      console.error('Error updating ad status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update ad status',
        variant: 'destructive',
      });
    }
  };

  const handleAdClick = (ad: AdWithMeta) => {
    router.push(`/advertisements/${ad.id}?userId=${ad.userId}`);
  };

  // Filter ads based on search
  const filteredAds = useMemo(() => {
    if (!searchQuery) return ads;

    const query = searchQuery.toLowerCase();
    return ads.filter(
      (ad) =>
        ad.businessName?.toLowerCase().includes(query) ||
        ad.contactName?.toLowerCase().includes(query) ||
        ad.email?.toLowerCase().includes(query)
    );
  }, [ads, searchQuery]);

  // Group ads by stage for the main pipeline
  const adsByStage = useMemo(() => {
    return PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage] = filteredAds.filter((ad) => ad.status === stage);
      return acc;
    }, {} as Record<AdStatus, AdWithMeta[]>);
  }, [filteredAds]);

  // Get ads in special stages
  const specialStageAds = useMemo(() => {
    return SPECIAL_STAGES.reduce((acc, stage) => {
      acc[stage] = filteredAds.filter((ad) => ad.status === stage);
      return acc;
    }, {} as Record<AdStatus, AdWithMeta[]>);
  }, [filteredAds]);

  // Calculate pipeline stats
  const stats = useMemo(() => {
    const totalAds = filteredAds.length;
    const liveAds = adsByStage.live?.length || 0;
    const pendingApprovalAds = adsByStage.customer_approval?.length || 0;
    const actionRequired =
      (adsByStage.in_review?.length || 0) +
      (adsByStage.design_pending?.length || 0) +
      filteredAds.filter((ad) => ad.shouldAutoApprove).length;

    return { totalAds, liveAds, pendingApprovalAds, actionRequired };
  }, [filteredAds, adsByStage]);

  const hasSpecialStageAds = SPECIAL_STAGES.some(
    (stage) => (specialStageAds[stage]?.length || 0) > 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Ad Pipeline</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Track advertisements through the customer workflow
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xl md:text-2xl font-bold">{stats.totalAds}</p>
            <p className="text-muted-foreground text-xs md:text-sm">Total</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-xl md:text-2xl font-bold text-amber-600">{stats.actionRequired}</p>
            <p className="text-muted-foreground text-xs md:text-sm">Action Needed</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.pendingApprovalAds}</p>
            <p className="text-muted-foreground text-xs md:text-sm">Pending Approval</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xl md:text-2xl font-bold text-green-600">{stats.liveAds}</p>
            <p className="text-muted-foreground text-xs md:text-sm">Live</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex gap-4 pb-4 min-h-full">
            {PIPELINE_STAGES.map((stage, index) => (
              <StageColumn
                key={stage}
                stage={stage}
                ads={adsByStage[stage] || []}
                onMoveToStage={handleMoveToStage}
                onAdClick={handleAdClick}
                isFirst={index === 0}
                isLast={index === PIPELINE_STAGES.length - 1}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Special Stages Section */}
      {hasSpecialStageAds && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Other Statuses</CardTitle>
            <CardDescription>
              Ads that are outside the main workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {SPECIAL_STAGES.map((stage) => {
                const stageAds = specialStageAds[stage] || [];
                if (stageAds.length === 0) return null;

                const colors = AD_PIPELINE_STAGE_COLORS[stage];
                return (
                  <div key={stage} className="space-y-2">
                    <div className={cn('flex items-center gap-2 px-2 py-1 rounded', colors.bg)}>
                      <span className={cn('text-sm font-medium', colors.text)}>
                        {STAGE_LABELS[stage]}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {stageAds.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {stageAds.slice(0, 3).map((ad) => (
                        <Card
                          key={ad.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleAdClick(ad)}
                        >
                          <CardContent className="p-2">
                            <p className="font-medium text-sm truncate">
                              {ad.businessName || 'Unnamed'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {ad.contactName}
                            </p>
                            {/* Quick action buttons */}
                            <div className="flex gap-1 mt-2">
                              {stage === 'approved' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToStage(ad, 'live');
                                  }}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Go Live
                                </Button>
                              )}
                              {stage === 'paused' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToStage(ad, 'live');
                                  }}
                                >
                                  Resume
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {stageAds.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => router.push(`/advertisements?status=${stage}`)}
                        >
                          +{stageAds.length - 3} more
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
