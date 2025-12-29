'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { PieChartIcon, Layers, Repeat } from 'lucide-react';
import { RevenueByPeriod, RevenueByPlan, formatCurrency, formatPercentage } from '@/lib/revenue';

interface RevenueBreakdownProps {
  byPeriod: RevenueByPeriod[];
  byPlan: RevenueByPlan[];
  loading?: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const periodChartConfig = {
  Monthly: { label: 'Monthly', color: COLORS[0] },
  Quarterly: { label: 'Quarterly', color: COLORS[1] },
  Annual: { label: 'Annual', color: COLORS[2] },
  'One-Time': { label: 'One-Time', color: COLORS[3] },
  Custom: { label: 'Custom', color: COLORS[4] },
};

export default function RevenueBreakdown({ byPeriod, byPlan, loading }: RevenueBreakdownProps) {
  // Prepare pie chart data for billing periods
  const periodChartData = byPeriod.map((item, idx) => ({
    name: item.period,
    value: item.mrr,
    count: item.count,
    fill: COLORS[idx % COLORS.length],
  }));

  const totalMrr = byPeriod.reduce((sum, p) => sum + p.mrr, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-purple-500" />
          Revenue Breakdown
        </CardTitle>
        <CardDescription>MRR by billing period and plan type</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-muted-foreground">Loading breakdown data...</p>
          </div>
        ) : (
          <>
            {/* Billing Period Breakdown with Pie Chart */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">By Billing Period</p>
              </div>

              {periodChartData.length > 0 ? (
                <div className="flex items-center gap-6">
                  {/* Pie Chart */}
                  <ChartContainer config={periodChartConfig} className="h-[140px] w-[140px] flex-shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={periodChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {periodChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
                                <p className="font-medium">{data.name}</p>
                                <p>{formatCurrency(data.value)} MRR</p>
                                <p className="text-muted-foreground">{data.count} subscriptions</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  {/* Legend */}
                  <div className="flex-1 space-y-2">
                    {byPeriod.map((period, idx) => (
                      <div key={period.period} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span>{period.period}</span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {period.count}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(period.mrr)}</span>
                          <span className="text-muted-foreground ml-1">
                            ({formatPercentage(period.percentage, 0)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No subscription data</p>
              )}
            </div>

            {/* Plan Breakdown with Progress Bars */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">By Plan</p>
              </div>

              {byPlan.length > 0 ? (
                <div className="space-y-3">
                  {byPlan.slice(0, 5).map((plan, idx) => (
                    <div key={plan.planName} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate font-medium">{plan.planName}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0 flex-shrink-0">
                            {plan.count}
                          </Badge>
                        </div>
                        <span className="font-medium ml-2">{formatCurrency(plan.mrr)}</span>
                      </div>
                      <Progress
                        value={plan.percentage}
                        className="h-2"
                      />
                    </div>
                  ))}

                  {byPlan.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {byPlan.length - 5} more plans
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No plan data</p>
              )}
            </div>

            {/* Summary Stats */}
            <div className="pt-3 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{byPlan.length}</p>
                  <p className="text-xs text-muted-foreground">Active Plans</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatCurrency(totalMrr)}</p>
                  <p className="text-xs text-muted-foreground">Total MRR</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
