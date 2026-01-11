import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { Loader2, Calendar, Trash2, Clock, Mail, AlertCircle, RefreshCw } from 'lucide-react';
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

interface ScheduledEmail {
  id: string;
  leadId: string;
  templateId: string;
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped' | 'cancelled';
  notes?: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
  skipReason?: string;
}

interface ScheduledLeadEmailsListProps {
  leadId: string;
}

export function ScheduledLeadEmailsList({ leadId }: ScheduledLeadEmailsListProps) {
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { auth } = useFirebase();

  const fetchScheduledEmails = async (showLoading = true) => {
    if (!auth?.currentUser) return;

    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/schedule-lead-email?leadId=${leadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scheduled emails');
      }

      const data = await response.json();
      setScheduledEmails(data.scheduledEmails || []);
    } catch (error: any) {
      console.error('Error fetching scheduled emails:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load scheduled emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScheduledEmails();
  }, [leadId, auth]);

  const handleCancelEmail = async (emailId: string) => {
    if (!auth?.currentUser) return;

    setIsDeleting(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/schedule-lead-email?emailId=${emailId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel email');
      }

      toast({
        title: 'Email Cancelled',
        description: 'The scheduled email has been cancelled.',
      });

      // Refresh the list
      fetchScheduledEmails(false);
      setEmailToDelete(null);
    } catch (error: any) {
      console.error('Error cancelling email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel email',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: ScheduledEmail['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scheduled Emails</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Scheduled Emails</CardTitle>
              <CardDescription>
                Automated emails scheduled to be sent to this lead
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchScheduledEmails(false)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scheduledEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No scheduled emails for this lead</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(email.status)}
                      <span className="text-sm font-medium">
                        Template: {email.templateId}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Scheduled: {format(new Date(email.scheduledFor), 'PPP p')}
                        </span>
                      </div>
                      
                      {email.sentAt && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            Sent: {format(new Date(email.sentAt), 'PPP p')}
                          </span>
                        </div>
                      )}
                      
                      {email.notes && (
                        <div className="mt-2 text-xs bg-muted/50 p-2 rounded">
                          {email.notes}
                        </div>
                      )}
                      
                      {email.error && (
                        <div className="flex items-center gap-2 text-destructive mt-2">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs">{email.error}</span>
                        </div>
                      )}
                      
                      {email.skipReason && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Skipped: {email.skipReason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {email.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setEmailToDelete(email.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!emailToDelete} onOpenChange={() => setEmailToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this scheduled email? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Email</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => emailToDelete && handleCancelEmail(emailToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
