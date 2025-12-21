
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, Unsubscribe, orderBy } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { SendManualEmailDialog } from '@/components/leads/send-manual-email-dialog';

export interface Lead {
    id: string;
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    createdAt: any;
    [key: string]: any; // Allow other properties
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { firestore } = useFirebase();
    const [isManualEmailDialogOpen, setIsManualEmailDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const leadsQuery = query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
            const leadsData: Lead[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Lead));
            setLeads(leadsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            const permissionError = new FirestorePermissionError({
                path: '/leads',
                operation: 'list',
            } satisfies SecurityRuleContext);
            
            errorEmitter.emit('permission-error', permissionError);

            setError("You do not have permission to view this data. Please contact an administrator to be granted the 'admin' role.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleSendManualEmail = (lead: Lead) => {
        setSelectedLead(lead);
        setIsManualEmailDialogOpen(true);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Leads</CardTitle>
                    <CardDescription>A list of all potential customers who have shown interest.</CardDescription>
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
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Date Submitted</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leads.length > 0 ? leads.map((lead) => (
                                        <TableRow key={lead.id}>
                                            <TableCell>
                                              <div className="font-medium">{lead.contactName}</div>
                                              <div className="text-sm text-muted-foreground">{lead.email}</div>
                                            </TableCell>
                                            <TableCell>{lead.businessName}</TableCell>
                                            <TableCell>
                                                {lead.createdAt ? format(lead.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
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
                                                        <DropdownMenuItem onClick={() => handleSendManualEmail(lead)}>
                                                            <Mail className="mr-2 h-4 w-4" />
                                                            Send Manual Email
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">No leads found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedLead && (
                 <SendManualEmailDialog
                    lead={selectedLead}
                    isOpen={isManualEmailDialogOpen}
                    onOpenChange={setIsManualEmailDialogOpen}
                />
            )}
        </>
    );
}
