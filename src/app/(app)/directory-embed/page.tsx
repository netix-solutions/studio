'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Code,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  Settings2,
  BookOpen,
  Globe,
  Layers,
} from 'lucide-react';
import { type BusinessCategory, BUSINESS_CATEGORY_LABELS } from '@/lib/types';

type ThemeOption = 'light' | 'dark' | 'auto';
type ColumnsOption = 'auto' | '2' | '3' | '4';

export default function DirectoryEmbedPage() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const [config, setConfig] = useState({
    theme: 'light' as ThemeOption,
    columns: 'auto' as ColumnsOption,
    category: '' as BusinessCategory | '',
    featuredOnly: false,
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate embed code
  const embedCode = useMemo(() => {
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

  // Generate preview URL
  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('theme', config.theme);
    if (config.columns !== 'auto') params.set('columns', config.columns);
    if (config.category) params.set('category', config.category);
    if (config.featuredOnly) params.set('featured', 'true');

    return `${baseUrl}/api/directory/embed/full?${params.toString()}`;
  }, [config, baseUrl]);

  // Generate JSON API URL
  const jsonApiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (config.category) params.set('category', config.category);
    if (config.featuredOnly) params.set('featured', 'true');
    params.set('limit', '100');

    return `${baseUrl}/api/directory/public/listings?${params.toString()}`;
  }, [config, baseUrl]);

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
          <h1 className="text-2xl font-bold">Directory Embed Codes</h1>
          <p className="text-muted-foreground">
            Generate embed codes for Wesley Chapel, Pasco, and other community websites
          </p>
        </div>
      </div>

      <Tabs defaultValue="full" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="full">
            <Layers className="h-4 w-4 mr-2" />
            Full Directory
          </TabsTrigger>
          <TabsTrigger value="json">
            <Code className="h-4 w-4 mr-2" />
            JSON API
          </TabsTrigger>
          <TabsTrigger value="help">
            <BookOpen className="h-4 w-4 mr-2" />
            Help
          </TabsTrigger>
        </TabsList>

        {/* Full Directory Tab */}
        <TabsContent value="full" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Customize your directory embed
                </CardDescription>
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
                  <input
                    type="checkbox"
                    checked={config.featuredOnly}
                    onChange={(e) => setConfig({ ...config, featuredOnly: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
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
                <div className="bg-slate-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
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
                Embed Code
              </CardTitle>
              <CardDescription>
                Copy this code to add the directory to your website
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
                  onClick={() => copyToClipboard(embedCode, 'Embed Code')}
                >
                  {copiedCode === 'Embed Code' ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copiedCode === 'Embed Code' ? 'Copied!' : 'Copy'}
                </Button>
              </div>

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
            </CardContent>
          </Card>
        </TabsContent>

        {/* JSON API Tab */}
        <TabsContent value="json" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>JSON API Endpoint</CardTitle>
              <CardDescription>
                Access directory listings programmatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Endpoint URL</Label>
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

              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Query Parameters:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li><code className="bg-white px-1 rounded">category</code> - Filter by business category</li>
                  <li><code className="bg-white px-1 rounded">featured</code> - Show only featured (true/false)</li>
                  <li><code className="bg-white px-1 rounded">limit</code> - Max listings to return (default: 100)</li>
                </ul>
              </div>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                <pre>{`{
  "success": true,
  "listings": [
    {
      "id": "...",
      "businessName": "Acme Corp",
      "description": "...",
      "category": "retail",
      "logoUrl": "...",
      "websiteUrl": "...",
      "phone": "...",
      "isFeatured": true,
      ...
    }
  ],
  "total": 42,
  "categoryCounts": { "retail": 5, ... }
}`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Installation Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">For Wesley Chapel Community Website</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Create a new page: <code className="bg-slate-100 px-2 py-0.5 rounded">/business-directory</code></li>
                  <li>Add the iframe code from the "Full Directory" tab</li>
                  <li>Adjust the height if needed (min 800px recommended)</li>
                  <li>Publish the page</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-3">For Pasco Community Website</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Same process as Wesley Chapel</li>
                  <li>The directory will automatically show all active listings</li>
                  <li>Consider filtering by category if needed for specific pages</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2 text-blue-900">💡 Pro Tips</h4>
                <ul className="text-sm space-y-1 text-blue-800">
                  <li>• Use <code className="bg-white px-1 rounded">theme=auto</code> to match the host site's theme</li>
                  <li>• Set minimum height to 800px to avoid scrolling issues</li>
                  <li>• The embed is fully responsive (mobile, tablet, desktop)</li>
                  <li>• Analytics are tracked automatically (impressions & clicks)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Features Included</h3>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Search functionality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Category filtering</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Featured highlighting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Click tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Impression tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Responsive design</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Related Links</h3>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="justify-start" asChild>
                    <a href="/directory-listings">
                      <Layers className="h-4 w-4 mr-2" />
                      Manage Directory Listings
                    </a>
                  </Button>
                  <Button variant="outline" className="justify-start" asChild>
                    <a href="/directory-signup">
                      <Globe className="h-4 w-4 mr-2" />
                      View Public Signup Form
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
