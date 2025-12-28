
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { doc, onSnapshot, collection, getDocs, getDoc, setDoc, query, where, addDoc, serverTimestamp, getDocsFromServer, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, AlertCircle, Save, FileText, Upload, CheckCircle, Clock, Palette, Image as ImageIcon, ArrowRight, ExternalLink, Info } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    AD_WORKFLOW_STEPS,
    AD_DIMENSIONS,
    calculateAutoApprovalDeadline,
    type AdStatus,
    type Advertisement
} from '@/lib/types';

interface Subscription {
    id: string;
    status: string;
    planName: string;
    price: string;
    periodEnd: string;
}

interface AdWithSubscription extends Advertisement {
    subscription?: Subscription;
}

// Business info schema
const businessInfoSchema = z.object({
    businessName: z.string().min(2, "Business name is required."),
    contactName: z.string().min(2, "Contact name is required."),
    phone: z.string().min(10, "A valid phone number is required."),
    adWebsiteUrl: z.string().url("Please enter a valid URL (e.g., https://example.com).").optional().or(z.literal('')),
    adText: z.string().optional(),
    adNotes: z.string().optional(),
});

// Ad designer schema
const adDesignerSchema = z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    fontStyle: z.enum(['modern', 'classic', 'bold', 'elegant']).optional(),
    additionalNotes: z.string().optional(),
});

type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;
type AdDesignerFormData = z.infer<typeof adDesignerSchema>;

// Workflow step component
function WorkflowProgress({ currentStatus }: { currentStatus: AdStatus }) {
    const steps = AD_WORKFLOW_STEPS;
    const currentIndex = steps.findIndex(step => step.id === currentStatus);

    // Handle non-standard statuses
    const getStepIndex = () => {
        if (currentStatus === 'approved') return steps.length - 1;
        if (currentStatus === 'live') return steps.length - 1;
        if (['paused', 'completed', 'canceled_inactive', 'revision_requested'].includes(currentStatus)) {
            return -1; // Show as special state
        }
        return currentIndex;
    };

    const stepIndex = getStepIndex();

    return (
        <div className="w-full">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = stepIndex > index;
                    const isActive = stepIndex === index;
                    const isPending = stepIndex < index;

                    return (
                        <div key={step.id} className="flex flex-col items-center text-center flex-1">
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                                isCompleted && "bg-green-500 border-green-500 text-white",
                                isActive && "bg-primary border-primary text-primary-foreground",
                                isPending && "bg-muted border-muted-foreground/30 text-muted-foreground"
                            )}>
                                {isCompleted ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    <span className="font-semibold text-sm">{index + 1}</span>
                                )}
                            </div>
                            <p className={cn(
                                "mt-2 text-xs font-medium hidden sm:block",
                                isActive && "text-primary",
                                isCompleted && "text-green-600",
                                isPending && "text-muted-foreground"
                            )}>
                                {step.title}
                            </p>
                            {index < steps.length - 1 && (
                                <div className="absolute" style={{ left: `calc(${(index + 0.5) / steps.length * 100}% + 24px)`, width: `calc(${100 / steps.length}% - 48px)` }}>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Progress line */}
            <div className="mt-3 relative h-1 bg-muted rounded-full overflow-hidden hidden sm:block">
                <div
                    className="absolute h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, (stepIndex / (steps.length - 1)) * 100)}%` }}
                />
            </div>
        </div>
    );
}

