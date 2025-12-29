'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Line,
  ComposedChart,
  Bar,
  BarChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MonthlyRevenueData, formatCurrency } from '@/lib/revenue';

interface RevenueTrendsChartProps {
  data: MonthlyRevenueData[];
  loading?: boolean;
}

const chartConfig = {
  mrr: {
    label: 'MRR',
    color: 'hsl(var(--chart-1))',
  },
  newMrr: {
    label: 'New MRR',
    color: 'hsl(142, 76%, 36%)', // Green
  },
  churnedMrr: {
    label: 'Churned MRR',
    color: 'hsl(0, 84%, 60%)', // Red
  },
};

export default function RevenueTrendsChart({ data, loading }: RevenueTrendsChartProps) {
  // Calculate trend
  const latestMrr = data[data.length - 1]?.mrr || 0;
  const previousMrr = data[data.length - 2]?.mrr || 0;
  const mrrChange = latestMrr - previousMrr;
  const mrrChangePercent = previousMrr > 0 ? (mrrChange / previousMrr) * 100 : 0;

  // Format data for chart
  const chartData = data.map(d => ({
    month: d.month.split(' ')[0], // Just show month abbreviation
    mrr: Math.round(d.mrr),
    newMrr: Math.round(d.newMrr),
    churnedMrr: Math.round(d.churnedMrr),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Monthly Recurring Revenue over time</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatCurrency(latestMrr)}</p>
            <div className="flex items-center justify-end gap-1 text-sm">
              {mrrChange > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{formatCurrency(mrrChange)} ({mrrChangePercent.toFixed(1)}%)</span>
                </>
              ) : mrrChange < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">{formatCurrency(mrrChange)} ({mrrChangePercent.toFixed(1)}%)</span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No change</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading revenue data...</p>
            </div>
          ) : (
            <ResponsiveContainer>
              <ComposedChart data={chartData}>
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
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="font-medium mb-2">{payload[0]?.payload?.month}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">MRR:</span>
                            <span className="font-medium">{formatCurrency(payload[0]?.payload?.mrr || 0)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-green-600">+ New:</span>
                            <span className="font-medium text-green-600">{formatCurrency(payload[0]?.payload?.newMrr || 0)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-red-600">- Churned:</span>
                            <span className="font-medium text-red-600">{formatCurrency(payload[0]?.payload?.churnedMrr || 0)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend content={<ChartLegendContent />} />
                <Area
                  dataKey="mrr"
                  type="monotone"
                  fill="var(--color-mrr)"
                  fillOpacity={0.2}
                  stroke="var(--color-mrr)"
                  strokeWidth={2}
                />
                <Bar
                  dataKey="newMrr"
                  fill="var(--color-newMrr)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                />
                <Bar
                  dataKey="churnedMrr"
                  fill="var(--color-churnedMrr)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
