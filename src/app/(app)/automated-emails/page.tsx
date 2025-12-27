
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query, Unsubscribe, doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, Mail, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditEmailTemplateDialog } from '@/components/emails/edit-email-template-dialog';
import { CreateEmailTemplateDialog } from '@/components/emails/create-email-template-dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { sendEmail } from '@/lib/firebase/email';

export interface EmailTemplate {
    id: string;
    name: string;
    description: string;
    subject: string;
    html: string;
    triggerName?: string;
    triggerDescription?: string;
    placeholders?: { key: string; description: string }[];
}

const testEmailSchema = z.object({
    recipientEmail: z.string().email("Please enter a valid email address."),
});

type TestEmailFormData = z.infer<typeof testEmailSchema>;

export const defaultTemplates: EmailTemplate[] = [
    {
        id: 'pricing_link',
        name: 'Pricing Link (Auto-response)',
        description: 'Sent to users after they fill out the "Get Started" interest form.',
        subject: 'Here is your link to our pricing, {{contactName}}!',
        html: `
<p>Hi {{contactName}},</p>
<p>Thanks for your interest in advertising with Community-Websites.com. We're excited to help you reach more local customers.</p>
<p>You can view our current plans and get started by clicking the link below:</p>
<p><a href="{{pricingLink}}"><strong>View Pricing & Sign Up</strong></a></p>
<p>If you have any questions, feel free to reply to this email or call/text us at 813-544-8383.</p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'interest_form_submission',
        triggerDescription: 'This email is automatically sent immediately after a potential customer submits the "Get Started" interest form on the landing page.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the person who submitted the form." },
            { key: '{{businessName}}', description: "The business name entered in the form." },
            { key: '{{pricingLink}}', description: "The unique, auto-generated link to the pricing page." },
        ]
    },
    {
        id: 'new_customer_welcome',
        name: 'New Customer Welcome',
        description: 'Sent to a new customer immediately after they complete their first subscription purchase.',
        subject: 'Welcome to Community-Websites.com, {{contactName}}!',
        html: `
<p>Hi {{contactName}},</p>
<p>Thank you for your purchase and welcome aboard! We're thrilled to have you as an advertising partner.</p>
<p><strong>What's next?</strong></p>
<p>Please log in to your account and fill out the "Advertisement Details" form. This is where you can provide us with your business information, ad text, and upload any logos or images you'd like us to use.</p>
<p><a href="{{accountLink}}"><strong>Go to My Account</strong></a></p>
<p>Once we receive your details, our design team will get to work on creating your ad. We'll send you a proof for approval before it goes live.</p>
<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'new_subscription_purchase',
        triggerDescription: 'This email is automatically sent immediately after a customer successfully completes their first subscription purchase.',
        placeholders: [
            { key: '{{contactName}}', description: "The customer's full name from their user profile." },
            { key: '{{accountLink}}', description: "A direct link to the user's account page." },
        ]
    },
    {
        id: 'manual_follow_up',
        name: 'Manual Follow-Up',
        description: 'A general-purpose follow-up email to send to leads.',
        subject: 'Following up from Community-Websites.com',
        html: `
<p>Hi {{contactName}},</p>
<p>Just wanted to follow up on your interest in advertising with us at Community-Websites.com. We help local businesses like yours connect with thousands of potential customers in the area.</p>
<p>Is there any information I can provide to help you decide if our service is a good fit for your business, {{businessName}}?</p>
<p>Feel free to reply to this email with any questions.</p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. It must be sent manually from the lead or user detail page.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead or user." },
            { key: '{{businessName}}', description: "The business name of the lead or user." },
        ]
    },
    {
        id: 'ad_proof_approval',
        name: 'Ad Proof for Your Approval',
        description: 'Sent to a customer with their ad proof for them to approve.',
        subject: 'Your Ad Proof for {{businessName}} is Ready for Review!',
        html: `
<p>Hi {{contactName}},</p>
<p>Your ad creative is ready for your review! Please take a look at the proof below and let us know if you approve it or if you'd like any changes.</p>
<div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border: 1px solid #eee; text-align: center;">
    <p><strong>Your Ad Creative:</strong></p>
    <a href="{{adProofDestinationUrl}}" target="_blank">
        <img src="{{adProofUrl}}" alt="Ad Proof for {{businessName}}" style="max-width: 100%; border: 1px solid #ccc;"/>
    </a>
    <p style="font-size: 12px; color: #666; margin-top: 10px;">The ad above will link to: <a href="{{adProofDestinationUrl}}" target="_blank">{{adProofDestinationUrl}}</a></p>
</div>
<p>If everything looks correct, please reply to this email with "Approved." If you need any adjustments, just let us know what you'd like to change.</p>
<p>We're excited to get your ad live!</p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. It must be sent manually from the customer detail page after an ad proof has been uploaded.',
        placeholders: [
            { key: '{{contactName}}', description: "The customer's full name." },
            { key: '{{businessName}}', description: "The customer's business name." },
            { key: '{{adProofUrl}}', description: "The URL of the ad image creative." },
            { key: '{{adProofDestinationUrl}}', description: "The URL the ad will link to." },
        ]
    },
    {
        id: 'still_interested',
        name: 'Still Interested Check-In',
        description: 'A friendly check-in email to see if a lead is still interested in advertising.',
        subject: 'Quick question about advertising for {{businessName}}',
        html: `
<p>Hi {{contactName}},</p>
<p>I wanted to reach out and see if you're still considering advertising with Community-Websites.com for {{businessName}}.</p>
<p>I know things can get busy, so I just wanted to check in and see if:</p>
<ul style="margin: 15px 0; padding-left: 20px;">
    <li>You have any questions I can help answer</li>
    <li>There's anything holding you back from getting started</li>
    <li>You'd like me to walk you through the process</li>
</ul>
<p>Our local advertising platform reaches thousands of residents in your community, and we'd love to help {{businessName}} connect with more customers.</p>
<p>Just reply to this email or give me a call at 813-544-8383 - I'm happy to help!</p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to check in with leads who showed interest but haven\'t moved forward.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
        ]
    },
    {
        id: 'discount_offer',
        name: 'Exclusive Discount Offer',
        description: 'Offer a 10% discount to encourage leads to sign up.',
        subject: 'A special offer for {{businessName}} - 10% off your first month',
        html: `
<p>Hi {{contactName}},</p>
<p>I wanted to share an exclusive offer with you. As a thank you for your interest in Community-Websites.com, we'd like to offer {{businessName}} <strong>10% off your first month</strong> of advertising.</p>
<div style="margin: 25px 0; padding: 20px; background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 8px; text-align: center;">
    <p style="margin: 0 0 10px 0; font-size: 14px; color: #0369a1;">Your exclusive discount code:</p>
    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #0284c7; letter-spacing: 2px;">TAKE10OFF</p>
    <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">Enter this code at checkout</p>
</div>
<p>This is a great opportunity to get your business in front of local customers at a reduced rate. Our advertising packages help businesses like yours:</p>
<ul style="margin: 15px 0; padding-left: 20px;">
    <li>Reach thousands of local residents</li>
    <li>Build brand recognition in your community</li>
    <li>Drive more foot traffic and calls</li>
</ul>
<p><a href="{{pricingLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Plans & Use Your Discount</a></p>
<p style="margin-top: 20px;">If you have any questions, just reply to this email or call us at 813-544-8383.</p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to offer the TAKE10OFF discount code (10% off) to leads who need an extra incentive.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
            { key: '{{pricingLink}}', description: "The link to the pricing page." },
        ]
    },
    {
        id: 'last_chance',
        name: 'Last Chance Reminder',
        description: 'A final follow-up for leads who haven\'t responded to previous outreach.',
        subject: 'Last chance to connect about {{businessName}} advertising',
        html: `
<p>Hi {{contactName}},</p>
<p>I've reached out a couple of times about advertising opportunities for {{businessName}}, and I wanted to send one final message before I close out your inquiry.</p>
<p>I completely understand if the timing isn't right or if you've decided to go a different direction - no worries at all!</p>
<p>However, if you're still interested in reaching more local customers through Community-Websites.com, I'm here to help. Just reply to this email and we can pick up where we left off.</p>
<p>Either way, I wish you and {{businessName}} all the best!</p>
<p>Best,<br>The Community-Websites.com Team</p>
<p style="font-size: 12px; color: #64748b; margin-top: 20px;">P.S. If you'd like to move forward, reply with "interested" and I'll send over all the details.</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this as a final follow-up for leads who haven\'t responded to previous emails.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
        ]
    },
    {
        id: 'value_highlight',
        name: 'Why Local Advertising Works',
        description: 'An educational email highlighting the benefits of local advertising.',
        subject: '3 ways local advertising can grow {{businessName}}',
        html: `
<p>Hi {{contactName}},</p>
<p>I wanted to share some insights on how local advertising through Community-Websites.com can help grow {{businessName}}.</p>
<p><strong>Here's what our advertising partners typically see:</strong></p>
<div style="margin: 20px 0;">
    <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #0284c7; margin-bottom: 10px;">
        <strong>1. Increased Local Visibility</strong><br>
        <span style="color: #64748b;">Your business appears on community websites that local residents visit regularly for news and information.</span>
    </div>
    <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #0284c7; margin-bottom: 10px;">
        <strong>2. Targeted Reach</strong><br>
        <span style="color: #64748b;">Your ads are seen by people who actually live and shop in your area - not random clicks from across the country.</span>
    </div>
    <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #0284c7; margin-bottom: 10px;">
        <strong>3. Cost-Effective Marketing</strong><br>
        <span style="color: #64748b;">Get your message in front of thousands of local residents for a fraction of what traditional advertising costs.</span>
    </div>
</div>
<p>Would you like to learn more about how this could work for {{businessName}}? I'm happy to answer any questions.</p>
<p><a href="{{pricingLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">See Our Advertising Options</a></p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to educate leads about the benefits of local advertising.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
            { key: '{{pricingLink}}', description: "The link to the pricing page." },
        ]
    },
    {
        id: 'thank_you_no_commitment',
        name: 'Thank You (No Pressure)',
        description: 'A warm thank you email that keeps the door open without being pushy.',
        subject: 'Thanks for considering Community-Websites.com, {{contactName}}',
        html: `
<p>Hi {{contactName}},</p>
<p>I just wanted to take a moment to thank you for considering Community-Websites.com for {{businessName}}'s advertising needs.</p>
<p>Whether you're ready to get started now or want to keep us in mind for the future, we appreciate your interest and are here whenever the time is right.</p>
<p>In the meantime, feel free to:</p>
<ul style="margin: 15px 0; padding-left: 20px;">
    <li>Save our contact info for when you're ready</li>
    <li>Browse our <a href="{{pricingLink}}">advertising options</a> at your convenience</li>
    <li>Reach out anytime with questions - no pressure, ever</li>
</ul>
<p>We're a small team that genuinely cares about helping local businesses succeed. Whenever you're ready, we'll be here.</p>
<p>Wishing you success with {{businessName}}!</p>
<p>Best,<br>The Community-Websites.com Team</p>
        `.trim(),
        triggerName: 'none',
        triggerDescription: 'This email is not sent automatically. Use this to thank leads and keep the relationship warm without pressure.',
        placeholders: [
            { key: '{{contactName}}', description: "The full name of the lead." },
            { key: '{{businessName}}', description: "The business name of the lead." },
            { key: '{{pricingLink}}', description: "The link to the pricing page." },
        ]
    }
];


