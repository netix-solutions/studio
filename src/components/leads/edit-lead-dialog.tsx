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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Lead,
  LeadStage,
  LeadPriority,
  LeadSource,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_ORDER,
  LEAD_PRIORITY_LABELS,
  LEAD_SOURCE_LABELS,
  ACTIVITY_TYPES,
} from '@/lib/types';

const formSchema = z.object({
  // Contact information
  contactName: z.string().min(1, 'Contact name is required').max(100),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  businessName: z.string().min(1, 'Business name is required').max(100),

  // Lead details
  stage: z.string(),
  priority: z.string(),
  source: z.string(),

  // Value and notes
  estimatedValue: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type EditLeadDialogProps = {
  lead: Lead;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadUpdated?: (updatedLead: Partial<Lead>) => void;
};

export function EditLeadDialog({ lead, isOpen, onOpenChange, onLeadUpdated }: EditLeadDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactName: '',
      email: '',
      phone: '',
      businessName: '',
      stage: 'new',
      priority: 'medium',
      source: 'website',
      estimatedValue: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (lead) {
      form.reset({
        contactName: lead.contactName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        businessName: lead.businessName || '',
        stage: lead.stage || 'new',
        priority: lead.priority || 'medium',
        source: lead.source || 'website',
        estimatedValue: lead.estimatedValue || 0,
        notes: lead.notes || '',
      });
    }
  }, [lead, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !lead || !user) return;

    setIsSubmitting(true);
    try {
      const leadDocRef = doc(firestore, 'leads', lead.id);

      // Track what changed for activity log
      const changes: string[] = [];
      if (values.contactName !== lead.contactName) changes.push('contact name');
      if (values.email !== lead.email) changes.push('email');
      if (values.phone !== lead.phone) changes.push('phone');
      if (values.businessName !== lead.businessName) changes.push('business name');
      if (values.stage !== lead.stage) changes.push('stage');
      if (values.priority !== lead.priority) changes.push('priority');
      if (values.source !== lead.source) changes.push('source');
      if (values.estimatedValue !== lead.estimatedValue) changes.push('estimated value');
      if (values.notes !== lead.notes) changes.push('notes');

      // Update lead document
      await updateDoc(leadDocRef, {
        contactName: values.contactName,
        email: values.email,
        phone: values.phone || '',
        businessName: values.businessName,
        stage: values.stage,
        priority: values.priority,
        source: values.source,
        estimatedValue: values.estimatedValue || 0,
        notes: values.notes || '',
        updatedAt: serverTimestamp(),
      });

      // Log activity if there were changes
      if (changes.length > 0) {
        // Log stage change separately if it happened
        if (values.stage !== lead.stage) {
          await addDoc(collection(firestore, 'leads', lead.id, 'activities'), {
            leadId: lead.id,
            type: ACTIVITY_TYPES.STAGE_CHANGE,
            title: `Stage changed from ${LEAD_STAGE_LABELS[lead.stage as LeadStage]} to ${LEAD_STAGE_LABELS[values.stage as LeadStage]}`,
            metadata: { fromStage: lead.stage, toStage: values.stage },
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Unknown',
            createdAt: serverTimestamp(),
          });
        }

        // Log priority change separately if it happened
        if (values.priority !== lead.priority) {
          await addDoc(collection(firestore, 'leads', lead.id, 'activities'), {
            leadId: lead.id,
            type: ACTIVITY_TYPES.PRIORITY_CHANGE,
            title: `Priority changed from ${LEAD_PRIORITY_LABELS[lead.priority as LeadPriority]} to ${LEAD_PRIORITY_LABELS[values.priority as LeadPriority]}`,
            metadata: { fromPriority: lead.priority, toPriority: values.priority },
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Unknown',
            createdAt: serverTimestamp(),
          });
        }

        // Log general edit if other fields changed
        const otherChanges = changes.filter(c => c !== 'stage' && c !== 'priority');
        if (otherChanges.length > 0) {
          await addDoc(collection(firestore, 'leads', lead.id, 'activities'), {
            leadId: lead.id,
            type: ACTIVITY_TYPES.NOTE,
            title: 'Lead information updated',
            description: `Updated fields: ${otherChanges.join(', ')}`,
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Unknown',
            createdAt: serverTimestamp(),
          });
        }
      }

      // Notify parent of update
      if (onLeadUpdated) {
        onLeadUpdated({
          ...values,
          stage: values.stage as LeadStage,
          priority: values.priority as LeadPriority,
          source: values.source as LeadSource,
        });
      }

      toast({
        title: 'Lead Updated',
        description: `${values.businessName} has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lead. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update information for {lead.businessName}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="text-base font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />

            <h3 className="text-base font-semibold">Lead Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_STAGE_ORDER.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {LEAD_STAGE_LABELS[stage]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="estimatedValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this lead..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
