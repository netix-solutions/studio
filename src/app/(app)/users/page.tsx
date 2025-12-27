
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, Unsubscribe, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MoreHorizontal, History } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { EmailHistoryDialog } from '@/components/emails/email-history-dialog';

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
    const { firestore } = useFirebase();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [adminRoles, setAdminRoles] = useState<{[key: string]: boolean}>({});

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

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all registered users.</CardDescription>
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
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length > 0 ? users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A'}</TableCell>
                                            <TableCell>{user.email}</TableCell>
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
        </>
    );
}

    