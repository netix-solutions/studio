'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Receipt,
  Target,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  transformSubscription,
  calculateRevenueMetrics,
  generateMonthlyRevenueTrend,
  getUpcomingRenewals,
  getRevenueByBillingPeriod,
  getRevenueByPlan,
  calculateChurnMetrics,
  formatCurrency,
  formatPercentage,
  type SubscriptionWithRevenue,
  type MonthlyRevenueData,
  type RenewalForecast,
  type RevenueByPeriod,
  type RevenueByPlan,
  type RevenueMetrics,
} from '@/lib/revenue';
import RevenueTrendsChart from '@/components/dashboard/revenue-trends-chart';
import RevenueForecast from '@/components/dashboard/revenue-forecast';
import RevenueBreakdown from '@/components/dashboard/revenue-breakdown';

export default function FinancialsPage() {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Financial data
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithRevenue[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<MonthlyRevenueData[]>([]);
  const [renewals, setRenewals] = useState<RenewalForecast[]>([]);
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);
  const [churnMetrics, setChurnMetrics] = useState<{ churnRate: number; netRetention: number }>({ churnRate: 0, netRetention: 100 });

  useEffect(() => {
    if (!firestore) return;

    const fetchFinancialData = async () => {
      try {
        // Fetch customers and subscriptions
        const customersSnapshot = await getDocs(collection(firestore, 'customers'));
        setTotalCustomers(customersSnapshot.size);

        const allSubscriptions: SubscriptionWithRevenue[] = [];

        for (const customerDoc of customersSnapshot.docs) {
          const customerData = customerDoc.data();
          const subsSnapshot = await getDocs(
            collection(firestore, 'customers', customerDoc.id, 'subscriptions')
          );

          subsSnapshot.docs.forEach(subDoc => {
            const subData = { ...subDoc.data(), id: subDoc.id };
            const transformed = transformSubscription(
              subData,
              customerDoc.id,
              customerData.email
            );
            allSubscriptions.push(transformed);
          });
        }

        // Calculate revenue metrics
        const metrics = calculateRevenueMetrics(allSubscriptions);
        const trends = generateMonthlyRevenueTrend(allSubscriptions, 12);
        const upcomingRenewals = getUpcomingRenewals(allSubscriptions, 90);
        const byPeriod = getRevenueByBillingPeriod(allSubscriptions);
        const byPlan = getRevenueByPlan(allSubscriptions);
        const churn = calculateChurnMetrics(allSubscriptions, 1);

        setSubscriptions(allSubscriptions);
        setRevenueMetrics(metrics);
        setRevenueTrends(trends);
        setRenewals(upcomingRenewals);
        setRevenueByPeriod(byPeriod);
        setRevenueByPlan(byPlan);
        setChurnMetrics({ churnRate: churn.churnRate, netRetention: churn.netRetention });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching financial data:', error);
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [firestore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate MRR change from trends
  const currentMrr = revenueTrends[revenueTrends.length - 1]?.mrr || 0;
  const previousMrr = revenueTrends[revenueTrends.length - 2]?.mrr || 0;
  const mrrChange = currentMrr - previousMrr;
  const mrrChangePercent = previousMrr > 0 ? (mrrChange / previousMrr) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
          <p className="text-muted-foreground">
            Revenue metrics and subscription analytics
          </p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueMetrics?.mrr || 0)}</div>
            <div className="flex items-center gap-1 text-xs">
              {mrrChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">
                    +{formatCurrency(mrrChange)} ({formatPercentage(mrrChangePercent)})
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">
                    {formatCurrency(mrrChange)} ({formatPercentage(mrrChangePercent)})
                  </span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <PiggyBank className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueMetrics?.arr || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {revenueMetrics?.activeSubscriptions || 0} active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue Per User</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueMetrics?.averageRevenuePerUser || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Per month per customer
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue Retention</CardTitle>
            <Percent className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              churnMetrics.netRetention >= 100 ? "text-green-600" : "text-amber-600"
            )}>
              {formatPercentage(churnMetrics.netRetention, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {churnMetrics.churnRate > 0 ? `${formatPercentage(churnMetrics.churnRate)} churn` : 'No churn'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends Chart - Full Width */}
      <RevenueTrendsChart data={revenueTrends} loading={loading} />

      {/* Forecast and Breakdown Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueForecast renewals={renewals} loading={loading} />
        <RevenueBreakdown
          byPeriod={revenueByPeriod}
          byPlan={revenueByPlan}
          loading={loading}
        />
      </div>

      {/* Contracted Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-500" />
            Contract Value Summary
          </CardTitle>
          <CardDescription>Remaining value in current contract periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{formatCurrency(revenueMetrics?.contractedRevenue || 0)}</p>
              <p className="text-xs text-muted-foreground">Remaining Contract Value</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{renewals.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming Renewals (90 days)</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">
                {formatCurrency(renewals.reduce((sum, r) => sum + r.amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground">Renewal Revenue (90 days)</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{totalCustomers}</p>
              <p className="text-xs text-muted-foreground">Total Customers</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
