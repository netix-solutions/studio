'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { doc, onSnapshot, Unsubscribe, collection, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';


export default function AccountPage() {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminLoading, setIsAdminLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!user || !firestore) return;

        const adminDocRef = doc(firestore, 'roles_admin', user.uid);
        const unsubscribe = onSnapshot(adminDocRef, (docSnap) => {
            setIsAdmin(docSnap.exists());
            setIsAdminLoading(false);
        }, (error) => {
            // This can fail if rules don't allow reads, so we handle it gracefully.
            // We assume the user is not an admin if we can't read the doc.
            console.log("Admin check failed, likely due to permissions. User is not an admin.");
            setIsAdmin(false);
            setIsAdminLoading(false);
        });

        return () => unsubscribe();
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
            // Redirection is handled inside goToBillingPortal, so we might not reach here.
            // But if the promise resolves without redirecting for some reason, stop loading.
             setIsRedirecting(false);
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
                    return true; // Return true if a doc was created
                }
                return false; // Return false if doc already existed
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

    return (
        <div className="flex-1 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>My Account</CardTitle>
                    <CardDescription>Welcome, {user?.email}! Manage your account and billing information here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Billing Management</h3>
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
                    </div>
                    {isAdminLoading && (
                         <div className="space-y-2">
                            <h3 className="font-semibold">Stripe Sync</h3>
                             <p className="text-sm text-muted-foreground">Checking admin status...</p>
                             <Button disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </Button>
                         </div>
                    )}
                    {!isAdminLoading && isAdmin && (
                        <div className="space-y-2">
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
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
