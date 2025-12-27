'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, Save, Bell, UserPlus, CreditCard, XCircle, CheckCircle, Image, Plus, X, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Define the trigger types with their metadata
const NOTIFICATION_TRIGGERS = [
    {
        id: 'new_lead',
        name: 'New Lead Received',
        description: 'When a potential customer submits the interest form on the landing page.',
        icon: UserPlus,
        color: 'bg-blue-500',
    },
    {
        id: 'new_subscription_purchase',
        name: 'New Customer Payment',
        description: 'When a customer completes their subscription purchase.',
        icon: CreditCard,
        color: 'bg-green-500',
    },
    {
        id: 'subscription_canceled',
        name: 'Subscription Canceled',
        description: 'When a customer cancels their subscription.',
        icon: XCircle,
        color: 'bg-red-500',
    },
    {
        id: 'ad_approved_by_customer',
        name: 'Ad Approved by Customer',
        description: 'When a customer approves their ad proof.',
        icon: CheckCircle,
        color: 'bg-emerald-500',
    },
    {
        id: 'ad_details_submitted',
        name: 'Ad Details Submitted',
        description: 'When a customer submits their advertisement details form.',
        icon: Image,
        color: 'bg-purple-500',
    },
] as const;

type TriggerType = typeof NOTIFICATION_TRIGGERS[number]['id'];

interface NotificationSetting {
    enabled: boolean;
    recipients: string[];
}

interface NotificationSettings {
    [key: string]: NotificationSetting;
}

