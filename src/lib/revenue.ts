/**
 * Revenue Calculation Utilities
 *
 * Provides accurate financial metrics that respect:
 * - Contract terms and billing periods
 * - Subscription start/end dates
 * - Renewal timing
 * - Manual vs Stripe subscriptions
 */

import { Subscription } from './types';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  isBefore,
  isAfter,
  differenceInDays,
  differenceInMonths,
  format
} from 'date-fns';

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  averageRevenuePerUser: number;
  contractedRevenue: number; // Total remaining contracted value
}

export interface SubscriptionWithRevenue {
  id: string;
  customerId: string;
  customerEmail?: string;
  planName: string;
  status: string;
  monthlyAmount: number;
  billingPeriod: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';
  startDate: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  renewalDate: Date | null;
  daysUntilRenewal: number | null;
  isManualEntry: boolean;
  contractValue: number; // Total value of the current contract period
  remainingContractValue: number; // Value remaining in current period
}

export interface MonthlyRevenueData {
  month: string;
  monthDate: Date;
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  netMrrChange: number;
  activeSubscriptions: number;
  newSubscriptions: number;
  churnedSubscriptions: number;
}

export interface RenewalForecast {
  subscription: SubscriptionWithRevenue;
  renewalDate: Date;
  amount: number;
}

export interface RevenueByPeriod {
  period: string;
  count: number;
  mrr: number;
  percentage: number;
}

export interface RevenueByPlan {
  planName: string;
  count: number;
  mrr: number;
  percentage: number;
}

/**
 * Convert a Firestore timestamp or Unix timestamp to Date
 */
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;

  // Firestore Timestamp with seconds
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }

  // Unix timestamp in seconds
  if (typeof timestamp === 'number') {
    return new Date(timestamp * 1000);
  }

  // Already a Date
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // ISO string
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  return null;
}

/**
 * Calculate the monthly equivalent amount for a subscription
 */
export function calculateMonthlyAmount(subscription: any): number {
  // For manual entries
  if (subscription.isManualEntry) {
    const amount = subscription.amount || 0;
    const period = subscription.billingPeriod || 'monthly';

    switch (period) {
      case 'yearly':
        return amount / 12;
      case 'quarterly':
        return amount / 3;
      case 'one_time':
        // For one-time, we don't count towards MRR
        return 0;
      case 'custom':
        // For custom, try to calculate based on start/end dates
        const start = toDate(subscription.startDate);
        const end = toDate(subscription.endDate);
        if (start && end) {
          const months = differenceInMonths(end, start) || 1;
          return amount / months;
        }
        return amount; // Default to monthly if no dates
      default:
        return amount;
    }
  }

  // For Stripe subscriptions
  const unitAmount = subscription.items?.[0]?.price?.unit_amount || 0;
  const interval = subscription.items?.[0]?.price?.recurring?.interval;

  // Convert cents to dollars
  const amount = unitAmount / 100;

  if (interval === 'year') {
    return amount / 12;
  }

  return amount;
}

/**
 * Get billing period from subscription
 */
function getBillingPeriod(subscription: any): 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom' {
  if (subscription.isManualEntry) {
    return subscription.billingPeriod || 'monthly';
  }

  const interval = subscription.items?.[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'yearly';
  return 'monthly';
}

/**
 * Get contract value (total for current period)
 */
function getContractValue(subscription: any): number {
  if (subscription.isManualEntry) {
    return subscription.amount || 0;
  }

  const unitAmount = subscription.items?.[0]?.price?.unit_amount || 0;
  return unitAmount / 100;
}

/**
 * Calculate remaining contract value based on current period
 */
function getRemainingContractValue(subscription: any): number {
  const periodEnd = toDate(subscription.current_period_end) || toDate(subscription.endDate);
  if (!periodEnd) return getContractValue(subscription);

  const now = new Date();
  const periodStart = toDate(subscription.current_period_start) || toDate(subscription.startDate);

  if (!periodStart || isAfter(now, periodEnd)) return 0;

  const totalDays = differenceInDays(periodEnd, periodStart);
  const remainingDays = differenceInDays(periodEnd, now);

  if (totalDays <= 0) return 0;

  const contractValue = getContractValue(subscription);
  return (remainingDays / totalDays) * contractValue;
}

/**
 * Transform a raw subscription into SubscriptionWithRevenue
 */
export function transformSubscription(
  subscription: any,
  customerId: string,
  customerEmail?: string
): SubscriptionWithRevenue {
  const startDate = toDate(subscription.created) || toDate(subscription.startDate);
  const currentPeriodStart = toDate(subscription.current_period_start);
  const currentPeriodEnd = toDate(subscription.current_period_end) || toDate(subscription.endDate);

  const renewalDate = currentPeriodEnd;
  const daysUntilRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null;

  const planName = subscription.items?.[0]?.price?.product?.name
    || subscription.planName
    || 'Subscription';

  return {
    id: subscription.id || '',
    customerId,
    customerEmail,
    planName,
    status: subscription.status || 'active',
    monthlyAmount: calculateMonthlyAmount(subscription),
    billingPeriod: getBillingPeriod(subscription),
    startDate,
    currentPeriodStart,
    currentPeriodEnd,
    renewalDate,
    daysUntilRenewal,
    isManualEntry: subscription.isManualEntry || false,
    contractValue: getContractValue(subscription),
    remainingContractValue: getRemainingContractValue(subscription),
  };
}

