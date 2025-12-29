'use client';

import { useState } from 'react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Loader2,
  ChevronRight,
  Megaphone,
  Zap,
  ArrowUpRight,
  Shield,
  Receipt,
  CalendarClock,
  Wallet,
  BadgeCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/revenue';

interface SubscriptionItem {
  price: {
    id: string;
    unit_amount: number;
    product: {
      name: string;
      description?: string;
    };
    recurring?: {
      interval: 'month' | 'year';
      interval_count?: number;
    };
  };
}

interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  created?: { seconds: number };
  current_period_start?: { seconds: number };
  current_period_end?: { seconds: number };
  cancel_at_period_end?: boolean;
  canceled_at?: { seconds: number };
  trial_end?: { seconds: number };
  items?: SubscriptionItem[];
  // Manual subscription fields
  isManualEntry?: boolean;
  planName?: string;
  amount?: number;
  billingPeriod?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';
  startDate?: { seconds: number };
  endDate?: { seconds: number };
}

interface SubscriptionManagerProps {
  subscription: Subscription;
  adsCount: number;
  onManageBilling: () => void;
  onChangePlan?: () => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}> = {
  active: {
    label: 'Active',
    icon: <BadgeCheck className="h-4 w-4" />,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Your subscription is active and in good standing.',
  },
  trialing: {
    label: 'Trial',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'You\'re on a free trial. Billing will start when it ends.',
  },
  past_due: {
    label: 'Past Due',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Your payment failed. Please update your payment method.',
  },
  canceled: {
    label: 'Canceled',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Your subscription has been canceled.',
  },
  unpaid: {
    label: 'Unpaid',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Payment is required to continue your subscription.',
  },
  incomplete: {
    label: 'Incomplete',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Your subscription setup is incomplete.',
  },
  incomplete_expired: {
    label: 'Expired',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    description: 'Your subscription setup has expired.',
  },
};

function getTimestamp(ts: { seconds: number } | undefined): Date | null {
  if (!ts?.seconds) return null;
  return new Date(ts.seconds * 1000);
}

