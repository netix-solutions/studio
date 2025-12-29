'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Star,
  ExternalLink,
  Tag,
  Calendar,
  Check,
} from 'lucide-react';
import {
  type DirectoryListing,
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
  getActiveOffers,
} from '@/lib/types';
import { cn } from '@/lib/utils';

export type DirectoryCardVariant = 'grid' | 'list' | 'compact' | 'expanded';

interface DirectoryCardProps {
  listing: Partial<DirectoryListing>;
  adImageUrl?: string;
  targetUrl?: string;
  className?: string;
  theme?: 'light' | 'dark';
  variant?: DirectoryCardVariant;
  showActions?: boolean;
  onVisit?: () => void;
  onView?: () => void;
}

export function DirectoryCard({
  listing,
  adImageUrl,
  targetUrl,
  className = '',
  theme = 'light',
  variant = 'grid',
  showActions = true,
  onVisit,
  onView,
}: DirectoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
      listing.youtubeUrl ||
      listing.tiktokUrl);

  const hasContactInfo =
    listing.showContactInfo && (listing.phone || listing.email);

  const hasAddress =
    listing.showAddress && (listing.address || listing.city);

  const activeOffers = listing.specialOffers ? getActiveOffers(listing as DirectoryListing) : [];

  const isDark = theme === 'dark';

  // Render different variants
  if (variant === 'list') {
    return <ListVariant {...{ listing, adImageUrl, targetUrl, categoryLabel, categoryIcon, hasSocialLinks, hasContactInfo, hasAddress, activeOffers, isDark, showActions, onVisit, onView, className }} />;
  }

  if (variant === 'compact') {
    return <CompactVariant {...{ listing, adImageUrl, targetUrl, categoryLabel, categoryIcon, activeOffers, isDark, showActions, onVisit, className }} />;
  }

  if (variant === 'expanded') {
    return <ExpandedVariant {...{ listing, adImageUrl, targetUrl, categoryLabel, categoryIcon, hasSocialLinks, hasContactInfo, hasAddress, activeOffers, isDark, showActions, onVisit, onView, className }} />;
  }

  // Default grid variant
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group',
        className
      )}
      style={{
        backgroundColor: listing.cardBackgroundColor || (isDark ? '#1e293b' : '#ffffff'),
        color: listing.cardTextColor || (isDark ? '#f1f5f9' : '#1e293b'),
      }}
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

        {/* Special Offer Badge */}
        {activeOffers.length > 0 && (
          <Badge className="absolute bottom-3 left-3 z-10 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md animate-pulse">
            <Tag className="w-3 h-3 mr-1" />
            {activeOffers.length === 1 ? 'Special Offer' : `${activeOffers.length} Offers`}
          </Badge>
        )}

        {/* Ad Image or Logo */}
        {adImageUrl ? (
          <img
            src={adImageUrl}
            alt={listing.businessName || 'Business'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
        {/* Header */}
        <div className="mb-1">
          <h3
            className="font-semibold text-lg line-clamp-1"
            style={{ color: listing.cardTextColor || undefined }}
          >
            {listing.businessName || 'Business Name'}
          </h3>
        </div>

        {/* Tagline */}
        {listing.tagline && (
          <p className="text-sm text-muted-foreground italic mb-2 line-clamp-1">
            {listing.tagline}
          </p>
        )}

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {listing.description}
          </p>
        )}

        {/* Contact Info */}
        {hasContactInfo && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-border">
            {listing.phone && (
              <a
                href={`tel:${listing.phone}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3.5 h-3.5" />
                {listing.phone}
              </a>
            )}
            {listing.email && (
              <a
                href={`mailto:${listing.email}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-3.5 h-3.5" />
                {listing.email}
              </a>
            )}
          </div>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div className="flex gap-2 mt-3">
            <SocialLinks listing={listing} />
          </div>
        )}

        {/* Action Button */}
        {showActions && targetUrl && (
          <Button
            size="sm"
            className="w-full mt-3"
            onClick={(e) => {
              e.stopPropagation();
              onVisit?.();
            }}
            asChild
          >
            <a href={targetUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Website
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// List variant - horizontal layout
function ListVariant({
  listing,
  adImageUrl,
  targetUrl,
  categoryLabel,
  categoryIcon,
  hasSocialLinks,
  hasContactInfo,
  hasAddress,
  activeOffers,
  isDark,
  showActions,
  onVisit,
  onView,
  className,
}: any) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 hover:shadow-lg group flex flex-col sm:flex-row',
        className
      )}
      style={{
        backgroundColor: listing.cardBackgroundColor || (isDark ? '#1e293b' : '#ffffff'),
        color: listing.cardTextColor || (isDark ? '#f1f5f9' : '#1e293b'),
      }}
    >
      {/* Image Section - Side */}
      <div className="relative w-full sm:w-48 md:w-64 aspect-[3/1] sm:aspect-[4/3] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 overflow-hidden shrink-0">
        {listing.isFeatured && (
          <Badge className="absolute top-2 right-2 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md text-xs">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Featured
          </Badge>
        )}

        {activeOffers.length > 0 && (
          <Badge className="absolute bottom-2 left-2 z-10 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md text-xs">
            <Tag className="w-3 h-3 mr-1" />
            Special Offer
          </Badge>
        )}

        {adImageUrl ? (
          <img
            src={adImageUrl}
            alt={listing.businessName || 'Business'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : listing.logoUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={listing.logoUrl}
              alt={listing.businessName || 'Business'}
              className="max-w-[70%] max-h-[80%] object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Globe className="w-8 h-8 text-slate-400" />
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="flex-1 p-4 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-lg">
                {listing.businessName || 'Business Name'}
              </h3>
              {categoryLabel && (
                <Badge variant="secondary" className="text-xs">
                  {categoryIcon} {categoryLabel}
                </Badge>
              )}
            </div>
            {listing.tagline && (
              <p className="text-sm text-muted-foreground italic">
                {listing.tagline}
              </p>
            )}
          </div>
        </div>

        {listing.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {listing.description}
          </p>
        )}

        {/* Bottom row with contact and actions */}
        <div className="flex items-end justify-between gap-4 mt-auto pt-3 border-t border-border">
          <div className="flex flex-wrap gap-3">
            {hasContactInfo && (
              <>
                {listing.phone && (
                  <a
                    href={`tel:${listing.phone}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {listing.phone}
                  </a>
                )}
                {listing.email && (
                  <a
                    href={`mailto:${listing.email}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {listing.email}
                  </a>
                )}
              </>
            )}
            {hasAddress && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {listing.city}, {listing.state}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {hasSocialLinks && <SocialLinks listing={listing} size="sm" />}
            {showActions && targetUrl && (
              <Button size="sm" asChild>
                <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact variant - minimal info
function CompactVariant({
  listing,
  adImageUrl,
  targetUrl,
  categoryLabel,
  categoryIcon,
  activeOffers,
  isDark,
  showActions,
  onVisit,
  className,
}: any) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 hover:shadow-md group',
        className
      )}
      style={{
        backgroundColor: listing.cardBackgroundColor || (isDark ? '#1e293b' : '#ffffff'),
        color: listing.cardTextColor || (isDark ? '#f1f5f9' : '#1e293b'),
      }}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {/* Logo/Image - Small */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0">
          {listing.isFeatured && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center z-10">
              <Star className="w-2.5 h-2.5 text-white fill-current" />
            </div>
          )}
          {adImageUrl || listing.logoUrl ? (
            <img
              src={adImageUrl || listing.logoUrl}
              alt={listing.businessName || 'Business'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-slate-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">
              {listing.businessName || 'Business Name'}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {categoryLabel && (
              <span>{categoryIcon} {categoryLabel}</span>
            )}
            {activeOffers.length > 0 && (
              <Badge className="bg-green-100 text-green-700 text-[10px] px-1 py-0">
                Offer
              </Badge>
            )}
          </div>
        </div>

        {/* Action */}
        {showActions && targetUrl && (
          <Button size="sm" variant="ghost" className="shrink-0" asChild>
            <a href={targetUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Expanded variant - full details
function ExpandedVariant({
  listing,
  adImageUrl,
  targetUrl,
  categoryLabel,
  categoryIcon,
  hasSocialLinks,
  hasContactInfo,
  hasAddress,
  activeOffers,
  isDark,
  showActions,
  onVisit,
  onView,
  className,
}: any) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 hover:shadow-xl group',
        className
      )}
      style={{
        backgroundColor: listing.cardBackgroundColor || (isDark ? '#1e293b' : '#ffffff'),
        color: listing.cardTextColor || (isDark ? '#f1f5f9' : '#1e293b'),
      }}
    >
      {/* Banner Image */}
      <div className="relative aspect-[3/1] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
        {listing.isFeatured && (
          <Badge className="absolute top-3 right-3 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Featured Sponsor
          </Badge>
        )}

        {categoryLabel && (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 z-10 bg-black/60 text-white border-0 backdrop-blur-sm"
          >
            <span className="mr-1">{categoryIcon}</span>
            {categoryLabel}
          </Badge>
        )}

        {(listing.bannerImageUrl || adImageUrl) ? (
          <img
            src={listing.bannerImageUrl || adImageUrl}
            alt={listing.businessName || 'Business'}
            className="w-full h-full object-cover"
          />
        ) : listing.logoUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            <img
              src={listing.logoUrl}
              alt={listing.businessName || 'Business'}
              className="max-w-[40%] max-h-[70%] object-contain"
            />
          </div>
        ) : null}
      </div>

      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="font-bold text-2xl mb-1">
            {listing.businessName || 'Business Name'}
          </h2>
          {listing.tagline && (
            <p className="text-muted-foreground italic">
              {listing.tagline}
            </p>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-muted-foreground mb-4">
            {listing.description}
          </p>
        )}

        {/* Special Offers */}
        {activeOffers.length > 0 && listing.showSpecialOffers && (
          <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4" />
              Special Offers
            </h4>
            <div className="space-y-2">
              {activeOffers.map((offer: any) => (
                <div key={offer.id} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      {offer.title}
                    </p>
                    {offer.description && (
                      <p className="text-sm text-green-700 dark:text-green-400">
                        {offer.description}
                      </p>
                    )}
                    {offer.code && (
                      <Badge variant="outline" className="mt-1 font-mono">
                        Code: {offer.code}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pt-4 border-t border-border">
          {/* Contact */}
          {hasContactInfo && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Contact</h4>
              <div className="space-y-1">
                {listing.phone && (
                  <a
                    href={`tel:${listing.phone}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {listing.phone}
                  </a>
                )}
                {listing.secondaryPhone && (
                  <a
                    href={`tel:${listing.secondaryPhone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {listing.secondaryPhone} (Alt)
                  </a>
                )}
                {listing.email && (
                  <a
                    href={`mailto:${listing.email}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {listing.email}
                  </a>
                )}
                {listing.websiteUrl && (
                  <a
                    href={listing.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          {hasAddress && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Location</h4>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  {listing.address && <p>{listing.address}</p>}
                  <p>
                    {[listing.city, listing.state, listing.zipCode].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              {listing.serviceAreas && listing.serviceAreas.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Serving: {listing.serviceAreas.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Social Links & Actions */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
          {hasSocialLinks && (
            <div className="flex gap-2">
              <SocialLinks listing={listing} />
            </div>
          )}

          {showActions && (
            <div className="flex gap-2 ml-auto">
              {listing.appointmentUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={listing.appointmentUrl} target="_blank" rel="noopener noreferrer">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </a>
                </Button>
              )}
              {targetUrl && (
                <Button size="sm" asChild>
                  <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Website
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Year Established & Languages */}
        {(listing.yearEstablished || (listing.languages && listing.languages.length > 0)) && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            {listing.yearEstablished && (
              <span>Est. {listing.yearEstablished}</span>
            )}
            {listing.languages && listing.languages.length > 0 && (
              <span>Languages: {listing.languages.join(', ')}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Social links component
function SocialLinks({ listing, size = 'default' }: { listing: Partial<DirectoryListing>; size?: 'sm' | 'default' }) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const buttonSize = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <>
      {listing.facebookUrl && (
        <a
          href={listing.facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${buttonSize} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-blue-500 hover:text-white transition-colors`}
        >
          <Facebook className={iconSize} />
        </a>
      )}
      {listing.instagramUrl && (
        <a
          href={listing.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${buttonSize} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 hover:text-white transition-colors`}
        >
          <Instagram className={iconSize} />
        </a>
      )}
      {listing.linkedinUrl && (
        <a
          href={listing.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${buttonSize} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-colors`}
        >
          <Linkedin className={iconSize} />
        </a>
      )}
      {listing.twitterUrl && (
        <a
          href={listing.twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${buttonSize} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-black hover:text-white transition-colors`}
        >
          <Twitter className={iconSize} />
        </a>
      )}
      {listing.youtubeUrl && (
        <a
          href={listing.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${buttonSize} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white transition-colors`}
        >
          <Youtube className={iconSize} />
        </a>
      )}
    </>
  );
}

export default DirectoryCard;
