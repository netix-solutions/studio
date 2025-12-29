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
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  BILLING_PERIOD_LABELS,
  PAYMENT_METHOD_LABELS,
  type BillingPeriod,
  type PaymentMethod,
} from '@/lib/types';

const subscriptionStatuses = ['active', 'trialing', 'canceled', 'unpaid', 'past_due', 'incomplete'] as const;

const formSchema = z.object({
  // Plan details
  planName: z.string().min(1, 'Plan name is required').max(100),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  status: z.enum(subscriptionStatuses),

  // Period dates
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Manual entry fields
  billingPeriod: z.enum(['monthly', 'quarterly', 'yearly', 'one_time', 'custom']).optional(),
  paymentMethod: z.enum(['cash', 'check', 'invoice', 'bank_transfer', 'credit_card_offline', 'other']).optional(),
  paymentNotes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubscriptionData {
  id: string;
  customerId: string;
  plan: string;
  status: string;
  amount: number;
  startDate: string;
  endDate: string;
  // Raw subscription data for manual entry fields
  isManualEntry?: boolean;
  billingPeriod?: BillingPeriod;
  paymentMethod?: PaymentMethod;
  paymentNotes?: string;
  // Raw timestamps for date editing
  created?: { seconds: number };
  current_period_end?: { seconds: number };
}

type EditSubscriptionDialogProps = {
  subscription: SubscriptionData;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdate?: () => void;
};

// Helper to format date for input[type="date"]
function formatDateForInput(dateString: string): string {
  try {
    // Parse the formatted date (e.g., "January 1, 2024") back to a date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// Helper to create Firestore timestamp from date string
function dateStringToTimestamp(dateString: string): Timestamp | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return Timestamp.fromDate(date);
}

export function EditSubscriptionDialog({
  subscription,
  isOpen,
  onOpenChange,
  onUpdate
}: EditSubscriptionDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planName: '',
      amount: 0,
      status: 'active',
      startDate: '',
      endDate: '',
      billingPeriod: undefined,
      paymentMethod: undefined,
      paymentNotes: '',
    },
  });

  useEffect(() => {
    if (subscription && isOpen) {
      form.reset({
        planName: subscription.plan || '',
        amount: subscription.amount || 0,
        status: subscription.status as typeof subscriptionStatuses[number] || 'active',
        startDate: formatDateForInput(subscription.startDate),
        endDate: formatDateForInput(subscription.endDate),
        billingPeriod: subscription.billingPeriod,
        paymentMethod: subscription.paymentMethod,
        paymentNotes: subscription.paymentNotes || '',
      });
    }
  }, [subscription, isOpen, form]);

  async function onSubmit(values: FormValues) {
    if (!firestore || !subscription) return;

    setIsSubmitting(true);
    try {
      const subDocRef = doc(
        firestore,
        'customers',
        subscription.customerId,
        'subscriptions',
        subscription.id
      );

      // Build the update object
      const updateData: Record<string, any> = {
        status: values.status,
        updatedAt: serverTimestamp(),
      };

      // Handle plan name and amount
      // For Stripe subscriptions, we store in items array; for manual, in root fields
      if (subscription.isManualEntry) {
        updateData.planName = values.planName;
        updateData.amount = values.amount;
        updateData.billingPeriod = values.billingPeriod || null;
        updateData.paymentMethod = values.paymentMethod || null;
        updateData.paymentNotes = values.paymentNotes || null;
      } else {
        // For Stripe subscriptions, update items array structure
        updateData.items = [{
          price: {
            id: 'manual_override',
            unit_amount: Math.round(values.amount * 100), // Convert to cents
            product: { name: values.planName },
          },
        }];
      }

      // Handle dates
      if (values.startDate) {
        updateData.created = dateStringToTimestamp(values.startDate);
      }
      if (values.endDate) {
        updateData.current_period_end = dateStringToTimestamp(values.endDate);
      }

      await updateDoc(subDocRef, updateData);

      toast({
        title: 'Subscription Updated',
        description: `Subscription has been updated successfully.`,
      });

      onOpenChange(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription. Please try again.',
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
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update subscription details for this customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <h3 className="text-lg font-semibold">Plan Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Premium Plan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="99.99"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trialing">Trialing</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="incomplete">Incomplete</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Period</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
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

            <Separator className="my-6" />

            <h3 className="text-lg font-semibold">Subscription Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6" />

            <h3 className="text-lg font-semibold">Payment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
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
              name="paymentNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about payment..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
