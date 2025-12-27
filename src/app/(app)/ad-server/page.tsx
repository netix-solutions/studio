'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    AD_PLACEMENTS,
    AD_PLACEMENT_LABELS,
    AD_PLACEMENT_DIMENSIONS,
    LIVE_AD_STATUSES,
    LIVE_AD_STATUS_LABELS,
    LIVE_AD_STATUS_COLORS,
    AD_STATUS_LABELS,
    calculateCTR,
} from '@/lib/types';

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
    targetSites: string;
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
    targetSites: '',
};

export default function AdServerPage() {
    const [ads, setAds] = useState<LiveAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

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

    // Filtered ads
    const filteredAds = useMemo(() => {
        return ads.filter(ad => {
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
    }, [ads, searchQuery, statusFilter]);

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
            targetSites: ad.targetSites?.join(', ') || '',
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
        if (!firestore || !storage) return;

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
                targetSites: formData.targetSites
                    ? formData.targetSites.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
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
            toast({
                title: 'Error',
                description: 'Failed to save the advertisement.',
                variant: 'destructive',
            });
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
            await deleteDoc(doc(firestore, 'live_ads', ad.id));
            toast({
                title: 'Ad Deleted',
                description: 'The advertisement has been deleted.',
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to delete the advertisement.',
                variant: 'destructive',
            });
        }
    };

    const copyEmbedCode = (type: 'script' | 'div' | 'full') => {
        const baseUrl = window.location.origin;
        let code = '';

        switch (type) {
            case 'script':
                code = `<script src="${baseUrl}/api/ads/embed"></script>`;
                break;
            case 'div':
                code = `<div data-community-ad data-placement="banner"></div>`;
                break;
            case 'full':
                code = `<!-- Community Ads Embed -->
<script src="${baseUrl}/api/ads/embed"></script>
<div data-community-ad data-placement="banner"></div>`;
                break;
        }

        navigator.clipboard.writeText(code);
        toast({
            title: 'Copied!',
            description: 'Embed code copied to clipboard.',
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
                targetSites: [],
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

            await addDoc(collection(firestore, 'live_ads'), liveAdData);

            // Update the customer ad to mark it as pushed to ad server
            const adDocRef = doc(firestore, 'users', ad.userId, 'advertisements', ad.id);
            await updateDoc(adDocRef, {
                pushedToAdServerId: ad.id,
                pushedToAdServerAt: serverTimestamp(),
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ad Server</h1>
                    <p className="text-muted-foreground">
                        Manage live advertisements served to external websites
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowEmbedDialog(true)}>
                        <Code className="mr-2 h-4 w-4" />
                        Get Embed Code
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
            <div className="grid gap-4 md:grid-cols-4">
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
                    <div className="flex flex-col md:flex-row gap-4">
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
                            <SelectTrigger className="w-[180px]">
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
                                        <TableHead>Name</TableHead>
                                        <TableHead>Placement</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Impressions</TableHead>
                                        <TableHead className="text-right">Clicks</TableHead>
                                        <TableHead className="text-right">CTR</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAds.length > 0 ? filteredAds.map((ad) => {
                                        const statusColors = LIVE_AD_STATUS_COLORS[ad.status];
                                        const ctr = calculateCTR(ad.impressions || 0, ad.clicks || 0);

                                        return (
                                            <TableRow key={ad.id}>
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
                                                <TableCell className="text-right">
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
                                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
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

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAd ? 'Edit Advertisement' : 'Create Advertisement'}</DialogTitle>
                        <DialogDescription>
                            {editingAd
                                ? 'Update the advertisement details below.'
                                : 'Fill in the details to create a new live advertisement.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
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

                        {/* Target Sites */}
                        <div className="space-y-2">
                            <Label htmlFor="targetSites">Target Sites (Optional)</Label>
                            <Input
                                id="targetSites"
                                value={formData.targetSites}
                                onChange={(e) => setFormData({ ...formData, targetSites: e.target.value })}
                                placeholder="site1.com, site2.com (leave empty for all sites)"
                            />
                            <p className="text-xs text-muted-foreground">
                                Comma-separated list of domains. Leave empty to show on all sites.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingAd ? 'Update Ad' : 'Create Ad'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Embed Code Dialog */}
            <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Embed Code</DialogTitle>
                        <DialogDescription>
                            Add these snippets to your external websites to display ads.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="simple">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="simple">Simple Integration</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        </TabsList>

                        <TabsContent value="simple" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Quick Start</Label>
                                <p className="text-sm text-muted-foreground">
                                    Add this code where you want the ad to appear:
                                </p>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<!-- Community Ads -->
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/embed"></script>
<div data-community-ad data-placement="banner"></div>`}
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
{`// Load the script first
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads/embed"></script>

// Then call the API
<script>
  CommunityAds.load({
    container: '#my-ad-container',
    placement: 'sidebar',
    site: 'mysite.com', // optional
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
{`GET /api/ads/serve?placement=banner&site=example.com

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
        </div>
    );
}
