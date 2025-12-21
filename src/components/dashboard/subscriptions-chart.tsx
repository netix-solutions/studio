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
    label: "Total Ads",
    color: "hsl(var(--chart-2))",
  },
  new: {
    label: "New Ads",
    color: "hsl(var(--chart-1))",
  },
}

// In a real app, this data would be fetched for the specific user.
// We'll use a scaled down version of the mock data for demonstration.
const userSubscriptionData = subscriptionDataByMonth.map(d => ({
    ...d,
    new: Math.ceil(d.new / 10),
    total: Math.ceil(d.total / 10),
}));


export default function SubscriptionsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Ad Performance</CardTitle>
        <CardDescription>A summary of your ad subscriptions over the last 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer>
             <ComposedChart data={userSubscriptionData}>
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
                allowDecimals={false}
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
