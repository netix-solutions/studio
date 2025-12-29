'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Upload,
  Calendar,
  Link2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  type DirectoryListing,
  type BusinessCategory,
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';

interface DirectoryListingFormProps {
  listing: Partial<DirectoryListing>;
  onChange: (listing: Partial<DirectoryListing>) => void;
  onSave?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  showAdvancedOptions?: boolean;
}

export function DirectoryListingForm({
  listing,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
  showAdvancedOptions = true,
}: DirectoryListingFormProps) {
  const [socialOpen, setSocialOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [additionalContactOpen, setAdditionalContactOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);

  const updateField = <K extends keyof DirectoryListing>(
    field: K,
    value: DirectoryListing[K]
  ) => {
    onChange({ ...listing, [field]: value });
  };

  const categoryOptions = Object.entries(BUSINESS_CATEGORIES).map(([, value]) => ({
    value,
    label: BUSINESS_CATEGORY_LABELS[value as BusinessCategory],
    icon: BUSINESS_CATEGORY_ICONS[value as BusinessCategory],
  }));

  return (
    <div className="space-y-6">
      {/* Business Identity */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5" />
            Business Identity
          </CardTitle>
          <CardDescription>
            Basic information about your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={listing.businessName || ''}
              onChange={(e) => updateField('businessName', e.target.value)}
              placeholder="Your Business Name"
              maxLength={100}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={listing.tagline || ''}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder="A short catchy phrase about your business"
              maxLength={100}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              {(listing.tagline?.length || 0)}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={listing.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Tell visitors about your business, what you offer, and what makes you special..."
              maxLength={500}
              rows={4}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              {(listing.description?.length || 0)}/500 characters
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Business Category</Label>
              <Select
                value={listing.category || ''}
                onValueChange={(value) => updateField('category', value as BusinessCategory)}
                disabled={disabled}
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
              <Label htmlFor="yearEstablished">Year Established</Label>
              <Input
                id="yearEstablished"
                type="number"
                value={listing.yearEstablished || ''}
                onChange={(e) => updateField('yearEstablished', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 2015"
                min={1800}
                max={new Date().getFullYear()}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Business Logo</Label>
            <div className="flex items-start gap-4">
              {listing.logoUrl && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img
                    src={listing.logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="logo-upload"
                    className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          updateField('logoUrl', reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {listing.logoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateField('logoUrl', '')}
                      disabled={disabled}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Square logo works best (e.g., 200x200 pixels). Max 2MB.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                How visitors can reach you
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="showContact" className="text-sm">Show on card</Label>
              <Switch
                id="showContact"
                checked={listing.showContactInfo ?? true}
                onCheckedChange={(checked) => updateField('showContactInfo', checked)}
                disabled={disabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={listing.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="pl-10"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={listing.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contact@yourbusiness.com"
                  className="pl-10"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="websiteUrl"
                value={listing.websiteUrl || ''}
                onChange={(e) => updateField('websiteUrl', e.target.value)}
                placeholder="https://www.yourbusiness.com"
                className="pl-10"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Contact Options (Collapsible) */}
      {showAdvancedOptions && (
        <Collapsible open={additionalContactOpen} onOpenChange={setAdditionalContactOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Link2 className="w-5 h-5" />
                      Additional Links
                    </CardTitle>
                    <CardDescription>
                      Booking, menu, and secondary contact
                    </CardDescription>
                  </div>
                  {additionalContactOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                    <Input
                      id="secondaryPhone"
                      value={listing.secondaryPhone || ''}
                      onChange={(e) => updateField('secondaryPhone', e.target.value)}
                      placeholder="Alternative phone number"
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appointmentUrl">Booking/Appointment URL</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="appointmentUrl"
                        value={listing.appointmentUrl || ''}
                        onChange={(e) => updateField('appointmentUrl', e.target.value)}
                        placeholder="https://booking.example.com"
                        className="pl-10"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menuUrl">Menu/Catalog URL</Label>
                  <Input
                    id="menuUrl"
                    value={listing.menuUrl || ''}
                    onChange={(e) => updateField('menuUrl', e.target.value)}
                    placeholder="https://example.com/menu"
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to your menu, service catalog, or price list
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yelpUrl">Yelp</Label>
                    <Input
                      id="yelpUrl"
                      value={listing.yelpUrl || ''}
                      onChange={(e) => updateField('yelpUrl', e.target.value)}
                      placeholder="https://yelp.com/biz/yourbusiness"
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="googleBusinessUrl">Google Business</Label>
                    <Input
                      id="googleBusinessUrl"
                      value={listing.googleBusinessUrl || ''}
                      onChange={(e) => updateField('googleBusinessUrl', e.target.value)}
                      placeholder="Google Business Profile URL"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Address (Collapsible) */}
      <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="w-5 h-5" />
                    Business Address
                  </CardTitle>
                  <CardDescription>
                    Optional - Add your physical location
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="showAddress" className="text-sm">Show on card</Label>
                    <Switch
                      id="showAddress"
                      checked={listing.showAddress ?? false}
                      onCheckedChange={(checked) => updateField('showAddress', checked)}
                      disabled={disabled}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {addressOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={listing.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="123 Main Street"
                  disabled={disabled}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={listing.city || ''}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Wesley Chapel"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={listing.state || ''}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="FL"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={listing.zipCode || ''}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    placeholder="33544"
                    disabled={disabled}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Social Media (Collapsible) */}
      <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Instagram className="w-5 h-5" />
                    Social Media Links
                  </CardTitle>
                  <CardDescription>
                    Connect your social profiles
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="showSocial" className="text-sm">Show on card</Label>
                    <Switch
                      id="showSocial"
                      checked={listing.showSocialLinks ?? true}
                      onCheckedChange={(checked) => updateField('showSocialLinks', checked)}
                      disabled={disabled}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {socialOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    id="facebookUrl"
                    value={listing.facebookUrl || ''}
                    onChange={(e) => updateField('facebookUrl', e.target.value)}
                    placeholder="https://facebook.com/yourbusiness"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    id="instagramUrl"
                    value={listing.instagramUrl || ''}
                    onChange={(e) => updateField('instagramUrl', e.target.value)}
                    placeholder="https://instagram.com/yourbusiness"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-blue-700" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedinUrl"
                    value={listing.linkedinUrl || ''}
                    onChange={(e) => updateField('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/company/yourbusiness"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitterUrl" className="flex items-center gap-2">
                    <Twitter className="w-4 h-4" />
                    X (Twitter)
                  </Label>
                  <Input
                    id="twitterUrl"
                    value={listing.twitterUrl || ''}
                    onChange={(e) => updateField('twitterUrl', e.target.value)}
                    placeholder="https://x.com/yourbusiness"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtubeUrl" className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" />
                    YouTube
                  </Label>
                  <Input
                    id="youtubeUrl"
                    value={listing.youtubeUrl || ''}
                    onChange={(e) => updateField('youtubeUrl', e.target.value)}
                    placeholder="https://youtube.com/@yourbusiness"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktokUrl" className="flex items-center gap-2">
                    TikTok
                  </Label>
                  <Input
                    id="tiktokUrl"
                    value={listing.tiktokUrl || ''}
                    onChange={(e) => updateField('tiktokUrl', e.target.value)}
                    placeholder="https://tiktok.com/@yourbusiness"
                    disabled={disabled}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Header Image (Collapsible) */}
      {showAdvancedOptions && (
        <Collapsible open={imagesOpen} onOpenChange={setImagesOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ImageIcon className="w-5 h-5" />
                      Header Image
                    </CardTitle>
                    <CardDescription>
                      Add a banner image for your listing
                    </CardDescription>
                  </div>
                  {imagesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Banner/Header Image (optional)</Label>
                  {listing.bannerImageUrl && (
                    <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-800 mb-3">
                      <img
                        src={listing.bannerImageUrl}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="banner-upload"
                      className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Header Image
                    </Label>
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={disabled}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            updateField('bannerImageUrl', reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {listing.bannerImageUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateField('bannerImageUrl', '')}
                        disabled={disabled}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wide image for expanded card view (e.g., 1200x400 pixels). Max 2MB.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Save Button */}
      {onSave && (
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving || disabled || !listing.businessName}
            className="min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default DirectoryListingForm;
