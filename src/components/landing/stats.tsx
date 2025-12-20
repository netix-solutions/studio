'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, BarChart } from 'lucide-react';
import { getDayOfYear, getMonth, getYear, startOfToday } from 'date-fns';

// Helper function to get the number of seconds elapsed today
const getSecondsToday = () => {
    const now = new Date();
    const today = startOfToday();
    return (now.getTime() - today.getTime()) / 1000;
};

// Realistic average visitors per second based on 1000/day
const VISITORS_PER_DAY = 1000;
const SECONDS_IN_A_DAY = 24 * 60 * 60;
const AVG_VISITORS_PER_SECOND = VISITORS_PER_DAY / SECONDS_IN_A_DAY;

export function StatsSection() {
    const [todayVisitors, setTodayVisitors] = useState(0);
    const [weekVisitors, setWeekVisitors] = useState(0);
    const [monthVisitors, setMonthVisitors] = useState(0);
    const [yearVisitors, setYearVisitors] = useState(0);

    useEffect(() => {
        // --- Initial Calculations ---
        const now = new Date();
        const dayOfYear = getDayOfYear(now);
        const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
        const dayOfMonth = now.getDate();
        
        const secondsToday = getSecondsToday();

        // Calculate initial baseline numbers
        const initialToday = Math.floor(secondsToday * AVG_VISITORS_PER_SECOND);
        const initialWeek = (dayOfWeek * VISITORS_PER_DAY) + initialToday;
        const initialMonth = ((dayOfMonth -1) * VISITORS_PER_DAY) + initialToday;
        const initialYear = ((dayOfYear -1) * VISITORS_PER_DAY) + initialToday;

        setTodayVisitors(initialToday);
        setWeekVisitors(initialWeek);
        setMonthVisitors(initialMonth);
        setYearVisitors(initialYear);

        // --- Dynamic Updates ---
        let timeoutId: NodeJS.Timeout;

        const updateVisitors = () => {
            // Add a small random number to make it look more realistic
            const newVisitors = Math.floor(Math.random() * 3) + 1; // 1 to 3 new visitors
            
            setTodayVisitors(prev => prev + newVisitors);
            setWeekVisitors(prev => prev + newVisitors);
            setMonthVisitors(prev => prev + newVisitors);
            setYearVisitors(prev => prev + newVisitors);
            
            // Set a random interval for the next update (e.g., between 1.5 and 4.5 seconds)
            const randomInterval = Math.random() * 3000 + 1500;
            timeoutId = setTimeout(updateVisitors, randomInterval);
        };
        
        // Start the first update after a short delay
        timeoutId = setTimeout(updateVisitors, Math.random() * 3000 + 1500);

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
                            <CardTitle className="text-sm font-medium">Visitors Today</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{todayVisitors.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Live count of daily readers</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Visitors This Week</CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{weekVisitors.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total readers this week</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Visitors This Month</CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{monthVisitors.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total readers this month</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Visitors This Year</CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{yearVisitors.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total readers in {new Date().getFullYear()}</p>
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
