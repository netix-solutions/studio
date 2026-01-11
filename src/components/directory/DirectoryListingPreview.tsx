'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Star,
  Crown,
  ExternalLink,
} from 'lucide-react';
import { DirectoryDraft } from '@/lib/types';
import { BUSINESS_CATEGORY_LABELS, BUSINESS_CATEGORY_ICONS, type BusinessCategory } from '@/lib/types';

interface DirectoryListingPreviewProps {
  listing: Partial<DirectoryDraft>;
  tier?: 'basic' | 'featured' | 'premium';
}

export function DirectoryListingPreview({ listing, tier = 'basic' }: DirectoryListingPreviewProps) {
  const isFeatured = tier === 'featured' || tier === 'premium';
  const isPremium = tier === 'premium';

  const categoryLabel = listing.category
    ? BUSINESS_CATEGORY_LABELS[listing.category as BusinessCategory]
    : null;
  const categoryIcon = listing.category
    ? BUSINESS_CATEGORY_ICONS[listing.category as BusinessCategory]
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Banner Image */}
        {listing.bannerImageUrl && (
          <div className="relative w-full h-32 bg-gradient-to-r from-slate-100 to-slate-200">
            <img
              src={listing.bannerImageUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
            {isFeatured && (
              <Badge className="absolute top-2 right-2 bg-amber-500 text-white flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </Badge>
            )}
            {isPremium && (
              <Badge className="absolute top-2 left-2 bg-purple-600 text-white flex items-center gap-1">
                <Crown className="h-3 w-3 fill-current" />
                Premium
              </Badge>
            )}
          </div>
        )}

        <div className="p-6">
          {/* Logo & Business Name */}
          <div className="flex items-start gap-4 mb-4">
            {listing.logoUrl ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden border bg-white shrink-0">
                <img
                  src={listing.logoUrl}
                  alt={listing.businessName || 'Business logo'}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg border bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-2xl text-slate-400">{listing.businessName?.charAt(0) || '?'}</span>
              </div>
            )}

            <div className="flex-1">
              <h3 className={`font-bold leading-tight ${isPremium ? 'text-2xl' : 'text-xl'}`}>
                {listing.businessName || 'Your Business Name'}
              </h3>
              {categoryLabel && (
                <Badge variant="secondary" className="mt-2">
                  <span className="mr-1">{categoryIcon}</span>
                  {categoryLabel}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {listing.description}
            </p>
          )}

          {/* Contact Info */}
          <div className="space-y-2 mb-4">
            {listing.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{listing.phone}</span>
              </div>
            )}
            {listing.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{listing.contactEmail}</span>
              </div>
            )}
            {listing.websiteUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{listing.websiteUrl}</span>
              </div>
            )}
            {(listing.city || listing.state) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {[listing.city, listing.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Social Links */}
          {listing.socialLinks && Object.values(listing.socialLinks).some(url => url) && (
            <div className="flex gap-2 mb-4">
              {listing.socialLinks.facebookUrl && (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Facebook className="h-4 w-4 text-blue-600" />
                </div>
              )}
              {listing.socialLinks.instagramUrl && (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Instagram className="h-4 w-4 text-pink-600" />
                </div>
              )}
              {listing.socialLinks.linkedinUrl && (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Linkedin className="h-4 w-4 text-blue-700" />
                </div>
              )}
              {listing.socialLinks.twitterUrl && (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Twitter className="h-4 w-4 text-sky-500" />
                </div>
              )}
              {listing.socialLinks.youtubeUrl && (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Youtube className="h-4 w-4 text-red-600" />
                </div>
              )}
            </div>
          )}

          {/* CTA Button */}
          <Button className="w-full" variant={isPremium ? 'default' : 'outline'}>
            <span>Visit Website</span>
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
