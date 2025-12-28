'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowRight, ArrowLeft, Palette, Upload, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AD_DIMENSIONS } from '@/lib/types';

const customDesignSchema = z.object({
    adTitle: z.string().min(1, "Title text is required."),
    adText: z.string().min(1, "Ad text is required."),
});

export type DesignFormData = z.infer<typeof customDesignSchema>;

interface DesignStepProps {
    defaultValues?: {
        adTitle?: string;
        adText?: string;
        logoUrl?: string;
        uploadedImages?: string[];
        customerSampleAdUrl?: string;
        requestCustomDesign?: boolean;
    };
    onSubmit: (data: {
        requestCustomDesign: boolean;
        adTitle?: string;
        adText?: string;
        logoUrl?: string;
        uploadedImages?: string[];
        customerSampleAdUrl?: string;
    }) => Promise<void>;
    onBack?: () => void;
    onLogoUpload: (file: File) => Promise<string>;
    onImageUpload: (files: File[]) => Promise<string[]>;
    isAdmin?: boolean;
}

export function DesignStep({
    defaultValues,
    onSubmit,
    onBack,
    onLogoUpload,
    onImageUpload,
    isAdmin
}: DesignStepProps) {
    const [requestCustomDesign, setRequestCustomDesign] = useState(defaultValues?.requestCustomDesign ?? false);
    const [logoUrl, setLogoUrl] = useState<string | null>(defaultValues?.logoUrl || null);
    const [uploadedImages, setUploadedImages] = useState<string[]>(defaultValues?.uploadedImages || []);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const customerSampleAdUrl = defaultValues?.customerSampleAdUrl;

    const form = useForm<DesignFormData>({
        resolver: zodResolver(customDesignSchema),
        defaultValues: {
            adTitle: defaultValues?.adTitle || '',
            adText: defaultValues?.adText || '',
        }
    });

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await onLogoUpload(file);
            setLogoUrl(url);
        } finally {
            setIsUploading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        if (uploadedImages.length >= 3) return;

        setIsUploading(true);
        try {
            const remainingSlots = 3 - uploadedImages.length;
            const filesToUpload = Array.from(files).slice(0, remainingSlots);
            const urls = await onImageUpload(filesToUpload);
            setUploadedImages(prev => [...prev, ...urls].slice(0, 3));
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (requestCustomDesign) {
                // Validate custom design form
                const isValid = await form.trigger();
                if (!isValid) {
                    setIsSubmitting(false);
                    return;
                }

                const data = form.getValues();
                await onSubmit({
                    requestCustomDesign: true,
                    adTitle: data.adTitle,
                    adText: data.adText,
                    logoUrl: logoUrl || undefined,
                    uploadedImages: uploadedImages.length > 0 ? uploadedImages : undefined,
                });
            } else {
                // Self-designed ad
                if (!customerSampleAdUrl) {
                    // Redirect to ad designer
                    return;
                }
                await onSubmit({
                    requestCustomDesign: false,
                    customerSampleAdUrl,
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    {isAdmin ? 'Customer Ad Design Options' : 'Design Your Advertisement'}
                </CardTitle>
                <CardDescription>
                    {isAdmin
                        ? 'Choose how the ad will be designed for this customer.'
                        : 'Design your own ad or let us create one for you.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Option 1: Design your own */}
                <div
                    className={cn(
                        "p-6 border-2 rounded-lg transition-all cursor-pointer",
                        !requestCustomDesign ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                    onClick={() => setRequestCustomDesign(false)}
                >
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                            !requestCustomDesign ? "border-primary bg-primary" : "border-muted-foreground"
                        )}>
                            {!requestCustomDesign && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">
                                    {isAdmin ? 'Customer Designs Their Own' : 'Design Your Own Ad'}
                                </h4>
                                <Badge variant="secondary">Free</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1">
                                Use our visual ad designer to create a custom {AD_DIMENSIONS.WIDTH}x{AD_DIMENSIONS.HEIGHT} ad. Fully customizable with instant preview - design it now!
                            </p>
                            <ul className="text-sm text-muted-foreground mt-3 space-y-1">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Instant preview as you design
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Fully customizable - fonts, colors, images
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Design and submit today
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Show existing designed ad if available */}
                {!requestCustomDesign && customerSampleAdUrl && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm font-medium mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {isAdmin ? 'Customer has designed an ad:' : 'Your designed ad:'}
                        </p>
                        <Image
                            src={customerSampleAdUrl}
                            alt="Designed ad"
                            width={AD_DIMENSIONS.WIDTH}
                            height={AD_DIMENSIONS.HEIGHT}
                            className="border rounded mx-auto"
                        />
                    </div>
                )}

                {/* Option 2: Request custom design */}
                <div
                    className={cn(
                        "p-6 border-2 rounded-lg transition-all cursor-pointer",
                        requestCustomDesign ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                    onClick={() => setRequestCustomDesign(true)}
                >
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                            requestCustomDesign ? "border-primary bg-primary" : "border-muted-foreground"
                        )}>
                            {requestCustomDesign && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">
                                    {isAdmin ? 'Team Creates Custom Design' : 'Request Custom Ad Design'}
                                </h4>
                                <Badge variant="secondary">Free</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1">
                                {isAdmin
                                    ? 'Our team will create the ad based on customer-provided assets.'
                                    : 'Let our professional design team create your ad. Just provide your logo, images, and text.'}
                            </p>
                            <ul className="text-sm text-muted-foreground mt-3 space-y-1">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Professional design team creates your ad
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    First draft within 72 hours (may take longer)
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Unlimited revisions included
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Custom design form fields */}
                {requestCustomDesign && (
                    <div className="space-y-6 pt-4">
                        <Separator />

                        {/* Logo Upload */}
                        <div className="space-y-4">
                            <Label>Logo (optional)</Label>
                            <div className="flex items-center gap-4">
                                {logoUrl ? (
                                    <div className="relative">
                                        <Image
                                            src={logoUrl}
                                            alt="Logo"
                                            width={100}
                                            height={100}
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
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center flex-1">
                                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
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
                                            Upload Logo
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

                        {/* Additional Images */}
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
                                            onClick={() => removeImage(index)}
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
                                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                                        <span className="text-xs text-muted-foreground">Add Image</span>
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

                        {/* Ad Text */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="adTitle">Title Text *</Label>
                                <Controller
                                    name="adTitle"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Input
                                            id="adTitle"
                                            placeholder="e.g., Best Pizza in Town!"
                                            {...field}
                                        />
                                    )}
                                />
                                {form.formState.errors.adTitle && (
                                    <p className="text-sm text-destructive">{form.formState.errors.adTitle.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adText">Ad Text / Description *</Label>
                                <Controller
                                    name="adText"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Textarea
                                            id="adText"
                                            placeholder="e.g., Serving the community for 20 years! Call now for a free quote."
                                            rows={3}
                                            {...field}
                                        />
                                    )}
                                />
                                {form.formState.errors.adText && (
                                    <p className="text-sm text-destructive">{form.formState.errors.adText.message}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-between pt-4">
                    {onBack && (
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        {!requestCustomDesign && !customerSampleAdUrl && (
                            <Link href="/design-ad">
                                <Button>
                                    <Palette className="mr-2 h-4 w-4" />
                                    Open Ad Designer
                                </Button>
                            </Link>
                        )}
                        {(requestCustomDesign || customerSampleAdUrl) && (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || (!requestCustomDesign && !customerSampleAdUrl)}
                                size="lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit for Review
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
