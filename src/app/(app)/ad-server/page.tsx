'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirebase } from '@/firebase';
import {
    collection,
    collectionGroup,
    onSnapshot,
    query,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    where,
    serverTimestamp,
    orderBy,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    Loader2,
    AlertCircle,
    MoreHorizontal,
    Eye,
    Search,
    Plus,
    Play,
    Pause,
    Trash2,
    Edit,
    Copy,
    ExternalLink,
    BarChart3,
    MousePointerClick,
    Image as ImageIcon,
    Code,
    Archive,
    Upload,
    CheckCircle,
    Users,
    Import,
    LayoutGrid,
    Clock,
    XCircle,
    Star,
    Check,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    type LiveAd,
    type LiveAdStatus,
    type AdPlacement,
    type Advertisement,
    type CommunityWebsiteId,
    type DirectoryListing,
    type DirectoryStatus,
    type BusinessCategory,
    AD_PLACEMENTS,
    AD_PLACEMENT_LABELS,
    AD_PLACEMENT_DIMENSIONS,
    LIVE_AD_STATUSES,
    LIVE_AD_STATUS_LABELS,
    LIVE_AD_STATUS_COLORS,
    AD_STATUS_LABELS,
    COMMUNITY_WEBSITE_LIST,
    COMMUNITY_WEBSITE_CONFIG,
    calculateCTR,
    DIRECTORY_STATUSES,
    DIRECTORY_STATUS_LABELS,
    DIRECTORY_STATUS_COLORS,
    BUSINESS_CATEGORY_LABELS,
    BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';
import { getAuth } from 'firebase/auth';
import { DirectoryCardPreview } from '@/components/directory/DirectoryCardPreview';

type FormData = {
    name: string;
    description: string;
    targetUrl: string;
    altText: string;
    placement: AdPlacement;
    weight: number;
    status: LiveAdStatus;
    startDate: string;
    endDate: string;
    targetWebsites: CommunityWebsiteId[];
};

const defaultFormData: FormData = {
    name: '',
    description: '',
    targetUrl: '',
    altText: '',
    placement: 'inline',
    weight: 50,
    status: 'active',
    startDate: '',
    endDate: '',
    targetWebsites: [],
};

export default function AdServerPage() {
    const [ads, setAds] = useState<LiveAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<'name' | 'impressions' | 'clicks' | 'ctr' | 'status' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Dialog states
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEmbedDialog, setShowEmbedDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [editingAd, setEditingAd] = useState<LiveAd | null>(null);
    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Import from customer ads states
    const [customerAds, setCustomerAds] = useState<(Advertisement & { userName?: string })[]>([]);
    const [loadingCustomerAds, setLoadingCustomerAds] = useState(false);
    const [importingAdId, setImportingAdId] = useState<string | null>(null);

    // Embed code dialog state
    const [selectedEmbedWebsite, setSelectedEmbedWebsite] = useState<CommunityWebsiteId | null>(null);

    // Directory management states
    const [showDirectoryDialog, setShowDirectoryDialog] = useState(false);
    const [directoryListings, setDirectoryListings] = useState<Array<{
        liveAdId: string;
        liveAd: Partial<LiveAd>;
        directoryListing: DirectoryListing | null;
    }>>([]);
    const [loadingDirectory, setLoadingDirectory] = useState(false);
    const [directoryStats, setDirectoryStats] = useState({
        total: 0, pending: 0, approved: 0, hidden: 0, rejected: 0, featured: 0
    });
    const [directoryStatusFilter, setDirectoryStatusFilter] = useState<string>('all');
    const [moderatingAd, setModeratingAd] = useState<string | null>(null);

    const { firestore, storage, user } = useFirebase();
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const adsQuery = query(
            collection(firestore, 'live_ads'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(adsQuery, (snapshot) => {
            const adsData: LiveAd[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as LiveAd));

            setAds(adsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error('Error fetching live ads:', err);
            setError("You do not have permission to view this data.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    // Stats
    const stats = useMemo(() => {
        const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
        const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
        const activeAds = ads.filter(ad => ad.status === 'active').length;
        const pausedAds = ads.filter(ad => ad.status === 'paused').length;

        return { totalImpressions, totalClicks, activeAds, pausedAds };
    }, [ads]);

    // Filtered and sorted ads
    const filteredAds = useMemo(() => {
        let result = ads.filter(ad => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    ad.name?.toLowerCase().includes(query) ||
                    ad.targetUrl?.toLowerCase().includes(query) ||
                    ad.customerName?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            if (statusFilter !== 'all' && ad.status !== statusFilter) {
                return false;
            }

            return true;
        });

        // Sort if a sort field is selected
        if (sortField) {
            result = [...result].sort((a, b) => {
                let aVal: number | string;
                let bVal: number | string;

                switch (sortField) {
                    case 'name':
                        aVal = (a.name || '').toLowerCase();
                        bVal = (b.name || '').toLowerCase();
                        break;
                    case 'impressions':
                        aVal = a.impressions || 0;
                        bVal = b.impressions || 0;
                        break;
                    case 'clicks':
                        aVal = a.clicks || 0;
                        bVal = b.clicks || 0;
                        break;
                    case 'ctr':
                        aVal = (a.impressions || 0) > 0 ? ((a.clicks || 0) / (a.impressions || 1)) * 100 : 0;
                        bVal = (b.impressions || 0) > 0 ? ((b.clicks || 0) / (b.impressions || 1)) * 100 : 0;
                        break;
                    case 'status':
                        aVal = a.status || '';
                        bVal = b.status || '';
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [ads, searchQuery, statusFilter, sortField, sortDirection]);

    // Handle column sort
    const handleSort = (field: 'name' | 'impressions' | 'clicks' | 'ctr' | 'status') => {
        if (sortField === field) {
            // Toggle direction or clear sort
            if (sortDirection === 'desc') {
                setSortDirection('asc');
            } else {
                setSortField(null);
            }
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Get sort icon for a column
    const getSortIcon = (field: 'name' | 'impressions' | 'clicks' | 'ctr' | 'status') => {
        if (sortField !== field) {
            return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
        }
        return sortDirection === 'desc'
            ? <ArrowDown className="ml-1 h-3 w-3" />
            : <ArrowUp className="ml-1 h-3 w-3" />;
    };

    const handleOpenCreate = () => {
        setEditingAd(null);
        setFormData(defaultFormData);
        setImageFile(null);
        setImagePreview(null);
        setShowCreateDialog(true);
    };

    const handleOpenEdit = (ad: LiveAd) => {
        setEditingAd(ad);
        setFormData({
            name: ad.name || '',
            description: ad.description || '',
            targetUrl: ad.targetUrl || '',
            altText: ad.altText || '',
            placement: ad.placement || 'inline',
            weight: ad.weight || 50,
            status: ad.status || 'active',
            startDate: ad.startDate ? format(ad.startDate.toDate ? ad.startDate.toDate() : new Date(ad.startDate), 'yyyy-MM-dd') : '',
            endDate: ad.endDate ? format(ad.endDate.toDate ? ad.endDate.toDate() : new Date(ad.endDate), 'yyyy-MM-dd') : '',
            targetWebsites: ad.targetWebsites || [],
        });
        setImagePreview(ad.imageUrl || null);
        setImageFile(null);
        setShowCreateDialog(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!firestore || !storage) {
            toast({
                title: 'Error',
                description: 'Firebase is not initialized. Please try again.',
                variant: 'destructive',
            });
            return;
        }

        if (!formData.name || !formData.targetUrl) {
            toast({
                title: 'Validation Error',
                description: 'Name and Target URL are required.',
                variant: 'destructive',
            });
            return;
        }

        if (!editingAd && !imageFile) {
            toast({
                title: 'Validation Error',
                description: 'Please upload an ad image.',
                variant: 'destructive',
            });
            return;
        }

        setSubmitting(true);

        try {
            let imageUrl = editingAd?.imageUrl || '';

            // Upload image if provided
            if (imageFile) {
                const adId = editingAd?.id || `new-${Date.now()}`;
                const filePath = `live_ads/${adId}/${imageFile.name}`;
                const fileRef = storageRef(storage, filePath);
                await uploadBytes(fileRef, imageFile);
                imageUrl = await getDownloadURL(fileRef);
            }

            const dimensions = AD_PLACEMENT_DIMENSIONS[formData.placement];

            const adData = {
                name: formData.name,
                description: formData.description,
                imageUrl,
                targetUrl: formData.targetUrl,
                altText: formData.altText || formData.name,
                placement: formData.placement,
                width: dimensions.width,
                height: dimensions.height,
                weight: formData.weight,
                status: formData.status,
                startDate: formData.startDate ? new Date(formData.startDate) : null,
                endDate: formData.endDate ? new Date(formData.endDate) : null,
                targetWebsites: formData.targetWebsites,
                updatedAt: serverTimestamp(),
            };

            if (editingAd) {
                await updateDoc(doc(firestore, 'live_ads', editingAd.id), adData);
                toast({
                    title: 'Ad Updated',
                    description: 'The advertisement has been updated successfully.',
                });
            } else {
                await addDoc(collection(firestore, 'live_ads'), {
                    ...adData,
                    impressions: 0,
                    clicks: 0,
                    createdAt: serverTimestamp(),
                    createdBy: user?.uid || '',
                });
                toast({
                    title: 'Ad Created',
                    description: 'The advertisement has been created successfully.',
                });
            }

            setShowCreateDialog(false);
            setFormData(defaultFormData);
            setImageFile(null);
            setImagePreview(null);
            setEditingAd(null);
        } catch (err) {
            console.error('Error saving ad:', err);

            // Check if this is a CORS error (typically shows as network/fetch error)
            const errorMessage = err instanceof Error ? err.message : String(err);
            const isCorsError =
                errorMessage.includes('CORS') ||
                errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('preflight');

            if (isCorsError) {
                toast({
                    title: 'Upload Error - CORS Configuration Required',
                    description: 'The file upload failed due to CORS policy. Please run: gsutil cors set cors.json gs://studio-4614023416-d45cd.firebasestorage.app',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'Failed to save the advertisement. ' + errorMessage,
                    variant: 'destructive',
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (ad: LiveAd, newStatus: LiveAdStatus) => {
        if (!firestore) return;

        try {
            await updateDoc(doc(firestore, 'live_ads', ad.id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            toast({
                title: 'Status Updated',
                description: `Ad status changed to ${LIVE_AD_STATUS_LABELS[newStatus]}.`,
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to update status.',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (ad: LiveAd) => {
        if (!firestore) return;

        if (!confirm(`Are you sure you want to delete "${ad.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            // If this live ad was linked to a customer advertisement, clear the reference
            if (ad.sourceAdvertisementId && ad.customerId) {
                const sourceAdRef = doc(firestore, 'users', ad.customerId, 'advertisements', ad.sourceAdvertisementId);
                await updateDoc(sourceAdRef, {
                    pushedToAdServerId: null,
                    pushedToAdServerAt: null,
                    liveAdId: null,
                    updatedAt: serverTimestamp(),
                });
            }

            await deleteDoc(doc(firestore, 'live_ads', ad.id));
            toast({
                title: 'Ad Deleted',
                description: 'The advertisement has been deleted.',
            });
        } catch (err) {
            console.error('Failed to delete advertisement:', err);
            toast({
                title: 'Error',
                description: 'Failed to delete the advertisement.',
                variant: 'destructive',
            });
        }
    };

    const copyEmbedCode = (type: 'script' | 'div' | 'full', websiteId?: CommunityWebsiteId) => {
        const baseUrl = window.location.origin;
        const websiteParam = websiteId ? `?website=${websiteId}` : '';
        const dataSiteAttr = websiteId ? ` data-site="${websiteId}"` : '';
        let code = '';

        switch (type) {
            case 'script':
                code = `<script src="${baseUrl}/api/ads/embed${websiteParam}"></script>`;
                break;
            case 'div':
                code = `<div data-community-ad data-placement="inline"${dataSiteAttr}></div>`;
                break;
            case 'full':
                code = `<!-- Community Ads Embed${websiteId ? ` - ${COMMUNITY_WEBSITE_CONFIG[websiteId].name}` : ''} -->
<script src="${baseUrl}/api/ads/embed${websiteParam}"></script>
<div data-community-ad data-placement="inline"${dataSiteAttr}></div>`;
                break;
        }

        navigator.clipboard.writeText(code);
        toast({
            title: 'Copied!',
            description: `Embed code${websiteId ? ` for ${COMMUNITY_WEBSITE_CONFIG[websiteId].shortName}` : ''} copied to clipboard.`,
        });
    };

    const handleOpenImport = async () => {
        setShowImportDialog(true);
        await fetchCustomerAds();
    };

    const fetchCustomerAds = async () => {
        if (!firestore) return;

        setLoadingCustomerAds(true);
        try {
            // Get all approved or live customer ads that have an ad proof
            const adsQuery = query(
                collectionGroup(firestore, 'advertisements'),
                where('status', 'in', ['approved', 'live']),
            );

            const snapshot = await getDocs(adsQuery);
            const adsWithProofs: (Advertisement & { userName?: string })[] = [];

            // Get existing live_ads to check which are already imported
            const existingLiveAds = ads.map(a => a.sourceAdvertisementId).filter(Boolean);

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                // Only include ads with a proof URL that haven't been imported yet
                if (data.adProofUrl && !existingLiveAds.includes(docSnap.id)) {
                    adsWithProofs.push({
                        id: docSnap.id,
                        userId: data.userId,
                        subscriptionId: data.subscriptionId || '',
                        status: data.status,
                        adProofUrl: data.adProofUrl,
                        adProofDestinationUrl: data.adProofDestinationUrl,
                        businessName: data.businessName,
                        contactName: data.contactName,
                        email: data.email,
                        createdAt: data.createdAt,
                        userName: data.businessName || data.contactName || 'Unknown',
                    });
                }
            }

            setCustomerAds(adsWithProofs);
        } catch (err) {
            console.error('Error fetching customer ads:', err);
            toast({
                title: 'Error',
                description: 'Failed to load customer advertisements.',
                variant: 'destructive',
            });
        } finally {
            setLoadingCustomerAds(false);
        }
    };

    const handleImportAd = async (ad: Advertisement & { userName?: string }) => {
        if (!firestore) return;

        setImportingAdId(ad.id);
        try {
            // Create live ad from customer ad
            const placement: AdPlacement = 'inline';
            const dimensions = AD_PLACEMENT_DIMENSIONS[placement];

            const liveAdData = {
                name: `${ad.businessName || ad.userName || 'Advertisement'} - ${ad.id.slice(0, 6)}`,
                description: `Customer advertisement for ${ad.businessName || ad.userName}`,
                imageUrl: ad.adProofUrl,
                targetUrl: ad.adProofDestinationUrl || '',
                altText: `Advertisement for ${ad.businessName || ad.userName}`,
                placement,
                width: dimensions.width,
                height: dimensions.height,
                weight: 50,
                status: 'active' as LiveAdStatus,
                targetWebsites: [], // Empty means show on all websites
                startDate: null,
                endDate: null,
                sourceAdvertisementId: ad.id,
                customerId: ad.userId,
                customerName: ad.businessName || ad.userName,
                impressions: 0,
                clicks: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: user?.uid || '',
            };

            const liveAdDocRef = await addDoc(collection(firestore, 'live_ads'), liveAdData);

            // Update the customer ad to mark it as pushed to ad server
            const adDocRef = doc(firestore, 'users', ad.userId, 'advertisements', ad.id);
            await updateDoc(adDocRef, {
                pushedToAdServerId: liveAdDocRef.id,
                pushedToAdServerAt: serverTimestamp(),
                status: 'live',
                liveAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Remove from the list
            setCustomerAds(prev => prev.filter(a => a.id !== ad.id));

            toast({
                title: 'Ad Imported!',
                description: `${ad.businessName || ad.userName} ad is now live on the ad server.`,
            });
        } catch (err) {
            console.error('Error importing ad:', err);
            toast({
                title: 'Error',
                description: 'Failed to import the advertisement.',
                variant: 'destructive',
            });
        } finally {
            setImportingAdId(null);
        }
    };

    // Directory management functions
    const fetchDirectoryListings = async () => {
        try {
            setLoadingDirectory(true);
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Not authenticated');

            const statusParam = directoryStatusFilter !== 'all' ? `?status=${directoryStatusFilter}` : '';
            const response = await fetch(`/api/admin/directory${statusParam}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch directory listings');

            const result = await response.json();
            setDirectoryListings(result.data.listings);
            setDirectoryStats(result.data.stats);
        } catch (err) {
            console.error('Error fetching directory listings:', err);
            toast({
                title: 'Error',
                description: 'Failed to fetch directory listings.',
                variant: 'destructive',
            });
        } finally {
            setLoadingDirectory(false);
        }
    };

    const handleOpenDirectory = async () => {
        setShowDirectoryDialog(true);
        await fetchDirectoryListings();
    };

    const handleDirectoryAction = async (liveAdId: string, action: 'approve' | 'reject' | 'hide' | 'feature' | 'unfeature', rejectionReason?: string) => {
        try {
            setModeratingAd(liveAdId);
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Not authenticated');

            const response = await fetch('/api/admin/directory', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    liveAdId,
                    action,
                    rejectionReason,
                }),
            });

            if (!response.ok) throw new Error('Failed to update directory listing');

            const result = await response.json();
            toast({
                title: 'Success',
                description: result.data.message,
            });

            await fetchDirectoryListings();
        } catch (err) {
            console.error('Error updating directory listing:', err);
            toast({
                title: 'Error',
                description: 'Failed to update directory listing.',
                variant: 'destructive',
            });
        } finally {
            setModeratingAd(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Ad Server</h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Manage live advertisements served to external websites
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowEmbedDialog(true)} className="flex-1 sm:flex-none">
                        <Code className="mr-2 h-4 w-4" />
                        Get Embed Code
                    </Button>
                    <Button variant="outline" onClick={handleOpenDirectory}>
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        Directory
                        {directoryStats.pending > 0 && (
                            <Badge variant="destructive" className="ml-2">{directoryStats.pending}</Badge>
                        )}
                    </Button>
                    <Button variant="outline" onClick={handleOpenImport}>
                        <Users className="mr-2 h-4 w-4" />
                        Import from Customers
                    </Button>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Ad
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            Total Impressions
                        </CardDescription>
                        <CardTitle className="text-3xl">{stats.totalImpressions.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <MousePointerClick className="h-4 w-4" />
                            Total Clicks
                        </CardDescription>
                        <CardTitle className="text-3xl">{stats.totalClicks.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        statusFilter === 'active' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Play className="h-4 w-4 text-green-500" />
                            Active Ads
                        </CardDescription>
                        <CardTitle className="text-3xl text-green-600">{stats.activeAds}</CardTitle>
                    </CardHeader>
                </Card>
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        statusFilter === 'paused' && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter(statusFilter === 'paused' ? 'all' : 'paused')}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Pause className="h-4 w-4 text-yellow-500" />
                            Paused Ads
                        </CardDescription>
                        <CardTitle className="text-3xl text-yellow-600">{stats.pausedAds}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, URL, or customer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {Object.entries(LIVE_AD_STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {(searchQuery || statusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                className="w-full md:w-auto"
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
                    <CardTitle>Live Advertisements</CardTitle>
                    <CardDescription>
                        {filteredAds.length} ad{filteredAds.length !== 1 ? 's' : ''} found
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
                                        <TableHead className="w-20">Preview</TableHead>
                                        <TableHead>
                                            <button
                                                className="flex items-center hover:text-foreground transition-colors"
                                                onClick={() => handleSort('name')}
                                            >
                                                Name
                                                {getSortIcon('name')}
                                            </button>
                                        </TableHead>
                                        <TableHead>Websites</TableHead>
                                        <TableHead>Placement</TableHead>
                                        <TableHead>
                                            <button
                                                className="flex items-center hover:text-foreground transition-colors"
                                                onClick={() => handleSort('status')}
                                            >
                                                Status
                                                {getSortIcon('status')}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button
                                                className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                                onClick={() => handleSort('impressions')}
                                            >
                                                Impressions
                                                {getSortIcon('impressions')}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button
                                                className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                                onClick={() => handleSort('clicks')}
                                            >
                                                Clicks
                                                {getSortIcon('clicks')}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button
                                                className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                                onClick={() => handleSort('ctr')}
                                            >
                                                CTR
                                                {getSortIcon('ctr')}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAds.length > 0 ? filteredAds.map((ad) => {
                                        const statusColors = LIVE_AD_STATUS_COLORS[ad.status];
                                        const ctr = calculateCTR(ad.impressions || 0, ad.clicks || 0);

                                        return (
                                            <TableRow
                                                key={ad.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleOpenEdit(ad)}
                                            >
                                                <TableCell>
                                                    {ad.imageUrl ? (
                                                        <img
                                                            src={ad.imageUrl}
                                                            alt={ad.altText || ad.name}
                                                            className="w-16 h-10 object-cover rounded border"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-10 bg-muted rounded border flex items-center justify-center">
                                                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{ad.name}</div>
                                                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                        {ad.targetUrl}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {ad.targetWebsites && ad.targetWebsites.length > 0 ? (
                                                            ad.targetWebsites.map((websiteId) => {
                                                                const website = COMMUNITY_WEBSITE_CONFIG[websiteId];
                                                                return website ? (
                                                                    <Badge
                                                                        key={websiteId}
                                                                        className={cn(website.color.bg, website.color.text, "text-xs")}
                                                                    >
                                                                        {website.shortName}
                                                                    </Badge>
                                                                ) : null;
                                                            })
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">All websites</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {AD_PLACEMENT_LABELS[ad.placement]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(statusColors?.bg, statusColors?.text)}>
                                                        {LIVE_AD_STATUS_LABELS[ad.status]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {(ad.impressions || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {(ad.clicks || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {ctr}%
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
                                                            <DropdownMenuItem onClick={() => handleOpenEdit(ad)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => window.open(ad.targetUrl, '_blank')}>
                                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                                Visit Target URL
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {ad.status !== 'active' && (
                                                                <DropdownMenuItem onClick={() => handleStatusChange(ad, 'active')}>
                                                                    <Play className="mr-2 h-4 w-4" />
                                                                    Activate
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ad.status === 'active' && (
                                                                <DropdownMenuItem onClick={() => handleStatusChange(ad, 'paused')}>
                                                                    <Pause className="mr-2 h-4 w-4" />
                                                                    Pause
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleStatusChange(ad, 'archived')}>
                                                                <Archive className="mr-2 h-4 w-4" />
                                                                Archive
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => handleDelete(ad)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                                {searchQuery || statusFilter !== 'all'
                                                    ? 'No ads match your filters.'
                                                    : 'No live ads yet. Create your first ad to get started.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog - Full Page */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-full w-full h-full max-h-full sm:max-w-full sm:h-full sm:max-h-full sm:rounded-none flex flex-col">
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                        <DialogTitle>{editingAd ? 'Edit Advertisement' : 'Create Advertisement'}</DialogTitle>
                        <DialogDescription>
                            {editingAd
                                ? 'Update the advertisement details below.'
                                : 'Fill in the details to create a new live advertisement.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="max-w-2xl mx-auto grid gap-4">
                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label>Ad Creative *</Label>
                            <div className="flex gap-4">
                                {imagePreview && (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-32 h-20 object-cover rounded border"
                                    />
                                )}
                                <div className="flex-1">
                                    <Label
                                        htmlFor="image-upload"
                                        className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                                            <p className="text-sm text-muted-foreground">
                                                {imageFile ? imageFile.name : 'Click to upload image'}
                                            </p>
                                        </div>
                                        <Input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Summer Sale Banner"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the ad..."
                                rows={2}
                            />
                        </div>

                        {/* Target URL */}
                        <div className="space-y-2">
                            <Label htmlFor="targetUrl">Target URL *</Label>
                            <Input
                                id="targetUrl"
                                type="url"
                                value={formData.targetUrl}
                                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                                placeholder="https://example.com/landing-page"
                            />
                        </div>

                        {/* Alt Text */}
                        <div className="space-y-2">
                            <Label htmlFor="altText">Alt Text</Label>
                            <Input
                                id="altText"
                                value={formData.altText}
                                onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                                placeholder="Descriptive text for accessibility"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Placement */}
                            <div className="space-y-2">
                                <Label>Placement</Label>
                                <Select
                                    value={formData.placement}
                                    onValueChange={(value: AdPlacement) => setFormData({ ...formData, placement: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(AD_PLACEMENT_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label} ({AD_PLACEMENT_DIMENSIONS[value as AdPlacement].width}x{AD_PLACEMENT_DIMENSIONS[value as AdPlacement].height})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: LiveAdStatus) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(LIVE_AD_STATUS_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Weight */}
                        <div className="space-y-2">
                            <Label htmlFor="weight">Display Weight (1-100)</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    id="weight"
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                                    className="flex-1"
                                />
                                <span className="text-sm font-medium w-12 text-right">{formData.weight}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Higher weight means more likely to be shown
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Start Date */}
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date (Optional)</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>

                            {/* End Date */}
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date (Optional)</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Target Websites */}
                        <div className="space-y-3">
                            <Label>Target Websites</Label>
                            <p className="text-xs text-muted-foreground">
                                Select which community websites should display this ad. Leave all unchecked to show on all websites.
                            </p>
                            <div className="grid gap-3">
                                {COMMUNITY_WEBSITE_LIST.map((website) => (
                                    <div key={website.id} className="flex items-center space-x-3">
                                        <Checkbox
                                            id={`website-${website.id}`}
                                            checked={formData.targetWebsites.includes(website.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setFormData({
                                                        ...formData,
                                                        targetWebsites: [...formData.targetWebsites, website.id],
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        targetWebsites: formData.targetWebsites.filter(id => id !== website.id),
                                                    });
                                                }
                                            }}
                                        />
                                        <Label
                                            htmlFor={`website-${website.id}`}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Badge className={cn(website.color.bg, website.color.text, "text-xs")}>
                                                {website.shortName}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">{website.name}</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t shrink-0">
                        <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingAd ? 'Update Ad' : 'Create Ad'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Embed Code Dialog */}
            <Dialog open={showEmbedDialog} onOpenChange={(open) => {
                setShowEmbedDialog(open);
                if (!open) setSelectedEmbedWebsite(null);
            }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Embed Code</DialogTitle>
                        <DialogDescription>
                            Get unique embed codes for each community website to display targeted ads.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="websites">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="websites">By Website</TabsTrigger>
                            <TabsTrigger value="wix">Wix Sites</TabsTrigger>
                            <TabsTrigger value="directory">Sponsor Page</TabsTrigger>
                            <TabsTrigger value="simple">Generic</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        </TabsList>

                        <TabsContent value="websites" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select a Website</Label>
                                <p className="text-sm text-muted-foreground">
                                    Each website has unique embed code. Select a website to get its specific code.
                                </p>
                            </div>

                            <div className="grid gap-4">
                                {COMMUNITY_WEBSITE_LIST.map((website) => (
                                    <Card
                                        key={website.id}
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            selectedEmbedWebsite === website.id && "ring-2 ring-primary"
                                        )}
                                        onClick={() => setSelectedEmbedWebsite(
                                            selectedEmbedWebsite === website.id ? null : website.id
                                        )}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn(website.color.bg, website.color.text)}>
                                                        {website.shortName}
                                                    </Badge>
                                                    <div>
                                                        <CardTitle className="text-base">{website.name}</CardTitle>
                                                        <CardDescription>{website.description}</CardDescription>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyEmbedCode('full', website.id);
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy Code
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        {selectedEmbedWebsite === website.id && (
                                            <CardContent className="pt-0">
                                                <div className="relative">
                                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<!-- Community Ads - ${website.name} -->
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/embed?website=${website.id}"></script>
<div data-community-ad data-placement="inline" data-site="${website.id}"></div>`}
                                                    </pre>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    This code will only show ads targeted to {website.name}.
                                                </p>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>Available Placements</Label>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {Object.entries(AD_PLACEMENT_LABELS).map(([key, label]) => (
                                        <div key={key} className="flex justify-between p-2 bg-muted rounded">
                                            <code>{key}</code>
                                            <span className="text-muted-foreground">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="wix" className="space-y-4">
                            <Alert className="border-blue-200 bg-blue-50">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">Wix-Optimized Embed</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    These embed codes are specifically designed for Wix websites with maximum compatibility for Wix&apos;s sandboxed environment.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Quick Setup (Recommended)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        For most Wix sites, use the responsive iframe embed:
                                    </p>
                                    <div className="space-y-3">
                                        <div className="text-sm font-medium">Steps:</div>
                                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                            <li>In Wix Editor, click &quot;Add&quot; (+) button</li>
                                            <li>Select &quot;Embed&quot; → &quot;Embed HTML&quot; or &quot;Custom Embeds&quot;</li>
                                            <li>Click &quot;Enter Code&quot; and paste the code below</li>
                                            <li>Resize the element to fit your layout</li>
                                        </ol>
                                    </div>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<div style="position: relative; width: 100%; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
  <iframe
    src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    scrolling="no"
    frameborder="0"
    allowtransparency="true"
    loading="lazy"
    title="Community Advertisement">
  </iframe>
</div>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<div style="position: relative; width: 100%; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
  <iframe
    src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    scrolling="no"
    frameborder="0"
    allowtransparency="true"
    loading="lazy"
    title="Community Advertisement">
  </iframe>
</div>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: 'Wix embed code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Select Target Website</Label>
                                    <Select
                                        value={selectedEmbedWebsite || ''}
                                        onValueChange={(value) => setSelectedEmbedWebsite(value as CommunityWebsiteId)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a website..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMMUNITY_WEBSITE_LIST.map((website) => (
                                                <SelectItem key={website.id} value={website.id}>
                                                    {website.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Theme Options</Label>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div className="p-2 bg-muted rounded text-center">
                                            <code>theme=auto</code>
                                            <p className="text-xs text-muted-foreground">Transparent</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded text-center">
                                            <code>theme=light</code>
                                            <p className="text-xs text-muted-foreground">White bg</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded text-center">
                                            <code>theme=dark</code>
                                            <p className="text-xs text-muted-foreground">Dark bg</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Fixed Size Option</Label>
                                    <p className="text-sm text-muted-foreground">
                                        If you need a fixed size ad (300x100px):
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}&responsive=false"
  style="width: 300px; height: 100px; border: none;"
  frameborder="0"
  loading="lazy"
  title="Community Advertisement">
</iframe>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<iframe src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}&responsive=false" style="width: 300px; height: 100px; border: none;" frameborder="0" loading="lazy" title="Community Advertisement"></iframe>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: 'Wix fixed-size embed code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>1x2 Row Layout (2 Ads Side by Side)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Display 2 ads in a horizontal row:
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<div style="display: flex; gap: 16px; width: 100%; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 280px; position: relative; padding-bottom: 16.67%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 1">
    </iframe>
  </div>
  <div style="flex: 1; min-width: 280px; position: relative; padding-bottom: 16.67%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 2">
    </iframe>
  </div>
</div>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<div style="display: flex; gap: 16px; width: 100%; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 280px; position: relative; padding-bottom: 16.67%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 1">
    </iframe>
  </div>
  <div style="flex: 1; min-width: 280px; position: relative; padding-bottom: 16.67%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 2">
    </iframe>
  </div>
</div>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: '1x2 row Wix embed code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>1x3 Row Layout (3 Ads Side by Side)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Display 3 ads in a horizontal row:
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<div style="display: flex; gap: 16px; width: 100%; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 200px; position: relative; padding-bottom: 11.11%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 1">
    </iframe>
  </div>
  <div style="flex: 1; min-width: 200px; position: relative; padding-bottom: 11.11%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 2">
    </iframe>
  </div>
  <div style="flex: 1; min-width: 200px; position: relative; padding-bottom: 11.11%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 3">
    </iframe>
  </div>
</div>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<div style="display: flex; gap: 16px; width: 100%; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 200px; position: relative; padding-bottom: 11.11%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 1">
    </iframe>
  </div>
  <div style="flex: 1; min-width: 200px; position: relative; padding-bottom: 11.11%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 2">
    </iframe>
  </div>
  <div style="flex: 1; min-width: 200px; position: relative; padding-bottom: 11.11%; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement 3">
    </iframe>
  </div>
</div>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: '1x3 row Wix embed code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>2x3 Grid Layout (6 Ads in 2 Rows)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Display 6 ads in a 2-row, 3-column grid:
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%;">
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 1"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 2"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 3"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 4"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 5"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 6"></iframe>
  </div>
</div>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%;">
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 1"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 2"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 3"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 4"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 5"></iframe>
  </div>
  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad 6"></iframe>
  </div>
</div>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: '2x3 grid Wix embed code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Wix Velo (Advanced)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        For developers using Wix Velo (Corvid), add this to your page code:
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// In Wix Velo page code
import wixWindow from 'wix-window';

$w.onReady(function () {
  const adUrl = "${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}";
  $w('#adFrame').src = adUrl;

  // Sync visibility for better rotation
  wixWindow.onVisibilityChange((isVisible) => {
    $w('#adFrame').postMessage({
      source: 'wix-parent',
      type: 'visibility',
      visible: isVisible
    });
  });
});`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `import wixWindow from 'wix-window';

$w.onReady(function () {
  const adUrl = "${window.location.origin}/api/ads/wix-embed?website=${selectedEmbedWebsite || 'wesley-chapel'}";
  $w('#adFrame').src = adUrl;

  wixWindow.onVisibilityChange((isVisible) => {
    $w('#adFrame').postMessage({
      source: 'wix-parent',
      type: 'visibility',
      visible: isVisible
    });
  });
});`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: 'Wix Velo code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="directory" className="space-y-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <span className="text-lg">Sponsor Directory Page</span>
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">New</span>
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Display all your sponsors in a beautiful directory page. Perfect for a &quot;View Our Sponsors&quot; or &quot;Our Partners&quot; page on your Wix website.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Full Page Directory (Recommended)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Shows all active sponsors in a responsive grid with their ads and business names. Includes a call-to-action to become a sponsor.
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-directory?website=${selectedEmbedWebsite || 'wesley-chapel'}"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Our Sponsors">
</iframe>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<iframe
  src="${window.location.origin}/api/ads/wix-directory?website=${selectedEmbedWebsite || 'wesley-chapel'}"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Our Sponsors">
</iframe>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: 'Sponsor directory embed code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>With Custom CTA Button</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Add your custom &quot;Become a Sponsor&quot; URL to drive new advertisers:
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-directory?website=${selectedEmbedWebsite || 'wesley-chapel'}&ctaUrl=YOUR_SIGNUP_URL&ctaText=Become a Sponsor"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Our Sponsors">
</iframe>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<iframe
  src="${window.location.origin}/api/ads/wix-directory?website=${selectedEmbedWebsite || 'wesley-chapel'}&ctaUrl=YOUR_SIGNUP_URL&ctaText=Become a Sponsor"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Our Sponsors">
</iframe>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: 'Directory with CTA code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Customization Options</Label>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 bg-muted rounded">
                                            <code className="text-xs">title=Our Sponsors</code>
                                            <p className="text-xs text-muted-foreground mt-1">Page title</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded">
                                            <code className="text-xs">subtitle=...</code>
                                            <p className="text-xs text-muted-foreground mt-1">Description text</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded">
                                            <code className="text-xs">theme=light|dark|auto</code>
                                            <p className="text-xs text-muted-foreground mt-1">Color theme</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded">
                                            <code className="text-xs">columns=auto|2|3|4</code>
                                            <p className="text-xs text-muted-foreground mt-1">Grid columns</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded">
                                            <code className="text-xs">cta=false</code>
                                            <p className="text-xs text-muted-foreground mt-1">Hide CTA section</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded">
                                            <code className="text-xs">branding=false</code>
                                            <p className="text-xs text-muted-foreground mt-1">Hide branding</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Dark Theme Version</Label>
                                    <p className="text-sm text-muted-foreground">
                                        For websites with dark backgrounds:
                                    </p>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/wix-directory?website=${selectedEmbedWebsite || 'wesley-chapel'}&theme=dark"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Our Sponsors">
</iframe>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const code = `<iframe
  src="${window.location.origin}/api/ads/wix-directory?website=${selectedEmbedWebsite || 'wesley-chapel'}&theme=dark"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Our Sponsors">
</iframe>`;
                                                navigator.clipboard.writeText(code);
                                                toast({
                                                    title: 'Copied!',
                                                    description: 'Dark theme directory code copied to clipboard.',
                                                });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="simple" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Generic Embed (All Websites)</Label>
                                <p className="text-sm text-muted-foreground">
                                    This code shows all ads regardless of website targeting:
                                </p>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<!-- Community Ads -->
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/embed"></script>
<div data-community-ad data-placement="inline"></div>`}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyEmbedCode('full')}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Available Placements</Label>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {Object.entries(AD_PLACEMENT_LABELS).map(([key, label]) => (
                                        <div key={key} className="flex justify-between p-2 bg-muted rounded">
                                            <code>{key}</code>
                                            <span className="text-muted-foreground">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="advanced" className="space-y-4">
                            <div className="space-y-2">
                                <Label>JavaScript API</Label>
                                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// Load the script first (use website-specific URL)
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/embed?website=wesley-chapel"></script>

// Then call the API
<script>
  CommunityAds.load({
    container: '#my-ad-container',
    placement: 'sidebar',
    site: 'wesley-chapel', // website ID for targeting
    onLoad: function(ad) {
      console.log('Ad loaded:', ad);
    },
    onError: function(error) {
      console.error('Ad error:', error);
    }
  });
</script>

<div id="my-ad-container"></div>`}
                                </pre>
                            </div>

                            <div className="space-y-2">
                                <Label>Direct API Endpoint</Label>
                                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`GET /api/ads/serve?placement=banner&website=wesley-chapel

Response:
{
  "ad": {
    "id": "abc123",
    "imageUrl": "https://...",
    "targetUrl": "https://...",
    "altText": "...",
    "width": 728,
    "height": 90
  },
  "clickUrl": "/api/ads/click?id=abc123",
  "impressionUrl": "/api/ads/impression?id=abc123"
}`}
                                </pre>
                            </div>

                            <div className="space-y-2">
                                <Label>Website IDs</Label>
                                <div className="grid gap-2 text-sm">
                                    {COMMUNITY_WEBSITE_LIST.map((website) => (
                                        <div key={website.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                                            <code className="font-mono">{website.id}</code>
                                            <span className="text-muted-foreground">- {website.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEmbedDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import from Customers Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Import from Customer Ads
                        </DialogTitle>
                        <DialogDescription>
                            Select approved customer advertisements to add to the ad server.
                            Only ads with completed proofs that haven't been imported yet are shown.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {loadingCustomerAds ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : customerAds.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Ads to Import</h3>
                                <p className="text-muted-foreground">
                                    All approved customer ads have already been imported, or there are no approved ads with completed proofs.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Found {customerAds.length} approved ad{customerAds.length !== 1 ? 's' : ''} ready to import
                                </p>
                                <div className="grid gap-4">
                                    {customerAds.map((ad) => (
                                        <Card key={ad.id} className="overflow-hidden">
                                            <div className="flex">
                                                <div className="w-40 h-28 flex-shrink-0 bg-muted">
                                                    {ad.adProofUrl && (
                                                        <img
                                                            src={ad.adProofUrl}
                                                            alt={ad.businessName || 'Ad preview'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-medium">{ad.businessName || ad.contactName || 'Unknown Business'}</h4>
                                                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                                                {ad.adProofDestinationUrl || 'No destination URL'}
                                                            </p>
                                                            <div className="flex gap-2 mt-2">
                                                                <Badge variant="outline">
                                                                    {AD_STATUS_LABELS[ad.status] || ad.status}
                                                                </Badge>
                                                                {ad.email && (
                                                                    <span className="text-xs text-muted-foreground">{ad.email}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleImportAd(ad)}
                                                            disabled={importingAdId === ad.id}
                                                        >
                                                            {importingAdId === ad.id ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Import className="mr-2 h-4 w-4" />
                                                            )}
                                                            Import
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Directory Management Dialog */}
            <Dialog open={showDirectoryDialog} onOpenChange={setShowDirectoryDialog}>
                <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5" />
                            Directory Listings Management
                        </DialogTitle>
                        <DialogDescription>
                            Review and manage advertiser directory listings. Approve, reject, or feature listings.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Directory Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 py-4">
                        <Card
                            className={cn("cursor-pointer transition-all hover:shadow-md p-2", directoryStatusFilter === 'all' && "ring-2 ring-primary")}
                            onClick={() => { setDirectoryStatusFilter('all'); fetchDirectoryListings(); }}
                        >
                            <div className="text-center">
                                <div className="text-2xl font-bold">{directoryStats.total}</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                        </Card>
                        <Card
                            className={cn("cursor-pointer transition-all hover:shadow-md p-2 border-amber-200", directoryStatusFilter === 'pending' && "ring-2 ring-amber-500")}
                            onClick={() => { setDirectoryStatusFilter('pending'); fetchDirectoryListings(); }}
                        >
                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-600">{directoryStats.pending}</div>
                                <div className="text-xs text-muted-foreground">Pending</div>
                            </div>
                        </Card>
                        <Card
                            className={cn("cursor-pointer transition-all hover:shadow-md p-2 border-green-200", directoryStatusFilter === 'approved' && "ring-2 ring-green-500")}
                            onClick={() => { setDirectoryStatusFilter('approved'); fetchDirectoryListings(); }}
                        >
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{directoryStats.approved}</div>
                                <div className="text-xs text-muted-foreground">Approved</div>
                            </div>
                        </Card>
                        <Card
                            className={cn("cursor-pointer transition-all hover:shadow-md p-2 border-slate-200", directoryStatusFilter === 'hidden' && "ring-2 ring-slate-500")}
                            onClick={() => { setDirectoryStatusFilter('hidden'); fetchDirectoryListings(); }}
                        >
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-600">{directoryStats.hidden}</div>
                                <div className="text-xs text-muted-foreground">Hidden</div>
                            </div>
                        </Card>
                        <Card
                            className={cn("cursor-pointer transition-all hover:shadow-md p-2 border-red-200", directoryStatusFilter === 'rejected' && "ring-2 ring-red-500")}
                            onClick={() => { setDirectoryStatusFilter('rejected'); fetchDirectoryListings(); }}
                        >
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{directoryStats.rejected}</div>
                                <div className="text-xs text-muted-foreground">Rejected</div>
                            </div>
                        </Card>
                        <Card className="p-2 border-amber-300 bg-amber-50">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-600">{directoryStats.featured}</div>
                                <div className="text-xs text-muted-foreground">Featured</div>
                            </div>
                        </Card>
                    </div>

                    {/* Listings Table */}
                    <div className="py-4">
                        {loadingDirectory ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : directoryListings.length === 0 ? (
                            <div className="text-center py-8">
                                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Directory Listings</h3>
                                <p className="text-muted-foreground">
                                    {directoryStatusFilter !== 'all'
                                        ? `No listings with status "${directoryStatusFilter}".`
                                        : 'No advertisers have set up their directory listings yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing {directoryListings.length} listing{directoryListings.length !== 1 ? 's' : ''}
                                </p>
                                <div className="grid gap-4">
                                    {directoryListings.map((item) => {
                                        const listing = item.directoryListing;
                                        const status = listing?.directoryStatus || 'pending';
                                        const statusColors = DIRECTORY_STATUS_COLORS[status as DirectoryStatus] || { bg: 'bg-gray-100', text: 'text-gray-600' };

                                        return (
                                            <Card key={item.liveAdId} className="overflow-hidden">
                                                <div className="flex flex-col md:flex-row">
                                                    {/* Preview Card */}
                                                    <div className="w-full md:w-64 flex-shrink-0 p-4 bg-muted/30">
                                                        <DirectoryCardPreview
                                                            listing={listing || { businessName: item.liveAd.customerName || 'Business', showContactInfo: true, showSocialLinks: true }}
                                                            adImageUrl={item.liveAd.imageUrl}
                                                            className="shadow-sm"
                                                        />
                                                    </div>

                                                    {/* Details & Actions */}
                                                    <div className="flex-1 p-4">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-semibold text-lg">{listing?.businessName || item.liveAd.customerName || 'Unknown Business'}</h4>
                                                                    {listing?.isFeatured && (
                                                                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                                                            <Star className="h-3 w-3 mr-1 fill-current" />
                                                                            Featured
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {listing?.tagline && (
                                                                    <p className="text-sm text-muted-foreground italic">{listing.tagline}</p>
                                                                )}
                                                            </div>
                                                            <Badge className={`${statusColors.bg} ${statusColors.text}`}>
                                                                {status === 'approved' && <Check className="h-3 w-3 mr-1" />}
                                                                {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                                                {status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                                                {DIRECTORY_STATUS_LABELS[status as DirectoryStatus] || status}
                                                            </Badge>
                                                        </div>

                                                        {listing?.description && (
                                                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{listing.description}</p>
                                                        )}

                                                        <div className="flex flex-wrap gap-2 mb-4 text-xs">
                                                            {listing?.category && (
                                                                <Badge variant="secondary">
                                                                    {BUSINESS_CATEGORY_ICONS[listing.category as BusinessCategory]} {BUSINESS_CATEGORY_LABELS[listing.category as BusinessCategory]}
                                                                </Badge>
                                                            )}
                                                            {listing?.phone && <Badge variant="outline">📞 {listing.phone}</Badge>}
                                                            {listing?.email && <Badge variant="outline">✉️ {listing.email}</Badge>}
                                                            {listing?.websiteUrl && <Badge variant="outline">🌐 Website</Badge>}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex flex-wrap gap-2">
                                                            {status === 'pending' && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleDirectoryAction(item.liveAdId, 'approve')}
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
                                                                            const reason = prompt('Enter rejection reason:');
                                                                            if (reason) handleDirectoryAction(item.liveAdId, 'reject', reason);
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
                                                                        onClick={() => handleDirectoryAction(item.liveAdId, 'hide')}
                                                                        disabled={moderatingAd === item.liveAdId}
                                                                    >
                                                                        <Eye className="h-4 w-4 mr-1" />
                                                                        Hide
                                                                    </Button>
                                                                    {listing?.isFeatured ? (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handleDirectoryAction(item.liveAdId, 'unfeature')}
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
                                                                            onClick={() => handleDirectoryAction(item.liveAdId, 'feature')}
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
                                                                    onClick={() => handleDirectoryAction(item.liveAdId, 'approve')}
                                                                    disabled={moderatingAd === item.liveAdId}
                                                                >
                                                                    <Check className="h-4 w-4 mr-1" />
                                                                    Approve
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {listing?.directoryRejectionReason && status === 'rejected' && (
                                                            <Alert variant="destructive" className="mt-3">
                                                                <AlertCircle className="h-4 w-4" />
                                                                <AlertDescription>
                                                                    Rejection reason: {listing.directoryRejectionReason}
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

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDirectoryDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
