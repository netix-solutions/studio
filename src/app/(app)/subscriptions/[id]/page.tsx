
'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, User, Mail, Phone, Globe, Briefcase, FileText, Calendar, DollarSign, Save, Upload, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CommentsDialog } from '@/components/subscriptions/comments-dialog';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { sendEmail } from '@/lib/firebase/email';

interface SubscriptionDetails {
    id: string;
    customerId: string;
    plan: string;
    status: string;
    amount: number;
    startDate: string;
    endDate: string;
    adStatus: string;
    adId?: string; // Add adId
    adProofUrl?: string;
    adProofDestinationUrl?: string;
}

interface UserDetails {
    contactName: string;
    email: string;
    businessName?: string;
    phone?: string;
    adWebsiteUrl?: string;
    adText?: string;
    adNotes?: string;
}

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    active: 'secondary',
    trialing: 'secondary',
    past_due: 'destructive',
    canceled: 'destructive',
    unpaid: 'destructive',
    pending_ad_creation: 'outline',
    pending_customer_approval: 'default',
    live: 'secondary',
    canceled_inactive: 'destructive',
    'Not Started': 'outline',
};

const statusTextMap: { [key: string]: string } = {
    pending_ad_creation: 'Pending Ad Creation',
    pending_customer_approval: 'Pending Approval',
    live: 'Live',
    canceled_inactive: 'Canceled/Inactive',
    'Not Started': 'Not Started',
};

const capitalize = (s:string) => s && s[0].toUpperCase() + s.slice(1);


