
'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, User, Mail, Phone, Globe, Briefcase, FileText, Calendar, DollarSign, ExternalLink, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CommentsDialog } from '@/components/subscriptions/comments-dialog';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SendEmailDialog, type AdvertisementInfo } from '@/components/shared/send-email-dialog';
import { EmailHistoryDialog } from '@/components/emails/email-history-dialog';
import {
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    type AdStatus,
    type UserDetails,
} from '@/lib/types';

interface SubscriptionDetails {
    id: string;
    customerId: string;
    plan: string;
    status: string;
    amount: number;
    startDate: string;
    endDate: string;
    adStatus: string;
    adId?: string;
}

// Using centralized UserDetails type from @/lib/types

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    active: 'secondary',
    trialing: 'secondary',
    past_due: 'destructive',
    canceled: 'destructive',
    unpaid: 'destructive',
    'Not Started': 'outline',
    // Include ad status variants
    ...Object.entries(AD_STATUS_COLORS).reduce((acc, [key, value]) => {
        acc[key] = value.variant;
        return acc;
    }, {} as Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>),
};

const statusTextMap: { [key: string]: string } = {
    'Not Started': 'Not Started',
    ...AD_STATUS_LABELS,
};

const capitalize = (s:string) => s && s[0].toUpperCase() + s.slice(1);


