'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Calendar, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { format, differenceInDays, addMonths } from 'date-fns';
import Link from 'next/link';
import { RenewalForecast, formatCurrency, groupRenewalsByMonth } from '@/lib/revenue';

interface RevenueForecastProps {
  renewals: RenewalForecast[];
  loading?: boolean;
}

const chartConfig = {
  amount: {
    label: 'Revenue',
    color: 'hsl(var(--chart-2))',
  },
};

export default function RevenueForecast({ renewals, loading }: RevenueForecastProps) {
  // Group renewals by month for chart
  const groupedByMonth = groupRenewalsByMonth(renewals);
  const now = new Date();

  // Generate chart data for next 6 months
  const chartData = [];
  for (let i = 0; i < 6; i++) {
    const monthDate = addMonths(now, i);
    const key = format(monthDate, 'MMM yyyy');
    const data = groupedByMonth.get(key) || { count: 0, amount: 0 };
    chartData.push({
      month: format(monthDate, 'MMM'),
      fullMonth: key,
      amount: data.amount,
      count: data.count,
    });
  }

  // Get upcoming renewals (next 30 days) for the list
  const urgentRenewals = renewals.filter(r => {
    const days = differenceInDays(r.renewalDate, now);
    return days >= 0 && days <= 30;
  }).slice(0, 5);

  // Total upcoming revenue
  const totalUpcoming = renewals.reduce((sum, r) => sum + r.amount, 0);
  const next30DaysTotal = urgentRenewals.reduce((sum, r) => sum + r.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Revenue Forecast
            </CardTitle>
            <CardDescription>Upcoming renewals and projected revenue</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Next 90 days</p>
            <p className="text-xl font-bold">{formatCurrency(totalUpcoming)}</p>
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
            {/* Monthly Forecast Chart */}
            <div>
              <p className="text-sm font-medium mb-3">Monthly Renewal Revenue</p>
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
                      tickFormatter={(value) => `$${value}`}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md">
                            <p className="font-medium mb-1">{data.fullMonth}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.count} renewal{data.count !== 1 ? 's' : ''}
                            </p>
                            <p className="font-medium text-lg">{formatCurrency(data.amount)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Upcoming Renewals List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Upcoming Renewals</p>
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
                    View all {renewals.length} renewals
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
