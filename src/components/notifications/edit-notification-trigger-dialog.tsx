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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Loader2, X, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TRIGGER_TYPES, NotificationTrigger } from '@/app/(app)/notification-triggers/page';

const formSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    triggerType: z.string().min(1, 'Trigger type is required.'),
    emailAddresses: z.array(z.string().email('Invalid email address')).min(1, 'At least one email address is required.'),
    enabled: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

type EditNotificationTriggerDialogProps = {
    trigger: NotificationTrigger;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function EditNotificationTriggerDialog({ trigger, isOpen, onOpenChange }: EditNotificationTriggerDialogProps) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: trigger.name,
            triggerType: trigger.triggerType,
            emailAddresses: trigger.emailAddresses,
            enabled: trigger.enabled,
        },
    });

    // Reset form when trigger changes
    useEffect(() => {
        form.reset({
            name: trigger.name,
            triggerType: trigger.triggerType,
            emailAddresses: trigger.emailAddresses,
            enabled: trigger.enabled,
        });
        setEmailInput('');
        setEmailError(null);
    }, [trigger, form]);

    const emailAddresses = form.watch('emailAddresses');

    const addEmail = () => {
        const email = emailInput.trim().toLowerCase();
        if (!email) return;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }

        // Check for duplicates
        if (emailAddresses.includes(email)) {
            setEmailError('This email address is already added.');
            return;
        }

        form.setValue('emailAddresses', [...emailAddresses, email], { shouldValidate: true });
        setEmailInput('');
        setEmailError(null);
    };

    const removeEmail = (emailToRemove: string) => {
        form.setValue(
            'emailAddresses',
            emailAddresses.filter(email => email !== emailToRemove),
            { shouldValidate: true }
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEmail();
        }
    };

    async function onSubmit(values: FormData) {
        if (!firestore) return;

        setIsSubmitting(true);
        try {
            const triggerDocRef = doc(firestore, 'adminNotificationTriggers', trigger.id);

            await updateDoc(triggerDocRef, {
                name: values.name,
                triggerType: values.triggerType,
                emailAddresses: values.emailAddresses,
                enabled: values.enabled,
                updatedAt: Timestamp.now(),
            });

            toast({
                title: 'Notification Updated',
                description: `"${values.name}" has been successfully updated.`,
            });
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error updating notification trigger:', error);
            toast({
                title: 'Error',
                description: error.code === 'permission-denied'
                    ? 'Permission denied. You might need to be an admin.'
                    : 'Failed to update the notification trigger. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setEmailInput('');
                setEmailError(null);
            }
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Notification Trigger</DialogTitle>
                    <DialogDescription>
                        Modify the settings for this notification trigger.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notification Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., New Lead Alert" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        A friendly name to identify this notification.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="triggerType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Trigger Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select when to send notifications" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {TRIGGER_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The event that will trigger this notification.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="emailAddresses"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Email Recipients</FormLabel>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Input
                                                type="email"
                                                placeholder="Enter email address"
                                                value={emailInput}
                                                onChange={(e) => {
                                                    setEmailInput(e.target.value);
                                                    setEmailError(null);
                                                }}
                                                onKeyDown={handleKeyDown}
                                                className="flex-1"
                                            />
                                            <Button type="button" variant="secondary" onClick={addEmail}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {emailError && (
                                            <p className="text-sm text-destructive">{emailError}</p>
                                        )}
                                        {emailAddresses.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {emailAddresses.map((email) => (
                                                    <Badge key={email} variant="secondary" className="gap-1 pr-1">
                                                        {email}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeEmail(email)}
                                                            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                                        >
                                                            <X className="h-3 w-3" />
                                                            <span className="sr-only">Remove {email}</span>
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <FormDescription>
                                        Add one or more email addresses to receive this notification.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Enable Notifications</FormLabel>
                                        <FormDescription>
                                            Toggle to enable or disable this notification.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
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
