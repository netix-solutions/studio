'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, ChevronRight, Search, Clock, CheckCircle2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Advertisement,
  AdStatus,
  AD_STATUSES,
  AD_STATUS_LABELS,
  AD_PIPELINE_STAGE_COLORS,
  calculateAutoApprovalDeadline,
  shouldAutoApprove,
} from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Pipeline stages for the main workflow (in order of progression)
const PIPELINE_STAGES: AdStatus[] = [
  'pending_info',
  'pending_internal_review',
  'pending_ad_creation',
  'pending_customer_approval',
  'live',
];

// Stages that can be shown separately (not in main pipeline flow)
const SPECIAL_STAGES: AdStatus[] = ['revision_requested', 'approved', 'paused', 'completed', 'canceled_inactive'];

// Get the next logical stage in the workflow
function getNextStage(currentStage: AdStatus): AdStatus | null {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[currentIndex + 1];
}

// Get the previous logical stage in the workflow
function getPrevStage(currentStage: AdStatus): AdStatus | null {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
  if (currentIndex <= 0) return null;
  return PIPELINE_STAGES[currentIndex - 1];
}

interface StageColumnProps {
  stage: AdStatus;
  ads: Advertisement[];
  onMoveToStage: (adId: string, newStage: AdStatus) => void;
  onAdClick: (adId: string) => void;
}

