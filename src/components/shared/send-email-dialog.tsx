
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
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Send, Eye, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendEmail } from '@/lib/firebase/email';
import { generateEmailUrls, wrapEmailContent, replaceEmailPlaceholders, type EmailWrapperOptions } from '@/lib/email-utils';
import type { EmailTemplate } from '@/lib/email-templates';
import { EmailPreview } from '@/components/emails/email-preview';

/** Special template ID for ad proof approval - handled via API */
const AD_PROOF_APPROVAL_ID = '__ad_proof_approval__';

/**
 * Advertisement info for sending ad proof approval emails
 */
export interface AdvertisementInfo {
  id: string;
  userId: string;
  adProofUrl?: string;
  adProofDestinationUrl?: string;
}

const formSchema = z.object({
  templateId: z.string().min(1, 'You must select an email template.'),
});

/**
 * Common interface for email recipients - works with both leads and customers
 */
export interface EmailRecipient {
  id: string;
  email: string;
  contactName: string;
  businessName?: string;
}

type SendEmailDialogProps = {
  recipient: EmailRecipient;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Type of recipient for tracking purposes */
  recipientType?: 'lead' | 'customer';
  /** Advertisement info for sending ad proof approval emails */
  advertisement?: AdvertisementInfo;
};

/**
 * Unified email dialog component for sending manual emails to both leads and customers.
 * This component consolidates the previously separate SendManualEmailDialog and SendCustomerEmailDialog.
 *
 * If an advertisement with an adProofUrl is provided, it also offers the option to send
 * an ad proof approval email via the dedicated API endpoint.
 */
export function SendEmailDialog({
  recipient,
  isOpen,
  onOpenChange,
  recipientType = 'customer',
  advertisement,
}: SendEmailDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualTemplates, setManualTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Check if ad proof approval email can be sent
  const canSendAdProofApproval = advertisement?.adProofUrl && advertisement?.adProofDestinationUrl;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: '',
    },
  });

  const selectedTemplateId = form.watch('templateId');

  // Compute preview content when template is selected
  const previewData = useMemo(() => {
    if (!selectedTemplateId || selectedTemplateId === AD_PROOF_APPROVAL_ID) {
      return null;
    }

    const selectedTemplate = manualTemplates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      return null;
    }

    // Generate URLs for placeholders based on recipient type
    const urls = generateEmailUrls(
      recipientType === 'lead' ? recipient.id : undefined,
      recipientType === 'customer' ? recipient.id : undefined
    );

    // Replace placeholders in subject and content
    const subject = replaceEmailPlaceholders(selectedTemplate.subject, {
      contactName: recipient.contactName,
      businessName: recipient.businessName || '',
    });

    const html = replaceEmailPlaceholders(selectedTemplate.html, {
      contactName: recipient.contactName,
      businessName: recipient.businessName || '',
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
  }, [selectedTemplateId, manualTemplates, recipient, recipientType]);

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


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !recipient) return;

    setIsSubmitting(true);
    try {
      // Handle ad proof approval via dedicated API
      if (values.templateId === AD_PROOF_APPROVAL_ID) {
        if (!advertisement) {
          throw new Error("Advertisement information is required for ad proof approval.");
        }

        const response = await fetch('/api/send-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adId: advertisement.id,
            userId: advertisement.userId,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to send approval email');
        }

        const data = await response.json();

        toast({
          title: 'Approval Email Sent',
          description: `Ad proof approval request sent to ${recipient.email}.`,
        });
        onOpenChange(false);
        form.reset();
        return;
      }

      // Handle regular email templates
      const selectedTemplate = manualTemplates.find(t => t.id === values.templateId);
      if (!selectedTemplate) {
        throw new Error("Selected template not found.");
      }

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
      // Use appropriate header button based on recipient type
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
        triggerType: 'manual_send',
      });

      toast({
        title: 'Email Queued',
        description: `"${selectedTemplate.name}" is being sent to ${recipient.email}.`,
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error sending manual email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send the email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reset preview when dialog closes or template changes
  useEffect(() => {
    if (!isOpen) {
      setShowPreview(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={showPreview ? "sm:max-w-4xl max-h-[90vh] overflow-hidden" : "sm:max-w-xl"}>
        {showPreview && previewData ? (
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
                    Preview of email to {recipient.contactName} ({recipient.email})
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
                Send Email
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Manual Email</DialogTitle>
              <DialogDescription>
                Send a follow-up email to {recipient.contactName} ({recipient.email}).
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
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
                          {!loadingTemplates && manualTemplates.length === 0 && !canSendAdProofApproval && (
                            <SelectItem value="none" disabled>No manual templates found</SelectItem>
                          )}
                          {canSendAdProofApproval && (
                            <SelectItem value={AD_PROOF_APPROVAL_ID} className="font-medium">
                              <span className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Ad Proof for Your Approval
                              </span>
                            </SelectItem>
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
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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
                  <Button type="submit" disabled={isSubmitting || loadingTemplates}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Email
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
