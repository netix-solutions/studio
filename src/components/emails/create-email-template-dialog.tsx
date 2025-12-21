'use client';
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RichTextEditor } from '../ui/rich-text-editor';

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      subject: '',
      html: '<p>Your email content here.</p>',
      triggerName: 'none',
    },
  });

  const nameValue = form.watch('name');
  useState(() => {
    if(nameValue) {
        const slug = nameValue.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        form.setValue('id', slug, { shouldValidate: true });
    }
  });

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
        // For new templates, placeholders would need to be defined here if any
        // For now, we'll leave it empty.
        placeholders: [], 
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Email Template</DialogTitle>
          <DialogDescription>
            Define a new automated email template for your application.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Welcome Email" {...field} 
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
                                <Input placeholder="auto-generated-slug" {...field} />
                            </FormControl>
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
                            <Textarea placeholder="Describe when this email is sent and what it's for." {...field} />
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
                            <RichTextEditor content={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Template
                    </Button>
                </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