/**
 * Check if subscription is active
 */
export function isActiveSubscription(subscription: SubscriptionWithRevenue | any): boolean {
  const status = subscription.status;
  return status === 'active' || status === 'trialing';
}

/**
 * Check if subscription was active during a specific month
 */
export function wasActiveInMonth(subscription: SubscriptionWithRevenue, monthStart: Date, monthEnd: Date): boolean {
  if (!isActiveSubscription(subscription)) {
    // Check if it was canceled during or after this month
    // For now, only count currently active ones
    return false;
  }

  const startDate = subscription.startDate;
  if (!startDate) return true; // If no start date, assume it was active

  // Subscription must have started before or during this month
  if (isAfter(startDate, monthEnd)) return false;

  return true;
}

/**
 * Calculate comprehensive revenue metrics
 */
export function calculateRevenueMetrics(subscriptions: SubscriptionWithRevenue[]): RevenueMetrics {
  const activeSubscriptions = subscriptions.filter(isActiveSubscription);

  const mrr = activeSubscriptions.reduce((sum, sub) => sum + sub.monthlyAmount, 0);
  const arr = mrr * 12;
  const activeCount = activeSubscriptions.length;
  const arpu = activeCount > 0 ? mrr / activeCount : 0;
  const contractedRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.remainingContractValue, 0);

  return {
    mrr,
    arr,
    activeSubscriptions: activeCount,
    averageRevenuePerUser: arpu,
    contractedRevenue,
  };
}

/**
 * Calculate MRR for a specific month (historical or current)
 */
export function calculateMrrForMonth(
  subscriptions: SubscriptionWithRevenue[],
  monthDate: Date
): { mrr: number; activeCount: number } {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const now = new Date();

  // For future months, just project current active subs
  if (isAfter(monthStart, now)) {
    const activeSubscriptions = subscriptions.filter(sub => {
      if (!isActiveSubscription(sub)) return false;

      // Check if subscription will still be active (not expired)
      if (sub.currentPeriodEnd && isBefore(sub.currentPeriodEnd, monthStart)) {
        // Only include if it's a recurring subscription
        return sub.billingPeriod !== 'one_time';
      }

      return true;
    });

    const mrr = activeSubscriptions.reduce((sum, sub) => sum + sub.monthlyAmount, 0);
    return { mrr, activeCount: activeSubscriptions.length };
  }

  // For historical/current months
  const activeSubscriptions = subscriptions.filter(sub => {
    // Must be active now or have been active in that month
    const startDate = sub.startDate;

    // Started after this month ended - not active
    if (startDate && isAfter(startDate, monthEnd)) return false;

    // For current/recent months, use current status
    if (isActiveSubscription(sub)) return true;

    // For canceled subs, we'd need historical data we don't have
    return false;
  });

  const mrr = activeSubscriptions.reduce((sum, sub) => sum + sub.monthlyAmount, 0);
  return { mrr, activeCount: activeSubscriptions.length };
}

/**
 * Generate monthly revenue trend data for the last N months
 */
export function generateMonthlyRevenueTrend(
  subscriptions: SubscriptionWithRevenue[],
  months: number = 12
): MonthlyRevenueData[] {
  const data: MonthlyRevenueData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const prevMonthStart = startOfMonth(subMonths(monthDate, 1));
    const prevMonthEnd = endOfMonth(subMonths(monthDate, 1));

    // Calculate MRR for this month
    const { mrr, activeCount } = calculateMrrForMonth(subscriptions, monthDate);
    const { mrr: prevMrr, activeCount: prevActiveCount } = calculateMrrForMonth(subscriptions, subMonths(monthDate, 1));

    // New subscriptions this month
    const newThisMonth = subscriptions.filter(sub => {
      const startDate = sub.startDate;
      return startDate && isWithinInterval(startDate, { start: monthStart, end: monthEnd });
    });

    const newMrr = newThisMonth.reduce((sum, sub) => sum + sub.monthlyAmount, 0);

    // Churned = subs that were active last month but not this month
    // This is simplified since we don't have historical status
    const churnedMrr = Math.max(0, prevMrr - mrr + newMrr);

    data.push({
      month: format(monthDate, 'MMM yyyy'),
      monthDate,
      mrr,
      newMrr,
      churnedMrr,
      netMrrChange: mrr - prevMrr,
      activeSubscriptions: activeCount,
      newSubscriptions: newThisMonth.length,
      churnedSubscriptions: Math.max(0, prevActiveCount - activeCount + newThisMonth.length),
    });
  }

  return data;
}