function StageColumn({ stage, ads, onMoveToStage, onAdClick }: StageColumnProps) {
  const colors = AD_PIPELINE_STAGE_COLORS[stage];
  const nextStage = getNextStage(stage);
  const prevStage = getPrevStage(stage);

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px] h-full">
      <div className={cn("rounded-t-lg p-3 border-b-2", colors.bg, colors.border)}>
        <div className="flex items-center justify-between">
          <h3 className={cn("font-semibold", colors.text)}>{AD_STATUS_LABELS[stage]}</h3>
          <Badge variant="secondary" className="ml-2">{ads.length}</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2 bg-muted/30 rounded-b-lg">
        <div className="space-y-2 min-h-[200px]">
          {ads.map((ad) => (
            <Card
              key={ad.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onAdClick(ad.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{ad.businessName || 'Unnamed Business'}</h4>
                    <p className="text-sm text-muted-foreground truncate">{ad.contactName || ad.email}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {prevStage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToStage(ad.id, prevStage);
                        }}
                        title={`Move to ${AD_STATUS_LABELS[prevStage]}`}
                      >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </Button>
                    )}
                    {nextStage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToStage(ad.id, nextStage);
                        }}
                        title={`Move to ${AD_STATUS_LABELS[nextStage]}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Show auto-approval indicator for pending_customer_approval */}
                {stage === 'pending_customer_approval' && ad.sentForApprovalAt && (
                  <div className="mt-2">
                    {shouldAutoApprove(ad.sentForApprovalAt) ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready for auto-approval
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Auto-approves {formatDistanceToNow(calculateAutoApprovalDeadline(ad.sentForApprovalAt), { addSuffix: true })}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Show revision count if applicable */}
                {ad.revisionCount && ad.revisionCount > 0 && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {ad.revisionCount} revision{ad.revisionCount > 1 ? 's' : ''}
                  </Badge>
                )}

                <div className="mt-2 text-xs text-muted-foreground">
                  {ad.createdAt && (
                    <span>
                      Created {format(ad.createdAt.toDate ? ad.createdAt.toDate() : new Date(ad.createdAt), 'MMM d')}
                    </span>
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
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialStage, setSelectedSpecialStage] = useState<string>('all');
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) {
      setError("Firestore is not available.");
      setLoading(false);
      return;
    }

    const adsQuery = query(collection(firestore, 'advertisements'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(adsQuery, (snapshot) => {
      const adsData: Advertisement[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Advertisement));
      setAds(adsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching advertisements:", err);
      setError("You do not have permission to view this data. Please contact an administrator.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const handleMoveToStage = async (adId: string, newStage: AdStatus) => {
    if (!firestore) return;

    try {
      const adRef = doc(firestore, 'advertisements', adId);
      const updateData: Record<string, any> = {
        status: newStage,
        updatedAt: serverTimestamp(),
      };

      // Add timestamp tracking for specific transitions
      if (newStage === 'pending_internal_review') {
        updateData.infoSubmittedAt = serverTimestamp();
      } else if (newStage === 'pending_customer_approval') {
        updateData.sentForApprovalAt = serverTimestamp();
        updateData.autoApprovalAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      } else if (newStage === 'live') {
        updateData.liveAt = serverTimestamp();
      } else if (newStage === 'completed') {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(adRef, updateData);

      toast({
        title: 'Ad Updated',
        description: `Moved to ${AD_STATUS_LABELS[newStage]}`,
      });
    } catch (err) {
      console.error("Error updating ad status:", err);
      toast({
        title: 'Error',
        description: 'Failed to update ad status',
        variant: 'destructive',
      });
    }
  };

  const handleAdClick = (adId: string) => {
    router.push(`/advertisements/${adId}`);
  };

  // Filter ads
  const filteredAds = ads.filter(ad => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        ad.businessName?.toLowerCase().includes(query) ||
        ad.contactName?.toLowerCase().includes(query) ||
        ad.email?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Group ads by stage for the main pipeline
  const adsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredAds.filter(ad => ad.status === stage);
    return acc;
  }, {} as Record<AdStatus, Advertisement[]>);

  // Get ads in special stages
  const specialStageAds = SPECIAL_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredAds.filter(ad => ad.status === stage);
    return acc;
  }, {} as Record<AdStatus, Advertisement[]>);

  // Calculate pipeline stats
  const totalAds = filteredAds.length;
  const liveAds = adsByStage.live?.length || 0;
  const pendingApprovalAds = adsByStage.pending_customer_approval?.length || 0;
  const revisionAds = specialStageAds.revision_requested?.length || 0;

  // Get ads for the selected special stage filter
  const displayedSpecialAds = selectedSpecialStage === 'all'
    ? SPECIAL_STAGES.flatMap(stage => specialStageAds[stage] || [])
    : specialStageAds[selectedSpecialStage as AdStatus] || [];

  const hasSpecialStageAds = SPECIAL_STAGES.some(stage => (specialStageAds[stage]?.length || 0) > 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ad Pipeline</h1>
          <p className="text-muted-foreground">
            Track advertisements through the customer workflow
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalAds}</p>
            <p className="text-muted-foreground">Total Ads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{liveAds}</p>
            <p className="text-muted-foreground">Live</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingApprovalAds}</p>
            <p className="text-muted-foreground">Pending Approval</p>
          </div>
          {revisionAds > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{revisionAds}</p>
              <p className="text-muted-foreground">Need Revision</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
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
      </div>

      {/* Pipeline Board */}
      <ScrollArea className="flex-1">
        <div className="flex gap-4 pb-4 min-h-[500px]">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              ads={adsByStage[stage] || []}
              onMoveToStage={handleMoveToStage}
              onAdClick={handleAdClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Special Stages Section */}
      {hasSpecialStageAds && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Other Statuses</CardTitle>
              <Select value={selectedSpecialStage} onValueChange={setSelectedSpecialStage}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({SPECIAL_STAGES.reduce((sum, s) => sum + (specialStageAds[s]?.length || 0), 0)})</SelectItem>
                  {SPECIAL_STAGES.map((stage) => {
                    const count = specialStageAds[stage]?.length || 0;
                    if (count === 0) return null;
                    return (
                      <SelectItem key={stage} value={stage}>
                        {AD_STATUS_LABELS[stage]} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {displayedSpecialAds.map((ad) => {
                const colors = AD_PIPELINE_STAGE_COLORS[ad.status];
                return (
                  <Card
                    key={ad.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleAdClick(ad.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={cn("text-xs", colors.bg, colors.text)}>
                          {AD_STATUS_LABELS[ad.status]}
                        </Badge>
                      </div>
                      <h4 className="font-medium truncate">{ad.businessName || 'Unnamed Business'}</h4>
                      <p className="text-sm text-muted-foreground truncate">{ad.contactName || ad.email}</p>
                      {ad.status === 'revision_requested' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToStage(ad.id, 'pending_ad_creation');
                          }}
                        >
                          Start Revision
                        </Button>
                      )}
                      {ad.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToStage(ad.id, 'live');
                          }}
                        >
                          Go Live
                        </Button>
                      )}
                      {ad.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToStage(ad.id, 'live');
                          }}
                        >
                          Resume
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
