'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirebase } from '@/firebase';
import { doc, onSnapshot, collection, getDocs, getDoc, setDoc, query, updateDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    Loader2, AlertCircle, Save, FileText, Upload, CheckCircle, Clock,
    Palette, Image as ImageIcon, ArrowRight, ArrowLeft, ExternalLink,
    Info, X, Pencil, Search, Users, ChevronRight, RotateCcw, Play,
    UserCircle, Mail, Phone, Building, Link as LinkIcon, MessageSquare
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
    AD_STATUSES,
    AD_STATUS_LABELS,
    AD_STATUS_COLORS,
    AD_WORKFLOW_STEPS,
    AD_DIMENSIONS,
    type AdStatus,
    type Advertisement
} from '@/lib/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';

interface CustomerData {
    id: string;
    email: string;
    businessName?: string;
    contactName?: string;
    contactTitle?: string;
    cellPhone?: string;
    businessPhone?: string;
    adWebsiteUrl?: string;
    adTitle?: string;
    adText?: string;
    logoUrl?: string;
    fileUploads?: string[];
    customerSampleAdUrl?: string;
    requestCustomDesign?: boolean;
    createdAt?: any;
    updatedAt?: any;
}

interface CustomerSubscription {
    id: string;
    status: string;
    planName: string;
    price: string;
    periodEnd: string;
}

interface CustomerAd extends Advertisement {
    subscription?: CustomerSubscription;
}

// Form schemas
const customerDetailsSchema = z.object({
    businessName: z.string().min(2, "Company name is required."),
    contactName: z.string().min(2, "Contact name is required."),
    contactTitle: z.string().optional(),
    email: z.string().email("A valid email is required."),
    cellPhone: z.string().min(10, "A valid cell phone number is required."),
    businessPhone: z.string().optional(),
    adWebsiteUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
});

const adContentSchema = z.object({
    adTitle: z.string().optional(),
    adText: z.string().optional(),
});

type CustomerDetailsFormData = z.infer<typeof customerDetailsSchema>;
type AdContentFormData = z.infer<typeof adContentSchema>;

// Wizard step type for admin
type AdminWizardStep = 'select-customer' | 'details' | 'assets' | 'ad-status' | 'summary';

