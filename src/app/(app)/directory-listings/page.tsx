'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Search,
  Plus,
  Edit,
  Pause,
  Play,
  ExternalLink,
  Star,
  Crown,
  Filter,
  Download,
  Gift,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  type DirectoryListing,
  DIRECTORY_TIER_LABELS,
  DIRECTORY_TIER_COLORS,
} from '@/lib/types';
import Link from 'next/link';

export default function DirectoryListingsPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<DirectoryListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  useEffect(() => {
    fetchListings();
  }, [user]);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, statusFilter, tierFilter]);

  const fetchListings = async () => {
    if (!user) return;

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/admin/directory-listings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setListings(result.listings || []);
      } else {
        throw new Error('Failed to fetch listings');
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch directory listings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.businessName?.toLowerCase().includes(search) ||
        l.contactEmail?.toLowerCase().includes(search) ||
        l.phone?.includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(l => l.tier === tierFilter);
    }

    setFilteredListings(filtered);
  };

  const toggleStatus = async (listingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(`/api/admin/directory-listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Listing ${newStatus === 'active' ? 'activated' : 'paused'}`,
        });
        fetchListings();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTierBadge = (listing: DirectoryListing) => {
    const colors = DIRECTORY_TIER_COLORS[listing.tier] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    const label = DIRECTORY_TIER_LABELS[listing.tier] || listing.tier;
    
    return (
      <Badge className={`${colors.bg} ${colors.text}`}>
        {listing.tier === 'free' && <Gift className="h-3 w-3 mr-1" />}
        {listing.tier === 'included' && <Star className="h-3 w-3 mr-1" />}
        {listing.tier === 'premium' && <Crown className="h-3 w-3 mr-1" />}
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
      active: { bg: 'bg-green-100', text: 'text-green-700' },
      paused: { bg: 'bg-slate-100', text: 'text-slate-700' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700' },
      expired: { bg: 'bg-red-100', text: 'text-red-700' },
    };

    const variant = variants[status] || variants.expired;
    
    return (
      <Badge className={`${variant.bg} ${variant.text}`}>
        {status === 'pending' ? '⏳ Pending' : status}
      </Badge>
    );
  };

  const approveListing = async (listingId: string) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(`/api/admin/directory-listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (response.ok) {
        toast({
          title: 'Approved!',
          description: 'Listing is now live in the directory',
        });
        fetchListings();
      } else {
        throw new Error('Failed to approve');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const rejectListing = async (listingId: string) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(`/api/admin/directory-listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (response.ok) {
        toast({
          title: 'Rejected',
          description: 'Listing has been rejected',
        });
        fetchListings();
      } else {
        throw new Error('Failed to reject');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Business Directory Listings</h1>
          <p className="text-muted-foreground">
            Manage all directory listings (free signups + ad subscribers)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/leads?source=directory_signup">
              <Gift className="h-4 w-4 mr-2" />
              View Leads
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/embed-codes">
              <ExternalLink className="h-4 w-4 mr-2" />
              Embed Codes
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Approval Alert */}
      {listings.filter(l => l.status === 'pending').length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    {listings.filter(l => l.status === 'pending').length} listing(s) pending approval
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Review and approve new submissions
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-amber-300"
                onClick={() => setStatusFilter('pending')}
              >
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All listings</p>
          </CardContent>
        </Card>
        <Card className={listings.filter(l => l.status === 'pending').length > 0 ? 'border-amber-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {listings.filter(l => l.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Needs review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {listings.filter(l => l.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Live now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Free</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {listings.filter(l => l.tier === 'free').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {listings.filter(l => l.tier === 'included').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">With ads</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Business name, email, phone..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">⏳ Pending Approval</SelectItem>
                  <SelectItem value="active">✓ Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="rejected">✗ Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free Listing</SelectItem>
                  <SelectItem value="included">Included with Ad</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTierFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Listings ({filteredListings.length})</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Analytics</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No listings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {listing.logoUrl && (
                            <img
                              src={listing.logoUrl}
                              alt={listing.businessName}
                              className="w-10 h-10 rounded object-contain border"
                            />
                          )}
                          <div>
                            <div className="font-medium">{listing.businessName}</div>
                            <div className="text-xs text-muted-foreground">{listing.category}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTierBadge(listing)}</TableCell>
                      <TableCell>{getStatusBadge(listing.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{listing.contactEmail}</div>
                          <div className="text-muted-foreground">{listing.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>👁️ {listing.analytics?.totalViews || 0} views</div>
                          <div>🖱️ {listing.analytics?.totalClicks || 0} clicks</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {listing.status === 'pending' ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => approveListing(listing.id)}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => rejectListing(listing.id)}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatus(listing.id, listing.status)}
                              title={listing.status === 'active' ? 'Pause' : 'Activate'}
                            >
                              {listing.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            title="Edit"
                          >
                            <Link href={`/directory-listings/${listing.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
