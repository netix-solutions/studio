
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2, AlertCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, Unsubscribe, where, getDocs, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CommentsDialog } from '@/components/subscriptions/comments-dialog';
import { useRouter } from 'next/navigation';

interface EnrichedSubscription {
    id: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    website: string;
    plan: string;
    startDate: string;
    endDate: string;
    status: string;
    adStatus: 'pending_ad_creation' | 'pending_customer_approval' | 'live' | 'canceled_inactive' | 'Not Started';
    amount: number;
}

const adStatusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    pending_ad_creation: 'outline',
    pending_customer_approval: 'default',
    live: 'secondary',
    canceled_inactive: 'destructive',
    'Not Started': 'outline',
};

const adStatusTextMap: { [key: string]: string } = {
    pending_ad_creation: 'Pending Ad Creation',
    pending_customer_approval: 'Pending Approval',
    live: 'Live',
    canceled_inactive: 'Canceled/Inactive',
    'Not Started': 'Not Started',
};


export default function SubscriptionsPage() {
  const { user, firestore } = useFirebase();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<EnrichedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<EnrichedSubscription | null>(null);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);


  useEffect(() => {
    if (!user || !firestore) return;

    let subsUnsubscribe: Unsubscribe | null = null;

    // Check admin status to determine which query to run
    const adminDocRef = doc(firestore, 'roles_admin', user.uid);
    const unsubAdmin = onSnapshot(adminDocRef, (snap) => {
        const userIsAdmin = snap.exists();
        setIsAdmin(userIsAdmin);

        // Clean up previous subscription listener if it exists
        if (subsUnsubscribe) {
            subsUnsubscribe();
            subsUnsubscribe = null;
        }

        setLoading(true);

        try {
            if (userIsAdmin) {
                // Admin: Fetch all subscriptions from all users (one-time fetch, no listener)
                const customersColRef = collection(firestore, 'customers');
                getDocs(customersColRef).then(async (customerSnaps) => {
                     let allSubs: EnrichedSubscription[] = [];

                     const usersSnapshot = await getDocs(collection(firestore, 'users'));
                     const usersMap = new Map<string, any>();
                     usersSnapshot.forEach(userDoc => {
                         usersMap.set(userDoc.id, userDoc.data());
                     });

                     const allSubscriptionsPromises = customerSnaps.docs.map(customerDoc => {
                         const customerId = customerDoc.id;
                         const subscriptionsColRef = collection(firestore, 'customers', customerId, 'subscriptions');
                         return getDocs(subscriptionsColRef).then(subsSnaps => ({ subsSnaps, customerId }));
                     });

                     const allSubscriptionsResults = await Promise.all(allSubscriptionsPromises);

                     for (const { subsSnaps, customerId } of allSubscriptionsResults) {
                        const userData = usersMap.get(customerId);

                        const adQuery = query(collection(firestore, 'users', customerId, 'advertisements'));
                        const adsSnapshot = await getDocs(adQuery);
                        const adsMap = new Map<string, any>();
                        adsSnapshot.forEach(adDoc => {
                            const adData = adDoc.data();
                            if (adData.subscriptionId) {
                                adsMap.set(adData.subscriptionId, adData);
                            }
                        });

                        subsSnaps.forEach(subDoc => {
                            const subData = subDoc.data();
                            const adData = adsMap.get(subDoc.id);

                            const startDate = subData.created?.seconds ? new Date(subData.created.seconds * 1000) : new Date();
                            const endDate = subData.current_period_end?.seconds ? new Date(subData.current_period_end.seconds * 1000) : new Date();
                            // Safely access nested price properties
                            const unitAmount = subData.items?.[0]?.price?.unit_amount ?? 0;

                            allSubs.push({
                                id: subDoc.id,
                                customerId: customerId,
                                customerName: userData?.contactName || userData?.email || 'N/A',
                                customerEmail: userData?.email || 'N/A',
                                website: 'Community-Websites.com', // Placeholder
                                plan: subData.items?.[0]?.price?.product?.name || 'N/A',
                                startDate: format(startDate, 'yyyy-MM-dd'),
                                endDate: format(endDate, 'yyyy-MM-dd'),
                                status: subData.status || 'unknown',
                                adStatus: adData?.status || 'Not Started',
                                amount: unitAmount / 100,
                            });
                        });
                     }

                    setSubscriptions(allSubs.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
                    setLoading(false);

                 }).catch(err => {
                    console.error("Error fetching subscriptions:", err);
                    setError("You do not have permission to view all subscriptions. Please contact support.");
                    setLoading(false);
                 });


            } else {
                // Non-admin: Fetch only the current user's subscriptions with real-time listener
                const subsCollectionRef = collection(firestore, 'customers', user.uid, 'subscriptions');
                const q = query(subsCollectionRef, where('status', 'in', ['active', 'trialing', 'past_due']));

                subsUnsubscribe = onSnapshot(q, (snapshot) => {
                    const subsData: EnrichedSubscription[] = snapshot.docs.map(docSnap => {
                        const data = docSnap.data();
                        const startDate = data.created?.seconds ? new Date(data.created.seconds * 1000) : new Date();
                        const endDate = data.current_period_end?.seconds ? new Date(data.current_period_end.seconds * 1000) : new Date();
                        // Safely access nested price properties
                        const unitAmount = data.items?.[0]?.price?.unit_amount ?? 0;
                        return {
                            id: docSnap.id,
                            customerId: user.uid,
                            customerName: user.displayName || user.email || 'Me',
                            customerEmail: user.email || 'N/A',
                            website: 'Community-Websites.com', // Placeholder
                            plan: data.items?.[0]?.price?.product?.name || 'N/A',
                            startDate: format(startDate, 'yyyy-MM-dd'),
                            endDate: format(endDate, 'yyyy-MM-dd'),
                            status: data.status || 'unknown',
                            adStatus: 'Not Started', // Non-admins don't see this
                            amount: unitAmount / 100,
                        };
                    });
                    setSubscriptions(subsData);
                    setLoading(false);
                }, (err) => {
                    setError("Could not load your subscriptions. Please try again later.");
                    setLoading(false);
                });
            }
        } catch (err) {
             setError("An unexpected error occurred while fetching subscriptions.");
             setLoading(false);
        }
    });

    // Cleanup function properly handles both subscriptions
    return () => {
        unsubAdmin();
        if (subsUnsubscribe) {
            subsUnsubscribe();
        }
    };

  }, [user, firestore]);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      sub.customerName.toLowerCase().includes(searchLower) ||
      sub.customerEmail.toLowerCase().includes(searchLower) ||
      sub.customerId.toLowerCase().includes(searchLower) ||
      (sub.plan && sub.plan.toLowerCase().includes(searchLower));
      
    const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleRowClick = (sub: EnrichedSubscription) => {
    router.push(`/subscriptions/${sub.id}?customerId=${sub.customerId}`);
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (error) {
      return (
          <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
          </Alert>
      );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{isAdmin ? 'All Customers' : 'My Subscriptions'}</CardTitle>
        <CardDescription>View and manage {isAdmin ? 'all customer' : 'your ad'} subscriptions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder={isAdmin ? "Search by customer, ID, or plan..." : "Search by plan..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 sm:max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    {isAdmin && <TableHead>Customer</TableHead>}
                    <TableHead>Plan</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Billing Status</TableHead>
                    {isAdmin && <TableHead>Ad Status</TableHead>}
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredSubscriptions.length > 0 ? filteredSubscriptions.map((sub) => (
                    <TableRow 
                        key={sub.id} 
                        onClick={() => handleRowClick(sub)}
                        className="cursor-pointer"
                    >
                    {isAdmin && (
                        <TableCell>
                            <div className="font-medium">{sub.customerName}</div>
                            <div className="text-sm text-muted-foreground">{sub.customerEmail}</div>
                            <div className="text-xs text-muted-foreground mt-1">ID: {sub.customerId}</div>
                        </TableCell>
                    )}
                    <TableCell>{sub.plan}</TableCell>
                    <TableCell>
                        {format(new Date(sub.startDate), 'LLL d, y')} - {format(new Date(sub.endDate), 'LLL d, y')}
                    </TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(sub.status)}>{capitalize(sub.status)}</Badge>
                    </TableCell>
                    {isAdmin && (
                        <TableCell>
                           <Badge variant={adStatusVariantMap[sub.adStatus] || 'outline'}>
                                {adStatusTextMap[sub.adStatus] || sub.adStatus}
                           </Badge>
                        </TableCell>
                    )}
                    <TableCell className="text-right">${sub.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(sub);
                                }}>
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>Cancel Subscription</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 5} className="text-center h-24">No subscriptions found.</TableCell>
                  </TableRow>
                )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
    {selectedSubscription && (
        <CommentsDialog
            subscription={selectedSubscription}
            isOpen={isCommentsDialogOpen}
            onOpenChange={setIsCommentsDialogOpen}
        />
    )}
    </>
  );
}

    