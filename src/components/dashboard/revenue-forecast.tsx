'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Calendar, ArrowRight, AlertTriangle, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import Link from 'next/link';
import {
  RenewalForecast,
  MonthlyRevenueProjection,
  formatCurrency,
} from '@/lib/revenue';

interface RevenueForecastProps {
  renewals: RenewalForecast[];
  projections: MonthlyRevenueProjection[];
  loading?: boolean;
}

const chartConfig = {
  recurringRevenue: {
    label: 'Monthly Ad Revenue',
    color: 'hsl(142, 76%, 36%)', // Green for stable recurring
  },
  renewalRevenue: {
    label: 'Contract Renewals',
    color: 'hsl(var(--chart-2))',
  },
};

export default function RevenueForecast({ renewals, projections, loading }: RevenueForecastProps) {
  const now = new Date();

  // Prepare chart data from projections
  const chartData = projections.map((p, index) => ({
    month: p.month,
    fullMonth: `${p.month} ${p.monthDate.getFullYear()}`,
    recurringRevenue: Math.round(p.recurringRevenue),
    renewalRevenue: Math.round(p.renewalRevenue),
    totalExpectedRevenue: Math.round(p.totalExpectedRevenue),
    monthlySubscriptions: p.monthlySubscriptions,
    renewalsCount: p.renewalsCount,
  }));

  // Get upcoming renewals (next 30 days) for the list
  const urgentRenewals = renewals.filter(r => {
    const days = differenceInDays(r.renewalDate, now);
    return days >= 0 && days <= 30;
  }).slice(0, 5);

  // Calculate totals
  const totalRecurring = projections.reduce((sum, p) => sum + p.recurringRevenue, 0);
  const totalRenewals = projections.reduce((sum, p) => sum + p.renewalRevenue, 0);
  const totalExpected = totalRecurring + totalRenewals;
  const next30DaysTotal = urgentRenewals.reduce((sum, r) => sum + r.amount, 0);
  const monthlyAdRevenue = projections[0]?.recurringRevenue || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Expected Revenue
            </CardTitle>
            <CardDescription>Projected income for the next 6 months</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">6-month total</p>
            <p className="text-xl font-bold">{formatCurrency(totalExpected)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-muted-foreground">Loading forecast data...</p>
          </div>
        ) : (
          <>
            {/* Monthly Revenue Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-xs font-medium">Monthly Ad Revenue</span>
                </div>
                <p className="text-lg font-bold text-green-800 dark:text-green-300">
                  {formatCurrency(monthlyAdRevenue)}/mo
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Upcoming Renewals</span>
                </div>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                  {formatCurrency(totalRenewals)}
                </p>
              </div>
            </div>

            {/* Monthly Revenue Chart */}
            <div>
              <p className="text-sm font-medium mb-3">Monthly Revenue Breakdown</p>
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md">
                            <p className="font-medium mb-2">{data.fullMonth}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-green-600">Monthly Ads:</span>
                                <span className="font-medium">{formatCurrency(data.recurringRevenue)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-blue-600">Renewals ({data.renewalsCount}):</span>
                                <span className="font-medium">{formatCurrency(data.renewalRevenue)}</span>
                              </div>
                              <div className="flex justify-between gap-4 pt-1 border-t">
                                <span className="font-medium">Total:</span>
                                <span className="font-bold">{formatCurrency(data.totalExpectedRevenue)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        if (value === 'recurringRevenue') return 'Monthly Ads';
                        if (value === 'renewalRevenue') return 'Renewals';
                        return value;
                      }}
                    />
                    <Bar
                      dataKey="recurringRevenue"
                      stackId="a"
                      fill="var(--color-recurringRevenue)"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="renewalRevenue"
                      stackId="a"
                      fill="var(--color-renewalRevenue)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Upcoming Renewals List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Next Billing Dates</p>
                <Badge variant="outline" className="text-xs">
                  {formatCurrency(next30DaysTotal)} next 30 days
                </Badge>
              </div>

              {urgentRenewals.length > 0 ? (
                <div className="space-y-2">
                  {urgentRenewals.map((renewal, idx) => {
                    const days = differenceInDays(renewal.renewalDate, now);
                    const isUrgent = days <= 7;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <div>
                            <p className="font-medium text-sm truncate max-w-[180px]">
                              {renewal.subscription.planName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {renewal.subscription.customerEmail || renewal.subscription.customerId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(renewal.amount)}</p>
                          <p className={`text-xs ${isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {isUrgent && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No renewals in the next 30 days</p>
                </div>
              )}

              {renewals.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                  <Link href="/subscriptions">
                    View all {renewals.length} upcoming bills
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
