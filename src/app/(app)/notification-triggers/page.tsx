'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, PlusCircle, Bell, BellOff, Trash2, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { CreateNotificationTriggerDialog } from '@/components/notifications/create-notification-trigger-dialog';
import { EditNotificationTriggerDialog } from '@/components/notifications/edit-notification-trigger-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface NotificationTrigger {
    id: string;
    name: string;
    triggerType: string;
    emailAddresses: string[];
    enabled: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export const TRIGGER_TYPES = [
    { value: 'new_lead', label: 'New Lead', description: 'When a new lead submits the interest form' },
    { value: 'new_payment', label: 'New Payment', description: 'When a customer makes a payment' },
    { value: 'subscription_created', label: 'Subscription Created', description: 'When a new subscription is created' },
    { value: 'subscription_cancelled', label: 'Subscription Cancelled', description: 'When a subscription is cancelled' },
    { value: 'ad_submitted', label: 'Ad Details Submitted', description: 'When a customer submits their ad details' },
    { value: 'ad_approved', label: 'Ad Approved', description: 'When an ad is approved and goes live' },
] as const;

export type TriggerType = typeof TRIGGER_TYPES[number]['value'];

export function getTriggerTypeLabel(type: string): string {
    const triggerType = TRIGGER_TYPES.find(t => t.value === type);
    return triggerType?.label || type;
}

export default function NotificationTriggersPage() {
    const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedTrigger, setSelectedTrigger] = useState<NotificationTrigger | null>(null);
    const [triggerToDelete, setTriggerToDelete] = useState<NotificationTrigger | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const triggersQuery = query(collection(firestore, 'adminNotificationTriggers'));

        const unsubscribe = onSnapshot(triggersQuery, (snapshot) => {
            const triggersData: NotificationTrigger[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as NotificationTrigger));
            setTriggers(triggersData);
            setLoading(false);
            setError(null);
        }, (err) => {
            const permissionError = new FirestorePermissionError({
                path: '/adminNotificationTriggers',
                operation: 'list',
            } satisfies SecurityRuleContext);

            errorEmitter.emit('permission-error', permissionError);

            setError("You do not have permission to view this data. Please contact an administrator to be granted the 'admin' role.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleEditTrigger = (trigger: NotificationTrigger) => {
        setSelectedTrigger(trigger);
        setIsEditDialogOpen(true);
    };

    const handleToggleEnabled = async (trigger: NotificationTrigger) => {
        if (!firestore) return;

        try {
            const triggerRef = doc(firestore, 'adminNotificationTriggers', trigger.id);
            await updateDoc(triggerRef, {
                enabled: !trigger.enabled,
                updatedAt: Timestamp.now(),
            });
            toast({
                title: trigger.enabled ? "Notifications Disabled" : "Notifications Enabled",
                description: `"${trigger.name}" has been ${trigger.enabled ? 'disabled' : 'enabled'}.`,
            });
        } catch (error: any) {
            console.error("Error toggling trigger:", error);
            toast({
                title: "Error",
                description: "Could not update the notification trigger.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteTrigger = async () => {
        if (!firestore || !triggerToDelete) return;

        setIsDeleting(true);
        try {
            const triggerRef = doc(firestore, 'adminNotificationTriggers', triggerToDelete.id);
            await deleteDoc(triggerRef);
            toast({
                title: "Trigger Deleted",
                description: `"${triggerToDelete.name}" has been deleted.`,
            });
        } catch (error: any) {
            console.error("Error deleting trigger:", error);
            toast({
                title: "Error",
                description: "Could not delete the notification trigger.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
            setTriggerToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Admin Notification Triggers</CardTitle>
                        <CardDescription>
                            Configure which events trigger email notifications to admin email addresses.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Notification
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading && (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {!loading && error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Access Denied</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!loading && !error && (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Status</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Trigger Type</TableHead>
                                        <TableHead>Email Recipients</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {triggers.length > 0 ? triggers.map((trigger) => (
                                        <TableRow key={trigger.id}>
                                            <TableCell>
                                                <Switch
                                                    checked={trigger.enabled}
                                                    onCheckedChange={() => handleToggleEnabled(trigger)}
                                                    aria-label={trigger.enabled ? "Disable notifications" : "Enable notifications"}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {trigger.enabled ? (
                                                        <Bell className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <BellOff className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {trigger.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {getTriggerTypeLabel(trigger.triggerType)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {trigger.emailAddresses.slice(0, 2).map((email, idx) => (
                                                        <Badge key={idx} variant="outline" className="font-normal">
                                                            {email}
                                                        </Badge>
                                                    ))}
                                                    {trigger.emailAddresses.length > 2 && (
                                                        <Badge variant="outline" className="font-normal">
                                                            +{trigger.emailAddresses.length - 2} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditTrigger(trigger)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setTriggerToDelete(trigger)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <Bell className="h-8 w-8" />
                                                    <p>No notification triggers configured.</p>
                                                    <p className="text-sm">Click "Add Notification" to get started.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>About Notification Triggers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Notification triggers allow you to receive email alerts when certain events occur in the system.
                        Configure the trigger type and specify which email addresses should receive the notification.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {TRIGGER_TYPES.map((type) => (
                            <div key={type.value} className="rounded-lg border p-3">
                                <p className="font-medium text-sm">{type.label}</p>
                                <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <CreateNotificationTriggerDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

            {selectedTrigger && (
                <EditNotificationTriggerDialog
                    trigger={selectedTrigger}
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                />
            )}

            <AlertDialog open={!!triggerToDelete} onOpenChange={(open) => !open && setTriggerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Notification Trigger</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{triggerToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTrigger}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
