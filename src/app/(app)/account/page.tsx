'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { doc, onSnapshot, Unsubscribe, collection, getDocs, getDoc, setDoc, query } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Subscription {
    id: string;
    status: string;
    planName: string;
    price: string;
    periodEnd: string;
}

export default function AccountPage() {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminLoading, setIsAdminLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [subsLoading, setSubsLoading] = useState(true);
    const [subsError, setSubsError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!user || !firestore) return;

        // --- Admin Role Check ---
        const adminDocRef = doc(firestore, 'roles_admin', user.uid);
        const unsubAdmin = onSnapshot(adminDocRef, (docSnap) => {
            setIsAdmin(docSnap.exists());
            setIsAdminLoading(false);
        }, (error) => {
            console.log("Admin check failed, likely due to permissions. User is not an admin.");
            setIsAdmin(false);
            setIsAdminLoading(false);
        });
        
        // --- Subscription Fetching ---
        setSubsLoading(true);
        const subsCollectionRef = collection(firestore, 'customers', user.uid, 'subscriptions');
        const q = query(subsCollectionRef);

        const unsubSubs = onSnapshot(q, (snapshot) => {
            const subsData: Subscription[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const priceData = data.items?.[0]?.price;
                return {
                    id: doc.id,
                    status: data.status,
                    planName: data.items?.[0]?.price?.product?.name || 'N/A',
                    price: priceData ? `${(priceData.unit_amount / 100).toLocaleString('en-US', { style: 'currency', currency: priceData.currency || 'USD' })}/${priceData.recurring?.interval}`: 'N/A',
                    periodEnd: format(new Date(data.current_period_end * 1000), 'MMM d, yyyy'),
                };
            });
            setSubscriptions(subsData);
            setSubsLoading(false);
            setSubsError(null);
        }, (err) => {
            console.error("Subscription fetch error:", err);
            setSubsError("Could not load your subscriptions. Please try again later.");
            setSubsLoading(false);
        });


        return () => {
            unsubAdmin();
            unsubSubs();
        };
    }, [user, firestore]);

    const handleManageBilling = async () => {
        if (!firestore || !user) {
            toast({
                title: "Error",
                description: "Services not available. Please try again.",
                variant: "destructive",
            });
            return;
        }
        setIsRedirecting(true);
        try {
            await goToBillingPortal(firestore, user.uid, window.location.origin + '/account');
            // The goToBillingPortal function will handle the redirect, but if it fails before redirecting,
            // we should stop the loading state.
        } catch (error: any) {
            console.error('Error redirecting to billing portal:', error);
             toast({
                title: "Error",
                description: error.message || "Could not open billing portal. Please try again.",
                variant: "destructive",
            });
            setIsRedirecting(false);
        }
    };

    const handleSyncStripeCustomers = async () => {
        if (!firestore) return;
        setIsSyncing(true);
        
        try {
            const usersCollectionRef = collection(firestore, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);

            const syncPromises = usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                if (!userId || !userData.email) return false;

                const customerDocRef = doc(firestore, 'customers', userId);
                const customerDocSnap = await getDoc(customerDocRef);

                if (!customerDocSnap.exists()) {
                     await setDoc(customerDocRef, {
                        email: userData.email,
                    }, { merge: true });
                    return true;
                }
                return false;
            });

            const results = await Promise.all(syncPromises);
            const syncedCount = results.filter(Boolean).length;

            toast({
                title: "Sync Complete",
                description: `${syncedCount} new customer record(s) created. The Stripe extension will now process them.`
            });

        } catch (error: any) {
            const permissionError = new FirestorePermissionError({
                path: '/users',
                operation: 'list',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);

            toast({
                title: "Sync Error",
                description: "Could not sync customers. You may not have permission to read all user data.",
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active':
            case 'trialing':
                return 'secondary';
            case 'past_due':
            case 'canceled':
            case 'unpaid':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <div className="flex-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>My Account</CardTitle>
                    <CardDescription>Welcome, {user?.email}! Manage your account and subscriptions here.</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>My Subscriptions</CardTitle>
                    <CardDescription>A list of your active and past subscriptions.</CardDescription>
                </CardHeader>
                <CardContent>
                     {subsLoading && (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            <span>Loading subscriptions...</span>
                        </div>
                    )}
                    {subsError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{subsError}</AlertDescription>
                        </Alert>
                    )}
                    {!subsLoading && !subsError && subscriptions.length > 0 && (
                        <div className="space-y-4">
                            {subscriptions.map(sub => (
                                <div key={sub.id} className="flex justify-between items-center p-4 border rounded-lg">
                                    <div>
                                        <div className="font-bold">{sub.planName}</div>
                                        <div className="text-sm text-muted-foreground">{sub.price}</div>
                                    </div>
                                    <div className='text-right'>
                                         <Badge variant={getStatusBadgeVariant(sub.status)} className="capitalize mb-1">{sub.status}</Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {sub.status === 'active' || sub.status === 'trialing' ? `Renews on ${sub.periodEnd}` : `Ended on ${sub.periodEnd}`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!subsLoading && !subsError && subscriptions.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">You have no active subscriptions.</p>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Billing Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Click the button below to manage your subscription, view payment history, and update your payment method in our secure Stripe customer portal.
                    </p>
                    <Button onClick={handleManageBilling} disabled={isRedirecting || !user || !firestore}>
                        {isRedirecting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Redirecting...
                            </>
                        ) : (
                            'Manage Billing & Subscriptions'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {(isAdminLoading || isAdmin) && (
                <Card>
                     <CardHeader>
                        <CardTitle>Admin Tools</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isAdminLoading && (
                            <div className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Checking admin status...</span>
                            </div>
                        )}
                        {isAdmin && (
                            <>
                            <h3 className="font-semibold">Stripe Sync</h3>
                            <p className="text-sm text-muted-foreground">
                                For any existing users who are missing a Stripe ID, this action will create a customer record for them, allowing the Stripe extension to sync their data.
                            </p>
                            <Button onClick={handleSyncStripeCustomers} disabled={isSyncing}>
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    'Sync Stripe Customers'
                                )}
                            </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
