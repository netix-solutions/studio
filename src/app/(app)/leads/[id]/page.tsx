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
  query,
  orderBy,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Target,
  Tag,
  User,
  CheckCircle2,
  XCircle,
  Send,
  PhoneCall,
  Users,
  FileText,
  Trash2,
  Eye,
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
import { EmailHistoryDialog } from '@/components/emails/email-history-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Lead,
  Activity,
  LeadStage,
  LeadPriority,
  LeadSource,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_PRIORITY_COLORS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  ACTIVITY_TYPES,
  getTimeSinceLastContact,
} from '@/lib/types';

// Activity type icon mapping
const activityIcons: Record<string, any> = {
  note: MessageSquare,
  email_sent: Send,
  email_received: Mail,
  call: PhoneCall,
  meeting: Users,
  stage_change: TrendingUp,
  priority_change: Target,
  score_change: TrendingUp,
  conversion: CheckCircle2,
  task_created: FileText,
  task_completed: CheckCircle2,
  assignment_change: User,
  page_visit: Eye,
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: leadId } = params;
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManualEmailDialogOpen, setIsManualEmailDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch lead data
  useEffect(() => {
    if (!firestore || !leadId || typeof leadId !== 'string') {
      setLoading(false);
      setError("Invalid lead ID.");
      return;
    }

    const fetchLead = async () => {
      try {
        setLoading(true);
        const leadDocRef = doc(firestore, 'leads', leadId);
        const leadDocSnap = await getDoc(leadDocRef);

        if (!leadDocSnap.exists()) {
          throw new Error("Lead not found.");
        }

        const leadData = leadDocSnap.data();
        const fullLead: Lead = {
          id: leadDocSnap.id,
          businessName: leadData.businessName || '',
          contactName: leadData.contactName || '',
          email: leadData.email || '',
          phone: leadData.phone || '',
          siteCoverage: leadData.siteCoverage || [],
          stage: leadData.stage || LEAD_STAGES.NEW,
          priority: leadData.priority || LEAD_PRIORITIES.MEDIUM,
          source: leadData.source || LEAD_SOURCES.WEBSITE,
          score: leadData.score || 0,
          createdAt: leadData.createdAt,
          updatedAt: leadData.updatedAt,
          lastContactedAt: leadData.lastContactedAt,
          estimatedValue: leadData.estimatedValue,
          utmSource: leadData.utmSource,
          utmMedium: leadData.utmMedium,
          utmCampaign: leadData.utmCampaign,
          notes: leadData.notes,
        };
        setLead(fullLead);
      } catch (err: any) {
        console.error("Error fetching lead:", err);
        setError(err.message || "Failed to load lead details.");
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [firestore, leadId]);

  // Subscribe to activities
  useEffect(() => {
    if (!firestore || !leadId || typeof leadId !== 'string') return;

    const activitiesQuery = query(
      collection(firestore, 'leads', leadId, 'activities'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData: Activity[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Activity));
      setActivities(activitiesData);
    });

    return () => unsubscribe();
  }, [firestore, leadId]);

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

      // Update last contacted
      const leadRef = doc(firestore, 'leads', lead.id);
      await updateDoc(leadRef, {
        lastContactedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewNote('');
      toast({ title: 'Note Added', description: 'Your note has been saved.' });
    } catch (err) {
      console.error("Error adding note:", err);
      toast({ title: 'Error', description: 'Failed to add note.', variant: 'destructive' });
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle marking as won/lost
  const handleMarkAsWonLost = async (newStage: 'won' | 'lost') => {
    if (!firestore || !lead || !user) return;

    try {
      const leadRef = doc(firestore, 'leads', lead.id);
      await updateDoc(leadRef, {
        stage: newStage,
        updatedAt: serverTimestamp(),
        ...(newStage === 'won' ? { convertedAt: serverTimestamp() } : {}),
      });

      await addDoc(collection(firestore, 'leads', lead.id, 'activities'), {
        leadId: lead.id,
        type: newStage === 'won' ? ACTIVITY_TYPES.CONVERSION : ACTIVITY_TYPES.STAGE_CHANGE,
        title: newStage === 'won' ? 'Lead converted to customer!' : 'Lead marked as lost',
        metadata: { fromStage: lead.stage, toStage: newStage },
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown',
        createdAt: serverTimestamp(),
      });

      setLead(prev => prev ? { ...prev, stage: newStage } : null);

      toast({
        title: newStage === 'won' ? 'Congratulations!' : 'Lead Marked as Lost',
        description: newStage === 'won' ? 'Lead has been converted to a customer.' : 'Lead has been marked as lost.',
      });
    } catch (err) {
      console.error("Error updating lead:", err);
      toast({ title: 'Error', description: 'Failed to update lead.', variant: 'destructive' });
    }
  };

  // Handle marking as spam and deleting
  const handleDeleteSpamLead = async () => {
    if (!firestore || !lead) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'leads', lead.id));

      toast({
        title: 'Lead Deleted',
        description: `"${lead.businessName}" has been marked as spam and deleted.`,
      });

      // Navigate back to leads list
      router.push('/leads');
    } catch (err) {
      console.error("Error deleting lead:", err);
      toast({
        title: 'Error',
        description: 'Failed to delete lead. Please try again.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

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
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!lead) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>The requested lead could not be found.</AlertDescription>
      </Alert>
    );
  }

  const stageColors = LEAD_STAGE_COLORS[lead.stage as LeadStage] || LEAD_STAGE_COLORS.new;
  const priorityColors = LEAD_PRIORITY_COLORS[lead.priority as LeadPriority] || LEAD_PRIORITY_COLORS.medium;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <CardTitle className="text-xl md:text-2xl">{lead.businessName}</CardTitle>
                <Badge className={cn(stageColors.bg, stageColors.text, stageColors.border)}>
                  {LEAD_STAGE_LABELS[lead.stage as LeadStage] || lead.stage}
                </Badge>
              </div>
              <CardDescription>
                {lead.contactName} &bull; Created {lead.createdAt ? format(lead.createdAt.toDate(), 'PPP') : 'N/A'}
              </CardDescription>
            </div>

            {lead.stage !== 'won' && lead.stage !== 'lost' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  onClick={() => handleMarkAsWonLost('won')}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Won
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
                  onClick={() => handleMarkAsWonLost('lost')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark as Lost
                </Button>
              </div>
            )}

            {/* Show Create Customer button for Won leads */}
            {lead.stage === 'won' && !lead.convertedToCustomerId && (
              <div className="flex flex-col gap-2">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Lead Won!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Create a customer subscription to start the ad workflow.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="default"
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => {
                    const params = new URLSearchParams({
                      email: lead.email || '',
                      name: lead.contactName || '',
                      businessName: lead.businessName || '',
                      phone: lead.phone || '',
                      leadId: lead.id,
                    });
                    router.push(`/manual-entry?${params.toString()}`);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Create Customer Subscription
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Score and Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lead Score</p>
                <p className="text-xl font-bold">{lead.score || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", priorityColors.bg)}>
                <TrendingUp className={cn("h-5 w-5", priorityColors.text)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <p className="text-xl font-bold">{LEAD_PRIORITY_LABELS[lead.priority as LeadPriority] || 'Medium'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Tag className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="text-xl font-bold">{LEAD_SOURCE_LABELS[lead.source as LeadSource] || 'Website'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Contact</p>
                <p className="text-xl font-bold">{getTimeSinceLastContact(lead.lastContactedAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
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
                    <a href={`mailto:${lead.email}`} className="font-medium text-primary hover:underline">
                      {lead.email}
                    </a>
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
                    {lead.siteCoverage.map((site: string) => (
                      <Badge key={site} variant="secondary">{site}</Badge>
                    ))}
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
              <Textarea
                placeholder="Enter your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
                {isAddingNote ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4" />
                )}
                Add Note
              </Button>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>History of all interactions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity, index) => {
                      const IconComponent = activityIcons[activity.type] || MessageSquare;
                      return (
                        <div key={activity.id} className="flex gap-4">
                          <div className="relative">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {index < activities.length - 1 && (
                              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{activity.title}</p>
                              <span className="text-xs text-muted-foreground">
                                {activity.createdAt && format(
                                  activity.createdAt.toDate ? activity.createdAt.toDate() : new Date(activity.createdAt),
                                  'MMM d, yyyy h:mm a'
                                )}
                              </span>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                {activity.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              by {activity.createdByName}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No activity recorded yet</p>
                    <p className="text-sm">Add a note or send an email to get started</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Email History */}
          <EmailHistoryDialog
            recipient={{ id: lead.id, email: lead.email }}
            isOpen={true}
            onOpenChange={() => {}}
            renderAsCard={true}
          />
        </div>

        {/* Sidebar - Right Side */}
        <div className="md:col-span-1 space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => setIsManualEmailDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href={`tel:${lead.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Lead
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Mark as Spam & Delete
              </Button>
            </CardContent>
          </Card>

          {/* Source Information */}
          {(lead.utmSource || lead.utmCampaign) && (
            <Card>
              <CardHeader>
                <CardTitle>Source Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {lead.utmSource && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source:</span>
                    <span>{lead.utmSource}</span>
                  </div>
                )}
                {lead.utmMedium && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medium:</span>
                    <span>{lead.utmMedium}</span>
                  </div>
                )}
                {lead.utmCampaign && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campaign:</span>
                    <span>{lead.utmCampaign}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Email Dialog */}
      <SendEmailDialog
        recipient={{
          id: lead.id,
          email: lead.email,
          contactName: lead.contactName,
          businessName: lead.businessName,
        }}
        recipientType="lead"
        isOpen={isManualEmailDialogOpen}
        onOpenChange={setIsManualEmailDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Spam & Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark &quot;{lead.businessName}&quot; as spam and permanently delete it? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteSpamLead}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
