import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection('analytics').doc('leadMetrics').get();

    if (!doc.exists) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No metrics calculated yet. Run the calculate-lead-metrics cron job first.',
      });
    }

    return NextResponse.json({
      success: true,
      data: doc.data(),
    });
  } catch (error) {
    console.error('Error fetching lead metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead metrics' },
      { status: 500 }
    );
  }
}
