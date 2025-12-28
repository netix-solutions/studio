'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    getDocs,
    doc,
    onSnapshot,
    updateDoc,
    setDoc,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    where,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    AlertCircle,
    Search,
    Users,
    ChevronRight,
    UserCircle,
    ArrowRight,
    ArrowLeft,
    Upload,
    X,
    CheckCircle,
    Play,
    Megaphone,
    ExternalLink,
    Eye,
    Building2,
    Mail,
    Phone,
    Globe,
    Image as ImageIcon,
    FileText,
    Send,
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Workflow Components
import { WorkflowProgress, WorkflowStatusBanner } from '@/components/workflow/WorkflowProgress';
import { CustomerWorkflow } from '@/components/workflow/CustomerWorkflow';
import {
    type Advertisement,
    type AdStatus,
    type UserProfile,
    normalizeAdStatus,
    AD_STATUS_LABELS,
    AD_STATUS_ADMIN_ACTIONS,
    AD_STATUS_COLORS,
    AD_PIPELINE_STAGE_COLORS,
    AD_DIMENSIONS,
    getNextWorkflowStatus,
    isAdActive,
} from '@/lib/types';

interface CustomerData {
    id: string;
    email: string;
    businessName?: string;
    contactName?: string;
    cellPhone?: string;
    phone?: string;
    adWebsiteUrl?: string;
    logoUrl?: string;
    createdAt?: any;
    updatedAt?: any;
}

interface CustomerSubscription {
    id: string;
    status: string;
    planName: string;
    price: string;
    periodEnd: string;
}

type ViewMode = 'list' | 'manage';

