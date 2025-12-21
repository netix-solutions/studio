
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { doc, onSnapshot, Unsubscribe, collection, getDocs, getDoc, setDoc, query, where, addDoc, serverTimestamp, getDocsFromServer } from 'firebase/firestore';
import { Loader2, AlertCircle, Edit, Save, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendEmail } from '@/lib/firebase/email';
import { Separator } from '@/components/ui/separator';

interface Subscription {
    id: string;
    status: string;
    planName: string;
    price: string;
    periodEnd: string;
}

const adDetailsSchema = z.object({
    businessName: z.string().min(2, "Business name is required."),
    contactName: z.string().min(2, "Contact name is required."),
    phone: z.string().min(10, "A valid phone number is required."),
    adWebsiteUrl: z.string().url("Please enter a valid URL (e.g., https://example.com).").optional().or(z.literal('')),
    adText: z.string().optional(),
    adNotes: z.string().optional(),
});

const testEmailSchema = z.object({
    recipientEmail: z.string().email("Please enter a valid email address."),
});

type AdDetailsFormData = z.infer<typeof adDetailsSchema>;
type TestEmailFormData = z.infer<typeof testEmailSchema>;


export default function AccountPage() {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminLoading, setIsAdminLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [subsLoading, setSubsLoading] = useState(true);
    const [subsError, setSubsError] = useState<string | null>(null);
    const { toast } = useToast();
    const [isSavingAdDetails, setIsSavingAdDetails] = useState(false);
    const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
    
    const adDetailsForm = useForm<AdDetailsFormData>({
        resolver: zodResolver(adDetailsSchema),
        defaultValues: {
            businessName: '',
            contactName: '',
            phone: '',
            adWebsiteUrl: '',
            adText: '',
            adNotes: '',
        }
    });

     const testEmailForm = useForm<TestEmailFormData>({
        resolver: zodResolver(testEmailSchema),
        defaultValues: {
            recipientEmail: user?.email || '',
        },
    });

    useEffect(() => {
        if (!user || !firestore) return;

        // --- User Data & Ad Details ---
        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                adDetailsForm.reset({
                    businessName: userData.businessName || '',
                    contactName: userData.contactName || '',
                    phone: userData.phone || '',
                    adWebsiteUrl: userData.adWebsiteUrl || '',
                    adText: userData.adText || '',
                    adNotes: userData.adNotes || '',
                });
                testEmailForm.reset({
                    recipientEmail: user.email || '',
                });
            }
        });


        // --- Admin Role Check ---
        const adminDocRef = doc(firestore, 'roles_admin', user.uid);
        const unsubAdmin = onSnapshot(adminDocRef, (docSnap) => {
            setIsAdmin(docSnap.exists());
            setIsAdminLoading(false);
        }, (error) => {
            console.log("Admin check failed, likely due to permissions. User is not an admin.");
            setIsAdmin(false);
            setIsAdminLoading(false);
        });
        
        // --- Subscription Fetching ---
        setSubsLoading(true);
        const subsCollectionRef = collection(firestore, 'customers', user.uid, 'subscriptions');
        const q = query(subsCollectionRef);

        const unsubSubs = onSnapshot(q, (snapshot) => {
            const subsData: Subscription[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const priceData = data.items?.[0]?.price;
                return {
                    id: doc.id,
                    status: data.status,
                    planName: data.items?.[0]?.price?.product?.name || 'N/A',
                    price: priceData ? `${(priceData.unit_amount / 100).toLocaleString('en-US', { style: 'currency', currency: priceData.currency || 'USD' })}/${priceData.recurring?.interval}`: 'N/A',
                    periodEnd: format(new Date(data.current_period_end * 1000), 'MMM d, yyyy'),
                };
            });
            setSubscriptions(subsData);
            setSubsLoading(false);
            setSubsError(null);
        }, (err) => {
            console.error("Subscription fetch error:", err);
            setSubsError("Could not load your subscriptions. Please try again later.");
            setSubsLoading(false);
        });


        return () => {
            unsubUser();
            unsubAdmin();
            unsubSubs();
        };
    }, [user, firestore, adDetailsForm.reset, testEmailForm.reset]);
    
    const onAdDetailsSubmit = async (data: AdDetailsFormData) => {
        if (!user || !firestore) return;
        setIsSavingAdDetails(true);

        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            // 1. Save details to user's profile
            await setDoc(userDocRef, data, { merge: true });
            
            // 2. For each active subscription, create an advertisement "ticket" if it doesn't exist
            const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');

            for (const sub of activeSubs) {
                const adQuery = query(
                    collection(firestore, 'advertisements'),
                    where('subscriptionId', '==', sub.id)
                );
                const existingAds = await getDocsFromServer(adQuery);

                if (existingAds.empty) {
                    await addDoc(collection(firestore, 'advertisements'), {
                        ...data,
                        userId: user.uid,
                        email: user.email,
                        subscriptionId: sub.id,
                        status: 'pending_ad_creation',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                     toast({
                        title: "Ad Ticket Created",
                        description: "Our team has been notified and will begin working on your ad.",
                    });
                }
            }


            toast({
                title: "Ad Details Saved",
                description: "Your business information has been successfully updated.",
            });
        } catch (error: any) {
             const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: data,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            
            toast({
                title: "Save Error",
                description: "Could not save your details. You may not have the required permissions.",
                variant: "destructive",
            });
        } finally {
            setIsSavingAdDetails(false);
        }
    };
    
    const onTestEmailSubmit = async (data: TestEmailFormData) => {
        if (!firestore) return;
        setIsSendingTestEmail(true);
        try {
            await sendEmail(firestore, {
                to: data.recipientEmail,
                subject: "Test Email from Community-Websites.com",
                html: `<p>This is a test email to confirm that the Firebase Trigger Email extension is configured and working correctly.</p>`,
            });
            toast({
                title: "Test Email Queued",
                description: `An email has been queued to be sent to ${data.recipientEmail}.`,
            });
        } catch (error: any) {
            console.error("Error sending test email:", error);
            toast({
                title: "Error Sending Email",
                description: error.message || "Could not queue the test email for sending.",
                variant: "destructive",
            });
        } finally {
            setIsSendingTestEmail(false);
        }
    };


    const handleManageBilling = async () => {
        if (!firestore || !user) {
            toast({
                title: "Error",
                description: "Services not available. Please try again.",
                variant: "destructive",
            });
            return;
        }
        setIsRedirecting(true);
        try {
            await goToBillingPortal(firestore, user.uid, window.location.origin + '/account');
            // The goToBillingPortal function will handle the redirect, but if it fails before redirecting,
            // we should stop the loading state.
        } catch (error: any) {
            console.error('Error redirecting to billing portal:', error);
             toast({
                title: "Error",
                description: error.message || "Could not open billing portal. Please try again.",
                variant: "destructive",
            });
            setIsRedirecting(false);
        }
    };

    const handleSyncStripeCustomers = async () => {
        if (!firestore) return;
        setIsSyncing(true);
        
        try {
            const usersCollectionRef = collection(firestore, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);

            const syncPromises = usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                if (!userId || !userData.email) return false;

                const customerDocRef = doc(firestore, 'customers', userId);
                const customerDocSnap = await getDoc(customerDocRef);

                if (!customerDocSnap.exists()) {
                     await setDoc(customerDocRef, {
                        email: userData.email,
                    }, { merge: true });
                    return true;
                }
                return false;
            });

            const results = await Promise.all(syncPromises);
            const syncedCount = results.filter(Boolean).length;

            toast({
                title: "Sync Complete",
                description: `${syncedCount} new customer record(s) created. The Stripe extension will now process them.`
            });

        } catch (error: any) {
            const permissionError = new FirestorePermissionError({
                path: '/users',
                operation: 'list',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);

            toast({
                title: "Sync Error",
                description: "Could not sync customers. You may not have permission to read all user data.",
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active':
            case 'trialing':
                return 'secondary';
            case 'past_due':
            case 'canceled':
            case 'unpaid':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <div className="flex-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>My Account</CardTitle>
                    <CardDescription>Welcome, {user?.email}! Manage your account and subscriptions here.</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ad Details</CardTitle>
                    <CardDescription>
                        Submit or update your business information below. This will help our team design and publish your ad.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={adDetailsForm.handleSubmit(onAdDetailsSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                             <div>
                                <Label htmlFor="businessName">Business Name</Label>
                                <Controller
                                    name="businessName"
                                    control={adDetailsForm.control}
                                    render={({ field }) => <Input id="businessName" {...field} />}
                                />
                                {adDetailsForm.formState.errors.businessName && <p className="text-sm text-destructive mt-1">{adDetailsForm.formState.errors.businessName.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="contactName">Contact Name</Label>
                                <Controller
                                    name="contactName"
                                    control={adDetailsForm.control}
                                    render={({ field }) => <Input id="contactName" {...field} />}
                                />
                                {adDetailsForm.formState.errors.contactName && <p className="text-sm text-destructive mt-1">{adDetailsForm.formState.errors.contactName.message}</p>}
                            </div>
                             <div>
                                <Label htmlFor="phone">Phone Number</Label>
                                <Controller
                                    name="phone"
                                    control={adDetailsForm.control}
                                    render={({ field }) => <Input id="phone" {...field} />}
                                />
                                {adDetailsForm.formState.errors.phone && <p className="text-sm text-destructive mt-1">{adDetailsForm.formState.errors.phone.message}</p>}
                            </div>
                             <div>
                                <Label htmlFor="adWebsiteUrl">Ad Link URL</Label>
                                <Controller
                                    name="adWebsiteUrl"
                                    control={adDetailsForm.control}
                                    render={({ field }) => <Input id="adWebsiteUrl" placeholder="https://example.com" {...field} />}
                                />
                                {adDetailsForm.formState.errors.adWebsiteUrl && <p className="text-sm text-destructive mt-1">{adDetailsForm.formState.errors.adWebsiteUrl.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="adText">Ad Text / Slogan</Label>
                            <Controller
                                name="adText"
                                control={adDetailsForm.control}
                                render={({ field }) => <Textarea id="adText" placeholder="e.g., 'Serving Pasco County for 20 years!'" {...field} />}
                            />
                            {adDetailsForm.formState.errors.adText && <p className="text-sm text-destructive mt-1">{adDetailsForm.formState.errors.adText.message}</p>}
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="adNotes">Ad Notes or Special Offers</Label>
                            <Controller
                                name="adNotes"
                                control={adDetailsForm.control}
                                render={({ field }) => <Textarea id="adNotes" placeholder="e.g., 'Mention this ad for 10% off your first visit.'" {...field} />}
                            />
                            {adDetailsForm.formState.errors.adNotes && <p className="text-sm text-destructive mt-1">{adDetailsForm.formState.errors.adNotes.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSavingAdDetails}>
                            {isSavingAdDetails ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" /> Save Ad Details
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>My Subscriptions</CardTitle>
                    <CardDescription>A list of your active and past subscriptions.</CardDescription>
                </CardHeader>
                <CardContent>
                     {subsLoading && (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            <span>Loading subscriptions...</span>
                        </div>
                    )}
                    {subsError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{subsError}</AlertDescription>
                        </Alert>
                    )}
                    {!subsLoading && !subsError && subscriptions.length > 0 && (
                        <div className="space-y-4">
                            {subscriptions.map(sub => (
                                <div key={sub.id} className="flex justify-between items-center p-4 border rounded-lg">
                                    <div>
                                        <div className="font-bold">{sub.planName}</div>
                                        <div className="text-sm text-muted-foreground">{sub.price}</div>
                                    </div>
                                    <div className='text-right'>
                                         <Badge variant={getStatusBadgeVariant(sub.status)} className="capitalize mb-1">{sub.status}</Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {sub.status === 'active' || sub.status === 'trialing' ? `Renews on ${sub.periodEnd}` : `Ended on ${sub.periodEnd}`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!subsLoading && !subsError && subscriptions.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">You have no active subscriptions.</p>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Billing Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Click the button below to manage your subscription, view payment history, and update your payment method in our secure Stripe customer portal.
                    </p>
                    <Button onClick={handleManageBilling} disabled={isRedirecting || !user || !firestore}>
                        {isRedirecting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Redirecting...
                            </>
                        ) : (
                            'Manage Billing & Subscriptions'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {(isAdminLoading || isAdmin) && (
                <Card>
                     <CardHeader>
                        <CardTitle>Admin Tools</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isAdminLoading && (
                            <div className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Checking admin status...</span>
                            </div>
                        )}
                        {isAdmin && (
                            <>
                            <div>
                                <h3 className="font-semibold">Stripe Sync</h3>
                                <p className="text-sm text-muted-foreground">
                                    For any existing users who are missing a Stripe ID, this action will create a customer record for them, allowing the Stripe extension to sync their data.
                                </p>
                                <Button onClick={handleSyncStripeCustomers} disabled={isSyncing} className="mt-2">
                                    {isSyncing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : (
                                        'Sync Stripe Customers'
                                    )}
                                </Button>
                            </div>
                            <Separator />
                             <div>
                                <h3 className="font-semibold">Test Email Sending</h3>
                                <p className="text-sm text-muted-foreground">
                                    Send a test email to verify that the Firebase Trigger Email extension is configured and working correctly.
                                </p>
                                <form onSubmit={testEmailForm.handleSubmit(onTestEmailSubmit)} className="flex items-end gap-2 mt-2">
                                     <div className="flex-grow">
                                        <Label htmlFor="recipientEmail">Recipient Email</Label>
                                        <Controller
                                            name="recipientEmail"
                                            control={testEmailForm.control}
                                            render={({ field }) => <Input id="recipientEmail" type="email" placeholder="test@example.com" {...field} />}
                                        />
                                        {testEmailForm.formState.errors.recipientEmail && <p className="text-sm text-destructive mt-1">{testEmailForm.formState.errors.recipientEmail.message}</p>}
                                    </div>
                                    <Button type="submit" disabled={isSendingTestEmail}>
                                        {isSendingTestEmail ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            </>
                                        ) : (
                                             <Mail className="mr-2 h-4 w-4" />
                                        )}
                                        Send Test
                                    </Button>
                                </form>
                            </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

    