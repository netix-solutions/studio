'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    Pencil,
    Trash2,
    Plus,
    Save,
    User,
    Settings2,
    Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    type LiveAd,
    type LiveAdDirectoryListing,
    type DirectoryStatus,
    type BusinessCategory,
    DIRECTORY_STATUS_LABELS,
    DIRECTORY_STATUS_COLORS,
    BUSINESS_CATEGORY_LABELS,
    BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';
import { DirectoryCardPreview } from '@/components/directory/DirectoryCardPreview';
import { DirectoryListingForm } from '@/components/directory/DirectoryListingForm';

interface DirectoryListingItem {
    liveAdId: string;
    liveAd: Partial<LiveAd>;
    directoryListing: LiveAdDirectoryListing | null;
    source?: 'live_ads' | 'directory_listings';
    freeListingId?: string;
}

interface DirectoryStats {
    total: number;
    pending: number;
    approved: number;
    hidden: number;
    rejected: number;
    featured: number;
    freeListings?: number;
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

    // Edit sheet state
    const [editSheetOpen, setEditSheetOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DirectoryListingItem | null>(null);
    const [editedListing, setEditedListing] = useState<Partial<DirectoryListing>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [moderationNotes, setModerationNotes] = useState('');
    const [newStatus, setNewStatus] = useState<DirectoryStatus | ''>('');

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<DirectoryListingItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    // Update URL when filter changes
    const updateStatusFilter = (newStatusFilter: string) => {
        setStatusFilter(newStatusFilter);
        const params = new URLSearchParams(searchParams.toString());
        if (newStatusFilter === 'all') {
            params.delete('status');
        } else {
            params.set('status', newStatusFilter);
        }
        router.replace(`/directory${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const fetchDirectoryListings = async () => {
        try {
            setLoading(true);
            const auth = getAuth();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'directory/page.tsx:140',message:'fetchDirectoryListings entry',data:{hasCurrentUser:!!auth.currentUser,userId:auth.currentUser?.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            const token = await auth.currentUser?.getIdToken();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'directory/page.tsx:142',message:'after getIdToken',data:{hasToken:!!token,tokenLength:token?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion

            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            const url = `/api/admin/directory?${params.toString()}`;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'directory/page.tsx:157',message:'before fetch',data:{url,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            let response;
            try {
                response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'directory/page.tsx:164',message:'after fetch',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
                // #endregion
            } catch (fetchErr) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'directory/page.tsx:167',message:'fetch error',data:{errorMessage:fetchErr instanceof Error?fetchErr.message:String(fetchErr),errorName:fetchErr instanceof Error?fetchErr.name:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                throw fetchErr;
            }

            if (!response.ok) {
                const errorText = await response.text();
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'directory/page.tsx:173',message:'response not ok',data:{status:response.status,statusText:response.statusText,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
                // #endregion
                throw new Error('Failed to fetch directory listings');
            }

            const result = await response.json();
            setDirectoryListings(result.data.listings);
            setStats(result.data.stats);
        } catch (err) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28408f54-ed6d-4857-8d2e-fe187756ca8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'directory/page.tsx:182',message:'catch block',data:{errorMessage:err instanceof Error?err.message:String(err),errorName:err instanceof Error?err.name:'unknown',errorStack:err instanceof Error?err.stack?.substring(0,300):'no stack'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D,E'})}).catch(()=>{});
            // #endregion
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

    // Open edit sheet for a listing
    const openEditSheet = (item: DirectoryListingItem) => {
        setEditingItem(item);
        setEditedListing(item.directoryListing || {
            businessName: item.liveAd.customerName || '',
            showContactInfo: true,
            showSocialLinks: true,
            showAddress: false,
        });
        setModerationNotes(item.directoryListing?.moderationNotes || '');
        setNewStatus(item.directoryListing?.directoryStatus || 'pending');
        setEditSheetOpen(true);
    };

    // Save edited listing
    const handleSaveListing = async () => {
        if (!editingItem) return;

        try {
            setIsSaving(true);
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            // Prepare the update payload
            const payload: Record<string, any> = {
                liveAdId: editingItem.liveAdId,
                action: 'update',
                directoryListing: {
                    ...editedListing,
                    moderationNotes,
                },
            };

            // If status changed, set it directly
            if (newStatus && newStatus !== editingItem.directoryListing?.directoryStatus) {
                payload.directoryListing.directoryStatus = newStatus;
            }

            const response = await fetch('/api/admin/directory', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to update listing');

            toast({
                description: 'Directory listing updated successfully.',
            });

            setEditSheetOpen(false);
            setEditingItem(null);
            await fetchDirectoryListings();
        } catch (err) {
            console.error('Error saving listing:', err);
            toast({
                variant: 'destructive',
                description: 'Failed to save listing changes.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Delete listing (reset to empty)
    const handleDeleteListing = async () => {
        if (!deletingItem) return;

        try {
            setIsDeleting(true);
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            // Reset the directory listing by setting it to minimal values
            const response = await fetch('/api/admin/directory', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    liveAdId: deletingItem.liveAdId,
                    action: 'update',
                    directoryListing: {
                        businessName: deletingItem.liveAd.customerName || 'Business',
                        directoryStatus: 'pending',
                        showContactInfo: true,
                        showSocialLinks: true,
                        showAddress: false,
                        // Clear all other fields
                        tagline: '',
                        description: '',
                        phone: '',
                        email: '',
                        websiteUrl: '',
                        address: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        facebookUrl: '',
                        instagramUrl: '',
                        linkedinUrl: '',
                        twitterUrl: '',
                        youtubeUrl: '',
                        tiktokUrl: '',
                        yelpUrl: '',
                        googleBusinessUrl: '',
                        logoUrl: '',
                        bannerImageUrl: '',
                        category: undefined,
                        isFeatured: false,
                        moderationNotes: 'Listing reset by admin',
                    },
                    showInDirectory: false,
                }),
            });

            if (!response.ok) throw new Error('Failed to reset listing');

            toast({
                description: 'Directory listing has been reset.',
            });

            setDeleteDialogOpen(false);
            setDeletingItem(null);
            await fetchDirectoryListings();
        } catch (err) {
            console.error('Error resetting listing:', err);
            toast({
                variant: 'destructive',
                description: 'Failed to reset listing.',
            });
        } finally {
            setIsDeleting(false);
        }
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
                        Complete control over all advertiser directory listings. Edit, approve, reject, or feature any listing.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchDirectoryListings} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
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
                {stats.freeListings !== undefined && stats.freeListings > 0 && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-blue-600">{stats.freeListings}</div>
                            <div className="text-sm text-muted-foreground">Free Signups</div>
                        </CardContent>
                    </Card>
                )}
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
                                                        {item.source === 'directory_listings' && (
                                                            <Badge
                                                                variant="outline"
                                                                className="bg-blue-50 text-blue-600 border-blue-200"
                                                            >
                                                                <Gift className="h-3 w-3 mr-1" />
                                                                Free Listing
                                                            </Badge>
                                                        )}
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
                                                    {item.liveAd.customerName && listing?.businessName !== item.liveAd.customerName && (
                                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            Customer: {item.liveAd.customerName}
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
                                                {/* Edit Button - Always visible */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditSheet(item)}
                                                >
                                                    <Pencil className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>

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

                                                {/* Reset/Delete Button */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => {
                                                        setDeletingItem(item);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Reset
                                                </Button>
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

                                            {listing?.moderationNotes && (
                                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes:</p>
                                                    <p className="text-sm">{listing.moderationNotes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Edit Sheet */}
            <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5" />
                            Edit Directory Listing
                        </SheetTitle>
                        <SheetDescription>
                            {editingItem?.liveAd.customerName && (
                                <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Customer: {editingItem.liveAd.customerName}
                                </span>
                            )}
                        </SheetDescription>
                    </SheetHeader>

                    {editingItem && (
                        <Tabs defaultValue="listing" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="listing">Listing Details</TabsTrigger>
                                <TabsTrigger value="admin" className="flex items-center gap-1">
                                    <Settings2 className="h-4 w-4" />
                                    Admin Controls
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="listing" className="mt-0">
                                <DirectoryListingForm
                                    listing={editedListing}
                                    onChange={setEditedListing}
                                    showAdvancedOptions={true}
                                />
                            </TabsContent>

                            <TabsContent value="admin" className="mt-0 space-y-6">
                                {/* Status Control */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg">Listing Status</CardTitle>
                                        <CardDescription>
                                            Change the visibility and approval status
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Directory Status</Label>
                                            <Select
                                                value={newStatus}
                                                onValueChange={(value) => setNewStatus(value as DirectoryStatus)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">
                                                        <span className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-amber-500" />
                                                            Pending Review
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="approved">
                                                        <span className="flex items-center gap-2">
                                                            <Check className="h-4 w-4 text-green-500" />
                                                            Approved
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="hidden">
                                                        <span className="flex items-center gap-2">
                                                            <EyeOff className="h-4 w-4 text-slate-500" />
                                                            Hidden
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="rejected">
                                                        <span className="flex items-center gap-2">
                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                            Rejected
                                                        </span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {newStatus === 'rejected' && (
                                            <div className="space-y-2">
                                                <Label>Rejection Reason</Label>
                                                <Input
                                                    value={editedListing.directoryRejectionReason || ''}
                                                    onChange={(e) => setEditedListing({
                                                        ...editedListing,
                                                        directoryRejectionReason: e.target.value,
                                                    })}
                                                    placeholder="Explain why the listing was rejected"
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Featured Control */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Star className="h-5 w-5 text-amber-500" />
                                            Featured Status
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Feature this listing</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Featured listings appear at the top of the directory
                                                </p>
                                            </div>
                                            <Button
                                                variant={editedListing.isFeatured ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setEditedListing({
                                                    ...editedListing,
                                                    isFeatured: !editedListing.isFeatured,
                                                })}
                                                className={editedListing.isFeatured ? 'bg-amber-500 hover:bg-amber-600' : ''}
                                            >
                                                <Star className={cn('h-4 w-4 mr-1', editedListing.isFeatured && 'fill-current')} />
                                                {editedListing.isFeatured ? 'Featured' : 'Not Featured'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Moderation Notes */}
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg">Admin Notes</CardTitle>
                                        <CardDescription>
                                            Internal notes visible only to administrators
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea
                                            value={moderationNotes}
                                            onChange={(e) => setModerationNotes(e.target.value)}
                                            placeholder="Add notes about this listing (not visible to customer)"
                                            rows={4}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Listing Info */}
                                <Card className="bg-muted/50">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg">Listing Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Live Ad ID:</span>
                                            <span className="font-mono">{editingItem.liveAdId}</span>
                                        </div>
                                        {editingItem.liveAd.customerId && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Customer ID:</span>
                                                <span className="font-mono">{editingItem.liveAd.customerId}</span>
                                            </div>
                                        )}
                                        {editingItem.directoryListing?.directoryApprovedBy && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Approved By:</span>
                                                <span>{editingItem.directoryListing.directoryApprovedBy}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}

                    <SheetFooter className="mt-6 pt-6 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setEditSheetOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveListing} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Directory Listing?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will clear all listing data for{' '}
                            <strong>
                                {deletingItem?.directoryListing?.businessName ||
                                    deletingItem?.liveAd.customerName}
                            </strong>{' '}
                            and hide it from the directory. The listing will be set back to pending status.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteListing}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Listing'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
