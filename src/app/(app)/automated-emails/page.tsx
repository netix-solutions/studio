
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

    