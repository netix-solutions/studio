'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirebase } from '@/firebase';
import { goToBillingPortal } from '@/lib/stripe';
import { doc, onSnapshot, collection, getDocs, getDoc, setDoc, query, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, AlertCircle, Save, FileText, Upload, CheckCircle, Clock, Palette, Image as ImageIcon, ArrowRight, ArrowLeft, ExternalLink, Info, X, Pencil } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatPhoneNumber, fixUrl } from '@/lib/utils';
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

// Step 1: Ad Details schema
const adDetailsSchema = z.object({
    businessName: z.string().min(2, "Company name is required."),
    contactName: z.string().min(2, "Your name is required."),
    contactTitle: z.string().optional(),
    email: z.string().email("A valid email is required."),
    cellPhone: z.string().min(10, "A valid cell phone number is required."),
    businessPhone: z.string().optional(),
    adWebsiteUrl: z.string().url("Please enter a valid URL (e.g., https://example.com).").optional().or(z.literal('')),
});

// Step 3: Custom design request schema
const customDesignSchema = z.object({
    adTitle: z.string().min(1, "Title text is required."),
    adText: z.string().min(1, "Ad text is required."),
});

type AdDetailsFormData = z.infer<typeof adDetailsSchema>;
type CustomDesignFormData = z.infer<typeof customDesignSchema>;

// Wizard step type
type WizardStep = 'details' | 'designer' | 'custom-assets' | 'review' | 'submitted';

