
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useUser as useAuthUser } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, addDoc, collectionGroup } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, User, Mail, Phone, Globe, Briefcase, FileText, Calendar, DollarSign, Save, Upload, Send, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { sendEmail } from '@/lib/firebase/email';
import { SendCustomerEmailDialog } from '@/components/subscriptions/send-customer-email-dialog';
import { CommentsDialog } from '@/components/subscriptions/comments-dialog';

interface UserDetails {
    id: string;
    contactName: string;
    email: string;
    businessName?: string;
    phone?: string;
    adWebsiteUrl?: string;
    adText?: string;
    adNotes?: string;
}

interface AdDetails {
    id: string;
    userId: string;
    subscriptionId: string;
    status: string;
    adProofUrl?: string;
    adProofDestinationUrl?: string;
    [key: string]: any;
}

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    pending_ad_creation: 'outline',
    pending_customer_approval: 'default',
    live: 'secondary',
    canceled_inactive: 'destructive',
};

const statusTextMap: { [key: string]: string } = {
    pending_ad_creation: 'Pending Ad Creation',
    pending_customer_approval: 'Pending Approval',
    live: 'Live',
    canceled_inactive: 'Canceled/Inactive',
};


export default function AdvertisementDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { id: adId } = params;
    const { firestore, firebaseApp } = useFirebase();
    const { toast } = useToast();

    const [advertisement, setAdvertisement] = useState<AdDetails | null>(null);
    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [adProofFile, setAdProofFile] = useState<File | null>(null);
    const [adProofUrlInput, setAdProofUrlInput] = useState('');
    const [isSavingProof, setIsSavingProof] = useState(false);
    const [isRequestingApproval, setIsRequestingApproval] = useState(false);

    useEffect(() => {
        if (!firestore || typeof adId !== 'string') {
            setLoading(false);
            setError("Invalid advertisement ID.");
            return;
        }

        const fetchDetails = async () => {
            try {
                setLoading(true);

                // Correctly query the collection group to find the document by its ID.
                // The '__name__' property holds the full path, so we check if it ends with the ID.
                const adQuery = query(collectionGroup(firestore, 'advertisements'), where('__name__', '==', `__name__`));
                const adSnapshot = await getDocs(adQuery);
                
                if (adSnapshot.empty) {
                    throw new Error("Advertisement not found.");
                }
                
                const adDoc = adSnapshot.docs.find(doc => doc.id === adId);
                if (!adDoc) {
                    throw new Error("Advertisement not found in the results.");
                }

                const adData = adDoc.data() as Omit<AdDetails, 'id'>;
                const userId = adData.userId;

                const userDocRef = doc(firestore, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    throw new Error("Associated customer details not found.");
                }

                const userData = userDocSnap.data() as Omit<UserDetails, 'id'>;

                setAdvertisement({ id: adDoc.id, ...adData });
                setUser({ id: userDocSnap.id, ...userData });
                setAdProofUrlInput(adData.adProofDestinationUrl || userData.adWebsiteUrl || '');

            } catch (err: any) {
                console.error("Error fetching details:", err);
                setError(err.message || "Failed to load details.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();

    }, [firestore, adId]);
    
     const handleSaveProof = async () => {
        if (!firestore || !firebaseApp || !advertisement || !user) {
            toast({ title: 'Error', description: 'Required information is missing.', variant: 'destructive' });
            return;
        }
        if (!adProofFile && !adProofUrlInput) {
            toast({ title: 'No Changes', description: 'Please select a file to upload or update the destination URL.', variant: 'destructive' });
            return;
        }

        setIsSavingProof(true);
        try {
            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            let downloadUrl = advertisement.adProofUrl;

            // Step 1: Upload the file if a new one is selected.
            if (adProofFile) {
                const storage = getStorage(firebaseApp);
                const filePath = `advertisements/${advertisement.userId}/${advertisement.id}/${adProofFile.name}`;
                const fileStorageRef = storageRef(storage, filePath);

                await uploadBytes(fileStorageRef, adProofFile);
                downloadUrl = await getDownloadURL(fileStorageRef);
            }
            
            // Step 2: Update the advertisement document.
            await updateDoc(adDocRef, {
                adProofUrl: downloadUrl,
                adProofDestinationUrl: adProofUrlInput,
                updatedAt: serverTimestamp(),
            });

            setAdvertisement(prev => prev ? { ...prev, adProofUrl: downloadUrl, adProofDestinationUrl: adProofUrlInput } : null);

            toast({ title: 'Success!', description: 'Advertisement proof has been saved.' });

        } catch (error: any) {
            console.error("Error saving proof:", error);
            toast({ title: 'Upload Failed', description: error.message || 'Could not save the ad proof.', variant: 'destructive' });
        } finally {
            setIsSavingProof(false);
        }
    };
    
    const handleRequestApproval = async () => {
        if (!firestore || !user || !advertisement?.adProofUrl || !advertisement?.adProofDestinationUrl) {
            toast({ title: 'Error', description: 'A saved ad proof and destination URL are required before requesting approval.', variant: 'destructive' });
            return;
        }

        setIsRequestingApproval(true);
        try {
            const templateQuery = query(collection(firestore, 'emailTemplates'), where('id', '==', 'ad_proof_approval'));
            const templateSnapshot = await getDocs(templateQuery);
            if (templateSnapshot.empty) throw new Error("Ad proof approval email template not found.");
            
            const template = templateSnapshot.docs[0].data();
            const subject = template.subject.replace(/{{businessName}}/g, user.businessName || '');
            let html = template.html
                .replace(/{{contactName}}/g, user.contactName)
                .replace(/{{adProofUrl}}/g, advertisement.adProofUrl)
                .replace(/{{adProofDestinationUrl}}/g, advertisement.adProofDestinationUrl)
                .replace(/{{businessName}}/g, user.businessName || '');

            await sendEmail(firestore, { to: user.email, subject, html }, {
                recipientId: user.id,
                templateId: 'ad_proof_approval',
                triggerType: 'manual_send',
            });
            
            const adDocRef = doc(firestore, 'users', advertisement.userId, 'advertisements', advertisement.id);
            await updateDoc(adDocRef, {
                status: 'pending_customer_approval',
                updatedAt: serverTimestamp(),
            });

            setAdvertisement(prev => prev ? { ...prev, status: 'pending_customer_approval' } : null);

            toast({ title: 'Approval Requested', description: `An email has been sent to ${user.email}.` });
        } catch (error: any) {
            console.error("Error requesting approval:", error);
            toast({ title: 'Request Failed', description: error.message || 'Could not request approval.', variant: 'destructive' });
        } finally {
            setIsRequestingApproval(false);
        }
    };


    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    if (!advertisement || !user) {
        return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Not Found</AlertTitle><AlertDescription>The requested advertisement could not be found.</AlertDescription></Alert>;
    }


    return (
         <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Advertisements
            </Button>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Advertisement for {user.businessName}</CardTitle>
                            <CardDescription>Managing ad ticket ID: {advertisement.id}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground font-medium">Ad Status:</span>
                                <Badge variant={statusVariantMap[advertisement.status] || 'outline'}>
                                    {statusTextMap[advertisement.status] || advertisement.status}
                                </Badge>
                             </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Advertisement Proof</CardTitle>
                            <CardDescription>Upload the final ad creative and destination URL for customer approval.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {advertisement.adProofUrl && (
                                <div className="space-y-4">
                                    <h4 className="font-medium">Current Proof</h4>
                                    <div className="border rounded-lg p-4 flex flex-col items-center gap-4 bg-muted/30">
                                        <Image src={advertisement.adProofUrl} alt="Advertisement Proof" width={468} height={60} className="border bg-white" />
                                        <p className="text-xs text-muted-foreground break-all">
                                            Destination: <a href={advertisement.adProofDestinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{advertisement.adProofDestinationUrl}</a>
                                        </p>
                                    </div>
                                    <Button onClick={handleRequestApproval} disabled={isRequestingApproval}>
                                        {isRequestingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        {isRequestingApproval ? 'Sending...' : 'Request Customer Approval'}
                                    </Button>
                                </div>
                            )}
                            <div className="space-y-4">
                                <h4 className="font-medium">{advertisement.adProofUrl ? 'Upload New Proof' : 'Upload Proof'}</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="ad-proof-file">Ad Image File</Label>
                                    <Input id="ad-proof-file" type="file" accept="image/*" onChange={(e) => setAdProofFile(e.target.files?.[0] || null)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ad-proof-url">Ad Destination URL</Label>
                                    <Input id="ad-proof-url" type="text" placeholder="https://example.com" value={adProofUrlInput} onChange={(e) => setAdProofUrlInput(e.target.value)} />
                                </div>
                                <Button onClick={handleSaveProof} disabled={isSavingProof}>
                                    {isSavingProof ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {isSavingProof ? 'Saving...' : 'Save Proof'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Customer-Provided Ad Details</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-4">
                             <div className="flex items-start gap-2">
                                <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground font-medium">Ad Link URL</p>
                                    <p>{user.adWebsiteUrl ? <a href={user.adWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{user.adWebsiteUrl}</a> : 'Not Provided'}</p>
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
                </div>

                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
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
        </div>
    )

    