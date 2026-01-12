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
  type LiveAd,
  type LiveAdDirectoryListing,
  type DirectoryStatus,
} from '@/lib/types';
import Link from 'next/link';

interface DirectoryListingItem {
  liveAdId: string;
  liveAd: Partial<LiveAd>;
  directoryListing: LiveAdDirectoryListing | null;
}

interface DirectoryStats {
  total: number;
  pending: number;
  approved: number;
  hidden: number;
  rejected: number;
  featured: number;
}

export default function DirectoryListingsPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const [listings, setListings] = useState<DirectoryListingItem[]>([]);
  const [filteredListings, setFilteredListings] = useState<DirectoryListingItem[]>([]);
  const [stats, setStats] = useState<DirectoryStats>({
    total: 0,
    pending: 0,
    approved: 0,
    hidden: 0,
    rejected: 0,
    featured: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user, statusFilter]);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, statusFilter]);

  const fetchListings = async () => {
    if (!user) {
      console.log('No user, skipping fetch');
      return;
    }

    try {
      setIsLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching token...');
      const token = await currentUser.getIdToken();
      console.log('Token obtained, length:', token.length);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      // Search is handled client-side for immediate feedback
      // Server-side search is available via the API if needed for large datasets

      const url = `/api/admin/directory?${params.toString()}`;
      console.log('Fetching from:', url);

      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `Failed to fetch listings: ${response.status} ${response.statusText}`;
        let errorData = null;
        try {
          const text = await response.text();
          console.log('Error response text:', text);
          if (text) {
            errorData = JSON.parse(text);
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          // Response is not JSON, use status text
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        const text = await response.text();
        console.log('Response text:', text.substring(0, 500)); // Log first 500 chars
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        throw new Error('Invalid response from server - not valid JSON');
      }
      
      console.log('API Response parsed successfully:', {
        hasSuccess: 'success' in result,
        hasData: 'data' in result,
        hasError: 'error' in result,
        keys: Object.keys(result),
      });
      
      // Handle both response formats: { success: true, data: {...} } and { data: {...} }
      if (result.error) {
        throw new Error(result.error);
      }

      const listings = result.data?.listings || result.listings || [];
      const stats = result.data?.stats || result.stats || {
        total: 0,
        pending: 0,
        approved: 0,
        hidden: 0,
        rejected: 0,
        featured: 0,
      };

      console.log('Setting listings:', listings.length, 'stats:', stats);
      setListings(listings);
      setStats(stats);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      const errorMessage = error.message || 'Failed to fetch directory listings';
      console.error('Full error details:', {
        message: errorMessage,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
      });
      toast({
        title: 'Error',
        description: errorMessage,
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
      filtered = filtered.filter(item => {
        const listing = item.directoryListing;
        const businessName = listing?.businessName || item.liveAd.customerName || '';
        const email = listing?.email || '';
        const phone = listing?.phone || '';
        return (
          businessName.toLowerCase().includes(search) ||
          email.toLowerCase().includes(search) ||
          phone.includes(search)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = item.directoryListing?.directoryStatus || 'pending';
        return status === statusFilter;
      });
    }

    setFilteredListings(filtered);
  };

  const toggleStatus = async (liveAdId: string, currentStatus: DirectoryStatus) => {
    const action = currentStatus === 'approved' ? 'hide' : 'approve';

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/admin/directory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ liveAdId, action }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: result.data?.message || `Listing ${action === 'approve' ? 'approved' : 'hidden'}`,
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

  const getStatusBadge = (status: DirectoryStatus | undefined) => {
    const actualStatus = status || 'pending';
    const variants: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
      approved: { bg: 'bg-green-100', text: 'text-green-700' },
      hidden: { bg: 'bg-slate-100', text: 'text-slate-700' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700' },
    };

    const variant = variants[actualStatus] || variants.pending;
    
    return (
      <Badge className={`${variant.bg} ${variant.text}`}>
        {actualStatus === 'pending' ? '⏳ Pending' : actualStatus}
      </Badge>
    );
  };

  const approveListing = async (liveAdId: string) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/admin/directory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ liveAdId, action: 'approve' }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Approved!',
          description: result.data?.message || 'Listing is now live in the directory',
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

  const rejectListing = async (liveAdId: string) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/admin/directory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ liveAdId, action: 'reject', rejectionReason: 'Rejected by admin' }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Rejected',
          description: result.data?.message || 'Listing has been rejected',
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
      {stats.pending > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    {stats.pending} listing(s) pending approval
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
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All listings</p>
          </CardContent>
        </Card>
        <Card className={stats.pending > 0 ? 'border-amber-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Needs review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Live now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">
              {stats.hidden}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Hidden</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.featured}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Featured</p>
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
          <div className="grid gap-4 md:grid-cols-3">
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
                  <SelectItem value="approved">✓ Approved</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="rejected">✗ Rejected</SelectItem>
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
                  fetchListings();
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
                  filteredListings.map((item) => {
                    const listing = item.directoryListing;
                    const businessName = listing?.businessName || item.liveAd.customerName || 'Unknown Business';
                    const status = listing?.directoryStatus || 'pending';
                    const logoUrl = listing?.logoUrl || item.liveAd.imageUrl;
                    const category = listing?.category || 'other';
                    const email = listing?.email || '';
                    const phone = listing?.phone || '';
                    const viewCount = listing?.viewCount || 0;
                    const clickCount = listing?.clickCount || 0;

                    return (
                      <TableRow key={item.liveAdId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {logoUrl && (
                              <img
                                src={logoUrl}
                                alt={businessName}
                                className="w-10 h-10 rounded object-contain border"
                              />
                            )}
                            <div>
                              <div className="font-medium">{businessName}</div>
                              <div className="text-xs text-muted-foreground">{category}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.liveAd.showInDirectory ? 'In Directory' : 'Not Listed'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{email || 'N/A'}</div>
                            <div className="text-muted-foreground">{phone || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>👁️ {viewCount} views</div>
                            <div>🖱️ {clickCount} clicks</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {status === 'pending' ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => approveListing(item.liveAdId)}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => rejectListing(item.liveAdId)}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStatus(item.liveAdId, status)}
                                title={status === 'approved' ? 'Hide' : 'Approve'}
                              >
                                {status === 'approved' ? (
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
                              title="View Details"
                            >
                              <Link href={`/directory?liveAdId=${item.liveAdId}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