// Workflow progress component for existing ads
function WorkflowProgress({ currentStatus }: { currentStatus: AdStatus }) {
    const steps = AD_WORKFLOW_STEPS;
    const currentIndex = steps.findIndex(step => step.id === currentStatus);

    const getStepIndex = () => {
        if (currentStatus === 'approved') return steps.findIndex(s => s.id === 'holding');
        if (currentStatus === 'live') return steps.length - 1;
        if (['paused', 'completed', 'canceled_inactive', 'revision_requested'].includes(currentStatus)) {
            return -1;
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
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 relative h-1 bg-muted rounded-full overflow-hidden hidden sm:block">
                <div
                    className="absolute h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, (stepIndex / (steps.length - 1)) * 100)}%` }}
                />
            </div>
        </div>
    );
}

// Wizard step indicator
function WizardStepIndicator({ currentStep, requestCustomDesign }: { currentStep: WizardStep; requestCustomDesign: boolean }) {
    const getSteps = () => {
        if (requestCustomDesign) {
            return [
                { id: 'details', title: 'Ad Details', number: 1 },
                { id: 'designer', title: 'Design Choice', number: 2 },
                { id: 'custom-assets', title: 'Upload Assets', number: 3 },
                { id: 'review', title: 'Review', number: 4 },
            ];
        }
        return [
            { id: 'details', title: 'Ad Details', number: 1 },
            { id: 'designer', title: 'Design Your Ad', number: 2 },
            { id: 'review', title: 'Review', number: 3 },
        ];
    };

    const steps = getSteps();
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = currentIndex > index;
                    const isActive = currentIndex === index;
                    const isPending = currentIndex < index;

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
                                    <span className="font-semibold text-sm">{step.number}</span>
                                )}
                            </div>
                            <p className={cn(
                                "mt-2 text-xs font-medium",
                                isActive && "text-primary",
                                isCompleted && "text-green-600",
                                isPending && "text-muted-foreground"
                            )}>
                                {step.title}
                            </p>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 relative h-1 bg-muted rounded-full overflow-hidden">
                <div
                    className="absolute h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
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

    // Wizard state
    const [wizardStep, setWizardStep] = useState<WizardStep>('details');
    const [requestCustomDesign, setRequestCustomDesign] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [designedAdUrl, setDesignedAdUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [isSavingDetails, setIsSavingDetails] = useState(false);

    // Forms
    const adDetailsForm = useForm<AdDetailsFormData>({
        resolver: zodResolver(adDetailsSchema),
        defaultValues: {
            businessName: '',
            contactName: '',
            contactTitle: '',
            email: '',
            cellPhone: '',
            businessPhone: '',
            adWebsiteUrl: '',
        }
    });

    const customDesignForm = useForm<CustomDesignFormData>({
        resolver: zodResolver(customDesignSchema),
        defaultValues: {
            adTitle: '',
            adText: '',
        }
    });

    // Load user data
    const loadUserData = useCallback((userData: any) => {
        adDetailsForm.reset({
            businessName: userData.businessName || '',
            contactName: userData.contactName || '',
            contactTitle: userData.contactTitle || '',
            email: userData.email || user?.email || '',
            cellPhone: userData.cellPhone || userData.phone || '',
            businessPhone: userData.businessPhone || '',
            adWebsiteUrl: userData.adWebsiteUrl || '',
        });

        customDesignForm.reset({
            adTitle: userData.adTitle || '',
            adText: userData.adText || '',
        });

        if (userData.logoUrl) {
            setLogoUrl(userData.logoUrl);
        }
        if (userData.fileUploads || userData.customerUploads) {
            setUploadedImages(userData.fileUploads || userData.customerUploads || []);
        }
        if (userData.customerSampleAdUrl) {
            setDesignedAdUrl(userData.customerSampleAdUrl);
        }
        if (userData.requestCustomDesign !== undefined) {
            setRequestCustomDesign(userData.requestCustomDesign);
        }
    }, [adDetailsForm, customDesignForm, user?.email]);

    useEffect(() => {
        if (!user || !firestore) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                loadUserData(docSnap.data());
            } else {
                // Set email from auth
                adDetailsForm.setValue('email', user.email || '');
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

            // Show wizard for users with active subscriptions who haven't submitted yet
            if (activeSubs.length > 0) {
                if (userDoc.exists() && !userDoc.data().businessName) {
                    setShowWizard(true);
                } else {
                    setShowWizard(false);
                }
            } else {
                setShowWizard(false);
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
            const adsData: AdWithSubscription[] = snapshot.docs.map(adDoc => ({
                id: adDoc.id,
                ...adDoc.data(),
            } as AdWithSubscription));
            setAdvertisements(adsData);
        });

        return () => {
            unsubUser();
            unsubAdmin();
            unsubSubs();
            unsubAds();
        };
    }, [user, firestore, loadUserData, adDetailsForm]);

    // Auto-disable ads for cancelled subscriptions (separate effect to avoid infinite loop)
    useEffect(() => {
        if (!user || !firestore || subscriptions.length === 0 || advertisements.length === 0) return;

        const cancelledSubs = subscriptions.filter(s =>
            s.status === 'canceled' || s.status === 'unpaid' || s.status === 'past_due'
        );

        if (cancelledSubs.length === 0) return;

        const cancelledSubIds = new Set(cancelledSubs.map(s => s.id));

        // Find ads that should be disabled
        const disableAds = async () => {
            for (const ad of advertisements) {
                const shouldDisable =
                    cancelledSubIds.has(ad.subscriptionId) &&
                    ad.status !== 'canceled_inactive' &&
                    ad.status !== 'completed';

                if (shouldDisable) {
                    try {
                        const adDocRef = doc(firestore, 'users', user.uid, 'advertisements', ad.id);
                        await updateDoc(adDocRef, {
                            status: 'canceled_inactive',
                            canceledAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        });
                        console.log(`Auto-disabled ad ${ad.id} due to cancelled subscription`);
                    } catch (err) {
                        console.error(`Failed to auto-disable ad ${ad.id}:`, err);
                    }
                }
            }
        };

        disableAds();
    }, [user, firestore, subscriptions, advertisements]);

    // Handle Step 1: Save ad details
    const onAdDetailsSubmit = async (data: AdDetailsFormData) => {
        if (!user || !firestore) return;
        setIsSavingDetails(true);

        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                ...data,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            toast({
                title: "Details Saved",
                description: "Your ad details have been saved.",
            });

            setWizardStep('designer');
        } catch (error: any) {
            console.error("Error saving details:", error);
            toast({
                title: "Save Error",
                description: "Could not save your details. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSavingDetails(false);
        }
    };

    // Handle logo upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !firestore || !storage || !e.target.files?.[0]) return;

        const file = e.target.files[0];
        setIsUploading(true);

        try {
            const filePath = `advertisements/${user.uid}/logo/${Date.now()}-${file.name}`;
            const fileRef = storageRef(storage, filePath);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            // Save to user document
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                logoUrl: downloadUrl,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setLogoUrl(downloadUrl);
            toast({
                title: "Logo Uploaded",
                description: "Your logo has been uploaded successfully.",
            });
        } catch (error: any) {
            console.error("Error uploading logo:", error);
            toast({
                title: "Upload Error",
                description: "Could not upload your logo. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Handle image uploads (up to 3)
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !firestore || !storage || !e.target.files?.length) return;

        if (uploadedImages.length >= 3) {
            toast({
                title: "Maximum Images Reached",
                description: "You can upload up to 3 images.",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        const files = Array.from(e.target.files).slice(0, 3 - uploadedImages.length);

        try {
            const uploadPromises = files.map(async (file) => {
                const filePath = `advertisements/${user.uid}/images/${Date.now()}-${file.name}`;
                const fileRef = storageRef(storage, filePath);
                await uploadBytes(fileRef, file);
                return getDownloadURL(fileRef);
            });

            const newUrls = await Promise.all(uploadPromises);
            const allUrls = [...uploadedImages, ...newUrls].slice(0, 3);

            // Save to user document
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                fileUploads: allUrls,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setUploadedImages(allUrls);
            toast({
                title: "Images Uploaded",
                description: `${files.length} image(s) uploaded successfully.`,
            });
        } catch (error: any) {
            console.error("Error uploading images:", error);
            toast({
                title: "Upload Error",
                description: "Could not upload images. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Remove an uploaded image
    const handleRemoveImage = async (indexToRemove: number) => {
        if (!user || !firestore) return;

        const newImages = uploadedImages.filter((_, index) => index !== indexToRemove);
        setUploadedImages(newImages);

        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, {
            fileUploads: newImages,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    };

    // Save custom design form data
    const onCustomDesignSubmit = async (data: CustomDesignFormData) => {
        if (!user || !firestore) return;

        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                adTitle: data.adTitle,
                adText: data.adText,
                requestCustomDesign: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setWizardStep('review');
        } catch (error: any) {
            console.error("Error saving custom design info:", error);
            toast({
                title: "Save Error",
                description: "Could not save your information. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Final submission
    const handleFinalSubmit = async () => {
        if (!user || !firestore) {
            toast({
                title: "Error",
                description: "You must be logged in to submit. Please refresh the page.",
                variant: "destructive",
            });
            return;
        }

        const detailsData = adDetailsForm.getValues();
        if (!detailsData.businessName || !detailsData.contactName || !detailsData.cellPhone) {
            toast({
                title: "Missing Information",
                description: "Please fill out all required details before submitting.",
                variant: "destructive",
            });
            setWizardStep('details');
            return;
        }

        // Check for active subscriptions
        const activeSubs = subscriptions.filter(s =>
            s.status === 'active' || s.status === 'trialing'
        );

        if (activeSubs.length === 0) {
            toast({
                title: "No Active Subscription",
                description: "You need an active subscription to create an advertisement.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const customDesignData = customDesignForm.getValues();

            // Update user document
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                ...detailsData,
                adTitle: customDesignData.adTitle,
                adText: customDesignData.adText,
                requestCustomDesign,
                logoUrl,
                fileUploads: uploadedImages,
                customerSampleAdUrl: designedAdUrl,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Create or update advertisements
            const adsRef = collection(firestore, 'users', user.uid, 'advertisements');
            const adsSnapshot = await getDocs(adsRef);

            const adData = {
                businessName: detailsData.businessName,
                contactName: detailsData.contactName,
                contactTitle: detailsData.contactTitle,
                email: detailsData.email,
                cellPhone: detailsData.cellPhone,
                businessPhone: detailsData.businessPhone,
                adWebsiteUrl: detailsData.adWebsiteUrl,
                adTitle: customDesignData.adTitle,
                adText: customDesignData.adText,
                requestCustomDesign,
                logoUrl,
                customerUploads: uploadedImages,
                customerSampleAdUrl: designedAdUrl,
                status: 'pending_internal_review' as AdStatus,
                infoSubmittedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            let adsUpdated = 0;
            for (const adDoc of adsSnapshot.docs) {
                const existingData = adDoc.data();
                if (existingData.status === 'pending_info' || existingData.status === 'pending_ad_creation') {
                    await updateDoc(doc(adsRef, adDoc.id), adData);
                    adsUpdated++;
                }
            }

            // If no ads exist, create one for each active subscription
            if (adsSnapshot.empty) {
                for (const sub of activeSubs) {
                    await addDoc(adsRef, {
                        ...adData,
                        userId: user.uid,
                        subscriptionId: sub.id,
                        createdAt: serverTimestamp(),
                    });
                    adsUpdated++;
                }
            }

            toast({
                title: "Submitted Successfully!",
                description: "Your ad information has been submitted. Our team will begin working on your advertisement.",
            });

            setWizardStep('submitted');
            setShowWizard(false);
        } catch (error: any) {
            console.error("Error submitting:", error);
            toast({
                title: "Submission Error",
                description: error.message || "Could not submit your information. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
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
                description: `${syncedCount} new customer record(s) created.`
            });

        } catch (error: any) {
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

    const hasActiveSubscription = subscriptions.some(s => s.status === 'active' || s.status === 'trialing');

    // Render wizard step content
    const renderWizardStep = () => {
        switch (wizardStep) {
            case 'details':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Step 1: Ad Details
                            </CardTitle>
                            <CardDescription>
                                Tell us about your business so we can create the perfect ad for you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={adDetailsForm.handleSubmit(onAdDetailsSubmit)} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="businessName">Company Name *</Label>
                                        <Controller
                                            name="businessName"
                                            control={adDetailsForm.control}
                                            render={({ field }) => <Input id="businessName" {...field} />}
                                        />
                                        {adDetailsForm.formState.errors.businessName && (
                                            <p className="text-sm text-destructive">{adDetailsForm.formState.errors.businessName.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Controller
                                            name="email"
                                            control={adDetailsForm.control}
                                            render={({ field }) => <Input id="email" type="email" {...field} />}
                                        />
                                        {adDetailsForm.formState.errors.email && (
                                            <p className="text-sm text-destructive">{adDetailsForm.formState.errors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cellPhone">Cell Phone *</Label>
                                        <Controller
                                            name="cellPhone"
                                            control={adDetailsForm.control}
                                            render={({ field }) => (
                                                <Input
                                                    id="cellPhone"
                                                    placeholder="(555) 123-4567"
                                                    {...field}
                                                    onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                                />
                                            )}
                                        />
                                        {adDetailsForm.formState.errors.cellPhone && (
                                            <p className="text-sm text-destructive">{adDetailsForm.formState.errors.cellPhone.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactName">Your Name *</Label>
                                        <Controller
                                            name="contactName"
                                            control={adDetailsForm.control}
                                            render={({ field }) => <Input id="contactName" {...field} />}
                                        />
                                        {adDetailsForm.formState.errors.contactName && (
                                            <p className="text-sm text-destructive">{adDetailsForm.formState.errors.contactName.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactTitle">Title</Label>
                                        <Controller
                                            name="contactTitle"
                                            control={adDetailsForm.control}
                                            render={({ field }) => <Input id="contactTitle" placeholder="e.g., Owner, Manager" {...field} />}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="businessPhone">Business Phone</Label>
                                        <Controller
                                            name="businessPhone"
                                            control={adDetailsForm.control}
                                            render={({ field }) => (
                                                <Input
                                                    id="businessPhone"
                                                    placeholder="(555) 123-4567"
                                                    {...field}
                                                    onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="adWebsiteUrl">Website URL (where your ad should link to)</Label>
                                        <Controller
                                            name="adWebsiteUrl"
                                            control={adDetailsForm.control}
                                            render={({ field }) => (
                                                <Input
                                                    id="adWebsiteUrl"
                                                    placeholder="https://example.com"
                                                    {...field}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        if (e.target.value) {
                                                            field.onChange(fixUrl(e.target.value));
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                        {adDetailsForm.formState.errors.adWebsiteUrl && (
                                            <p className="text-sm text-destructive">{adDetailsForm.formState.errors.adWebsiteUrl.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSavingDetails}>
                                        {isSavingDetails ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                Continue <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'designer':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Step 2: Create Your Ad
                            </CardTitle>
                            <CardDescription>
                                Design your own ad or let us create one for you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Option 1: Design your own */}
                            <div className={cn(
                                "p-6 border-2 rounded-lg transition-all cursor-pointer",
                                !requestCustomDesign ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                            )}
                                onClick={() => setRequestCustomDesign(false)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "h-6 w-6 rounded-full border-2 flex items-center justify-center",
                                        !requestCustomDesign ? "border-primary bg-primary" : "border-muted-foreground"
                                    )}>
                                        {!requestCustomDesign && <CheckCircle className="h-4 w-4 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-lg">Design Your Own Ad</h4>
                                        <p className="text-muted-foreground mt-1">
                                            Use our visual ad designer to create a custom {AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT} ad. Add your logo, images, and text.
                                        </p>
                                        <ul className="text-sm text-muted-foreground mt-3 space-y-1">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                Drag and drop interface
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                Multiple fonts and colors
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                Preview and export
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Option 2: Request custom design */}
                            <div className={cn(
                                "p-6 border-2 rounded-lg transition-all cursor-pointer",
                                requestCustomDesign ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                            )}
                                onClick={() => setRequestCustomDesign(true)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "h-6 w-6 rounded-full border-2 flex items-center justify-center",
                                        requestCustomDesign ? "border-primary bg-primary" : "border-muted-foreground"
                                    )}>
                                        {requestCustomDesign && <CheckCircle className="h-4 w-4 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-lg">Request Custom Ad Design</h4>
                                            <Badge variant="secondary">Free</Badge>
                                        </div>
                                        <p className="text-muted-foreground mt-1">
                                            Let our professional design team create your ad. Just provide your logo, images, and text.
                                        </p>
                                        <ul className="text-sm text-muted-foreground mt-3 space-y-1">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                Professional design team
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                Quick turnaround
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                Unlimited revisions
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setWizardStep('details')}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                {!requestCustomDesign ? (
                                    <Link href="/design-ad">
                                        <Button>
                                            <Palette className="mr-2 h-4 w-4" />
                                            Open Ad Designer
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button onClick={() => setWizardStep('custom-assets')}>
                                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {!requestCustomDesign && designedAdUrl && (
                                <div className="pt-4 border-t">
                                    <Alert>
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertTitle>You've already designed an ad!</AlertTitle>
                                        <AlertDescription className="flex flex-col gap-4">
                                            <p>Your designed ad is ready for review.</p>
                                            <Image
                                                src={designedAdUrl}
                                                alt="Your designed ad"
                                                width={AD_DIMENSIONS.WIDTH / 2}
                                                height={AD_DIMENSIONS.HEIGHT / 2}
                                                className="border rounded"
                                            />
                                            <Button onClick={() => setWizardStep('review')} className="w-fit">
                                                Continue to Review <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );

            case 'custom-assets':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Step 3: Upload Your Assets
                            </CardTitle>
                            <CardDescription>
                                Provide your logo, images, and ad text for our design team.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={customDesignForm.handleSubmit(onCustomDesignSubmit)} className="space-y-6">
                                {/* Logo Upload */}
                                <div className="space-y-4">
                                    <Label>Your Logo</Label>
                                    <div className="flex items-center gap-4">
                                        {logoUrl ? (
                                            <div className="relative">
                                                <Image
                                                    src={logoUrl}
                                                    alt="Logo"
                                                    width={120}
                                                    height={120}
                                                    className="border rounded object-contain"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-6 w-6"
                                                    onClick={() => setLogoUrl(null)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed rounded-lg p-8 text-center flex-1">
                                                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                                <p className="text-sm text-muted-foreground mb-2">Upload your logo</p>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => document.getElementById('logo-input')?.click()}
                                                    disabled={isUploading}
                                                >
                                                    {isUploading ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="mr-2 h-4 w-4" />
                                                    )}
                                                    Choose File
                                                </Button>
                                            </div>
                                        )}
                                        <input
                                            id="logo-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoUpload}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Image Uploads */}
                                <div className="space-y-4">
                                    <Label>Additional Images (up to 3)</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {uploadedImages.map((url, index) => (
                                            <div key={index} className="relative aspect-square border rounded-lg overflow-hidden">
                                                <Image
                                                    src={url}
                                                    alt={`Image ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-1 right-1 h-6 w-6"
                                                    onClick={() => handleRemoveImage(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {uploadedImages.length < 3 && (
                                            <div
                                                className="border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                                                onClick={() => document.getElementById('images-input')?.click()}
                                            >
                                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                                <span className="text-sm text-muted-foreground">Add Image</span>
                                            </div>
                                        )}
                                        <input
                                            id="images-input"
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handleImageUpload}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Upload product photos, team photos, or any other images you'd like in your ad.
                                    </p>
                                </div>

                                <Separator />

                                {/* Ad Text */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="adTitle">Title Text *</Label>
                                        <Controller
                                            name="adTitle"
                                            control={customDesignForm.control}
                                            render={({ field }) => (
                                                <Input
                                                    id="adTitle"
                                                    placeholder="e.g., Best Pizza in Town!"
                                                    {...field}
                                                />
                                            )}
                                        />
                                        {customDesignForm.formState.errors.adTitle && (
                                            <p className="text-sm text-destructive">{customDesignForm.formState.errors.adTitle.message}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">The main headline for your ad</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="adText">Ad Text *</Label>
                                        <Controller
                                            name="adText"
                                            control={customDesignForm.control}
                                            render={({ field }) => (
                                                <Textarea
                                                    id="adText"
                                                    placeholder="e.g., Serving the community for 20 years! Call now for a free quote."
                                                    rows={3}
                                                    {...field}
                                                />
                                            )}
                                        />
                                        {customDesignForm.formState.errors.adText && (
                                            <p className="text-sm text-destructive">{customDesignForm.formState.errors.adText.message}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">Supporting text, taglines, or call to action</p>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setWizardStep('designer')}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button type="submit">
                                        Continue to Review <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'review':
                const detailsData = adDetailsForm.getValues();
                const customData = customDesignForm.getValues();

                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                Review Your Submission
                            </CardTitle>
                            <CardDescription>
                                Please review your information before submitting.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Business Details */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Business Details</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setWizardStep('details')}>
                                        <Pencil className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Company</p>
                                        <p className="font-medium">{detailsData.businessName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{detailsData.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Contact</p>
                                        <p className="font-medium">{detailsData.contactName} {detailsData.contactTitle && `(${detailsData.contactTitle})`}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Cell Phone</p>
                                        <p className="font-medium">{detailsData.cellPhone}</p>
                                    </div>
                                    {detailsData.businessPhone && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Business Phone</p>
                                            <p className="font-medium">{detailsData.businessPhone}</p>
                                        </div>
                                    )}
                                    {detailsData.adWebsiteUrl && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Website</p>
                                            <p className="font-medium truncate">{detailsData.adWebsiteUrl}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Ad Design */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Ad Design</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setWizardStep('designer')}>
                                        <Pencil className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                </div>

                                {requestCustomDesign ? (
                                    <div className="p-4 bg-muted rounded-lg space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">Custom Design Requested</Badge>
                                            <span className="text-sm text-muted-foreground">Our team will design your ad</span>
                                        </div>

                                        {logoUrl && (
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-2">Logo</p>
                                                <Image
                                                    src={logoUrl}
                                                    alt="Logo"
                                                    width={100}
                                                    height={100}
                                                    className="border rounded object-contain"
                                                />
                                            </div>
                                        )}

                                        {uploadedImages.length > 0 && (
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-2">Images</p>
                                                <div className="flex gap-2">
                                                    {uploadedImages.map((url, index) => (
                                                        <Image
                                                            key={index}
                                                            src={url}
                                                            alt={`Image ${index + 1}`}
                                                            width={80}
                                                            height={80}
                                                            className="border rounded object-cover"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {customData.adTitle && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Title Text</p>
                                                <p className="font-medium">{customData.adTitle}</p>
                                            </div>
                                        )}

                                        {customData.adText && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Ad Text</p>
                                                <p className="font-medium">{customData.adText}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-muted rounded-lg">
                                        {designedAdUrl ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary">Self-Designed Ad</Badge>
                                                </div>
                                                <Image
                                                    src={designedAdUrl}
                                                    alt="Your designed ad"
                                                    width={AD_DIMENSIONS.WIDTH}
                                                    height={AD_DIMENSIONS.HEIGHT}
                                                    className="border rounded"
                                                />
                                            </div>
                                        ) : (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>No Ad Designed</AlertTitle>
                                                <AlertDescription>
                                                    You haven't designed an ad yet. Please go back and design your ad or request a custom design.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setWizardStep(requestCustomDesign ? 'custom-assets' : 'designer')}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting || (!requestCustomDesign && !designedAdUrl)}
                                    size="lg"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Submit for Review
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case 'submitted':
                return (
                    <Card className="text-center">
                        <CardHeader>
                            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl">Successfully Submitted!</CardTitle>
                            <CardDescription>
                                Your ad information has been submitted to our team.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                We'll review your submission and get started on your advertisement.
                                You'll receive an email when your ad proof is ready for approval.
                            </p>
                            <Alert>
                                <Clock className="h-4 w-4" />
                                <AlertTitle>What's Next?</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                                        <li>Our team will review your submission</li>
                                        <li>We'll create or finalize your ad design</li>
                                        <li>You'll receive an email to approve the final ad</li>
                                        <li>Once approved, your ad goes live!</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );
        }
    };

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

            {/* Header Card */}
            <Card>
                <CardHeader>
                    <CardTitle>My Account</CardTitle>
                    <CardDescription>Welcome, {user?.email}! Manage your account, subscriptions, and advertisements here.</CardDescription>
                </CardHeader>
            </Card>

            {/* Wizard for new users with active subscription */}
            {hasActiveSubscription && (showWizard || wizardStep !== 'details') && advertisements.filter(a => a.status !== 'pending_info').length === 0 && (
                <>
                    <Alert className="border-primary border-2">
                        <FileText className="h-4 w-4" />
                        <AlertTitle className="font-bold text-lg">Welcome! Let's Get Your Ad Started</AlertTitle>
                        <AlertDescription>
                            Complete the steps below to create your advertisement.
                        </AlertDescription>
                    </Alert>

                    <WizardStepIndicator currentStep={wizardStep} requestCustomDesign={requestCustomDesign} />

                    {renderWizardStep()}
                </>
            )}

            {/* Advertisement Workflow Section - for existing ads */}
            {advertisements.length > 0 && advertisements.some(a => a.status !== 'pending_info') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Advertisement Status</CardTitle>
                        <CardDescription>Track the progress of your advertisement</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {advertisements.filter(a => a.status !== 'pending_info').map((ad) => (
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
                                {(ad.status === 'live' || ad.status === 'holding') && ad.adProofUrl && (
                                    <div className={cn(
                                        "mt-4 p-4 border rounded-lg",
                                        ad.status === 'live' ? "bg-green-50 border-green-200" : "bg-cyan-50 border-cyan-200"
                                    )}>
                                        <p className={cn(
                                            "text-sm font-medium mb-2",
                                            ad.status === 'live' ? "text-green-700" : "text-cyan-700"
                                        )}>
                                            {ad.status === 'live' ? 'Your ad is live!' : 'Your ad is approved and awaiting final settings.'}
                                        </p>
                                        <Image
                                            src={ad.adProofUrl}
                                            alt="Your advertisement"
                                            width={AD_DIMENSIONS.WIDTH}
                                            height={AD_DIMENSIONS.HEIGHT}
                                            className="border rounded"
                                        />
                                        {ad.adProofDestinationUrl && (
                                            <a
                                                href={ad.adProofDestinationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={cn(
                                                    "text-sm hover:underline mt-2 flex items-center gap-1",
                                                    ad.status === 'live' ? "text-green-600" : "text-cyan-600"
                                                )}
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
