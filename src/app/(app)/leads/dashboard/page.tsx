'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, RefreshCw, TrendingUp, Users, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, LEAD_SOURCE_LABELS, type LeadStage, type LeadSource } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface LeadMetrics {
  funnelCounts: Record<string, number>;
  conversionRates: { from: string; to: string; rate: number }[];
  weeklyVelocity: { week: string; new: number; won: number; lost: number }[];
  sourcePerformance: {
    source: string;
    total: number;
    won: number;
    conversionRate: number;
    avgDaysToWin: number | null;
    totalValue: number;
  }[];
  pipelineValue: Record<string, number>;
  responseTime: {
    avgFirstResponseHours: number | null;
    contactedWithin24hPercent: number | null;
  };
  totalLeads: number;
  calculatedAt: string;
}

const FUNNEL_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];

export default function LeadDashboardPage() {
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/analytics/lead-metrics');
      const data = await res.json();
      if (data.success && data.data) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/cron/calculate-lead-metrics', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
        toast({ title: 'Metrics Recalculated' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to recalculate', variant: 'destructive' });
    } finally {
      setIsRecalculating(false);
    }
  };

  const totalPipelineValue = metrics ? Object.values(metrics.pipelineValue).reduce((a, b) => a + b, 0) : 0;

  // Funnel chart data
  const funnelData = metrics ? FUNNEL_STAGES.map(stage => ({
    stage: LEAD_STAGE_LABELS[stage],
    count: metrics.funnelCounts[stage] || 0,
    color: LEAD_STAGE_COLORS[stage].text.replace('text-', '').replace('-700', ''),
  })) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/leads')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Leads
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Lead Analytics</h1>
            <p className="text-muted-foreground text-sm">Pipeline performance and conversion metrics</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRecalculate} disabled={isRecalculating}>
          {isRecalculating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
          Recalculate
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !metrics ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No metrics available</h3>
            <p className="text-muted-foreground text-sm mb-4">Click recalculate to generate analytics</p>
            <Button onClick={handleRecalculate} disabled={isRecalculating}>
              {isRecalculating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Calculate Metrics
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.totalLeads}</p>
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{metrics.funnelCounts.won || 0}</p>
                    <p className="text-xs text-muted-foreground">Won</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">${totalPipelineValue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Pipeline Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {metrics.responseTime.avgFirstResponseHours !== null
                        ? `${metrics.responseTime.avgFirstResponseHours}h`
                        : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Funnel</CardTitle>
              <CardDescription>Lead count by stage with conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {FUNNEL_STAGES.map((stage, index) => {
                  const count = metrics.funnelCounts[stage] || 0;
                  const maxCount = Math.max(...FUNNEL_STAGES.map(s => metrics.funnelCounts[s] || 0), 1);
                  const width = (count / maxCount) * 100;
                  const colors = LEAD_STAGE_COLORS[stage];
                  const convRate = metrics.conversionRates.find(c => c.from === stage);

                  return (
                    <div key={stage}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-24">{LEAD_STAGE_LABELS[stage]}</span>
                        <div className="flex-1">
                          <div
                            className={cn('h-8 rounded flex items-center px-3 transition-all cursor-pointer hover:opacity-80', colors.bg)}
                            style={{ width: `${Math.max(width, 8)}%` }}
                            onClick={() => router.push(`/leads?stage=${stage}`)}
                          >
                            <span className={cn('text-sm font-semibold', colors.text)}>{count}</span>
                          </div>
                        </div>
                        {convRate && index < FUNNEL_STAGES.length - 1 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground w-16 text-right">
                            <ArrowRight className="h-3 w-3" />
                            {convRate.rate}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Lost count */}
                <div className="flex items-center gap-3 pt-2 border-t">
                  <span className="text-sm font-medium w-24">Lost</span>
                  <Badge variant="outline" className="text-red-600">{metrics.funnelCounts.lost || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Lead Velocity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Velocity (12 Weeks)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.weeklyVelocity}>
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="new" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="New" />
                      <Area type="monotone" dataKey="won" stackId="2" stroke="#16a34a" fill="#86efac" name="Won" />
                      <Area type="monotone" dataKey="lost" stackId="3" stroke="#dc2626" fill="#fca5a5" name="Lost" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Value by Stage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pipeline Value by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['new', 'contacted', 'qualified', 'proposal', 'negotiation'].map(stage => {
                    const value = metrics.pipelineValue[stage] || 0;
                    const colors = LEAD_STAGE_COLORS[stage as LeadStage];
                    return (
                      <div key={stage} className="flex items-center justify-between">
                        <span className="text-sm">{LEAD_STAGE_LABELS[stage as LeadStage]}</span>
                        <span className={cn('text-sm font-semibold', colors.text)}>
                          ${value.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-2 border-t font-semibold">
                    <span className="text-sm">Total</span>
                    <span className="text-sm">${totalPipelineValue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Source ROI Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Performance</CardTitle>
              <CardDescription>Lead source ROI and conversion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Source</th>
                      <th className="text-right py-2 font-medium">Leads</th>
                      <th className="text-right py-2 font-medium">Won</th>
                      <th className="text-right py-2 font-medium">Conv. Rate</th>
                      <th className="text-right py-2 font-medium hidden md:table-cell">Avg Days</th>
                      <th className="text-right py-2 font-medium hidden md:table-cell">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.sourcePerformance
                      .sort((a, b) => b.total - a.total)
                      .map(source => (
                        <tr key={source.source} className="border-b last:border-0">
                          <td className="py-2">
                            {LEAD_SOURCE_LABELS[source.source as LeadSource] || source.source}
                          </td>
                          <td className="text-right py-2">{source.total}</td>
                          <td className="text-right py-2 text-green-600">{source.won}</td>
                          <td className="text-right py-2">
                            <Badge variant={source.conversionRate >= 30 ? 'default' : 'outline'} className="text-xs">
                              {source.conversionRate}%
                            </Badge>
                          </td>
                          <td className="text-right py-2 hidden md:table-cell">
                            {source.avgDaysToWin !== null ? `${source.avgDaysToWin}d` : '--'}
                          </td>
                          <td className="text-right py-2 hidden md:table-cell">
                            ${source.totalValue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Last calculated */}
          <p className="text-xs text-muted-foreground text-right">
            Last calculated: {new Date(metrics.calculatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
