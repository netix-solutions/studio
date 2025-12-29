'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
    Lead,
    LeadSource,
    LeadStatus,
    LEAD_STATUSES,
    LEAD_PRIORITY_LABELS,
    LEAD_SOURCE_LABELS,
    LEAD_STATUS_LABELS,
    ACTIVITY_TYPES,
} from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('active');
    const [selectedSource, setSelectedSource] = useState<string>('all');
    const [selectedPriority, setSelectedPriority] = useState<string>('all');
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { firestore } = useFirebase();
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const leadsQuery = query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
            const leadsData: Lead[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                priority: doc.data().priority || 'medium',
                source: doc.data().source || 'website',
                score: doc.data().score || 0,
                status: doc.data().status || LEAD_STATUSES.ACTIVE, // Default to active
            } as Lead));
            setLeads(leadsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching leads:", err);
            setError("You do not have permission to view this data. Please contact an administrator.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    // Filter leads
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Status filter (active/inactive tabs)
            const leadStatus = lead.status || LEAD_STATUSES.ACTIVE;
            if (leadStatus !== selectedStatus) {
                return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    lead.businessName?.toLowerCase().includes(query) ||
                    lead.contactName?.toLowerCase().includes(query) ||
                    lead.email?.toLowerCase().includes(query) ||
                    lead.phone?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Source filter
            if (selectedSource !== 'all' && lead.source !== selectedSource) {
                return false;
            }

            // Priority filter
            if (selectedPriority !== 'all' && lead.priority !== selectedPriority) {
                return false;
            }

            return true;
        });
    }, [leads, searchQuery, selectedStatus, selectedSource, selectedPriority]);

    // Count leads by status for badges
    const statusCounts = useMemo(() => {
        const counts = { active: 0, inactive: 0 };
        leads.forEach(lead => {
            const status = lead.status || LEAD_STATUSES.ACTIVE;
            if (status === 'active') counts.active++;
            else if (status === 'inactive') counts.inactive++;
        });
        return counts;
    }, [leads]);

    const handleRowClick = (leadId: string) => {
        router.push(`/leads/${leadId}`);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
        } else {
            setSelectedLeads(new Set());
        }
    };

    const handleSelectLead = (leadId: string, checked: boolean) => {
        const newSelected = new Set(selectedLeads);
        if (checked) {
            newSelected.add(leadId);
        } else {
            newSelected.delete(leadId);
        }
        setSelectedLeads(newSelected);
    };

    const handleBulkStatusUpdate = async (newStatus: LeadStatus) => {
        if (!firestore || !user || selectedLeads.size === 0) return;

        setIsUpdatingStatus(true);
        try {
            const batch = writeBatch(firestore);
            const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id));

            for (const lead of selectedLeadsList) {
                const leadRef = doc(firestore, 'leads', lead.id);
                batch.update(leadRef, {
                    status: newStatus,
                    updatedAt: serverTimestamp(),
                });
            }

            await batch.commit();

            // Log activities
            for (const lead of selectedLeadsList) {
                const currentStatus = lead.status || LEAD_STATUSES.ACTIVE;
                if (currentStatus !== newStatus) {
                    await addDoc(collection(firestore, 'leads', lead.id, 'activities'), {
                        leadId: lead.id,
                        type: ACTIVITY_TYPES.NOTE,
                        title: `Status changed from ${LEAD_STATUS_LABELS[currentStatus]} to ${LEAD_STATUS_LABELS[newStatus]}`,
                        metadata: { fromStatus: currentStatus, toStatus: newStatus },
                        createdBy: user.uid,
                        createdByName: user.displayName || user.email || 'Unknown',
                        createdAt: serverTimestamp(),
                    });
                }
            }

            setSelectedLeads(new Set());
            toast({
                title: 'Leads Updated',
                description: `${selectedLeadsList.length} leads marked as ${LEAD_STATUS_LABELS[newStatus]}`,
            });
        } catch (err) {
            console.error("Error updating leads:", err);
            toast({
                title: 'Error',
                description: 'Failed to update lead status',
                variant: 'destructive',
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDeleteSpamLead = async (lead: Lead) => {
        if (!firestore) return;

        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'leads', lead.id));

            toast({
                title: 'Lead Deleted',
                description: `"${lead.businessName}" has been marked as spam and deleted.`,
            });
            setDeleteConfirmLead(null);
        } catch (err) {
            console.error("Error deleting lead:", err);
            toast({
                title: 'Error',
                description: 'Failed to delete lead. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDeleteSpam = async () => {
        if (!firestore || selectedLeads.size === 0) return;

        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id));

            for (const lead of selectedLeadsList) {
                const leadRef = doc(firestore, 'leads', lead.id);
                batch.delete(leadRef);
            }

            await batch.commit();

            setSelectedLeads(new Set());
            setShowBulkDeleteConfirm(false);
            toast({
                title: 'Leads Deleted',
                description: `${selectedLeadsList.length} leads have been marked as spam and deleted.`,
            });
        } catch (err) {
            console.error("Error deleting leads:", err);
            toast({
                title: 'Error',
                description: 'Failed to delete leads. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate stats
    const stats = useMemo(() => {
        const total = filteredLeads.length;
        return { total };
    }, [filteredLeads]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedSource('all');
        setSelectedPriority('all');
    };

    const hasActiveFilters = searchQuery || selectedSource !== 'all' || selectedPriority !== 'all';

    return (
        <div className="space-y-4">
            {/* Header with stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Manage and track all potential customers
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base md:text-lg px-2 md:px-3 py-1">
                        {stats.total} leads
                    </Badge>
                </div>
            </div>

            {/* Active/Inactive Tabs */}
            <Tabs value={selectedStatus} onValueChange={(value) => {
                setSelectedStatus(value as LeadStatus);
                setSelectedLeads(new Set()); // Clear selection when switching tabs
            }}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="active" className="flex items-center gap-2">
                        Active
                        <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700">
                            {statusCounts.active}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="flex items-center gap-2">
                        Inactive
                        <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-600">
                            {statusCounts.inactive}
                        </Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, business..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:flex md:gap-4">
                            <Select value={selectedSource} onValueChange={setSelectedSource}>
                                <SelectTrigger className="w-full md:w-[160px]">
                                    <SelectValue placeholder="Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sources</SelectItem>
                                    {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                <SelectTrigger className="w-full md:w-[140px]">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    {Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {hasActiveFilters && (
                            <Button variant="ghost" onClick={clearFilters} className="shrink-0 w-full md:w-auto">
                                Clear filters
                            </Button>
                        )}
                    </div>

                    {/* Bulk actions */}
                    {selectedLeads.size > 0 && (
                        <div className="mt-4 flex items-center gap-4 p-3 bg-muted rounded-lg">
                            <span className="text-sm font-medium">
                                {selectedLeads.size} selected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBulkStatusUpdate(selectedStatus === 'active' ? 'inactive' : 'active')}
                                disabled={isUpdatingStatus}
                            >
                                {isUpdatingStatus ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {selectedStatus === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                disabled={isDeleting}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Mark as Spam & Delete
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLeads(new Set())}
                            >
                                Clear selection
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {loading && (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="p-6">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Access Denied</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="rounded-md border-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead className="hidden md:table-cell">Source</TableHead>
                                        <TableHead className="hidden lg:table-cell">Score</TableHead>
                                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                                            <TableRow
                                                key={lead.id}
                                                className="cursor-pointer"
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedLeads.has(lead.id)}
                                                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell onClick={() => handleRowClick(lead.id)}>
                                                    <div className="font-medium">{lead.contactName}</div>
                                                    <div className="text-sm text-muted-foreground">{lead.email}</div>
                                                </TableCell>
                                                <TableCell onClick={() => handleRowClick(lead.id)}>
                                                    {lead.businessName}
                                                </TableCell>
                                                <TableCell onClick={() => handleRowClick(lead.id)} className="hidden md:table-cell">
                                                    <span className="text-sm">
                                                        {LEAD_SOURCE_LABELS[lead.source as LeadSource] || lead.source}
                                                    </span>
                                                </TableCell>
                                                <TableCell onClick={() => handleRowClick(lead.id)} className="hidden lg:table-cell">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary rounded-full"
                                                                style={{ width: `${lead.score || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">{lead.score || 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell onClick={() => handleRowClick(lead.id)} className="hidden sm:table-cell">
                                                    {lead.createdAt ? format(
                                                        lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt),
                                                        'MMM d, yyyy'
                                                    ) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRowClick(lead.id);
                                                            }}>
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newStatus = (lead.status || 'active') === 'active' ? 'inactive' : 'active';
                                                                    setSelectedLeads(new Set([lead.id]));
                                                                    handleBulkStatusUpdate(newStatus as LeadStatus);
                                                                }}
                                                            >
                                                                {(lead.status || 'active') === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteConfirmLead(lead);
                                                                }}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Mark as Spam & Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                {hasActiveFilters ? 'No leads match your filters.' : 'No leads found.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Single Lead Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmLead} onOpenChange={(open) => !open && setDeleteConfirmLead(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mark as Spam & Delete</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to mark &quot;{deleteConfirmLead?.businessName}&quot; as spam and permanently delete it? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteConfirmLead && handleDeleteSpamLead(deleteConfirmLead)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete Lead
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mark as Spam & Delete {selectedLeads.size} Leads</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to mark {selectedLeads.size} leads as spam and permanently delete them? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleBulkDeleteSpam}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete {selectedLeads.size} Leads
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
