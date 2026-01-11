'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  User,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Gift,
  Facebook,
  Instagram,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  type BusinessCategory,
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';

interface FormData {
  // Contact
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Business
  businessName: string;
  tagline: string;
  description: string;
  category: BusinessCategory | '';
  websiteUrl: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Social
  facebookUrl: string;
  instagramUrl: string;
}

export default function DirectorySignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    tagline: '',
    description: '',
    category: '',
    websiteUrl: '',
    address: '',
    city: '',
    state: 'FL',
    zipCode: '',
    facebookUrl: '',
    instagramUrl: '',
  });

  // UTM tracking
  const [utmParams, setUtmParams] = useState({
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
  });

  useEffect(() => {
    setUtmParams({
      utmSource: searchParams.get('utm_source') || '',
      utmMedium: searchParams.get('utm_medium') || '',
      utmCampaign: searchParams.get('utm_campaign') || '',
    });
  }, [searchParams]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitError(null);
  };

  const categoryOptions = Object.entries(BUSINESS_CATEGORIES).map(([, value]) => ({
    value,
    label: BUSINESS_CATEGORY_LABELS[value as BusinessCategory],
    icon: BUSINESS_CATEGORY_ICONS[value as BusinessCategory],
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.businessName.trim()) {
      setSubmitError('Business name is required');
      return;
    }
    if (!formData.email.trim()) {
      setSubmitError('Email address is required');
      return;
    }
    if (!formData.category) {
      setSubmitError('Please select a business category');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/directory/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...utmParams,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create listing');
      }

      setIsSuccess(true);
      toast({
        title: '🎉 Success!',
        description: 'Your free business listing has been created!',
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      setSubmitError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <Card className="border-blue-200 shadow-xl">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Submission Received!</h1>
              <p className="text-muted-foreground mb-6">
                Your listing has been submitted for review. Our team will review it 
                and you'll receive an email once it's approved (usually within 1-2 business days).
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-sm mb-2">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>✓ We'll review your listing for accuracy</li>
                  <li>✓ Once approved, it goes live in our directory</li>
                  <li>✓ You'll receive a confirmation email</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Want More Visibility?
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Upgrade to an advertising plan to get your business featured on our community websites 
                  and reach thousands of local residents every month.
                </p>
                <Button asChild size="sm">
                  <a href="/pricing">
                    View Ad Plans <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Questions? Contact us at support@community-websites.com
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="bg-green-100 text-green-700 border-green-200 mb-4 text-sm px-4 py-1">
            <Gift className="w-4 h-4 mr-2 inline" />
            Limited Time: 100% Free!
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Get Your Business Listed
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Join our community business directory and get discovered by local residents.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: CheckCircle, text: 'Instant visibility' },
            { icon: MapPin, text: 'Reach local customers' },
            { icon: Globe, text: 'Link to your website' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <item.icon className="w-5 h-5 text-green-600 shrink-0" />
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5" />
                  Your Contact Info
                </CardTitle>
                <CardDescription>
                  We'll use this to contact you about your listing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="you@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Tell us about your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    placeholder="Your Business Name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Business Category *</Label>
                  <Select
                    value={formData.category || undefined}
                    onValueChange={(value) => updateField('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    placeholder="A short catchy phrase about your business"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.tagline.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Tell visitors about your business, what you offer, and what makes you special..."
                    maxLength={500}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/500 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="websiteUrl"
                      value={formData.websiteUrl}
                      onChange={(e) => updateField('websiteUrl', e.target.value)}
                      placeholder="https://www.yourbusiness.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5" />
                  Location (Optional)
                </CardTitle>
                <CardDescription>
                  Help customers find you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Wesley Chapel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      placeholder="FL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => updateField('zipCode', e.target.value)}
                      placeholder="33544"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social (Optional - Expandable) */}
            <Card>
              <CardHeader 
                className="pb-4 cursor-pointer"
                onClick={() => setShowSocial(!showSocial)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Instagram className="w-5 h-5" />
                      Social Media (Optional)
                    </CardTitle>
                    <CardDescription>
                      Connect your social profiles
                    </CardDescription>
                  </div>
                  <Button type="button" variant="ghost" size="sm">
                    {showSocial ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </CardHeader>
              {showSocial && (
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                        <Facebook className="w-4 h-4 text-blue-600" />
                        Facebook
                      </Label>
                      <Input
                        id="facebookUrl"
                        value={formData.facebookUrl}
                        onChange={(e) => updateField('facebookUrl', e.target.value)}
                        placeholder="https://facebook.com/yourbusiness"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-600" />
                        Instagram
                      </Label>
                      <Input
                        id="instagramUrl"
                        value={formData.instagramUrl}
                        onChange={(e) => updateField('instagramUrl', e.target.value)}
                        placeholder="https://instagram.com/yourbusiness"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Error Display */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Submit */}
            <div className="space-y-4">
              <Button
                type="submit"
                size="lg"
                className="w-full text-lg py-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Your Listing...
                  </>
                ) : (
                  <>
                    Create My Free Listing
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                By signing up, you agree to our{' '}
                <a href="/terms" className="underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
