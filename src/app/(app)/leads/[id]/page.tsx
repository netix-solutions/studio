
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, User, Mail, Phone, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SendManualEmailDialog } from '@/components/leads/send-manual-email-dialog';
import { EmailHistoryDialog } from '@/components/emails/email-history-dialog';
import type { Lead } from '../page';

export default function LeadDetailPage() {
    const params = useParams();
    const { id: leadId } = params;
    const { firestore } = useFirebase();

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManualEmailDialogOpen, setIsManualEmailDialogOpen] = useState(false);

    useEffect(() => {
        if (!firestore || !leadId || typeof leadId !== 'string') {
            setLoading(false);
            setError("Invalid lead ID.");
            return;
        }

        const findLead = async () => {
            try {
                setLoading(true);
                const leadDocRef = doc(firestore, 'leads', leadId);
                const leadDocSnap = await getDoc(leadDocRef);

                if (!leadDocSnap.exists()) {
                    throw new Error("Lead not found.");
                }

                const leadData = leadDocSnap.data() as Omit<Lead, 'id'>;
                setLead({ id: leadDocSnap.id, ...leadData });

            } catch (err: any) {
                console.error("Error fetching lead details:", err);
                setError(err.message || "Failed to load lead details.");
            } finally {
                setLoading(false);
            }
        };

        findLead();

    }, [firestore, leadId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!lead) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>The requested lead could not be found.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{lead.contactName}</CardTitle>
                        <CardDescription>Lead submitted on {lead.createdAt ? format(lead.createdAt.toDate(), 'PPP') : 'N/A'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Briefcase className="h-4 w-4 text-muted-foreground"/>
                            <span className='font-medium'>Business:</span>
                            <span>{lead.businessName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground"/>
                            <span className='font-medium'>Email:</span>
                            <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
                        </div>
                         <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground"/>
                             <span className='font-medium'>Phone:</span>
                            <span>{lead.phone || 'Not Provided'}</span>
                        </div>
                    </CardContent>
                </Card>

                 <EmailHistoryDialog
                    recipient={{ id: lead.id, email: lead.email }}
                    isOpen={true} // Render it directly on the page
                    onOpenChange={() => {}} // No-op, it's always open here
                    renderAsCard={true} // New prop to render as Card
                />
            </div>
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                         <Button className="w-full" onClick={() => setIsManualEmailDialogOpen(true)}>
                            Send Manual Email
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <SendManualEmailDialog
                lead={lead}
                isOpen={isManualEmailDialogOpen}
                onOpenChange={setIsManualEmailDialogOpen}
            />
        </div>
    )
}
