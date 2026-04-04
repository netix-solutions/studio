'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, collectionGroup, doc, updateDoc, serverTimestamp, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import {
    Loader2,
    AlertCircle,
    MoreHorizontal,
    Clock,
    CheckCircle,
    Eye,
    Search,
    Play,
    Pause,
    Mail,
    ExternalLink,
    Filter,
    RefreshCw,
    Archive,
    Trash2,
    MessageSquare,
    Download,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    AD_PIPELINE_STAGE_COLORS,
    AD_STATUS_ADMIN_ACTIONS,
    shouldAutoApprove,
    calculateAutoApprovalDeadline,
    normalizeAdStatus,
    type AdStatus,
    type Advertisement
} from '@/lib/types';
import { exportAdvertisementsZip } from '@/lib/export-data';

type AdWithMeta = Advertisement & {
    shouldAutoApprove?: boolean;
    normalizedStatus?: AdStatus;
    isChangeRequest?: boolean;
    changeRequestType?: 'self_design' | 'team_design';
    parentAdId?: string;
    liveAdId?: string;
    // Revision tracking
    revisionCount?: number;
    revisionNotes?: string;
    lastActionBy?: string;
    hasRevisionRequest?: boolean; // Computed: true if in_review with revisionCount > 0
};

// Status filter options - Updated for new workflow
const STATUS_FILTERS = [
    { value: 'all', label: 'All Ads', count: 0 },
    { value: 'action_required', label: 'Action Required', count: 0 },
    { value: 'revision_requests', label: 'Revision Requests', count: 0 },
    { value: 'change_requests', label: 'Change Requests', count: 0 },
    { value: 'info_needed', label: 'Info Needed', count: 0 },
    { value: 'design_pending', label: 'Design Pending', count: 0 },
    { value: 'in_review', label: 'In Review', count: 0 },
    { value: 'customer_approval', label: 'Awaiting Approval', count: 0 },
    { value: 'approved', label: 'Approved', count: 0 },
    { value: 'live', label: 'Live', count: 0 },
    { value: 'paused', label: 'Paused', count: 0 },
    { value: 'completed', label: 'Completed', count: 0 },
    { value: 'canceled', label: 'Canceled', count: 0 },
    { value: 'archived', label: 'Archived', count: 0 },
];

