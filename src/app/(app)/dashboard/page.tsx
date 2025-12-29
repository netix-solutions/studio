'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, collectionGroup } from 'firebase/firestore';
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Play,
  FileEdit,
  Eye,
  Handshake,
  ArrowUpRight,
  BarChart3,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AD_STATUS_LABELS,
  AD_PIPELINE_STAGE_COLORS,
  shouldAutoApprove,
  type AdStatus,
} from '@/lib/types';
import AdNetworkStats from '@/components/dashboard/ad-network-stats';

interface DashboardStats {
  totalAds: number;
  actionRequired: number;
  pendingApproval: number;
  liveAds: number;
  totalCustomers: number;
  newLeads: number;
  newLeadsThisWeek: number;
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

interface RecentLead {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  createdAt: any;
  stage: string;
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
    newLeadsThisWeek: 0,
  });
  const [pendingAds, setPendingAds] = useState<PendingAd[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

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

          // Check for action required (using normalized status names)
          if (ad.status === 'in_review' || ad.status === 'design_pending') {
            actionRequired++;
          }
          if (ad.status === 'customer_approval') {
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
            ad.status === 'in_review' ||
            ad.status === 'design_pending' ||
            (ad.status === 'customer_approval' && ad.shouldAutoApprove)
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

        // Fetch customers
        const customersSnapshot = await getDocs(collection(firestore, 'customers'));
        const totalCustomers = customersSnapshot.size;

        // Fetch leads
        const leadsSnapshot = await getDocs(collection(firestore, 'leads'));
        const sevenDaysAgo = subDays(new Date(), 7);
        let newLeads = 0;
        let newLeadsThisWeek = 0;
        const recentLeadsList: RecentLead[] = [];

        leadsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.stage === 'new') {
            newLeads++;
          }

          const createdAt = data.createdAt?.toDate?.() || null;
          if (createdAt && createdAt >= sevenDaysAgo) {
            newLeadsThisWeek++;
          }

          // Collect recent leads for display
          recentLeadsList.push({
            id: doc.id,
            businessName: data.businessName || data.companyName || 'Unknown Business',
            contactName: data.contactName || data.name || 'Unknown',
            email: data.email || '',
            createdAt: data.createdAt,
            stage: data.stage || 'new',
          });
        });

        // Sort leads by creation date (newest first) and take top 5
        recentLeadsList.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return bTime - aTime;
        });

        setStats({
          totalAds: adsSnapshot.size,
          actionRequired,
          pendingApproval,
          liveAds,
          totalCustomers,
          newLeads,
          newLeadsThisWeek,
        });

        setPendingAds(ads.slice(0, 5)); // Top 5 needing action
        setRecentLeads(recentLeadsList.slice(0, 5)); // Top 5 recent leads
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

  const getLeadStageBadge = (stage: string) => {
    const stageConfig: Record<string, { label: string; className: string }> = {
      new: { label: 'New', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      contacted: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      qualified: { label: 'Qualified', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      converted: { label: 'Converted', className: 'bg-green-100 text-green-700 border-green-200' },
      lost: { label: 'Lost', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    };
    const config = stageConfig[stage] || stageConfig.new;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Operations overview and workflow status
          </p>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.actionRequired}</div>
            <p className="text-xs text-muted-foreground">
              Ads needing attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
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

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Active accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Handshake className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newLeads}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newLeadsThisWeek} this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ads Needing Action - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Ads Requiring Action
                </CardTitle>
                <CardDescription>
                  Review, design, or process these ads
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/pipeline">
                  View Pipeline
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
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
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            colors.bg
                          )}
                        >
                          {ad.status === 'in_review' && (
                            <Eye className={cn('h-5 w-5', colors.text)} />
                          )}
                          {ad.status === 'design_pending' && (
                            <FileEdit className={cn('h-5 w-5', colors.text)} />
                          )}
                          {ad.status === 'customer_approval' && (
                            <Clock className={cn('h-5 w-5', colors.text)} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-primary transition-colors">{ad.businessName}</p>
                          <p className="text-sm text-muted-foreground">
                            {ad.contactName}
                            {ad.createdAt && (
                              <span className="ml-2">
                                · {formatDistanceToNow(ad.createdAt.toDate(), { addSuffix: true })}
                              </span>
                            )}
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
                            Auto-Approve Ready
                          </Badge>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No ads need your attention right now
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar - Leads & Stats */}
        <div className="space-y-6">
          {/* Leads Overview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Handshake className="h-4 w-4 text-blue-500" />
                  Leads
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/leads">
                    View All
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-2xl font-bold text-blue-700">{stats.newLeads}</p>
                  <p className="text-xs text-blue-600">New leads</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-2xl font-bold text-green-700">+{stats.newLeadsThisWeek}</p>
                  <p className="text-xs text-green-600">This week</p>
                </div>
              </div>

              {recentLeads.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent</p>
                  {recentLeads.slice(0, 3).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads?id=${lead.id}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                    >
                      <div className="truncate flex-1">
                        <p className="font-medium truncate">{lead.businessName}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.contactName}</p>
                      </div>
                      {getLeadStageBadge(lead.stage)}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ad Pipeline Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Pipeline Status
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/advertisements">
                    All Ads
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm">In Review</span>
                  </div>
                  <span className="font-medium">{stats.actionRequired}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Awaiting Approval</span>
                  </div>
                  <span className="font-medium">{stats.pendingApproval}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm">Live</span>
                  </div>
                  <span className="font-medium">{stats.liveAds}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Total Ads</span>
                  <span className="font-medium">{stats.totalAds}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ad Network Performance */}
      <AdNetworkStats />
    </div>
  );
}
