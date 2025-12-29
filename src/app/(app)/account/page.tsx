'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    doc,
    onSnapshot,
    collection,
    query,
    addDoc,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2,
    AlertCircle,
    CreditCard,
    Calendar,
    CheckCircle,
    ExternalLink,
    Megaphone,
    Paintbrush,
    LayoutGrid,
    Eye,
    MousePointer,
    Target,
    TrendingUp,
    ArrowRight,
    Settings,
    Sparkles,
    Clock,
    RefreshCw,
    User,
    Wallet,
    AlertTriangle,
    Rocket,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

// Subscription Manager Component
import { SubscriptionManager } from '@/components/account/subscription-manager';

// Workflow Components
import { CustomerWorkflow } from '@/components/workflow/CustomerWorkflow';
import { WorkflowProgress } from '@/components/workflow/WorkflowProgress';
import { SubscriptionPitch } from '@/components/dashboard/subscription-pitch';
import { cn } from '@/lib/utils';
import {
    type Advertisement,
    type UserProfile,
    type AdStatus,
    normalizeAdStatus,
    AD_STATUS_LABELS,
    AD_STATUS_CUSTOMER_LABELS,
    getWorkflowStepNumber,
    isWorkflowComplete,
    calculateCTR,
} from '@/lib/types';

interface Subscription {
    id: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired';
    planName?: string;
    price?: string;
    periodEnd?: string;
    created?: { seconds: number };
    current_period_start?: { seconds: number };
    current_period_end?: { seconds: number };
    cancel_at_period_end?: boolean;
    canceled_at?: { seconds: number };
    trial_end?: { seconds: number };
    items?: Array<{
        price: {
            id: string;
            product: { name: string; description?: string };
            unit_amount: number;
            recurring?: { interval: 'month' | 'year'; interval_count?: number };
        };
    }>;
    // Manual subscription fields
    isManualEntry?: boolean;
    amount?: number;
    billingPeriod?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';
    startDate?: { seconds: number };
    endDate?: { seconds: number };
}

// Stat Card Component
function StatCard({
    title,
    value,
    icon,
    description,
    highlight = false,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    description: string;
    highlight?: boolean;
}) {
    return (
        <Card className={cn(highlight && 'ring-2 ring-primary ring-offset-2')}>
            <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground text-sm">{title}</span>
                    <span className="text-muted-foreground">{icon}</span>
                </div>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    );
}

