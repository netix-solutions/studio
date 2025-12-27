'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, where, collectionGroup, orderBy, limit } from 'firebase/firestore';
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Megaphone,
  Play,
  FileEdit,
  Eye,
  Handshake,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AD_STATUS_LABELS,
  AD_PIPELINE_STAGE_COLORS,
  shouldAutoApprove,
  type Advertisement,
  type AdStatus,
} from '@/lib/types';

interface DashboardStats {
  totalAds: number;
  actionRequired: number;
  pendingApproval: number;
  liveAds: number;
  totalCustomers: number;
  newLeads: number;
  mrr: number;
}

interface PendingAd {
  id: string;
  userId: string;
  businessName: string;
  contactName: string;
  email: string;
  status: AdStatus;
  createdAt: any;
  sentForApprovalAt?: any;
  shouldAutoApprove?: boolean;
}

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAds: 0,
    actionRequired: 0,
    pendingApproval: 0,
    liveAds: 0,
    totalCustomers: 0,
    newLeads: 0,
    mrr: 0,
  });
  const [pendingAds, setPendingAds] = useState<PendingAd[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!firestore) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch all ads using collection group query
        const adsQuery = query(collectionGroup(firestore, 'advertisements'));
        const adsSnapshot = await getDocs(adsQuery);

        const ads: PendingAd[] = [];
        let actionRequired = 0;
        let pendingApproval = 0;
        let liveAds = 0;

        adsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const ad: PendingAd = {
            id: doc.id,
            userId: data.userId,
            businessName: data.businessName || 'Unknown Business',
            contactName: data.contactName || 'Unknown',
            email: data.email || '',
            status: data.status || 'pending_info',
            createdAt: data.createdAt,
            sentForApprovalAt: data.sentForApprovalAt,
          };

          // Check for action required
          if (ad.status === 'pending_internal_review' || ad.status === 'pending_ad_creation') {
            actionRequired++;
          }
          if (ad.status === 'pending_customer_approval') {
            pendingApproval++;
            if (ad.sentForApprovalAt && shouldAutoApprove(ad.sentForApprovalAt)) {
              ad.shouldAutoApprove = true;
              actionRequired++; // Ready for auto-approve is also action required
            }
          }
          if (ad.status === 'live') {
            liveAds++;
          }

          // Collect ads needing action
          if (
            ad.status === 'pending_internal_review' ||
            ad.status === 'pending_ad_creation' ||
            ad.status === 'revision_requested' ||
            (ad.status === 'pending_customer_approval' && ad.shouldAutoApprove)
          ) {
            ads.push(ad);
          }
        });

        // Sort pending ads by creation date
        ads.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return aTime - bTime; // Oldest first (needs attention sooner)
        });

        // Fetch customers count
        const customersSnapshot = await getDocs(collection(firestore, 'customers'));
        const totalCustomers = customersSnapshot.size;

        // Fetch MRR from subscriptions
        let mrr = 0;
        for (const customerDoc of customersSnapshot.docs) {
          const subsSnapshot = await getDocs(
            query(
              collection(firestore, 'customers', customerDoc.id, 'subscriptions'),
              where('status', 'in', ['active', 'trialing'])
            )
          );
          subsSnapshot.docs.forEach(subDoc => {
            const subData = subDoc.data();
            const amount = subData.items?.[0]?.price?.unit_amount || 0;
            const interval = subData.items?.[0]?.price?.recurring?.interval;
            if (interval === 'year') {
              mrr += amount / 12 / 100;
            } else {
              mrr += amount / 100;
            }
          });
        }

        // Fetch new leads
        const leadsQuery = query(
          collection(firestore, 'leads'),
          where('stage', '==', 'new'),
        );
        const leadsSnapshot = await getDocs(leadsQuery);
        const newLeads = leadsSnapshot.size;

        setStats({
          totalAds: adsSnapshot.size,
          actionRequired,
          pendingApproval,
          liveAds,
          totalCustomers,
          newLeads,
          mrr,
        });

        setPendingAds(ads.slice(0, 5)); // Top 5 needing action
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [firestore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back. Here's what needs your attention today.
          </p>
        </div>
        <Button asChild>
          <Link href="/pipeline">
            View Pipeline
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.actionRequired}</div>
            <p className="text-xs text-muted-foreground">
              Ads needing your attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Ads</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.liveAds}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Active accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.mrr.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Monthly recurring revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Ads Needing Action */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Needs Your Action
                </CardTitle>
                <CardDescription>
                  Ads waiting for review or processing
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/advertisements">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingAds.length > 0 ? (
              <div className="space-y-3">
                {pendingAds.map((ad) => {
                  const colors = AD_PIPELINE_STAGE_COLORS[ad.status];
                  return (
                    <Link
                      key={ad.id}
                      href={`/advertisements/${ad.id}?userId=${ad.userId}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            colors.bg
                          )}
                        >
                          {ad.status === 'pending_internal_review' && (
                            <Eye className={cn('h-5 w-5', colors.text)} />
                          )}
                          {ad.status === 'pending_ad_creation' && (
                            <FileEdit className={cn('h-5 w-5', colors.text)} />
                          )}
                          {ad.status === 'revision_requested' && (
                            <AlertCircle className={cn('h-5 w-5', colors.text)} />
                          )}
                          {ad.status === 'pending_customer_approval' && (
                            <Clock className={cn('h-5 w-5', colors.text)} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{ad.businessName}</p>
                          <p className="text-sm text-muted-foreground">
                            {ad.contactName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(colors.bg, colors.text, 'border', colors.border)}
                        >
                          {AD_STATUS_LABELS[ad.status]}
                        </Badge>
                        {ad.shouldAutoApprove && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Ready for Auto-Approve
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No ads need your attention right now
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              asChild
            >
              <Link href="/pipeline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Ad Pipeline</p>
                    <p className="text-xs text-muted-foreground">
                      Manage ad workflow stages
                    </p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              asChild
            >
              <Link href="/leads">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Handshake className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">Leads</p>
                    <p className="text-xs text-muted-foreground">
                      Track potential customers
                    </p>
                  </div>
                  {stats.newLeads > 0 && (
                    <Badge variant="secondary">{stats.newLeads} new</Badge>
                  )}
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              asChild
            >
              <Link href="/subscriptions">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Customers</p>
                    <p className="text-xs text-muted-foreground">
                      View customer subscriptions
                    </p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              asChild
            >
              <Link href="/automated-emails">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Email Templates</p>
                    <p className="text-xs text-muted-foreground">
                      Manage automated emails
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ad Status Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ad Status Overview</CardTitle>
              <CardDescription>
                Quick view of all advertisement statuses
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pipeline">Open Pipeline</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-600">Pending Info</p>
              <p className="text-2xl font-bold text-slate-700">
                {stats.totalAds - stats.actionRequired - stats.pendingApproval - stats.liveAds}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-600">In Review</p>
              <p className="text-2xl font-bold text-amber-700">{stats.actionRequired}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-600">Awaiting Approval</p>
              <p className="text-2xl font-bold text-blue-700">{stats.pendingApproval}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm font-medium text-green-600">Live</p>
              <p className="text-2xl font-bold text-green-700">{stats.liveAds}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