export default function AutomatedEmailsPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);

    const testEmailForm = useForm<TestEmailFormData>({
        resolver: zodResolver(testEmailSchema),
        defaultValues: {
            recipientEmail: user?.email || '',
        },
    });

    useEffect(() => {
        if (user?.email) {
            testEmailForm.reset({ recipientEmail: user.email });
        }
    }, [user, testEmailForm]);

    const seedDefaultTemplates = async () => {
        if (!firestore) return;
        setIsSeeding(true);
        let createdCount = 0;
        try {
            for (const template of defaultTemplates) {
                const templateRef = doc(firestore, 'emailTemplates', template.id);
                const templateSnap = await getDoc(templateRef);
                if (!templateSnap.exists()) {
                    await setDoc(templateRef, template);
                    createdCount++;
                }
            }
            if (createdCount > 0) {
                 toast({
                    title: "Templates Added",
                    description: `${createdCount} default email template(s) have been added.`,
                });
            } else {
                 toast({
                    title: "Templates Verified",
                    description: "All default templates already exist.",
                });
            }
        } catch (error) {
            console.error("Error seeding templates:", error);
            toast({ title: "Error", description: "Could not add default templates.", variant: "destructive" });
        } finally {
            setIsSeeding(false);
        }
    };


    useEffect(() => {
        if (!firestore) {
            setError("Firestore is not available.");
            setLoading(false);
            return;
        }

        const templatesQuery = query(collection(firestore, 'emailTemplates'));
        
        const unsubscribe = onSnapshot(templatesQuery, (snapshot) => {
            const templatesData: EmailTemplate[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as EmailTemplate));
            setTemplates(templatesData);
            setLoading(false);
            setError(null);
        }, (err) => {
            const permissionError = new FirestorePermissionError({
                path: '/emailTemplates',
                operation: 'list',
            } satisfies SecurityRuleContext);
            
            errorEmitter.emit('permission-error', permissionError);

            setError("You do not have permission to view this data. Please contact an administrator to be granted the 'admin' role.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleEditTemplate = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setIsEditDialogOpen(true);
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Automated Emails</CardTitle>
                        <CardDescription>Manage the templates for automated emails sent to users.</CardDescription>
                    </div>
                     <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Template
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading && (
                         <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {!loading && error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Access Denied</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!loading && !error && (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Template Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {templates.length > 0 ? templates.map((template) => (
                                        <TableRow key={template.id}>
                                            <TableCell className="font-medium">{template.name}</TableCell>
                                            <TableCell>{template.description}</TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">
                                                No email templates found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Template Management</CardTitle>
                    <CardDescription>
                        If a default template is missing, you can add it here.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                     <Button onClick={seedDefaultTemplates} disabled={isSeeding}>
                        {isSeeding ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Please wait...
                            </>
                        ) : (
                            <>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Missing Default Templates
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Test Email Sending</CardTitle>
                    <CardDescription>
                        Send a test email to verify that the Firebase Trigger Email extension is configured and working correctly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>

            <CreateEmailTemplateDialog 
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

            {selectedTemplate && (
                <EditEmailTemplateDialog 
                    template={selectedTemplate}
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                />
            )}
        </div>
    );
}

    