'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { dailyVisitorsData } from '@/lib/mock-data';
import { Users, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const chartConfig = {
    visitors: {
        label: "Visitors",
        color: "hsl(var(--chart-1))",
    },
};

export function StatsSection() {
    return (
        <section id="stats" className="bg-muted py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        A Thriving, Engaged Audience
                    </h2>
                    <p className="mt-4 text-muted-foreground md:text-xl">
                        Our platforms are the go-to source for local information, attracting a large and growing readership.
                    </p>
                </div>

                <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Daily Website Visitors</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] w-full">
                            <ChartContainer config={chartConfig}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyVisitorsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="dot" />}
                                        />
                                        <Area
                                            dataKey="visitors"
                                            type="monotone"
                                            fill="var(--color-visitors)"
                                            fillOpacity={0.4}
                                            stroke="var(--color-visitors)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Wesley Chapel Population</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">~79,000</div>
                            <p className="text-xs text-muted-foreground">and growing rapidly</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pasco County Population</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">~650,000</div>
                            <p className="text-xs text-muted-foreground">One of Florida's fastest-growing counties</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
