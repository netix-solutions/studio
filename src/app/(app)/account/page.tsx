'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    doc,
    onSnapshot,
    collection,
    getDocs,
    query,
    addDoc,
    updateDoc,
    serverTimestamp,
    orderBy,
} from 'firebase/firestore';
import { useUser, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Loader2,
    AlertCircle,
    CreditCard,
    Calendar,
    CheckCircle,
    ExternalLink,
    User,
    Mail,
    Phone,
    Building2,
    Globe,
} from 'lucide-react';
import { format } from 'date-fns';

// Workflow Components
import { CustomerWorkflow } from '@/components/workflow/CustomerWorkflow';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatPhoneNumber, fixUrl } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import {
    type Advertisement,
    type UserProfile,
    normalizeAdStatus,
    AD_STATUS_LABELS,
} from '@/lib/types';

interface Subscription {
    id: string;
    status: string;
    planName?: string;
    price?: string;
    periodEnd?: string;
    current_period_end?: { seconds: number };
    items?: Array<{ price: { product: { name: string }; unit_amount: number } }>;
}

export default function AccountPage() {
    const { user, isUserLoading: userLoading } = useUser();
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
    const [allAdvertisements, setAllAdvertisements] = useState<Advertisement[]>([]);
    const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
    const [billingLoading, setBillingLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    // Load user data and subscriptions
    useEffect(() => {
        if (!firestore || !user) {
            if (!userLoading) setLoading(false);
            return;
        }

        setLoading(true);

        // Subscribe to user profile
        const userUnsubscribe = onSnapshot(
            doc(firestore, 'users', user.uid),
            (docSnap) => {
                if (docSnap.exists()) {
                    setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
                } else {
                    setUserProfile({
                        id: user.uid,
                        email: user.email || '',
                        createdAt: null,
                    } as UserProfile);
                }
            },
            (error) => {
                console.error('Error fetching user profile:', error);
            }
        );

        // Subscribe to subscriptions
        const subsUnsubscribe = onSnapshot(
            collection(firestore, 'customers', user.uid, 'subscriptions'),
            (snapshot) => {
                const subs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Subscription[];
                setSubscriptions(subs);

                // Find active subscription
                const active = subs.find(s =>
                    s.status === 'active' || s.status === 'trialing'
                );
                setActiveSubscription(active || null);
            },
            (error) => {
                console.error('Error fetching subscriptions:', error);
            }
        );

        // Subscribe to advertisements - get all for history and pending change request detection
        const adsUnsubscribe = onSnapshot(
            query(
                collection(firestore, 'users', user.uid, 'advertisements'),
                orderBy('createdAt', 'desc')
            ),
            async (snapshot) => {
                if (!snapshot.empty) {
                    // Store all advertisements for history
                    const allAds = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Advertisement));
                    setAllAdvertisements(allAds);

                    // Set the most recent advertisement as the current one
                    setAdvertisement(allAds[0]);
                } else {
                    setAllAdvertisements([]);
                    // Create a new advertisement if user has active subscription but no ad
                    const active = subscriptions.find(s =>
                        s.status === 'active' || s.status === 'trialing'
                    );
                    if (active && !advertisement) {
                        try {
                            const newAdRef = await addDoc(
                                collection(firestore, 'users', user.uid, 'advertisements'),
                                {
                                    userId: user.uid,
                                    subscriptionId: active.id,
                                    status: 'info_needed',
                                    createdAt: serverTimestamp(),
                                    updatedAt: serverTimestamp(),
                                }
                            );
                            setAdvertisement({
                                id: newAdRef.id,
                                userId: user.uid,
                                subscriptionId: active.id,
                                status: 'info_needed',
                                createdAt: new Date(),
                            } as Advertisement);
                        } catch (error) {
                            console.error('Error creating advertisement:', error);
                        }
                    } else {
                        setAdvertisement(null);
                    }
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching advertisements:', error);
                setLoading(false);
            }
        );

        return () => {
            userUnsubscribe();
            subsUnsubscribe();
            adsUnsubscribe();
        };
    }, [firestore, user, userLoading, refreshKey]);

    // Handle billing portal redirect
    const handleBillingPortal = async () => {
        if (!firestore || !user) return;
        setBillingLoading(true);
        try {
            await goToBillingPortal(firestore, user.uid, user.email, window.location.href);
        } catch (error) {
            console.error('Error opening billing portal:', error);
            toast({
                title: 'Error',
                description: 'Could not open billing portal. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setBillingLoading(false);
        }
    };

    // Loading state
    if (loading || userLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Please log in</AlertTitle>
                <AlertDescription>
                    You need to be logged in to view your account.
                </AlertDescription>
            </Alert>
        );
    }

    // No subscription
    if (!activeSubscription) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Welcome!</h1>
                    <p className="text-muted-foreground">Get started with community advertising.</p>
                </div>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Active Subscription</AlertTitle>
                    <AlertDescription>
                        You don't have an active subscription yet. Choose a plan to start advertising.
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle>Ready to Get Started?</CardTitle>
                        <CardDescription>
                            Choose a plan to start advertising on our community websites.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/pricing')}>
                            View Plans & Pricing
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Get formatted subscription details
    const getSubscriptionDetails = () => {
        if (!activeSubscription) return null;

        const planName = activeSubscription.items?.[0]?.price?.product?.name || activeSubscription.planName || 'Subscription';
        const price = activeSubscription.items?.[0]?.price?.unit_amount
            ? `$${(activeSubscription.items[0].price.unit_amount / 100).toFixed(0)}`
            : activeSubscription.price || '-';
        const periodEnd = activeSubscription.current_period_end?.seconds
            ? format(new Date(activeSubscription.current_period_end.seconds * 1000), 'MMMM d, yyyy')
            : activeSubscription.periodEnd || '-';

        return { planName, price, periodEnd };
    };

    const subDetails = getSubscriptionDetails();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Account</h1>
                    <p className="text-muted-foreground">
                        Manage your advertisement and subscription.
                    </p>
                </div>
                <Button variant="outline" onClick={handleBillingPortal} disabled={billingLoading}>
                    {billingLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    Billing & Subscription
                </Button>
            </div>

            {/* Subscription Summary Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                {subDetails?.planName}
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Active subscription
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {activeSubscription.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{subDetails?.price}/month</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Renews {subDetails?.periodEnd}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Account Info Summary */}
            {userProfile && (userProfile.businessName || userProfile.contactName) && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Business Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 text-sm md:grid-cols-2">
                            {userProfile.businessName && (
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span>{userProfile.businessName}</span>
                                </div>
                            )}
                            {userProfile.contactName && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{userProfile.contactName}</span>
                                </div>
                            )}
                            {userProfile.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{userProfile.email}</span>
                                </div>
                            )}
                            {(userProfile.cellPhone || userProfile.phone) && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{userProfile.cellPhone || userProfile.phone}</span>
                                </div>
                            )}
                            {userProfile.adWebsiteUrl && (
                                <div className="flex items-center gap-2 md:col-span-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <a
                                        href={userProfile.adWebsiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        {userProfile.adWebsiteUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Separator />

            {/* Ad Workflow Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Your Advertisement</h2>
                {userProfile && (
                    <CustomerWorkflow
                        userId={user.uid}
                        userProfile={userProfile}
                        advertisement={advertisement}
                        allAdvertisements={allAdvertisements}
                        subscriptionId={activeSubscription.id}
                        isAdmin={false}
                        onRefresh={handleRefresh}
                    />
                )}
            </div>
        </div>
    );
}
