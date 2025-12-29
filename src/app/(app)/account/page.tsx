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
import { trackPurchase, setCustomerType } from '@/lib/analytics';

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
    trend,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    description: string;
    highlight?: boolean;
    trend?: 'up' | 'down' | 'neutral';
}) {
    return (
        <Card className={cn(
            'relative overflow-hidden transition-all hover:shadow-lg',
            highlight && 'ring-2 ring-primary ring-offset-2'
        )}>
            <CardContent className="pt-6 pb-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <span className="text-sm font-medium text-muted-foreground">{title}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight">{value}</span>
                            {trend === 'up' && (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <div className={cn(
                        'p-3 rounded-xl',
                        highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                        {icon}
                    </div>
                </div>
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
            'group h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
            variant === 'primary' && 'border-primary/30 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent',
            disabled && 'opacity-60 hover:translate-y-0 hover:shadow-none'
        )}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className={cn(
                        'p-3 rounded-xl inline-flex transition-colors',
                        variant === 'primary'
                            ? 'bg-primary/10 text-primary group-hover:bg-primary/20'
                            : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                    )}>
                        {icon}
                    </div>
                    {badge && (
                        <Badge variant={badge.variant} className="font-medium">{badge.text}</Badge>
                    )}
                </div>
                <CardTitle className="text-lg mt-4">{title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
            </CardHeader>
            <CardFooter className="pt-0 mt-auto">
                <Button
                    className={cn(
                        'w-full transition-all',
                        variant === 'primary' && 'shadow-md hover:shadow-lg'
                    )}
                    variant={variant === 'primary' ? 'default' : 'outline'}
                    disabled={disabled}
                    onClick={onClick}
                >
                    {buttonText}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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

    // Track successful purchase/subscription when a new subscription is detected
    useEffect(() => {
        if (!activeSubscription || !user) return;

        // Check if we've already tracked this subscription
        const trackedSubId = sessionStorage.getItem('tracked_subscription_id');
        if (trackedSubId === activeSubscription.id) return;

        // Check if this is a new subscription (created in the last 5 minutes)
        const createdAt = activeSubscription.created?.seconds
            ? activeSubscription.created.seconds * 1000
            : null;
        const isNewSubscription = createdAt && (Date.now() - createdAt < 5 * 60 * 1000);

        if (isNewSubscription) {
            // Get plan details
            const planName = activeSubscription.items?.[0]?.price?.product?.name
                || activeSubscription.planName
                || 'Subscription';
            const unitAmount = activeSubscription.items?.[0]?.price?.unit_amount
                || (activeSubscription.amount ? activeSubscription.amount * 100 : 0);
            const interval = activeSubscription.items?.[0]?.price?.recurring?.interval
                || 'month';

            // Track the purchase
            trackPurchase({
                transactionId: activeSubscription.id,
                plan: {
                    id: activeSubscription.items?.[0]?.price?.id || activeSubscription.id,
                    name: planName,
                    price: unitAmount / 100,
                    billingCycle: interval === 'year' ? 'yearly' : 'monthly',
                },
                userId: user.uid,
            });

            // Set user properties for future segmentation
            setCustomerType({
                planName: planName,
                billingCycle: interval === 'year' ? 'yearly' : 'monthly',
                isNewCustomer: true,
            });

            // Mark as tracked to prevent duplicate events
            sessionStorage.setItem('tracked_subscription_id', activeSubscription.id);
        }
    }, [activeSubscription, user]);

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
            <div className="min-h-[80vh] flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div className="w-full max-w-4xl mx-auto space-y-8">
                        {/* Header skeleton */}
                        <div className="text-center space-y-3">
                            <Skeleton className="h-10 w-64 mx-auto" />
                            <Skeleton className="h-5 w-80 mx-auto" />
                        </div>
                        {/* Stats skeleton */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Skeleton className="h-32 rounded-xl" />
                            <Skeleton className="h-32 rounded-xl" />
                            <Skeleton className="h-32 rounded-xl" />
                        </div>
                        {/* Cards skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Skeleton className="h-56 rounded-xl" />
                            <Skeleton className="h-56 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="w-full max-w-md mx-auto">
                    <Alert className="border-2">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle className="text-lg">Please log in</AlertTitle>
                        <AlertDescription className="mt-2">
                            You need to be logged in to view your account.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    // No subscription - show compelling sales pitch
    if (!activeSubscription) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-4xl mx-auto">
                    <SubscriptionPitch />
                </div>
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
            <div className="min-h-[80vh] px-4 py-8">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    {/* Back Button */}
                    <Button variant="ghost" onClick={() => setShowWorkflow(false)} className="gap-2 -ml-2">
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        Back to Dashboard
                    </Button>

                    <div className="text-center pb-2">
                        <h1 className="text-2xl md:text-3xl font-bold">Your Advertisement</h1>
                        <p className="text-muted-foreground mt-2">
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
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] px-4 py-8">
            <div className="w-full max-w-5xl mx-auto space-y-8">
                {/* Welcome Header - Hero Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6 md:p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
                                {userProfile?.businessName
                                    ? `Welcome back, ${userProfile.businessName}!`
                                    : userProfile?.contactName
                                    ? `Welcome back, ${userProfile.contactName}!`
                                    : 'Welcome to your dashboard!'}
                            </h1>
                            <p className="text-muted-foreground text-base md:text-lg max-w-xl">
                                {isLive
                                    ? 'Your advertisement is live and reaching customers on our community websites.'
                                    : isPaused
                                    ? 'Your advertisement is currently paused. Resume it anytime to start reaching customers again.'
                                    : 'Complete your setup to start advertising to thousands of local customers.'}
                            </p>
                        </div>
                        <Badge
                            variant={isLive ? 'default' : isPaused ? 'secondary' : 'outline'}
                            className={cn(
                                'px-4 py-2 text-sm font-medium shrink-0 self-start md:self-center',
                                isLive && 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200',
                                isPaused && 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200'
                            )}
                        >
                            {isLive && <CheckCircle className="h-4 w-4 mr-2" />}
                            {isPaused && <Clock className="h-4 w-4 mr-2" />}
                            {isInProgress && <Sparkles className="h-4 w-4 mr-2" />}
                            {AD_STATUS_CUSTOMER_LABELS[status]}
                        </Badge>
                    </div>
                </div>

                {/* Step 1 Setup Alert - Very Noticeable */}
                {status === 'info_needed' && (
                    <Alert className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg rounded-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="p-2.5 rounded-full bg-amber-100 shrink-0">
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto bg-muted/80 p-1 rounded-xl">
                        <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:shadow-md">
                            <Megaphone className="h-4 w-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="subscription" className="gap-2 rounded-lg data-[state=active]:shadow-md">
                            <Wallet className="h-4 w-4" />
                            <span className="hidden sm:inline">Subscription</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:shadow-md">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-8">
                        {/* Stats Section (only if ad is live or paused) */}
                        {(isLive || isPaused) && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    <h2 className="text-xl font-semibold">Ad Performance</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <StatCard
                                        title="Impressions"
                                        value={formatNumber(impressions)}
                                        icon={<Eye className="w-5 h-5" />}
                                        description="Times your ad was shown"
                                    />
                                    <StatCard
                                        title="Clicks"
                                        value={formatNumber(clicks)}
                                        icon={<MousePointer className="w-5 h-5" />}
                                        description="Visits to your website"
                                        trend={clicks > 0 ? 'up' : 'neutral'}
                                    />
                                    <StatCard
                                        title="Click Rate"
                                        value={`${ctr}%`}
                                        icon={<Target className="w-5 h-5" />}
                                        description="Percentage of viewers who clicked"
                                        highlight={ctr > 2}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Progress Section (if workflow is in progress) */}
                        {isInProgress && (
                            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Sparkles className="h-5 w-5 text-primary" />
                                            Setup Progress
                                        </CardTitle>
                                        <Badge variant="outline" className="font-medium">
                                            Step {workflowStep} of 6
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Progress value={(workflowStep / 6) * 100} className="h-3" />
                                    <p className="text-sm text-muted-foreground">
                                        {AD_STATUS_CUSTOMER_LABELS[status]}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Cards */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <ArrowRight className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-semibold">Quick Actions</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="h-5 w-5 text-primary" />
                                    <h2 className="text-xl font-semibold">Your Advertisement</h2>
                                </div>
                                <Card className="overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="md:w-1/2 bg-muted/30 p-6 flex items-center justify-center">
                                                <img
                                                    src={advertisement.adProofUrl}
                                                    alt="Your advertisement"
                                                    className="rounded-lg border shadow-md max-w-full max-h-80 object-contain"
                                                />
                                            </div>
                                            <div className="md:w-1/2 p-6 flex flex-col justify-center space-y-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground mb-1">Links to</p>
                                                    <a
                                                        href={advertisement.adProofDestinationUrl || advertisement.adWebsiteUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline flex items-center gap-1.5 font-medium"
                                                    >
                                                        {advertisement.adProofDestinationUrl || advertisement.adWebsiteUrl}
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </div>
                                                <div className="flex flex-wrap gap-3 pt-2">
                                                    <Button variant="outline" onClick={() => setShowWorkflow(true)}>
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                        Request Change
                                                    </Button>
                                                    <Link href="/directory-listing">
                                                        <Button variant="outline">
                                                            <LayoutGrid className="h-4 w-4 mr-2" />
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="overflow-hidden">
                                <CardHeader className="bg-muted/30">
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        Account Information
                                    </CardTitle>
                                    <CardDescription>
                                        Manage your account details and preferences
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                                            <p className="font-medium">{user?.email || '-'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Name</p>
                                            <p className="font-medium">{userProfile?.businessName || '-'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Name</p>
                                            <p className="font-medium">{userProfile?.contactName || '-'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
                                            <p className="font-medium">{userProfile?.phone || '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between border-t pt-6 bg-muted/20">
                                    <p className="text-sm text-muted-foreground">
                                        Update your business information in the ad workflow.
                                    </p>
                                    <Button variant="outline" onClick={() => setShowWorkflow(true)}>
                                        Edit Profile
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Subscription Summary in Settings */}
                            <Card className="overflow-hidden">
                                <CardHeader className="bg-muted/30">
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                        </div>
                                        Billing Summary
                                    </CardTitle>
                                    <CardDescription>
                                        Quick overview of your subscription
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Plan</p>
                                            <p className="font-medium">{subDetails?.planName || '-'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Cost</p>
                                            <p className="font-medium text-lg">{subDetails?.price || '-'}/month</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Billing Date</p>
                                            <p className="font-medium">{subDetails?.periodEnd || '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-6 bg-muted/20">
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
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
