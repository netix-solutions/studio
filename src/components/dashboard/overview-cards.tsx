import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Users, CreditCard, Activity } from 'lucide-react';
import { mockSubscriptions } from '@/lib/mock-data';

export default function OverviewCards() {
  const totalRevenue = mockSubscriptions.reduce((acc, sub) => acc + sub.amount, 0);
  const activeSubscriptions = mockSubscriptions.filter(sub => sub.status === 'Active').length;
  const newCustomersThisMonth = mockSubscriptions.filter(sub => {
    const startDate = new Date(sub.startDate);
    const now = new Date();
    return startDate.getMonth() === now.getMonth() && startDate.getFullYear() === now.getFullYear();
  }).length;
  const yearlyRevenue = mockSubscriptions
    .filter(sub => sub.plan === 'Yearly')
    .reduce((acc, sub) => acc + sub.amount, 0);

  const cardData = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      description: '+20.1% from last month',
      icon: DollarSign,
    },
    {
      title: 'Active Subscriptions',
      value: `+${activeSubscriptions}`,
      description: '+180.1% from last month',
      icon: Users,
    },
    {
      title: 'New Customers',
      value: `+${newCustomersThisMonth}`,
      description: '+19% from last month',
      icon: CreditCard,
    },
    {
      title: 'Yearly Plan Revenue',
      value: `$${yearlyRevenue.toLocaleString()}`,
      description: 'Annual recurring revenue',
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
