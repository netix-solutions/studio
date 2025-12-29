'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  LayoutList,
  X,
  Clock,
  Star,
  Filter,
} from 'lucide-react';
import {
  type BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_ICONS,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import type { DirectoryCardVariant } from './DirectoryCard';

export type SortOption = 'featured' | 'alphabetical' | 'newest' | 'rating';
export type FilterOptions = {
  categories: BusinessCategory[];
  featured: boolean;
};

interface DirectoryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: DirectoryCardVariant;
  onViewModeChange: (mode: DirectoryCardVariant) => void;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
  className?: string;
  showViewToggle?: boolean;
  compact?: boolean;
}

export function DirectoryFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  categoryCounts = {},
  totalCount = 0,
  className = '',
  showViewToggle = true,
  compact = false,
}: DirectoryFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFilterCount =
    filters.categories.length +
    (filters.featured ? 1 : 0);

  const clearFilters = () => {
    onFiltersChange({
      categories: [],
      featured: false,
    });
  };

  const toggleCategory = (category: BusinessCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {/* Search and Quick Filters Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => onSearchChange('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.featured}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, featured: checked })}
              >
                <Star className="w-4 h-4 mr-2" />
                Featured Only
              </DropdownMenuCheckboxItem>
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-destructive"
                    onClick={clearFilters}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category Pills (Scrollable) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {Object.entries(BUSINESS_CATEGORY_LABELS).map(([value, label]) => {
            const count = categoryCounts[value] || 0;
            const isActive = filters.categories.includes(value as BusinessCategory);
            return (
              <button
                key={value}
                onClick={() => toggleCategory(value as BusinessCategory)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {BUSINESS_CATEGORY_ICONS[value as BusinessCategory]} {label}
                {count > 0 && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top Row: Search, Sort, View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, category, or keyword..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Featured First
              </span>
            </SelectItem>
            <SelectItem value="alphabetical">
              <span className="flex items-center gap-2">
                A-Z
              </span>
            </SelectItem>
            <SelectItem value="newest">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Newest
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        {showViewToggle && (
          <div className="flex border rounded-lg overflow-hidden shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => onViewModeChange('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none border-x"
              onClick={() => onViewModeChange('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => onViewModeChange('compact')}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={filters.featured}
            onClick={() => onFiltersChange({ ...filters, featured: !filters.featured })}
            icon={<Star className="w-3.5 h-3.5" />}
          >
            Featured
          </FilterPill>
        </div>

        {/* Category Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
              Categories
              {filters.categories.length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
                  {filters.categories.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
            <DropdownMenuLabel className="flex items-center justify-between">
              Categories
              {filters.categories.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => onFiltersChange({ ...filters, categories: [] })}
                >
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(BUSINESS_CATEGORY_LABELS).map(([value, label]) => {
              const count = categoryCounts[value] || 0;
              return (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={filters.categories.includes(value as BusinessCategory)}
                  onCheckedChange={() => toggleCategory(value as BusinessCategory)}
                >
                  <span className="flex items-center gap-2 flex-1">
                    <span>{BUSINESS_CATEGORY_ICONS[value as BusinessCategory]}</span>
                    <span className="flex-1">{label}</span>
                    {count > 0 && (
                      <span className="text-muted-foreground text-xs">({count})</span>
                    )}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Results Count & Clear */}
        <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
          <span>{totalCount} business{totalCount !== 1 ? 'es' : ''}</span>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={clearFilters}
            >
              <X className="w-3 h-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Active Category Badges */}
      {filters.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10"
              onClick={() => toggleCategory(category)}
            >
              {BUSINESS_CATEGORY_ICONS[category]} {BUSINESS_CATEGORY_LABELS[category]}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable filter pill component
function FilterPill({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export default DirectoryFilters;
