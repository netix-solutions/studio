'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useAuth, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AccountPage() {
    const { user } = useUser();
    const { auth, firestore } = useFirebase();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (firestore && user) {
            const adminDocRef = doc(firestore, 'roles_admin', user.uid);
            getDoc(adminDocRef).then((docSnap) => {
                setIsAdmin(docSnap.exists());
            });
        }
    }, [firestore, user]);

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
        if (!firestore || !user) {
            toast({
                title: 'Error',
                description: 'User or database not available.',
                variant: 'destructive',
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const adminDocRef = doc(firestore, 'roles_admin', user.uid);
            await setDoc(adminDocRef, { email: user.email, grantedAt: new Date() });
            setIsAdmin(true);
            toast({
                title: 'Success!',
                description: "You have been granted admin privileges. You can now access the 'Users' page.",
            });
        } catch (error: any) {
            console.error('Error granting admin role:', error);
            toast({
                title: 'Error',
                description: error.message || 'Could not grant admin role.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
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
                        <h3 className="font-semibold">Administrator Role</h3>
                        <p className="text-sm text-muted-foreground">
                            Grant yourself administrator privileges to manage users and other site settings.
                        </p>
                        <Button onClick={handleBecomeAdmin} disabled={isSubmitting || isAdmin === true || isAdmin === null}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isAdmin === null && 'Checking status...'}
                            {isAdmin === true && 'You are already an Admin'}
                            {isAdmin === false && 'Become an Admin'}
                        </Button>
                         {isAdmin === true && <p className="text-sm text-green-600 mt-2">You can now access the Users page in the sidebar.</p>}
                    </div>

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
                </CardContent>
            </Card>
        </div>
    );
}
