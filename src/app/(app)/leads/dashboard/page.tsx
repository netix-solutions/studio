'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, RefreshCw, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LEAD_SOURCE_LABELS, type LeadSource } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface LeadMetrics {
  totalLeads: number;
  convertedCount: number;
  totalPipelineValue: number;
  weeklyVelocity: { week: string; new: number; converted: number }[];
  sourcePerformance: {
    source: string;
    total: number;
    converted: number;
    conversionRate: number;
    avgDaysToConvert: number | null;
    totalValue: number;
  }[];
  responseTime: {
    avgFirstResponseHours: number | null;
    contactedWithin24hPercent: number | null;
  };
  calculatedAt: string;
  // Legacy fields (ignored if present)
  funnelCounts?: Record<string, number>;
  conversionRates?: any[];
  pipelineValue?: Record<string, number>;
}

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/leads')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Leads
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Lead Analytics</h1>
            <p className="text-muted-foreground text-sm">Lead performance and conversion metrics</p>
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
                    <p className="text-2xl font-bold text-green-600">{metrics.convertedCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Converted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">${(metrics.totalPipelineValue || 0).toLocaleString()}</p>
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
                    <Area type="monotone" dataKey="converted" stackId="2" stroke="#16a34a" fill="#86efac" name="Converted" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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
                      <th className="text-right py-2 font-medium">Converted</th>
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
                          <td className="text-right py-2 text-green-600">{source.converted}</td>
                          <td className="text-right py-2">
                            <Badge variant={source.conversionRate >= 30 ? 'default' : 'outline'} className="text-xs">
                              {source.conversionRate}%
                            </Badge>
                          </td>
                          <td className="text-right py-2 hidden md:table-cell">
                            {source.avgDaysToConvert !== null ? `${source.avgDaysToConvert}d` : '--'}
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
