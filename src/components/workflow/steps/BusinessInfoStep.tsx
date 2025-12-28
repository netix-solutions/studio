'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Building2 } from 'lucide-react';

// Format phone number to (XXX) XXX-XXXX
function formatPhoneNumber(value: string): string {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Only format if we have 10 digits
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // If 11 digits starting with 1, remove the leading 1 and format
    if (digits.length === 11 && digits.startsWith('1')) {
        const number = digits.slice(1);
        return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }

    return value;
}

// Format URL to ensure it has https://
function formatUrl(value: string): string {
    if (!value || value.trim() === '') return value;

    const trimmed = value.trim();

    // If it already has a protocol, return as-is
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    // Add https:// prefix
    return `https://${trimmed}`;
}

const businessInfoSchema = z.object({
    businessName: z.string().min(2, "Company name is required."),
    contactName: z.string().min(2, "Your name is required."),
    contactTitle: z.string().optional(),
    email: z.string().email("A valid email is required."),
    cellPhone: z.string().min(10, "A valid cell phone number is required."),
    businessPhone: z.string().optional(),
    adWebsiteUrl: z.string().url("Please enter a valid URL (e.g., https://example.com)").optional().or(z.literal('')),
});

export type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;

interface BusinessInfoStepProps {
    defaultValues?: Partial<BusinessInfoFormData>;
    onSubmit: (data: BusinessInfoFormData) => Promise<void>;
    isAdmin?: boolean;
}

export function BusinessInfoStep({ defaultValues, onSubmit, isAdmin }: BusinessInfoStepProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<BusinessInfoFormData>({
        resolver: zodResolver(businessInfoSchema),
        defaultValues: {
            businessName: defaultValues?.businessName || '',
            contactName: defaultValues?.contactName || '',
            contactTitle: defaultValues?.contactTitle || '',
            email: defaultValues?.email || '',
            cellPhone: defaultValues?.cellPhone || '',
            businessPhone: defaultValues?.businessPhone || '',
            adWebsiteUrl: defaultValues?.adWebsiteUrl || '',
        }
    });

    const handleSubmit = async (data: BusinessInfoFormData) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {isAdmin ? 'Enter Customer Business Information' : 'Tell Us About Your Business'}
                </CardTitle>
                <CardDescription>
                    {isAdmin
                        ? 'Fill in the customer\'s business details to proceed with their ad.'
                        : 'We need some information about your business to create the perfect advertisement.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Company Name *</Label>
                            <Controller
                                name="businessName"
                                control={form.control}
                                render={({ field }) => <Input id="businessName" placeholder="Acme Inc." {...field} />}
                            />
                            {form.formState.errors.businessName && (
                                <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactName">Your Name *</Label>
                            <Controller
                                name="contactName"
                                control={form.control}
                                render={({ field }) => <Input id="contactName" placeholder="John Smith" {...field} />}
                            />
                            {form.formState.errors.contactName && (
                                <p className="text-sm text-destructive">{form.formState.errors.contactName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Controller
                                name="email"
                                control={form.control}
                                render={({ field }) => <Input id="email" type="email" placeholder="john@example.com" {...field} />}
                            />
                            {form.formState.errors.email && (
                                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cellPhone">Cell Phone *</Label>
                            <Controller
                                name="cellPhone"
                                control={form.control}
                                render={({ field }) => (
                                    <Input
                                        id="cellPhone"
                                        placeholder="(555) 123-4567"
                                        {...field}
                                        onBlur={(e) => {
                                            const formatted = formatPhoneNumber(e.target.value);
                                            field.onChange(formatted);
                                            field.onBlur();
                                        }}
                                    />
                                )}
                            />
                            {form.formState.errors.cellPhone && (
                                <p className="text-sm text-destructive">{form.formState.errors.cellPhone.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactTitle">Title (optional)</Label>
                            <Controller
                                name="contactTitle"
                                control={form.control}
                                render={({ field }) => <Input id="contactTitle" placeholder="Owner, Manager, etc." {...field} />}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="businessPhone">Business Phone (optional)</Label>
                            <Controller
                                name="businessPhone"
                                control={form.control}
                                render={({ field }) => (
                                    <Input
                                        id="businessPhone"
                                        placeholder="(555) 123-4567"
                                        {...field}
                                        onBlur={(e) => {
                                            if (e.target.value) {
                                                const formatted = formatPhoneNumber(e.target.value);
                                                field.onChange(formatted);
                                            }
                                            field.onBlur();
                                        }}
                                    />
                                )}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="adWebsiteUrl">Website or Social Media URL (optional)</Label>
                            <Controller
                                name="adWebsiteUrl"
                                control={form.control}
                                render={({ field }) => (
                                    <Input
                                        id="adWebsiteUrl"
                                        placeholder="https://www.yourwebsite.com or social media link"
                                        {...field}
                                        onBlur={(e) => {
                                            if (e.target.value) {
                                                const formatted = formatUrl(e.target.value);
                                                field.onChange(formatted);
                                            }
                                            field.onBlur();
                                        }}
                                    />
                                )}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank if you don&apos;t have a website. You can use a Facebook page, Instagram profile, or any other link.
                            </p>
                            {form.formState.errors.adWebsiteUrl && (
                                <p className="text-sm text-destructive">{form.formState.errors.adWebsiteUrl.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting} size="lg">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    Continue to Design
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
