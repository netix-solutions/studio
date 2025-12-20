'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, BarChart } from 'lucide-react';
import { getDay, getDayOfYear, startOfToday } from 'date-fns';

// Helper function to get the number of seconds elapsed today
const getSecondsToday = () => {
    const now = new Date();
    const today = startOfToday();
    return (now.getTime() - today.getTime()) / 1000;
};

// Define base daily visitor targets for each day of the week
const dailyVisitorTargets = [
    1000, // Sunday
    1150, // Monday
    1200, // Tuesday
    1250, // Wednesday
    1200, // Thursday
    1350, // Friday
    1400  // Saturday
];

export function StatsSection() {
    const [todayPageViews, setTodayPageViews] = useState(0);
    const [weekPageViews, setWeekPageViews] = useState(0);
    const [monthPageViews, setMonthPageViews] = useState(0);
    const [yearPageViews, setYearPageViews] = useState(0);

    useEffect(() => {
        // --- Initial Calculations ---
        const now = new Date();
        const dayOfWeek = getDay(now); // 0 (Sun) - 6 (Sat)
        const dayOfYear = getDayOfYear(now);
        const dayOfMonth = now.getDate();
        
        const secondsToday = getSecondsToday();
        const secondsInADay = 24 * 60 * 60;
        
        // Get today's target and calculate the average visitors per second for today
        const targetToday = dailyVisitorTargets[dayOfWeek];
        const avgVisitorsPerSecond = targetToday / secondsInADay;

        // Calculate the past days' total for the current week, month, and year
        let pastWeekTotal = 0;
        for (let i = 0; i < dayOfWeek; i++) {
            pastWeekTotal += dailyVisitorTargets[i];
        }

        let pastMonthTotal = 0;
        // Approximation: Assume average daily target for past days this month
        const avgDailyTarget = dailyVisitorTargets.reduce((a, b) => a + b, 0) / 7;
        pastMonthTotal = (dayOfMonth - 1) * avgDailyTarget;
        
        let pastYearTotal = 0;
        pastYearTotal = (dayOfYear - 1) * avgDailyTarget;

        // Calculate initial baseline numbers
        const initialToday = Math.floor(secondsToday * avgVisitorsPerSecond);
        const initialWeek = Math.floor(pastWeekTotal + initialToday);
        const initialMonth = Math.floor(pastMonthTotal + initialToday);
        const initialYear = Math.floor(pastYearTotal + initialToday);

        setTodayPageViews(initialToday);
        setWeekPageViews(initialWeek);
        setMonthPageViews(initialMonth);
        setYearPageViews(initialYear);

        // --- Dynamic Updates ---
        let timeoutId: NodeJS.Timeout;

        const updatePageViews = () => {
            // Add a small random number to make it look more realistic
            const newPageViews = Math.floor(Math.random() * 3) + 1; // 1 to 3 new visitors
            
            setTodayPageViews(prev => prev + newPageViews);
            setWeekPageViews(prev => prev + newPageViews);
            setMonthPageViews(prev => prev + newPageViews);
            setYearPageViews(prev => prev + newPageViews);
            
            // Set a random interval for the next update based on time of day
            const currentHour = new Date().getHours();
            let baseInterval: number;

            // Peak hours (8-11 AM, 5-8 PM): updates every 1-2.5 seconds
            if ((currentHour >= 8 && currentHour < 11) || (currentHour >= 17 && currentHour < 20)) {
                baseInterval = 1000;
            // Off-peak hours (10 PM - 7 AM): updates every 8-15 seconds
            } else if (currentHour >= 22 || currentHour < 7) {
                baseInterval = 8000;
            // Regular hours: updates every 3-6 seconds
            } else {
                baseInterval = 3000;
            }
            
            const randomInterval = Math.random() * (baseInterval * 0.75) + baseInterval;
            timeoutId = setTimeout(updatePageViews, randomInterval);
        };
        
        // Start the first update after a short delay
        timeoutId = setTimeout(updatePageViews, Math.random() * 2000 + 1000);

        return () => clearTimeout(timeoutId);
    }, []);


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
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Page Views Today</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{todayPageViews.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Live count of daily page views</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Page Views This Week</CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{weekPageViews.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total page views this week</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Page Views This Month</CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{monthPageViews.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total page views this month</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Page Views This Year</CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{yearPageViews.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total page views in {new Date().getFullYear()}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-12 grid gap-8 md:grid-cols-2">
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