export default function AdminNotificationsPage() {
    const [settings, setSettings] = useState<NotificationSettings>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newEmails, setNewEmails] = useState<Record<string, string>>({});
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // Load existing settings
    useEffect(() => {
        const loadSettings = async () => {
            if (!firestore) {
                setError("Firestore is not available.");
                setLoading(false);
                return;
            }

            try {
                const settingsDoc = await getDoc(doc(firestore, 'admin_notifications', 'settings'));
                if (settingsDoc.exists()) {
                    setSettings(settingsDoc.data() as NotificationSettings);
                } else {
                    // Initialize with default disabled settings
                    const defaultSettings: NotificationSettings = {};
                    NOTIFICATION_TRIGGERS.forEach(trigger => {
                        defaultSettings[trigger.id] = {
                            enabled: false,
                            recipients: [],
                        };
                    });
                    setSettings(defaultSettings);
                }
                setLoading(false);
            } catch (err) {
                console.error("Error loading notification settings:", err);
                setError("You do not have permission to view this data. Please contact an administrator.");
                setLoading(false);
            }
        };

        loadSettings();
    }, [firestore]);

    const handleToggle = (triggerId: TriggerType, enabled: boolean) => {
        setSettings(prev => ({
            ...prev,
            [triggerId]: {
                ...prev[triggerId],
                enabled,
            },
        }));
    };

    const handleAddEmail = (triggerId: TriggerType) => {
        const email = newEmails[triggerId]?.trim();
        if (!email) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address.",
                variant: "destructive",
            });
            return;
        }

        // Check for duplicates
        const currentRecipients = settings[triggerId]?.recipients || [];
        if (currentRecipients.includes(email)) {
            toast({
                title: "Duplicate Email",
                description: "This email address is already in the list.",
                variant: "destructive",
            });
            return;
        }

        setSettings(prev => ({
            ...prev,
            [triggerId]: {
                ...prev[triggerId],
                recipients: [...currentRecipients, email],
            },
        }));
        setNewEmails(prev => ({ ...prev, [triggerId]: '' }));
    };

    const handleRemoveEmail = (triggerId: TriggerType, email: string) => {
        setSettings(prev => ({
            ...prev,
            [triggerId]: {
                ...prev[triggerId],
                recipients: prev[triggerId]?.recipients.filter(e => e !== email) || [],
            },
        }));
    };

    const handleSave = async () => {
        if (!firestore) return;
        setSaving(true);

        try {
            await setDoc(doc(firestore, 'admin_notifications', 'settings'), settings);
            toast({
                title: "Settings Saved",
                description: "Admin notification settings have been updated.",
            });
        } catch (err) {
            console.error("Error saving notification settings:", err);
            toast({
                title: "Error",
                description: "Could not save notification settings.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const getActiveNotificationCount = () => {
        return Object.values(settings).filter(s => s.enabled && s.recipients.length > 0).length;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="h-6 w-6" />
                        Admin Notifications
                    </h1>
                    <p className="text-muted-foreground">
                        Configure which email addresses receive alerts for different events
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving || loading}>
                    {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                </Button>
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
                <>
                    {/* Summary Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Notification Summary</CardTitle>
                            <CardDescription>
                                {getActiveNotificationCount()} of {NOTIFICATION_TRIGGERS.length} notification types are active
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {NOTIFICATION_TRIGGERS.map(trigger => {
                                    const setting = settings[trigger.id];
                                    const isActive = setting?.enabled && (setting?.recipients?.length || 0) > 0;
                                    return (
                                        <Badge
                                            key={trigger.id}
                                            variant={isActive ? "default" : "outline"}
                                            className={isActive ? trigger.color : ""}
                                        >
                                            <trigger.icon className="h-3 w-3 mr-1" />
                                            {trigger.name}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Settings */}
                    <div className="space-y-4">
                        {NOTIFICATION_TRIGGERS.map((trigger, index) => {
                            const setting = settings[trigger.id] || { enabled: false, recipients: [] };
                            const IconComponent = trigger.icon;

                            return (
                                <Card key={trigger.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${trigger.color}`}>
                                                    <IconComponent className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{trigger.name}</CardTitle>
                                                    <CardDescription>{trigger.description}</CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`toggle-${trigger.id}`} className="text-sm text-muted-foreground">
                                                    {setting.enabled ? 'Enabled' : 'Disabled'}
                                                </Label>
                                                <Switch
                                                    id={`toggle-${trigger.id}`}
                                                    checked={setting.enabled}
                                                    onCheckedChange={(checked) => handleToggle(trigger.id, checked)}
                                                />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    {setting.enabled && (
                                        <CardContent className="pt-0">
                                            <Separator className="mb-4" />
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="text-sm font-medium">
                                                        Recipients
                                                        <span className="text-muted-foreground font-normal ml-1">
                                                            ({setting.recipients?.length || 0})
                                                        </span>
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        Add email addresses that should receive this notification.
                                                    </p>

                                                    {/* Email List */}
                                                    {setting.recipients && setting.recipients.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {setting.recipients.map(email => (
                                                                <Badge key={email} variant="secondary" className="px-2 py-1">
                                                                    <Mail className="h-3 w-3 mr-1" />
                                                                    {email}
                                                                    <button
                                                                        onClick={() => handleRemoveEmail(trigger.id, email)}
                                                                        className="ml-2 hover:text-destructive transition-colors"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Add Email Input */}
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="email"
                                                            placeholder="admin@example.com"
                                                            value={newEmails[trigger.id] || ''}
                                                            onChange={(e) => setNewEmails(prev => ({
                                                                ...prev,
                                                                [trigger.id]: e.target.value,
                                                            }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddEmail(trigger.id);
                                                                }
                                                            }}
                                                            className="max-w-sm"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleAddEmail(trigger.id)}
                                                        >
                                                            <Plus className="h-4 w-4 mr-1" />
                                                            Add
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Warning if enabled but no recipients */}
                                                {setting.enabled && (!setting.recipients || setting.recipients.length === 0) && (
                                                    <Alert variant="default" className="bg-amber-50 border-amber-200">
                                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                                        <AlertDescription className="text-amber-800">
                                                            Add at least one recipient email to receive these notifications.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}
                    </div>

                    {/* Info Card */}
                    <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Bell className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium mb-1">How Admin Notifications Work</h3>
                                    <p className="text-sm text-muted-foreground">
                                        When an enabled event occurs, an email notification will be sent to all configured
                                        recipients. These are separate from customer-facing emails and are intended to keep
                                        your team informed about important business events.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
