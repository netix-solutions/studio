'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, Unsubscribe } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export default function UsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { firestore } = useFirebase();

    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        let unsubscribe: Unsubscribe | undefined;

        const usersQuery = query(collection(firestore, 'users'));
        
        unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const usersData: AppUser[] = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as AppUser));
            setUsers(usersData);
            setLoading(false);
            setError(null);
        }, (err) => {
            // Create a rich, contextual error for the developer overlay
            const permissionError = new FirestorePermissionError({
                path: '/users',
                operation: 'list',
            } satisfies SecurityRuleContext);
            
            // Emit the error for the global listener to catch and throw
            errorEmitter.emit('permission-error', permissionError);

            // Also, set a user-friendly error message for the UI
            setError("You do not have permission to view this data. Please contact an administrator to be granted the 'admin' role.");
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [firestore]);


    return (
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
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? users.map((user) => (
                                    <TableRow key={user.uid}>
                                        <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell className="text-muted-foreground">{user.uid}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">User</Badge>
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
    );
}
