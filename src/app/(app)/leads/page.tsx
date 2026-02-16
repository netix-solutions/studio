'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, Search, Trash2, Mail, BarChart3, ListTodo, Zap, MessageSquare, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { BulkSendEmailDialog, type BulkEmailRecipient } from '@/components/shared/bulk-send-email-dialog';
import { LeadScoreBadge } from '@/components/leads/lead-score-badge';
import { QuickNotePopover } from '@/components/leads/quick-note-popover';
import { SnoozePopover } from '@/components/leads/snooze-popover';
import {
    Lead,
    LeadSource,
    LEAD_STATUSES,
    LEAD_PRIORITY_LABELS,
    LEAD_SOURCE_LABELS,
} from '@/lib/types';

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSource, setSelectedSource] = useState<string>('all');
    const [selectedPriority, setSelectedPriority] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
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
                status: doc.data().status || LEAD_STATUSES.ACTIVE,
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
        let filtered = leads.filter(lead => {
            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesSearch =
                    lead.businessName?.toLowerCase().includes(q) ||
                    lead.contactName?.toLowerCase().includes(q) ||
                    lead.email?.toLowerCase().includes(q) ||
                    lead.phone?.toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }

            if (selectedSource !== 'all' && lead.source !== selectedSource) return false;
            if (selectedPriority !== 'all' && lead.priority !== selectedPriority) return false;

            return true;
        });

        // Sort
        if (sortBy === 'score') {
            filtered.sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0));
        }

        return filtered;
    }, [leads, searchQuery, selectedSource, selectedPriority, sortBy]);

    const handleRowClick = (leadId: string) => router.push(`/leads/${leadId}`);
    const handleSelectAll = (checked: boolean) => {
        setSelectedLeads(checked ? new Set(filteredLeads.map(l => l.id)) : new Set());
    };
    const handleSelectLead = (leadId: string, checked: boolean) => {
        const newSelected = new Set(selectedLeads);
        if (checked) newSelected.add(leadId); else newSelected.delete(leadId);
        setSelectedLeads(newSelected);
    };

    const handleDeleteSpamLead = async (lead: Lead) => {
        if (!firestore) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'leads', lead.id));
            toast({ title: 'Lead Deleted', description: `"${lead.businessName}" deleted.` });
            setDeleteConfirmLead(null);
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete lead.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDeleteSpam = async () => {
        if (!firestore || selectedLeads.size === 0) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            const selectedList = leads.filter(l => selectedLeads.has(l.id));
            for (const lead of selectedList) batch.delete(doc(firestore, 'leads', lead.id));
            await batch.commit();
            setSelectedLeads(new Set());
            setShowBulkDeleteConfirm(false);
            toast({ title: 'Leads Deleted', description: `${selectedList.length} leads deleted.` });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete leads.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const bulkEmailRecipients: BulkEmailRecipient[] = useMemo(() => {
        return leads.filter(l => selectedLeads.has(l.id) && l.email).map(lead => ({
            id: lead.id, email: lead.email,
            contactName: lead.contactName || lead.businessName || 'Unknown',
            businessName: lead.businessName,
        }));
    }, [leads, selectedLeads]);

    const clearFilters = () => { setSearchQuery(''); setSelectedSource('all'); setSelectedPriority('all'); };
    const hasActiveFilters = searchQuery || selectedSource !== 'all' || selectedPriority !== 'all';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground text-sm">Manage and track all potential customers</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/leads/dashboard')}>
                        <BarChart3 className="mr-1 h-4 w-4" /> Analytics
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/leads/tasks')}>
                        <ListTodo className="mr-1 h-4 w-4" /> Tasks
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/leads/sequences')}>
                        <Zap className="mr-1 h-4 w-4" /> Sequences
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search by name, email, business..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:flex md:gap-4">
                            <Select value={selectedSource} onValueChange={setSelectedSource}>
                                <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sources</SelectItem>
                                    {Object.entries(LEAD_SOURCE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    {Object.entries(LEAD_PRIORITY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'score')}>
                                <SelectTrigger className="w-full md:w-[130px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date">Sort: Date</SelectItem>
                                    <SelectItem value="score">Sort: Score</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {hasActiveFilters && (
                            <Button variant="ghost" onClick={clearFilters} className="shrink-0">Clear filters</Button>
                        )}
                    </div>

                    {/* Bulk actions */}
                    {selectedLeads.size > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-3 p-3 bg-muted rounded-lg">
                            <span className="text-sm font-medium">{selectedLeads.size} selected</span>
                            <Button variant="outline" size="sm" onClick={() => setShowBulkEmailDialog(true)} disabled={bulkEmailRecipients.length === 0}>
                                <Mail className="mr-1 h-4 w-4" /> Email
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowBulkDeleteConfirm(true)} disabled={isDeleting}>
                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLeads(new Set())}>Clear</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {loading && <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                    {!loading && error && (
                        <div className="p-6">
                            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Access Denied</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                        </div>
                    )}
                    {!loading && !error && (
                        <div className="rounded-md border-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0} onCheckedChange={handleSelectAll} />
                                        </TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead className="hidden xl:table-cell w-16 text-center">Score</TableHead>
                                        <TableHead className="hidden md:table-cell">Source</TableHead>
                                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                                        <TableRow key={lead.id} className="cursor-pointer">
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox checked={selectedLeads.has(lead.id)} onCheckedChange={(c) => handleSelectLead(lead.id, !!c)} />
                                            </TableCell>
                                            <TableCell onClick={() => handleRowClick(lead.id)}>
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="font-medium">{lead.contactName}</div>
                                                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell onClick={() => handleRowClick(lead.id)}>{lead.businessName}</TableCell>
                                            <TableCell onClick={() => handleRowClick(lead.id)} className="hidden xl:table-cell text-center">
                                                <LeadScoreBadge score={lead.leadScore} />
                                            </TableCell>
                                            <TableCell onClick={() => handleRowClick(lead.id)} className="hidden md:table-cell">
                                                <span className="text-sm">{LEAD_SOURCE_LABELS[lead.source as LeadSource] || lead.source}</span>
                                            </TableCell>
                                            <TableCell onClick={() => handleRowClick(lead.id)} className="hidden sm:table-cell">
                                                {lead.createdAt ? format(lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt), 'MMM d, yyyy') : 'N/A'}
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
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(lead.id); }}>View Details</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {/* Quick Note */}
                                                        <QuickNotePopover
                                                            leadId={lead.id}
                                                            userId={user?.uid || ''}
                                                            userName={user?.displayName || user?.email || 'Unknown'}
                                                            trigger={
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
                                                                    <MessageSquare className="mr-2 h-4 w-4" /> Quick Note
                                                                </DropdownMenuItem>
                                                            }
                                                        />
                                                        {/* Snooze */}
                                                        <SnoozePopover
                                                            leadId={lead.id}
                                                            userId={user?.uid || ''}
                                                            userName={user?.displayName || user?.email || 'Unknown'}
                                                            trigger={
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
                                                                    <Clock className="mr-2 h-4 w-4" /> Snooze
                                                                </DropdownMenuItem>
                                                            }
                                                        />
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmLead(lead); }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteConfirmLead} onOpenChange={(open) => !open && setDeleteConfirmLead(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteConfirmLead?.businessName}&quot;? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteConfirmLead && handleDeleteSpamLead(deleteConfirmLead)} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedLeads.size} Leads</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleBulkDeleteSpam} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete {selectedLeads.size} Leads
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <BulkSendEmailDialog
                recipients={bulkEmailRecipients}
                isOpen={showBulkEmailDialog}
                onOpenChange={setShowBulkEmailDialog}
                recipientType="lead"
                onComplete={() => setSelectedLeads(new Set())}
            />
        </div>
    );
}
