'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, Line, ComposedChart } from 'recharts';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

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

export default function SubscriptionsChart() {
    const { firestore } = useFirebase();
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);

        const fetchAllSubscriptions = async () => {
            const customersSnapshot = await getDocs(collection(firestore, 'customers'));
            let allSubscriptions: any[] = [];
            for (const customerDoc of customersSnapshot.docs) {
                const subscriptionsSnapshot = await getDocs(collection(firestore, 'customers', customerDoc.id, 'subscriptions'));
                subscriptionsSnapshot.forEach(subDoc => {
                    allSubscriptions.push(subDoc.data());
                });
            }
            return allSubscriptions;
        };

        fetchAllSubscriptions().then(allSubscriptions => {
            const monthlyData: any = {};
            const sixMonthsAgo = subMonths(new Date(), 5);

            // Initialize months
            for (let i = 0; i < 6; i++) {
                const month = format(addMonths(sixMonthsAgo, i), 'MMM');
                monthlyData[month] = { month, new: 0, total: 0 };
            }

            let cumulativeTotal = 0;
            const subsBeforeWindow = allSubscriptions.filter(sub => {
                if (!sub.created) return false;
                const createdDate = new Date(sub.created * 1000);
                return createdDate < startOfMonth(sixMonthsAgo) && (sub.status === 'active' || sub.status === 'trialing');
            }).length;
            cumulativeTotal += subsBeforeWindow;


            for (let i = 0; i < 6; i++) {
                const date = addMonths(sixMonthsAgo, i);
                const monthKey = format(date, 'MMM');
                const start = startOfMonth(date);
                const end = endOfMonth(date);

                const newThisMonth = allSubscriptions.filter(sub => {
                    if (!sub.created) return false;
                    const createdDate = new Date(sub.created * 1000);
                    return createdDate >= start && createdDate <= end;
                }).length;

                const activeThisMonth = allSubscriptions.filter(sub => {
                     if (!sub.created) return false;
                     const createdDate = new Date(sub.created * 1000);
                     const endDate = sub.ended_at ? new Date(sub.ended_at * 1000) : null;
                     return createdDate <= end && (!endDate || endDate >= start);
                }).length;


                monthlyData[monthKey].new = newThisMonth;
                monthlyData[monthKey].total = activeThisMonth;
            }

            setChartData(Object.values(monthlyData));
            setLoading(false);
        }).catch(err => {
            console.error("Error processing chart data:", err);
            setLoading(false);
        });

        // Helper to add months without mutation
        function addMonths(date: Date, months: number) {
            const d = new Date(date);
            d.setMonth(d.getMonth() + months);
            return d;
        }

    }, [firestore]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad Subscriptions Overview</CardTitle>
        <CardDescription>A summary of active and new ad subscriptions over the last 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            {loading ? <div className="flex items-center justify-center h-full"><p>Loading chart data...</p></div> : (
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
            )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
