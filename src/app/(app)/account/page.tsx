'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { doc, setDoc, onSnapshot, Unsubscribe, collection, getDocs, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';


export default function AccountPage() {
    const { user } = useUser();
    const { auth, firestore } = useFirebase();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminLoading, setIsAdminLoading] = useState(true);
    const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!user || !firestore) return;

        let unsubscribe: Unsubscribe;
        const adminDocRef = doc(firestore, 'roles_admin', user.uid);
        
        unsubscribe = onSnapshot(adminDocRef, (docSnap) => {
            setIsAdmin(docSnap.exists());
            setIsAdminLoading(false);
        });

        return () => unsubscribe();
    }, [user, firestore]);

    const handleManageBilling = async () => {
        if (!auth) {
            console.error("Auth is not available");
            return;
        }
        setIsRedirecting(true);
        try {
            await goToBillingPortal(auth, window.location.origin + '/account');
        } catch (error) {
            console.error('Error redirecting to billing portal:', error);
            setIsRedirecting(false);
        }
    };
    
    const handleBecomeAdmin = async () => {
        if (!user || !firestore) {
            toast({
                title: "Error",
                description: "User or database not available.",
                variant: "destructive"
            });
            return;
        }
        setIsSubmittingAdmin(true);
        try {
            const adminDocRef = doc(firestore, 'roles_admin', user.uid);
            await setDoc(adminDocRef, { uid: user.uid });
            toast({
                title: "Success!",
                description: "You have been granted admin privileges."
            });
        } catch (error: any) {
            console.error("Error setting admin role:", error);
            toast({
                title: "Error",
                description: "Could not grant admin role. Check Firestore rules or console for errors.",
                variant: "destructive"
            });
        } finally {
            setIsSubmittingAdmin(false);
        }
    };

    const handleSyncStripeCustomers = async () => {
        if (!firestore) return;
        setIsSyncing(true);
        let syncedCount = 0;
        try {
            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            const syncPromises = usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                if (!userId || !userData.email) return;

                const customerDocRef = doc(firestore, 'customers', userId);
                const customerDocSnap = await getDoc(customerDocRef);

                if (!customerDocSnap.exists()) {
                    await setDoc(customerDocRef, {
                        email: userData.email,
                    }, { merge: true });
                    syncedCount++;
                }
            });

            await Promise.all(syncPromises);

            toast({
                title: "Sync Complete",
                description: `${syncedCount} new customer record(s) created. The Stripe extension will now process them.`
            });

        } catch (error: any) {
            console.error("Error syncing Stripe customers:", error);
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
                        <Button onClick={handleManageBilling} disabled={isRedirecting || !auth}>
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
                     <div className="space-y-2">
                        <h3 className="font-semibold">Role Management</h3>
                        <p className="text-sm text-muted-foreground">
                            Grant yourself administrator privileges to access user management features. This action is irreversible through the UI.
                        </p>
                        <Button onClick={handleBecomeAdmin} disabled={isAdminLoading || isAdmin || isSubmittingAdmin}>
                            {isSubmittingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isAdminLoading ? 'Checking Status...' : isAdmin ? 'Admin Role Active' : 'Become an Admin'}
                        </Button>
                    </div>
                    {isAdmin && (
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
