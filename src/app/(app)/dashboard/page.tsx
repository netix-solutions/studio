import OverviewCards from '@/components/dashboard/overview-cards';
import SubscriptionsChart from '@/components/dashboard/subscriptions-chart';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockSubscriptions } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function DashboardPage() {
    const recentSubscriptions = mockSubscriptions.slice(0, 5);
  return (
    <div className="flex-1 space-y-4">
      <OverviewCards />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SubscriptionsChart />
        </div>
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Recent Subscriptions</CardTitle>
                <CardDescription>Your most recent subscriptions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="hidden sm:table-cell">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentSubscriptions.length > 0 ? (
                            recentSubscriptions.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell>
                                        <div className="font-medium">{sub.customerName}</div>
                                        <div className="text-sm text-muted-foreground">{sub.customerEmail}</div>
                                    </TableCell>
                                    <TableCell className="text-right">${sub.amount.toFixed(2)}</TableCell>
                                    <TableCell className="hidden md:table-cell">{format(new Date(sub.startDate), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge variant={sub.status === 'Active' ? 'secondary' : 'outline'}>{sub.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No subscriptions yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
