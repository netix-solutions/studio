'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Users, Target, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Lead,
  LeadStage,
  LeadSource,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_ORDER,
  LEAD_STAGE_COLORS,
  LEAD_SOURCE_LABELS,
} from '@/lib/types';

interface FunnelStats {
  totalLeads: number;
  byStage: Record<LeadStage, number>;
  bySource: Record<LeadSource, number>;
  conversionRate: number;
  wonValue: number;
  avgTimeToConversion: number;
  thisMonthLeads: number;
  lastMonthLeads: number;
  thisMonthWon: number;
  lastMonthWon: number;
}

export default function LeadFunnelChart() {
  const { firestore } = useFirebase();
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchLeads = async () => {
      try {
        const leadsSnapshot = await getDocs(collection(firestore, 'leads'));
        const leads: Lead[] = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          stage: doc.data().stage || LEAD_STAGES.NEW,
          source: doc.data().source || 'website',
        } as Lead));

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        // Calculate stats
        const byStage: Record<string, number> = {};
        const bySource: Record<string, number> = {};
        let wonValue = 0;
        let thisMonthLeads = 0;
        let lastMonthLeads = 0;
        let thisMonthWon = 0;
        let lastMonthWon = 0;

        for (const lead of leads) {
          // By stage
          const stage = lead.stage || 'new';
          byStage[stage] = (byStage[stage] || 0) + 1;

          // By source
          const source = lead.source || 'website';
          bySource[source] = (bySource[source] || 0) + 1;

          // Won value
          if (stage === 'won' && lead.estimatedValue) {
            wonValue += lead.estimatedValue;
          }

          // Monthly stats
          if (lead.createdAt) {
            const createdDate = lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
            const createdMonth = createdDate.getMonth();
            const createdYear = createdDate.getFullYear();

            if (createdMonth === thisMonth && createdYear === thisYear) {
              thisMonthLeads++;
              if (stage === 'won') thisMonthWon++;
            } else if (createdMonth === lastMonth && createdYear === lastMonthYear) {
              lastMonthLeads++;
              if (stage === 'won') lastMonthWon++;
            }
          }
        }

        const totalLeads = leads.length;
        const wonLeads = byStage['won'] || 0;
        const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

        setStats({
          totalLeads,
          byStage: byStage as Record<LeadStage, number>,
          bySource: bySource as Record<LeadSource, number>,
          conversionRate,
          wonValue,
          avgTimeToConversion: 0, // Could calculate if we track conversion dates
          thisMonthLeads,
          lastMonthLeads,
          thisMonthWon,
          lastMonthWon,
        });
      } catch (error) {
        console.error('Error fetching lead stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [firestore]);

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Sales Funnel</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  // Prepare funnel data (ordered stages - excluding 'lost' as it's an end state)
  const funnelStages: LeadStage[] = ['new', 'contacted', 'interested', 'won'];
  const maxCount = Math.max(...funnelStages.map(s => stats.byStage[s] || 0), 1);

  // Calculate month-over-month change
  const leadChange = stats.lastMonthLeads > 0
    ? ((stats.thisMonthLeads - stats.lastMonthLeads) / stats.lastMonthLeads) * 100
    : stats.thisMonthLeads > 0 ? 100 : 0;

  return (
    <div className="space-y-4">
      {/* Funnel Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Leads (This Month)</p>
                <p className="text-2xl font-bold">{stats.thisMonthLeads}</p>
              </div>
              <div className={cn(
                "flex items-center text-sm",
                leadChange >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {leadChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(leadChange).toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won This Month</p>
                <p className="text-2xl font-bold text-green-600">{stats.thisMonthWon}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lost Leads</p>
                <p className="text-2xl font-bold text-red-600">{stats.byStage['lost'] || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel</CardTitle>
          <CardDescription>Lead progression through pipeline stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelStages.map((stage, index) => {
              const count = stats.byStage[stage] || 0;
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const colors = LEAD_STAGE_COLORS[stage];

              // Calculate conversion to next stage
              const nextStage = funnelStages[index + 1];
              const nextCount = nextStage ? (stats.byStage[nextStage] || 0) : count;
              const stageConversion = count > 0 ? ((nextCount / count) * 100).toFixed(0) : '0';

              return (
                <div key={stage} className="relative">
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-right">
                      {LEAD_STAGE_LABELS[stage]}
                    </div>
                    <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden relative">
                      <div
                        className={cn("h-full rounded-lg transition-all duration-500", colors.bg)}
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cn("font-bold", count > 0 ? colors.text : "text-muted-foreground")}>
                          {count}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-muted-foreground text-right">
                      {index < funnelStages.length - 1 && count > 0 && (
                        <span>{stageConversion}% →</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lead Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
          <CardDescription>Where your leads are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.bySource)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([source, count]) => (
                <div key={source} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {LEAD_SOURCE_LABELS[source as LeadSource] || source}
                  </span>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
