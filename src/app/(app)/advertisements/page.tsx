'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, collectionGroup, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
    Loader2,
    AlertCircle,
    MoreHorizontal,
    Clock,
    CheckCircle,
    Eye,
    Search,
    ArrowRight,
    Play,
    Pause,
    Mail,
    ExternalLink,
    Filter,
    ChevronDown,
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
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    AD_PIPELINE_STAGE_COLORS,
    shouldAutoApprove,
    calculateAutoApprovalDeadline,
    type AdStatus,
    type Advertisement
} from '@/lib/types';

type AdWithMeta = Advertisement & {
    shouldAutoApprove?: boolean;
};

// Status filter options
const STATUS_FILTERS = [
    { value: 'all', label: 'All Ads', count: 0 },
    { value: 'action_required', label: 'Action Required', count: 0 },
    { value: 'pending_info', label: 'Pending Info', count: 0 },
    { value: 'pending_internal_review', label: 'Under Review', count: 0 },
    { value: 'pending_ad_creation', label: 'Creating Ad', count: 0 },
    { value: 'pending_customer_approval', label: 'Awaiting Approval', count: 0 },
    { value: 'revision_requested', label: 'Revision Needed', count: 0 },
    { value: 'live', label: 'Live', count: 0 },
    { value: 'paused', label: 'Paused', count: 0 },
    { value: 'completed', label: 'Completed', count: 0 },
];

export default function AdvertisementsPage() {
    const [advertisements, setAdvertisements] = useState<AdWithMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
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
                const ad: AdWithMeta = {
                    id: doc.id,
                    userId: data.userId,
                    subscriptionId: data.subscriptionId || '',
                    status: data.status || 'pending_info',
                    adProofUrl: data.adProofUrl,
                    adProofDestinationUrl: data.adProofDestinationUrl,
                    businessName: data.businessName,
                    contactName: data.contactName,
                    email: data.email,
                    phone: data.phone,
                    sentForApprovalAt: data.sentForApprovalAt,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                };

                if (ad.status === 'pending_customer_approval' && ad.sentForApprovalAt) {
                    ad.shouldAutoApprove = shouldAutoApprove(ad.sentForApprovalAt);
                }

                return ad;
            });

            // Sort by status priority (action required first) then by date
            adsData.sort((a, b) => {
                const getPriority = (ad: AdWithMeta) => {
                    if (ad.shouldAutoApprove) return 0;
                    if (ad.status === 'pending_internal_review') return 1;
                    if (ad.status === 'pending_ad_creation') return 2;
                    if (ad.status === 'revision_requested') return 3;
                    if (ad.status === 'pending_customer_approval') return 4;
                    if (ad.status === 'pending_info') return 5;
                    if (ad.status === 'live') return 6;
                    return 10;
                };

                const priorityDiff = getPriority(a) - getPriority(b);
                if (priorityDiff !== 0) return priorityDiff;

                const aTime = a.createdAt?.seconds ?? 0;
                const bTime = b.createdAt?.seconds ?? 0;
                return aTime - bTime;
            });

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

            if (newStatus === 'live') {
                updateData.approvedAt = serverTimestamp();
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

    // Compute counts
    const counts = useMemo(() => {
        const result: Record<string, number> = {
            all: advertisements.length,
            action_required: advertisements.filter(ad =>
                ad.status === 'pending_internal_review' ||
                ad.status === 'pending_ad_creation' ||
                ad.status === 'revision_requested' ||
                ad.shouldAutoApprove
            ).length,
        };

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
                    if (!(
                        ad.status === 'pending_internal_review' ||
                        ad.status === 'pending_ad_creation' ||
                        ad.status === 'revision_requested' ||
                        ad.shouldAutoApprove
                    )) return false;
                } else if (ad.status !== statusFilter) {
                    return false;
                }
            }

            return true;
        });
    }, [advertisements, searchQuery, statusFilter]);

    const getStatusIcon = (ad: AdWithMeta) => {
        if (ad.shouldAutoApprove) return <CheckCircle className="h-4 w-4 text-green-500" />;
        switch (ad.status) {
            case 'pending_internal_review':
                return <Eye className="h-4 w-4 text-blue-500" />;
            case 'pending_ad_creation':
            case 'revision_requested':
                return <AlertCircle className="h-4 w-4 text-amber-500" />;
            case 'pending_customer_approval':
                return <Clock className="h-4 w-4 text-amber-500" />;
            case 'live':
                return <Play className="h-4 w-4 text-green-500" />;
            case 'paused':
                return <Pause className="h-4 w-4 text-slate-500" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Advertisements</h1>
                    <p className="text-muted-foreground">
                        Manage all customer advertisements across the workflow
                    </p>
                </div>
                <Button onClick={() => router.push('/pipeline')}>
                    View Pipeline
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
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
                        statusFilter === 'pending_customer_approval' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter('pending_customer_approval')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Pending Approval
                        </CardDescription>
                        <CardTitle className="text-3xl">{counts.pending_customer_approval || 0}</CardTitle>
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
                            <SelectTrigger className="w-[200px]">
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
                                                    ad.shouldAutoApprove && "bg-green-50 hover:bg-green-100"
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
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(colors?.bg, colors?.text, 'border', colors?.border)}
                                                    >
                                                        {AD_STATUS_LABELS[ad.status] || ad.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                    {ad.createdAt
                                                        ? format(ad.createdAt.toDate ? ad.createdAt.toDate() : new Date(ad.createdAt), 'MMM d, yyyy')
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    {ad.shouldAutoApprove && (
                                                        <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Ready for auto-approve
                                                        </span>
                                                    )}
                                                    {ad.status === 'pending_customer_approval' && ad.sentForApprovalAt && !ad.shouldAutoApprove && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Auto-approves {formatDistanceToNow(calculateAutoApprovalDeadline(ad.sentForApprovalAt), { addSuffix: true })}
                                                        </span>
                                                    )}
                                                    {ad.status === 'pending_internal_review' && (
                                                        <span className="text-xs text-blue-600 font-medium">
                                                            Needs review
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
                                                            {ad.status === 'pending_internal_review' && (
                                                                <DropdownMenuItem onClick={() => handleQuickStatusUpdate(ad, 'pending_ad_creation')}>
                                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                                    Approve for Ad Creation
                                                                </DropdownMenuItem>
                                                            )}
                                                            {(ad.status === 'pending_customer_approval' || ad.status === 'approved') && (
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
        </div>
    );
}