export default function SubscriptionDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { id: subscriptionId } = params;
    const customerId = searchParams.get('customerId');
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
    const [user, setUser] = useState<UserDetails | null>(null);
    const [advertisement, setAdvertisement] = useState<AdvertisementInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isManualEmailDialogOpen, setIsManualEmailDialogOpen] = useState(false);


    useEffect(() => {
        if (!firestore || !subscriptionId || typeof subscriptionId !== 'string' || !customerId) {
            setLoading(false);
            setError("Invalid subscription or customer ID.");
            return;
        }

        const fetchDetails = async () => {
            try {
                setLoading(true);
                
                const subDocRef = doc(firestore, 'customers', customerId, 'subscriptions', subscriptionId);
                const userDocRef = doc(firestore, 'users', customerId);
                const adQuery = query(collection(firestore, 'users', customerId, 'advertisements'), where('subscriptionId', '==', subscriptionId));
                
                const [subDocSnap, userDocSnap, adSnapshot] = await Promise.all([
                    getDoc(subDocRef),
                    getDoc(userDocRef),
                    getDocs(adQuery),
                ]);

                if (!subDocSnap.exists()) throw new Error("Subscription data could not be found for this customer.");
                if (!userDocSnap.exists()) throw new Error("Customer details not found.");

                const subData = subDocSnap.data();
                const userData = userDocSnap.data() as Omit<UserDetails, 'id'>;
                const adDoc = adSnapshot.empty ? null : adSnapshot.docs[0];
                const adData = adDoc?.data();

                const startDate = subData.created?.seconds ? new Date(subData.created.seconds * 1000) : new Date();
                const endDate = subData.current_period_end?.seconds ? new Date(subData.current_period_end.seconds * 1000) : new Date();

                const subDetails: SubscriptionDetails = {
                    id: subscriptionId,
                    customerId: customerId,
                    plan: subData.items?.[0]?.price?.product?.name || 'N/A',
                    status: subData.status,
                    amount: subData.items?.[0]?.price?.unit_amount / 100 || 0,
                    startDate: format(startDate, 'PPP'),
                    endDate: format(endDate, 'PPP'),
                    adStatus: adData?.status || 'Not Started',
                    adId: adDoc?.id,
                };

                setUser({ id: userDocSnap.id, ...userData });
                setSubscription(subDetails);

                // Store advertisement info for sending ad proof approval emails
                if (adDoc && adData) {
                    setAdvertisement({
                        id: adDoc.id,
                        userId: customerId,
                        adProofUrl: adData.adProofUrl,
                        adProofDestinationUrl: adData.adProofDestinationUrl || userData.adWebsiteUrl,
                    });
                }

            } catch (err: any) {
                console.error("Error fetching subscription details:", err);
                if (err.code === 'permission-denied') {
                    setError("You do not have permission to view these details. Please contact an administrator.");
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: `/customers/${customerId}/subscriptions/${subscriptionId}`,
                        operation: 'get',
                    }));
                } else {
                    setError(err.message || "Failed to load subscription details.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();

    }, [firestore, subscriptionId, customerId]);


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

    if (!subscription || !user) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>The requested subscription could not be found.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6 order-2 md:order-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Subscription: {subscription.plan}</CardTitle>
                        <CardDescription>Details for subscription ID: {subscription.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1">
                                <div className="text-muted-foreground font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Amount</div>
                                <div>${subscription.amount.toFixed(2)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Billing Status</div>
                                <div><Badge variant={statusVariantMap[subscription.status] || 'outline'}>{capitalize(subscription.status)}</Badge></div>
                            </div>
                             <div className="space-y-1">
                                <div className="text-muted-foreground font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Ad Status</div>
                                <div><Badge variant={statusVariantMap[subscription.adStatus] || 'outline'}>{statusTextMap[subscription.adStatus] || subscription.adStatus}</Badge></div>
                            </div>
                             <div className="space-y-1 col-span-2">
                                <div className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Current Period</div>
                                <div>{subscription.startDate} - {subscription.endDate}</div>
                            </div>
                             {subscription.adId && (
                                <div className="space-y-1">
                                    <div className="text-muted-foreground font-medium flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Ad Workflow</div>
                                    <Button variant="outline" size="sm" onClick={() => router.push(`/advertisements/${subscription.adId}?userId=${subscription.customerId}`)}>
                                        Manage Ad
                                    </Button>
                                </div>
                            )}
                            {!subscription.adId && (
                                <div className="space-y-1">
                                    <div className="text-muted-foreground font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Ad Workflow</div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            if (!firestore) return;
                                            try {
                                                const adsRef = collection(firestore, 'users', subscription.customerId, 'advertisements');
                                                const newAd = await addDoc(adsRef, {
                                                    userId: subscription.customerId,
                                                    email: user.email,
                                                    subscriptionId: subscription.id,
                                                    status: 'pending_info',
                                                    businessName: user.businessName,
                                                    contactName: user.contactName,
                                                    phone: user.phone,
                                                    adWebsiteUrl: user.adWebsiteUrl,
                                                    adText: user.adText,
                                                    adNotes: user.adNotes,
                                                    createdAt: serverTimestamp(),
                                                    updatedAt: serverTimestamp(),
                                                });
                                                router.push(`/advertisements/${newAd.id}?userId=${subscription.customerId}`);
                                                toast({ title: 'Success', description: 'Advertisement workflow created.' });
                                            } catch (error: any) {
                                                toast({ title: 'Error', description: error.message, variant: 'destructive' });
                                            }
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Start Ad Workflow
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Ad Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex items-start gap-2">
                                <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground font-medium">Business Name</p>
                                    <p>{user.businessName || 'Not Provided'}</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-2">
                                <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground font-medium">Ad Link URL</p>
                                    <p>{user.adWebsiteUrl ? <a href={user.adWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{user.adWebsiteUrl}</a> : 'Not Provided'}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-muted-foreground font-medium">Ad Text / Slogan</p>
                            <p className="whitespace-pre-wrap">{user.adText || 'Not Provided'}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground font-medium">Ad Notes / Special Offers</p>
                            <p className="whitespace-pre-wrap">{user.adNotes || 'Not Provided'}</p>
                        </div>
                    </CardContent>
                 </Card>
                 
                 <EmailHistoryDialog
                    recipient={{ id: user.id, email: user.email }}
                    isOpen={true}
                    onOpenChange={() => {}}
                    renderAsCard={true}
                />

                 <CommentsDialog
                    subscription={{id: subscription.id, customerId: subscription.customerId}}
                    isOpen={true}
                    onOpenChange={() => {}}
                    renderAsCard={true}
                />
            </div>
            <div className="md:col-span-1 space-y-6 order-1 md:order-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground"/>
                            <span>{user.contactName}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground"/>
                            <a href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</a>
                        </div>
                         <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground"/>
                            <span>{user.phone || 'Not Provided'}</span>
                        </div>
                         <div className="mt-4">
                            <Button className="w-full" onClick={() => setIsManualEmailDialogOpen(true)}>
                                Send Manual Email
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <SendEmailDialog
                recipient={{
                    id: user.id,
                    email: user.email,
                    contactName: user.contactName,
                    businessName: user.businessName,
                }}
                recipientType="customer"
                isOpen={isManualEmailDialogOpen}
                onOpenChange={setIsManualEmailDialogOpen}
                advertisement={advertisement ?? undefined}
            />

        </div>
    )
}
