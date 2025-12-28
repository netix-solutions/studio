'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, MoreHorizontal, Mail, PlusCircle, Pencil, Trash2, Copy, Eye, Zap, Send, ChevronDown, Grid3X3, List, Search, RefreshCw, RotateCcw, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EditEmailTemplateDialog } from '@/components/emails/edit-email-template-dialog';
import { CreateEmailTemplateDialog } from '@/components/emails/create-email-template-dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { sendEmail } from '@/lib/firebase/email';
import { wrapEmailContent } from '@/lib/email-utils';
import { EmailPreviewThumbnail, EmailPreview } from '@/components/emails/email-preview';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type EmailTemplate, defaultTemplates, TEMPLATE_VERSION } from '@/lib/email-templates';

const testEmailSchema = z.object({
    recipientEmail: z.string().email("Please enter a valid email address."),
});

type TestEmailFormData = z.infer<typeof testEmailSchema>;


function getTriggerBadge(triggerName?: string) {
    switch (triggerName) {
        case 'interest_form_submission':
            return <Badge variant="default" className="bg-green-600"><Zap className="h-3 w-3 mr-1" />Auto: Form Submit</Badge>;
        case 'new_subscription_purchase':
            return <Badge variant="default" className="bg-green-600"><Zap className="h-3 w-3 mr-1" />Auto: Purchase</Badge>;
        default:
            return <Badge variant="secondary"><Send className="h-3 w-3 mr-1" />Manual</Badge>;
    }
}

