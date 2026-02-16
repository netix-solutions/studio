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

    // Counts
    let convertedCount = 0;
    let totalPipelineValue = 0;

    // Source performance
    const sourceStats: Record<string, {
      total: number; converted: number; totalValue: number; daysTotals: number[];
    }> = {};

    // Response time tracking
    let totalFirstResponseHours = 0;
    let firstResponseCount = 0;
    let contactedWithin24h = 0;
    let totalNewLeads30d = 0;

    // Weekly velocity (last 12 weeks)
    const weeklyVelocity: { week: string; new: number; converted: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      weeklyVelocity.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        new: 0, converted: 0,
      });
    }

    for (const lead of leads) {
      const isConverted = !!(lead as any).convertedToCustomerId;
      const source = (lead as any).source || 'website';

      if (!sourceStats[source]) {
        sourceStats[source] = { total: 0, converted: 0, totalValue: 0, daysTotals: [] };
      }
      sourceStats[source].total++;

      if (isConverted) {
        convertedCount++;
        sourceStats[source].converted++;
        if ((lead as any).estimatedValue) {
          sourceStats[source].totalValue += (lead as any).estimatedValue;
        }
        // Calculate days to convert
        const createdAt = (lead as any).createdAt?.toDate?.() || ((lead as any).createdAt?._seconds ? new Date((lead as any).createdAt._seconds * 1000) : null);
        const convertedAt = (lead as any).convertedAt?.toDate?.() || ((lead as any).convertedAt?._seconds ? new Date((lead as any).convertedAt._seconds * 1000) : null);
        if (createdAt && convertedAt) {
          const days = Math.floor((convertedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          sourceStats[source].daysTotals.push(days);
        }
      } else {
        // Pipeline value for unconverted leads
        totalPipelineValue += ((lead as any).estimatedValue || 0);
      }

      // Check if created in last 30 days
      const createdAt = (lead as any).createdAt?.toDate?.() || ((lead as any).createdAt?._seconds ? new Date((lead as any).createdAt._seconds * 1000) : null);
      if (createdAt && createdAt >= thirtyDaysAgo) {
        totalNewLeads30d++;

        // Weekly velocity - new leads
        for (let i = 0; i < 12; i++) {
          const weekStart = new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(now.getTime() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
          if (createdAt >= weekStart && createdAt < weekEnd) {
            weeklyVelocity[i].new++;
          }
        }
      }

      // Track conversions in weekly velocity
      const convertedAt = (lead as any).convertedAt?.toDate?.() || ((lead as any).convertedAt?._seconds ? new Date((lead as any).convertedAt._seconds * 1000) : null);
      if (convertedAt) {
        for (let i = 0; i < 12; i++) {
          const weekStart = new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(now.getTime() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
          if (convertedAt >= weekStart && convertedAt < weekEnd) {
            weeklyVelocity[i].converted++;
          }
        }
      }
    }

    // Source performance summary
    const sourcePerformance = Object.entries(sourceStats).map(([source, stats]) => ({
      source,
      total: stats.total,
      converted: stats.converted,
      conversionRate: stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0,
      avgDaysToConvert: stats.daysTotals.length > 0
        ? Math.round(stats.daysTotals.reduce((a, b) => a + b, 0) / stats.daysTotals.length)
        : null,
      totalValue: stats.totalValue,
    }));

    const metrics = {
      totalLeads: leads.length,
      convertedCount,
      totalPipelineValue,
      weeklyVelocity,
      sourcePerformance,
      responseTime: {
        avgFirstResponseHours: firstResponseCount > 0 ? Math.round(totalFirstResponseHours / firstResponseCount) : null,
        contactedWithin24hPercent: totalNewLeads30d > 0 ? Math.round((contactedWithin24h / totalNewLeads30d) * 100) : null,
      },
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
