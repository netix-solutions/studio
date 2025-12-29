'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Code,
    Copy,
    Check,
    ExternalLink,
    RefreshCw,
    Palette,
    Layout,
    Grid3X3,
    Sparkles,
    Info,
    Eye,
    Settings2,
    Globe,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    HelpCircle,
    Wrench,
    FileCode,
    MonitorPlay,
    Layers,
    BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    type CommunityWebsiteId,
    type BusinessCategory,
    COMMUNITY_WEBSITE_LIST,
    BUSINESS_CATEGORY_LABELS,
    BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';
import { getAuth } from 'firebase/auth';
import { useFirebase } from '@/firebase';

type ThemeOption = 'auto' | 'light' | 'dark';
type ColumnsOption = 'auto' | '2' | '3' | '4';
type WixEmbedMode = 'full' | 'widget' | 'custom-element';

interface DirectoryConfig {
    website: CommunityWebsiteId | '';
    theme: ThemeOption;
    columns: ColumnsOption;
    title: string;
    subtitle: string;
    showCta: boolean;
    ctaUrl: string;
    ctaText: string;
    branding: boolean;
    category: BusinessCategory | '';
    showContact: boolean;
    showSocial: boolean;
    wixMode: WixEmbedMode;
    maxInitial: number;
    viewMode: 'scroll' | 'expandable';
    widgetLayout: 'grid' | 'carousel' | 'list';
    widgetMax: number;
    viewAllUrl: string;
}

interface DirectoryStats {
    total: number;
    approved: number;
    featured: number;
    pending: number;
}

