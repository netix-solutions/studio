
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, Info } from 'lucide-react';
import type { EmailTemplate } from '@/app/(app)/automated-emails/page';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  subject: z.string().min(1, 'Subject cannot be empty.'),
  html: z.string().min(1, 'HTML body cannot be empty.'),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      html: '',
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        subject: template.subject,
        html: template.html,
      });
    }
  }, [template, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !template) return;

    setIsSubmitting(true);
    try {
      const templateDocRef = doc(firestore, 'emailTemplates', template.id);
      
      await setDoc(templateDocRef, {
        subject: values.subject,
        html: values.html,
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit: {template.name}</DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
            <div className="md:col-span-1 space-y-4">
                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                           <Info className="h-4 w-4" /> Trigger
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {template.triggerDescription || 'Trigger not specified.'}
                        </p>
                    </CardContent>
                </Card>

                {template.placeholders && template.placeholders.length > 0 && (
                     <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Placeholders</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <ul className="space-y-2 text-sm">
                                {template.placeholders.map((p) => (
                                    <li key={p.key}>
                                        <code className="font-mono text-xs bg-muted p-1 rounded">{p.key}</code>
                                        <p className="text-muted-foreground text-xs">{p.description}</p>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
            <div className="md:col-span-2">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
                        <FormLabel>Email Body (HTML)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="<p>Your HTML content here.</p>" {...field} rows={15} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </form>
                </Form>
             </div>
        </div>
        <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
