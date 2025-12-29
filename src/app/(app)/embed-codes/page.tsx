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
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="rotator" className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Ad Rotator
                    </TabsTrigger>
                    <TabsTrigger value="directory" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Sponsor Directory
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
            </Tabs>
        </div>
    );
}
