import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all leads
    const leadsSnap = await db.collection('leads').get();
    const leads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Funnel counts per stage
    const funnelCounts: Record<string, number> = {
      new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0,
    };

    // Source performance
    const sourceStats: Record<string, {
      total: number; won: number; totalValue: number; daysTotals: number[];
    }> = {};

    // Pipeline value
    const pipelineValue: Record<string, number> = {};

    // Response time tracking
    let totalFirstResponseHours = 0;
    let firstResponseCount = 0;
    let contactedWithin24h = 0;
    let totalNewLeads30d = 0;

    // Weekly velocity (last 12 weeks)
    const weeklyVelocity: { week: string; new: number; won: number; lost: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      weeklyVelocity.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        new: 0, won: 0, lost: 0,
      });
    }

    for (const lead of leads) {
      const stage = (lead as any).stage || 'new';
      funnelCounts[stage] = (funnelCounts[stage] || 0) + 1;

      const source = (lead as any).source || 'website';
      if (!sourceStats[source]) {
        sourceStats[source] = { total: 0, won: 0, totalValue: 0, daysTotals: [] };
      }
      sourceStats[source].total++;

      if (stage === 'won') {
        sourceStats[source].won++;
        if ((lead as any).estimatedValue) {
          sourceStats[source].totalValue += (lead as any).estimatedValue;
        }
        // Calculate days to win
        const createdAt = (lead as any).createdAt?.toDate?.() || ((lead as any).createdAt?._seconds ? new Date((lead as any).createdAt._seconds * 1000) : null);
        const stageChangedAt = (lead as any).stageChangedAt?.toDate?.() || ((lead as any).stageChangedAt?._seconds ? new Date((lead as any).stageChangedAt._seconds * 1000) : null);
        if (createdAt && stageChangedAt) {
          const days = Math.floor((stageChangedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          sourceStats[source].daysTotals.push(days);
        }
      }

      // Pipeline value for active stages
      if (['new', 'contacted', 'qualified', 'proposal', 'negotiation'].includes(stage)) {
        pipelineValue[stage] = (pipelineValue[stage] || 0) + ((lead as any).estimatedValue || 0);
      }

      // Check if created in last 30 days
      const createdAt = (lead as any).createdAt?.toDate?.() || ((lead as any).createdAt?._seconds ? new Date((lead as any).createdAt._seconds * 1000) : null);
      if (createdAt && createdAt >= thirtyDaysAgo) {
        totalNewLeads30d++;

        // Weekly velocity
        for (let i = 0; i < 12; i++) {
          const weekStart = new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(now.getTime() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
          if (createdAt >= weekStart && createdAt < weekEnd) {
            weeklyVelocity[i].new++;
          }
        }
      }

      // Track won/lost in weekly velocity
      const stageChangedAt = (lead as any).stageChangedAt?.toDate?.() || ((lead as any).stageChangedAt?._seconds ? new Date((lead as any).stageChangedAt._seconds * 1000) : null);
      if (stageChangedAt) {
        for (let i = 0; i < 12; i++) {
          const weekStart = new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(now.getTime() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
          if (stageChangedAt >= weekStart && stageChangedAt < weekEnd) {
            if (stage === 'won') weeklyVelocity[i].won++;
            if (stage === 'lost') weeklyVelocity[i].lost++;
          }
        }
      }
    }

    // Stage-to-stage conversion rates
    const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];
    const conversionRates: { from: string; to: string; rate: number }[] = [];
    for (let i = 0; i < stageOrder.length - 1; i++) {
      const fromCount = funnelCounts[stageOrder[i]] || 0;
      const toCount = stageOrder.slice(i + 1).reduce((sum, s) => sum + (funnelCounts[s] || 0), 0);
      const totalFromStage = fromCount + toCount;
      conversionRates.push({
        from: stageOrder[i],
        to: stageOrder[i + 1],
        rate: totalFromStage > 0 ? Math.round((toCount / totalFromStage) * 100) : 0,
      });
    }

    // Source performance summary
    const sourcePerformance = Object.entries(sourceStats).map(([source, stats]) => ({
      source,
      total: stats.total,
      won: stats.won,
      conversionRate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0,
      avgDaysToWin: stats.daysTotals.length > 0
        ? Math.round(stats.daysTotals.reduce((a, b) => a + b, 0) / stats.daysTotals.length)
        : null,
      totalValue: stats.totalValue,
    }));

    const metrics = {
      funnelCounts,
      conversionRates,
      weeklyVelocity,
      sourcePerformance,
      pipelineValue,
      responseTime: {
        avgFirstResponseHours: firstResponseCount > 0 ? Math.round(totalFirstResponseHours / firstResponseCount) : null,
        contactedWithin24hPercent: totalNewLeads30d > 0 ? Math.round((contactedWithin24h / totalNewLeads30d) * 100) : null,
      },
      totalLeads: leads.length,
      calculatedAt: now.toISOString(),
    };

    // Cache metrics
    await db.collection('analytics').doc('leadMetrics').set({
      ...metrics,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error calculating lead metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate metrics' },
      { status: 500 }
    );
  }
}
