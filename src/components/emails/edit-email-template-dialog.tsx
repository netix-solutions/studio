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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, Info, Eye, Pencil, Columns, Maximize2 } from 'lucide-react';
import type { EmailTemplate } from '@/lib/email-templates';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { EmailEditor } from '../ui/email-editor';
import { EmailPreview } from './email-preview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Toggle } from '../ui/toggle';

const formSchema = z.object({
  subject: z.string().min(1, 'Subject cannot be empty.'),
  html: z.string().min(1, 'HTML body cannot be empty.'),
  triggerName: z.string().optional(),
});

type EditEmailTemplateDialogProps = {
  template: EmailTemplate;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function EditEmailTemplateDialog({ template, isOpen, onOpenChange }: EditEmailTemplateDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [currentHtml, setCurrentHtml] = useState(template.html);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      html: '',
      triggerName: 'none',
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        subject: template.subject,
        html: template.html,
        triggerName: template.triggerName || 'none',
      });
      setCurrentHtml(template.html);
    }
  }, [template, form]);

  // Watch for HTML changes
  const watchedHtml = form.watch('html');
  useEffect(() => {
    setCurrentHtml(watchedHtml);
  }, [watchedHtml]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !template) return;

    setIsSubmitting(true);
    try {
      const templateDocRef = doc(firestore, 'emailTemplates', template.id);

      await setDoc(templateDocRef, {
        subject: values.subject,
        html: values.html,
        triggerName: values.triggerName,
      }, { merge: true });

      toast({
        title: 'Template Updated',
        description: `The "${template.name}" template has been successfully updated.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the email template. Please try again.',
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
              <DialogTitle className="text-xl">{template.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {template.description}
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
                <div className="px-4 py-2 bg-muted/30 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">Editor</span>
                  {template.triggerName && template.triggerName !== 'none' && (
                    <Badge variant="default" className="bg-green-600 text-xs">Automated</Badge>
                  )}
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <Form {...form}>
                      <form className="space-y-4">
                        {/* Template Info Cards */}
                        <div className="grid grid-cols-2 gap-3">
                          <Card className="bg-muted/30">
                            <CardHeader className="p-3 pb-1">
                              <CardTitle className="text-xs font-medium flex items-center gap-1">
                                <Info className="h-3 w-3" /> Trigger
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.triggerDescription || 'Manual send only'}
                              </p>
                            </CardContent>
                          </Card>

                          {template.placeholders && template.placeholders.length > 0 && (
                            <Card className="bg-muted/30">
                              <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium">Placeholders</CardTitle>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <div className="flex flex-wrap gap-1">
                                  {template.placeholders.slice(0, 3).map((p: { key: string; description: string }) => (
                                    <code key={p.key} className="text-[10px] bg-muted px-1 py-0.5 rounded">
                                      {p.key}
                                    </code>
                                  ))}
                                  {template.placeholders.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{template.placeholders.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>

                        <FormField
                          control={form.control}
                          name="triggerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Trigger</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                                  placeholders={template.placeholders}
                                  minHeight="350px"
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
                    subject={form.watch('subject')}
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