export default function SubscriptionDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { id: subscriptionId } = params;
    const customerId = searchParams.get('customerId');
    const { firestore, firebaseApp } = useFirebase();
    const { toast } = useToast();

    const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for the new form
    const [adProofFile, setAdProofFile] = useState<File | null>(null);
    const [adProofUrl, setAdProofUrl] = useState('');
    const [isSavingProof, setIsSavingProof] = useState(false);
    const [isRequestingApproval, setIsRequestingApproval] = useState(false);


    useEffect(() => {
        if (!firestore || !subscriptionId || typeof subscriptionId !== 'string' || !customerId) {
            setLoading(false);
            setError("Invalid subscription or customer ID.");
            return;
        }

        const fetchDetails = async () => {
            try {
                setLoading(true);
                
                const subDocRef = doc(firestore, 'customers', customerId, 'subscriptions', subscriptionId);
                const userDocRef = doc(firestore, 'users', customerId);
                const adQuery = query(collection(firestore, 'users', customerId, 'advertisements'), where('subscriptionId', '==', subscriptionId));
                
                const [subDocSnap, userDocSnap, adSnapshot] = await Promise.all([
                    getDoc(subDocRef),
                    getDoc(userDocRef),
                    getDocs(adQuery),
                ]);

                if (!subDocSnap.exists()) throw new Error("Subscription data could not be found for this customer.");
                if (!userDocSnap.exists()) throw new Error("Customer details not found.");

                const subData = subDocSnap.data();
                const userData = userDocSnap.data() as UserDetails;
                const adDoc = adSnapshot.empty ? null : adSnapshot.docs[0];
                const adData = adDoc?.data();

                const startDate = subData.created?.seconds ? new Date(subData.created.seconds * 1000) : new Date();
                const endDate = subData.current_period_end?.seconds ? new Date(subData.current_period_end.seconds * 1000) : new Date();

                const subDetails: SubscriptionDetails = {
                    id: subscriptionId,
                    customerId: customerId,
                    plan: subData.items?.[0]?.price?.product?.name || 'N/A',
                    status: subData.status,
                    amount: subData.items?.[0]?.price?.unit_amount / 100 || 0,
                    startDate: format(startDate, 'PPP'),
                    endDate: format(endDate, 'PPP'),
                    adStatus: adData?.status || 'Not Started',
                    adId: adDoc?.id,
                    adProofUrl: adData?.adProofUrl,
                    adProofDestinationUrl: adData?.adProofDestinationUrl,
                };

                setSubscription(subDetails);
                setUser(userData);
                setAdProofUrl(adData?.adProofDestinationUrl || adData?.adWebsiteUrl || '');

            } catch (err: any) {
                console.error("Error fetching subscription details:", err);
                if (err.code === 'permission-denied') {
                    setError("You do not have permission to view these details. Please contact an administrator.");
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: `/customers/${customerId}/subscriptions/${subscriptionId}`,
                        operation: 'get',
                    }));
                } else {
                    setError(err.message || "Failed to load subscription details.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();

    }, [firestore, subscriptionId, customerId]);
    
    const handleSaveProof = async () => {
        if (!firestore || !firebaseApp || !subscription?.adId || !customerId) {
            toast({ title: 'Error', description: 'Required information is missing.', variant: 'destructive' });
            return;
        }
        if (!adProofFile) {
            toast({ title: 'No File Selected', description: 'Please select an image file to upload.', variant: 'destructive' });
            return;
        }

        setIsSavingProof(true);
        try {
            const storage = getStorage(firebaseApp);
            const filePath = `advertisements/${customerId}/${subscription.adId}/${adProofFile.name}`;
            const fileStorageRef = storageRef(storage, filePath);

            await uploadBytes(fileStorageRef, adProofFile);
            const downloadUrl = await getDownloadURL(fileStorageRef);
            
            const adDocRef = doc(firestore, 'users', customerId, 'advertisements', subscription.adId);
            await updateDoc(adDocRef, {
                adProofUrl: downloadUrl,
                adProofDestinationUrl: adProofUrl,
                updatedAt: new Date(),
            });

            setSubscription(prev => prev ? { ...prev, adProofUrl: downloadUrl, adProofDestinationUrl: adProofUrl } : null);

            toast({ title: 'Success!', description: 'Advertisement proof has been saved.' });

        } catch (error: any) {
            console.error("Error saving proof:", error);
            toast({ title: 'Upload Failed', description: error.message || 'Could not save the ad proof.', variant: 'destructive' });
        } finally {
            setIsSavingProof(false);
        }
    };
    
    const handleRequestApproval = async () => {
        if (!firestore || !user || !subscription?.adProofUrl || !subscription?.adProofDestinationUrl || !subscription.adId || !customerId) {
            toast({ title: 'Error', description: 'A saved ad proof and destination URL are required before requesting approval.', variant: 'destructive' });
            return;
        }

        setIsRequestingApproval(true);
        try {
            // Find the approval email template
            const templateQuery = query(collection(firestore, 'emailTemplates'), where('id', '==', 'ad_proof_approval'));
            const templateSnapshot = await getDocs(templateQuery);
            if (templateSnapshot.empty) {
                throw new Error("Ad proof approval email template not found.");
            }
            const template = templateSnapshot.docs[0].data();

            // Replace placeholders
            const subject = template.subject.replace(/{{businessName}}/g, user.businessName || '');
            const html = template.html
                .replace(/{{contactName}}/g, user.contactName)
                .replace(/{{adProofUrl}}/g, subscription.adProofUrl)
                .replace(/{{adProofDestinationUrl}}/g, subscription.adProofDestinationUrl);

            // Send the email
            await sendEmail(firestore, {
                to: user.email,
                subject,
                html,
            }, {
                recipientId: customerId,
                templateId: 'ad_proof_approval',
                triggerType: 'manual_send',
            });
            
            // Update the ad status
            const adDocRef = doc(firestore, 'users', customerId, 'advertisements', subscription.adId);
            await updateDoc(adDocRef, {
                status: 'pending_customer_approval',
                updatedAt: new Date(),
            });

            setSubscription(prev => prev ? { ...prev, adStatus: 'pending_customer_approval' } : null);

            toast({
                title: 'Approval Requested',
                description: `An email has been sent to ${user.email} for ad proof approval.`,
            });
        } catch (error: any) {
            console.error("Error requesting approval:", error);
            toast({
                title: 'Request Failed',
                description: error.message || 'Could not request approval.',
                variant: 'destructive',
            });
        } finally {
            setIsRequestingApproval(false);
        }
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
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!subscription || !user) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>The requested subscription could not be found.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Subscription: {subscription.plan}</CardTitle>
                        <CardDescription>Details for subscription ID: {subscription.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Amount</p>
                                <p>${subscription.amount.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Billing Status</p>
                                <div><Badge variant={statusVariantMap[subscription.status] || 'outline'}>{capitalize(subscription.status)}</Badge></div>
                            </div>
                             <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Ad Status</p>
                                <div><Badge variant={statusVariantMap[subscription.adStatus] || 'outline'}>{statusTextMap[subscription.adStatus] || subscription.adStatus}</Badge></div>
                            </div>
                             <div className="space-y-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Current Period</p>
                                <p>{subscription.startDate} - {subscription.endDate}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Ad Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex items-start gap-2">
                                <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground font-medium">Business Name</p>
                                    <p>{user.businessName || 'Not Provided'}</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-2">
                                <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground font-medium">Ad Link URL</p>
                                    <p>{user.adWebsiteUrl ? <a href={user.adWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{user.adWebsiteUrl}</a> : 'Not Provided'}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-muted-foreground font-medium">Ad Text / Slogan</p>
                            <p className="whitespace-pre-wrap">{user.adText || 'Not Provided'}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground font-medium">Ad Notes / Special Offers</p>
                            <p className="whitespace-pre-wrap">{user.adNotes || 'Not Provided'}</p>
                        </div>
                    </CardContent>
                 </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Advertisement Proof</CardTitle>
                        <CardDescription>Upload the final ad creative and destination URL for customer approval.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {subscription.adProofUrl && (
                            <div className="space-y-4">
                                <h4 className="font-medium">Current Proof</h4>
                                <div className="border rounded-lg p-4 flex flex-col items-center gap-4">
                                    <Image src={subscription.adProofUrl} alt="Advertisement Proof" width={468} height={60} className="border" />
                                    <p className="text-xs text-muted-foreground break-all">
                                        Destination: <a href={subscription.adProofDestinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{subscription.adProofDestinationUrl}</a>
                                    </p>
                                </div>
                                 <Button onClick={handleRequestApproval} disabled={isRequestingApproval}>
                                    {isRequestingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    {isRequestingApproval ? 'Sending...' : 'Request Approval'}
                                </Button>
                            </div>
                        )}
                        <div className="space-y-4">
                            <h4 className="font-medium">{subscription.adProofUrl ? 'Upload New Proof' : 'Upload Proof'}</h4>
                            <div className="space-y-2">
                                <Label htmlFor="ad-proof-file">Ad Image File</Label>
                                <Input id="ad-proof-file" type="file" accept="image/*" onChange={(e) => setAdProofFile(e.target.files?.[0] || null)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="ad-proof-url">Ad Destination URL</Label>
                                <Input id="ad-proof-url" type="text" placeholder="https://example.com" value={adProofUrl} onChange={(e) => setAdProofUrl(e.target.value)} />
                            </div>
                            <Button onClick={handleSaveProof} disabled={isSavingProof}>
                                {isSavingProof ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSavingProof ? 'Saving...' : 'Save Proof'}
                            </Button>
                        </div>
                    </CardContent>
                 </Card>

                 <CommentsDialog
                    subscription={{id: subscription.id, customerId: subscription.customerId}}
                    isOpen={true}
                    onOpenChange={() => {}}
                    renderAsCard={true}
                />
            </div>
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground"/>
                            <span>{user.contactName}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground"/>
                            <a href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</a>
                        </div>
                         <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground"/>
                            <span>{user.phone || 'Not Provided'}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )

    
}


    