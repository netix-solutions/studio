'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DirectoryListingForm } from '@/components/directory/DirectoryListingForm';
import { DirectoryListingPreview } from '@/components/directory/DirectoryListingPreview';
import { goToBillingPortal } from '@/lib/stripe';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Save,
  CreditCard,
  BarChart3,
  Eye,
  Settings,
  Pause,
  Play,
  AlertCircle,
} from 'lucide-react';
import type { DirectoryListing } from '@/lib/types';

export default function MyDirectoryListingPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'analytics'>('edit');

  useEffect(() => {
    if (user) {
      fetchMyListing();
    }
  }, [user]);

  const fetchMyListing = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/directory/my-listing');
      
      if (response.ok) {
        const result = await response.json();
        if (result.listing) {
          setListing(result.listing);
        }
      }
    } catch (error: any) {
      console.error('Error fetching listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your listing',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!listing) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/directory/my-listing/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Your listing has been updated',
        });
        fetchMyListing();
      } else {
        throw new Error('Failed to save changes');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!firestore || !user) return;

    try {
      const returnUrl = window.location.href;
      await goToBillingPortal(firestore, user.uid, user.email, returnUrl);
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

  if (!listing) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Directory Listing</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have an active directory listing yet.{' '}
            <a href="/directory-signup" className="underline">Purchase a listing</a>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">My Directory Listing</h1>
          <p className="text-muted-foreground">Manage your business information</p>
        </div>
        <Button onClick={handleManageSubscription}>
          <CreditCard className="h-4 w-4 mr-2" />
          Manage Subscription
        </Button>
      </div>

      {/* Status Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge className={listing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {listing.status}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Plan</div>
                <Badge>{listing.tier}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Views / Clicks</div>
              <div className="text-lg font-semibold">
                {listing.analytics?.totalViews || 0} / {listing.analytics?.totalClicks || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'edit' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('edit')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          variant={activeTab === 'preview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('preview')}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'edit' && (
        <div className="space-y-6">
          <DirectoryListingForm
            listing={listing}
            onChange={(updated) => setListing({ ...listing, ...updated })}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-center">How your listing appears</h2>
          <DirectoryListingPreview listing={listing} tier={listing.tier as any} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>Track how customers interact with your listing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{listing.analytics?.totalViews || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Times your listing was seen
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{listing.analytics?.totalClicks || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visitors to your website
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {(listing.analytics?.totalViews || 0) > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Click-Through Rate</div>
                <div className="text-2xl font-bold">
                  {((listing.analytics?.totalClicks || 0) / (listing.analytics?.totalViews || 1) * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
