import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

/**
 * POST /api/admin/manual-entry
 *
 * Creates a manual customer entry with user account, subscription, and advertisement.
 * This allows admins to add customers who purchased through other means (cash, check, etc.)
 *
 * Required: Admin authentication token in Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    // Verify the token and check if user is admin
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const {
      // Customer info
      email,
      contactName,
      firstName,
      lastName,
      businessName,
      phone,

      // Subscription info
      planName,
      amount,
      billingPeriod,
      startDate,
      endDate,
      paymentMethod,
      paymentNotes,

      // Advertisement info
      adWebsiteUrl,
      adText,
      adNotes,
      designPreferences,

      // Options
      createAdvertisement = true,
      sendWelcomeEmail = false,
      initialAdStatus = 'pending_info',
    } = body;

    // Validate required fields
    if (!email || !contactName || !planName || !amount || !billingPeriod || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: email, contactName, planName, amount, billingPeriod, startDate' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let userId: string;
    let userExists = false;
    let userRecord;

    try {
      userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
      userExists = true;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user with a random password (they can reset it)
        const randomPassword = crypto.randomBytes(16).toString('hex');

        userRecord = await auth.createUser({
          email,
          displayName: contactName,
          password: randomPassword,
          emailVerified: false,
        });
        userId = userRecord.uid;
      } else {
        throw error;
      }
    }

    // Get admin user info for tracking
    const adminUserDoc = await db.collection('users').doc(decodedToken.uid).get();
    const adminData = adminUserDoc.data();
    const adminName = adminData?.contactName || adminData?.email || 'Admin';

    // Create or update user document
    const userDocRef = db.collection('users').doc(userId);
    const userDocData: Record<string, any> = {
      id: userId,
      email,
      contactName,
      firstName: firstName || contactName.split(' ')[0] || '',
      lastName: lastName || contactName.split(' ').slice(1).join(' ') || '',
      businessName: businessName || '',
      phone: phone || '',
      adWebsiteUrl: adWebsiteUrl || '',
      adText: adText || '',
      adNotes: adNotes || '',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!userExists) {
      userDocData.createdAt = FieldValue.serverTimestamp();
      userDocData.isManualEntry = true;
      userDocData.manualEntryBy = decodedToken.uid;
      userDocData.manualEntryAt = FieldValue.serverTimestamp();
    }

    if (designPreferences) {
      userDocData.designPreferences = designPreferences;
    }

    await userDocRef.set(userDocData, { merge: true });

    // Create customer document (for subscription)
    const customerDocRef = db.collection('customers').doc(userId);
    await customerDocRef.set({
      email,
      stripeId: null, // No Stripe ID for manual entries
      isManualEntry: true,
    }, { merge: true });

    // Create manual subscription
    const subscriptionId = `manual_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const subscriptionDocRef = customerDocRef.collection('subscriptions').doc(subscriptionId);

    const subscriptionData: Record<string, any> = {
      // Standard Stripe-like fields for compatibility
      id: subscriptionId,
      status: 'active',
      created: startDate ? new Date(startDate) : FieldValue.serverTimestamp(),
      current_period_start: startDate ? new Date(startDate) : FieldValue.serverTimestamp(),
      current_period_end: endDate ? new Date(endDate) : null,

      // Simulated items structure to match Stripe format
      items: [{
        price: {
          unit_amount: Math.round(amount * 100), // Convert to cents
          product: {
            name: planName,
          },
        },
      }],

      // Manual entry specific fields
      isManualEntry: true,
      planName,
      amount,
      billingPeriod,
      paymentMethod: paymentMethod || 'other',
      paymentNotes: paymentNotes || '',

      // Tracking
      customerName: contactName,
      customerEmail: email,
      createdBy: decodedToken.uid,
      createdByName: adminName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await subscriptionDocRef.set(subscriptionData);

    // Create advertisement if requested
    let advertisementId: string | null = null;

    if (createAdvertisement) {
      advertisementId = `ad_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const adDocRef = userDocRef.collection('advertisements').doc(advertisementId);

      const adData: Record<string, any> = {
        id: advertisementId,
        userId,
        subscriptionId,
        status: initialAdStatus,

        // Customer info (denormalized)
        businessName: businessName || '',
        contactName,
        email,
        phone: phone || '',
        adWebsiteUrl: adWebsiteUrl || '',
        adText: adText || '',
        adNotes: adNotes || '',

        // Design preferences
        designPreferences: designPreferences || null,

        // Manual entry tracking
        isManualEntry: true,
        manualEntryBy: decodedToken.uid,
        manualEntryByName: adminName,

        // Timestamps
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // If status is beyond pending_info, mark info as submitted
      if (initialAdStatus !== 'pending_info') {
        adData.infoSubmittedAt = FieldValue.serverTimestamp();
      }

      await adDocRef.set(adData);
    }

    // Optionally send welcome email with password reset link
    if (sendWelcomeEmail && !userExists) {
      try {
        const resetLink = await auth.generatePasswordResetLink(email);

        // Queue email via the mail collection (Firebase Trigger Email Extension)
        await db.collection('mail').add({
          to: email,
          message: {
            subject: `Welcome to Community-Websites.com - ${businessName || contactName}`,
            html: `
              <p>Hi ${contactName},</p>
              <p>Welcome to Community-Websites.com! Your advertising account has been created.</p>
              <p>To access your account and manage your advertisements, please set your password by clicking the link below:</p>
              <p><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 6px;">Set Your Password</a></p>
              <p>Once you've set your password, you can log in at any time to view your ad status and manage your account.</p>
              <p>Best regards,<br>The Community-Websites.com Team</p>
            `,
          },
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        userExists,
        subscriptionId,
        advertisementId,
        message: userExists
          ? 'Added subscription and advertisement to existing customer'
          : 'Created new customer with subscription and advertisement',
      },
    });

  } catch (error: any) {
    console.error('Error creating manual entry:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/manual-entry
 *
 * Returns a list of all manual entries for admin review
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    // Query for manual entry users
    const usersSnapshot = await db.collection('users')
      .where('isManualEntry', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const manualEntries = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: manualEntries,
    });

  } catch (error: any) {
    console.error('Error fetching manual entries:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
