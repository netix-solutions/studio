'use client';

import { useState, useEffect } from 'react';
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { useUser, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Loader2,
    AlertCircle,
    Building2,
    User,
    Globe,
    Sparkles,
    CheckCircle,
    ArrowRight,
    Newspaper,
    BookOpen,
    ShoppingBag,
    Camera,
    Link as LinkIcon,
    FileText,
    Clock,
    PenLine,
} from 'lucide-react';
import Link from 'next/link';
import { type UserProfile } from '@/lib/types';

interface Subscription {
    id: string;
    status: string;
    items?: Array<{
        price: {
            recurring?: { interval: 'month' | 'year' };
        };
    }>;
    billingPeriod?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';
}

interface SpotlightSubmission {
    id: string;
    status: 'submitted' | 'in_progress' | 'published';
    businessName: string;
    createdAt?: { seconds: number };
}

interface FormData {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    yearEstablished: string;
    industry: string;
    businessDescription: string;
    originStory: string;
    differentiator: string;
    communityMessage: string;
    productsServices: string;
    promotions: string;
    popularOffering: string;
    websiteUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    googleBusinessUrl: string;
    otherLinks: string;
    testimonials: string;
    photoPreference: 'email' | 'use_online' | 'none';
    additionalNotes: string;
}

export default function SpotlightArticlePage() {
    const { user, isUserLoading: userLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isYearly, setIsYearly] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState<SpotlightSubmission | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        businessName: '',
        ownerName: '',
        email: '',
        phone: '',
        yearEstablished: '',
        industry: '',
        businessDescription: '',
        originStory: '',
        differentiator: '',
        communityMessage: '',
        productsServices: '',
        promotions: '',
        popularOffering: '',
        websiteUrl: '',
        facebookUrl: '',
        instagramUrl: '',
        googleBusinessUrl: '',
        otherLinks: '',
        testimonials: '',
        photoPreference: 'email',
        additionalNotes: '',
    });

    // Load user data, subscription, and existing submission
    useEffect(() => {
        if (!firestore || !user) {
            if (!userLoading) setLoading(false);
            return;
        }

        setLoading(true);

        // Subscribe to user profile
        const userUnsubscribe = onSnapshot(
            doc(firestore, 'users', user.uid),
            (docSnap) => {
                if (docSnap.exists()) {
                    const profile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
                    setUserProfile(profile);
                    // Pre-fill form from profile
                    setFormData(prev => ({
                        ...prev,
                        businessName: prev.businessName || profile.businessName || '',
                        ownerName: prev.ownerName || profile.contactName || '',
                        email: prev.email || profile.email || user.email || '',
                        phone: prev.phone || profile.phone || '',
                        websiteUrl: prev.websiteUrl || profile.adWebsiteUrl || '',
                    }));
                }
            }
        );

        // Subscribe to subscriptions to detect yearly
        const subsUnsubscribe = onSnapshot(
            collection(firestore, 'customers', user.uid, 'subscriptions'),
            (snapshot) => {
                const subs = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                })) as Subscription[];

                const active = subs.find(s =>
                    s.status === 'active' || s.status === 'trialing'
                );

                if (active) {
                    const interval = active.items?.[0]?.price?.recurring?.interval;
                    const yearly = interval === 'year' || active.billingPeriod === 'yearly';
                    setIsYearly(yearly);
                } else {
                    setIsYearly(false);
                }
            }
        );

        // Check for existing submission
        const checkExisting = async () => {
            try {
                const q = query(
                    collection(firestore, 'spotlightSubmissions'),
                    where('userId', '==', user.uid)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const docData = snapshot.docs[0];
                    setExistingSubmission({
                        id: docData.id,
                        ...docData.data(),
                    } as SpotlightSubmission);
                }
            } catch (error) {
                console.error('Error checking existing submission:', error);
            } finally {
                setLoading(false);
            }
        };

        checkExisting();

        return () => {
            userUnsubscribe();
            subsUnsubscribe();
        };
    }, [firestore, user, userLoading]);

    const updateField = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setSubmitError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.businessName.trim()) {
            setSubmitError('Business name is required');
            return;
        }
        if (!formData.ownerName.trim()) {
            setSubmitError('Owner name is required');
            return;
        }
        if (!formData.email.trim()) {
            setSubmitError('Email is required');
            return;
        }
        if (!formData.businessDescription.trim()) {
            setSubmitError('Business description is required');
            return;
        }

        if (!firestore || !user) return;

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await addDoc(collection(firestore, 'spotlightSubmissions'), {
                userId: user.uid,
                status: 'submitted',
                ...formData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setIsSuccess(true);
            toast({
                title: 'Submission Received!',
                description: 'Our writing team will craft your spotlight article.',
            });

            // Send admin notification
            try {
                await fetch('/api/spotlight-article', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessName: formData.businessName,
                        ownerName: formData.ownerName,
                        email: formData.email,
                    }),
                });
            } catch {
                // Non-critical, don't block the success flow
            }
        } catch (error) {
            console.error('Error submitting spotlight article:', error);
            setSubmitError('Failed to submit. Please try again.');
            toast({
                title: 'Error',
                description: 'Failed to submit your story. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state
    if (loading || userLoading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-3xl mx-auto space-y-6">
                    <Skeleton className="h-10 w-64 mx-auto" />
                    <Skeleton className="h-5 w-80 mx-auto" />
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <Alert className="max-w-md border-2">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>Please log in</AlertTitle>
                    <AlertDescription>
                        You need to be logged in to access the spotlight article form.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Not a yearly subscriber — upsell
    if (!isYearly) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
                <Card className="max-w-lg w-full border-2">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto p-4 rounded-full bg-amber-100 w-fit mb-4">
                            <Newspaper className="h-8 w-8 text-amber-600" />
                        </div>
                        <CardTitle className="text-2xl">Yearly Perk: Free Spotlight Article</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Upgrade to a yearly plan to unlock your free spotlight article — a $250+ value! Our writing team will craft a compelling feature article about your business and publish it on our community websites.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-0">
                        <Button asChild size="lg">
                            <Link href="/pricing">
                                Upgrade to Yearly
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Already submitted — show status
    if (existingSubmission) {
        const statusConfig = {
            submitted: {
                icon: <Clock className="h-8 w-8 text-blue-600" />,
                bg: 'bg-blue-100',
                badge: 'Submitted',
                badgeVariant: 'secondary' as const,
                title: 'Your Spotlight Article Has Been Submitted',
                description: 'Our writing team has received your submission and will begin crafting your feature article. We may reach out for additional details or photos.',
            },
            in_progress: {
                icon: <PenLine className="h-8 w-8 text-amber-600" />,
                bg: 'bg-amber-100',
                badge: 'In Progress',
                badgeVariant: 'default' as const,
                title: 'Your Spotlight Article Is Being Written',
                description: 'Our writing team is actively working on your feature article. You\'ll be notified when it\'s ready for review.',
            },
            published: {
                icon: <CheckCircle className="h-8 w-8 text-green-600" />,
                bg: 'bg-green-100',
                badge: 'Published',
                badgeVariant: 'default' as const,
                title: 'Your Spotlight Article Has Been Published!',
                description: 'Your feature article is live on our community websites. Thank you for sharing your story!',
            },
        };

        const config = statusConfig[existingSubmission.status] || statusConfig.submitted;

        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
                <Card className="max-w-lg w-full border-2">
                    <CardHeader className="text-center pb-4">
                        <div className={`mx-auto p-4 rounded-full ${config.bg} w-fit mb-4`}>
                            {config.icon}
                        </div>
                        <div className="flex justify-center mb-3">
                            <Badge variant={config.badgeVariant}>{config.badge}</Badge>
                        </div>
                        <CardTitle className="text-2xl">{config.title}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {config.description}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-0">
                        <Button variant="outline" asChild>
                            <Link href="/account">
                                Back to Dashboard
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
                <Card className="max-w-lg w-full border-2">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto p-4 rounded-full bg-green-100 w-fit mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Your Submission Has Been Received!</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Our writing team will craft your spotlight article. We may reach out for additional details or photos.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-0">
                        <Button variant="outline" asChild>
                            <Link href="/account">
                                Back to Dashboard
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Main form
    return (
        <div className="min-h-[80vh] px-4 py-8">
            <div className="w-full max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        YEARLY PERK
                    </Badge>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Your Free Spotlight Article
                    </h1>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Tell us your story and our writing team will craft a compelling feature article about your business, published on our community websites.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Business Basics */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="w-5 h-5" />
                                Business Basics
                            </CardTitle>
                            <CardDescription>
                                Basic information about your business
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="businessName">Business Name *</Label>
                                    <Input
                                        id="businessName"
                                        value={formData.businessName}
                                        onChange={(e) => updateField('businessName', e.target.value)}
                                        placeholder="Your Business Name"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ownerName">Owner Name *</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="ownerName"
                                            value={formData.ownerName}
                                            onChange={(e) => updateField('ownerName', e.target.value)}
                                            placeholder="John Smith"
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateField('email', e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => updateField('phone', e.target.value)}
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="yearEstablished">Year Established</Label>
                                    <Input
                                        id="yearEstablished"
                                        value={formData.yearEstablished}
                                        onChange={(e) => updateField('yearEstablished', e.target.value)}
                                        placeholder="2015"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="industry">Industry / Category</Label>
                                    <Input
                                        id="industry"
                                        value={formData.industry}
                                        onChange={(e) => updateField('industry', e.target.value)}
                                        placeholder="e.g. Restaurant, Fitness, Retail"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 2: Your Story */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BookOpen className="w-5 h-5" />
                                Your Story
                            </CardTitle>
                            <CardDescription>
                                This is the heart of your article — share what makes your business special
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="businessDescription">Business Description *</Label>
                                <Textarea
                                    id="businessDescription"
                                    value={formData.businessDescription}
                                    onChange={(e) => updateField('businessDescription', e.target.value)}
                                    placeholder="Tell us about your business — what you do, who you serve, and what your mission is..."
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="originStory">Origin Story</Label>
                                <Textarea
                                    id="originStory"
                                    value={formData.originStory}
                                    onChange={(e) => updateField('originStory', e.target.value)}
                                    placeholder="How did your business get started? What inspired you to launch it?"
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="differentiator">What Makes You Different</Label>
                                <Textarea
                                    id="differentiator"
                                    value={formData.differentiator}
                                    onChange={(e) => updateField('differentiator', e.target.value)}
                                    placeholder="What sets you apart from the competition? What do customers love about you?"
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="communityMessage">Message to the Community</Label>
                                <Textarea
                                    id="communityMessage"
                                    value={formData.communityMessage}
                                    onChange={(e) => updateField('communityMessage', e.target.value)}
                                    placeholder="Is there anything you'd like to say directly to the local community?"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Products & Services */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ShoppingBag className="w-5 h-5" />
                                Products & Services
                            </CardTitle>
                            <CardDescription>
                                Help us highlight what you offer
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="productsServices">Key Offerings</Label>
                                <Textarea
                                    id="productsServices"
                                    value={formData.productsServices}
                                    onChange={(e) => updateField('productsServices', e.target.value)}
                                    placeholder="List your main products or services..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="promotions">Current Promotions or Events</Label>
                                <Textarea
                                    id="promotions"
                                    value={formData.promotions}
                                    onChange={(e) => updateField('promotions', e.target.value)}
                                    placeholder="Any special offers, upcoming events, or seasonal promotions?"
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="popularOffering">Most Popular Product/Service</Label>
                                <Textarea
                                    id="popularOffering"
                                    value={formData.popularOffering}
                                    onChange={(e) => updateField('popularOffering', e.target.value)}
                                    placeholder="What's your bestseller or most requested service? Why do customers love it?"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 4: Online Presence */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <LinkIcon className="w-5 h-5" />
                                Online Presence
                            </CardTitle>
                            <CardDescription>
                                We&apos;ll include links in your article so readers can find you
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="websiteUrl">Website URL</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="websiteUrl"
                                        value={formData.websiteUrl}
                                        onChange={(e) => updateField('websiteUrl', e.target.value)}
                                        placeholder="https://www.yourbusiness.com"
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                                    <Input
                                        id="facebookUrl"
                                        value={formData.facebookUrl}
                                        onChange={(e) => updateField('facebookUrl', e.target.value)}
                                        placeholder="https://facebook.com/yourbusiness"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instagramUrl">Instagram URL</Label>
                                    <Input
                                        id="instagramUrl"
                                        value={formData.instagramUrl}
                                        onChange={(e) => updateField('instagramUrl', e.target.value)}
                                        placeholder="https://instagram.com/yourbusiness"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="googleBusinessUrl">Google Business URL</Label>
                                <Input
                                    id="googleBusinessUrl"
                                    value={formData.googleBusinessUrl}
                                    onChange={(e) => updateField('googleBusinessUrl', e.target.value)}
                                    placeholder="https://g.page/yourbusiness"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="otherLinks">Other Links</Label>
                                <Textarea
                                    id="otherLinks"
                                    value={formData.otherLinks}
                                    onChange={(e) => updateField('otherLinks', e.target.value)}
                                    placeholder="Any other links you'd like included (Yelp, TikTok, LinkedIn, etc.)"
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 5: Final Details */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="w-5 h-5" />
                                Final Details
                            </CardTitle>
                            <CardDescription>
                                A few more things to help us write the best article possible
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="testimonials">Customer Testimonials to Include</Label>
                                <Textarea
                                    id="testimonials"
                                    value={formData.testimonials}
                                    onChange={(e) => updateField('testimonials', e.target.value)}
                                    placeholder="Paste any customer reviews or testimonials you'd like us to feature..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Photo Preference</Label>
                                <RadioGroup
                                    value={formData.photoPreference}
                                    onValueChange={(value) => updateField('photoPreference', value)}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="email" id="photo-email" />
                                        <Label htmlFor="photo-email" className="font-normal cursor-pointer">
                                            <Camera className="w-4 h-4 inline mr-2 text-muted-foreground" />
                                            I&apos;ll email photos separately
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="use_online" id="photo-online" />
                                        <Label htmlFor="photo-online" className="font-normal cursor-pointer">
                                            <Globe className="w-4 h-4 inline mr-2 text-muted-foreground" />
                                            Use photos from my website / social media
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="none" id="photo-none" />
                                        <Label htmlFor="photo-none" className="font-normal cursor-pointer">
                                            No photos needed
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="additionalNotes">Additional Notes</Label>
                                <Textarea
                                    id="additionalNotes"
                                    value={formData.additionalNotes}
                                    onChange={(e) => updateField('additionalNotes', e.target.value)}
                                    placeholder="Anything else you'd like us to know?"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error Display */}
                    {submitError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Submit */}
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg py-6"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Your Story
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
