import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { LEAD_SCORING_RULES } from '@/lib/types';

export const dynamic = 'force-dynamic';

function calculateScore(lead: any, activities: any[]): {
  total: number;
  breakdown: { engagement: number; profile: number; recency: number; source: number };
} {
  let profile = 0;
  let source = 0;

  if (lead.phone) profile += LEAD_SCORING_RULES.HAS_PHONE.points;
  if (lead.estimatedValue) profile += LEAD_SCORING_RULES.HAS_ESTIMATED_VALUE.points;
  if (lead.source === 'referral') source += LEAD_SCORING_RULES.SOURCE_REFERRAL.points;
  if (lead.source === 'google_ads') source += LEAD_SCORING_RULES.SOURCE_GOOGLE_ADS.points;

  const activityCounts: Record<string, number> = {};
  let lastActivityDate: Date | null = null;

  for (const activity of activities) {
    const type = activity.type;
    activityCounts[type] = (activityCounts[type] || 0) + 1;
    const activityDate = activity.createdAt?.toDate?.() || (activity.createdAt?._seconds ? new Date(activity.createdAt._seconds * 1000) : null);
    if (activityDate && (!lastActivityDate || activityDate > lastActivityDate)) {
      lastActivityDate = activityDate;
    }
  }

  const engagement =
    LEAD_SCORING_RULES.FORM_FILL.points +
    Math.min((activityCounts['page_visit'] || 0) * LEAD_SCORING_RULES.PAGE_VISIT.points, LEAD_SCORING_RULES.PAGE_VISIT.max) +
    Math.min((activityCounts['login'] || 0) * LEAD_SCORING_RULES.LOGIN.points, LEAD_SCORING_RULES.LOGIN.max) +
    Math.min((activityCounts['call'] || 0) * LEAD_SCORING_RULES.CALL_LOGGED.points, LEAD_SCORING_RULES.CALL_LOGGED.max) +
    Math.min((activityCounts['meeting'] || 0) * LEAD_SCORING_RULES.MEETING_LOGGED.points, LEAD_SCORING_RULES.MEETING_LOGGED.max) +
    Math.min((activityCounts['email_link_clicked'] || 0) * LEAD_SCORING_RULES.EMAIL_LINK_CLICKED.points, LEAD_SCORING_RULES.EMAIL_LINK_CLICKED.max);

  let recency = 0;
  const checkDate = lastActivityDate || (lead.createdAt?.toDate?.() || (lead.createdAt?._seconds ? new Date(lead.createdAt._seconds * 1000) : null));
  if (checkDate) {
    const daysSince = Math.floor((Date.now() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > LEAD_SCORING_RULES.RECENCY_GRACE_DAYS) {
      recency = Math.max(LEAD_SCORING_RULES.RECENCY_DECAY_PER_DAY * (daysSince - LEAD_SCORING_RULES.RECENCY_GRACE_DAYS), -30);
    }
  }

  const total = Math.max(0, Math.min(100, engagement + profile + recency + source));
  return { total, breakdown: { engagement, profile, recency, source } };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const leadsSnap = await db.collection('leads').get();

    let updated = 0;
    let errors = 0;

    for (const leadDoc of leadsSnap.docs) {
      try {
        const leadData = leadDoc.data();
        const activitiesSnap = await db.collection('leads').doc(leadDoc.id).collection('activities').get();
        const activities = activitiesSnap.docs.map(d => d.data());

        const { total, breakdown } = calculateScore(leadData, activities);

        await leadDoc.ref.update({
          leadScore: total,
          leadScoreUpdatedAt: FieldValue.serverTimestamp(),
          scoreBreakdown: breakdown,
        });

        updated++;
      } catch (err) {
        console.error(`Error scoring lead ${leadDoc.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { updated, errors, total: leadsSnap.size },
    });
  } catch (error) {
    console.error('Error recalculating scores:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate scores' },
      { status: 500 }
    );
  }
}