function getTemplateBadges(template: EmailTemplate, isOutdated: boolean) {
    return (
        <div className="flex flex-wrap gap-1">
            {getTriggerBadge(template.triggerName)}
            {template.isSystemTemplate && (
                <Badge variant="outline" className="text-xs">
                    System
                </Badge>
            )}
            {isOutdated && (
                <Badge variant="destructive" className="text-xs">
                    Update Available
                </Badge>
            )}
        </div>
    );
}

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
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasSeeded, setHasSeeded] = useState(false);
    const [outdatedTemplates, setOutdatedTemplates] = useState<string[]>([]);
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteTemplate, setDeleteTemplate] = useState<EmailTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    // Check which system templates are outdated (lower version than current)
    const checkOutdatedTemplates = (currentTemplates: EmailTemplate[]) => {
        const outdated: string[] = [];
        for (const defaultTemplate of defaultTemplates) {
            const existing = currentTemplates.find(t => t.id === defaultTemplate.id);
            if (existing && existing.isSystemTemplate) {
                // Only check version for system templates
                const existingVersion = existing.version || 0;
                if (existingVersion < TEMPLATE_VERSION) {
                    outdated.push(defaultTemplate.id);
                }
            }
        }
        setOutdatedTemplates(outdated);
    };

    // Seed any missing default templates (runs automatically on page load)
    const seedMissingTemplates = async (showToast = true) => {
        if (!firestore || hasSeeded) return;

        setIsSeeding(true);
        let createdCount = 0;

        try {
            for (const template of defaultTemplates) {
                const templateRef = doc(firestore, 'emailTemplates', template.id);
                const templateSnap = await getDoc(templateRef);

                if (!templateSnap.exists()) {
                    // Create new template with version and system flag
                    await setDoc(templateRef, {
                        ...template,
                        version: TEMPLATE_VERSION,
                        isSystemTemplate: true,
                    });
                    createdCount++;
                }
            }

            setHasSeeded(true);

            if (showToast && createdCount > 0) {
                toast({
                    title: "Templates Initialized",
                    description: `${createdCount} default email template(s) have been added.`,
                });
            }
        } catch (error) {
            console.error("Error seeding templates:", error);
            if (showToast) {
                toast({ title: "Error", description: "Could not add default templates.", variant: "destructive" });
            }
        } finally {
            setIsSeeding(false);
        }
    };

    // Sync outdated system templates to the latest version
    const syncSystemTemplates = async () => {
        if (!firestore) return;

        setIsSyncing(true);
        let updatedCount = 0;

        try {
            for (const defaultTemplate of defaultTemplates) {
                const templateRef = doc(firestore, 'emailTemplates', defaultTemplate.id);
                const templateSnap = await getDoc(templateRef);

                if (templateSnap.exists()) {
                    const existingData = templateSnap.data();
                    const existingVersion = existingData.version || 0;

                    // Only update system templates that are outdated
                    if (existingData.isSystemTemplate && existingVersion < TEMPLATE_VERSION) {
                        await setDoc(templateRef, {
                            ...defaultTemplate,
                            version: TEMPLATE_VERSION,
                            isSystemTemplate: true,
                        });
                        updatedCount++;
                    }
                } else {
                    // Template doesn't exist, create it
                    await setDoc(templateRef, {
                        ...defaultTemplate,
                        version: TEMPLATE_VERSION,
                        isSystemTemplate: true,
                    });
                    updatedCount++;
                }
            }

            setOutdatedTemplates([]);

            if (updatedCount > 0) {
                toast({
                    title: "Templates Synced",
                    description: `${updatedCount} template(s) have been updated to the latest version.`,
                });
            } else {
                toast({
                    title: "Already Up to Date",
                    description: "All system templates are at the latest version.",
                });
            }
        } catch (error) {
            console.error("Error syncing templates:", error);
            toast({ title: "Error", description: "Could not sync templates.", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    // Reset a single template to its default state
    const resetTemplateToDefault = async (templateId: string) => {
        if (!firestore) return;

        const defaultTemplate = defaultTemplates.find(t => t.id === templateId);
        if (!defaultTemplate) {
            toast({ title: "Error", description: "Default template not found.", variant: "destructive" });
            return;
        }

        try {
            const templateRef = doc(firestore, 'emailTemplates', templateId);
            await setDoc(templateRef, {
                ...defaultTemplate,
                version: TEMPLATE_VERSION,
                isSystemTemplate: true,
            });

            toast({
                title: "Template Reset",
                description: `"${defaultTemplate.name}" has been reset to its default state.`,
            });
        } catch (error) {
            console.error("Error resetting template:", error);
            toast({ title: "Error", description: "Could not reset template.", variant: "destructive" });
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

            // Check for outdated templates after loading
            checkOutdatedTemplates(templatesData);

            // Check if any default templates are missing and need to be seeded
            const existingIds = new Set(templatesData.map(t => t.id));
            const missingTemplates = defaultTemplates.filter(t => !existingIds.has(t.id));
            if (missingTemplates.length > 0 && !hasSeeded) {
                // Auto-seed missing templates silently on first load
                seedMissingTemplates(true);
            }
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
    }, [firestore, hasSeeded]);

    const handleEditTemplate = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setIsEditDialogOpen(true);
    };

    const handleDeleteTemplate = async () => {
        if (!firestore || !deleteTemplate) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'emailTemplates', deleteTemplate.id));
            toast({
                title: "Template Deleted",
                description: `"${deleteTemplate.name}" has been deleted.`,
            });
            setDeleteTemplate(null);
        } catch (error) {
            console.error("Error deleting template:", error);
            toast({
                title: "Error",
                description: "Could not delete the template.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicateTemplate = async (template: EmailTemplate) => {
        if (!firestore) return;
        try {
            const newId = `${template.id}_copy_${Date.now()}`;
            const newTemplate = {
                ...template,
                id: newId,
                name: `${template.name} (Copy)`,
            };
            await setDoc(doc(firestore, 'emailTemplates', newId), newTemplate);
            toast({
                title: "Template Duplicated",
                description: `Created a copy of "${template.name}".`,
            });
        } catch (error) {
            console.error("Error duplicating template:", error);
            toast({
                title: "Error",
                description: "Could not duplicate the template.",
                variant: "destructive",
            });
        }
    };

    const onTestEmailSubmit = async (data: TestEmailFormData) => {
        if (!firestore) return;
        setIsSendingTestEmail(true);
        try {
            const testHtml = wrapEmailContent(`
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">Hello!</p>
<div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac; text-align: center;">
    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">Email System Working!</p>
</div>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">This is a test email to confirm that the Firebase Trigger Email extension is configured and working correctly.</p>
<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">If you received this email, your email system is properly set up.</p>
<div style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 16px; color: #3f3f46;">Best regards,</p>
    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #18181b;">The Community-Websites.com Team</p>
</div>
            `);
            await sendEmail(firestore, {
                to: data.recipientEmail,
                subject: "Test Email from Community-Websites.com",
                html: testHtml,
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

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const automatedTemplates = filteredTemplates.filter(t => t.triggerName && t.triggerName !== 'none');
    const manualTemplates = filteredTemplates.filter(t => !t.triggerName || t.triggerName === 'none');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Email Templates</h1>
                    <p className="text-muted-foreground">Manage automated and manual email templates</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Template
                    </Button>
                </div>
            </div>

            {/* Search and View Controls */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center border rounded-md">
                    <Toggle
                        size="sm"
                        pressed={viewMode === 'grid'}
                        onPressedChange={() => setViewMode('grid')}
                        className="rounded-r-none"
                    >
                        <Grid3X3 className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={viewMode === 'list'}
                        onPressedChange={() => setViewMode('list')}
                        className="rounded-l-none"
                    >
                        <List className="h-4 w-4" />
                    </Toggle>
                </div>
            </div>

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
                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="all">All Templates ({filteredTemplates.length})</TabsTrigger>
                        <TabsTrigger value="automated">Automated ({automatedTemplates.length})</TabsTrigger>
                        <TabsTrigger value="manual">Manual ({manualTemplates.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        {viewMode === 'grid' ? (
                            <TemplateGrid
                                templates={filteredTemplates}
                                outdatedTemplates={outdatedTemplates}
                                onEdit={handleEditTemplate}
                                onPreview={setPreviewTemplate}
                                onDelete={setDeleteTemplate}
                                onDuplicate={handleDuplicateTemplate}
                                onReset={resetTemplateToDefault}
                            />
                        ) : (
                            <TemplateList
                                templates={filteredTemplates}
                                outdatedTemplates={outdatedTemplates}
                                onEdit={handleEditTemplate}
                                onPreview={setPreviewTemplate}
                                onDelete={setDeleteTemplate}
                                onDuplicate={handleDuplicateTemplate}
                                onReset={resetTemplateToDefault}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="automated">
                        {viewMode === 'grid' ? (
                            <TemplateGrid
                                templates={automatedTemplates}
                                outdatedTemplates={outdatedTemplates}
                                onEdit={handleEditTemplate}
                                onPreview={setPreviewTemplate}
                                onDelete={setDeleteTemplate}
                                onDuplicate={handleDuplicateTemplate}
                                onReset={resetTemplateToDefault}
                            />
                        ) : (
                            <TemplateList
                                templates={automatedTemplates}
                                outdatedTemplates={outdatedTemplates}
                                onEdit={handleEditTemplate}
                                onPreview={setPreviewTemplate}
                                onDelete={setDeleteTemplate}
                                onDuplicate={handleDuplicateTemplate}
                                onReset={resetTemplateToDefault}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="manual">
                        {viewMode === 'grid' ? (
                            <TemplateGrid
                                templates={manualTemplates}
                                outdatedTemplates={outdatedTemplates}
                                onEdit={handleEditTemplate}
                                onPreview={setPreviewTemplate}
                                onDelete={setDeleteTemplate}
                                onDuplicate={handleDuplicateTemplate}
                                onReset={resetTemplateToDefault}
                            />
                        ) : (
                            <TemplateList
                                templates={manualTemplates}
                                outdatedTemplates={outdatedTemplates}
                                onEdit={handleEditTemplate}
                                onPreview={setPreviewTemplate}
                                onDelete={setDeleteTemplate}
                                onDuplicate={handleDuplicateTemplate}
                                onReset={resetTemplateToDefault}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {/* Outdated Templates Alert */}
            {outdatedTemplates.length > 0 && (
                <Alert>
                    <RefreshCw className="h-4 w-4" />
                    <AlertTitle>Template Updates Available</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>{outdatedTemplates.length} system template(s) have updates available.</span>
                        <Button size="sm" onClick={syncSystemTemplates} disabled={isSyncing} className="ml-4">
                            {isSyncing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Sync Now
                                </>
                            )}
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Tools Section */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Template Management</CardTitle>
                        <CardDescription>
                            Sync system templates to get the latest updates, or add any missing defaults.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={syncSystemTemplates} disabled={isSyncing || isSeeding} variant="outline">
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Sync All System Templates
                                    </>
                                )}
                            </Button>
                            <Button onClick={() => seedMissingTemplates(true)} disabled={isSeeding || isSyncing} variant="outline">
                                {isSeeding ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Missing Templates
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <Info className="inline h-3 w-3 mr-1" />
                            System templates are automatically added when missing. Use "Sync All" to update templates to the latest version.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Test Email Sending</CardTitle>
                        <CardDescription>
                            Verify that the email system is working correctly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={testEmailForm.handleSubmit(onTestEmailSubmit)} className="flex items-end gap-2">
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
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Mail className="mr-2 h-4 w-4" />
                                )}
                                Send Test
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Create Dialog */}
            <CreateEmailTemplateDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

            {/* Edit Dialog */}
            {selectedTemplate && (
                <EditEmailTemplateDialog
                    template={selectedTemplate}
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                />
            )}

            {/* Preview Dialog */}
            <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{previewTemplate?.name}</DialogTitle>
                        <DialogDescription>{previewTemplate?.description}</DialogDescription>
                    </DialogHeader>
                    {previewTemplate && (
                        <EmailPreview
                            content={previewTemplate.html}
                            subject={previewTemplate.subject}
                            maxHeight="60vh"
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTemplate}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Template Grid Component
function TemplateGrid({
    templates,
    outdatedTemplates,
    onEdit,
    onPreview,
    onDelete,
    onDuplicate,
    onReset
}: {
    templates: EmailTemplate[];
    outdatedTemplates: string[];
    onEdit: (template: EmailTemplate) => void;
    onPreview: (template: EmailTemplate) => void;
    onDelete: (template: EmailTemplate) => void;
    onDuplicate: (template: EmailTemplate) => void;
    onReset: (templateId: string) => void;
}) {
    if (templates.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No templates found.
            </div>
        );
    }

    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
                const isOutdated = outdatedTemplates.includes(template.id);
                const isSystemTemplate = template.isSystemTemplate && defaultTemplates.some(t => t.id === template.id);

                return (
                    <Card key={template.id} className={`overflow-hidden group hover:shadow-md transition-shadow ${isOutdated ? 'ring-2 ring-orange-400' : ''}`}>
                        <div
                            className="cursor-pointer"
                            onClick={() => onPreview(template)}
                        >
                            <EmailPreviewThumbnail
                                content={template.html}
                                height={180}
                            />
                        </div>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground truncate mt-1">{template.subject}</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onPreview(template)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Preview
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEdit(template)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDuplicate(template)}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Duplicate
                                        </DropdownMenuItem>
                                        {isSystemTemplate && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onReset(template.id)}>
                                                    <RotateCcw className="mr-2 h-4 w-4" />
                                                    Reset to Default
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(template)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{template.description}</p>
                            {getTemplateBadges(template, isOutdated)}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

// Template List Component
function TemplateList({
    templates,
    outdatedTemplates,
    onEdit,
    onPreview,
    onDelete,
    onDuplicate,
    onReset
}: {
    templates: EmailTemplate[];
    outdatedTemplates: string[];
    onEdit: (template: EmailTemplate) => void;
    onPreview: (template: EmailTemplate) => void;
    onDelete: (template: EmailTemplate) => void;
    onDuplicate: (template: EmailTemplate) => void;
    onReset: (templateId: string) => void;
}) {
    if (templates.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No templates found.
            </div>
        );
    }

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px]">Template</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {templates.map((template) => {
                        const isOutdated = outdatedTemplates.includes(template.id);
                        const isSystemTemplate = template.isSystemTemplate && defaultTemplates.some(t => t.id === template.id);

                        return (
                            <TableRow key={template.id} className={isOutdated ? 'bg-orange-50' : ''}>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{template.name}</div>
                                        <div className="text-sm text-muted-foreground line-clamp-1">{template.description}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{template.subject}</TableCell>
                                <TableCell>{getTemplateBadges(template, isOutdated)}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onPreview(template)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Preview
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEdit(template)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onDuplicate(template)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            {isSystemTemplate && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => onReset(template.id)}>
                                                        <RotateCcw className="mr-2 h-4 w-4" />
                                                        Reset to Default
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => onDelete(template)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Card>
    );
}
