'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Eye,
  MousePointer,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Users,
  Sparkles,
} from 'lucide-react';
import { type DirectoryListing, calculateCTR } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DirectoryAnalyticsProps {
  impressions: number;
  clicks: number;
  viewCount?: number;
  listing: Partial<DirectoryListing>;
  previousImpressions?: number;
  previousClicks?: number;
  className?: string;
}

interface OptimizationTip {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export function DirectoryAnalytics({
  impressions = 0,
  clicks = 0,
  viewCount = 0,
  listing,
  previousImpressions = 0,
  previousClicks = 0,
  className = '',
}: DirectoryAnalyticsProps) {
  const ctr = calculateCTR(impressions, clicks);
  const previousCtr = calculateCTR(previousImpressions, previousClicks);

  const impressionsChange = previousImpressions > 0
    ? ((impressions - previousImpressions) / previousImpressions) * 100
    : 0;
  const clicksChange = previousClicks > 0
    ? ((clicks - previousClicks) / previousClicks) * 100
    : 0;
  const ctrChange = previousCtr > 0
    ? ctr - previousCtr
    : 0;

  // Generate optimization tips based on listing completeness
  const tips = generateOptimizationTips(listing, { impressions, clicks, ctr });

  // Calculate listing completeness score
  const completenessScore = calculateCompletenessScore(listing);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Impressions"
          value={formatNumber(impressions)}
          change={impressionsChange}
          icon={<Eye className="w-4 h-4" />}
          description="Times your listing was shown"
        />
        <StatCard
          title="Clicks"
          value={formatNumber(clicks)}
          change={clicksChange}
          icon={<MousePointer className="w-4 h-4" />}
          description="Visits to your website"
        />
        <StatCard
          title="Click Rate"
          value={`${ctr}%`}
          change={ctrChange}
          changeUnit="%"
          icon={<Target className="w-4 h-4" />}
          description="Percentage of viewers who clicked"
          highlight={ctr > 2}
        />
      </div>

      {/* Listing Completeness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Listing Completeness
          </CardTitle>
          <CardDescription>
            Complete your listing to improve visibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-3">
            <Progress value={completenessScore} className="flex-1" />
            <span className={cn(
              'text-lg font-semibold',
              completenessScore >= 80 ? 'text-green-600' :
              completenessScore >= 50 ? 'text-amber-600' : 'text-red-600'
            )}>
              {completenessScore}%
            </span>
          </div>
          <CompletenessChecklist listing={listing} />
        </CardContent>
      </Card>

      {/* Optimization Tips */}
      {tips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Optimization Tips
            </CardTitle>
            <CardDescription>
              Ways to improve your listing performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tips.slice(0, 5).map((tip) => (
                <div
                  key={tip.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg',
                    tip.type === 'success' && 'bg-green-50 dark:bg-green-900/20',
                    tip.type === 'warning' && 'bg-amber-50 dark:bg-amber-900/20',
                    tip.type === 'info' && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  {tip.type === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  )}
                  {tip.type === 'warning' && (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  {tip.type === 'info' && (
                    <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{tip.title}</p>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'ml-auto shrink-0',
                      tip.priority === 'high' && 'border-red-300 text-red-600',
                      tip.priority === 'medium' && 'border-amber-300 text-amber-600',
                      tip.priority === 'low' && 'border-slate-300 text-slate-600'
                    )}
                  >
                    {tip.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTR Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <CTRBenchmark label="Your CTR" value={ctr} isYours />
            <CTRBenchmark label="Average CTR" value={1.5} />
            <CTRBenchmark label="Top Performers" value={3.5} />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {ctr >= 3.5
              ? "Excellent! You're among the top performers."
              : ctr >= 1.5
              ? "Good performance! Try our optimization tips to reach the top."
              : "There's room for improvement. Complete your listing to improve visibility."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeUnit = '%',
  icon,
  description,
  highlight = false,
}: {
  title: string;
  value: string;
  change?: number;
  changeUnit?: string;
  icon: React.ReactNode;
  description: string;
  highlight?: boolean;
}) {
  const showChange = change !== undefined && change !== 0;
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className={cn(highlight && 'ring-2 ring-green-500 ring-offset-2')}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-sm">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {showChange && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'flex items-center text-sm font-medium',
                      isPositive && 'text-green-600',
                      isNegative && 'text-red-600'
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 mr-0.5" />
                    ) : isNegative ? (
                      <TrendingDown className="w-4 h-4 mr-0.5" />
                    ) : (
                      <Minus className="w-4 h-4 mr-0.5" />
                    )}
                    {Math.abs(change).toFixed(1)}{changeUnit}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>vs. previous period</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// Completeness Checklist
function CompletenessChecklist({ listing }: { listing: Partial<DirectoryListing> }) {
  const items = [
    { label: 'Business name', done: !!listing.businessName },
    { label: 'Tagline', done: !!listing.tagline },
    { label: 'Description', done: !!listing.description },
    { label: 'Category', done: !!listing.category },
    { label: 'Phone number', done: !!listing.phone },
    { label: 'Email address', done: !!listing.email },
    { label: 'Website URL', done: !!listing.websiteUrl },
    { label: 'Logo', done: !!listing.logoUrl },
    { label: 'Business hours', done: !!listing.businessHours },
    { label: 'Social media links', done: !!(listing.facebookUrl || listing.instagramUrl) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center gap-1.5 text-xs',
            item.done ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          {item.done ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-current shrink-0" />
          )}
          <span className="truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// CTR Benchmark Bar
function CTRBenchmark({
  label,
  value,
  isYours = false,
}: {
  label: string;
  value: number;
  isYours?: boolean;
}) {
  const maxCtr = 5; // Max for visualization
  const percentage = Math.min((value / maxCtr) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <span className={cn(
        'w-28 text-sm shrink-0',
        isYours && 'font-semibold'
      )}>
        {label}
      </span>
      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isYours
              ? 'bg-gradient-to-r from-blue-500 to-purple-500'
              : 'bg-slate-300 dark:bg-slate-600'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn(
        'w-12 text-sm text-right',
        isYours && 'font-semibold'
      )}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

// Helper Functions
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function calculateCompletenessScore(listing: Partial<DirectoryListing>): number {
  const fields = [
    { field: listing.businessName, weight: 15 },
    { field: listing.tagline, weight: 10 },
    { field: listing.description, weight: 10 },
    { field: listing.category, weight: 10 },
    { field: listing.phone, weight: 10 },
    { field: listing.email, weight: 5 },
    { field: listing.websiteUrl, weight: 10 },
    { field: listing.logoUrl, weight: 10 },
    { field: listing.businessHours, weight: 10 },
    { field: listing.facebookUrl || listing.instagramUrl, weight: 5 },
    { field: listing.address, weight: 5 },
  ];

  const score = fields.reduce((acc, { field, weight }) => {
    return acc + (field ? weight : 0);
  }, 0);

  return Math.min(score, 100);
}

function generateOptimizationTips(
  listing: Partial<DirectoryListing>,
  stats: { impressions: number; clicks: number; ctr: number }
): OptimizationTip[] {
  const tips: OptimizationTip[] = [];

  // Check for missing important fields
  if (!listing.description) {
    tips.push({
      id: 'add-description',
      type: 'warning',
      title: 'Add a business description',
      description: 'Listings with descriptions get up to 3x more clicks.',
      priority: 'high',
    });
  }

  if (!listing.logoUrl) {
    tips.push({
      id: 'add-logo',
      type: 'warning',
      title: 'Upload your logo',
      description: 'A professional logo builds trust with potential customers.',
      priority: 'high',
    });
  }

  if (!listing.businessHours) {
    tips.push({
      id: 'add-hours',
      type: 'warning',
      title: 'Add business hours',
      description: 'Let customers know when you\'re open. This helps with "Open Now" searches.',
      priority: 'medium',
    });
  }

  if (!listing.facebookUrl && !listing.instagramUrl) {
    tips.push({
      id: 'add-social',
      type: 'info',
      title: 'Connect social media',
      description: 'Link your social profiles to build credibility and engagement.',
      priority: 'low',
    });
  }

  if (!listing.amenities || listing.amenities.length < 3) {
    tips.push({
      id: 'add-amenities',
      type: 'info',
      title: 'Add features & amenities',
      description: 'Highlight what makes your business special (parking, WiFi, etc.).',
      priority: 'low',
    });
  }

  // Performance-based tips
  if (stats.ctr < 1 && stats.impressions > 100) {
    tips.push({
      id: 'low-ctr',
      type: 'warning',
      title: 'Low click-through rate',
      description: 'Try updating your tagline or adding eye-catching special offers.',
      priority: 'high',
    });
  }

  // Success tips
  if (listing.description && listing.logoUrl && listing.businessHours) {
    tips.push({
      id: 'well-done',
      type: 'success',
      title: 'Great listing completeness!',
      description: 'Your listing has all the essential information.',
      priority: 'low',
    });
  }

  if (stats.ctr >= 3) {
    tips.push({
      id: 'high-ctr',
      type: 'success',
      title: 'Excellent click-through rate!',
      description: 'You\'re among the top performers. Keep it up!',
      priority: 'low',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tips;
}

export default DirectoryAnalytics;
