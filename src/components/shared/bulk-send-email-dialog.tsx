'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Send, Eye, ArrowLeft, Mail, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendEmail } from '@/lib/firebase/email';
import { generateEmailUrls, wrapEmailContent, replaceEmailPlaceholders, type EmailWrapperOptions } from '@/lib/email-utils';
import type { EmailTemplate } from '@/lib/email-templates';
import { EmailPreview } from '@/components/emails/email-preview';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_TYPES } from '@/lib/types';

const formSchema = z.object({
  templateId: z.string().min(1, 'You must select an email template.'),
});

/**
 * Common interface for email recipients - works with both leads and customers
 */
export interface BulkEmailRecipient {
  id: string;
  email: string;
  contactName: string;
  businessName?: string;
}

type SendStatus = 'pending' | 'sending' | 'success' | 'error';

interface RecipientStatus {
  recipient: BulkEmailRecipient;
  status: SendStatus;
  error?: string;
}

type BulkSendEmailDialogProps = {
  recipients: BulkEmailRecipient[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Type of recipient for tracking purposes */
  recipientType?: 'lead' | 'customer';
  /** Callback when all emails are sent */
  onComplete?: (results: { success: number; failed: number }) => void;
};

/**
 * Bulk email dialog component for sending emails to multiple leads/customers at once.
 * Sends personalized emails to each recipient with progress tracking.
 */
export function BulkSendEmailDialog({
  recipients,
  isOpen,
  onOpenChange,
  recipientType = 'lead',
  onComplete,
}: BulkSendEmailDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualTemplates, setManualTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<RecipientStatus[]>([]);
  const [isSending, setIsSending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: '',
    },
  });

  const selectedTemplateId = form.watch('templateId');

  // Use first recipient as preview sample
  const previewRecipient = recipients[0];

  // Compute preview content when template is selected
  const previewData = useMemo(() => {
    if (!selectedTemplateId || !previewRecipient) {
      return null;
    }

    const selectedTemplate = manualTemplates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      return null;
    }

    // Generate URLs for placeholders based on recipient type
    const urls = generateEmailUrls(
      recipientType === 'lead' ? previewRecipient.id : undefined,
      recipientType === 'customer' ? previewRecipient.id : undefined
    );

    // Replace placeholders in subject and content
    const subject = replaceEmailPlaceholders(selectedTemplate.subject, {
      contactName: previewRecipient.contactName,
      businessName: previewRecipient.businessName || '',
    });

    const html = replaceEmailPlaceholders(selectedTemplate.html, {
      contactName: previewRecipient.contactName,
      businessName: previewRecipient.businessName || '',
      pricingLink: urls.pricingLink,
      accountLink: urls.accountLink,
    });

    return {
      subject,
      html,
      wrapperOptions: {
        headerButton: recipientType === 'lead' ? 'get-started' : 'my-account',
        pricingLink: urls.pricingLink,
      } as EmailWrapperOptions,
    };
  }, [selectedTemplateId, manualTemplates, previewRecipient, recipientType]);

  useEffect(() => {
    if (firestore && isOpen) {
      setLoadingTemplates(true);
      const templatesQuery = query(
        collection(firestore, 'emailTemplates'),
        where('triggerName', '==', 'none')
      );
      getDocs(templatesQuery)
        .then((snapshot) => {
          const templatesData: EmailTemplate[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailTemplate));
          setManualTemplates(templatesData);
        })
        .catch(err => {
          console.error("Error fetching manual templates:", err);
          toast({ title: 'Error', description: 'Could not load manual email templates.', variant: 'destructive' });
        })
        .finally(() => setLoadingTemplates(false));
    }
  }, [firestore, isOpen, toast]);

  // Calculate progress
  const progress = useMemo(() => {
    if (sendingStatus.length === 0) return 0;
    const completed = sendingStatus.filter(s => s.status === 'success' || s.status === 'error').length;
    return Math.round((completed / sendingStatus.length) * 100);
  }, [sendingStatus]);

  const successCount = sendingStatus.filter(s => s.status === 'success').length;
  const errorCount = sendingStatus.filter(s => s.status === 'error').length;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user || recipients.length === 0) return;

    const selectedTemplate = manualTemplates.find(t => t.id === values.templateId);
    if (!selectedTemplate) {
      toast({ title: 'Error', description: 'Selected template not found.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setIsSubmitting(true);

    // Initialize status for all recipients
    const initialStatus: RecipientStatus[] = recipients.map(recipient => ({
      recipient,
      status: 'pending',
    }));
    setSendingStatus(initialStatus);

    let successTotal = 0;
    let failedTotal = 0;

    // Send emails one by one (to avoid overwhelming the system)
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Update status to sending
      setSendingStatus(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'sending' } : s
      ));

      try {
        // Generate URLs for placeholders based on recipient type
        const urls = generateEmailUrls(
          recipientType === 'lead' ? recipient.id : undefined,
          recipientType === 'customer' ? recipient.id : undefined
        );

        // Use centralized placeholder replacement
        const subject = replaceEmailPlaceholders(selectedTemplate.subject, {
          contactName: recipient.contactName,
          businessName: recipient.businessName || '',
        });

        let html = replaceEmailPlaceholders(selectedTemplate.html, {
          contactName: recipient.contactName,
          businessName: recipient.businessName || '',
          pricingLink: urls.pricingLink,
          accountLink: urls.accountLink,
        });

        // Wrap the email content in the professional email template
        html = wrapEmailContent(html, {
          headerButton: recipientType === 'lead' ? 'get-started' : 'my-account',
          pricingLink: urls.pricingLink,
        });

        await sendEmail(firestore, {
          to: recipient.email,
          subject,
          html,
        }, {
          recipientId: recipient.id,
          templateId: selectedTemplate.id,
          triggerType: 'bulk_manual_send',
        });

        // Log activity for the lead
        if (recipientType === 'lead') {
          await addDoc(collection(firestore, 'leads', recipient.id, 'activities'), {
            leadId: recipient.id,
            type: ACTIVITY_TYPES.EMAIL_SENT,
            title: `Bulk email sent: ${selectedTemplate.name}`,
            description: `Email "${subject}" sent via bulk action`,
            metadata: {
              templateId: selectedTemplate.id,
              templateName: selectedTemplate.name,
              subject,
              bulkSend: true,
            },
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Unknown',
            createdAt: serverTimestamp(),
          });
        }

        // Update status to success
        setSendingStatus(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'success' } : s
        ));
        successTotal++;
      } catch (error: any) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        // Update status to error
        setSendingStatus(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'error', error: error.message || 'Failed to send' } : s
        ));
        failedTotal++;
      }

      // Small delay between emails to prevent rate limiting
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setIsSubmitting(false);

    // Show completion toast
    if (failedTotal === 0) {
      toast({
        title: 'All Emails Sent',
        description: `Successfully sent ${successTotal} emails using "${selectedTemplate.name}".`,
      });
    } else {
      toast({
        title: 'Bulk Email Complete',
        description: `Sent ${successTotal} emails, ${failedTotal} failed.`,
        variant: failedTotal > 0 ? 'destructive' : 'default',
      });
    }

    onComplete?.({ success: successTotal, failed: failedTotal });
  }

  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false);
      // Reset state after closing
      setTimeout(() => {
        setSendingStatus([]);
        setIsSending(false);
        form.reset();
      }, 200);
    }
  };

  // Reset preview when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowPreview(false);
      setSendingStatus([]);
      setIsSending(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={showPreview || isSending ? "sm:max-w-4xl max-h-[90vh] overflow-hidden" : "sm:max-w-xl"}>
        {/* Sending Progress View */}
        {isSending ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Sending Bulk Email
              </DialogTitle>
              <DialogDescription>
                Sending emails to {recipients.length} {recipientType === 'lead' ? 'leads' : 'customers'}...
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  Total: {recipients.length}
                </Badge>
                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Sent: {successCount}
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200">
                    <XCircle className="h-3 w-3" />
                    Failed: {errorCount}
                  </Badge>
                )}
              </div>

              {/* Recipient list */}
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-2 space-y-1">
                  {sendingStatus.map((item, idx) => (
                    <div
                      key={item.recipient.id}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        item.status === 'sending' ? 'bg-blue-50' :
                        item.status === 'success' ? 'bg-green-50' :
                        item.status === 'error' ? 'bg-red-50' :
                        'bg-muted/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.recipient.contactName}</div>
                        <div className="text-muted-foreground text-xs truncate">{item.recipient.email}</div>
                      </div>
                      <div className="ml-2 shrink-0">
                        {item.status === 'pending' && <span className="text-muted-foreground">Waiting...</span>}
                        {item.status === 'sending' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                        {item.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {item.status === 'error' && (
                          <span className="text-red-600 text-xs">{item.error || 'Failed'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Done'}
              </Button>
            </DialogFooter>
          </>
        ) : showPreview && previewData ? (
          /* Preview View */
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Email Preview</DialogTitle>
                  <DialogDescription>
                    Preview using {previewRecipient?.contactName}'s data (will be personalized for each recipient)
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden -mx-6 -mb-6">
              <EmailPreview
                content={previewData.html}
                subject={previewData.subject}
                wrapperOptions={previewData.wrapperOptions}
                showToolbar={true}
                showSubject={true}
                maxHeight="calc(90vh - 180px)"
                className="rounded-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Edit
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send to {recipients.length} {recipientType === 'lead' ? 'Leads' : 'Customers'}
              </Button>
            </div>
          </>
        ) : (
          /* Template Selection View */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send Bulk Email
              </DialogTitle>
              <DialogDescription>
                Send an email to {recipients.length} selected {recipientType === 'lead' ? 'leads' : 'customers'}.
                Each email will be personalized with the recipient's name and business.
              </DialogDescription>
            </DialogHeader>

            {/* Selected recipients preview */}
            <div className="py-2">
              <div className="text-sm font-medium mb-2">Recipients ({recipients.length})</div>
              <ScrollArea className="h-[100px] border rounded-md">
                <div className="p-2 space-y-1">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center gap-2 text-sm py-1">
                      <Badge variant="outline" className="shrink-0">{recipient.contactName}</Badge>
                      <span className="text-muted-foreground truncate">{recipient.email}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Template</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingTemplates}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select a manual email template"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!loadingTemplates && manualTemplates.length === 0 && (
                            <SelectItem value="none" disabled>No manual templates found</SelectItem>
                          )}
                          {manualTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                  {previewData && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting || loadingTemplates || !selectedTemplateId}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    Send to {recipients.length} {recipientType === 'lead' ? 'Leads' : 'Customers'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
