'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Eye, MapPin } from 'lucide-react';
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
  1400, // Saturday
];

export function LiveStatsBar() {
  const [todayPageViews, setTodayPageViews] = useState(0);
  const [monthPageViews, setMonthPageViews] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setIsVisible(true);

    // --- Initial Calculations ---
    const now = new Date();
    const dayOfWeek = getDay(now); // 0 (Sun) - 6 (Sat)
    const dayOfMonth = now.getDate();

    const secondsToday = getSecondsToday();
    const secondsInADay = 24 * 60 * 60;

    // Get today's target and calculate the average visitors per second for today
    const targetToday = dailyVisitorTargets[dayOfWeek];
    const avgVisitorsPerSecond = targetToday / secondsInADay;

    // Calculate past days' total for current month
    const avgDailyTarget = dailyVisitorTargets.reduce((a, b) => a + b, 0) / 7;
    const pastMonthTotal = (dayOfMonth - 1) * avgDailyTarget;

    // Calculate initial baseline numbers
    const initialToday = Math.floor(secondsToday * avgVisitorsPerSecond);
    const initialMonth = Math.floor(pastMonthTotal + initialToday);

    setTodayPageViews(initialToday);
    setMonthPageViews(initialMonth);

    // --- Dynamic Updates ---
    let timeoutId: NodeJS.Timeout;

    const updatePageViews = () => {
      // Add a small random number to make it look more realistic
      const newPageViews = Math.floor(Math.random() * 3) + 1; // 1 to 3 new visitors

      setTodayPageViews((prev) => prev + newPageViews);
      setMonthPageViews((prev) => prev + newPageViews);

      // Set a random interval for the next update based on time of day
      const currentHour = new Date().getHours();
      let baseInterval: number;

      // Peak hours (8-11 AM, 5-8 PM): updates every 1-2.5 seconds
      if (
        (currentHour >= 8 && currentHour < 11) ||
        (currentHour >= 17 && currentHour < 20)
      ) {
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

  const stats = [
    {
      icon: Eye,
      value: todayPageViews.toLocaleString(),
      label: 'Views Today',
      live: true,
    },
    {
      icon: TrendingUp,
      value: monthPageViews.toLocaleString(),
      label: 'Views This Month',
      live: true,
    },
    {
      icon: Users,
      value: '~79,000',
      label: 'Wesley Chapel Pop.',
      live: false,
    },
    {
      icon: MapPin,
      value: '~650,000',
      label: 'Pasco County Pop.',
      live: false,
    },
  ];

  return (
    <section className="bg-gray-900 py-6 border-y border-gray-800">
      <div className="container mx-auto px-4 md:px-6">
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex items-center gap-3 justify-center md:justify-start"
            >
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <stat.icon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">{stat.value}</span>
                  {stat.live && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Keep the original StatsSection for backwards compatibility if needed elsewhere
export function StatsSection() {
  return <LiveStatsBar />;
}