export default function AdvertisementsPage() {
    const [advertisements, setAdvertisements] = useState<AdWithMeta[]>([]);
    const [rawAdDocs, setRawAdDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [deleteConfirmAd, setDeleteConfirmAd] = useState<AdWithMeta | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const adsQuery = query(collectionGroup(firestore, 'advertisements'));

        const unsubscribe = onSnapshot(adsQuery, (snapshot) => {
            const adsData: AdWithMeta[] = snapshot.docs.map(doc => {
                const data = doc.data();
                // Normalize legacy statuses to new workflow statuses
                const rawStatus = data.status || 'info_needed';
                const normalizedStatus = normalizeAdStatus(rawStatus);

                // Determine if this is a revision request (in_review with customer feedback)
                const revisionCount = data.revisionCount || 0;
                const hasRevisionRequest = normalizedStatus === 'in_review' && revisionCount > 0;

                const ad: AdWithMeta = {
                    id: doc.id,
                    userId: data.userId,
                    subscriptionId: data.subscriptionId || '',
                    status: normalizedStatus,
                    adProofUrl: data.adProofUrl,
                    adProofDestinationUrl: data.adProofDestinationUrl,
                    businessName: data.businessName,
                    contactName: data.contactName,
                    email: data.email,
                    phone: data.phone,
                    sentForApprovalAt: data.sentForApprovalAt,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    normalizedStatus,
                    // Change request fields
                    isChangeRequest: data.isChangeRequest || false,
                    changeRequestType: data.changeRequestType,
                    parentAdId: data.parentAdId,
                    // Live ad reference
                    liveAdId: data.pushedToAdServerId || data.liveAdId,
                    // Revision tracking fields
                    revisionCount,
                    revisionNotes: data.revisionNotes,
                    lastActionBy: data.lastActionBy,
                    hasRevisionRequest,
                };

                // Check for auto-approve eligibility (customer_approval status with sent date)
                if (normalizedStatus === 'customer_approval' && ad.sentForApprovalAt) {
                    ad.shouldAutoApprove = shouldAutoApprove(ad.sentForApprovalAt);
                }

                return ad;
            });

            // Sort by status priority (action required first) then by date
            adsData.sort((a, b) => {
                const getPriority = (ad: AdWithMeta) => {
                    if (ad.shouldAutoApprove) return 0; // Auto-approve ready
                    if (ad.hasRevisionRequest) return 1; // Customer requested revisions - high priority
                    if (ad.status === 'in_review') return 2; // Needs admin action
                    if (ad.status === 'design_pending') return 3; // Waiting on design
                    if (ad.status === 'customer_approval') return 4; // Waiting on customer
                    if (ad.status === 'approved') return 5; // Ready to go live
                    if (ad.status === 'info_needed') return 6; // New/waiting on info
                    if (ad.status === 'live') return 7;
                    if (ad.status === 'paused') return 8;
                    if (ad.status === 'completed') return 9;
                    if (ad.status === 'canceled') return 10;
                    if (ad.status === 'archived') return 11;
                    return 12;
                };

                const priorityDiff = getPriority(a) - getPriority(b);
                if (priorityDiff !== 0) return priorityDiff;

                const aTime = a.createdAt?.seconds ?? 0;
                const bTime = b.createdAt?.seconds ?? 0;
                return aTime - bTime;
            });

            // Store raw Firestore data for export (all fields preserved)
            const rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRawAdDocs(rawDocs);

            setAdvertisements(adsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            const permissionError = new FirestorePermissionError({
                path: '/users/{userId}/advertisements',
                operation: 'list',
            } satisfies SecurityRuleContext);

            errorEmitter.emit('permission-error', permissionError);
            setError("You do not have permission to view this data.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleViewDetails = (ad: AdWithMeta) => {
        router.push(`/advertisements/${ad.id}?userId=${ad.userId}`);
    };

    const handleQuickStatusUpdate = async (ad: AdWithMeta, newStatus: AdStatus) => {
        if (!firestore) return;

        try {
            const adRef = doc(firestore, 'users', ad.userId, 'advertisements', ad.id);
            const updateData: Record<string, any> = {
                status: newStatus,
                updatedAt: serverTimestamp(),
            };

            // Add timestamps for status transitions
            if (newStatus === 'customer_approval') {
                updateData.sentForApprovalAt = serverTimestamp();
            }
            if (newStatus === 'approved') {
                updateData.approvedAt = serverTimestamp();
            }
            if (newStatus === 'live') {
                updateData.liveAt = serverTimestamp();
            }

            await updateDoc(adRef, updateData);
            toast({
                title: 'Status Updated',
                description: `Ad moved to ${AD_STATUS_LABELS[newStatus]}`,
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to update status',
                variant: 'destructive',
            });
        }
    };

    const handleExportAds = async () => {
        setIsExporting(true);
        try {
            await exportAdvertisementsZip(rawAdDocs);
            toast({ title: 'Export Complete', description: `${rawAdDocs.length} advertisements exported.` });
        } catch (err) {
            console.error('Export failed:', err);
            toast({ title: 'Export Failed', description: 'Could not generate export file.', variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteAd = async (ad: AdWithMeta) => {
        if (!firestore) return;

        setIsDeleting(true);
        try {
            // Delete the advertisement
            await deleteDoc(doc(firestore, 'users', ad.userId, 'advertisements', ad.id));

            // Also delete associated live_ad if it exists
            if (ad.liveAdId) {
                try {
                    await deleteDoc(doc(firestore, 'live_ads', ad.liveAdId));
                } catch (liveAdErr) {
                    console.warn('Failed to delete associated live_ad:', liveAdErr);
                }
            }

            toast({
                title: 'Advertisement Deleted',
                description: `The advertisement for "${ad.businessName || 'Unknown'}" has been deleted.`,
            });
            setDeleteConfirmAd(null);
        } catch (err) {
            console.error("Error deleting advertisement:", err);
            toast({
                title: 'Error',
                description: 'Failed to delete advertisement. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    // Compute counts
    const counts = useMemo(() => {
        const result: Record<string, number> = {
            all: advertisements.length,
            // Action required = ads that need admin attention
            action_required: advertisements.filter(ad =>
                ad.status === 'in_review' ||  // Admin needs to create/finalize ad
                ad.status === 'approved' ||   // Admin needs to push to ad server
                ad.shouldAutoApprove ||       // Ready for auto-approval
                ad.hasRevisionRequest         // Customer requested revisions
            ).length,
            // Revision requests = ads where customer has requested changes
            revision_requests: advertisements.filter(ad => ad.hasRevisionRequest).length,
            // Change requests = ads that are replacements for existing ads
            change_requests: advertisements.filter(ad => ad.isChangeRequest).length,
        };

        // Count each status
        Object.keys(AD_STATUSES).forEach(key => {
            const status = AD_STATUSES[key as keyof typeof AD_STATUSES];
            result[status] = advertisements.filter(ad => ad.status === status).length;
        });

        return result;
    }, [advertisements]);

    // Filter ads
    const filteredAds = useMemo(() => {
        return advertisements.filter(ad => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    ad.businessName?.toLowerCase().includes(query) ||
                    ad.contactName?.toLowerCase().includes(query) ||
                    ad.email?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'action_required') {
                    // Action required = ads that need admin attention
                    if (!(
                        ad.status === 'in_review' ||  // Admin needs to create/finalize ad
                        ad.status === 'approved' ||   // Admin needs to push to ad server
                        ad.shouldAutoApprove ||       // Ready for auto-approval
                        ad.hasRevisionRequest         // Customer requested revisions
                    )) return false;
                } else if (statusFilter === 'revision_requests') {
                    // Only show ads with revision requests from customers
                    if (!ad.hasRevisionRequest) return false;
                } else if (statusFilter === 'change_requests') {
                    // Only show change request ads
                    if (!ad.isChangeRequest) return false;
                } else if (ad.status !== statusFilter) {
                    return false;
                }
            }

            return true;
        });
    }, [advertisements, searchQuery, statusFilter]);

    const getStatusIcon = (ad: AdWithMeta) => {
        if (ad.shouldAutoApprove) return <CheckCircle className="h-4 w-4 text-green-500" />;
        if (ad.hasRevisionRequest) return <MessageSquare className="h-4 w-4 text-orange-500" />;
        switch (ad.status) {
            case 'in_review':
                return <Eye className="h-4 w-4 text-blue-500" />;
            case 'design_pending':
            case 'info_needed':
                return <AlertCircle className="h-4 w-4 text-amber-500" />;
            case 'customer_approval':
                return <Clock className="h-4 w-4 text-amber-500" />;
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-indigo-500" />;
            case 'live':
                return <Play className="h-4 w-4 text-green-500" />;
            case 'paused':
                return <Pause className="h-4 w-4 text-slate-500" />;
            case 'archived':
                return <Archive className="h-4 w-4 text-gray-400" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Advertisements</h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        View, manage, and approve customer advertisements
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportAds} disabled={isExporting || advertisements.length === 0}>
                        {isExporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                        Export
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-5">
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        statusFilter === 'all' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter('all')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription>Total Ads</CardDescription>
                        <CardTitle className="text-3xl">{counts.all}</CardTitle>
                    </CardHeader>
                </Card>
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        statusFilter === 'action_required' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter('action_required')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            Action Required
                        </CardDescription>
                        <CardTitle className="text-3xl text-amber-600">{counts.action_required}</CardTitle>
                    </CardHeader>
                </Card>
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        statusFilter === 'revision_requests' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter('revision_requests')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-orange-500" />
                            Revisions
                        </CardDescription>
                        <CardTitle className="text-3xl text-orange-600">{counts.revision_requests || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        statusFilter === 'customer_approval' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter('customer_approval')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Pending Approval
                        </CardDescription>
                        <CardTitle className="text-3xl">{counts.customer_approval || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        statusFilter === 'live' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter('live')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Play className="h-4 w-4 text-green-500" />
                            Live
                        </CardDescription>
                        <CardTitle className="text-3xl text-green-600">{counts.live || 0}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by business, contact, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_FILTERS.map((filter) => (
                                    <SelectItem key={filter.value} value={filter.value}>
                                        <span className="flex items-center justify-between w-full">
                                            {filter.label}
                                            {counts[filter.value] > 0 && (
                                                <Badge variant="secondary" className="ml-2">
                                                    {counts[filter.value]}
                                                </Badge>
                                            )}
                                        </span>
                                    </SelectItem>
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
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {statusFilter === 'all'
                            ? 'All Advertisements'
                            : statusFilter === 'action_required'
                                ? 'Ads Requiring Action'
                                : statusFilter === 'revision_requests'
                                    ? 'Ads with Revision Requests'
                                    : statusFilter === 'change_requests'
                                        ? 'Change Request Ads'
                                        : `${AD_STATUS_LABELS[statusFilter as AdStatus] || statusFilter} Ads`}
                    </CardTitle>
                    <CardDescription>
                        {filteredAds.length} advertisement{filteredAds.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {!loading && error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Access Denied</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!loading && !error && (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden md:table-cell">Date</TableHead>
                                        <TableHead className="hidden lg:table-cell">Notes</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAds.length > 0 ? filteredAds.map((ad) => {
                                        const colors = AD_PIPELINE_STAGE_COLORS[ad.status];
                                        return (
                                            <TableRow
                                                key={ad.id}
                                                className={cn(
                                                    "cursor-pointer",
                                                    ad.shouldAutoApprove && "bg-green-50 hover:bg-green-100",
                                                    ad.hasRevisionRequest && "bg-orange-50 hover:bg-orange-100"
                                                )}
                                                onClick={() => handleViewDetails(ad)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    {getStatusIcon(ad)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{ad.contactName || 'N/A'}</div>
                                                    <div className="text-sm text-muted-foreground">{ad.email || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{ad.businessName || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(colors?.bg, colors?.text, 'border', colors?.border)}
                                                        >
                                                            {AD_STATUS_LABELS[ad.status] || ad.status}
                                                        </Badge>
                                                        {ad.hasRevisionRequest && (
                                                            <Badge variant="outline" className="text-xs w-fit bg-orange-100 text-orange-700 border-orange-300">
                                                                <MessageSquare className="h-3 w-3 mr-1" />
                                                                Revision
                                                            </Badge>
                                                        )}
                                                        {ad.isChangeRequest && (
                                                            <Badge variant="outline" className="text-xs w-fit">
                                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                                Change
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                    {ad.createdAt
                                                        ? format(ad.createdAt.toDate ? ad.createdAt.toDate() : new Date(ad.createdAt), 'MMM d, yyyy')
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell max-w-xs">
                                                    {ad.hasRevisionRequest && ad.revisionNotes && (
                                                        <div className="text-xs text-orange-700 font-medium">
                                                            <span className="flex items-center gap-1 mb-1">
                                                                <MessageSquare className="h-3 w-3" />
                                                                Customer feedback:
                                                            </span>
                                                            <span className="text-orange-600 font-normal line-clamp-2">
                                                                {ad.revisionNotes}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {ad.shouldAutoApprove && (
                                                        <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Ready for auto-approve
                                                        </span>
                                                    )}
                                                    {ad.status === 'customer_approval' && ad.sentForApprovalAt && !ad.shouldAutoApprove && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Auto-approves {formatDistanceToNow(calculateAutoApprovalDeadline(ad.sentForApprovalAt), { addSuffix: true })}
                                                        </span>
                                                    )}
                                                    {ad.status === 'in_review' && !ad.hasRevisionRequest && (
                                                        <span className="text-xs text-blue-600 font-medium">
                                                            Needs review
                                                        </span>
                                                    )}
                                                    {ad.status === 'approved' && (
                                                        <span className="text-xs text-indigo-600 font-medium">
                                                            Ready to publish
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleViewDetails(ad)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            {ad.email && (
                                                                <DropdownMenuItem onClick={() => window.location.href = `mailto:${ad.email}`}>
                                                                    <Mail className="mr-2 h-4 w-4" />
                                                                    Email Customer
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ad.adProofDestinationUrl && (
                                                                <DropdownMenuItem onClick={() => window.open(ad.adProofDestinationUrl, '_blank')}>
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    Visit Website
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                                            {ad.status === 'in_review' && (
                                                                <DropdownMenuItem onClick={() => handleQuickStatusUpdate(ad, 'customer_approval')}>
                                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                                    Send for Customer Approval
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ad.status === 'customer_approval' && (
                                                                <DropdownMenuItem onClick={() => handleQuickStatusUpdate(ad, 'approved')}>
                                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                                    Approve Ad
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ad.status === 'approved' && (
                                                                <DropdownMenuItem onClick={() => handleQuickStatusUpdate(ad, 'live')}>
                                                                    <Play className="mr-2 h-4 w-4" />
                                                                    Go Live
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ad.status === 'live' && (
                                                                <DropdownMenuItem onClick={() => handleQuickStatusUpdate(ad, 'paused')}>
                                                                    <Pause className="mr-2 h-4 w-4" />
                                                                    Pause Ad
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ad.status === 'paused' && (
                                                                <DropdownMenuItem onClick={() => handleQuickStatusUpdate(ad, 'live')}>
                                                                    <Play className="mr-2 h-4 w-4" />
                                                                    Resume Ad
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ad.status !== 'canceled' && ad.status !== 'completed' && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleQuickStatusUpdate(ad, 'canceled')}
                                                                    className="text-destructive"
                                                                >
                                                                    <AlertCircle className="mr-2 h-4 w-4" />
                                                                    Mark as Canceled
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteConfirmAd(ad)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete Advertisement
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                                {searchQuery || statusFilter !== 'all'
                                                    ? 'No advertisements match your filters.'
                                                    : 'No advertisements found.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmAd} onOpenChange={(open) => !open && setDeleteConfirmAd(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Advertisement</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete the advertisement for &quot;{deleteConfirmAd?.businessName || 'Unknown'}&quot;?
                            {deleteConfirmAd?.liveAdId && " This will also remove the associated live ad from the ad server."}
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteConfirmAd && handleDeleteAd(deleteConfirmAd)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete Advertisement
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
