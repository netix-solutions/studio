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
    const colors = DIRECTORY_TIER_COLORS[listing.tier];
    const label = DIRECTORY_TIER_LABELS[listing.tier];
    
    return (
      <Badge className={`${colors.bg} ${colors.text}`}>
        {listing.tier === 'featured' && <Star className="h-3 w-3 mr-1" />}
        {listing.tier === 'premium' && <Crown className="h-3 w-3 mr-1" />}
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700' },
      paused: { bg: 'bg-amber-100', text: 'text-amber-700' },
      expired: { bg: 'bg-red-100', text: 'text-red-700' },
    };

    const variant = variants[status] || variants.expired;
    
    return (
      <Badge className={`${variant.bg} ${variant.text}`}>
        {status}
      </Badge>
    );
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
          <h1 className="text-2xl font-bold">Directory Listings</h1>
          <p className="text-muted-foreground">
            Manage all business directory listings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/directory-embed">
              <ExternalLink className="h-4 w-4 mr-2" />
              Embed Codes
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/directory-signup">
              <Plus className="h-4 w-4 mr-2" />
              Add Listing
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listings.length}</div>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {listings.filter(l => l.isFeatured).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Legacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">
              {listings.filter(l => l.tier === 'legacy').length}
            </div>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
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
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
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
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(listing.id, listing.status)}
                          >
                            {listing.status === 'active' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
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
