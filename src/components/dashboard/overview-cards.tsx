'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Users, CreditCard, Activity } from 'lucide-react';
import { mockSubscriptions } from '@/lib/mock-data';
import { useUser } from '@/firebase';

export default function OverviewCards() {
  const { user } = useUser();

  // In a real app, you would fetch data for the current user.
  // Here we simulate it by filtering the mock data for demonstration.
  const userSubscriptions = user ? mockSubscriptions.filter((sub, index) => index < 2) : [];
  
  const totalRevenue = userSubscriptions.reduce((acc, sub) => acc + sub.amount, 0);
  const activeSubscriptions = userSubscriptions.filter(sub => sub.status === 'Active').length;
  
  // This metric doesn't make as much sense in a user-specific view, so we'll adapt it.
  const newCustomersThisMonth = userSubscriptions.filter(sub => {
    const startDate = new Date(sub.startDate);
    const now = new Date();
    return startDate.getMonth() === now.getMonth() && startDate.getFullYear() === now.getFullYear();
  }).length;
  
  const yearlyRevenue = userSubscriptions
    .filter(sub => sub.plan === 'Yearly')
    .reduce((acc, sub) => acc + sub.amount, 0);

  const cardData = [
    {
      title: 'Total Spent',
      value: `$${totalRevenue.toLocaleString()}`,
      description: 'Lifetime value of your subscriptions',
      icon: DollarSign,
    },
    {
      title: 'Active Subscriptions',
      value: `${activeSubscriptions}`,
      description: 'Your currently active ad plans',
      icon: Users,
    },
    {
      title: 'New Subscriptions (This Month)',
      value: `+${newCustomersThisMonth}`,
      description: 'Subscriptions started this month',
      icon: CreditCard,
    },
    {
      title: 'Yearly Plan Revenue',
      value: `$${yearlyRevenue.toLocaleString()}`,
      description: 'Your annual recurring revenue',
      icon: Activity,
    },
  ];

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
