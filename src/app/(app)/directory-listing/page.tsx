'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getAuth } from 'firebase/auth';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Info,
  Sparkles,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

// Directory Components
import { DirectoryCardPreview } from '@/components/directory/DirectoryCardPreview';
import { DirectoryListingForm } from '@/components/directory/DirectoryListingForm';

// Types
import {
  type LiveAdDirectoryListing,
  type DirectoryStatus,
  DIRECTORY_STATUS_LABELS,
  DIRECTORY_STATUS_COLORS,
} from '@/lib/types';

interface DirectoryListingData {
  liveAdId: string | null;
  liveAd: {
    id: string;
    name: string;
    imageUrl: string;
    targetUrl: string;
    status: string;
    showInDirectory: boolean;
    impressions: number;
    clicks: number;
  } | null;
  directoryListing: LiveAdDirectoryListing;
  hasExistingListing: boolean;
  advertisementStatus?: string;
  message?: string;
  allLiveAds?: Array<{
    id: string;
    name: string;
    status: string;
    showInDirectory: boolean;
    hasDirectoryListing: boolean;
  }>;
}

export default function DirectoryListingPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<DirectoryListingData | null>(null);
  const [listing, setListing] = useState<Partial<LiveAdDirectoryListing>>({});
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch directory listing data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/directory/listing', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch directory listing');
      }

      const result = await response.json();
      setData(result.data);
      setListing(result.data.directoryListing || {});
      setShowInDirectory(result.data.liveAd?.showInDirectory ?? true);
    } catch (err: any) {
      console.error('Error fetching directory listing:', err);
      setError(err.message || 'Failed to load directory listing');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchData();
    } else if (!isUserLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isUserLoading, fetchData, router]);

  // Save directory listing
  const handleSave = async () => {
    if (!user || !data?.liveAdId) {
      toast({
        title: 'Cannot Save',
        description: 'Your ad needs to be live before you can save your directory listing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/directory/listing', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          liveAdId: data.liveAdId,
          directoryListing: listing,
          showInDirectory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save directory listing');
      }

      const result = await response.json();

      toast({
        title: 'Saved Successfully',
        description: result.data.message,
      });

      // Refresh data
      fetchData();
    } catch (err: any) {
      console.error('Error saving directory listing:', err);
      toast({
        title: 'Error Saving',
        description: err.message || 'Failed to save directory listing',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading || isUserLoading) {
    return (
      <div className="container max-w-7xl py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  // No live ad state
  if (!data?.liveAdId) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/account">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Directory Listing</h1>
            <p className="text-muted-foreground">
              Customize how your business appears in the sponsor directory
            </p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Ad Not Live Yet</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Your directory listing will be available once your advertisement goes live.
              {data?.advertisementStatus && (
                <span className="block mt-1">
                  Current ad status: <Badge variant="outline">{data.advertisementStatus}</Badge>
                </span>
              )}
            </p>
            <p className="text-sm">
              {data?.message || 'Complete your advertisement workflow to get started.'}
            </p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              This is a preview of how your card will appear in the directory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm mx-auto">
              <DirectoryCardPreview
                listing={listing}
                adImageUrl={undefined}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Link href="/account">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const directoryStatus = listing.directoryStatus || 'pending';

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/account">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Directory Listing</h1>
            <p className="text-muted-foreground">
              Customize how your business appears in the sponsor directory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Directory Status */}
          <Badge
            variant="outline"
            className={`${DIRECTORY_STATUS_COLORS[directoryStatus as DirectoryStatus]?.bg} ${DIRECTORY_STATUS_COLORS[directoryStatus as DirectoryStatus]?.text}`}
          >
            {directoryStatus === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
            {directoryStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {directoryStatus === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
            {DIRECTORY_STATUS_LABELS[directoryStatus as DirectoryStatus] || 'Pending'}
          </Badge>

          {/* Visibility Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInDirectory(!showInDirectory)}
          >
            {showInDirectory ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Visible
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hidden
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Alerts */}
      {directoryStatus === 'pending' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Pending Review</AlertTitle>
          <AlertDescription>
            Your directory listing is pending review. It will appear in the directory once approved by our team.
          </AlertDescription>
        </Alert>
      )}

      {directoryStatus === 'rejected' && listing.directoryRejectionReason && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Listing Rejected</AlertTitle>
          <AlertDescription>
            Your listing was not approved. Reason: {listing.directoryRejectionReason}
            <br />
            Please update your listing and submit again.
          </AlertDescription>
        </Alert>
      )}

      {directoryStatus === 'approved' && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">Listing Approved</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Your directory listing is live and visible to visitors.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-3">
          <DirectoryListingForm
            listing={listing}
            onChange={setListing}
            onSave={handleSave}
            isSaving={saving}
          />
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                This is how your card will appear in the directory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="light" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="light">Light</TabsTrigger>
                  <TabsTrigger value="dark">Dark</TabsTrigger>
                </TabsList>
                <TabsContent value="light">
                  <DirectoryCardPreview
                    listing={listing}
                    adImageUrl={data?.liveAd?.imageUrl}
                    theme="light"
                  />
                </TabsContent>
                <TabsContent value="dark">
                  <div className="bg-slate-900 p-4 rounded-lg">
                    <DirectoryCardPreview
                      listing={listing}
                      adImageUrl={data?.liveAd?.imageUrl}
                      theme="dark"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <div className="w-full text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Ad Impressions:</span>
                  <span className="font-medium">{data?.liveAd?.impressions?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ad Clicks:</span>
                  <span className="font-medium">{data?.liveAd?.clicks?.toLocaleString() || 0}</span>
                </div>
              </div>
              {!showInDirectory && (
                <Alert variant="destructive" className="w-full">
                  <EyeOff className="h-4 w-4" />
                  <AlertDescription>
                    Your listing is currently hidden from the directory
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
