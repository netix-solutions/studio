
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, Unsubscribe, doc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MoreHorizontal, History, Trash2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { EmailHistoryDialog } from '@/components/emails/email-history-dialog';
import { useToast } from '@/hooks/use-toast';

export interface AppUser {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: 'user' | 'admin' | null;
    [key: string]: any; // Allow other properties
}

export default function UsersPage() {
    const [rawUsers, setRawUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { firestore, firebaseApp } = useFirebase();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [adminRoles, setAdminRoles] = useState<{[key: string]: boolean}>({});
    const [isSyncingClaims, setIsSyncingClaims] = useState(false);
    const [deleteConfirmUser, setDeleteConfirmUser] = useState<AppUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync admin claims for all existing admins
    const handleSyncAdminClaims = async () => {
        if (!firebaseApp) return;

        setIsSyncingClaims(true);
        try {
            const functions = getFunctions(firebaseApp);
            const syncClaims = httpsCallable(functions, 'syncAllAdminClaims');
            const result = await syncClaims();
            const data = result.data as { success: boolean; totalAdmins: number; results: any[] };

            toast({
                title: 'Admin Claims Synced',
                description: `Successfully synced claims for ${data.totalAdmins} admin(s). Please sign out and back in for changes to take effect.`,
            });
        } catch (err: any) {
            console.error('Error syncing admin claims:', err);
            toast({
                title: 'Sync Failed',
                description: err.message || 'Failed to sync admin claims.',
                variant: 'destructive',
            });
        } finally {
            setIsSyncingClaims(false);
        }
    };

    // Subscribe to admin roles separately
    useEffect(() => {
        if (!firestore) return;

        const adminQuery = query(collection(firestore, 'roles_admin'));
        const unsubscribeAdmins = onSnapshot(adminQuery, (snapshot) => {
            const adminData: {[key: string]: boolean} = {};
            snapshot.docs.forEach(doc => {
                adminData[doc.id] = true;
            });
            setAdminRoles(adminData);
        });

        return () => unsubscribeAdmins();
    }, [firestore]);

    // Subscribe to users separately (no dependency on adminRoles)
    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const usersQuery = query(collection(firestore, 'users'));

        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRawUsers(usersData);
            setLoading(false);
            setError(null);
        }, (err) => {
            const permissionError = new FirestorePermissionError({
                path: '/users',
                operation: 'list',
            } satisfies SecurityRuleContext);

            errorEmitter.emit('permission-error', permissionError);

            setError("You do not have permission to view this data. Please contact an administrator to be granted the 'admin' role.");
            setLoading(false);
        });

        return () => unsubscribeUsers();
    }, [firestore]);

    // Compute users with roles at render time to avoid race conditions
    const users: AppUser[] = rawUsers.map(data => ({
        id: data.id,
        email: data.email || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        role: adminRoles[data.id] ? 'admin' : 'user',
        ...data
    }));

    const handleEditUser = (user: AppUser) => {
        setSelectedUser(user);
        setIsEditDialogOpen(true);
    };
    
    const handleViewHistory = (user: AppUser) => {
        setSelectedUser(user);
        setIsHistoryDialogOpen(true);
    };

    const handleDeleteUser = async (user: AppUser) => {
        if (!firestore) return;

        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);

            // Delete all advertisements for this user
            const adsSnapshot = await getDocs(collection(firestore, 'users', user.id, 'advertisements'));
            for (const adDoc of adsSnapshot.docs) {
                batch.delete(adDoc.ref);
                // Also check for associated live_ads
                const adData = adDoc.data();
                if (adData.pushedToAdServerId) {
                    try {
                        await deleteDoc(doc(firestore, 'live_ads', adData.pushedToAdServerId));
                    } catch (e) {
                        console.warn('Failed to delete live_ad:', e);
                    }
                }
            }

            // Delete all subscriptions for this customer
            const subsSnapshot = await getDocs(collection(firestore, 'customers', user.id, 'subscriptions'));
            for (const subDoc of subsSnapshot.docs) {
                batch.delete(subDoc.ref);
            }

            // Delete the customer document
            batch.delete(doc(firestore, 'customers', user.id));

            // Delete the user document
            batch.delete(doc(firestore, 'users', user.id));

            // Delete admin role if exists
            if (adminRoles[user.id]) {
                batch.delete(doc(firestore, 'roles_admin', user.id));
            }

            await batch.commit();

            toast({
                title: 'Customer Deleted',
                description: `${user.email || 'Customer'} and all related data has been permanently deleted.`,
            });
            setDeleteConfirmUser(null);
        } catch (err: any) {
            console.error("Error deleting user:", err);
            toast({
                title: 'Error',
                description: err.message || 'Failed to delete customer. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl md:text-2xl">User Management</CardTitle>
                            <CardDescription className="text-sm">View and manage all registered users.</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSyncAdminClaims}
                            disabled={isSyncingClaims}
                        >
                            {isSyncingClaims ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Shield className="mr-2 h-4 w-4" />
                            )}
                            Sync Admin Claims
                        </Button>
                    </div>
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
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length > 0 ? users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A'}</div>
                                                <div className="text-sm text-muted-foreground sm:hidden">{user.email}</div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'admin' ? 'secondary' : 'outline'}>{user.role}</Badge>
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
                                                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                            Edit User Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleViewHistory(user)}>
                                                            <History className="mr-2 h-4 w-4" />
                                                            View Email History
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteConfirmUser(user)}
                                                            className="text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Customer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">No users found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {selectedUser && (
                <EditUserDialog 
                    user={selectedUser}
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                />
            )}
             {selectedUser && selectedUser.email && (
                 <EmailHistoryDialog
                    recipient={{ id: selectedUser.id, email: selectedUser.email }}
                    isOpen={isHistoryDialogOpen}
                    onOpenChange={setIsHistoryDialogOpen}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete {deleteConfirmUser?.email || 'this customer'}?
                            This will also delete all their advertisements, subscriptions, and related data.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteConfirmUser && handleDeleteUser(deleteConfirmUser)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete Customer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    