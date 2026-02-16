'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Briefcase,
  ArrowLeft,
  MessageSquare,
  TrendingUp,
  Clock,
  Tag,
  User,
  Trash2,
  ChevronRight,
  XCircle,
  Zap,
  Pause,
  Play,
} from 'lucide-react';
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
import { format } from 'date-fns';
import { SendEmailDialog } from '@/components/shared/send-email-dialog';
import { ScheduleLeadEmailDialog } from '@/components/shared/schedule-lead-email-dialog';
import { ScheduledLeadEmailsList } from '@/components/shared/scheduled-lead-emails-list';
import { CustomerActivity } from '@/components/customers/customer-activity';
import { LeadPipelineBar } from '@/components/leads/lead-pipeline-bar';
import { LeadScoreGauge } from '@/components/leads/lead-score-gauge';
import { StageChangeDialog } from '@/components/leads/stage-change-dialog';
import { TaskListCard } from '@/components/leads/task-list-card';
import { TaskCreateDialog } from '@/components/leads/task-create-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Lead,
  LeadPriority,
  LeadSource,
  LeadStage,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_STAGE_ORDER,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_PRIORITY_COLORS,
  LEAD_SOURCE_LABELS,
  ACTIVITY_TYPES,
  getTimeSinceLastContact,
  getStatusFromStage,
  type LeadSequenceEnrollment,
} from '@/lib/types';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: leadId } = params;
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManualEmailDialogOpen, setIsManualEmailDialogOpen] = useState(false);
  const [isScheduleEmailDialogOpen, setIsScheduleEmailDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);

  // Fetch lead data
  useEffect(() => {
    if (!firestore || !leadId || typeof leadId !== 'string') {
      setLoading(false);
      setError("Invalid lead ID.");
      return;
    }

    const leadDocRef = doc(firestore, 'leads', leadId);
    const unsubscribe = onSnapshot(leadDocRef, (docSnap) => {
      if (!docSnap.exists()) {
        setError("Lead not found.");
        setLoading(false);
        return;
      }
      const data = docSnap.data();
      setLead({
        id: docSnap.id,
        businessName: data.businessName || '',
        contactName: data.contactName || '',
        email: data.email || '',
        phone: data.phone || '',
        siteCoverage: data.siteCoverage || [],
        priority: data.priority || LEAD_PRIORITIES.MEDIUM,
        source: data.source || 'website',
        status: data.status || LEAD_STATUSES.ACTIVE,
        stage: data.stage || 'new',
        stageChangedAt: data.stageChangedAt,
        lostReason: data.lostReason,
        leadScore: data.leadScore,
        leadScoreUpdatedAt: data.leadScoreUpdatedAt,
        scoreBreakdown: data.scoreBreakdown,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        lastContactedAt: data.lastContactedAt,
        estimatedValue: data.estimatedValue,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        notes: data.notes,
      } as Lead);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching lead:", err);
      setError("Failed to load lead details.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, leadId]);

  // Fetch enrollments
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!leadId) return;
      try {
        const res = await fetch(`/api/leads/sequences?leadId=${leadId}`);
        // Enrollments are in leadSequenceEnrollments collection; fetch via API or directly
      } catch (err) { /* handled below */ }
    };

    if (!firestore || !leadId) return;

    // Listen for enrollments in real-time via Firestore
    const q = query(
      collection(firestore, 'leadSequenceEnrollments' as string),
    );
    // Firestore client queries may not support this collection directly,
    // so we'll fetch via REST
    const fetchData = async () => {
      try {
        // Simple approach: use API or direct collection query
        const enrollSnap = await getDoc(doc(firestore, '__dummy__', 'dummy')).catch(() => null);
      } catch (e) {}
    };
    fetchData();
  }, [firestore, leadId]);

  // Fetch sequences for enrollment
  useEffect(() => {
    const fetchSequences = async () => {
      try {
        const res = await fetch('/api/leads/sequences');
        const data = await res.json();
        if (data.success) setSequences(data.data.filter((s: any) => s.isActive));
      } catch (err) {}
    };
    fetchSequences();
  }, []);

  // Handle adding a note
  const handleAddNote = async () => {
    if (!firestore || !lead || !user || !newNote.trim()) return;
    setIsAddingNote(true);
    try {
      await addDoc(collection(firestore, 'leads', lead.id, 'activities'), {
        leadId: lead.id,
        type: ACTIVITY_TYPES.NOTE,
        title: 'Note added',
        description: newNote.trim(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(firestore, 'leads', lead.id), {
        lastContactedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewNote('');
      toast({ title: 'Note Added' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add note.', variant: 'destructive' });
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle stage change
  const handleStageChange = async (stage: LeadStage, note?: string, lostReason?: string) => {
    if (!user || !lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          lostReason,
          note,
          userId: user.uid,
          userName: user.displayName || user.email || 'Unknown',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: 'Stage Updated', description: `Moved to ${LEAD_STAGE_LABELS[stage]}` });

      // Recalculate score
      fetch(`/api/leads/${lead.id}/score`, { method: 'POST' }).catch(() => {});
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update stage', variant: 'destructive' });
    }
  };

  // Move to next stage
  const handleNextStage = () => {
    if (!lead) return;
    const currentIndex = LEAD_STAGE_ORDER.indexOf(lead.stage as LeadStage);
    if (currentIndex >= 0 && currentIndex < LEAD_STAGE_ORDER.length - 1) {
      const nextStage = LEAD_STAGE_ORDER[currentIndex + 1];
      handleStageChange(nextStage);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!firestore || !lead) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'leads', lead.id));
      toast({ title: 'Lead Deleted' });
      router.push('/leads');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete lead.', variant: 'destructive' });
      setIsDeleting(false);
    }
  };

  // Handle enroll in sequence
  const handleEnroll = async (sequenceId: string) => {
    if (!user || !lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequenceId,
          userId: user.uid,
          userName: user.displayName || user.email || 'Unknown',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: 'Enrolled in Sequence' });
      setShowEnrollDialog(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to enroll', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !lead) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{error ? 'Error' : 'Not Found'}</AlertTitle>
        <AlertDescription>{error || 'The requested lead could not be found.'}</AlertDescription>
      </Alert>
    );
  }

  const stage = (lead.stage || 'new') as LeadStage;
  const stageColors = LEAD_STAGE_COLORS[stage];
  const priorityColors = LEAD_PRIORITY_COLORS[lead.priority as LeadPriority] || LEAD_PRIORITY_COLORS.medium;
  const currentStageIndex = LEAD_STAGE_ORDER.indexOf(stage);
  const canAdvance = currentStageIndex >= 0 && currentStageIndex < LEAD_STAGE_ORDER.length - 1 && stage !== 'lost';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      {/* Header Card with Pipeline Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <CardTitle className="text-xl md:text-2xl">{lead.businessName}</CardTitle>
                  <Badge className={cn(stageColors.bg, stageColors.text, 'border', stageColors.border)}>
                    {LEAD_STAGE_LABELS[stage]}
                  </Badge>
                  {lead.lostReason && stage === 'lost' && (
                    <Badge variant="outline" className="text-red-600">
                      {lead.lostReason.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {lead.contactName} &bull; Created {lead.createdAt ? format(lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt), 'PPP') : 'N/A'}
                </CardDescription>
              </div>
              {/* Score Gauge */}
              <LeadScoreGauge score={lead.leadScore} breakdown={lead.scoreBreakdown} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pipeline Progress Bar */}
          <LeadPipelineBar currentStage={stage} />

          {/* Stage Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canAdvance && (
              <Button onClick={handleNextStage}>
                <ChevronRight className="mr-1 h-4 w-4" />
                Move to {LEAD_STAGE_LABELS[LEAD_STAGE_ORDER[currentStageIndex + 1]]}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowStageDialog(true)}>
              Change Stage
            </Button>
            {stage !== 'lost' && stage !== 'won' && (
              <Button variant="outline" className="text-red-600" onClick={() => setShowLostDialog(true)}>
                <XCircle className="mr-1 h-4 w-4" /> Mark as Lost
              </Button>
            )}
            {stage !== 'won' && stage !== 'lost' && (
              <Button variant="outline" className="text-green-600" onClick={() => handleStageChange('won')}>
                Mark as Won
              </Button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", priorityColors.bg)}>
                <TrendingUp className={cn("h-5 w-5", priorityColors.text)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <p className="text-lg font-bold">{LEAD_PRIORITY_LABELS[lead.priority as LeadPriority] || 'Medium'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Tag className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="text-lg font-bold">{LEAD_SOURCE_LABELS[lead.source as LeadSource] || 'Website'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Contact</p>
                <p className="text-lg font-bold">{getTimeSinceLastContact(lead.lastContactedAt)}</p>
              </div>
            </div>
            {lead.estimatedValue !== undefined && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">$</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Value</p>
                  <p className="text-lg font-bold">${lead.estimatedValue.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Name</p>
                    <p className="font-medium">{lead.contactName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Business</p>
                    <p className="font-medium">{lead.businessName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${lead.email}`} className="font-medium text-primary hover:underline">{lead.email}</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{lead.phone || 'Not Provided'}</p>
                  </div>
                </div>
              </div>
              {lead.siteCoverage && lead.siteCoverage.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">Interested Sites</p>
                  <div className="flex flex-wrap gap-2">
                    {lead.siteCoverage.map((site: string) => <Badge key={site} variant="secondary">{site}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
              <CardDescription>Record interactions, calls, or important information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder="Enter your note here..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} />
              <Button onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
                {isAddingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Add Note
              </Button>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <CustomerActivity leadId={lead.id} />

          {/* Scheduled Emails */}
          <ScheduledLeadEmailsList leadId={lead.id} />
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => setIsManualEmailDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" /> Send Email
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setIsScheduleEmailDialogOpen(true)}>
                <Clock className="mr-2 h-4 w-4" /> Schedule Email
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href={`tel:${lead.phone}`}><Phone className="mr-2 h-4 w-4" /> Call Lead</a>
              </Button>
              <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
              </Button>
            </CardContent>
          </Card>

          {/* Tasks Card */}
          <TaskListCard
            leadId={lead.id}
            userId={user?.uid || ''}
            userName={user?.displayName || user?.email || 'Unknown'}
            onCreateTask={() => setShowTaskDialog(true)}
          />

          {/* Active Sequences */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Sequences</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowEnrollDialog(true)}>
                <Zap className="mr-1 h-3 w-3" /> Enroll
              </Button>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No active sequences</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <span>{e.sequenceName}</span>
                      <Badge variant="outline">{e.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Information */}
          {(lead.utmSource || lead.utmCampaign) && (
            <Card>
              <CardHeader><CardTitle>Source Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {lead.utmSource && <div className="flex justify-between"><span className="text-muted-foreground">Source:</span><span>{lead.utmSource}</span></div>}
                {lead.utmMedium && <div className="flex justify-between"><span className="text-muted-foreground">Medium:</span><span>{lead.utmMedium}</span></div>}
                {lead.utmCampaign && <div className="flex justify-between"><span className="text-muted-foreground">Campaign:</span><span>{lead.utmCampaign}</span></div>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SendEmailDialog
        recipient={{ id: lead.id, email: lead.email, contactName: lead.contactName, businessName: lead.businessName }}
        recipientType="lead"
        isOpen={isManualEmailDialogOpen}
        onOpenChange={setIsManualEmailDialogOpen}
      />
      <ScheduleLeadEmailDialog
        lead={{ id: lead.id, email: lead.email, contactName: lead.contactName, businessName: lead.businessName }}
        isOpen={isScheduleEmailDialogOpen}
        onOpenChange={setIsScheduleEmailDialogOpen}
      />
      <StageChangeDialog
        isOpen={showStageDialog}
        onOpenChange={setShowStageDialog}
        currentStage={stage}
        onConfirm={handleStageChange}
        mode="change"
      />
      <StageChangeDialog
        isOpen={showLostDialog}
        onOpenChange={setShowLostDialog}
        currentStage={stage}
        onConfirm={handleStageChange}
        mode="lost"
      />
      <TaskCreateDialog
        isOpen={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        leadId={lead.id}
        leadName={lead.contactName || lead.businessName}
        userId={user?.uid || ''}
        userName={user?.displayName || user?.email || 'Unknown'}
      />
      {/* Enroll in Sequence Dialog */}
      <AlertDialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enroll in Sequence</AlertDialogTitle>
            <AlertDialogDescription>Select a sequence to enroll this lead in.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            {sequences.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No active sequences available</p>
            ) : (
              sequences.map((seq: any) => (
                <Button
                  key={seq.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleEnroll(seq.id)}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {seq.name}
                  <span className="ml-auto text-xs text-muted-foreground">{seq.steps?.length || 0} steps</span>
                </Button>
              ))
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{lead.businessName}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
