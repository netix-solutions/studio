import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Loader2, Calendar, Clock } from 'lucide-react';
import type { EmailTemplate } from '@/lib/email-templates';

interface Lead {
  id: string;
  email: string;
  contactName: string;
  businessName?: string;
}

interface ScheduleLeadEmailDialogProps {
  lead: Lead;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleLeadEmailDialog({
  lead,
  isOpen,
  onOpenChange,
}: ScheduleLeadEmailDialogProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { firestore, auth } = useFirebase();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Load email templates
  useEffect(() => {
    if (!firestore || !isOpen) return;

    const templatesQuery = query(collection(firestore, 'emailTemplates'));
    const unsubscribe = onSnapshot(templatesQuery, (snapshot) => {
      const templatesData: EmailTemplate[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmailTemplate));
      
      // Filter to manual templates suitable for leads
      const manualTemplates = templatesData.filter(t => 
        !t.triggerName || t.triggerName === 'none'
      );
      
      setTemplates(manualTemplates);
      setLoadingTemplates(false);
    }, (error) => {
      console.error('Error loading templates:', error);
      setLoadingTemplates(false);
    });

    return () => unsubscribe();
  }, [firestore, isOpen]);

  // Set default date/time to 1 hour from now
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      
      setScheduledDate(dateStr);
      setScheduledTime(timeStr);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplateId) {
      toast({
        title: 'Error',
        description: 'Please select an email template.',
        variant: 'destructive',
      });
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast({
        title: 'Error',
        description: 'Please select a date and time.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time into ISO string
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      // Get auth token
      const user = auth?.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/schedule-lead-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadId: lead.id,
          templateId: selectedTemplateId,
          scheduledFor,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to schedule email');
      }

      const data = await response.json();

      toast({
        title: 'Email Scheduled',
        description: `Email scheduled to be sent on ${new Date(data.scheduledFor).toLocaleString()}.`,
      });

      // Reset form
      setSelectedTemplateId('');
      setNotes('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error scheduling email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule email',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Email to Lead</DialogTitle>
          <DialogDescription>
            Schedule an automated email to be sent to {lead.contactName} ({lead.email}) at a specific date and time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Email Template *</Label>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedTemplate && (
              <p className="text-sm text-muted-foreground">
                {selectedTemplate.description}
              </p>
            )}
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Preview of scheduled time */}
          {scheduledDate && scheduledTime && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <strong>Scheduled for:</strong>{' '}
                {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this scheduled email..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Email'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
