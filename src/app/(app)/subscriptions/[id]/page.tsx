
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, User, Mail, Phone, Globe, Briefcase, FileText, Calendar, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CommentsDialog } from '@/components/subscriptions/comments-dialog';
import { Separator } from '@/components/ui/separator';

interface SubscriptionDetails {
    id: string;
    customerId: string;
    plan: string;
    status: string;
    amount: number;
    startDate: string;
    endDate: string;
    adStatus: string;
}

interface UserDetails {
    contactName: string;
    email: string;
    businessName?: string;
    phone?: string;
    adWebsiteUrl?: string;
    adText?: string;
    adNotes?: string;
}

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    active: 'secondary',
    trialing: 'secondary',
    past_due: 'destructive',
    canceled: 'destructive',
    unpaid: 'destructive',
    pending_ad_creation: 'outline',
    pending_customer_approval: 'default',
    live: 'secondary',
    canceled_inactive: 'destructive',
    'Not Started': 'outline',
};

const statusTextMap: { [key: string]: string } = {
    pending_ad_creation: 'Pending Ad Creation',
    pending_customer_approval: 'Pending Approval',
    live: 'Live',
    canceled_inactive: 'Canceled/Inactive',
    'Not Started': 'Not Started',
};

const capitalize = (s:string) => s && s[0].toUpperCase() + s.slice(1);


export default function SubscriptionDetailPage() {
    const params = useParams();
    const { id: subscriptionId } = params;
    const { firestore } = useFirebase();

    const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore || !subscriptionId || typeof subscriptionId !== 'string') {
            setLoading(false);
            setError("Invalid subscription ID.");
            return;
        }

        const findSubscriptionAndCustomer = async () => {
            try {
                setLoading(true);
                // We need to search for the subscription across all customers
                const customersSnapshot = await getDocs(collection(firestore, 'customers'));
                let foundSubData: any = null;
                let foundCustomerId: string | null = null;

                for (const customerDoc of customersSnapshot.docs) {
                    const subDocRef = doc(firestore, 'customers', customerDoc.id, 'subscriptions', subscriptionId);
                    const subDocSnap = await getDoc(subDocRef);
                    if (subDocSnap.exists()) {
                        foundSubData = subDocSnap.data();
                        foundCustomerId = customerDoc.id;
                        break;
                    }
                }
                
                if (!foundSubData || !foundCustomerId) {
                    throw new Error("Subscription not found.");
                }

                // Fetch ad details
                const adQuery = query(collection(firestore, 'advertisements'), where('subscriptionId', '==', subscriptionId));
                const adSnapshot = await getDocs(adQuery);
                const adData = adSnapshot.docs.length > 0 ? adSnapshot.docs[0].data() : null;

                // Fetch user details
                const userDocRef = doc(firestore, 'users', foundCustomerId);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    throw new Error("Customer details not found.");
                }
                const userData = userDocSnap.data() as UserDetails;

                const startDate = foundSubData.created?.seconds ? new Date(foundSubData.created.seconds * 1000) : new Date();
                const endDate = foundSubData.current_period_end?.seconds ? new Date(foundSubData.current_period_end.seconds * 1000) : new Date();

                setSubscription({
                    id: subscriptionId,
                    customerId: foundCustomerId,
                    plan: foundSubData.items?.[0]?.price?.product?.name || 'N/A',
                    status: foundSubData.status,
                    amount: foundSubData.items?.[0]?.price?.unit_amount / 100 || 0,
                    startDate: format(startDate, 'PPP'),
                    endDate: format(endDate, 'PPP'),
                    adStatus: adData?.status || 'Not Started',
                });
                setUser(userData);

            } catch (err: any) {
                console.error("Error fetching subscription details:", err);
                setError(err.message || "Failed to load subscription details.");
            } finally {
                setLoading(false);
            }
        };

        findSubscriptionAndCustomer();

    }, [firestore, subscriptionId]);

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
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Subscription: {subscription.plan}</CardTitle>
                        <CardDescription>Details for subscription ID: {subscription.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Amount</p>
                                <p>${subscription.amount.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Billing Status</p>
                                <p><Badge variant={statusVariantMap[subscription.status] || 'outline'}>{capitalize(subscription.status)}</Badge></p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Ad Status</p>
                                <p><Badge variant={statusVariantMap[subscription.adStatus] || 'outline'}>{statusTextMap[subscription.adStatus] || subscription.adStatus}</Badge></p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Current Period</p>
                                <p>{subscription.startDate} - {subscription.endDate}</p>
                            </div>
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

                 <CommentsDialog
                    subscription={{id: subscription.id, customerId: subscription.customerId}}
                    isOpen={true} // Render it directly on the page
                    onOpenChange={() => {}} // No-op, it's always open here
                    renderAsCard={true} // New prop to render as Card
                />
            </div>
            <div className="md:col-span-1 space-y-6">
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
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
    