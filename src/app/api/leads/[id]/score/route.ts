import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { LEAD_SCORING_RULES } from '@/lib/types';

export const dynamic = 'force-dynamic';

function calculateScore(
  lead: any,
  activities: any[]
): { total: number; breakdown: { engagement: number; profile: number; recency: number; source: number } } {
  let engagement = 0;
  let profile = 0;
  let recency = 0;
  let source = 0;

  // Profile scores
  if (lead.phone) profile += LEAD_SCORING_RULES.HAS_PHONE.points;
  if (lead.estimatedValue) profile += LEAD_SCORING_RULES.HAS_ESTIMATED_VALUE.points;

  // Source scores
  if (lead.source === 'referral') source += LEAD_SCORING_RULES.SOURCE_REFERRAL.points;
  if (lead.source === 'google_ads') source += LEAD_SCORING_RULES.SOURCE_GOOGLE_ADS.points;

  // Form fill (lead was created)
  engagement += LEAD_SCORING_RULES.FORM_FILL.points;

  // Activity-based scores
  const activityCounts: Record<string, number> = {};
  let lastActivityDate: Date | null = null;

  for (const activity of activities) {
    const type = activity.type;
    const activityDate = activity.createdAt?.toDate?.() || (activity.createdAt?._seconds ? new Date(activity.createdAt._seconds * 1000) : null);

    if (activityDate && (!lastActivityDate || activityDate > lastActivityDate)) {
      lastActivityDate = activityDate;
    }

    activityCounts[type] = (activityCounts[type] || 0) + 1;

    switch (type) {
      case 'page_visit':
        engagement = Math.min(engagement + LEAD_SCORING_RULES.PAGE_VISIT.points, engagement + LEAD_SCORING_RULES.PAGE_VISIT.max);
        break;
      case 'login':
        engagement = Math.min(engagement + LEAD_SCORING_RULES.LOGIN.points, engagement + LEAD_SCORING_RULES.LOGIN.max);
        break;
      case 'call':
        engagement = Math.min(engagement + LEAD_SCORING_RULES.CALL_LOGGED.points, engagement + LEAD_SCORING_RULES.CALL_LOGGED.max);
        break;
      case 'meeting':
        engagement = Math.min(engagement + LEAD_SCORING_RULES.MEETING_LOGGED.points, engagement + LEAD_SCORING_RULES.MEETING_LOGGED.max);
        break;
    }
  }

  // Cap individual categories
  const pageVisitScore = Math.min((activityCounts['page_visit'] || 0) * LEAD_SCORING_RULES.PAGE_VISIT.points, LEAD_SCORING_RULES.PAGE_VISIT.max);
  const loginScore = Math.min((activityCounts['login'] || 0) * LEAD_SCORING_RULES.LOGIN.points, LEAD_SCORING_RULES.LOGIN.max);
  const callScore = Math.min((activityCounts['call'] || 0) * LEAD_SCORING_RULES.CALL_LOGGED.points, LEAD_SCORING_RULES.CALL_LOGGED.max);
  const meetingScore = Math.min((activityCounts['meeting'] || 0) * LEAD_SCORING_RULES.MEETING_LOGGED.points, LEAD_SCORING_RULES.MEETING_LOGGED.max);
  const emailClickScore = Math.min((activityCounts['email_link_clicked'] || 0) * LEAD_SCORING_RULES.EMAIL_LINK_CLICKED.points, LEAD_SCORING_RULES.EMAIL_LINK_CLICKED.max);

  engagement = LEAD_SCORING_RULES.FORM_FILL.points + pageVisitScore + loginScore + callScore + meetingScore + emailClickScore;

  // Recency decay
  if (lastActivityDate) {
    const daysSinceActivity = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActivity > LEAD_SCORING_RULES.RECENCY_GRACE_DAYS) {
      const decayDays = daysSinceActivity - LEAD_SCORING_RULES.RECENCY_GRACE_DAYS;
      recency = Math.max(LEAD_SCORING_RULES.RECENCY_DECAY_PER_DAY * decayDays, -30);
    }
  } else {
    // No activity at all - check lead creation date
    const createdAt = lead.createdAt?.toDate?.() || (lead.createdAt?._seconds ? new Date(lead.createdAt._seconds * 1000) : null);
    if (createdAt) {
      const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreation > LEAD_SCORING_RULES.RECENCY_GRACE_DAYS) {
        const decayDays = daysSinceCreation - LEAD_SCORING_RULES.RECENCY_GRACE_DAYS;
        recency = Math.max(LEAD_SCORING_RULES.RECENCY_DECAY_PER_DAY * decayDays, -30);
      }
    }
  }

  const total = Math.max(0, Math.min(100, engagement + profile + recency + source));

  return {
    total,
    breakdown: { engagement, profile, recency, source },
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const db = getAdminFirestore();
    const leadRef = db.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const leadData = leadDoc.data()!;

    // Fetch all activities
    const activitiesSnap = await db.collection('leads').doc(leadId).collection('activities')
      .orderBy('createdAt', 'desc')
      .get();

    const activities = activitiesSnap.docs.map(d => d.data());

    const { total, breakdown } = calculateScore(leadData, activities);

    // Update lead with score
    await leadRef.update({
      leadScore: total,
      leadScoreUpdatedAt: FieldValue.serverTimestamp(),
      scoreBreakdown: breakdown,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: { score: total, breakdown },
    });
  } catch (error) {
    console.error('Error calculating lead score:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate lead score' },
      { status: 500 }
    );
  }
}
