
'use client';
import { useEffect, useState } from 'react';
import OverviewCards from '@/components/dashboard/overview-cards';
import SubscriptionsChart from '@/components/dashboard/subscriptions-chart';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useFirebase } from '@/firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface EnrichedSubscription {
    id: string;
    customerName: string;
    customerEmail: string;
    amount: number;
    startDate: string;
    status: string;
}

export default function DashboardPage() {
    const { firestore } = useFirebase();
    const [recentSubscriptions, setRecentSubscriptions] = useState<EnrichedSubscription[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        setLoading(true);
        const customersColRef = collection(firestore, 'customers');
        
        getDocs(customersColRef).then(async (customerSnaps) => {
            const allSubsPromises: Promise<EnrichedSubscription[]>[] = customerSnaps.docs.map(async (customerDoc) => {
                const customerId = customerDoc.id;
                const subscriptionsColRef = collection(firestore, 'customers', customerId, 'subscriptions');
                const subsQuery = query(subscriptionsColRef);
                const userDocRef = doc(firestore, 'users', customerId);

                const [subsSnaps, userSnap] = await Promise.all([
                    getDocs(subsQuery),
                    getDoc(userDocRef)
                ]);

                const userData = userSnap.data();

                return subsSnaps.docs.map(subDoc => {
                    const subData = subDoc.data();
                    return {
                        id: subDoc.id,
                        customerName: userData?.contactName || userData?.email || 'N/A',
                        customerEmail: userData?.email || 'N/A',
                        amount: subData.items?.[0]?.price?.unit_amount / 100 || 0,
                        startDate: subData.created ? format(new Date(subData.created * 1000), 'yyyy-MM-dd') : '',
                        status: subData.status || 'unknown',
                    };
                });
            });

            const allSubsArrays = await Promise.all(allSubsPromises);
            const allSubs = allSubsArrays.flat();
            
            // Sort by start date descending and take the top 5
            const sortedSubs = allSubs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setRecentSubscriptions(sortedSubs.slice(0, 5));
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching recent subscriptions:", err);
            setLoading(false);
        });

    }, [firestore]);


    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active':
            case 'trialing':
                return 'secondary';
            case 'past_due':
            case 'canceled':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const capitalize = (s:string) => s && s[0].toUpperCase() + s.slice(1);

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
                <CardDescription>A list of the latest customer subscriptions.</CardDescription>
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                 ) : (
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
                                            <Badge variant={getStatusBadgeVariant(sub.status)}>{capitalize(sub.status)}</Badge>
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
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