export function SubscriptionManager({
  subscription,
  adsCount,
  onManageBilling,
  onChangePlan,
  isLoading = false,
}: SubscriptionManagerProps) {
  const status = subscription.status || 'active';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;

  // Extract subscription details
  const isManual = subscription.isManualEntry;
  const planName = subscription.items?.[0]?.price?.product?.name || subscription.planName || 'Subscription';
  const planDescription = subscription.items?.[0]?.price?.product?.description;

  // Price calculation
  const unitAmount = subscription.items?.[0]?.price?.unit_amount || 0;
  const price = isManual ? (subscription.amount || 0) : unitAmount / 100;
  const interval = subscription.items?.[0]?.price?.recurring?.interval ||
    (subscription.billingPeriod === 'yearly' ? 'year' : 'month');
  const intervalLabel = interval === 'year' ? 'year' : 'month';

  // Dates
  const periodStart = getTimestamp(subscription.current_period_start) ||
    getTimestamp(subscription.startDate);
  const periodEnd = getTimestamp(subscription.current_period_end) ||
    getTimestamp(subscription.endDate);
  const trialEnd = getTimestamp(subscription.trial_end);
  const createdAt = getTimestamp(subscription.created);

  // Calculate days until renewal
  const daysUntilRenewal = periodEnd ? differenceInDays(periodEnd, new Date()) : null;
  const renewalPercentage = periodStart && periodEnd
    ? Math.min(100, Math.max(0,
        ((new Date().getTime() - periodStart.getTime()) /
        (periodEnd.getTime() - periodStart.getTime())) * 100
      ))
    : 0;

  // Check if subscription will cancel at period end
  const willCancel = subscription.cancel_at_period_end;

  return (
    <div className="space-y-6">
      {/* Main Subscription Card */}
      <Card className="overflow-hidden">
        {/* Status Banner */}
        {(status === 'past_due' || status === 'unpaid' || willCancel) && (
          <div className={cn(
            'px-4 py-3 flex items-center gap-3',
            status === 'past_due' || status === 'unpaid'
              ? 'bg-amber-50 border-b border-amber-200'
              : 'bg-blue-50 border-b border-blue-200'
          )}>
            {status === 'past_due' || status === 'unpaid' ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    {status === 'past_due' ? 'Payment Failed' : 'Payment Required'}
                  </p>
                  <p className="text-xs text-amber-700">
                    Please update your payment method to continue your subscription.
                  </p>
                </div>
                <Button size="sm" onClick={onManageBilling} disabled={isLoading}>
                  Update Payment
                </Button>
              </>
            ) : willCancel ? (
              <>
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    Subscription Ending
                  </p>
                  <p className="text-xs text-blue-700">
                    Your subscription will end on {periodEnd ? format(periodEnd, 'MMMM d, yyyy') : 'the end of the billing period'}.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={onManageBilling} disabled={isLoading}>
                  Reactivate
                </Button>
              </>
            ) : null}
          </div>
        )}

        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{planName}</CardTitle>
                <Badge
                  variant="outline"
                  className={cn(statusConfig.bgColor, statusConfig.color, 'border-0')}
                >
                  {statusConfig.icon}
                  <span className="ml-1.5">{statusConfig.label}</span>
                </Badge>
              </div>
              {planDescription && (
                <CardDescription>{planDescription}</CardDescription>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatCurrency(price)}
                <span className="text-sm font-normal text-muted-foreground">/{intervalLabel}</span>
              </div>
              {isManual && (
                <Badge variant="secondary" className="mt-1">
                  <Shield className="h-3 w-3 mr-1" />
                  Manual Entry
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Billing Period Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Billing Period</span>
              {daysUntilRenewal !== null && daysUntilRenewal > 0 && (
                <span className="font-medium">
                  {daysUntilRenewal} days until {willCancel ? 'end' : 'renewal'}
                </span>
              )}
            </div>
            <Progress value={renewalPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{periodStart ? format(periodStart, 'MMM d, yyyy') : '-'}</span>
              <span>{periodEnd ? format(periodEnd, 'MMM d, yyyy') : '-'}</span>
            </div>
          </div>

          <Separator />

          {/* Subscription Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                <span>Next Payment</span>
              </div>
              <p className="font-medium">
                {willCancel ? (
                  <span className="text-muted-foreground">N/A</span>
                ) : periodEnd ? (
                  format(periodEnd, 'MMM d, yyyy')
                ) : '-'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Wallet className="h-4 w-4" />
                <span>Amount</span>
              </div>
              <p className="font-medium">{formatCurrency(price)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CalendarClock className="h-4 w-4" />
                <span>Billing Cycle</span>
              </div>
              <p className="font-medium capitalize">{intervalLabel}ly</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Megaphone className="h-4 w-4" />
                <span>Active Ads</span>
              </div>
              <p className="font-medium">{adsCount}</p>
            </div>
          </div>

          {/* Trial info if applicable */}
          {status === 'trialing' && trialEnd && (
            <>
              <Separator />
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Zap className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">Free Trial Active</p>
                  <p className="text-xs text-blue-700">
                    Your trial ends {formatDistanceToNow(trialEnd, { addSuffix: true })} on {format(trialEnd, 'MMMM d, yyyy')}.
                    You won't be charged until then.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Member since */}
          {createdAt && (
            <div className="text-xs text-muted-foreground text-center">
              Member since {format(createdAt, 'MMMM yyyy')}
            </div>
          )}
        </CardContent>

        <Separator />

        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button
            onClick={onManageBilling}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Manage Billing
          </Button>

          {onChangePlan && !isManual && (
            <Button
              variant="outline"
              onClick={onChangePlan}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Change Plan
            </Button>
          )}

          <Link href="/pricing" className="w-full sm:w-auto sm:ml-auto">
            <Button variant="ghost" className="w-full">
              View All Plans
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Billing Portal Card */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onManageBilling}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Payment History</p>
                  <p className="text-sm text-muted-foreground">View invoices & receipts</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onManageBilling}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Payment Method</p>
                  <p className="text-sm text-muted-foreground">Update card details</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Cancel/Pause Card */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onManageBilling}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Subscription Options</p>
                  <p className="text-sm text-muted-foreground">Pause or cancel</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SubscriptionManager;
