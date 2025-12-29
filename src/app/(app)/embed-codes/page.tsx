'use client';

import { useState, useMemo } from 'react';
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
    Monitor,
    Smartphone,
    Tablet,
    RefreshCw,
    Palette,
    Layout,
    Grid3X3,
    Users,
    Sparkles,
    Info,
    Eye,
    Settings2,
    Zap,
    Globe,
    Mail,
    Image,
    Link2,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    type CommunityWebsiteId,
    type BusinessCategory,
    COMMUNITY_WEBSITE_LIST,
    COMMUNITY_WEBSITE_CONFIG,
    BUSINESS_CATEGORIES,
    BUSINESS_CATEGORY_LABELS,
    BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';

type ThemeOption = 'auto' | 'light' | 'dark';
type LayoutOption = 'single' | '1x2' | '1x3' | '2x3';
type ColumnsOption = 'auto' | '2' | '3' | '4';
type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface EmbedConfig {
    website: CommunityWebsiteId | '';
    theme: ThemeOption;
    responsive: boolean;
    branding: boolean;
    layout: LayoutOption;
}

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
}

type EmailModeOption = 'dynamic' | 'static';

interface EmailConfig {
    website: CommunityWebsiteId | '';
    mode: EmailModeOption;
    selectedAdId: string;
    fallbackUrl: string;
    altText: string;
    maxWidth: string;
}

