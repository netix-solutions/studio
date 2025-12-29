'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFirebase } from '@/firebase';
import { getAuth } from 'firebase/auth';
import {
    Loader2,
    AlertCircle,
    Search,
    LayoutGrid,
    Clock,
    XCircle,
    Star,
    Check,
    Eye,
    EyeOff,
    RefreshCw,
    FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    type LiveAd,
    type DirectoryListing,
    type DirectoryStatus,
    type BusinessCategory,
    DIRECTORY_STATUS_LABELS,
    DIRECTORY_STATUS_COLORS,
    BUSINESS_CATEGORY_LABELS,
    BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';
import { DirectoryCardPreview } from '@/components/directory/DirectoryCardPreview';

interface DirectoryListingItem {
    liveAdId: string;
    liveAd: Partial<LiveAd>;
    directoryListing: DirectoryListing | null;
}

interface DirectoryStats {
    total: number;
    pending: number;
    approved: number;
    hidden: number;
    rejected: number;
    featured: number;
}

export default function DirectoryPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialStatus = searchParams.get('status') || 'all';

    const [directoryListings, setDirectoryListings] = useState<DirectoryListingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState<DirectoryStats>({
        total: 0,
        pending: 0,
        approved: 0,
        hidden: 0,
        rejected: 0,
        featured: 0,
    });
    const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
    const [moderatingAd, setModeratingAd] = useState<string | null>(null);

    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    // Update URL when filter changes
    const updateStatusFilter = (newStatus: string) => {
        setStatusFilter(newStatus);
        const params = new URLSearchParams(searchParams.toString());
        if (newStatus === 'all') {
            params.delete('status');
        } else {
            params.set('status', newStatus);
        }
        router.replace(`/directory${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const fetchDirectoryListings = async () => {
        try {
            setLoading(true);
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            const response = await fetch(`/api/admin/directory?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to fetch directory listings');

            const result = await response.json();
            setDirectoryListings(result.data.listings);
            setStats(result.data.stats);
        } catch (err) {
            console.error('Error fetching directory listings:', err);
            toast({
                variant: 'destructive',
                description: 'Failed to fetch directory listings.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (firestore && user) {
            fetchDirectoryListings();
        }
    }, [firestore, user, statusFilter]);

    const handleDirectoryAction = async (
        liveAdId: string,
        action: 'approve' | 'reject' | 'hide' | 'feature' | 'unfeature',
        rejectionReason?: string
    ) => {
        try {
            setModeratingAd(liveAdId);
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            const response = await fetch('/api/admin/directory', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ liveAdId, action, rejectionReason }),
            });

            if (!response.ok) throw new Error('Failed to update directory listing');

            const result = await response.json();
            toast({
                description: result.message || 'Directory listing updated successfully.',
            });

            await fetchDirectoryListings();
        } catch (err) {
            console.error('Error updating directory listing:', err);
            toast({
                variant: 'destructive',
                description: 'Failed to update directory listing.',
            });
        } finally {
            setModeratingAd(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDirectoryListings();
    };

    const filteredListings = directoryListings.filter((item) => {
        if (!searchQuery.trim()) return true;
        const listing = item.directoryListing;
        const businessName = listing?.businessName || item.liveAd.customerName || '';
        return businessName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FolderOpen className="h-6 w-6" />
                        Directory Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Review and manage advertiser directory listings. Approve, reject, or feature listings.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchDirectoryListings} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                <Card
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        statusFilter === 'all' && 'ring-2 ring-primary'
                    )}
                    onClick={() => updateStatusFilter('all')}
                >
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold">{stats.total}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                    </CardContent>
                </Card>
                <Card
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-md border-amber-200',
                        statusFilter === 'pending' && 'ring-2 ring-amber-500'
                    )}
                    onClick={() => updateStatusFilter('pending')}
                >
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                    </CardContent>
                </Card>
                <Card
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-md border-green-200',
                        statusFilter === 'approved' && 'ring-2 ring-green-500'
                    )}
                    onClick={() => updateStatusFilter('approved')}
                >
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
                        <div className="text-sm text-muted-foreground">Approved</div>
                    </CardContent>
                </Card>
                <Card
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-md border-slate-200',
                        statusFilter === 'hidden' && 'ring-2 ring-slate-500'
                    )}
                    onClick={() => updateStatusFilter('hidden')}
                >
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-slate-600">{stats.hidden}</div>
                        <div className="text-sm text-muted-foreground">Hidden</div>
                    </CardContent>
                </Card>
                <Card
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-md border-red-200',
                        statusFilter === 'rejected' && 'ring-2 ring-red-500'
                    )}
                    onClick={() => updateStatusFilter('rejected')}
                >
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
                        <div className="text-sm text-muted-foreground">Rejected</div>
                    </CardContent>
                </Card>
                <Card className="border-amber-300 bg-amber-50">
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-amber-600">{stats.featured}</div>
                        <div className="text-sm text-muted-foreground">Featured</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by business name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="secondary">
                        Search
                    </Button>
                </div>
            </form>

            {/* Listings */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredListings.length === 0 ? (
                <div className="text-center py-16">
                    <LayoutGrid className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Directory Listings</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        {statusFilter !== 'all'
                            ? `No listings with status "${statusFilter}".`
                            : searchQuery
                            ? `No listings match "${searchQuery}".`
                            : 'No advertisers have set up their directory listings yet.'}
                    </p>
                    {statusFilter !== 'all' && (
                        <Button
                            variant="link"
                            onClick={() => updateStatusFilter('all')}
                            className="mt-4"
                        >
                            View all listings
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredListings.length} listing
                        {filteredListings.length !== 1 ? 's' : ''}
                        {statusFilter !== 'all' && ` with status "${statusFilter}"`}
                    </p>
                    <div className="grid gap-4">
                        {filteredListings.map((item) => {
                            const listing = item.directoryListing;
                            const status = listing?.directoryStatus || 'pending';
                            const statusColors =
                                DIRECTORY_STATUS_COLORS[status as DirectoryStatus] || {
                                    bg: 'bg-gray-100',
                                    text: 'text-gray-600',
                                };

                            return (
                                <Card key={item.liveAdId} className="overflow-hidden">
                                    <div className="flex flex-col lg:flex-row">
                                        {/* Preview Card */}
                                        <div className="w-full lg:w-72 flex-shrink-0 p-4 bg-muted/30">
                                            <DirectoryCardPreview
                                                listing={
                                                    listing || {
                                                        businessName:
                                                            item.liveAd.customerName || 'Business',
                                                        showContactInfo: true,
                                                        showSocialLinks: true,
                                                    }
                                                }
                                                adImageUrl={item.liveAd.imageUrl}
                                                className="shadow-sm"
                                            />
                                        </div>

                                        {/* Details & Actions */}
                                        <div className="flex-1 p-4 lg:p-6">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className="font-semibold text-lg">
                                                            {listing?.businessName ||
                                                                item.liveAd.customerName ||
                                                                'Unknown Business'}
                                                        </h4>
                                                        {listing?.isFeatured && (
                                                            <Badge
                                                                variant="outline"
                                                                className="bg-amber-50 text-amber-600 border-amber-200"
                                                            >
                                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                                Featured
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {listing?.tagline && (
                                                        <p className="text-sm text-muted-foreground italic">
                                                            {listing.tagline}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge className={`${statusColors.bg} ${statusColors.text}`}>
                                                    {status === 'approved' && (
                                                        <Check className="h-3 w-3 mr-1" />
                                                    )}
                                                    {status === 'pending' && (
                                                        <Clock className="h-3 w-3 mr-1" />
                                                    )}
                                                    {status === 'rejected' && (
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                    )}
                                                    {status === 'hidden' && (
                                                        <EyeOff className="h-3 w-3 mr-1" />
                                                    )}
                                                    {DIRECTORY_STATUS_LABELS[status as DirectoryStatus] ||
                                                        status}
                                                </Badge>
                                            </div>

                                            {listing?.description && (
                                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                    {listing.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap gap-2 mb-4 text-xs">
                                                {listing?.category && (
                                                    <Badge variant="secondary">
                                                        {
                                                            BUSINESS_CATEGORY_ICONS[
                                                                listing.category as BusinessCategory
                                                            ]
                                                        }{' '}
                                                        {
                                                            BUSINESS_CATEGORY_LABELS[
                                                                listing.category as BusinessCategory
                                                            ]
                                                        }
                                                    </Badge>
                                                )}
                                                {listing?.phone && (
                                                    <Badge variant="outline">📞 {listing.phone}</Badge>
                                                )}
                                                {listing?.email && (
                                                    <Badge variant="outline">✉️ {listing.email}</Badge>
                                                )}
                                                {listing?.websiteUrl && (
                                                    <Badge variant="outline">🌐 Website</Badge>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-2">
                                                {status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDirectoryAction(
                                                                    item.liveAdId,
                                                                    'approve'
                                                                )
                                                            }
                                                            disabled={moderatingAd === item.liveAdId}
                                                        >
                                                            {moderatingAd === item.liveAdId ? (
                                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                            ) : (
                                                                <Check className="h-4 w-4 mr-1" />
                                                            )}
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => {
                                                                const reason =
                                                                    prompt('Enter rejection reason:');
                                                                if (reason)
                                                                    handleDirectoryAction(
                                                                        item.liveAdId,
                                                                        'reject',
                                                                        reason
                                                                    );
                                                            }}
                                                            disabled={moderatingAd === item.liveAdId}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {status === 'approved' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleDirectoryAction(
                                                                    item.liveAdId,
                                                                    'hide'
                                                                )
                                                            }
                                                            disabled={moderatingAd === item.liveAdId}
                                                        >
                                                            <EyeOff className="h-4 w-4 mr-1" />
                                                            Hide
                                                        </Button>
                                                        {listing?.isFeatured ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    handleDirectoryAction(
                                                                        item.liveAdId,
                                                                        'unfeature'
                                                                    )
                                                                }
                                                                disabled={moderatingAd === item.liveAdId}
                                                            >
                                                                <Star className="h-4 w-4 mr-1" />
                                                                Unfeature
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                                                onClick={() =>
                                                                    handleDirectoryAction(
                                                                        item.liveAdId,
                                                                        'feature'
                                                                    )
                                                                }
                                                                disabled={moderatingAd === item.liveAdId}
                                                            >
                                                                <Star className="h-4 w-4 mr-1" />
                                                                Feature
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                                {(status === 'hidden' || status === 'rejected') && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            handleDirectoryAction(
                                                                item.liveAdId,
                                                                'approve'
                                                            )
                                                        }
                                                        disabled={moderatingAd === item.liveAdId}
                                                    >
                                                        {moderatingAd === item.liveAdId ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                        ) : (
                                                            <Check className="h-4 w-4 mr-1" />
                                                        )}
                                                        Approve
                                                    </Button>
                                                )}
                                            </div>

                                            {listing?.directoryRejectionReason &&
                                                status === 'rejected' && (
                                                    <Alert variant="destructive" className="mt-4">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Rejection reason:{' '}
                                                            {listing.directoryRejectionReason}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
