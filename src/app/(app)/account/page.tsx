'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useAuth } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function AccountPage() {
    const { user } = useUser();
    const { auth } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

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
                </CardContent>
            </Card>
        </div>
    );
}
