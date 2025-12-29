'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Globe, Facebook, Instagram, Linkedin, Twitter, Youtube, Star, ExternalLink } from 'lucide-react';
import {
  type DirectoryListing,
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';

interface DirectoryCardPreviewProps {
  listing: Partial<DirectoryListing>;
  adImageUrl?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export function DirectoryCardPreview({
  listing,
  adImageUrl,
  className = '',
  theme = 'light',
}: DirectoryCardPreviewProps) {
  const categoryLabel = listing.category
    ? BUSINESS_CATEGORY_LABELS[listing.category as BusinessCategory]
    : undefined;
  const categoryIcon = listing.category
    ? BUSINESS_CATEGORY_ICONS[listing.category as BusinessCategory]
    : undefined;

  const hasSocialLinks =
    listing.showSocialLinks &&
    (listing.facebookUrl ||
      listing.instagramUrl ||
      listing.linkedinUrl ||
      listing.twitterUrl ||
      listing.youtubeUrl);

  const hasContactInfo =
    listing.showContactInfo && (listing.phone || listing.email);

  const isDark = theme === 'dark';

  return (
    <Card
      className={`overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className} ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800'}`}
    >
      {/* Image Section */}
      <div className="relative aspect-[3/1] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
        {/* Featured Badge */}
        {listing.isFeatured && (
          <Badge className="absolute top-3 right-3 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Featured
          </Badge>
        )}

        {/* Category Badge */}
        {categoryLabel && (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 z-10 bg-black/60 text-white border-0 backdrop-blur-sm"
          >
            <span className="mr-1">{categoryIcon}</span>
            {categoryLabel}
          </Badge>
        )}

        {/* Ad Image or Logo */}
        {adImageUrl ? (
          <img
            src={adImageUrl}
            alt={listing.businessName || 'Business'}
            className="w-full h-full object-cover"
          />
        ) : listing.logoUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            <img
              src={listing.logoUrl}
              alt={listing.businessName || 'Business'}
              className="max-w-[60%] max-h-[80%] object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            <div className="text-center text-slate-400 dark:text-slate-500">
              <Globe className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Ad Preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-4">
        {/* Business Name */}
        <h3 className="font-semibold text-lg mb-1">
          {listing.businessName || 'Business Name'}
        </h3>

        {/* Tagline */}
        {listing.tagline && (
          <p className="text-sm text-muted-foreground italic mb-2">
            {listing.tagline}
          </p>
        )}

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {listing.description}
          </p>
        )}

        {/* Contact Info */}
        {hasContactInfo && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-border">
            {listing.phone && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                {listing.phone}
              </span>
            )}
            {listing.email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                {listing.email}
              </span>
            )}
          </div>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div className="flex gap-2 mt-3">
            {listing.facebookUrl && (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer">
                <Facebook className="w-3.5 h-3.5" />
              </div>
            )}
            {listing.instagramUrl && (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 hover:text-white transition-colors cursor-pointer">
                <Instagram className="w-3.5 h-3.5" />
              </div>
            )}
            {listing.linkedinUrl && (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">
                <Linkedin className="w-3.5 h-3.5" />
              </div>
            )}
            {listing.twitterUrl && (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-black hover:text-white transition-colors cursor-pointer">
                <Twitter className="w-3.5 h-3.5" />
              </div>
            )}
            {listing.youtubeUrl && (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white transition-colors cursor-pointer">
                <Youtube className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DirectoryCardPreview;