/**
 * Get upcoming renewals for the next N days
 */
export function getUpcomingRenewals(
  subscriptions: SubscriptionWithRevenue[],
  days: number = 90
): RenewalForecast[] {
  const now = new Date();
  const cutoff = addMonths(now, Math.ceil(days / 30));

  const renewals = subscriptions
    .filter(sub => {
      if (!isActiveSubscription(sub)) return false;
      if (!sub.renewalDate) return false;
      if (sub.billingPeriod === 'one_time') return false;

      return isAfter(sub.renewalDate, now) && isBefore(sub.renewalDate, cutoff);
    })
    .map(sub => ({
      subscription: sub,
      renewalDate: sub.renewalDate!,
      amount: sub.contractValue,
    }))
    .sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime());

  return renewals;
}

/**
 * Group renewals by month for forecasting
 */
export function groupRenewalsByMonth(renewals: RenewalForecast[]): Map<string, { count: number; amount: number }> {
  const grouped = new Map<string, { count: number; amount: number }>();

  renewals.forEach(renewal => {
    const key = format(renewal.renewalDate, 'MMM yyyy');
    const existing = grouped.get(key) || { count: 0, amount: 0 };
    grouped.set(key, {
      count: existing.count + 1,
      amount: existing.amount + renewal.amount,
    });
  });

  return grouped;
}

/**
 * Get revenue breakdown by billing period
 */
export function getRevenueByBillingPeriod(subscriptions: SubscriptionWithRevenue[]): RevenueByPeriod[] {
  const active = subscriptions.filter(isActiveSubscription);
  const totalMrr = active.reduce((sum, sub) => sum + sub.monthlyAmount, 0);

  const grouped = new Map<string, { count: number; mrr: number }>();

  active.forEach(sub => {
    const period = sub.billingPeriod;
    const existing = grouped.get(period) || { count: 0, mrr: 0 };
    grouped.set(period, {
      count: existing.count + 1,
      mrr: existing.mrr + sub.monthlyAmount,
    });
  });

  const periodLabels: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Annual',
    one_time: 'One-Time',
    custom: 'Custom',
  };

  return Array.from(grouped.entries())
    .map(([period, data]) => ({
      period: periodLabels[period] || period,
      count: data.count,
      mrr: data.mrr,
      percentage: totalMrr > 0 ? (data.mrr / totalMrr) * 100 : 0,
    }))
    .sort((a, b) => b.mrr - a.mrr);
}

/**
 * Get revenue breakdown by plan
 */
export function getRevenueByPlan(subscriptions: SubscriptionWithRevenue[]): RevenueByPlan[] {
  const active = subscriptions.filter(isActiveSubscription);
  const totalMrr = active.reduce((sum, sub) => sum + sub.monthlyAmount, 0);

  const grouped = new Map<string, { count: number; mrr: number }>();

  active.forEach(sub => {
    const planName = sub.planName;
    const existing = grouped.get(planName) || { count: 0, mrr: 0 };
    grouped.set(planName, {
      count: existing.count + 1,
      mrr: existing.mrr + sub.monthlyAmount,
    });
  });

  return Array.from(grouped.entries())
    .map(([planName, data]) => ({
      planName,
      count: data.count,
      mrr: data.mrr,
      percentage: totalMrr > 0 ? (data.mrr / totalMrr) * 100 : 0,
    }))
    .sort((a, b) => b.mrr - a.mrr);
}

/**
 * Calculate churn rate (simplified - based on current snapshot)
 */
export function calculateChurnMetrics(
  subscriptions: SubscriptionWithRevenue[],
  monthsBack: number = 1
): { churnRate: number; churnedMrr: number; netRetention: number } {
  const now = new Date();
  const periodStart = startOfMonth(subMonths(now, monthsBack));
  const periodEnd = endOfMonth(subMonths(now, 1));

  const { mrr: startMrr } = calculateMrrForMonth(subscriptions, periodStart);
  const { mrr: endMrr } = calculateMrrForMonth(subscriptions, periodEnd);

  // New subscriptions during the period
  const newDuringPeriod = subscriptions.filter(sub => {
    const startDate = sub.startDate;
    return startDate && isWithinInterval(startDate, { start: periodStart, end: periodEnd });
  });
  const newMrr = newDuringPeriod.reduce((sum, sub) => sum + sub.monthlyAmount, 0);

  // Churned MRR = Starting MRR + New MRR - Ending MRR
  const churnedMrr = Math.max(0, startMrr + newMrr - endMrr);

  // Churn rate as percentage of starting MRR
  const churnRate = startMrr > 0 ? (churnedMrr / startMrr) * 100 : 0;

  // Net Revenue Retention = (Ending MRR - New MRR) / Starting MRR * 100
  const netRetention = startMrr > 0 ? ((endMrr - newMrr) / startMrr) * 100 : 100;

  return { churnRate, churnedMrr, netRetention };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
