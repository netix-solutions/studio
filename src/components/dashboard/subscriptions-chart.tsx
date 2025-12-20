'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { subscriptionDataByMonth } from '@/lib/mock-data';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, Line, ComposedChart } from 'recharts';

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-2))",
  },
  new: {
    label: "New",
    color: "hsl(var(--chart-1))",
  },
}

export default function SubscriptionsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Growth</CardTitle>
        <CardDescription>New and total subscriptions over the past 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer>
             <ComposedChart data={subscriptionDataByMonth}>
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
              />
              <Tooltip
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Legend content={<ChartLegendContent />} />
              <Area
                dataKey="total"
                type="natural"
                fill="var(--color-total)"
                fillOpacity={0.4}
                stroke="var(--color-total)"
                stackId="a"
              />
               <Line
                dataKey="new"
                type="monotone"
                stroke="var(--color-new)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
