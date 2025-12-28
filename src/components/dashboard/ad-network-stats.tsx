'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Activity,
  Loader2,
  ArrowRight,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import {
  type LiveAd,
  calculateCTR,
  COMMUNITY_WEBSITE_CONFIG,
  type CommunityWebsiteId,
} from '@/lib/types';

interface AdNetworkData {
  totalImpressions: number;
  totalClicks: number;
  activeAds: number;
  pausedAds: number;
  ctr: number;
  byWebsite: {
    websiteId: CommunityWebsiteId | 'all';
    websiteName: string;
    impressions: number;
    clicks: number;
    activeAds: number;
  }[];
  topAds: {
    id: string;
    name: string;
    impressions: number;
    clicks: number;
    ctr: number;
    customerName?: string;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    color: string;
  }[];
}

const chartConfig = {
  impressions: {
    label: 'Impressions',
    color: 'hsl(var(--chart-1))',
  },
  clicks: {
    label: 'Clicks',
    color: 'hsl(var(--chart-2))',
  },
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  paused: '#eab308',
  scheduled: '#3b82f6',
  expired: '#94a3b8',
  archived: '#ef4444',
};

export default function AdNetworkStats() {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdNetworkData>({
    totalImpressions: 0,
    totalClicks: 0,
    activeAds: 0,
    pausedAds: 0,
    ctr: 0,
    byWebsite: [],
    topAds: [],
    statusDistribution: [],
  });

  useEffect(() => {
    if (!firestore) return;

    const fetchAdNetworkData = async () => {
      try {
        // Fetch all live ads
        const liveAdsSnapshot = await getDocs(collection(firestore, 'live_ads'));

        let totalImpressions = 0;
        let totalClicks = 0;
        let activeAds = 0;
        let pausedAds = 0;
        const statusCounts: Record<string, number> = {};

        // Website breakdown
        const websiteStats: Record<string, { impressions: number; clicks: number; activeAds: number }> = {
          'wesley-chapel': { impressions: 0, clicks: 0, activeAds: 0 },
          'pasco-county': { impressions: 0, clicks: 0, activeAds: 0 },
          'all': { impressions: 0, clicks: 0, activeAds: 0 }, // For ads targeting all websites
        };

        // Top ads tracking
        const allAds: {
          id: string;
          name: string;
          impressions: number;
          clicks: number;
          ctr: number;
          customerName?: string;
        }[] = [];

        liveAdsSnapshot.docs.forEach((doc) => {
          const ad = { id: doc.id, ...doc.data() } as LiveAd;

          // Aggregate totals
          totalImpressions += ad.impressions || 0;
          totalClicks += ad.clicks || 0;

          // Count by status
          statusCounts[ad.status] = (statusCounts[ad.status] || 0) + 1;

          if (ad.status === 'active') {
            activeAds++;
          } else if (ad.status === 'paused') {
            pausedAds++;
          }

          // Website breakdown
          const targetWebsites = ad.targetWebsites || [];
          if (targetWebsites.length === 0) {
            // No targeting = shown on all websites
            websiteStats['all'].impressions += ad.impressions || 0;
            websiteStats['all'].clicks += ad.clicks || 0;
            if (ad.status === 'active') {
              websiteStats['all'].activeAds++;
            }
          } else {
            // Split stats evenly across targeted websites (approximation)
            const splitFactor = targetWebsites.length;
            targetWebsites.forEach((website) => {
              if (websiteStats[website]) {
                websiteStats[website].impressions += Math.round((ad.impressions || 0) / splitFactor);
                websiteStats[website].clicks += Math.round((ad.clicks || 0) / splitFactor);
                if (ad.status === 'active') {
                  websiteStats[website].activeAds++;
                }
              }
            });
          }

          // Track for top ads
          allAds.push({
            id: ad.id,
            name: ad.name || 'Unnamed Ad',
            impressions: ad.impressions || 0,
            clicks: ad.clicks || 0,
            ctr: calculateCTR(ad.impressions || 0, ad.clicks || 0),
            customerName: ad.customerName,
          });
        });

        // Calculate CTR
        const ctr = calculateCTR(totalImpressions, totalClicks);

        // Format website data for chart
        const byWebsite = [
          {
            websiteId: 'wesley-chapel' as CommunityWebsiteId,
            websiteName: COMMUNITY_WEBSITE_CONFIG['wesley-chapel'].shortName,
            ...websiteStats['wesley-chapel'],
          },
          {
            websiteId: 'pasco-county' as CommunityWebsiteId,
            websiteName: COMMUNITY_WEBSITE_CONFIG['pasco-county'].shortName,
            ...websiteStats['pasco-county'],
          },
        ];

        // Sort and get top 5 ads by impressions
        const topAds = allAds
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 5);

        // Format status distribution for pie chart
        const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count,
          color: STATUS_COLORS[status] || '#94a3b8',
        }));

        setData({
          totalImpressions,
          totalClicks,
          activeAds,
          pausedAds,
          ctr,
          byWebsite,
          topAds,
          statusDistribution,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching ad network data:', error);
        setLoading(false);
      }
    };

    fetchAdNetworkData();
  }, [firestore]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Ad Network Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time metrics from your live ad network
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/ad-server">
            Manage Ads
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalImpressions)}</div>
            <p className="text-xs text-muted-foreground">
              Ads viewed across all websites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalClicks)}</div>
            <p className="text-xs text-muted-foreground">
              Click-throughs to advertisers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.ctr}%</div>
            <p className="text-xs text-muted-foreground">
              Network-wide CTR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{data.activeAds}</div>
            <p className="text-xs text-muted-foreground">
              {data.pausedAds > 0 && `${data.pausedAds} paused`}
              {data.pausedAds === 0 && 'Currently serving'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Performance by Website */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Performance by Website
            </CardTitle>
            <CardDescription>
              Impressions and clicks per community website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer>
                <BarChart data={data.byWebsite} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={formatNumber} />
                  <YAxis
                    type="category"
                    dataKey="websiteName"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="impressions"
                    fill="var(--color-impressions)"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="clicks"
                    fill="var(--color-clicks)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Ad Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Ad Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of ads by current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.statusDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count }) => `${status}: ${count}`}
                      labelLine={false}
                    >
                      {data.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="status" />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No ads in the system yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Ads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Performing Ads</CardTitle>
              <CardDescription>
                Highest impression ads in your network
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ad-server">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.topAds.length > 0 ? (
            <div className="space-y-3">
              {data.topAds.map((ad, index) => (
                <div
                  key={ad.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{ad.name}</p>
                      {ad.customerName && (
                        <p className="text-xs text-muted-foreground">{ad.customerName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{formatNumber(ad.impressions)}</p>
                      <p className="text-xs text-muted-foreground">impressions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatNumber(ad.clicks)}</p>
                      <p className="text-xs text-muted-foreground">clicks</p>
                    </div>
                    <Badge variant="outline" className="min-w-[60px] justify-center">
                      {ad.ctr}% CTR
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium">No ads yet</p>
              <p className="text-sm text-muted-foreground">
                Publish ads from the Ad Server to see performance metrics
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
