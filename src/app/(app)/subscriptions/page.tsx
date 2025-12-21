
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
import { collection, onSnapshot, query, Unsubscribe, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CommentsDialog } from '@/components/subscriptions/comments-dialog';

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
    amount: number;
}

export default function SubscriptionsPage() {
  const { user, firestore } = useFirebase();
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

    // Check admin status to determine which query to run
    const adminDocRef = doc(firestore, 'roles_admin', user.uid);
    const unsubAdmin = onSnapshot(adminDocRef, (snap) => {
        const userIsAdmin = snap.exists();
        setIsAdmin(userIsAdmin);

        let unsubscribe: Unsubscribe = () => {};
        setLoading(true);

        try {
            if (userIsAdmin) {
                // Admin: Fetch all subscriptions from all users
                const customersColRef = collection(firestore, 'customers');
                 getDocs(customersColRef).then(customerSnaps => {
                     const allSubs: EnrichedSubscription[] = [];
                     const userPromises = customerSnaps.docs.map(async (customerDoc) => {
                        const customerId = customerDoc.id;
                        const subscriptionsColRef = collection(firestore, 'customers', customerId, 'subscriptions');
                        const subsQuery = query(subscriptionsColRef); // Potentially filter by status on backend
                        const userDocRef = doc(firestore, 'users', customerId);

                        const [subsSnaps, userSnap] = await Promise.all([
                            getDocs(subsQuery),
                            getDoc(userDocRef)
                        ]);
                        
                        const userData = userSnap.data();

                        subsSnaps.forEach(subDoc => {
                            const subData = subDoc.data();
                            allSubs.push({
                                id: subDoc.id,
                                customerId: customerId,
                                customerName: userData?.contactName || 'N/A',
                                customerEmail: userData?.email || 'N/A',
                                website: 'Community-Websites.com', // Placeholder
                                plan: subData.items?.[0]?.price?.product?.name || 'N/A',
                                startDate: format(new Date(subData.created * 1000), 'yyyy-MM-dd'),
                                endDate: format(new Date(subData.current_period_end * 1000), 'yyyy-MM-dd'),
                                status: subData.status,
                                amount: subData.items?.[0]?.price?.unit_amount / 100 || 0,
                            });
                        });
                    });

                    Promise.all(userPromises).then(() => {
                        setSubscriptions(allSubs);
                        setLoading(false);
                    });
                 }).catch(err => {
                    setError("You do not have permission to view all subscriptions. Please contact support.");
                    setLoading(false);
                 });


            } else {
                // Non-admin: Fetch only the current user's subscriptions
                const subsCollectionRef = collection(firestore, 'customers', user.uid, 'subscriptions');
                const q = query(subsCollectionRef, where('status', 'in', ['active', 'trialing', 'past_due']));
                
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const subsData: EnrichedSubscription[] = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            customerId: user.uid,
                            customerName: user.displayName || user.email || 'Me',
                            customerEmail: user.email || 'N/A',
                            website: 'Community-Websites.com', // Placeholder
                            plan: data.items?.[0]?.price?.product?.name || 'N/A',
                            startDate: format(new Date(data.created * 1000), 'yyyy-MM-dd'),
                            endDate: format(new Date(data.current_period_end * 1000), 'yyyy-MM-dd'),
                            status: data.status,
                            amount: data.items?.[0]?.price?.unit_amount / 100 || 0,
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

        return () => {
            unsubscribe();
        };

    });
     return () => unsubAdmin();

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

  const handleOpenComments = (sub: EnrichedSubscription) => {
    setSelectedSubscription(sub);
    setIsCommentsDialogOpen(true);
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
              <AlertTitle>Error Loading Subscriptions</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
          </Alert>
      );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{isAdmin ? 'All Subscriptions' : 'My Subscriptions'}</CardTitle>
        <CardDescription>View and manage {isAdmin ? 'all customer' : 'your'} ad subscriptions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder={isAdmin ? "Search by customer, ID, or plan..." : "Search by plan..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredSubscriptions.length > 0 ? filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
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
                    <TableCell className="text-right">${sub.amount.toFixed(2)}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem onClick={() => handleOpenComments(sub)}>
                                    View Comments
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>Cancel Subscription</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center h-24">No subscriptions found.</TableCell>
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

    