
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, collectionGroup } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, Clock, CheckCircle, Eye, Filter } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    shouldAutoApprove,
    calculateAutoApprovalDeadline,
    type AdStatus,
    type Advertisement
} from '@/lib/types';

type AdWithMeta = Advertisement & {
    shouldAutoApprove?: boolean;
};

export default function AdvertisementsPage() {
    const [advertisements, setAdvertisements] = useState<AdWithMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('all');
    const { firestore } = useFirebase();
    const router = useRouter();

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

                // Check if auto-approval should happen
                if (ad.status === 'pending_customer_approval' && ad.sentForApprovalAt) {
                    ad.shouldAutoApprove = shouldAutoApprove(ad.sentForApprovalAt);
                }

                return ad;
            });

            // Sort by createdAt with null-safety
            setAdvertisements(adsData.sort((a, b) => {
                const aTime = a.createdAt?.seconds ?? 0;
                const bTime = b.createdAt?.seconds ?? 0;
                return bTime - aTime;
            }));
            setLoading(false);
            setError(null);
        }, (err) => {
            const permissionError = new FirestorePermissionError({
                path: '/users/{userId}/advertisements',
                operation: 'list',
            } satisfies SecurityRuleContext);

            errorEmitter.emit('permission-error', permissionError);

            setError("You do not have permission to view this data. Please contact an administrator to be granted the 'admin' role.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleViewDetails = (ad: AdWithMeta) => {
        router.push(`/advertisements/${ad.id}?userId=${ad.userId}`);
    };

    // Filter ads based on active tab
    const getFilteredAds = () => {
        if (activeTab === 'all') return advertisements;
        if (activeTab === 'action_required') {
            return advertisements.filter(ad =>
                ad.status === 'pending_internal_review' ||
                ad.status === 'pending_ad_creation' ||
                ad.shouldAutoApprove
            );
        }
        if (activeTab === 'pending_approval') {
            return advertisements.filter(ad => ad.status === 'pending_customer_approval');
        }
        if (activeTab === 'live') {
            return advertisements.filter(ad => ad.status === 'live');
        }
        return advertisements.filter(ad => ad.status === activeTab);
    };

    const filteredAds = getFilteredAds();

    // Count ads by status for the tab badges
    const counts = {
        all: advertisements.length,
        action_required: advertisements.filter(ad =>
            ad.status === 'pending_internal_review' ||
            ad.status === 'pending_ad_creation' ||
            ad.shouldAutoApprove
        ).length,
        pending_approval: advertisements.filter(ad => ad.status === 'pending_customer_approval').length,
        live: advertisements.filter(ad => ad.status === 'live').length,
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className={cn("cursor-pointer transition-colors", activeTab === 'all' && "ring-2 ring-primary")} onClick={() => setActiveTab('all')}>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Ads</CardDescription>
                        <CardTitle className="text-3xl">{counts.all}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className={cn("cursor-pointer transition-colors", activeTab === 'action_required' && "ring-2 ring-primary")} onClick={() => setActiveTab('action_required')}>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            Action Required
                        </CardDescription>
                        <CardTitle className="text-3xl text-amber-600">{counts.action_required}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className={cn("cursor-pointer transition-colors", activeTab === 'pending_approval' && "ring-2 ring-primary")} onClick={() => setActiveTab('pending_approval')}>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Pending Approval
                        </CardDescription>
                        <CardTitle className="text-3xl">{counts.pending_approval}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className={cn("cursor-pointer transition-colors", activeTab === 'live' && "ring-2 ring-primary")} onClick={() => setActiveTab('live')}>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Live
                        </CardDescription>
                        <CardTitle className="text-3xl text-green-600">{counts.live}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Advertisement Workflow</CardTitle>
                            <CardDescription>Track and manage all customer advertisements from creation to completion.</CardDescription>
                        </div>
                    </div>
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
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Date Created</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAds.length > 0 ? filteredAds.map((ad) => (
                                        <TableRow
                                            key={ad.id}
                                            onClick={() => handleViewDetails(ad)}
                                            className={cn(
                                                "cursor-pointer",
                                                ad.shouldAutoApprove && "bg-amber-50"
                                            )}
                                        >
                                            <TableCell>
                                                <div className="font-medium">{ad.contactName || 'N/A'}</div>
                                                <div className="text-sm text-muted-foreground">{ad.email || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>{ad.businessName || 'N/A'}</TableCell>
                                            <TableCell>
                                                {ad.createdAt ? format(ad.createdAt.toDate ? ad.createdAt.toDate() : new Date(ad.createdAt), 'MMM d, yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={AD_STATUS_COLORS[ad.status]?.variant || 'outline'}>
                                                    {AD_STATUS_LABELS[ad.status] || ad.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {ad.shouldAutoApprove && (
                                                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Ready for auto-approve
                                                    </span>
                                                )}
                                                {ad.status === 'pending_customer_approval' && ad.sentForApprovalAt && !ad.shouldAutoApprove && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Auto-approves {formatDistanceToNow(calculateAutoApprovalDeadline(ad.sentForApprovalAt), { addSuffix: true })}
                                                    </span>
                                                )}
                                                {ad.status === 'pending_internal_review' && (
                                                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                                        <Eye className="h-3 w-3" />
                                                        Needs review
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewDetails(ad)}>
                                                            View/Edit Details
                                                        </DropdownMenuItem>
                                                        {ad.email && (
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.location.href = `mailto:${ad.email}`;
                                                            }}>
                                                                Email Customer
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                {activeTab === 'all'
                                                    ? 'No advertisements found.'
                                                    : `No advertisements in "${activeTab === 'action_required' ? 'Action Required' : activeTab}" status.`}
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
