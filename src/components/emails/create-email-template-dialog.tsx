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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, Eye, Pencil, Columns } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { EmailEditor } from '../ui/email-editor';
import { EmailPreview } from './email-preview';
import { ScrollArea } from '../ui/scroll-area';
import { Toggle } from '../ui/toggle';

const defaultEmailContent = `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hi {{contactName}},</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Your email content here.</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>`;

// Default placeholders for new templates
const defaultPlaceholders = [
  { key: '{{contactName}}', description: "The recipient's name" },
  { key: '{{businessName}}', description: "The business name" },
];

const formSchema = z.object({
  id: z.string().min(3, 'ID must be at least 3 characters.').regex(/^[a-z0-9_]+$/, 'ID can only contain lowercase letters, numbers, and underscores.'),
  name: z.string().min(1, 'Name cannot be empty.'),
  description: z.string().min(1, 'Description cannot be empty.'),
  subject: z.string().min(1, 'Subject cannot be empty.'),
  html: z.string().min(1, 'HTML body cannot be empty.'),
  triggerName: z.string().optional(),
});

type CreateEmailTemplateDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function CreateEmailTemplateDialog({ isOpen, onOpenChange }: CreateEmailTemplateDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [currentHtml, setCurrentHtml] = useState(defaultEmailContent);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      subject: '',
      html: defaultEmailContent,
      triggerName: 'none',
    },
  });

  // Watch for HTML changes
  const watchedHtml = form.watch('html');
  useEffect(() => {
    setCurrentHtml(watchedHtml);
  }, [watchedHtml]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        id: '',
        name: '',
        description: '',
        subject: '',
        html: defaultEmailContent,
        triggerName: 'none',
      });
      setCurrentHtml(defaultEmailContent);
    }
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    setIsSubmitting(true);
    try {
      const templateDocRef = doc(firestore, 'emailTemplates', values.id);

      await setDoc(templateDocRef, {
        id: values.id,
        name: values.name,
        description: values.description,
        subject: values.subject,
        html: values.html,
        triggerName: values.triggerName,
        placeholders: defaultPlaceholders,
      });

      toast({
        title: 'Template Created',
        description: `The "${values.name}" template has been successfully created.`,
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: error.code === 'permission-denied' ? 'Permission denied. You might need to be an admin.' : 'Failed to create the email template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Create New Email Template</DialogTitle>
              <DialogDescription className="mt-1">
                Define a new email template with rich formatting and live preview.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md mr-4">
                <Toggle
                  size="sm"
                  pressed={viewMode === 'editor'}
                  onPressedChange={() => setViewMode('editor')}
                  className="rounded-r-none"
                  title="Editor Only"
                >
                  <Pencil className="h-4 w-4" />
                </Toggle>
                <Toggle
                  size="sm"
                  pressed={viewMode === 'split'}
                  onPressedChange={() => setViewMode('split')}
                  title="Split View"
                >
                  <Columns className="h-4 w-4" />
                </Toggle>
                <Toggle
                  size="sm"
                  pressed={viewMode === 'preview'}
                  onPressedChange={() => setViewMode('preview')}
                  className="rounded-l-none"
                  title="Preview Only"
                >
                  <Eye className="h-4 w-4" />
                </Toggle>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className={`h-full grid ${viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} gap-0`}>
            {/* Editor Panel */}
            {(viewMode === 'editor' || viewMode === 'split') && (
              <div className="flex flex-col border-r overflow-hidden">
                <div className="px-4 py-2 bg-muted/30 border-b">
                  <span className="text-sm font-medium">Editor</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <Form {...form}>
                      <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Welcome Email"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      const slug = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                      form.setValue('id', slug, { shouldValidate: true });
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="auto_generated_slug" {...field} />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Auto-generated from name
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe when this email is sent and what it's for."
                                  className="resize-none"
                                  rows={2}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="triggerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Trigger</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a trigger" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None (Manual Send Only)</SelectItem>
                                  <SelectItem value="interest_form_submission">Interest Form Submission</SelectItem>
                                  <SelectItem value="new_subscription_purchase">New Subscription Purchase</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Subject</FormLabel>
                              <FormControl>
                                <Input placeholder="Your email subject" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="html"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Body</FormLabel>
                              <FormControl>
                                <EmailEditor
                                  content={field.value}
                                  onChange={field.onChange}
                                  placeholders={defaultPlaceholders}
                                  minHeight="300px"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Preview Panel */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="flex flex-col overflow-hidden bg-zinc-50">
                <div className="px-4 py-2 bg-muted/30 border-b">
                  <span className="text-sm font-medium">Live Preview</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <EmailPreview
                    content={currentHtml}
                    subject={form.watch('subject') || 'Email Subject'}
                    showToolbar={true}
                    maxHeight="calc(100vh - 280px)"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