export default function AccountPage() {
    const { user } = useUser();
    const { firestore, storage } = useFirebase();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminLoading, setIsAdminLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [advertisements, setAdvertisements] = useState<AdWithSubscription[]>([]);
    const [subsLoading, setSubsLoading] = useState(true);
    const [subsError, setSubsError] = useState<string | null>(null);
    const { toast } = useToast();
    const [isSavingBusinessInfo, setIsSavingBusinessInfo] = useState(false);
    const [isSavingDesign, setIsSavingDesign] = useState(false);
    const [isUploadingSampleAd, setIsUploadingSampleAd] = useState(false);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [activeTab, setActiveTab] = useState('business-info');
    const [sampleAdPreview, setSampleAdPreview] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);

    const businessInfoForm = useForm<BusinessInfoFormData>({
        resolver: zodResolver(businessInfoSchema),
        defaultValues: {
            businessName: '',
            contactName: '',
            phone: '',
            adWebsiteUrl: '',
            adText: '',
            adNotes: '',
        }
    });

    const adDesignerForm = useForm<AdDesignerFormData>({
        resolver: zodResolver(adDesignerSchema),
        defaultValues: {
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            backgroundColor: '#FFFFFF',
            textColor: '#1F2937',
            fontStyle: 'modern',
            additionalNotes: '',
        }
    });

    // Reset forms when user data is loaded
    const resetForms = useCallback((userData: any) => {
        businessInfoForm.reset({
            businessName: userData.businessName || '',
            contactName: userData.contactName || '',
            phone: userData.phone || '',
            adWebsiteUrl: userData.adWebsiteUrl || '',
            adText: userData.adText || '',
            adNotes: userData.adNotes || '',
        });

        if (userData.designPreferences) {
            adDesignerForm.reset({
                primaryColor: userData.designPreferences.primaryColor || '#3B82F6',
                secondaryColor: userData.designPreferences.secondaryColor || '#10B981',
                backgroundColor: userData.designPreferences.backgroundColor || '#FFFFFF',
                textColor: userData.designPreferences.textColor || '#1F2937',
                fontStyle: userData.designPreferences.fontStyle || 'modern',
                additionalNotes: userData.designPreferences.additionalNotes || '',
            });
        }

        if (userData.customerSampleAdUrl) {
            setSampleAdPreview(userData.customerSampleAdUrl);
        }
        if (userData.fileUploads) {
            setUploadedFiles(userData.fileUploads);
        }
    }, [businessInfoForm, adDesignerForm]);

    useEffect(() => {
        if (!user || !firestore) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                resetForms(docSnap.data());
            }
        });

        const adminDocRef = doc(firestore, 'roles_admin', user.uid);
        const unsubAdmin = onSnapshot(adminDocRef, (docSnap) => {
            setIsAdmin(docSnap.exists());
            setIsAdminLoading(false);
        }, () => {
            setIsAdmin(false);
            setIsAdminLoading(false);
        });

        // Load subscriptions
        setSubsLoading(true);
        const subsCollectionRef = collection(firestore, 'customers', user.uid, 'subscriptions');
        const subsQuery = query(subsCollectionRef);

        const unsubSubs = onSnapshot(subsQuery, async (snapshot) => {
            const userDoc = await getDoc(userDocRef);
            const activeSubs = snapshot.docs.filter(doc =>
                doc.data().status === 'active' || doc.data().status === 'trialing'
            );

            // Check if onboarding should be shown
            if (activeSubs.length > 0) {
                if (userDoc.exists() && !userDoc.data().businessName) {
                    setShowOnboarding(true);
                } else {
                    setShowOnboarding(false);
                }
            } else {
                setShowOnboarding(false);
            }

            const subsData: Subscription[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const priceData = data.items?.[0]?.price;
                const periodEndDate = data.current_period_end?.seconds
                    ? new Date(data.current_period_end.seconds * 1000)
                    : new Date();
                const unitAmount = priceData?.unit_amount ?? 0;
                const currency = priceData?.currency || 'USD';
                const interval = priceData?.recurring?.interval || 'month';

                return {
                    id: doc.id,
                    status: data.status || 'unknown',
                    planName: data.items?.[0]?.price?.product?.name || 'N/A',
                    price: priceData
                        ? `${(unitAmount / 100).toLocaleString('en-US', { style: 'currency', currency })}/${interval}`
                        : 'N/A',
                    periodEnd: format(periodEndDate, 'MMM d, yyyy'),
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

        // Load advertisements
        const adsCollectionRef = collection(firestore, 'users', user.uid, 'advertisements');
        const unsubAds = onSnapshot(adsCollectionRef, (snapshot) => {
            const adsData: AdWithSubscription[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as AdWithSubscription));
            setAdvertisements(adsData);
        });

        return () => {
            unsubUser();
            unsubAdmin();
            unsubSubs();
            unsubAds();
        };
    }, [user, firestore, resetForms]);

    // Handle business info submission
    const onBusinessInfoSubmit = async (data: BusinessInfoFormData) => {
        if (!user || !firestore) return;
        setIsSavingBusinessInfo(true);

        const userDocRef = doc(firestore, 'users', user.uid);

        try {
            await setDoc(userDocRef, {
                ...data,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update any existing advertisements with this info
            const adsRef = collection(firestore, 'users', user.uid, 'advertisements');
            const adsSnapshot = await getDocs(adsRef);

            for (const adDoc of adsSnapshot.docs) {
                await updateDoc(doc(adsRef, adDoc.id), {
                    businessName: data.businessName,
                    contactName: data.contactName,
                    phone: data.phone,
                    email: user.email,
                    adWebsiteUrl: data.adWebsiteUrl,
                    adText: data.adText,
                    adNotes: data.adNotes,
                    updatedAt: serverTimestamp(),
                });
            }

            toast({
                title: "Business Info Saved",
                description: "Your business information has been updated successfully.",
            });

            // Move to next tab
            setActiveTab('ad-designer');
        } catch (error: any) {
            console.error("Error saving business info:", error);
            toast({
                title: "Save Error",
                description: "Could not save your details. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSavingBusinessInfo(false);
        }
    };

    // Handle sample ad upload
    const handleSampleAdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !firestore || !storage || !e.target.files?.[0]) return;

        const file = e.target.files[0];

        // Validate image dimensions
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        if (img.width !== AD_DIMENSIONS.WIDTH || img.height !== AD_DIMENSIONS.HEIGHT) {
            toast({
                title: "Invalid Dimensions",
                description: `Sample ad must be exactly ${AD_DIMENSIONS.WIDTH}x${AD_DIMENSIONS.HEIGHT} pixels. Your image is ${img.width}x${img.height} pixels.`,
                variant: "destructive",
            });
            return;
        }

        setIsUploadingSampleAd(true);

        try {
            const filePath = `advertisements/${user.uid}/sample-ad/${file.name}`;
            const fileRef = storageRef(storage, filePath);

            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            // Save to user document
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                customerSampleAdUrl: downloadUrl,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update all advertisements
            const adsRef = collection(firestore, 'users', user.uid, 'advertisements');
            const adsSnapshot = await getDocs(adsRef);
            for (const adDoc of adsSnapshot.docs) {
                await updateDoc(doc(adsRef, adDoc.id), {
                    customerSampleAdUrl: downloadUrl,
                    updatedAt: serverTimestamp(),
                });
            }

            setSampleAdPreview(downloadUrl);
            toast({
                title: "Sample Ad Uploaded",
                description: "Your sample advertisement has been uploaded successfully.",
            });
        } catch (error: any) {
            console.error("Error uploading sample ad:", error);
            toast({
                title: "Upload Error",
                description: "Could not upload your sample ad. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploadingSampleAd(false);
        }
    };

    // Handle additional file uploads (logos, images)
    const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !firestore || !storage || !e.target.files?.length) return;

        setIsUploadingFiles(true);
        const files = Array.from(e.target.files);

        try {
            const uploadPromises = files.map(async (file) => {
                const filePath = `advertisements/${user.uid}/uploads/${Date.now()}-${file.name}`;
                const fileRef = storageRef(storage, filePath);
                await uploadBytes(fileRef, file);
                return getDownloadURL(fileRef);
            });

            const newUrls = await Promise.all(uploadPromises);
            const allUrls = [...uploadedFiles, ...newUrls];

            // Save to user document
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                fileUploads: allUrls,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update advertisements
            const adsRef = collection(firestore, 'users', user.uid, 'advertisements');
            const adsSnapshot = await getDocs(adsRef);
            for (const adDoc of adsSnapshot.docs) {
                await updateDoc(doc(adsRef, adDoc.id), {
                    customerUploads: allUrls,
                    updatedAt: serverTimestamp(),
                });
            }

            setUploadedFiles(allUrls);
            toast({
                title: "Files Uploaded",
                description: `${files.length} file(s) uploaded successfully.`,
            });
        } catch (error: any) {
            console.error("Error uploading files:", error);
            toast({
                title: "Upload Error",
                description: "Could not upload files. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploadingFiles(false);
        }
    };

    // Handle ad designer submission
    const onAdDesignerSubmit = async (data: AdDesignerFormData) => {
        if (!user || !firestore) return;
        setIsSavingDesign(true);

        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                designPreferences: data,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update all advertisements with design preferences
            const adsRef = collection(firestore, 'users', user.uid, 'advertisements');
            const adsSnapshot = await getDocs(adsRef);
            for (const adDoc of adsSnapshot.docs) {
                await updateDoc(doc(adsRef, adDoc.id), {
                    designPreferences: data,
                    updatedAt: serverTimestamp(),
                });
            }

            toast({
                title: "Design Preferences Saved",
                description: "Your ad design preferences have been saved.",
            });
        } catch (error: any) {
            console.error("Error saving design preferences:", error);
            toast({
                title: "Save Error",
                description: "Could not save your design preferences. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSavingDesign(false);
        }
    };

    // Submit all info for review
    const handleSubmitForReview = async () => {
        if (!user || !firestore) {
            toast({
                title: "Error",
                description: "You must be logged in to submit. Please refresh the page.",
                variant: "destructive",
            });
            return;
        }

        const businessData = businessInfoForm.getValues();
        if (!businessData.businessName || !businessData.contactName || !businessData.phone) {
            toast({
                title: "Missing Information",
                description: "Please fill out all required business information before submitting.",
                variant: "destructive",
            });
            setActiveTab('business-info');
            return;
        }

        // Check for active subscriptions
        const activeSubs = subscriptions.filter(s =>
            s.status === 'active' || s.status === 'trialing'
        );

        if (activeSubs.length === 0) {
            toast({
                title: "No Active Subscription",
                description: "You need an active subscription to create an advertisement. Please subscribe first.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmittingForReview(true);

        try {
            // Update all pending advertisements to pending_internal_review
            const adsRef = collection(firestore, 'users', user.uid, 'advertisements');
            const adsSnapshot = await getDocs(adsRef);

            let adsUpdated = 0;
            for (const adDoc of adsSnapshot.docs) {
                const adData = adDoc.data();
                if (adData.status === 'pending_info' || adData.status === 'pending_ad_creation') {
                    await updateDoc(doc(adsRef, adDoc.id), {
                        status: 'pending_internal_review',
                        businessName: businessData.businessName,
                        contactName: businessData.contactName,
                        phone: businessData.phone,
                        email: user.email,
                        adWebsiteUrl: businessData.adWebsiteUrl,
                        adText: businessData.adText,
                        adNotes: businessData.adNotes,
                        designPreferences: adDesignerForm.getValues(),
                        customerSampleAdUrl: sampleAdPreview,
                        customerUploads: uploadedFiles,
                        infoSubmittedAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                    adsUpdated++;
                }
            }

            // If no ads exist, create one for each active subscription
            if (adsSnapshot.empty) {
                for (const sub of activeSubs) {
                    await addDoc(adsRef, {
                        userId: user.uid,
                        email: user.email,
                        subscriptionId: sub.id,
                        status: 'pending_internal_review',
                        businessName: businessData.businessName,
                        contactName: businessData.contactName,
                        phone: businessData.phone,
                        adWebsiteUrl: businessData.adWebsiteUrl,
                        adText: businessData.adText,
                        adNotes: businessData.adNotes,
                        designPreferences: adDesignerForm.getValues(),
                        customerSampleAdUrl: sampleAdPreview,
                        customerUploads: uploadedFiles,
                        infoSubmittedAt: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                    adsUpdated++;
                }
            }

            if (adsUpdated > 0) {
                toast({
                    title: "Submitted for Review",
                    description: "Your information has been submitted. Our team will begin working on your advertisement.",
                });
                setShowOnboarding(false);
            } else {
                toast({
                    title: "Already Submitted",
                    description: "Your advertisement is already in our review queue. We'll be in touch soon!",
                });
            }
        } catch (error: any) {
            console.error("Error submitting for review:", error);
            toast({
                title: "Submission Error",
                description: error.message || "Could not submit your information. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingForReview(false);
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

    // Find ads that need customer attention
    const pendingApprovalAds = advertisements.filter(ad =>
        ad.status === 'pending_customer_approval'
    );

    return (
        <div className="flex-1 space-y-6">
            {/* Pending Approval Alert */}
            {pendingApprovalAds.length > 0 && (
                <Alert className="border-primary border-2 bg-primary/5">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold text-lg">Action Required: Approve Your Advertisement</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>Your advertisement is ready for review! Please review and approve it so we can make it live.</p>
                        <Link href={`/approve-ad/${pendingApprovalAds[0].id}`}>
                            <Button size="sm" className="mt-2">
                                Review & Approve <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            {/* Onboarding prompt */}
            {showOnboarding && (
                <Alert className="border-primary border-2">
                    <FileText className="h-4 w-4" />
                    <AlertTitle className="font-bold text-lg">Welcome! Let's Get Your Ad Started</AlertTitle>
                    <AlertDescription>
                        Complete the steps below to provide us with the information we need to create your advertisement.
                    </AlertDescription>
                </Alert>
            )}

            {/* Header Card */}
            <Card>
                <CardHeader>
                    <CardTitle>My Account</CardTitle>
                    <CardDescription>Welcome, {user?.email}! Manage your account, subscriptions, and advertisements here.</CardDescription>
                </CardHeader>
            </Card>

            {/* Advertisement Workflow Section */}
            {advertisements.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Advertisement Status</CardTitle>
                        <CardDescription>Track the progress of your advertisement</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {advertisements.map((ad) => (
                            <div key={ad.id} className="space-y-4 p-4 border rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold">{ad.businessName || 'Your Advertisement'}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Created {ad.createdAt?.toDate ? formatDistanceToNow(ad.createdAt.toDate(), { addSuffix: true }) : 'recently'}
                                        </p>
                                    </div>
                                    <Badge variant={AD_STATUS_COLORS[ad.status]?.variant || 'outline'}>
                                        {AD_STATUS_LABELS[ad.status] || ad.status}
                                    </Badge>
                                </div>

                                <WorkflowProgress currentStatus={ad.status} />

                                {/* Show approval deadline if pending */}
                                {ad.status === 'pending_customer_approval' && ad.sentForApprovalAt && (
                                    <Alert className="bg-amber-50 border-amber-200">
                                        <Clock className="h-4 w-4 text-amber-600" />
                                        <AlertDescription className="text-amber-800">
                                            Auto-approval in {formatDistanceToNow(calculateAutoApprovalDeadline(ad.sentForApprovalAt))}.
                                            Please review and approve your ad before then.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Show live ad preview */}
                                {ad.status === 'live' && ad.adProofUrl && (
                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-700 font-medium mb-2">Your ad is live!</p>
                                        <Image
                                            src={ad.adProofUrl}
                                            alt="Your live advertisement"
                                            width={AD_DIMENSIONS.WIDTH}
                                            height={AD_DIMENSIONS.HEIGHT}
                                            className="border rounded"
                                        />
                                        {ad.adProofDestinationUrl && (
                                            <a
                                                href={ad.adProofDestinationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-green-600 hover:underline mt-2 flex items-center gap-1"
                                            >
                                                Links to: {ad.adProofDestinationUrl} <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Visual Ad Designer CTA - Show for active subscriptions */}
            {subscriptions.some(s => s.status === 'active' || s.status === 'trialing') && (
                <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            Create Your Own Ad
                        </CardTitle>
                        <CardDescription>
                            Use our visual ad designer to create a custom {AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT} ad yourself!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Drag and drop your logo and images
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Add and customize text with different fonts
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Resize and position elements freely
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Export as PNG or submit for review
                            </li>
                        </ul>
                        <Link href="/design-ad">
                            <Button className="w-full md:w-auto">
                                <Palette className="h-4 w-4 mr-2" />
                                Open Ad Designer
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Ad Designer Section - Show for active subscriptions */}
            {subscriptions.some(s => s.status === 'active' || s.status === 'trialing') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Advertisement Details</CardTitle>
                        <CardDescription>
                            Provide your business information and design preferences to help us create your perfect ad.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="business-info">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Business Info
                                </TabsTrigger>
                                <TabsTrigger value="ad-designer">
                                    <Palette className="h-4 w-4 mr-2" />
                                    Design Preferences
                                </TabsTrigger>
                                <TabsTrigger value="uploads">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Uploads
                                </TabsTrigger>
                            </TabsList>

                            {/* Business Info Tab */}
                            <TabsContent value="business-info" className="mt-6">
                                <form onSubmit={businessInfoForm.handleSubmit(onBusinessInfoSubmit)} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="businessName">Business Name *</Label>
                                            <Controller
                                                name="businessName"
                                                control={businessInfoForm.control}
                                                render={({ field }) => <Input id="businessName" {...field} />}
                                            />
                                            {businessInfoForm.formState.errors.businessName && (
                                                <p className="text-sm text-destructive">{businessInfoForm.formState.errors.businessName.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contactName">Contact Name *</Label>
                                            <Controller
                                                name="contactName"
                                                control={businessInfoForm.control}
                                                render={({ field }) => <Input id="contactName" {...field} />}
                                            />
                                            {businessInfoForm.formState.errors.contactName && (
                                                <p className="text-sm text-destructive">{businessInfoForm.formState.errors.contactName.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number *</Label>
                                            <Controller
                                                name="phone"
                                                control={businessInfoForm.control}
                                                render={({ field }) => <Input id="phone" {...field} />}
                                            />
                                            {businessInfoForm.formState.errors.phone && (
                                                <p className="text-sm text-destructive">{businessInfoForm.formState.errors.phone.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="adWebsiteUrl">Ad Link URL</Label>
                                            <Controller
                                                name="adWebsiteUrl"
                                                control={businessInfoForm.control}
                                                render={({ field }) => <Input id="adWebsiteUrl" placeholder="https://example.com" {...field} />}
                                            />
                                            {businessInfoForm.formState.errors.adWebsiteUrl && (
                                                <p className="text-sm text-destructive">{businessInfoForm.formState.errors.adWebsiteUrl.message}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">Where should your ad link to when clicked?</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="adText">Ad Text / Slogan</Label>
                                        <Controller
                                            name="adText"
                                            control={businessInfoForm.control}
                                            render={({ field }) => (
                                                <Textarea
                                                    id="adText"
                                                    placeholder="e.g., 'Serving Pasco County for 20 years!'"
                                                    {...field}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="adNotes">Additional Notes or Special Offers</Label>
                                        <Controller
                                            name="adNotes"
                                            control={businessInfoForm.control}
                                            render={({ field }) => (
                                                <Textarea
                                                    id="adNotes"
                                                    placeholder="e.g., 'Mention this ad for 10% off your first visit.'"
                                                    {...field}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <Button type="submit" disabled={isSavingBusinessInfo}>
                                            {isSavingBusinessInfo ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" /> Save & Continue
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>

                            {/* Ad Designer Tab */}
                            <TabsContent value="ad-designer" className="mt-6">
                                <form onSubmit={adDesignerForm.handleSubmit(onAdDesignerSubmit)} className="space-y-6">
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            Choose colors and styles that match your brand. Our design team will use these preferences when creating your ad.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="primaryColor">Primary Color</Label>
                                            <div className="flex gap-2">
                                                <Controller
                                                    name="primaryColor"
                                                    control={adDesignerForm.control}
                                                    render={({ field }) => (
                                                        <>
                                                            <Input
                                                                type="color"
                                                                className="w-12 h-10 p-1 cursor-pointer"
                                                                {...field}
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                className="flex-1"
                                                            />
                                                        </>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="secondaryColor">Secondary Color</Label>
                                            <div className="flex gap-2">
                                                <Controller
                                                    name="secondaryColor"
                                                    control={adDesignerForm.control}
                                                    render={({ field }) => (
                                                        <>
                                                            <Input
                                                                type="color"
                                                                className="w-12 h-10 p-1 cursor-pointer"
                                                                {...field}
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                className="flex-1"
                                                            />
                                                        </>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="backgroundColor">Background Color</Label>
                                            <div className="flex gap-2">
                                                <Controller
                                                    name="backgroundColor"
                                                    control={adDesignerForm.control}
                                                    render={({ field }) => (
                                                        <>
                                                            <Input
                                                                type="color"
                                                                className="w-12 h-10 p-1 cursor-pointer"
                                                                {...field}
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                className="flex-1"
                                                            />
                                                        </>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="textColor">Text Color</Label>
                                            <div className="flex gap-2">
                                                <Controller
                                                    name="textColor"
                                                    control={adDesignerForm.control}
                                                    render={({ field }) => (
                                                        <>
                                                            <Input
                                                                type="color"
                                                                className="w-12 h-10 p-1 cursor-pointer"
                                                                {...field}
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                className="flex-1"
                                                            />
                                                        </>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fontStyle">Font Style</Label>
                                        <Controller
                                            name="fontStyle"
                                            control={adDesignerForm.control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a font style" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="modern">Modern - Clean and contemporary</SelectItem>
                                                        <SelectItem value="classic">Classic - Traditional and timeless</SelectItem>
                                                        <SelectItem value="bold">Bold - Strong and impactful</SelectItem>
                                                        <SelectItem value="elegant">Elegant - Sophisticated and refined</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    {/* Color Preview */}
                                    <div className="space-y-2">
                                        <Label>Preview</Label>
                                        <div
                                            className="p-6 rounded-lg border"
                                            style={{
                                                backgroundColor: adDesignerForm.watch('backgroundColor'),
                                            }}
                                        >
                                            <div
                                                className="text-lg font-bold mb-2"
                                                style={{ color: adDesignerForm.watch('primaryColor') }}
                                            >
                                                Your Business Name
                                            </div>
                                            <div
                                                className="text-sm"
                                                style={{ color: adDesignerForm.watch('textColor') }}
                                            >
                                                Your tagline or message will appear here
                                            </div>
                                            <div
                                                className="mt-2 text-xs"
                                                style={{ color: adDesignerForm.watch('secondaryColor') }}
                                            >
                                                Call to action
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="additionalNotes">Additional Design Notes</Label>
                                        <Controller
                                            name="additionalNotes"
                                            control={adDesignerForm.control}
                                            render={({ field }) => (
                                                <Textarea
                                                    id="additionalNotes"
                                                    placeholder="Any other design preferences or notes for our team..."
                                                    {...field}
                                                />
                                            )}
                                        />
                                    </div>

                                    <Button type="submit" disabled={isSavingDesign}>
                                        {isSavingDesign ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" /> Save Design Preferences
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Uploads Tab */}
                            <TabsContent value="uploads" className="mt-6 space-y-6">
                                {/* Sample Ad Upload */}
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-lg">Sample Advertisement (Optional)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            If you have your own ad banner ready, upload it here. Must be exactly {AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT} pixels.
                                        </p>
                                    </div>

                                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                        {sampleAdPreview ? (
                                            <div className="space-y-4">
                                                <Image
                                                    src={sampleAdPreview}
                                                    alt="Sample ad preview"
                                                    width={AD_DIMENSIONS.WIDTH}
                                                    height={AD_DIMENSIONS.HEIGHT}
                                                    className="mx-auto border rounded"
                                                />
                                                <p className="text-sm text-green-600">Sample ad uploaded successfully!</p>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => document.getElementById('sample-ad-input')?.click()}
                                                    disabled={isUploadingSampleAd}
                                                >
                                                    Replace Sample Ad
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">Upload your sample ad</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Dimensions: {AD_DIMENSIONS.WIDTH} x {AD_DIMENSIONS.HEIGHT} pixels (PNG, JPG, GIF)
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => document.getElementById('sample-ad-input')?.click()}
                                                    disabled={isUploadingSampleAd}
                                                >
                                                    {isUploadingSampleAd ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="mr-2 h-4 w-4" /> Choose File
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                        <input
                                            id="sample-ad-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleSampleAdUpload}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Additional Files Upload */}
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-lg">Logos & Additional Images</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Upload your logo, product images, or any other assets you'd like us to use in your ad.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => document.getElementById('files-input')?.click()}
                                            disabled={isUploadingFiles}
                                        >
                                            {isUploadingFiles ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-2 h-4 w-4" /> Upload Files
                                                </>
                                            )}
                                        </Button>
                                        <input
                                            id="files-input"
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handleFilesUpload}
                                        />

                                        {uploadedFiles.length > 0 && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {uploadedFiles.map((url, index) => (
                                                    <div key={index} className="relative aspect-square border rounded-lg overflow-hidden">
                                                        <Image
                                                            src={url}
                                                            alt={`Upload ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Submit for Review Button */}
                                <div className="pt-4">
                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto"
                                        onClick={handleSubmitForReview}
                                        disabled={isSubmittingForReview}
                                    >
                                        {isSubmittingForReview ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Submit All Information for Review
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Once submitted, our team will review your information and begin creating your advertisement.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}

            {/* Subscriptions Card */}
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
                                        <Badge variant={getStatusBadgeVariant(sub.status)} className="capitalize mb-1">
                                            {sub.status}
                                        </Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {sub.status === 'active' || sub.status === 'trialing'
                                                ? `Renews on ${sub.periodEnd}`
                                                : `Ended on ${sub.periodEnd}`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!subsLoading && !subsError && subscriptions.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">You have no active subscriptions.</p>
                            <Link href="/pricing">
                                <Button>View Pricing Plans</Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Billing Management Card */}
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

            {/* Admin Tools */}
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
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
