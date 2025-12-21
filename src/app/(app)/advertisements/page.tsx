
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, Unsubscribe, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MoreHorizontal } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export interface Advertisement {
    id: string;
    businessName: string;
    contactName: string;
    email: string;
    status: 'pending_ad_creation' | 'pending_customer_approval' | 'live' | 'canceled_inactive';
    createdAt: any;
    [key: string]: any;
}

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    pending_ad_creation: 'outline',
    pending_customer_approval: 'default',
    live: 'secondary',
    canceled_inactive: 'destructive'
};

const statusTextMap: { [key: string]: string } = {
    pending_ad_creation: 'Pending Ad Creation',
    pending_customer_approval: 'Pending Customer Approval',
    live: 'Live',
    canceled_inactive: 'Canceled/Inactive'
};

export default function AdvertisementsPage() {
    const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { firestore } = useFirebase();

    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const adsQuery = query(collection(firestore, 'advertisements'));
        
        const unsubscribe = onSnapshot(adsQuery, (snapshot) => {
            const adsData: Advertisement[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                } as Advertisement;
            });
            setAdvertisements(adsData.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
            setError(null);
        }, (err) => {
            const permissionError = new FirestorePermissionError({
                path: '/advertisements',
                operation: 'list',
            } satisfies SecurityRuleContext);
            
            errorEmitter.emit('permission-error', permissionError);

            setError("You do not have permission to view this data. Please contact an administrator to be granted the 'admin' role.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Advertisement Workflow</CardTitle>
                    <CardDescription>Track and manage all customer advertisements from creation to completion.</CardDescription>
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
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Date Created</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {advertisements.length > 0 ? advertisements.map((ad) => (
                                        <TableRow key={ad.id}>
                                            <TableCell>
                                              <div className="font-medium">{ad.contactName}</div>
                                              <div className="text-sm text-muted-foreground">{ad.email}</div>
                                            </TableCell>
                                            <TableCell>{ad.businessName}</TableCell>
                                            <TableCell>
                                                {ad.createdAt ? format(ad.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariantMap[ad.status] || 'outline'}>
                                                    {statusTextMap[ad.status] || ad.status}
                                                </Badge>
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
                                                        <DropdownMenuItem>View/Edit Details</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">No advertisements found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