// Action Card Component
function ActionCard({
    title,
    description,
    icon,
    buttonText,
    href,
    onClick,
    disabled = false,
    variant = 'default',
    badge,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    buttonText: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'primary' | 'outline';
    badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
}) {
    const cardContent = (
        <Card className={cn(
            'h-full transition-all hover:shadow-md',
            variant === 'primary' && 'border-primary/50 bg-primary/5',
            disabled && 'opacity-60'
        )}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className={cn(
                        'p-2.5 rounded-lg inline-flex',
                        variant === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                        {icon}
                    </div>
                    {badge && (
                        <Badge variant={badge.variant}>{badge.text}</Badge>
                    )}
                </div>
                <CardTitle className="text-lg mt-3">{title}</CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
                <Button
                    className="w-full"
                    variant={variant === 'primary' ? 'default' : 'outline'}
                    disabled={disabled}
                    onClick={onClick}
                >
                    {buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );

    if (href && !disabled) {
        return <Link href={href} className="block h-full">{cardContent}</Link>;
    }

    return cardContent;
}

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
}

export default function AccountPage() {
    const { user, isUserLoading: userLoading } = useUser();
    const { firestore } = useFirebase();
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
    const [showWorkflow, setShowWorkflow] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

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

        // Subscribe to advertisements
        const adsUnsubscribe = onSnapshot(
            query(
                collection(firestore, 'users', user.uid, 'advertisements'),
                orderBy('createdAt', 'desc')
            ),
            async (snapshot) => {
                if (!snapshot.empty) {
                    const allAds = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Advertisement));
                    setAllAdvertisements(allAds);
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
            <div className="container max-w-6xl py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-52" />
                    <Skeleton className="h-52" />
                    <Skeleton className="h-52" />
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="container max-w-4xl py-8">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Please log in</AlertTitle>
                    <AlertDescription>
                        You need to be logged in to view your account.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // No subscription - show compelling sales pitch
    if (!activeSubscription) {
        return (
            <div className="container max-w-4xl py-8">
                <SubscriptionPitch />
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
    const status: AdStatus = advertisement?.status
        ? normalizeAdStatus(advertisement.status)
        : 'info_needed';
    const isLive = status === 'live';
    const isPaused = status === 'paused';
    const isInProgress = !isWorkflowComplete(status);
    const workflowStep = getWorkflowStepNumber(status);

    // Calculate ad stats
    const impressions = advertisement?.impressions || 0;
    const clicks = advertisement?.clicks || 0;
    const ctr = calculateCTR(impressions, clicks);

    // Determine what action cards to show
    const getActionCards = () => {
        const cards = [];

        // If workflow is not complete, show the build ad card
        if (isInProgress) {
            cards.push({
                key: 'build',
                title: 'Build Your Advertisement',
                description: status === 'info_needed'
                    ? 'Start by telling us about your business and designing your ad.'
                    : status === 'design_pending'
                    ? 'Continue designing your advertisement or request custom design.'
                    : status === 'in_review'
                    ? 'Our team is working on your ad. We\'ll notify you when it\'s ready.'
                    : status === 'customer_approval'
                    ? 'Your ad proof is ready! Review and approve it to go live.'
                    : status === 'approved'
                    ? 'Your ad is approved and will be published soon!'
                    : 'Continue setting up your advertisement.',
                icon: <Paintbrush className="h-5 w-5" />,
                buttonText: status === 'in_review' || status === 'approved' ? 'View Status' : 'Continue Setup',
                onClick: () => setShowWorkflow(true),
                variant: 'primary' as const,
                badge: { text: AD_STATUS_CUSTOMER_LABELS[status], variant: 'secondary' as const },
            });
        }

        // If ad is live or paused, show request change card
        if (isLive || isPaused) {
            cards.push({
                key: 'change',
                title: 'Request Ad Change',
                description: 'Want to update your advertisement? Request a design change and our team will help you.',
                icon: <RefreshCw className="h-5 w-5" />,
                buttonText: 'Request Change',
                onClick: () => setShowWorkflow(true),
                variant: 'default' as const,
            });
        }

        // If ad is live, show edit directory listing card
        if (isLive) {
            cards.push({
                key: 'directory',
                title: 'Edit Directory Listing',
                description: 'Customize how your business appears in the sponsor directory with your description, hours, and social links.',
                icon: <LayoutGrid className="h-5 w-5" />,
                buttonText: 'Edit Listing',
                href: '/directory-listing',
                variant: 'default' as const,
            });
        }

        // Always show manage subscription card
        cards.push({
            key: 'subscription',
            title: 'Manage Subscription',
            description: `${subDetails?.planName} - ${subDetails?.price}/month. Renews ${subDetails?.periodEnd}.`,
            icon: <CreditCard className="h-5 w-5" />,
            buttonText: 'Billing & Subscription',
            onClick: handleBillingPortal,
            disabled: billingLoading,
            variant: 'outline' as const,
        });

        return cards;
    };

    const actionCards = getActionCards();

    // If user clicked to view workflow, show the workflow component
    if (showWorkflow) {
        return (
            <div className="container max-w-4xl py-8 space-y-6">
                {/* Back Button */}
                <Button variant="ghost" onClick={() => setShowWorkflow(false)} className="gap-2">
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    Back to Dashboard
                </Button>

                <div>
                    <h1 className="text-2xl font-bold">Your Advertisement</h1>
                    <p className="text-muted-foreground">
                        {isLive || isPaused
                            ? 'Manage your live advertisement or request changes.'
                            : 'Complete the steps below to get your ad live.'}
                    </p>
                </div>

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
        );
    }

    return (
        <div className="container max-w-6xl py-8 space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        {userProfile?.businessName
                            ? `Welcome, ${userProfile.businessName}!`
                            : userProfile?.contactName
                            ? `Welcome, ${userProfile.contactName}!`
                            : 'Welcome!'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isLive
                            ? 'Your advertisement is live on our community websites.'
                            : isPaused
                            ? 'Your advertisement is currently paused.'
                            : 'Complete your setup to start advertising.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={isLive ? 'default' : isPaused ? 'secondary' : 'outline'}
                        className={cn(
                            'px-3 py-1',
                            isLive && 'bg-green-100 text-green-700 hover:bg-green-100',
                            isPaused && 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        )}
                    >
                        {isLive && <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                        {isPaused && <Clock className="h-3.5 w-3.5 mr-1.5" />}
                        {isInProgress && <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                        {AD_STATUS_CUSTOMER_LABELS[status]}
                    </Badge>
                </div>
            </div>

            {/* Step 1 Setup Alert - Very Noticeable */}
            {status === 'info_needed' && (
                <Alert className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-full bg-amber-100 shrink-0">
                                <AlertTriangle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="space-y-1">
                                <AlertTitle className="text-lg font-semibold text-amber-900">
                                    Complete Your Setup to Get Started!
                                </AlertTitle>
                                <AlertDescription className="text-amber-800">
                                    Your ad subscription is active, but you need to complete a few quick steps before your advertisement can go live on community websites.
                                </AlertDescription>
                            </div>
                        </div>
                        <Button
                            size="lg"
                            onClick={() => setShowWorkflow(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shrink-0"
                        >
                            <Rocket className="h-5 w-5 mr-2" />
                            Start Setup Now
                        </Button>
                    </div>
                </Alert>
            )}

            {/* Tabbed Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="overview" className="gap-2">
                        <Megaphone className="h-4 w-4" />
                        <span className="hidden sm:inline">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="subscription" className="gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="hidden sm:inline">Subscription</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline">Settings</span>
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Stats Section (only if ad is live or paused) */}
                    {(isLive || isPaused) && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold">Ad Performance</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard
                                    title="Impressions"
                                    value={formatNumber(impressions)}
                                    icon={<Eye className="w-4 h-4" />}
                                    description="Times your ad was shown"
                                />
                                <StatCard
                                    title="Clicks"
                                    value={formatNumber(clicks)}
                                    icon={<MousePointer className="w-4 h-4" />}
                                    description="Visits to your website"
                                />
                                <StatCard
                                    title="Click Rate"
                                    value={`${ctr}%`}
                                    icon={<Target className="w-4 h-4" />}
                                    description="Percentage of viewers who clicked"
                                    highlight={ctr > 2}
                                />
                            </div>
                        </div>
                    )}

                    {/* Progress Section (if workflow is in progress) */}
                    {isInProgress && (
                        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        Setup Progress
                                    </CardTitle>
                                    <span className="text-sm text-muted-foreground">
                                        Step {workflowStep} of 6
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={(workflowStep / 6) * 100} className="h-2 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    {AD_STATUS_CUSTOMER_LABELS[status]}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Cards */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {actionCards.map((card) => (
                                <ActionCard
                                    key={card.key}
                                    title={card.title}
                                    description={card.description}
                                    icon={card.icon}
                                    buttonText={card.buttonText}
                                    href={card.href}
                                    onClick={card.onClick}
                                    disabled={card.disabled}
                                    variant={card.variant}
                                    badge={card.badge}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Ad Preview (if ad is live or has proof) */}
                    {advertisement?.adProofUrl && (isLive || isPaused) && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold">Your Advertisement</h2>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row gap-6 items-center">
                                        <div className="w-full md:w-auto">
                                            <img
                                                src={advertisement.adProofUrl}
                                                alt="Your advertisement"
                                                className="rounded-lg border shadow-sm max-w-full md:max-w-md"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Links to</p>
                                                <a
                                                    href={advertisement.adProofDestinationUrl || advertisement.adWebsiteUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {advertisement.adProofDestinationUrl || advertisement.adWebsiteUrl}
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setShowWorkflow(true)}>
                                                    Request Change
                                                </Button>
                                                <Link href="/directory-listing">
                                                    <Button variant="outline" size="sm">
                                                        Edit Directory
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* Subscription Tab */}
                <TabsContent value="subscription" className="space-y-6">
                    {activeSubscription && (
                        <SubscriptionManager
                            subscription={activeSubscription}
                            adsCount={allAdvertisements.filter(ad =>
                                ad.status === 'live' || ad.status === 'paused'
                            ).length}
                            onManageBilling={handleBillingPortal}
                            onChangePlan={() => router.push('/pricing')}
                            isLoading={billingLoading}
                        />
                    )}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Account Information
                            </CardTitle>
                            <CardDescription>
                                Manage your account details and preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{user?.email || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Business Name</p>
                                    <p className="font-medium">{userProfile?.businessName || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Contact Name</p>
                                    <p className="font-medium">{userProfile?.contactName || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <p className="font-medium">{userProfile?.phone || '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t pt-6">
                            <p className="text-sm text-muted-foreground">
                                Update your business information in the ad workflow.
                            </p>
                            <Button variant="outline" onClick={() => setShowWorkflow(true)}>
                                Edit Profile
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Subscription Summary in Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Billing Summary
                            </CardTitle>
                            <CardDescription>
                                Quick overview of your subscription
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Current Plan</p>
                                    <p className="font-medium">{subDetails?.planName || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Monthly Cost</p>
                                    <p className="font-medium">{subDetails?.price || '-'}/month</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Next Billing Date</p>
                                    <p className="font-medium">{subDetails?.periodEnd || '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-6">
                            <Button
                                onClick={() => setActiveTab('subscription')}
                                variant="outline"
                                className="w-full"
                            >
                                <Wallet className="h-4 w-4 mr-2" />
                                Manage Subscription
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
