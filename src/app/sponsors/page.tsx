'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  LayoutGrid,
  List,
  LayoutList,
  MapPin,
  Users,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';
import { DirectoryCard, type DirectoryCardVariant } from '@/components/directory/DirectoryCard';
import { DirectoryFilters, type SortOption, type FilterOptions } from '@/components/directory/DirectoryFilters';

interface DirectoryListingPublic {
  id: string;
  businessName: string;
  tagline?: string;
  description?: string;
  category?: string;
  categoryLabel?: string;
  categoryIcon?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  imageUrl?: string;
  logoUrl?: string;
  bannerImageUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  appointmentUrl?: string;
  yearEstablished?: number;
  showContactInfo: boolean;
  showSocialLinks: boolean;
  showAddress: boolean;
  isFeatured: boolean;
  targetUrl: string;
}

export default function SponsorsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = useState<DirectoryListingPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);

  // UI State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<DirectoryCardVariant>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [filters, setFilters] = useState<FilterOptions>({
    categories: searchParams.get('category')
      ? [searchParams.get('category') as BusinessCategory]
      : [],
    featured: false,
  });

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filters.categories.length === 1) params.set('category', filters.categories[0]);
      if (filters.featured) params.set('featured', 'true');
      params.set('sort', sortBy);

      const response = await fetch(`/api/directory/public?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch listings');

      const result = await response.json();
      setListings(result.data.listings);
      setCategoryCounts(result.data.categoryCounts);
      setTotalCount(result.data.total);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load directory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [sortBy, filters.featured]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Local filtering for categories (for instant feedback)
  const filteredListings = useMemo(() => {
    if (filters.categories.length === 0) return listings;
    return listings.filter(
      (listing) => filters.categories.includes(listing.category as BusinessCategory)
    );
  }, [listings, filters.categories]);

  // Get featured listings for hero section
  const featuredListings = useMemo(() => {
    return listings.filter((l) => l.isFeatured).slice(0, 3);
  }, [listings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Our Sponsors</h1>
          </div>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Discover amazing local businesses that support our community.
            Shop local and help these sponsors grow!
          </p>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              <span>{totalCount} Businesses</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>{featuredListings.length} Featured</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>Local Community</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          categoryCounts={categoryCounts}
          totalCount={filteredListings.length}
          className="mb-8"
        />

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchListings}>Try Again</Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="text-center py-16">
            <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Businesses Found</h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filters.categories.length > 0
                ? 'Try adjusting your search or filters'
                : 'Check back soon for new sponsors!'}
            </p>
            {(searchQuery || filters.categories.length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    categories: [],
                    hasOffers: false,
                    featured: false,
                    serviceArea: '',
                  });
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Listings Grid */}
        {!loading && !error && filteredListings.length > 0 && (
          <div
            className={cn(
              viewMode === 'grid' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
              viewMode === 'list' && 'space-y-4',
              viewMode === 'compact' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
            )}
          >
            {filteredListings.map((listing) => (
              <DirectoryCard
                key={listing.id}
                variant={viewMode}
                listing={{
                  businessName: listing.businessName,
                  tagline: listing.tagline,
                  description: listing.description,
                  category: listing.category as BusinessCategory,
                  phone: listing.phone,
                  email: listing.email,
                  websiteUrl: listing.websiteUrl,
                  address: listing.address,
                  city: listing.city,
                  state: listing.state,
                  logoUrl: listing.logoUrl,
                  bannerImageUrl: listing.bannerImageUrl,
                  facebookUrl: listing.facebookUrl,
                  instagramUrl: listing.instagramUrl,
                  linkedinUrl: listing.linkedinUrl,
                  twitterUrl: listing.twitterUrl,
                  youtubeUrl: listing.youtubeUrl,
                  tiktokUrl: listing.tiktokUrl,
                  appointmentUrl: listing.appointmentUrl,
                  yearEstablished: listing.yearEstablished,
                  showContactInfo: listing.showContactInfo,
                  showSocialLinks: listing.showSocialLinks,
                  showAddress: listing.showAddress,
                  isFeatured: listing.isFeatured,
                }}
                adImageUrl={listing.imageUrl}
                targetUrl={listing.targetUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white mt-16">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Want to Become a Sponsor?</h2>
          <p className="text-xl text-blue-100 max-w-xl mx-auto mb-8">
            Get your business in front of thousands of local residents.
            Affordable advertising that makes an impact.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <a href="/pricing">Learn More</a>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>Powered by Community-Website.com</p>
      </footer>
    </div>
  );
}