export default function EmbedCodesPage() {
    const { toast } = useToast();
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [previewKey, setPreviewKey] = useState(0);

    // Ad Rotator Configuration
    const [rotatorConfig, setRotatorConfig] = useState<EmbedConfig>({
        website: '',
        theme: 'auto',
        responsive: true,
        branding: true,
        layout: 'single',
    });

    // Directory Configuration
    const [directoryConfig, setDirectoryConfig] = useState<DirectoryConfig>({
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
    });

    // Email Embed Configuration
    const [emailConfig, setEmailConfig] = useState<EmailConfig>({
        website: '',
        mode: 'dynamic',
        selectedAdId: '',
        fallbackUrl: '',
        altText: 'Community Sponsor',
        maxWidth: '600',
    });

    // Get base URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Generate Ad Rotator embed code
    const rotatorEmbedCode = useMemo(() => {
        const websiteParam = rotatorConfig.website ? `?website=${rotatorConfig.website}` : '';
        const iframeParams = new URLSearchParams();
        if (rotatorConfig.website) iframeParams.set('website', rotatorConfig.website);
        iframeParams.set('theme', rotatorConfig.theme);
        iframeParams.set('responsive', rotatorConfig.responsive.toString());
        iframeParams.set('branding', rotatorConfig.branding.toString());

        const iframeUrl = `${baseUrl}/api/ads/wix-embed?${iframeParams.toString()}`;

        if (rotatorConfig.layout === 'single') {
            if (rotatorConfig.responsive) {
                return `<div style="position: relative; width: 100%; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
  <iframe
    src="${iframeUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    scrolling="no"
    frameborder="0"
    allowtransparency="true"
    loading="lazy"
    title="Community Advertisement">
  </iframe>
</div>`;
            } else {
                return `<iframe
  src="${iframeUrl}"
  style="width: 300px; height: 100px; border: none;"
  scrolling="no"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="Community Advertisement">
</iframe>`;
            }
        }

        // Multi-ad layouts
        const adCount = rotatorConfig.layout === '1x2' ? 2 : rotatorConfig.layout === '1x3' ? 3 : 6;
        const isGrid = rotatorConfig.layout === '2x3';
        const minWidth = rotatorConfig.layout === '1x2' ? '280px' : '200px';
        const paddingBottom = rotatorConfig.layout === '1x2' ? '16.67%' : rotatorConfig.layout === '1x3' ? '11.11%' : '33.33%';

        if (isGrid) {
            return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%;">
${Array(adCount).fill(null).map((_, i) => `  <div style="position: relative; padding-bottom: 33.33%; overflow: hidden; border-radius: 8px;">
    <iframe src="${iframeUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Ad ${i + 1}"></iframe>
  </div>`).join('\n')}
</div>`;
        }

        return `<div style="display: flex; gap: 16px; width: 100%; flex-wrap: wrap;">
${Array(adCount).fill(null).map((_, i) => `  <div style="flex: 1; min-width: ${minWidth}; position: relative; padding-bottom: ${paddingBottom}; overflow: hidden; border-radius: 8px;">
    <iframe
      src="${iframeUrl}"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      scrolling="no" frameborder="0" allowtransparency="true" loading="lazy"
      title="Community Advertisement ${i + 1}">
    </iframe>
  </div>`).join('\n')}
</div>`;
    }, [rotatorConfig, baseUrl]);

    // Generate Directory embed code
    const directoryEmbedCode = useMemo(() => {
        const params = new URLSearchParams();
        if (directoryConfig.website) params.set('website', directoryConfig.website);
        params.set('theme', directoryConfig.theme);
        params.set('columns', directoryConfig.columns);
        if (directoryConfig.title !== 'Our Sponsors') params.set('title', directoryConfig.title);
        if (directoryConfig.subtitle !== 'Thank you to these amazing local businesses for supporting our community!') {
            params.set('subtitle', directoryConfig.subtitle);
        }
        if (!directoryConfig.showCta) params.set('cta', 'false');
        if (directoryConfig.ctaUrl) params.set('ctaUrl', directoryConfig.ctaUrl);
        if (directoryConfig.ctaText !== 'Become a Sponsor') params.set('ctaText', directoryConfig.ctaText);
        if (!directoryConfig.branding) params.set('branding', 'false');
        if (directoryConfig.category) params.set('category', directoryConfig.category);
        if (!directoryConfig.showContact) params.set('showContact', 'false');
        if (!directoryConfig.showSocial) params.set('showSocial', 'false');

        const directoryUrl = `${baseUrl}/api/ads/wix-directory?${params.toString()}`;

        return `<iframe
  src="${directoryUrl}"
  style="width: 100%; min-height: 600px; border: none;"
  scrolling="auto"
  frameborder="0"
  allowtransparency="true"
  loading="lazy"
  title="${directoryConfig.title}">
</iframe>`;
    }, [directoryConfig, baseUrl]);

    // Get preview URL for rotator
    const rotatorPreviewUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (rotatorConfig.website) params.set('website', rotatorConfig.website);
        params.set('theme', rotatorConfig.theme);
        params.set('responsive', rotatorConfig.responsive.toString());
        params.set('branding', rotatorConfig.branding.toString());
        return `${baseUrl}/api/ads/wix-embed?${params.toString()}`;
    }, [rotatorConfig, baseUrl]);

    // Get preview URL for directory
    const directoryPreviewUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (directoryConfig.website) params.set('website', directoryConfig.website);
        params.set('theme', directoryConfig.theme);
        params.set('columns', directoryConfig.columns);
        if (directoryConfig.title !== 'Our Sponsors') params.set('title', directoryConfig.title);
        if (!directoryConfig.showCta) params.set('cta', 'false');
        if (directoryConfig.ctaUrl) params.set('ctaUrl', directoryConfig.ctaUrl);
        if (!directoryConfig.branding) params.set('branding', 'false');
        return `${baseUrl}/api/ads/wix-directory?${params.toString()}`;
    }, [directoryConfig, baseUrl]);

    // Generate Email embed URLs
    const emailImageUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (emailConfig.mode === 'static' && emailConfig.selectedAdId) {
            params.set('id', emailConfig.selectedAdId);
            params.set('mode', 'static');
        } else {
            if (emailConfig.website) params.set('website', emailConfig.website);
            params.set('mode', 'dynamic');
        }
        return `${baseUrl}/api/ads/email-image?${params.toString()}`;
    }, [emailConfig, baseUrl]);

    const emailClickUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (emailConfig.mode === 'static' && emailConfig.selectedAdId) {
            params.set('id', emailConfig.selectedAdId);
        } else {
            if (emailConfig.website) params.set('website', emailConfig.website);
        }
        if (emailConfig.fallbackUrl) params.set('fallback', emailConfig.fallbackUrl);
        return `${baseUrl}/api/ads/email-click?${params.toString()}`;
    }, [emailConfig, baseUrl]);

    // Generate Email embed code
    const emailEmbedCode = useMemo(() => {
        const altText = emailConfig.altText || 'Community Sponsor';
        const maxWidth = emailConfig.maxWidth || '600';

        return `<a href="${emailClickUrl}" target="_blank" rel="noopener" style="display: block; text-decoration: none;">
  <img
    src="${emailImageUrl}"
    alt="${altText}"
    style="max-width: ${maxWidth}px; width: 100%; height: auto; border: 0; display: block; margin: 0 auto;"
  />
</a>`;
    }, [emailImageUrl, emailClickUrl, emailConfig.altText, emailConfig.maxWidth]);

    // Simple image-only code for email
    const emailImageOnlyCode = useMemo(() => {
        const altText = emailConfig.altText || 'Community Sponsor';
        const maxWidth = emailConfig.maxWidth || '600';

        return `<img src="${emailImageUrl}" alt="${altText}" style="max-width: ${maxWidth}px; width: 100%; height: auto; border: 0; display: block; margin: 0 auto;" />`;
    }, [emailImageUrl, emailConfig.altText, emailConfig.maxWidth]);

    const copyToClipboard = (code: string, label: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(label);
        toast({
            title: 'Copied!',
            description: `${label} code copied to clipboard.`,
        });
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const refreshPreview = () => {
        setPreviewKey(prev => prev + 1);
    };

    const getDeviceWidth = () => {
        switch (previewDevice) {
            case 'mobile': return '375px';
            case 'tablet': return '768px';
            default: return '100%';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Code className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Embed Codes</h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Configure and generate embed codes for your websites
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="rotator" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="rotator" className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Ad Rotator
                    </TabsTrigger>
                    <TabsTrigger value="directory" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Sponsor Directory
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Embed
                    </TabsTrigger>
                </TabsList>

                {/* Ad Rotator Tab */}
                <TabsContent value="rotator" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Configuration Panel */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings2 className="h-5 w-5" />
                                    Configuration
                                </CardTitle>
                                <CardDescription>
                                    Customize how the ad rotator appears on your website
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Target Website */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        Target Website
                                    </Label>
                                    <Select
                                        value={rotatorConfig.website || 'all'}
                                        onValueChange={(value) => setRotatorConfig({
                                            ...rotatorConfig,
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
                                    <p className="text-xs text-muted-foreground">
                                        Only show ads targeted to this specific website
                                    </p>
                                </div>

                                {/* Layout */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Layout className="h-4 w-4" />
                                        Layout
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'single', label: 'Single Ad', icon: '1' },
                                            { value: '1x2', label: '2 Ads Row', icon: '1x2' },
                                            { value: '1x3', label: '3 Ads Row', icon: '1x3' },
                                            { value: '2x3', label: '6 Ads Grid', icon: '2x3' },
                                        ].map((layout) => (
                                            <Button
                                                key={layout.value}
                                                variant={rotatorConfig.layout === layout.value ? 'default' : 'outline'}
                                                className="h-auto py-3 flex-col gap-1"
                                                onClick={() => setRotatorConfig({ ...rotatorConfig, layout: layout.value as LayoutOption })}
                                            >
                                                <span className="text-lg font-mono">{layout.icon}</span>
                                                <span className="text-xs">{layout.label}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Palette className="h-4 w-4" />
                                        Theme
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'auto', label: 'Auto', desc: 'System' },
                                            { value: 'light', label: 'Light', desc: 'White' },
                                            { value: 'dark', label: 'Dark', desc: 'Dark' },
                                        ].map((theme) => (
                                            <Button
                                                key={theme.value}
                                                variant={rotatorConfig.theme === theme.value ? 'default' : 'outline'}
                                                className="h-auto py-2 flex-col gap-0.5"
                                                onClick={() => setRotatorConfig({ ...rotatorConfig, theme: theme.value as ThemeOption })}
                                            >
                                                <span className="font-medium">{theme.label}</span>
                                                <span className="text-xs opacity-70">{theme.desc}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Responsive Mode</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Auto-resize to fit container width
                                            </p>
                                        </div>
                                        <Switch
                                            checked={rotatorConfig.responsive}
                                            onCheckedChange={(checked) => setRotatorConfig({ ...rotatorConfig, responsive: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Show Branding</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Display Community Ads attribution
                                            </p>
                                        </div>
                                        <Switch
                                            checked={rotatorConfig.branding}
                                            onCheckedChange={(checked) => setRotatorConfig({ ...rotatorConfig, branding: checked })}
                                        />
                                    </div>
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
                                            See how your ad will appear
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex border rounded-lg overflow-hidden">
                                            <Button
                                                variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                className="rounded-none"
                                                onClick={() => setPreviewDevice('desktop')}
                                            >
                                                <Monitor className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                className="rounded-none border-x"
                                                onClick={() => setPreviewDevice('tablet')}
                                            >
                                                <Tablet className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                className="rounded-none"
                                                onClick={() => setPreviewDevice('mobile')}
                                            >
                                                <Smartphone className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={refreshPreview}>
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="bg-muted/50 rounded-lg p-4 min-h-[200px] flex items-center justify-center overflow-hidden"
                                    style={{ maxWidth: getDeviceWidth(), margin: '0 auto' }}
                                >
                                    <div className="w-full" style={{ aspectRatio: '3/1' }}>
                                        <iframe
                                            key={previewKey}
                                            src={rotatorPreviewUrl}
                                            className="w-full h-full border-0 rounded-lg"
                                            title="Ad Preview"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Embed Code Output */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                Embed Code
                            </CardTitle>
                            <CardDescription>
                                Copy this code and paste it into your website's HTML
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-[300px] overflow-y-auto">
                                    <code>{rotatorEmbedCode}</code>
                                </pre>
                                <Button
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(rotatorEmbedCode, 'Ad Rotator')}
                                >
                                    {copiedCode === 'Ad Rotator' ? (
                                        <Check className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Copy className="h-4 w-4 mr-2" />
                                    )}
                                    {copiedCode === 'Ad Rotator' ? 'Copied!' : 'Copy Code'}
                                </Button>
                            </div>

                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="wix">
                                    <AccordionTrigger className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Wix Installation Instructions
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>In Wix Editor, click the <strong>Add</strong> (+) button</li>
                                            <li>Select <strong>Embed</strong> → <strong>Embed HTML</strong> or <strong>Custom Embeds</strong></li>
                                            <li>Click <strong>Enter Code</strong> and paste the code above</li>
                                            <li>Resize the element to fit your layout</li>
                                        </ol>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="wordpress">
                                    <AccordionTrigger className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            WordPress Installation
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>In the WordPress editor, add a <strong>Custom HTML</strong> block</li>
                                            <li>Paste the embed code above</li>
                                            <li>Preview or publish your page</li>
                                        </ol>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="generic">
                                    <AccordionTrigger className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Generic HTML Installation
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <p>Paste the code anywhere in your HTML where you want the ad to appear. For best results, place it within a container element that has a defined width.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* JavaScript API */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                JavaScript Embed (Advanced)
                            </CardTitle>
                            <CardDescription>
                                For non-Wix sites that support JavaScript
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <Sparkles className="h-4 w-4" />
                                <AlertTitle>Automatic Ad Rotation</AlertTitle>
                                <AlertDescription>
                                    This method uses a JavaScript loader that handles automatic rotation,
                                    caching, and click tracking.
                                </AlertDescription>
                            </Alert>
                            <div className="relative">
                                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                    <code>{`<!-- Community Ads${rotatorConfig.website ? ` - ${COMMUNITY_WEBSITE_CONFIG[rotatorConfig.website]?.name || rotatorConfig.website}` : ''} -->
<script src="${baseUrl}/api/ads/embed${rotatorConfig.website ? `?website=${rotatorConfig.website}` : ''}"></script>
<div data-community-ad data-placement="inline"${rotatorConfig.website ? ` data-site="${rotatorConfig.website}"` : ''}></div>`}</code>
                                </pre>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(
                                        `<!-- Community Ads${rotatorConfig.website ? ` - ${COMMUNITY_WEBSITE_CONFIG[rotatorConfig.website]?.name || rotatorConfig.website}` : ''} -->\n<script src="${baseUrl}/api/ads/embed${rotatorConfig.website ? `?website=${rotatorConfig.website}` : ''}"></script>\n<div data-community-ad data-placement="inline"${rotatorConfig.website ? ` data-site="${rotatorConfig.website}"` : ''}></div>`,
                                        'JavaScript'
                                    )}
                                >
                                    {copiedCode === 'JavaScript' ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sponsor Directory Tab */}
                <TabsContent value="directory" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Configuration Panel */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings2 className="h-5 w-5" />
                                    Directory Configuration
                                </CardTitle>
                                <CardDescription>
                                    Customize your sponsor directory page
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Target Website */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        Target Website
                                    </Label>
                                    <Select
                                        value={directoryConfig.website || 'all'}
                                        onValueChange={(value) => setDirectoryConfig({
                                            ...directoryConfig,
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

                                {/* Title & Subtitle */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Page Title</Label>
                                        <Input
                                            value={directoryConfig.title}
                                            onChange={(e) => setDirectoryConfig({ ...directoryConfig, title: e.target.value })}
                                            placeholder="Our Sponsors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Subtitle</Label>
                                        <Input
                                            value={directoryConfig.subtitle}
                                            onChange={(e) => setDirectoryConfig({ ...directoryConfig, subtitle: e.target.value })}
                                            placeholder="Thank you to our sponsors..."
                                        />
                                    </div>
                                </div>

                                {/* Grid Columns */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Grid3X3 className="h-4 w-4" />
                                        Grid Columns
                                    </Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { value: 'auto', label: 'Auto' },
                                            { value: '2', label: '2' },
                                            { value: '3', label: '3' },
                                            { value: '4', label: '4' },
                                        ].map((col) => (
                                            <Button
                                                key={col.value}
                                                variant={directoryConfig.columns === col.value ? 'default' : 'outline'}
                                                onClick={() => setDirectoryConfig({ ...directoryConfig, columns: col.value as ColumnsOption })}
                                            >
                                                {col.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Palette className="h-4 w-4" />
                                        Theme
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'auto', label: 'Auto' },
                                            { value: 'light', label: 'Light' },
                                            { value: 'dark', label: 'Dark' },
                                        ].map((theme) => (
                                            <Button
                                                key={theme.value}
                                                variant={directoryConfig.theme === theme.value ? 'default' : 'outline'}
                                                onClick={() => setDirectoryConfig({ ...directoryConfig, theme: theme.value as ThemeOption })}
                                            >
                                                {theme.label}
                                            </Button>
                                        ))}
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
                                            checked={directoryConfig.showCta}
                                            onCheckedChange={(checked) => setDirectoryConfig({ ...directoryConfig, showCta: checked })}
                                        />
                                    </div>

                                    {directoryConfig.showCta && (
                                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                                            <div className="space-y-2">
                                                <Label>CTA Button Text</Label>
                                                <Input
                                                    value={directoryConfig.ctaText}
                                                    onChange={(e) => setDirectoryConfig({ ...directoryConfig, ctaText: e.target.value })}
                                                    placeholder="Become a Sponsor"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>CTA Button URL</Label>
                                                <Input
                                                    type="url"
                                                    value={directoryConfig.ctaUrl}
                                                    onChange={(e) => setDirectoryConfig({ ...directoryConfig, ctaUrl: e.target.value })}
                                                    placeholder="https://your-signup-page.com"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Link to your sponsor signup or contact page
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Category Filter */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="flex items-center gap-2">
                                        <Grid3X3 className="h-4 w-4" />
                                        Category Filter
                                    </Label>
                                    <Select
                                        value={directoryConfig.category || 'all'}
                                        onValueChange={(value) => setDirectoryConfig({
                                            ...directoryConfig,
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
                                    <p className="text-xs text-muted-foreground">
                                        Show only sponsors from a specific category
                                    </p>
                                </div>

                                {/* Display Options */}
                                <div className="space-y-4 pt-2 border-t">
                                    <Label>Display Options</Label>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-normal">Show Contact Info</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Display phone and email on cards
                                            </p>
                                        </div>
                                        <Switch
                                            checked={directoryConfig.showContact}
                                            onCheckedChange={(checked) => setDirectoryConfig({ ...directoryConfig, showContact: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-normal">Show Social Links</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Display social media icons
                                            </p>
                                        </div>
                                        <Switch
                                            checked={directoryConfig.showSocial}
                                            onCheckedChange={(checked) => setDirectoryConfig({ ...directoryConfig, showSocial: checked })}
                                        />
                                    </div>
                                </div>

                                {/* Branding Toggle */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="space-y-0.5">
                                        <Label>Show Branding</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Display powered-by attribution
                                        </p>
                                    </div>
                                    <Switch
                                        checked={directoryConfig.branding}
                                        onCheckedChange={(checked) => setDirectoryConfig({ ...directoryConfig, branding: checked })}
                                    />
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
                                            Preview your sponsor directory
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={refreshPreview}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refresh
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={directoryPreviewUrl} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Open
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/50 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                                    <iframe
                                        key={previewKey}
                                        src={directoryPreviewUrl}
                                        className="w-full h-full border-0"
                                        title="Directory Preview"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Embed Code Output */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                Embed Code
                            </CardTitle>
                            <CardDescription>
                                Copy this code to add the sponsor directory to your website
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                    <code>{directoryEmbedCode}</code>
                                </pre>
                                <Button
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(directoryEmbedCode, 'Directory')}
                                >
                                    {copiedCode === 'Directory' ? (
                                        <Check className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Copy className="h-4 w-4 mr-2" />
                                    )}
                                    {copiedCode === 'Directory' ? 'Copied!' : 'Copy Code'}
                                </Button>
                            </div>

                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Best Practices</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                        <li>Create a dedicated "Our Sponsors" or "Partners" page</li>
                                        <li>Set a minimum height of 600px for the iframe</li>
                                        <li>Use the full page width for best results</li>
                                        <li>Add your sponsor signup URL to drive new advertisers</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>

                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="wix">
                                    <AccordionTrigger className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Wix Installation Instructions
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Create a new page (e.g., "Our Sponsors")</li>
                                            <li>Add an <strong>Embed HTML</strong> element</li>
                                            <li>Paste the embed code above</li>
                                            <li>Stretch the element to full page width</li>
                                            <li>Set the height to at least 600px</li>
                                        </ol>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Email Embed Tab */}
                <TabsContent value="email" className="space-y-6">
                    {/* Info Alert */}
                    <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertTitle>Email-Safe Ad Embeds</AlertTitle>
                        <AlertDescription>
                            Generate simple HTML code that works in Wix emails and other email platforms.
                            No JavaScript required - just paste the code directly into your email template.
                        </AlertDescription>
                    </Alert>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Configuration Panel */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings2 className="h-5 w-5" />
                                    Email Embed Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure how ads appear in your emails
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Mode Selection */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Display Mode
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant={emailConfig.mode === 'dynamic' ? 'default' : 'outline'}
                                            className="h-auto py-3 flex-col gap-1"
                                            onClick={() => setEmailConfig({ ...emailConfig, mode: 'dynamic', selectedAdId: '' })}
                                        >
                                            <RefreshCw className="h-5 w-5" />
                                            <span className="font-medium">Dynamic</span>
                                            <span className="text-xs opacity-70">Rotating ads</span>
                                        </Button>
                                        <Button
                                            variant={emailConfig.mode === 'static' ? 'default' : 'outline'}
                                            className="h-auto py-3 flex-col gap-1"
                                            onClick={() => setEmailConfig({ ...emailConfig, mode: 'static' })}
                                        >
                                            <Image className="h-5 w-5" />
                                            <span className="font-medium">Static</span>
                                            <span className="text-xs opacity-70">Specific ad</span>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {emailConfig.mode === 'dynamic'
                                            ? 'Each email open may show a different ad from your active ads'
                                            : 'Shows the same specific ad every time'}
                                    </p>
                                </div>

                                {/* Target Website (for dynamic mode) */}
                                {emailConfig.mode === 'dynamic' && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            Target Website
                                        </Label>
                                        <Select
                                            value={emailConfig.website || 'all'}
                                            onValueChange={(value) => setEmailConfig({
                                                ...emailConfig,
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
                                        <p className="text-xs text-muted-foreground">
                                            Only show ads targeted to this specific website
                                        </p>
                                    </div>
                                )}

                                {/* Static Ad ID (for static mode) */}
                                {emailConfig.mode === 'static' && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Link2 className="h-4 w-4" />
                                            Ad ID
                                        </Label>
                                        <Input
                                            value={emailConfig.selectedAdId}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, selectedAdId: e.target.value })}
                                            placeholder="Enter the ad ID from Ad Server"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Find the ad ID in the Ad Server page. Click on an ad to see its ID.
                                        </p>
                                    </div>
                                )}

                                {/* Display Options */}
                                <div className="space-y-4 pt-2 border-t">
                                    <Label>Display Options</Label>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-normal">Alt Text</Label>
                                        <Input
                                            value={emailConfig.altText}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, altText: e.target.value })}
                                            placeholder="Community Sponsor"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Displayed when image can't load or for accessibility
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-normal">Max Width (px)</Label>
                                        <Select
                                            value={emailConfig.maxWidth}
                                            onValueChange={(value) => setEmailConfig({ ...emailConfig, maxWidth: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="300">300px - Small</SelectItem>
                                                <SelectItem value="400">400px - Medium</SelectItem>
                                                <SelectItem value="500">500px - Large</SelectItem>
                                                <SelectItem value="600">600px - Full Width</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Maximum width of the ad image in the email
                                        </p>
                                    </div>
                                </div>

                                {/* Fallback URL */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4" />
                                        Fallback URL (Optional)
                                    </Label>
                                    <Input
                                        type="url"
                                        value={emailConfig.fallbackUrl}
                                        onChange={(e) => setEmailConfig({ ...emailConfig, fallbackUrl: e.target.value })}
                                        placeholder="https://your-website.com/sponsors"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Where to redirect if no ads are available
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Preview Panel */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="h-5 w-5" />
                                    Live Preview
                                </CardTitle>
                                <CardDescription>
                                    How the ad will appear in emails
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/50 rounded-lg p-6 min-h-[200px] flex flex-col items-center justify-center gap-4">
                                    <div
                                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                                        style={{ maxWidth: `${emailConfig.maxWidth}px`, width: '100%' }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            key={previewKey}
                                            src={emailImageUrl}
                                            alt={emailConfig.altText || 'Community Sponsor'}
                                            className="w-full h-auto"
                                            style={{ aspectRatio: '3/1', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={refreshPreview}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refresh Preview
                                        </Button>
                                    </div>
                                </div>

                                {emailConfig.mode === 'dynamic' && (
                                    <Alert className="mt-4">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription className="text-sm">
                                            <strong>Dynamic Mode:</strong> Each time the preview refreshes or an email is opened,
                                            a different ad may be shown based on weight and availability.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Embed Code Output */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                Email Embed Code
                            </CardTitle>
                            <CardDescription>
                                Copy this code and paste it into your Wix email template or other email builder
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Main Embed Code */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4" />
                                    Clickable Ad (Recommended)
                                </Label>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{emailEmbedCode}</code>
                                    </pre>
                                    <Button
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(emailEmbedCode, 'Email Clickable')}
                                    >
                                        {copiedCode === 'Email Clickable' ? (
                                            <Check className="h-4 w-4 mr-2" />
                                        ) : (
                                            <Copy className="h-4 w-4 mr-2" />
                                        )}
                                        {copiedCode === 'Email Clickable' ? 'Copied!' : 'Copy Code'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Includes click tracking - users who click will be redirected to the advertiser's website
                                </p>
                            </div>

                            {/* Image Only Code */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    Image Only (No Link)
                                </Label>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                        <code>{emailImageOnlyCode}</code>
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(emailImageOnlyCode, 'Email Image')}
                                    >
                                        {copiedCode === 'Email Image' ? (
                                            <Check className="h-4 w-4 mr-2" />
                                        ) : (
                                            <Copy className="h-4 w-4 mr-2" />
                                        )}
                                        {copiedCode === 'Email Image' ? 'Copied!' : 'Copy Code'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Just the image - use if you need to add your own link or don't want click tracking
                                </p>
                            </div>

                            {/* Direct URLs */}
                            <div className="space-y-4 pt-4 border-t">
                                <Label>Direct URLs (For Advanced Use)</Label>
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-normal text-muted-foreground">Image URL</Label>
                                        <div className="flex gap-2">
                                            <Input value={emailImageUrl} readOnly className="font-mono text-xs" />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(emailImageUrl, 'Image URL')}
                                            >
                                                {copiedCode === 'Image URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-normal text-muted-foreground">Click URL</Label>
                                        <div className="flex gap-2">
                                            <Input value={emailClickUrl} readOnly className="font-mono text-xs" />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(emailClickUrl, 'Click URL')}
                                            >
                                                {copiedCode === 'Click URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="wix-email">
                                    <AccordionTrigger className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Wix Email Instructions
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Open your Wix email campaign or automation</li>
                                            <li>Add an <strong>HTML</strong> or <strong>Custom Code</strong> element</li>
                                            <li>Paste the embed code above</li>
                                            <li>Preview to verify the ad appears correctly</li>
                                            <li>Send a test email to yourself first!</li>
                                        </ol>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="other-email">
                                    <AccordionTrigger className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Other Email Platforms
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <p>This code works with any email platform that supports HTML:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li><strong>Mailchimp:</strong> Use a Code block or HTML content block</li>
                                            <li><strong>Constant Contact:</strong> Use the HTML block feature</li>
                                            <li><strong>SendGrid:</strong> Paste directly into your HTML template</li>
                                            <li><strong>Other platforms:</strong> Look for "HTML" or "Custom Code" option</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="tracking">
                                    <AccordionTrigger className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            How Tracking Works
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <ul className="list-disc list-inside space-y-1">
                                            <li><strong>Impressions:</strong> Counted each time the email image loads</li>
                                            <li><strong>Clicks:</strong> Counted when someone clicks the ad and is redirected</li>
                                            <li>Stats are visible in the Ad Server dashboard</li>
                                            <li>Email clicks are tagged as "email_click" in events</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