// Workflow progress component
function WorkflowProgress({ currentStatus, onStatusChange }: { currentStatus: AdStatus; onStatusChange?: (status: AdStatus) => void }) {
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
                        <div
                            key={step.id}
                            className={cn(
                                "flex flex-col items-center text-center flex-1",
                                onStatusChange && "cursor-pointer hover:opacity-80 transition-opacity"
                            )}
                            onClick={() => onStatusChange?.(step.id as AdStatus)}
                        >
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

// Admin wizard step indicator
function AdminWizardStepIndicator({ currentStep }: { currentStep: AdminWizardStep }) {
    const steps = [
        { id: 'select-customer', title: 'Select Customer', number: 1 },
        { id: 'details', title: 'Business Details', number: 2 },
        { id: 'assets', title: 'Assets', number: 3 },
        { id: 'ad-status', title: 'Ad Status', number: 4 },
        { id: 'summary', title: 'Summary', number: 5 },
    ];

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

export default function CustomerWorkflowPage() {
    const { user } = useUser();
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();

    // Admin wizard state
    const [wizardStep, setWizardStep] = useState<AdminWizardStep>('select-customer');

    // Customer selection
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

    // Customer data
    const [customerSubscriptions, setCustomerSubscriptions] = useState<CustomerSubscription[]>([]);
    const [customerAds, setCustomerAds] = useState<CustomerAd[]>([]);
    const [selectedAd, setSelectedAd] = useState<CustomerAd | null>(null);

    // Assets state
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [designedAdUrl, setDesignedAdUrl] = useState<string | null>(null);
    const [requestCustomDesign, setRequestCustomDesign] = useState(false);

    // Loading states
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Dialogs
    const [statusChangeDialog, setStatusChangeDialog] = useState<{ open: boolean; targetStatus: AdStatus | null }>({
        open: false,
        targetStatus: null,
    });

    // Forms
    const customerDetailsForm = useForm<CustomerDetailsFormData>({
        resolver: zodResolver(customerDetailsSchema),
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

    const adContentForm = useForm<AdContentFormData>({
        resolver: zodResolver(adContentSchema),
        defaultValues: {
            adTitle: '',
            adText: '',
        }
    });

    // Load all customers
    useEffect(() => {
        if (!firestore) return;

        const loadCustomers = async () => {
            setIsLoadingCustomers(true);
            try {
                const usersRef = collection(firestore, 'users');
                const usersSnapshot = await getDocs(usersRef);

                const customerList: CustomerData[] = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    email: doc.data().email || '',
                    ...doc.data(),
                }));

                // Sort by most recent first
                customerList.sort((a, b) => {
                    const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
                    const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
                    return bTime - aTime;
                });

                setCustomers(customerList);
            } catch (error) {
                console.error('Error loading customers:', error);
                toast({
                    title: "Error",
                    description: "Could not load customers. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingCustomers(false);
            }
        };

        loadCustomers();
    }, [firestore, toast]);

    // Load selected customer's data
    const loadCustomerData = useCallback(async (customer: CustomerData) => {
        if (!firestore) return;

        try {
            // Load subscriptions
            const subsRef = collection(firestore, 'customers', customer.id, 'subscriptions');
            const subsSnapshot = await getDocs(subsRef);

            const subs: CustomerSubscription[] = subsSnapshot.docs.map(doc => {
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
                    planName: data.items?.[0]?.price?.product?.name || (data.isManualEntry ? 'Manual Entry' : 'N/A'),
                    price: priceData
                        ? `${(unitAmount / 100).toLocaleString('en-US', { style: 'currency', currency })}/${interval}`
                        : (data.isManualEntry ? 'Manual' : 'N/A'),
                    periodEnd: format(periodEndDate, 'MMM d, yyyy'),
                };
            });

            setCustomerSubscriptions(subs);

            // Load advertisements
            const adsRef = collection(firestore, 'users', customer.id, 'advertisements');
            const adsSnapshot = await getDocs(adsRef);

            const ads: CustomerAd[] = adsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as CustomerAd));

            setCustomerAds(ads);

            // Select first ad if available
            if (ads.length > 0) {
                setSelectedAd(ads[0]);
            }

            // Populate forms with customer data
            customerDetailsForm.reset({
                businessName: customer.businessName || '',
                contactName: customer.contactName || '',
                contactTitle: customer.contactTitle || '',
                email: customer.email || '',
                cellPhone: customer.cellPhone || '',
                businessPhone: customer.businessPhone || '',
                adWebsiteUrl: customer.adWebsiteUrl || '',
            });

            adContentForm.reset({
                adTitle: customer.adTitle || '',
                adText: customer.adText || '',
            });

            // Set assets
            setLogoUrl(customer.logoUrl || null);
            setUploadedImages(customer.fileUploads || []);
            setDesignedAdUrl(customer.customerSampleAdUrl || null);
            setRequestCustomDesign(customer.requestCustomDesign || false);

        } catch (error) {
            console.error('Error loading customer data:', error);
            toast({
                title: "Error",
                description: "Could not load customer data. Please try again.",
                variant: "destructive",
            });
        }
    }, [firestore, customerDetailsForm, adContentForm, toast]);

    // Handle customer selection
    const handleSelectCustomer = (customer: CustomerData) => {
        setSelectedCustomer(customer);
        setCustomerSearchOpen(false);
        loadCustomerData(customer);
        setWizardStep('details');
    };

    // Filter customers based on search
    const filteredCustomers = customers.filter(customer => {
        const query = searchQuery.toLowerCase();
        return (
            (customer.email?.toLowerCase() || '').includes(query) ||
            (customer.businessName?.toLowerCase() || '').includes(query) ||
            (customer.contactName?.toLowerCase() || '').includes(query)
        );
    });

    // Save customer details
    const handleSaveDetails = async (data: CustomerDetailsFormData) => {
        if (!selectedCustomer || !firestore) return;
        setIsSaving(true);

        try {
            const userDocRef = doc(firestore, 'users', selectedCustomer.id);
            await setDoc(userDocRef, {
                ...data,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Also update any pending ads
            if (customerAds.length > 0) {
                for (const ad of customerAds) {
                    const adRef = doc(firestore, 'users', selectedCustomer.id, 'advertisements', ad.id);
                    await updateDoc(adRef, {
                        businessName: data.businessName,
                        contactName: data.contactName,
                        contactTitle: data.contactTitle,
                        email: data.email,
                        cellPhone: data.cellPhone,
                        businessPhone: data.businessPhone,
                        adWebsiteUrl: data.adWebsiteUrl,
                        updatedAt: serverTimestamp(),
                    });
                }
            }

            toast({
                title: "Details Saved",
                description: "Customer details have been updated.",
            });

            setWizardStep('assets');
        } catch (error: any) {
            console.error("Error saving details:", error);
            toast({
                title: "Save Error",
                description: "Could not save customer details. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle logo upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedCustomer || !firestore || !storage || !e.target.files?.[0]) return;

        const file = e.target.files[0];
        setIsUploading(true);

        try {
            const filePath = `advertisements/${selectedCustomer.id}/logo/${Date.now()}-${file.name}`;
            const fileRef = storageRef(storage, filePath);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            // Save to user document
            const userDocRef = doc(firestore, 'users', selectedCustomer.id);
            await setDoc(userDocRef, {
                logoUrl: downloadUrl,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setLogoUrl(downloadUrl);
            toast({
                title: "Logo Uploaded",
                description: "Logo has been uploaded successfully.",
            });
        } catch (error: any) {
            console.error("Error uploading logo:", error);
            toast({
                title: "Upload Error",
                description: "Could not upload logo. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Handle image uploads
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedCustomer || !firestore || !storage || !e.target.files?.length) return;

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
                const filePath = `advertisements/${selectedCustomer.id}/images/${Date.now()}-${file.name}`;
                const fileRef = storageRef(storage, filePath);
                await uploadBytes(fileRef, file);
                return getDownloadURL(fileRef);
            });

            const newUrls = await Promise.all(uploadPromises);
            const allUrls = [...uploadedImages, ...newUrls].slice(0, 3);

            // Save to user document
            const userDocRef = doc(firestore, 'users', selectedCustomer.id);
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
        if (!selectedCustomer || !firestore) return;

        const newImages = uploadedImages.filter((_, index) => index !== indexToRemove);
        setUploadedImages(newImages);

        const userDocRef = doc(firestore, 'users', selectedCustomer.id);
        await setDoc(userDocRef, {
            fileUploads: newImages,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    };

    // Save ad content
    const handleSaveAdContent = async () => {
        if (!selectedCustomer || !firestore) return;
        setIsSaving(true);

        try {
            const data = adContentForm.getValues();
            const userDocRef = doc(firestore, 'users', selectedCustomer.id);
            await setDoc(userDocRef, {
                adTitle: data.adTitle,
                adText: data.adText,
                requestCustomDesign,
                logoUrl,
                fileUploads: uploadedImages,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update ads
            for (const ad of customerAds) {
                const adRef = doc(firestore, 'users', selectedCustomer.id, 'advertisements', ad.id);
                await updateDoc(adRef, {
                    adTitle: data.adTitle,
                    adText: data.adText,
                    requestCustomDesign,
                    logoUrl,
                    customerUploads: uploadedImages,
                    updatedAt: serverTimestamp(),
                });
            }

            toast({
                title: "Assets Saved",
                description: "Ad content and assets have been saved.",
            });

            setWizardStep('ad-status');
        } catch (error: any) {
            console.error("Error saving ad content:", error);
            toast({
                title: "Save Error",
                description: "Could not save ad content. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle status change
    const handleStatusChange = async (newStatus: AdStatus) => {
        if (!selectedAd || !selectedCustomer || !firestore) return;
        setIsUpdatingStatus(true);

        try {
            const adRef = doc(firestore, 'users', selectedCustomer.id, 'advertisements', selectedAd.id);

            const updateData: any = {
                status: newStatus,
                updatedAt: serverTimestamp(),
            };

            // Add timestamps for specific status changes
            switch (newStatus) {
                case 'pending_internal_review':
                    updateData.infoSubmittedAt = serverTimestamp();
                    break;
                case 'pending_ad_creation':
                    updateData.sentForReviewAt = serverTimestamp();
                    break;
                case 'pending_customer_approval':
                    updateData.sentForApprovalAt = serverTimestamp();
                    break;
                case 'approved':
                case 'holding':
                    updateData.approvedAt = serverTimestamp();
                    updateData.holdingAt = serverTimestamp();
                    break;
                case 'live':
                    updateData.liveAt = serverTimestamp();
                    break;
            }

            await updateDoc(adRef, updateData);

            // Update local state
            setSelectedAd({ ...selectedAd, status: newStatus });
            setCustomerAds(ads => ads.map(ad =>
                ad.id === selectedAd.id ? { ...ad, status: newStatus } : ad
            ));

            toast({
                title: "Status Updated",
                description: `Ad status changed to ${AD_STATUS_LABELS[newStatus]}.`,
            });

            setStatusChangeDialog({ open: false, targetStatus: null });
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast({
                title: "Update Error",
                description: "Could not update ad status. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Reset wizard
    const handleReset = () => {
        setSelectedCustomer(null);
        setSelectedAd(null);
        setCustomerSubscriptions([]);
        setCustomerAds([]);
        setLogoUrl(null);
        setUploadedImages([]);
        setDesignedAdUrl(null);
        setRequestCustomDesign(false);
        customerDetailsForm.reset();
        adContentForm.reset();
        setWizardStep('select-customer');
    };

    // Render wizard steps
    const renderWizardStep = () => {
        switch (wizardStep) {
            case 'select-customer':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Step 1: Select Customer
                            </CardTitle>
                            <CardDescription>
                                Search for and select a customer to manage their ad workflow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Search by email, business name, or contact name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {isLoadingCustomers ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                        <span>Loading customers...</span>
                                    </div>
                                ) : (
                                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                                        {filteredCustomers.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground">
                                                No customers found matching your search.
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {filteredCustomers.slice(0, 50).map((customer) => (
                                                    <div
                                                        key={customer.id}
                                                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                                                        onClick={() => handleSelectCustomer(customer)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <UserCircle className="h-6 w-6 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {customer.businessName || customer.contactName || 'Unnamed Customer'}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {customer.businessName && (
                                                                    <Badge variant="secondary">Has Business Info</Badge>
                                                                )}
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );

            case 'details':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Step 2: Business Details
                            </CardTitle>
                            <CardDescription>
                                Review and edit customer's business information.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={customerDetailsForm.handleSubmit(handleSaveDetails)} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="businessName">Company Name *</Label>
                                        <Controller
                                            name="businessName"
                                            control={customerDetailsForm.control}
                                            render={({ field }) => <Input id="businessName" {...field} />}
                                        />
                                        {customerDetailsForm.formState.errors.businessName && (
                                            <p className="text-sm text-destructive">{customerDetailsForm.formState.errors.businessName.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Controller
                                            name="email"
                                            control={customerDetailsForm.control}
                                            render={({ field }) => <Input id="email" type="email" {...field} />}
                                        />
                                        {customerDetailsForm.formState.errors.email && (
                                            <p className="text-sm text-destructive">{customerDetailsForm.formState.errors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactName">Contact Name *</Label>
                                        <Controller
                                            name="contactName"
                                            control={customerDetailsForm.control}
                                            render={({ field }) => <Input id="contactName" {...field} />}
                                        />
                                        {customerDetailsForm.formState.errors.contactName && (
                                            <p className="text-sm text-destructive">{customerDetailsForm.formState.errors.contactName.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactTitle">Title</Label>
                                        <Controller
                                            name="contactTitle"
                                            control={customerDetailsForm.control}
                                            render={({ field }) => <Input id="contactTitle" placeholder="e.g., Owner, Manager" {...field} />}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cellPhone">Cell Phone *</Label>
                                        <Controller
                                            name="cellPhone"
                                            control={customerDetailsForm.control}
                                            render={({ field }) => <Input id="cellPhone" placeholder="(555) 123-4567" {...field} />}
                                        />
                                        {customerDetailsForm.formState.errors.cellPhone && (
                                            <p className="text-sm text-destructive">{customerDetailsForm.formState.errors.cellPhone.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="businessPhone">Business Phone</Label>
                                        <Controller
                                            name="businessPhone"
                                            control={customerDetailsForm.control}
                                            render={({ field }) => <Input id="businessPhone" placeholder="(555) 123-4567" {...field} />}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="adWebsiteUrl">Website URL (ad destination)</Label>
                                        <Controller
                                            name="adWebsiteUrl"
                                            control={customerDetailsForm.control}
                                            render={({ field }) => <Input id="adWebsiteUrl" placeholder="https://example.com" {...field} />}
                                        />
                                        {customerDetailsForm.formState.errors.adWebsiteUrl && (
                                            <p className="text-sm text-destructive">{customerDetailsForm.formState.errors.adWebsiteUrl.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setWizardStep('select-customer')} type="button">
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Change Customer
                                    </Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'assets':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Step 3: Assets & Content
                            </CardTitle>
                            <CardDescription>
                                Upload logo, images, and set ad text for the customer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Logo Upload */}
                            <div className="space-y-4">
                                <Label>Customer Logo</Label>
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
                                            <p className="text-sm text-muted-foreground mb-2">Upload customer logo</p>
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
                            </div>

                            <Separator />

                            {/* Ad Content */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="requestCustomDesign"
                                        checked={requestCustomDesign}
                                        onChange={(e) => setRequestCustomDesign(e.target.checked)}
                                        className="rounded"
                                    />
                                    <Label htmlFor="requestCustomDesign">Customer requested custom design</Label>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="adTitle">Ad Title</Label>
                                    <Controller
                                        name="adTitle"
                                        control={adContentForm.control}
                                        render={({ field }) => (
                                            <Input
                                                id="adTitle"
                                                placeholder="e.g., Best Pizza in Town!"
                                                {...field}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="adText">Ad Text / Notes</Label>
                                    <Controller
                                        name="adText"
                                        control={adContentForm.control}
                                        render={({ field }) => (
                                            <Textarea
                                                id="adText"
                                                placeholder="Supporting text, taglines, or notes for the design team..."
                                                rows={3}
                                                {...field}
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Customer Sample Ad Preview */}
                            {designedAdUrl && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <Label>Customer-Designed Ad</Label>
                                        <Image
                                            src={designedAdUrl}
                                            alt="Customer designed ad"
                                            width={AD_DIMENSIONS.WIDTH}
                                            height={AD_DIMENSIONS.HEIGHT}
                                            className="border rounded"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setWizardStep('details')}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button onClick={handleSaveAdContent} disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case 'ad-status':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Play className="h-5 w-5" />
                                Step 4: Ad Workflow Status
                            </CardTitle>
                            <CardDescription>
                                View and manage the customer's ad workflow status. Click on a step to advance the ad.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {customerAds.length === 0 ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>No Advertisements</AlertTitle>
                                    <AlertDescription>
                                        This customer doesn't have any advertisements yet. They need an active subscription first.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    {/* Ad Selector if multiple ads */}
                                    {customerAds.length > 1 && (
                                        <div className="space-y-2">
                                            <Label>Select Advertisement</Label>
                                            <Select
                                                value={selectedAd?.id}
                                                onValueChange={(id) => setSelectedAd(customerAds.find(a => a.id === id) || null)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an ad" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {customerAds.map((ad) => (
                                                        <SelectItem key={ad.id} value={ad.id}>
                                                            {ad.businessName || 'Unnamed Ad'} - {AD_STATUS_LABELS[ad.status]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {selectedAd && (
                                        <div className="space-y-6">
                                            {/* Current Status */}
                                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Current Status</p>
                                                    <p className="text-lg font-semibold">{AD_STATUS_LABELS[selectedAd.status]}</p>
                                                </div>
                                                <Badge variant={AD_STATUS_COLORS[selectedAd.status]?.variant || 'outline'}>
                                                    {AD_STATUS_LABELS[selectedAd.status]}
                                                </Badge>
                                            </div>

                                            {/* Workflow Progress - clickable */}
                                            <div className="p-4 border rounded-lg">
                                                <p className="text-sm text-muted-foreground mb-4">Click on a step to change status:</p>
                                                <WorkflowProgress
                                                    currentStatus={selectedAd.status}
                                                    onStatusChange={(status) => setStatusChangeDialog({ open: true, targetStatus: status })}
                                                />
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="space-y-2">
                                                <Label>Quick Actions</Label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {Object.entries(AD_STATUSES).map(([key, status]) => (
                                                        <Button
                                                            key={status}
                                                            variant={selectedAd.status === status ? 'secondary' : 'outline'}
                                                            size="sm"
                                                            className="justify-start"
                                                            onClick={() => setStatusChangeDialog({ open: true, targetStatus: status })}
                                                            disabled={selectedAd.status === status}
                                                        >
                                                            {AD_STATUS_LABELS[status]}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Ad Proof Preview */}
                                            {selectedAd.adProofUrl && (
                                                <div className="space-y-2">
                                                    <Label>Current Ad Proof</Label>
                                                    <Image
                                                        src={selectedAd.adProofUrl}
                                                        alt="Ad proof"
                                                        width={AD_DIMENSIONS.WIDTH}
                                                        height={AD_DIMENSIONS.HEIGHT}
                                                        className="border rounded"
                                                    />
                                                    {selectedAd.adProofDestinationUrl && (
                                                        <a
                                                            href={selectedAd.adProofDestinationUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            Links to: {selectedAd.adProofDestinationUrl} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setWizardStep('assets')}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button onClick={() => setWizardStep('summary')}>
                                    View Summary <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case 'summary':
                const detailsData = customerDetailsForm.getValues();
                const adData = adContentForm.getValues();

                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                Summary
                            </CardTitle>
                            <CardDescription>
                                Review all customer information and ad status.
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
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Company</p>
                                            <p className="font-medium">{detailsData.businessName || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Email</p>
                                            <p className="font-medium">{detailsData.email || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Contact</p>
                                            <p className="font-medium">{detailsData.contactName || '-'} {detailsData.contactTitle && `(${detailsData.contactTitle})`}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Phone</p>
                                            <p className="font-medium">{detailsData.cellPhone || '-'}</p>
                                        </div>
                                    </div>
                                    {detailsData.adWebsiteUrl && (
                                        <div className="flex items-center gap-2 md:col-span-2">
                                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Website</p>
                                                <p className="font-medium truncate">{detailsData.adWebsiteUrl}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Assets */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Assets & Content</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setWizardStep('assets')}>
                                        <Pencil className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                </div>
                                <div className="p-4 bg-muted rounded-lg space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={requestCustomDesign ? "secondary" : "outline"}>
                                            {requestCustomDesign ? 'Custom Design Requested' : 'Self-Designed'}
                                        </Badge>
                                    </div>

                                    {logoUrl && (
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-2">Logo</p>
                                            <Image
                                                src={logoUrl}
                                                alt="Logo"
                                                width={80}
                                                height={80}
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
                                                        width={60}
                                                        height={60}
                                                        className="border rounded object-cover"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {adData.adTitle && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Title</p>
                                            <p className="font-medium">{adData.adTitle}</p>
                                        </div>
                                    )}

                                    {adData.adText && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Ad Text</p>
                                            <p className="font-medium">{adData.adText}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Ad Status */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Advertisement Status</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setWizardStep('ad-status')}>
                                        <Pencil className="h-4 w-4 mr-1" /> Manage
                                    </Button>
                                </div>
                                {selectedAd ? (
                                    <div className="p-4 bg-muted rounded-lg">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="font-medium">{selectedAd.businessName || 'Advertisement'}</p>
                                            <Badge variant={AD_STATUS_COLORS[selectedAd.status]?.variant || 'outline'}>
                                                {AD_STATUS_LABELS[selectedAd.status]}
                                            </Badge>
                                        </div>
                                        <WorkflowProgress currentStatus={selectedAd.status} />
                                    </div>
                                ) : (
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>No advertisements found for this customer.</AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {/* Subscriptions */}
                            {customerSubscriptions.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <h4 className="font-semibold">Subscriptions</h4>
                                        <div className="space-y-2">
                                            {customerSubscriptions.map((sub) => (
                                                <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{sub.planName}</p>
                                                        <p className="text-sm text-muted-foreground">{sub.price}</p>
                                                    </div>
                                                    <Badge variant={sub.status === 'active' ? 'secondary' : 'outline'}>
                                                        {sub.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setWizardStep('ad-status')}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button variant="outline" onClick={handleReset}>
                                    <RotateCcw className="mr-2 h-4 w-4" /> Start Over
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <div className="flex-1 space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Customer Workflow Manager</CardTitle>
                            <CardDescription>
                                Manage customer ad workflow on their behalf. Edit details, upload assets, and advance through workflow steps.
                            </CardDescription>
                        </div>
                        {selectedCustomer && (
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <p className="font-medium">{selectedCustomer.businessName || selectedCustomer.contactName}</p>
                                    <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleReset}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* Admin Wizard Step Indicator */}
            {selectedCustomer && (
                <AdminWizardStepIndicator currentStep={wizardStep} />
            )}

            {/* Wizard Content */}
            {renderWizardStep()}

            {/* Status Change Confirmation Dialog */}
            <Dialog open={statusChangeDialog.open} onOpenChange={(open) => setStatusChangeDialog({ ...statusChangeDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Ad Status</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to change the ad status to "{statusChangeDialog.targetStatus ? AD_STATUS_LABELS[statusChangeDialog.targetStatus] : ''}"?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusChangeDialog({ open: false, targetStatus: null })}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => statusChangeDialog.targetStatus && handleStatusChange(statusChangeDialog.targetStatus)}
                            disabled={isUpdatingStatus}
                        >
                            {isUpdatingStatus ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                                </>
                            ) : (
                                'Confirm'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
