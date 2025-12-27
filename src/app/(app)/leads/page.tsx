'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, Search, Filter, ChevronDown, Mail, Trash2, Users, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import {
    Lead,
    LeadStage,
    LeadSource,
    LeadPriority,
    LEAD_STAGES,
    LEAD_STAGE_LABELS,
    LEAD_STAGE_COLORS,
    LEAD_STAGE_ORDER,
    LEAD_PRIORITY_LABELS,
    LEAD_PRIORITY_COLORS,
    LEAD_SOURCE_LABELS,
    ACTIVITY_TYPES,
} from '@/lib/types';

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStage, setSelectedStage] = useState<string>('all');
    const [selectedSource, setSelectedSource] = useState<string>('all');
    const [selectedPriority, setSelectedPriority] = useState<string>('all');
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
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
                stage: doc.data().stage || LEAD_STAGES.NEW,
                priority: doc.data().priority || 'medium',
                source: doc.data().source || 'website',
                score: doc.data().score || 0,
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

            // Stage filter
            if (selectedStage !== 'all' && lead.stage !== selectedStage) {
                return false;
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
    }, [leads, searchQuery, selectedStage, selectedSource, selectedPriority]);

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

    const handleBulkStageUpdate = async (newStage: LeadStage) => {
        if (!firestore || !user || selectedLeads.size === 0) return;

        setIsBulkUpdating(true);
        try {
            const batch = writeBatch(firestore);
            const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id));

            for (const lead of selectedLeadsList) {
                const leadRef = doc(firestore, 'leads', lead.id);
                batch.update(leadRef, {
                    stage: newStage,
                    updatedAt: serverTimestamp(),
                });
            }

            await batch.commit();

            // Log activities
            for (const lead of selectedLeadsList) {
                if (lead.stage !== newStage) {
                    await addDoc(collection(firestore, 'leads', lead.id, 'activities'), {
                        leadId: lead.id,
                        type: ACTIVITY_TYPES.STAGE_CHANGE,
                        title: `Stage changed from ${LEAD_STAGE_LABELS[lead.stage as LeadStage]} to ${LEAD_STAGE_LABELS[newStage]}`,
                        metadata: { fromStage: lead.stage, toStage: newStage },
                        createdBy: user.uid,
                        createdByName: user.displayName || user.email || 'Unknown',
                        createdAt: serverTimestamp(),
                    });
                }
            }

            setSelectedLeads(new Set());
            toast({
                title: 'Leads Updated',
                description: `${selectedLeadsList.length} leads moved to ${LEAD_STAGE_LABELS[newStage]}`,
            });
        } catch (err) {
            console.error("Error updating leads:", err);
            toast({
                title: 'Error',
                description: 'Failed to update leads',
                variant: 'destructive',
            });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    // Calculate stats
    const stats = useMemo(() => {
        const total = filteredLeads.length;
        const byStage: Record<string, number> = {};
        for (const lead of filteredLeads) {
            const stage = lead.stage || 'new';
            byStage[stage] = (byStage[stage] || 0) + 1;
        }
        return { total, byStage };
    }, [filteredLeads]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedStage('all');
        setSelectedSource('all');
        setSelectedPriority('all');
    };

    const hasActiveFilters = searchQuery || selectedStage !== 'all' || selectedSource !== 'all' || selectedPriority !== 'all';

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
                    {stats.byStage['new'] > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">
                            {stats.byStage['new']} new
                        </Badge>
                    )}
                </div>
            </div>

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

                        <div className="grid grid-cols-3 gap-2 md:flex md:gap-4">
                            <Select value={selectedStage} onValueChange={setSelectedStage}>
                                <SelectTrigger className="w-full md:w-[160px]">
                                    <SelectValue placeholder="Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    {LEAD_STAGE_ORDER.map((stage) => (
                                        <SelectItem key={stage} value={stage}>
                                            {LEAD_STAGE_LABELS[stage]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

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
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={isBulkUpdating}>
                                        {isBulkUpdating ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <TrendingUp className="mr-2 h-4 w-4" />
                                        )}
                                        Move to Stage
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {LEAD_STAGE_ORDER.map((stage) => (
                                        <DropdownMenuItem
                                            key={stage}
                                            onClick={() => handleBulkStageUpdate(stage)}
                                        >
                                            {LEAD_STAGE_LABELS[stage]}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                                        <TableHead>Stage</TableHead>
                                        <TableHead className="hidden md:table-cell">Source</TableHead>
                                        <TableHead className="hidden lg:table-cell">Score</TableHead>
                                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.length > 0 ? filteredLeads.map((lead) => {
                                        const stageColors = LEAD_STAGE_COLORS[lead.stage as LeadStage] || LEAD_STAGE_COLORS.new;
                                        const priorityColors = LEAD_PRIORITY_COLORS[lead.priority as LeadPriority] || LEAD_PRIORITY_COLORS.medium;

                                        return (
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
                                                <TableCell onClick={() => handleRowClick(lead.id)}>
                                                    <Badge className={cn(stageColors.bg, stageColors.text, "border", stageColors.border)}>
                                                        {LEAD_STAGE_LABELS[lead.stage as LeadStage] || lead.stage}
                                                    </Badge>
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
                                                            <DropdownMenuLabel>Move to Stage</DropdownMenuLabel>
                                                            {LEAD_STAGE_ORDER.filter(s => s !== lead.stage).slice(0, 4).map((stage) => (
                                                                <DropdownMenuItem
                                                                    key={stage}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleBulkStageUpdate(stage);
                                                                    }}
                                                                >
                                                                    {LEAD_STAGE_LABELS[stage]}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24">
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
        </div>
    );
}
