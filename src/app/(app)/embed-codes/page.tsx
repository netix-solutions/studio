'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Code,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  Settings2,
  Globe,
  Layers,
  BookOpen,
  Image,
  CheckCircle,
  Info,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  type CommunityWebsiteId,
  type BusinessCategory,
  COMMUNITY_WEBSITE_LIST,
  BUSINESS_CATEGORY_LABELS,
} from '@/lib/types';

type ThemeOption = 'auto' | 'light' | 'dark';
type ColumnsOption = 'auto' | '2' | '3' | '4';
type LayoutOption = 'single' | '1x2' | '1x3' | '2x3';

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function EmbedCodesPage() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'directory' | 'ads'>('directory');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Code className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Embed Codes</h1>
          <p className="text-muted-foreground">
            Generate embed codes for Wesley Chapel & Pasco community websites
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Directory
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Ad Rotator
          </TabsTrigger>
        </TabsList>

        {/* Directory Tab */}
        <TabsContent value="directory">
          <DirectoryEmbedSection copyToClipboard={copyToClipboard} copiedCode={copiedCode} />
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads">
          <AdEmbedSection copyToClipboard={copyToClipboard} copiedCode={copiedCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// DIRECTORY EMBED SECTION
// =============================================================================

interface SectionProps {
  copyToClipboard: (text: string, label: string) => void;
  copiedCode: string | null;
}

function DirectoryEmbedSection({ copyToClipboard, copiedCode }: SectionProps) {
  const [previewKey, setPreviewKey] = useState(0);
  const [embedMethod, setEmbedMethod] = useState<'iframe' | 'sdk'>('iframe');

  const [config, setConfig] = useState({
    theme: 'light' as ThemeOption,
    columns: 'auto' as ColumnsOption,
    category: '' as BusinessCategory | '',
    featuredOnly: false,
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate iframe embed code
  const iframeCode = useMemo(() => {
    const params = new URLSearchParams();
    params.set('theme', config.theme);
    if (config.columns !== 'auto') params.set('columns', config.columns);
    if (config.category) params.set('category', config.category);
    if (config.featuredOnly) params.set('featured', 'true');

    const url = `${baseUrl}/api/directory/embed/full?${params.toString()}`;

    return `<iframe
  src="${url}"
  width="100%"
  style="min-height: 800px; border: none;"
  title="Business Directory"
  loading="lazy">
</iframe>`;
  }, [config, baseUrl]);

  // Generate SDK embed code
  const sdkCode = useMemo(() => {
    let initOptions = `{
      container: '#business-directory',
      theme: '${config.theme}'`;
    
    if (config.columns !== 'auto') {
      initOptions += `,
      columns: '${config.columns}'`;
    }
    if (config.category) {
      initOptions += `,
      category: '${config.category}'`;
    }
    if (config.featuredOnly) {
      initOptions += `,
      showFeatured: true`;
    }
    initOptions += `
    }`;

    return `<!-- Include SDK files -->
<link rel="stylesheet" href="${baseUrl}/directory-sdk.css">
<script src="${baseUrl}/directory-sdk.js"></script>

<!-- Directory container -->
<div id="business-directory"></div>

<!-- Initialize -->
<script>
  BusinessDirectory.init(${initOptions});
</script>`;
  }, [config, baseUrl]);

  // Preview URL
  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('theme', config.theme);
    if (config.columns !== 'auto') params.set('columns', config.columns);
    if (config.category) params.set('category', config.category);
    if (config.featuredOnly) params.set('featured', 'true');

    return `${baseUrl}/api/directory/embed/full?${params.toString()}`;
  }, [config, baseUrl]);

  // JSON API URL
  const jsonApiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (config.category) params.set('category', config.category);
    if (config.featuredOnly) params.set('featured', 'true');
    params.set('limit', '100');

    return `${baseUrl}/api/directory/public/listings?${params.toString()}`;
  }, [config, baseUrl]);

  const currentCode = embedMethod === 'iframe' ? iframeCode : sdkCode;

  return (
    <div className="space-y-6">
      {/* Embed Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Embed Method</CardTitle>
          <CardDescription>Select how you want to embed the directory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div
              className={cn(
                'p-4 border-2 rounded-lg cursor-pointer transition-all',
                embedMethod === 'iframe' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
              onClick={() => setEmbedMethod('iframe')}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-4 h-4 rounded-full border-2', embedMethod === 'iframe' ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                <h3 className="font-semibold">iframe Embed</h3>
                <Badge variant="secondary">Recommended</Badge>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Simple, one-line embed. Works on any website. Just paste and go.
              </p>
            </div>
            <div
              className={cn(
                'p-4 border-2 rounded-lg cursor-pointer transition-all',
                embedMethod === 'sdk' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
              onClick={() => setEmbedMethod('sdk')}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-4 h-4 rounded-full border-2', embedMethod === 'sdk' ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                <h3 className="font-semibold">JavaScript SDK</h3>
                <Badge variant="outline">Advanced</Badge>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Native rendering with full styling control. Best for matching your site's design.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration & Preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme */}
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={config.theme}
                onValueChange={(value) => setConfig({ ...config, theme: value as ThemeOption })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Columns */}
            <div className="space-y-2">
              <Label>Grid Columns</Label>
              <Select
                value={config.columns}
                onValueChange={(value) => setConfig({ ...config, columns: value as ColumnsOption })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Responsive)</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label>Category Filter (Optional)</Label>
              <Select
                value={config.category || 'all'}
                onValueChange={(value) => setConfig({ ...config, category: value === 'all' ? '' : value as BusinessCategory })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(BUSINESS_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Featured Only */}
            <div className="flex items-center justify-between">
              <Label>Show Featured Only</Label>
              <Switch
                checked={config.featuredOnly}
                onCheckedChange={(checked) => setConfig({ ...config, featuredOnly: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewKey(prev => prev + 1)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden" style={{ height: '450px' }}>
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

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            {embedMethod === 'iframe' ? 'iframe Embed Code' : 'JavaScript SDK Code'}
          </CardTitle>
          <CardDescription>
            Copy this code to your Wesley Chapel or Pasco website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto max-h-[300px]">
              <code>{currentCode}</code>
            </pre>
            <Button
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(currentCode, 'Embed Code')}
            >
              {copiedCode === 'Embed Code' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedCode === 'Embed Code' ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {embedMethod === 'iframe' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Quick Installation</AlertTitle>
              <AlertDescription>
                Just paste this code wherever you want the directory to appear. No additional setup required.
              </AlertDescription>
            </Alert>
          )}

          {embedMethod === 'sdk' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>SDK Benefits</AlertTitle>
              <AlertDescription>
                The SDK provides native rendering, full CSS control, and better performance. 
                Customize using CSS variables like <code>--bd-primary-color</code>.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Signup URL - For Marketing */}
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Globe className="h-5 w-5" />
            Free Signup URL
            <Badge className="bg-green-100 text-green-700 ml-2">Limited Time</Badge>
          </CardTitle>
          <CardDescription>
            Share this link with local businesses to let them create a free directory listing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Direct Signup Link</Label>
            <div className="flex gap-2">
              <Input value={`${baseUrl}/directory-signup`} readOnly className="font-mono text-sm" />
              <Button
                size="sm"
                onClick={() => copyToClipboard(`${baseUrl}/directory-signup`, 'Signup URL')}
              >
                {copiedCode === 'Signup URL' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">💡 <strong>Use this link to:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Post on social media to attract local businesses</li>
              <li>Include in email marketing campaigns</li>
              <li>Share in local business groups</li>
              <li>The embedded directory also includes a signup CTA</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direct URL</Label>
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
            <div className="space-y-2">
              <Label>JSON API</Label>
              <div className="flex gap-2">
                <Input value={jsonApiUrl} readOnly className="font-mono text-xs" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(jsonApiUrl, 'API URL')}
                >
                  {copiedCode === 'API URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-3">Features Included</h4>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                'Search functionality',
                'Category filtering',
                'Responsive design',
                'Impression tracking',
                'Click tracking',
                'Light/dark themes',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// AD EMBED SECTION
// =============================================================================

function AdEmbedSection({ copyToClipboard, copiedCode }: SectionProps) {
  const [previewKey, setPreviewKey] = useState(0);

  const [config, setConfig] = useState({
    website: '' as CommunityWebsiteId | '',
    theme: 'auto' as ThemeOption,
    layout: 'single' as LayoutOption,
    branding: true,
    responsive: true,
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate ad embed code
  const embedCode = useMemo(() => {
    const params = new URLSearchParams();
    if (config.website) params.set('website', config.website);
    params.set('theme', config.theme);
    params.set('layout', config.layout);
    if (!config.branding) params.set('branding', 'false');
    if (!config.responsive) params.set('responsive', 'false');

    const url = `${baseUrl}/api/ads/embed?${params.toString()}`;

    return `<iframe
  src="${url}"
  width="100%"
  height="300"
  style="border: none;"
  title="Community Ads"
  loading="lazy">
</iframe>`;
  }, [config, baseUrl]);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (config.website) params.set('website', config.website);
    params.set('theme', config.theme);
    params.set('layout', config.layout);
    if (!config.branding) params.set('branding', 'false');
    if (!config.responsive) params.set('responsive', 'false');

    return `${baseUrl}/api/ads/embed?${params.toString()}`;
  }, [config, baseUrl]);

  return (
    <div className="space-y-6">
      {/* Configuration & Preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Website */}
            <div className="space-y-2">
              <Label>Target Website</Label>
              <Select
                value={config.website || 'all'}
                onValueChange={(value) => setConfig({ ...config, website: value === 'all' ? '' : value as CommunityWebsiteId })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Websites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Websites</SelectItem>
                  {COMMUNITY_WEBSITE_LIST.map((website) => (
                    <SelectItem key={website.id} value={website.id}>
                      {website.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label>Theme</Label>
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

            {/* Layout */}
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select
                value={config.layout}
                onValueChange={(value) => setConfig({ ...config, layout: value as LayoutOption })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Ad</SelectItem>
                  <SelectItem value="1x2">1x2 (Two Ads)</SelectItem>
                  <SelectItem value="1x3">1x3 (Three Ads)</SelectItem>
                  <SelectItem value="2x3">2x3 (Six Ads)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show Branding</Label>
                <Switch
                  checked={config.branding}
                  onCheckedChange={(checked) => setConfig({ ...config, branding: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Responsive</Label>
                <Switch
                  checked={config.responsive}
                  onCheckedChange={(checked) => setConfig({ ...config, responsive: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewKey(prev => prev + 1)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden" style={{ height: '350px' }}>
              <iframe
                key={previewKey}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Ad Preview"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed Code
          </CardTitle>
          <CardDescription>
            Copy this code to add the ad rotator to your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{embedCode}</code>
            </pre>
            <Button
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(embedCode, 'Ad Embed')}
            >
              {copiedCode === 'Ad Embed' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedCode === 'Ad Embed' ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Direct URL</Label>
            <div className="flex gap-2">
              <Input value={previewUrl} readOnly className="font-mono text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(previewUrl, 'Ad URL')}
              >
                {copiedCode === 'Ad URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
