'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, User, Mail, Phone, Briefcase, GripVertical, ChevronRight, Plus, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Lead,
  LeadStage,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_ORDER,
  LEAD_STAGE_COLORS,
  LEAD_PRIORITY_COLORS,
  LEAD_PRIORITY_LABELS,
  LEAD_SOURCE_LABELS,
  ACTIVITY_TYPES,
  type LeadPriority,
  type LeadSource,
} from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/firebase';

// Pipeline stages to display (excluding 'lost' which shows as separate)
const PIPELINE_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won'];

interface StageColumnProps {
  stage: LeadStage;
  leads: Lead[];
  onMoveToStage: (leadId: string, newStage: LeadStage) => void;
  onLeadClick: (leadId: string) => void;
}

function StageColumn({ stage, leads, onMoveToStage, onLeadClick }: StageColumnProps) {
  const colors = LEAD_STAGE_COLORS[stage];
  const stageIndex = PIPELINE_STAGES.indexOf(stage);
  const nextStage = stageIndex < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[stageIndex + 1] : null;
  const prevStage = stageIndex > 0 ? PIPELINE_STAGES[stageIndex - 1] : null;

  // Calculate total estimated value for this stage
  const totalValue = leads.reduce((acc, lead) => acc + (lead.estimatedValue || 0), 0);

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px] h-full">
      <div className={cn("rounded-t-lg p-3 border-b-2", colors.bg, colors.border)}>
        <div className="flex items-center justify-between">
          <h3 className={cn("font-semibold", colors.text)}>{LEAD_STAGE_LABELS[stage]}</h3>
          <Badge variant="secondary" className="ml-2">{leads.length}</Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            ${totalValue.toLocaleString()} potential
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 p-2 bg-muted/30 rounded-b-lg">
        <div className="space-y-2 min-h-[200px]">
          {leads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onLeadClick(lead.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{lead.businessName}</h4>
                    <p className="text-sm text-muted-foreground truncate">{lead.contactName}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {prevStage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToStage(lead.id, prevStage);
                        }}
                        title={`Move to ${LEAD_STAGE_LABELS[prevStage]}`}
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
                          onMoveToStage(lead.id, nextStage);
                        }}
                        title={`Move to ${LEAD_STAGE_LABELS[nextStage]}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {lead.priority && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        LEAD_PRIORITY_COLORS[lead.priority as LeadPriority]?.bg,
                        LEAD_PRIORITY_COLORS[lead.priority as LeadPriority]?.text
                      )}
                    >
                      {LEAD_PRIORITY_LABELS[lead.priority as LeadPriority] || lead.priority}
                    </Badge>
                  )}
                  {lead.score !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Score: {lead.score}
                    </Badge>
                  )}
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  {lead.createdAt && (
                    <span>
                      Created {format(lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt), 'MMM d')}
                    </span>
                  )}
                  {lead.source && (
                    <span className="ml-2">
                      via {LEAD_SOURCE_LABELS[lead.source as LeadSource] || lead.source}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
              <p>No leads in this stage</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [showLostLeads, setShowLostLeads] = useState(false);
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) {
      setError("Firestore is not available.");
      setLoading(false);
      return;
    }

    const leadsQuery = query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leadsData: Lead[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Provide defaults for legacy leads without new fields
        stage: doc.data().stage || LEAD_STAGES.NEW,
        priority: doc.data().priority || 'medium',
        score: doc.data().score || 0,
        source: doc.data().source || 'website',
      } as Lead));
      setLeads(leadsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching leads:", err);
      setError("You do not have permission to view this data. Please contact an administrator.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const handleMoveToStage = async (leadId: string, newStage: LeadStage) => {
    if (!firestore || !user) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const oldStage = lead.stage || LEAD_STAGES.NEW;

    try {
      const leadRef = doc(firestore, 'leads', leadId);
      await updateDoc(leadRef, {
        stage: newStage,
        updatedAt: serverTimestamp(),
      });

      // Log activity
      await addDoc(collection(firestore, 'leads', leadId, 'activities'), {
        leadId,
        type: ACTIVITY_TYPES.STAGE_CHANGE,
        title: `Stage changed from ${LEAD_STAGE_LABELS[oldStage as LeadStage]} to ${LEAD_STAGE_LABELS[newStage]}`,
        metadata: {
          fromStage: oldStage,
          toStage: newStage,
        },
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown',
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Lead Updated',
        description: `Moved to ${LEAD_STAGE_LABELS[newStage]}`,
      });
    } catch (err) {
      console.error("Error updating lead stage:", err);
      toast({
        title: 'Error',
        description: 'Failed to update lead stage',
        variant: 'destructive',
      });
    }
  };

  const handleLeadClick = (leadId: string) => {
    router.push(`/leads/${leadId}`);
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        lead.businessName?.toLowerCase().includes(query) ||
        lead.contactName?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Source filter
    if (selectedSource !== 'all' && lead.source !== selectedSource) {
      return false;
    }

    return true;
  });

  // Group leads by stage
  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter(lead => (lead.stage || LEAD_STAGES.NEW) === stage);
    return acc;
  }, {} as Record<LeadStage, Lead[]>);

  const lostLeads = filteredLeads.filter(lead => lead.stage === LEAD_STAGES.LOST);

  // Calculate pipeline stats
  const totalLeads = filteredLeads.length;
  const wonLeads = leadsByStage.won?.length || 0;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
  const totalPipelineValue = filteredLeads
    .filter(l => l.stage !== 'won' && l.stage !== 'lost')
    .reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

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
          <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage your leads through the sales funnel
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalLeads}</p>
            <p className="text-muted-foreground">Total Leads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{conversionRate}%</p>
            <p className="text-muted-foreground">Won Rate</p>
          </div>
          {totalPipelineValue > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold">${totalPipelineValue.toLocaleString()}</p>
              <p className="text-muted-foreground">Pipeline Value</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showLostLeads ? "default" : "outline"}
          onClick={() => setShowLostLeads(!showLostLeads)}
        >
          Lost ({lostLeads.length})
        </Button>
      </div>

      {/* Pipeline Board */}
      <ScrollArea className="flex-1">
        <div className="flex gap-4 pb-4 min-h-[500px]">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              leads={leadsByStage[stage] || []}
              onMoveToStage={handleMoveToStage}
              onLeadClick={handleLeadClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Lost Leads Section */}
      {showLostLeads && lostLeads.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="destructive">{lostLeads.length}</Badge>
              Lost Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {lostLeads.map((lead) => (
                <Card
                  key={lead.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleLeadClick(lead.id)}
                >
                  <CardContent className="p-3">
                    <h4 className="font-medium truncate">{lead.businessName}</h4>
                    <p className="text-sm text-muted-foreground truncate">{lead.contactName}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToStage(lead.id, LEAD_STAGES.NEW);
                      }}
                    >
                      Reopen Lead
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