export default function WixDirectoryPage() {
    const { toast } = useToast();
    const { firestore, user } = useFirebase();
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [previewKey, setPreviewKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DirectoryStats>({ total: 0, approved: 0, featured: 0, pending: 0 });
    const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'warning' | 'error'>('checking');
    const [healthMessage, setHealthMessage] = useState('');

    // Directory Configuration
    const [config, setConfig] = useState<DirectoryConfig>({
        website: '',
        theme: 'light',
        columns: 'auto',
        title: 'Our Sponsors',
        subtitle: 'Thank you to these amazing local businesses for supporting our community!',
        showCta: true,
        ctaUrl: '',
        ctaText: 'Become a Sponsor',
        branding: true,
        category: '',
        showContact: true,
        showSocial: true,
        wixMode: 'full',
        maxInitial: 6,
        viewMode: 'expandable',
        widgetLayout: 'grid',
        widgetMax: 4,
        viewAllUrl: '',
    });

    // Get base URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Fetch directory stats
    useEffect(() => {
        async function fetchStats() {
            if (!firestore || !user) return;

            try {
                setIsLoading(true);
                const auth = getAuth();
                const token = await auth.currentUser?.getIdToken();

                const response = await fetch('/api/admin/directory', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const result = await response.json();
                    setStats(result.data.stats);

                    // Determine health status
                    if (result.data.stats.approved > 0) {
                        setHealthStatus('healthy');
                        setHealthMessage(`${result.data.stats.approved} approved listings ready to display`);
                    } else if (result.data.stats.pending > 0) {
                        setHealthStatus('warning');
                        setHealthMessage(`${result.data.stats.pending} listings pending approval - none will show until approved`);
                    } else {
                        setHealthStatus('error');
                        setHealthMessage('No directory listings found - the directory will appear empty');
                    }
                } else {
                    setHealthStatus('error');
                    setHealthMessage('Failed to fetch directory statistics');
                }
            } catch (error) {
                setHealthStatus('error');
                setHealthMessage('Error connecting to the directory service');
            } finally {
                setIsLoading(false);
            }
        }

        fetchStats();
    }, [firestore, user]);

    // Generate embed code based on mode
    const embedCode = useMemo(() => {
        if (config.wixMode === 'custom-element') {
            const attrs: string[] = [];
            if (config.website) attrs.push(`website="${config.website}"`);
            attrs.push(`theme="${config.theme}"`);
            attrs.push(`columns="${config.columns}"`);
            if (config.title !== 'Our Sponsors') attrs.push(`title="${config.title}"`);
            if (config.subtitle !== 'Thank you to these amazing local businesses for supporting our community!') {
                attrs.push(`subtitle="${config.subtitle}"`);
            }
            attrs.push(`show-cta="${config.showCta}"`);
            if (config.ctaUrl) attrs.push(`cta-url="${config.ctaUrl}"`);
            if (config.ctaText !== 'Become a Sponsor') attrs.push(`cta-text="${config.ctaText}"`);
            attrs.push(`show-branding="${config.branding}"`);
            if (config.category) attrs.push(`category="${config.category}"`);
            attrs.push(`show-contact="${config.showContact}"`);
            attrs.push(`show-social="${config.showSocial}"`);

            return `<!-- Load the Custom Element script -->
<script src="${baseUrl}/api/ads/wix-custom-element"></script>

<!-- Use the Custom Element -->
<community-sponsors-directory
  ${attrs.join('\n  ')}
></community-sponsors-directory>`;
        }

        if (config.wixMode === 'widget') {
            const params = new URLSearchParams();
            if (config.website) params.set('website', config.website);
            params.set('theme', config.theme);
            params.set('max', config.widgetMax.toString());
            if (config.title !== 'Our Sponsors') params.set('title', config.title);
            if (config.viewAllUrl) params.set('viewAllUrl', config.viewAllUrl);
            params.set('layout', config.widgetLayout);
            if (!config.branding) params.set('branding', 'false');

            const widgetUrl = `${baseUrl}/api/ads/wix-directory-widget?${params.toString()}`;

            return `<iframe
  src="${widgetUrl}"
  style="width: 100%; height: 350px; border: none;"
  scrolling="no"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="${config.title}">
</iframe>`;
        }

        // Full directory
        const params = new URLSearchParams();
        if (config.website) params.set('website', config.website);
        params.set('theme', config.theme);
        params.set('columns', config.columns);
        if (config.title !== 'Our Sponsors') params.set('title', config.title);
        if (config.subtitle !== 'Thank you to these amazing local businesses for supporting our community!') {
            params.set('subtitle', config.subtitle);
        }
        if (!config.showCta) params.set('cta', 'false');
        if (config.ctaUrl) params.set('ctaUrl', config.ctaUrl);
        if (config.ctaText !== 'Become a Sponsor') params.set('ctaText', config.ctaText);
        if (!config.branding) params.set('branding', 'false');
        if (config.category) params.set('category', config.category);
        if (!config.showContact) params.set('showContact', 'false');
        if (!config.showSocial) params.set('showSocial', 'false');

        if (config.viewMode === 'expandable' && config.maxInitial > 0) {
            params.set('viewMode', 'expandable');
            params.set('maxInitial', config.maxInitial.toString());
        }

        const directoryUrl = `${baseUrl}/api/ads/wix-directory?${params.toString()}`;

        return `<iframe
  src="${directoryUrl}"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="${config.title}">
</iframe>`;
    }, [config, baseUrl]);

    // Get preview URL
    const previewUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (config.website) params.set('website', config.website);
        params.set('theme', config.theme);

        if (config.wixMode === 'widget') {
            params.set('max', config.widgetMax.toString());
            if (config.title !== 'Our Sponsors') params.set('title', config.title);
            if (config.viewAllUrl) params.set('viewAllUrl', config.viewAllUrl);
            params.set('layout', config.widgetLayout);
            if (!config.branding) params.set('branding', 'false');
            return `${baseUrl}/api/ads/wix-directory-widget?${params.toString()}`;
        }

        params.set('columns', config.columns);
        if (config.title !== 'Our Sponsors') params.set('title', config.title);
        if (!config.showCta) params.set('cta', 'false');
        if (config.ctaUrl) params.set('ctaUrl', config.ctaUrl);
        if (!config.branding) params.set('branding', 'false');

        if (config.wixMode === 'full' && config.viewMode === 'expandable' && config.maxInitial > 0) {
            params.set('viewMode', 'expandable');
            params.set('maxInitial', config.maxInitial.toString());
        }

        return `${baseUrl}/api/ads/wix-directory?${params.toString()}`;
    }, [config, baseUrl]);

    const copyToClipboard = (code: string, label: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(label);
        toast({
            title: 'Copied!',
            description: `${label} copied to clipboard.`,
        });
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const refreshPreview = () => {
        setPreviewKey(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Wix Directory</h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Configure and embed the sponsor directory on your Wix website
                        </p>
                    </div>
                </div>
            </div>

            {/* Health Status Card */}
            <Card className={cn(
                "border-2",
                healthStatus === 'healthy' && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                healthStatus === 'warning' && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
                healthStatus === 'error' && "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
                healthStatus === 'checking' && "border-muted"
            )}>
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        {healthStatus === 'checking' && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                        {healthStatus === 'healthy' && <CheckCircle className="h-6 w-6 text-green-600" />}
                        {healthStatus === 'warning' && <AlertTriangle className="h-6 w-6 text-amber-600" />}
                        {healthStatus === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
                        <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                                {healthStatus === 'checking' && 'Checking Directory Status...'}
                                {healthStatus === 'healthy' && 'Directory Ready'}
                                {healthStatus === 'warning' && 'Directory Has Issues'}
                                {healthStatus === 'error' && 'Directory Not Working'}
                            </h3>
                            <p className="text-sm text-muted-foreground">{healthMessage}</p>
                            {!isLoading && (
                                <div className="flex gap-4 mt-3">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{stats.total}</div>
                                        <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                                        <div className="text-xs text-muted-foreground">Approved</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                                        <div className="text-xs text-muted-foreground">Pending</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">{stats.featured}</div>
                                        <div className="text-xs text-muted-foreground">Featured</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <a href="/directory">
                                Manage Listings
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="configure" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
                    <TabsTrigger value="configure" className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Configure
                    </TabsTrigger>
                    <TabsTrigger value="embed" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Embed Code
                    </TabsTrigger>
                    <TabsTrigger value="help" className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Help
                    </TabsTrigger>
                </TabsList>

                {/* Configure Tab */}
                <TabsContent value="configure" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Configuration Panel */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings2 className="h-5 w-5" />
                                    Directory Configuration
                                </CardTitle>
                                <CardDescription>
                                    Customize how your sponsor directory appears
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Embed Type */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Layout className="h-4 w-4" />
                                        Embed Type
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'full', label: 'Full Directory', desc: 'All sponsors' },
                                            { value: 'widget', label: 'Widget', desc: 'Compact preview' },
                                            { value: 'custom-element', label: 'Custom Element', desc: 'Native Wix' },
                                        ].map((mode) => (
                                            <Button
                                                key={mode.value}
                                                variant={config.wixMode === mode.value ? 'default' : 'outline'}
                                                className="h-auto py-3 flex-col gap-1"
                                                onClick={() => setConfig({ ...config, wixMode: mode.value as WixEmbedMode })}
                                            >
                                                <span className="font-medium text-xs">{mode.label}</span>
                                                <span className="text-[10px] opacity-70">{mode.desc}</span>
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {config.wixMode === 'full' && 'Shows all sponsors in a scrollable list. Best for dedicated sponsor pages.'}
                                        {config.wixMode === 'widget' && 'Compact preview with "View All" link. Best for sidebars or homepage.'}
                                        {config.wixMode === 'custom-element' && 'Native Web Component for Wix. Best performance, requires Dev Mode.'}
                                    </p>
                                </div>

                                {/* Target Website */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        Target Website
                                    </Label>
                                    <Select
                                        value={config.website || 'all'}
                                        onValueChange={(value) => setConfig({
                                            ...config,
                                            website: value === 'all' ? '' : value as CommunityWebsiteId,
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a website..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Websites</SelectItem>
                                            {COMMUNITY_WEBSITE_LIST.map((website) => (
                                                <SelectItem key={website.id} value={website.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={cn(website.color.bg, website.color.text, "text-xs")}>
                                                            {website.shortName}
                                                        </Badge>
                                                        {website.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Widget-specific options */}
                                {config.wixMode === 'widget' && (
                                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                        <Label className="text-sm font-medium">Widget Options</Label>
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-normal">Layout Style</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { value: 'grid', label: 'Grid' },
                                                        { value: 'carousel', label: 'Carousel' },
                                                        { value: 'list', label: 'List' },
                                                    ].map((layout) => (
                                                        <Button
                                                            key={layout.value}
                                                            variant={config.widgetLayout === layout.value ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => setConfig({ ...config, widgetLayout: layout.value as 'grid' | 'carousel' | 'list' })}
                                                        >
                                                            {layout.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-normal">Max Sponsors</Label>
                                                <Select
                                                    value={config.widgetMax.toString()}
                                                    onValueChange={(value) => setConfig({ ...config, widgetMax: parseInt(value) })}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="2">2 sponsors</SelectItem>
                                                        <SelectItem value="3">3 sponsors</SelectItem>
                                                        <SelectItem value="4">4 sponsors</SelectItem>
                                                        <SelectItem value="6">6 sponsors</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-normal">View All URL</Label>
                                                <Input
                                                    value={config.viewAllUrl}
                                                    onChange={(e) => setConfig({ ...config, viewAllUrl: e.target.value })}
                                                    placeholder="https://your-site.com/sponsors"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Full Directory options */}
                                {config.wixMode === 'full' && (
                                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium">Show More Mode</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Hide extra sponsors behind a button
                                                </p>
                                            </div>
                                            <Switch
                                                checked={config.viewMode === 'expandable'}
                                                onCheckedChange={(checked) => setConfig({
                                                    ...config,
                                                    viewMode: checked ? 'expandable' : 'scroll'
                                                })}
                                            />
                                        </div>
                                        {config.viewMode === 'expandable' && (
                                            <div className="space-y-2">
                                                <Label className="text-xs font-normal">Initially Show</Label>
                                                <Select
                                                    value={config.maxInitial.toString()}
                                                    onValueChange={(value) => setConfig({ ...config, maxInitial: parseInt(value) })}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="3">3 sponsors</SelectItem>
                                                        <SelectItem value="6">6 sponsors</SelectItem>
                                                        <SelectItem value="9">9 sponsors</SelectItem>
                                                        <SelectItem value="12">12 sponsors</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Title & Subtitle */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Page Title</Label>
                                        <Input
                                            value={config.title}
                                            onChange={(e) => setConfig({ ...config, title: e.target.value })}
                                            placeholder="Our Sponsors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Subtitle</Label>
                                        <Input
                                            value={config.subtitle}
                                            onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                                            placeholder="Thank you to our sponsors..."
                                        />
                                    </div>
                                </div>

                                {/* Theme & Columns */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Palette className="h-4 w-4" />
                                            Theme
                                        </Label>
                                        <Select
                                            value={config.theme}
                                            onValueChange={(value) => setConfig({ ...config, theme: value as ThemeOption })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">Auto (System)</SelectItem>
                                                <SelectItem value="light">Light</SelectItem>
                                                <SelectItem value="dark">Dark</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Grid3X3 className="h-4 w-4" />
                                            Columns
                                        </Label>
                                        <Select
                                            value={config.columns}
                                            onValueChange={(value) => setConfig({ ...config, columns: value as ColumnsOption })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">Auto</SelectItem>
                                                <SelectItem value="2">2 Columns</SelectItem>
                                                <SelectItem value="3">3 Columns</SelectItem>
                                                <SelectItem value="4">4 Columns</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* CTA Section */}
                                <div className="space-y-4 pt-2 border-t">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Show CTA Section</Label>
                                            <p className="text-xs text-muted-foreground">
                                                "Become a Sponsor" call-to-action
                                            </p>
                                        </div>
                                        <Switch
                                            checked={config.showCta}
                                            onCheckedChange={(checked) => setConfig({ ...config, showCta: checked })}
                                        />
                                    </div>

                                    {config.showCta && (
                                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                                            <div className="space-y-2">
                                                <Label className="text-sm">CTA Button Text</Label>
                                                <Input
                                                    value={config.ctaText}
                                                    onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                                                    placeholder="Become a Sponsor"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm">CTA Button URL</Label>
                                                <Input
                                                    type="url"
                                                    value={config.ctaUrl}
                                                    onChange={(e) => setConfig({ ...config, ctaUrl: e.target.value })}
                                                    placeholder="https://your-signup-page.com"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Display Options */}
                                <div className="space-y-4 pt-2 border-t">
                                    <Label>Display Options</Label>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-normal">Show Contact Info</Label>
                                        <Switch
                                            checked={config.showContact}
                                            onCheckedChange={(checked) => setConfig({ ...config, showContact: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-normal">Show Social Links</Label>
                                        <Switch
                                            checked={config.showSocial}
                                            onCheckedChange={(checked) => setConfig({ ...config, showSocial: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-normal">Show Branding</Label>
                                        <Switch
                                            checked={config.branding}
                                            onCheckedChange={(checked) => setConfig({ ...config, branding: checked })}
                                        />
                                    </div>
                                </div>

                                {/* Category Filter */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Label>Category Filter (Optional)</Label>
                                    <Select
                                        value={config.category || 'all'}
                                        onValueChange={(value) => setConfig({
                                            ...config,
                                            category: value === 'all' ? '' : value as BusinessCategory,
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {Object.entries(BUSINESS_CATEGORY_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{BUSINESS_CATEGORY_ICONS[value as BusinessCategory]}</span>
                                                        {label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Preview Panel */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Eye className="h-5 w-5" />
                                            Live Preview
                                        </CardTitle>
                                        <CardDescription>
                                            Preview your directory configuration
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={refreshPreview}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refresh
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Open
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/50 rounded-lg overflow-hidden" style={{ height: config.wixMode === 'widget' ? '380px' : '500px' }}>
                                    <iframe
                                        key={previewKey}
                                        src={previewUrl}
                                        className="w-full h-full border-0"
                                        title="Directory Preview"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Embed Code Tab */}
                <TabsContent value="embed" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                Embed Code
                            </CardTitle>
                            <CardDescription>
                                Copy this code to add the directory to your Wix website
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-[300px] overflow-y-auto">
                                    <code>{embedCode}</code>
                                </pre>
                                <Button
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(embedCode, 'Embed Code')}
                                >
                                    {copiedCode === 'Embed Code' ? (
                                        <Check className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Copy className="h-4 w-4 mr-2" />
                                    )}
                                    {copiedCode === 'Embed Code' ? 'Copied!' : 'Copy Code'}
                                </Button>
                            </div>

                            {/* Mode-specific alerts */}
                            {config.wixMode === 'custom-element' && (
                                <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30">
                                    <Sparkles className="h-4 w-4 text-blue-500" />
                                    <AlertTitle className="text-blue-700 dark:text-blue-400">Recommended for Wix</AlertTitle>
                                    <AlertDescription className="text-blue-600 dark:text-blue-300">
                                        Custom Elements provide the best Wix integration with no iframe height issues.
                                        Requires Wix Dev Mode to be enabled.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {config.wixMode === 'widget' && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Compact Widget</AlertTitle>
                                    <AlertDescription>
                                        Fixed 350px height with no scrolling issues. Perfect for sidebars or homepage sections.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {config.wixMode === 'full' && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Full Directory</AlertTitle>
                                    <AlertDescription>
                                        Use "Show More Mode" to avoid long scrolling iframes. Best for dedicated sponsor pages.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Direct URLs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ExternalLink className="h-5 w-5" />
                                Direct URLs
                            </CardTitle>
                            <CardDescription>
                                Use these URLs directly for testing or advanced integration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Directory URL</Label>
                                <div className="flex gap-2">
                                    <Input value={previewUrl} readOnly className="font-mono text-xs" />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(previewUrl, 'URL')}
                                    >
                                        {copiedCode === 'URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {config.wixMode === 'custom-element' && (
                                <div className="space-y-2">
                                    <Label>Custom Element Script URL</Label>
                                    <div className="flex gap-2">
                                        <Input value={`${baseUrl}/api/ads/wix-custom-element`} readOnly className="font-mono text-xs" />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => copyToClipboard(`${baseUrl}/api/ads/wix-custom-element`, 'Script URL')}
                                        >
                                            {copiedCode === 'Script URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Wix Installation Instructions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MonitorPlay className="h-5 w-5" />
                                Wix Installation Instructions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="full">
                                    <AccordionTrigger>
                                        <span className="flex items-center gap-2">
                                            <FileCode className="h-4 w-4" />
                                            Full Directory / Widget (iframe)
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <ol className="list-decimal list-inside space-y-2">
                                            <li>In Wix Editor, click <strong>Add</strong> (+) button</li>
                                            <li>Select <strong>Embed</strong> → <strong>Embed HTML</strong> or <strong>Custom Embeds</strong></li>
                                            <li>Click <strong>Enter Code</strong> and paste the embed code</li>
                                            <li>Resize the element:
                                                <ul className="list-disc list-inside ml-4 mt-1">
                                                    <li>Widget: Set to 350px height</li>
                                                    <li>Full Directory: Set to 600-800px height</li>
                                                </ul>
                                            </li>
                                            <li>Preview and publish your page</li>
                                        </ol>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="custom-element">
                                    <AccordionTrigger>
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4" />
                                            Custom Element (Recommended)
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <ol className="list-decimal list-inside space-y-2">
                                            <li>In Wix Editor, enable <strong>Dev Mode</strong> (top menu bar)</li>
                                            <li>Click <strong>Add</strong> (+) → <strong>Embed</strong> → <strong>Custom Element</strong></li>
                                            <li>Click the element and select <strong>Choose Source</strong></li>
                                            <li>Select <strong>Server URL</strong> and paste:
                                                <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs">{baseUrl}/api/ads/wix-custom-element</code>
                                            </li>
                                            <li>Set <strong>Tag Name</strong> to:
                                                <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs">community-sponsors-directory</code>
                                            </li>
                                            <li>Add attributes in element settings for customization</li>
                                        </ol>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Help Tab */}
                <TabsContent value="help" className="space-y-6">
                    {/* Troubleshooting */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="h-5 w-5" />
                                Troubleshooting: Why Nothing is Loading
                            </CardTitle>
                            <CardDescription>
                                Common issues and how to fix them
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="no-data">
                                    <AccordionTrigger className="text-left">
                                        <span className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-red-500" />
                                            Directory shows "No Sponsors Yet"
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <p className="font-medium">This means no ads meet the visibility requirements. Check:</p>
                                        <ul className="list-disc list-inside space-y-2 ml-4">
                                            <li><strong>Ad Status:</strong> Ad must be <Badge variant="outline" className="mx-1">Active</Badge> (not paused or expired)</li>
                                            <li><strong>Show in Directory:</strong> The ad must have "Show in Directory" enabled</li>
                                            <li><strong>Directory Status:</strong> The listing must be <Badge variant="outline" className="mx-1 bg-green-100 text-green-800">Approved</Badge>
                                                <ul className="list-disc list-inside ml-4 mt-1">
                                                    <li>Pending listings are not visible</li>
                                                    <li>Rejected or hidden listings are not visible</li>
                                                </ul>
                                            </li>
                                        </ul>
                                        <div className="bg-muted p-3 rounded-lg mt-3">
                                            <p className="font-medium mb-2">How to fix:</p>
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>Go to <a href="/directory" className="text-primary underline">Directory Management</a></li>
                                                <li>Find listings with "Pending" status</li>
                                                <li>Review and approve them</li>
                                            </ol>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="blank-iframe">
                                    <AccordionTrigger className="text-left">
                                        <span className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-red-500" />
                                            Iframe appears blank or white
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <p className="font-medium">Possible causes:</p>
                                        <ul className="list-disc list-inside space-y-2 ml-4">
                                            <li><strong>Wix security blocking:</strong> Wix may block certain embeds. Try the Custom Element method instead.</li>
                                            <li><strong>Incorrect URL:</strong> Double-check the URL in your embed code is correct</li>
                                            <li><strong>Height too small:</strong> Iframe needs at least 300px height</li>
                                            <li><strong>Cache issue:</strong> Clear browser cache or use incognito mode</li>
                                        </ul>
                                        <div className="bg-muted p-3 rounded-lg mt-3">
                                            <p className="font-medium mb-2">Test the URL:</p>
                                            <p>Copy the URL and paste it directly in your browser. If it loads there but not in Wix, use the Custom Element method.</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="loading-forever">
                                    <AccordionTrigger className="text-left">
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 text-amber-500" />
                                            Loading spinner never stops
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <p className="font-medium">This indicates a connection or database issue:</p>
                                        <ul className="list-disc list-inside space-y-2 ml-4">
                                            <li><strong>Database connection:</strong> The Firestore database may be temporarily unavailable</li>
                                            <li><strong>Network issues:</strong> Check your internet connection</li>
                                            <li><strong>Server error:</strong> There may be a server-side issue</li>
                                        </ul>
                                        <div className="bg-muted p-3 rounded-lg mt-3">
                                            <p className="font-medium mb-2">How to debug:</p>
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>Open browser developer tools (F12)</li>
                                                <li>Go to the Console tab</li>
                                                <li>Look for red error messages</li>
                                                <li>Check the Network tab for failed requests</li>
                                            </ol>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="images-not-loading">
                                    <AccordionTrigger className="text-left">
                                        <span className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            Sponsor images not loading
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <p className="font-medium">Image loading issues:</p>
                                        <ul className="list-disc list-inside space-y-2 ml-4">
                                            <li><strong>Firebase Storage:</strong> Check that images are uploaded correctly in Advertisements</li>
                                            <li><strong>Image URLs:</strong> Images must be publicly accessible</li>
                                            <li><strong>Mixed content:</strong> If your Wix site is HTTPS, images must also be HTTPS</li>
                                            <li><strong>Large images:</strong> Very large images may timeout - optimize image sizes</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="custom-element-not-working">
                                    <AccordionTrigger className="text-left">
                                        <span className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-red-500" />
                                            Custom Element not working
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <p className="font-medium">Custom Element requirements:</p>
                                        <ul className="list-disc list-inside space-y-2 ml-4">
                                            <li><strong>Dev Mode required:</strong> Custom Elements only work with Dev Mode enabled in Wix Editor</li>
                                            <li><strong>Correct tag name:</strong> Must be exactly <code className="bg-muted px-1 rounded">community-sponsors-directory</code></li>
                                            <li><strong>Server URL:</strong> Must point to the correct endpoint</li>
                                            <li><strong>JavaScript enabled:</strong> User's browser must have JavaScript enabled</li>
                                        </ul>
                                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-3 rounded-lg mt-3">
                                            <p className="text-amber-800 dark:text-amber-200">
                                                <strong>Alternative:</strong> If Custom Elements don't work, use the iframe method instead. It's more widely compatible.
                                            </p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* Requirements Checklist */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                Requirements Checklist
                            </CardTitle>
                            <CardDescription>
                                Ensure all requirements are met for the directory to display
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-3 border rounded-lg">
                                    <div className={cn(
                                        "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center",
                                        stats.approved > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                    )}>
                                        {stats.approved > 0 ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    </div>
                                    <div>
                                        <p className="font-medium">Approved Directory Listings</p>
                                        <p className="text-sm text-muted-foreground">
                                            {stats.approved > 0
                                                ? `${stats.approved} approved listings ready to display`
                                                : "No approved listings - directory will be empty"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 border rounded-lg">
                                    <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                                        <Info className="h-3 w-3" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Active Ads with Directory Enabled</p>
                                        <p className="text-sm text-muted-foreground">
                                            Ads must be active AND have "Show in Directory" enabled in the Ad Server
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 border rounded-lg">
                                    <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                                        <Info className="h-3 w-3" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Correct Website Targeting</p>
                                        <p className="text-sm text-muted-foreground">
                                            If filtering by website, ads must be targeted to that specific website
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Links */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Related Pages
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                                    <a href="/directory">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">Directory Management</p>
                                                <p className="text-xs text-muted-foreground">Approve/reject listings</p>
                                            </div>
                                        </div>
                                    </a>
                                </Button>
                                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                                    <a href="/ad-server">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded">
                                                <Layout className="h-4 w-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">Ad Server</p>
                                                <p className="text-xs text-muted-foreground">Manage active ads</p>
                                            </div>
                                        </div>
                                    </a>
                                </Button>
                                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                                    <a href="/embed-codes">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded">
                                                <Code className="h-4 w-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">Embed Codes</p>
                                                <p className="text-xs text-muted-foreground">Ad rotator & email embeds</p>
                                            </div>
                                        </div>
                                    </a>
                                </Button>
                                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                                    <a href="/advertisements">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded">
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">Advertisements</p>
                                                <p className="text-xs text-muted-foreground">Upload ad images</p>
                                            </div>
                                        </div>
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