export default function CustomerWorkflowPage() {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();

    // State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Customer data
    const [customersWithAds, setCustomersWithAds] = useState<Array<{
        customer: CustomerData;
        advertisement: Advertisement | null;
        subscription: CustomerSubscription | null;
    }>>([]);

    // Selected customer for management
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
    const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
    const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscription | null>(null);

    // Admin actions
    const [isUpdating, setIsUpdating] = useState(false);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [showProofUploadDialog, setShowProofUploadDialog] = useState(false);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofDestinationUrl, setProofDestinationUrl] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // Load all customers with their ads
    useEffect(() => {
        if (!firestore) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Get all users
                const usersSnapshot = await getDocs(collection(firestore, 'users'));
                const results: Array<{
                    customer: CustomerData;
                    advertisement: Advertisement | null;
                    subscription: CustomerSubscription | null;
                }> = [];

                for (const userDoc of usersSnapshot.docs) {
                    const customer: CustomerData = {
                        id: userDoc.id,
                        email: userDoc.data().email || '',
                        ...userDoc.data(),
                    };

                    // Get customer's most recent advertisement
                    const adsQuery = query(
                        collection(firestore, 'users', customer.id, 'advertisements'),
                        orderBy('createdAt', 'desc')
                    );
                    const adsSnapshot = await getDocs(adsQuery);
                    const advertisement = adsSnapshot.docs.length > 0
                        ? { id: adsSnapshot.docs[0].id, ...adsSnapshot.docs[0].data() } as Advertisement
                        : null;

                    // Get customer's active subscription
                    const subsSnapshot = await getDocs(
                        collection(firestore, 'customers', customer.id, 'subscriptions')
                    );
                    let subscription: CustomerSubscription | null = null;
                    for (const subDoc of subsSnapshot.docs) {
                        const subData = subDoc.data();
                        if (subData.status === 'active' || subData.status === 'trialing') {
                            const priceData = subData.items?.[0]?.price;
                            subscription = {
                                id: subDoc.id,
                                status: subData.status,
                                planName: priceData?.product?.name || 'Subscription',
                                price: priceData?.unit_amount
                                    ? `$${(priceData.unit_amount / 100).toFixed(0)}/mo`
                                    : '-',
                                periodEnd: subData.current_period_end?.seconds
                                    ? format(new Date(subData.current_period_end.seconds * 1000), 'MMM d, yyyy')
                                    : '-',
                            };
                            break;
                        }
                    }

                    // Only include customers with ads or active subscriptions
                    if (advertisement || subscription) {
                        results.push({ customer, advertisement, subscription });
                    }
                }

                // Sort by most recent activity
                results.sort((a, b) => {
                    const aTime = a.advertisement?.updatedAt?.seconds || a.customer.updatedAt?.seconds || 0;
                    const bTime = b.advertisement?.updatedAt?.seconds || b.customer.updatedAt?.seconds || 0;
                    return bTime - aTime;
                });

                setCustomersWithAds(results);
            } catch (error) {
                console.error('Error loading data:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load customer data.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [firestore, toast, refreshKey]);

    // Filter customers
    const filteredCustomers = customersWithAds.filter(({ customer, advertisement }) => {
        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                customer.email?.toLowerCase().includes(q) ||
                customer.businessName?.toLowerCase().includes(q) ||
                customer.contactName?.toLowerCase().includes(q);
            if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
            const adStatus = advertisement ? normalizeAdStatus(advertisement.status) : null;
            if (adStatus !== statusFilter) return false;
        }

        return true;
    });

    // Status counts for quick filters
    const statusCounts = customersWithAds.reduce((acc, { advertisement }) => {
        const status = advertisement ? normalizeAdStatus(advertisement.status) : 'no_ad';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Handle customer selection
    const handleSelectCustomer = (
        customer: CustomerData,
        advertisement: Advertisement | null,
        subscription: CustomerSubscription | null
    ) => {
        setSelectedCustomer(customer);
        setSelectedAd(advertisement);
        setSelectedSubscription(subscription);
        setProofDestinationUrl(advertisement?.adProofDestinationUrl || customer.adWebsiteUrl || '');
        setViewMode('manage');
    };

    // Handle status update
    const handleStatusUpdate = async (newStatus: AdStatus) => {
        if (!firestore || !selectedCustomer || !selectedAd) return;

        setIsUpdating(true);
        try {
            const adRef = doc(firestore, 'users', selectedCustomer.id, 'advertisements', selectedAd.id);

            const updateData: Record<string, any> = {
                status: newStatus,
                updatedAt: serverTimestamp(),
                lastActionBy: 'admin',
                lastActionAt: serverTimestamp(),
            };

            // Add appropriate timestamps
            if (newStatus === 'in_review') {
                updateData.sentForReviewAt = serverTimestamp();
            } else if (newStatus === 'customer_approval') {
                updateData.sentForApprovalAt = serverTimestamp();
                // Set auto-approval deadline (48 hours)
                const autoApprovalDate = new Date();
                autoApprovalDate.setHours(autoApprovalDate.getHours() + 48);
                updateData.autoApprovalAt = autoApprovalDate;
            } else if (newStatus === 'approved') {
                updateData.approvedAt = serverTimestamp();
            } else if (newStatus === 'live') {
                updateData.liveAt = serverTimestamp();
            }

            await updateDoc(adRef, updateData);

            setSelectedAd({ ...selectedAd, status: newStatus });
            setRefreshKey(k => k + 1);

            toast({
                title: 'Status updated',
                description: `Ad status changed to ${AD_STATUS_LABELS[newStatus]}.`,
            });
        } catch (error) {
            console.error('Error updating status:', error);
            toast({
                title: 'Error',
                description: 'Failed to update status.',
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle proof upload
    const handleProofUpload = async () => {
        if (!firestore || !storage || !selectedCustomer || !selectedAd || !proofFile) return;

        setIsUpdating(true);
        try {
            // Upload the proof image
            const filePath = `users/${selectedCustomer.id}/ad-proofs/${Date.now()}-${proofFile.name}`;
            const fileRef = storageRef(storage, filePath);
            await uploadBytes(fileRef, proofFile);
            const proofUrl = await getDownloadURL(fileRef);

            // Update the ad with proof and move to customer_approval
            const adRef = doc(firestore, 'users', selectedCustomer.id, 'advertisements', selectedAd.id);

            const autoApprovalDate = new Date();
            autoApprovalDate.setHours(autoApprovalDate.getHours() + 48);

            await updateDoc(adRef, {
                adProofUrl: proofUrl,
                adProofDestinationUrl: proofDestinationUrl,
                status: 'customer_approval',
                sentForApprovalAt: serverTimestamp(),
                autoApprovalAt: autoApprovalDate,
                updatedAt: serverTimestamp(),
                lastActionBy: 'admin',
                lastActionAt: serverTimestamp(),
            });

            setSelectedAd({
                ...selectedAd,
                adProofUrl: proofUrl,
                adProofDestinationUrl: proofDestinationUrl,
                status: 'customer_approval',
            });

            setShowProofUploadDialog(false);
            setProofFile(null);
            setRefreshKey(k => k + 1);

            toast({
                title: 'Proof uploaded',
                description: 'The ad proof has been uploaded and sent to the customer for approval.',
            });
        } catch (error) {
            console.error('Error uploading proof:', error);
            toast({
                title: 'Error',
                description: 'Failed to upload proof.',
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle publish to ad manager
    const handlePublishToAdManager = async () => {
        if (!firestore || !selectedCustomer || !selectedAd) return;

        setIsUpdating(true);
        try {
            // Create live_ad document
            const liveAdData = {
                name: `${selectedAd.businessName || selectedCustomer.businessName} - ${selectedAd.id.slice(0, 6)}`,
                description: `Advertisement for ${selectedAd.businessName || selectedCustomer.businessName}`,
                imageUrl: selectedAd.adProofUrl,
                targetUrl: selectedAd.adProofDestinationUrl || selectedAd.adWebsiteUrl || selectedCustomer.adWebsiteUrl || '',
                altText: `Advertisement for ${selectedAd.businessName || selectedCustomer.businessName}`,
                placement: 'inline',
                width: AD_DIMENSIONS.WIDTH,
                height: AD_DIMENSIONS.HEIGHT,
                weight: 50,
                status: 'active',
                targetWebsites: [],
                startDate: null,
                endDate: null,
                sourceAdvertisementId: selectedAd.id,
                customerId: selectedCustomer.id,
                customerName: selectedAd.businessName || selectedCustomer.businessName,
                impressions: 0,
                clicks: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const liveAdRef = await addDoc(collection(firestore, 'live_ads'), liveAdData);

            // Update the advertisement
            const adRef = doc(firestore, 'users', selectedCustomer.id, 'advertisements', selectedAd.id);
            await updateDoc(adRef, {
                status: 'live',
                liveAdId: liveAdRef.id,
                publishedAt: serverTimestamp(),
                liveAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActionBy: 'admin',
                lastActionAt: serverTimestamp(),
            });

            setSelectedAd({ ...selectedAd, status: 'live', liveAdId: liveAdRef.id });
            setShowPublishDialog(false);
            setRefreshKey(k => k + 1);

            toast({
                title: 'Published!',
                description: 'The ad is now live on community websites.',
            });
        } catch (error) {
            console.error('Error publishing:', error);
            toast({
                title: 'Error',
                description: 'Failed to publish to ad manager.',
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRefresh = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    // Render list view
    const renderListView = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Customer Workflow</h1>
                    <p className="text-muted-foreground">
                        Manage customer ad workflows and complete steps on their behalf.
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { status: 'info_needed', label: 'Info Needed' },
                    { status: 'design_pending', label: 'Design Pending' },
                    { status: 'in_review', label: 'In Review' },
                    { status: 'customer_approval', label: 'Awaiting Approval' },
                    { status: 'approved', label: 'Ready to Publish' },
                ].map(({ status, label }) => {
                    const colors = AD_PIPELINE_STAGE_COLORS[status as AdStatus];
                    const count = statusCounts[status] || 0;
                    const isActive = statusFilter === status;

                    return (
                        <Card
                            key={status}
                            className={cn(
                                "cursor-pointer transition-all hover:shadow-md",
                                isActive && "ring-2 ring-primary",
                                colors?.bg
                            )}
                            onClick={() => setStatusFilter(isActive ? 'all' : status)}
                        >
                            <CardContent className="pt-4 pb-4">
                                <p className={cn("text-2xl font-bold", colors?.text)}>{count}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by email, business name, or contact..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {Object.entries(AD_STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {(searchQuery || statusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                }}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Customer List */}
            <Card>
                <CardHeader>
                    <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
                    <CardDescription>Click on a customer to manage their workflow.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No customers match your filters.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredCustomers.map(({ customer, advertisement, subscription }) => {
                                const status = advertisement ? normalizeAdStatus(advertisement.status) : null;
                                const colors = status ? AD_PIPELINE_STAGE_COLORS[status] : null;

                                return (
                                    <div
                                        key={customer.id}
                                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => handleSelectCustomer(customer, advertisement, subscription)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    {customer.logoUrl ? (
                                                        <Image
                                                            src={customer.logoUrl}
                                                            alt=""
                                                            width={48}
                                                            height={48}
                                                            className="rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <UserCircle className="h-7 w-7 text-primary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">
                                                        {customer.businessName || customer.contactName || 'Unnamed'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {subscription && (
                                                    <Badge variant="secondary" className="hidden md:inline-flex">
                                                        {subscription.planName}
                                                    </Badge>
                                                )}
                                                {status && (
                                                    <Badge className={cn(colors?.bg, colors?.text)}>
                                                        {AD_STATUS_LABELS[status]}
                                                    </Badge>
                                                )}
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                        {status && (
                                            <p className="text-xs text-muted-foreground mt-2 ml-16">
                                                Next: {AD_STATUS_ADMIN_ACTIONS[status]}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    // Render manage view
    const renderManageView = () => {
        if (!selectedCustomer) return null;

        const status = selectedAd ? normalizeAdStatus(selectedAd.status) : 'info_needed';
        const nextStatus = getNextWorkflowStatus(status);

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => setViewMode('list')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to List
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold">
                                {selectedCustomer.businessName || selectedCustomer.contactName || 'Customer'}
                            </h1>
                            <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {status === 'approved' && selectedAd?.adProofUrl && (
                            <Button
                                onClick={() => setShowPublishDialog(true)}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Megaphone className="mr-2 h-4 w-4" />
                                Publish to Ad Manager
                            </Button>
                        )}
                        {status === 'in_review' && (
                            <Button onClick={() => setShowProofUploadDialog(true)}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Ad Proof
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status Overview */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Workflow Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <WorkflowProgress currentStatus={status} className="mb-4" />
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mt-4">
                            <div>
                                <p className="font-medium">{AD_STATUS_LABELS[status]}</p>
                                <p className="text-sm text-muted-foreground">
                                    {AD_STATUS_ADMIN_ACTIONS[status]}
                                </p>
                            </div>
                            {nextStatus && status !== 'live' && (
                                <Button
                                    onClick={() => handleStatusUpdate(nextStatus)}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                    )}
                                    Move to {AD_STATUS_LABELS[nextStatus]}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Ad Proof */}
                {selectedAd?.adProofUrl && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Ad Proof</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="border rounded-lg p-2 bg-muted/30">
                                    <Image
                                        src={selectedAd.adProofUrl}
                                        alt="Ad Proof"
                                        width={AD_DIMENSIONS.WIDTH}
                                        height={AD_DIMENSIONS.HEIGHT}
                                        className="rounded"
                                    />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <Label className="text-muted-foreground">Destination URL</Label>
                                        <p className="font-medium">
                                            {selectedAd.adProofDestinationUrl || selectedAd.adWebsiteUrl || '-'}
                                        </p>
                                    </div>
                                    {selectedAd.liveAdId && (
                                        <div>
                                            <Label className="text-muted-foreground">Live Ad ID</Label>
                                            <p className="font-medium text-green-600">{selectedAd.liveAdId}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Customer Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            {selectedCustomer.businessName && (
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedCustomer.businessName}</span>
                                </div>
                            )}
                            {selectedCustomer.contactName && (
                                <div className="flex items-center gap-2">
                                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedCustomer.contactName}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{selectedCustomer.email}</span>
                            </div>
                            {(selectedCustomer.cellPhone || selectedCustomer.phone) && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedCustomer.cellPhone || selectedCustomer.phone}</span>
                                </div>
                            )}
                            {selectedCustomer.adWebsiteUrl && (
                                <div className="flex items-center gap-2 md:col-span-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <a
                                        href={selectedCustomer.adWebsiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        {selectedCustomer.adWebsiteUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription Info */}
                {selectedSubscription && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Subscription</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{selectedSubscription.planName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedSubscription.price} • Renews {selectedSubscription.periodEnd}
                                    </p>
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    {selectedSubscription.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Customer Assets */}
                {selectedAd && (selectedAd.customerSampleAdUrl || selectedAd.logoUrl || selectedAd.customerUploads?.length) && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Customer-Provided Assets</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedAd.customerSampleAdUrl && (
                                <div>
                                    <Label className="text-muted-foreground">Customer-Designed Ad</Label>
                                    <Image
                                        src={selectedAd.customerSampleAdUrl}
                                        alt="Customer ad"
                                        width={AD_DIMENSIONS.WIDTH}
                                        height={AD_DIMENSIONS.HEIGHT}
                                        className="border rounded mt-2"
                                    />
                                </div>
                            )}
                            <div className="flex gap-4 flex-wrap">
                                {selectedAd.logoUrl && (
                                    <div>
                                        <Label className="text-muted-foreground">Logo</Label>
                                        <Image
                                            src={selectedAd.logoUrl}
                                            alt="Logo"
                                            width={80}
                                            height={80}
                                            className="border rounded mt-2 object-contain"
                                        />
                                    </div>
                                )}
                                {selectedAd.customerUploads?.map((url, i) => (
                                    <div key={i}>
                                        <Label className="text-muted-foreground">Image {i + 1}</Label>
                                        <Image
                                            src={url}
                                            alt={`Upload ${i + 1}`}
                                            width={80}
                                            height={80}
                                            className="border rounded mt-2 object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                            {selectedAd.adTitle && (
                                <div>
                                    <Label className="text-muted-foreground">Title</Label>
                                    <p className="font-medium">{selectedAd.adTitle}</p>
                                </div>
                            )}
                            {selectedAd.adText && (
                                <div>
                                    <Label className="text-muted-foreground">Ad Text</Label>
                                    <p>{selectedAd.adText}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Quick Status Change */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Quick Status Change</CardTitle>
                        <CardDescription>Manually change the ad status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(AD_STATUS_LABELS).map(([statusValue, label]) => {
                                const isCurrentStatus = status === statusValue;
                                const colors = AD_PIPELINE_STAGE_COLORS[statusValue as AdStatus];

                                return (
                                    <Button
                                        key={statusValue}
                                        variant={isCurrentStatus ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={isCurrentStatus || isUpdating}
                                        onClick={() => handleStatusUpdate(statusValue as AdStatus)}
                                        className={cn(
                                            !isCurrentStatus && colors?.bg,
                                            !isCurrentStatus && colors?.text
                                        )}
                                    >
                                        {label}
                                    </Button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="flex-1">
            {viewMode === 'list' ? renderListView() : renderManageView()}

            {/* Publish Dialog */}
            <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5" />
                            Publish to Ad Manager
                        </DialogTitle>
                        <DialogDescription>
                            This will create a live ad and make it active on community websites.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAd?.adProofUrl && (
                        <div className="py-4">
                            <Image
                                src={selectedAd.adProofUrl}
                                alt="Ad to publish"
                                width={AD_DIMENSIONS.WIDTH}
                                height={AD_DIMENSIONS.HEIGHT}
                                className="border rounded mx-auto"
                            />
                            <p className="text-sm text-center text-muted-foreground mt-2">
                                Links to: {selectedAd.adProofDestinationUrl || selectedAd.adWebsiteUrl || '-'}
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePublishToAdManager}
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isUpdating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Publish Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Proof Upload Dialog */}
            <Dialog open={showProofUploadDialog} onOpenChange={setShowProofUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload Ad Proof
                        </DialogTitle>
                        <DialogDescription>
                            Upload the final ad image to send to the customer for approval.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Ad Image ({AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT})</Label>
                            {proofFile ? (
                                <div className="relative border rounded-lg p-2">
                                    <Image
                                        src={URL.createObjectURL(proofFile)}
                                        alt="Preview"
                                        width={AD_DIMENSIONS.WIDTH}
                                        height={AD_DIMENSIONS.HEIGHT}
                                        className="mx-auto"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6"
                                        onClick={() => setProofFile(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50"
                                    onClick={() => document.getElementById('proof-upload')?.click()}
                                >
                                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">Click to select image</p>
                                </div>
                            )}
                            <input
                                id="proof-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Destination URL</Label>
                            <Input
                                value={proofDestinationUrl}
                                onChange={(e) => setProofDestinationUrl(e.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProofUploadDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleProofUpload}
                            disabled={!proofFile || isUpdating}
                        >
                            {isUpdating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            Upload & Send for Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
