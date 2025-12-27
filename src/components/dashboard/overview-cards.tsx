'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Users, CreditCard, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

export default function OverviewCards() {
  const { firestore } = useFirebase();
  const [stats, setStats] = useState({
      totalRevenue: 0,
      activeSubscriptions: 0,
      newThisMonth: 0,
      yearlyRevenue: 0,
  });
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
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Safely access nested properties with null coalescing
        const totalRevenue = allSubscriptions.reduce((acc, sub) => {
            const amount = sub.items?.[0]?.price?.unit_amount ?? 0;
            return acc + (amount / 100);
        }, 0);
        const activeSubscriptions = allSubscriptions.filter(sub => sub.status === 'active' || sub.status === 'trialing').length;
        const newThisMonth = allSubscriptions.filter(sub => {
            if (!sub.created) return false;
            const createdDate = new Date(sub.created * 1000);
            return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        }).length;
        const yearlyRevenue = allSubscriptions
          .filter(sub => sub.items?.[0]?.price?.recurring?.interval === 'year' && (sub.status === 'active' || sub.status === 'trialing'))
          .reduce((acc, sub) => {
              const amount = sub.items?.[0]?.price?.unit_amount ?? 0;
              return acc + (amount / 100);
          }, 0);

        setStats({ totalRevenue, activeSubscriptions, newThisMonth, yearlyRevenue });
        setLoading(false);
      }).catch(error => {
          console.error("Error fetching overview stats:", error);
          setLoading(false);
      });

  }, [firestore]);
  

  const cardData = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      description: 'Lifetime value from all subscriptions',
      icon: DollarSign,
    },
    {
      title: 'Active Subscriptions',
      value: `${stats.activeSubscriptions}`,
      description: 'Total active and trialing plans',
      icon: Users,
    },
    {
      title: 'New Subscriptions (This Month)',
      value: `+${stats.newThisMonth}`,
      description: 'Subscriptions started this month',
      icon: CreditCard,
    },
    {
      title: 'Active ARR',
      value: `$${stats.yearlyRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      description: 'Annual Recurring Revenue from yearly plans',
      icon: Activity,
    },
  ];

  if (loading) {
      return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {cardData.map((_, index) => (
                  <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">...</div>
                          <p className="text-xs text-muted-foreground">Fetching data...</p>
                      </CardContent>
                  </Card>
              ))}
          </div>
      );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cardData.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
