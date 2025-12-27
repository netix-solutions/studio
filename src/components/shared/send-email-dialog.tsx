
'use client';
import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendEmail } from '@/lib/firebase/email';
import { generateEmailUrls, wrapEmailContent, replaceEmailPlaceholders } from '@/lib/email-utils';
import type { EmailTemplate } from '@/lib/email-templates';

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
};

/**
 * Unified email dialog component for sending manual emails to both leads and customers.
 * This component consolidates the previously separate SendManualEmailDialog and SendCustomerEmailDialog.
 */
export function SendEmailDialog({
  recipient,
  isOpen,
  onOpenChange,
  recipientType = 'customer'
}: SendEmailDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualTemplates, setManualTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: '',
    },
  });

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
      html = wrapEmailContent(html);

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
        description: 'Failed to send the manual email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
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
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting || loadingTemplates}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Email
                    </Button>
                </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
