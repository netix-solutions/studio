import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  type BusinessCategory,
  BUSINESS_CATEGORIES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  DIRECTORY_TIERS,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

interface DirectorySignupData {
  // Contact info (for lead)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Business info (for listing)
  businessName: string;
  description?: string;
  tagline?: string;
  category: BusinessCategory;
  websiteUrl?: string;
  
  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  
  // Social
  facebookUrl?: string;
  instagramUrl?: string;
  
  // Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// =============================================================================
// CONTENT VALIDATION HELPERS
// =============================================================================

/**
 * Check if text is mostly uppercase (spam indicator)
 */
function isExcessivelyCapitalized(text: string): boolean {
  if (!text || text.length < 5) return false;
  
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 5) return false;
  
  const upperCount = (letters.match(/[A-Z]/g) || []).length;
  const ratio = upperCount / letters.length;
  
  // More than 50% uppercase is excessive
  return ratio > 0.5;
}

/**
 * Normalize capitalization - convert ALL CAPS to Title Case
 */
function normalizeCapitalization(text: string): string {
  if (!text) return '';
  
  // If the text is excessively capitalized, convert to title case
  if (isExcessivelyCapitalized(text)) {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return text;
}

/**
 * Detect spam patterns in text
 */
function containsSpamPatterns(text: string): { isSpam: boolean; reason?: string } {
  if (!text) return { isSpam: false };
  
  const lowerText = text.toLowerCase();
  
  // Spam keywords
  const spamKeywords = [
    'click here', 'act now', 'limited time', 'buy now', 
    'free money', 'make money fast', 'work from home', 
    'no obligation', '100% free', 'winner', 'congratulations',
    'urgent', 'click below', 'order now', 'special promotion',
  ];
  
  for (const keyword of spamKeywords) {
    if (lowerText.includes(keyword)) {
      return { isSpam: true, reason: `Contains promotional phrase: "${keyword}"` };
    }
  }
  
  // Check for excessive punctuation (!!!! or ????)
  if (/[!?]{3,}/.test(text)) {
    return { isSpam: true, reason: 'Contains excessive punctuation' };
  }
  
  // Check for repeated characters (aaaaaaa)
  if (/(.)\1{5,}/.test(text)) {
    return { isSpam: true, reason: 'Contains repeated characters' };
  }
  
  // Check for excessive URLs
  const urlCount = (text.match(/https?:\/\//gi) || []).length;
  if (urlCount > 2) {
    return { isSpam: true, reason: 'Contains too many URLs' };
  }
  
  // Check for phone number spam (multiple phone numbers)
  const phonePatterns = text.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/g) || [];
  if (phonePatterns.length > 1) {
    return { isSpam: true, reason: 'Contains multiple phone numbers' };
  }
  
  return { isSpam: false };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate category is one of the allowed values
 */
function isValidCategory(category: string): boolean {
  const validCategories = Object.values(BUSINESS_CATEGORIES);
  return validCategories.includes(category as BusinessCategory);
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const data: DirectorySignupData = await request.json();

    // ==========================================================================
    // REQUIRED FIELD VALIDATION
    // ==========================================================================
    
    if (!data.businessName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      );
    }

    if (!data.email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(data.email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!data.category) {
      return NextResponse.json(
        { success: false, error: 'Business category is required' },
        { status: 400 }
      );
    }

    if (!isValidCategory(data.category)) {
      return NextResponse.json(
        { success: false, error: 'Please select a valid business category' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // CONTENT QUALITY VALIDATION
    // ==========================================================================
    
    // Check business name for spam
    const businessNameSpam = containsSpamPatterns(data.businessName);
    if (businessNameSpam.isSpam) {
      return NextResponse.json(
        { success: false, error: `Business name rejected: ${businessNameSpam.reason}` },
        { status: 400 }
      );
    }

    // Check description for spam
    if (data.description) {
      const descriptionSpam = containsSpamPatterns(data.description);
      if (descriptionSpam.isSpam) {
        return NextResponse.json(
          { success: false, error: `Description rejected: ${descriptionSpam.reason}` },
          { status: 400 }
        );
      }
    }

    // Check tagline for spam
    if (data.tagline) {
      const taglineSpam = containsSpamPatterns(data.tagline);
      if (taglineSpam.isSpam) {
        return NextResponse.json(
          { success: false, error: `Tagline rejected: ${taglineSpam.reason}` },
          { status: 400 }
        );
      }
    }

    // Validate URLs
    if (data.websiteUrl && !isValidUrl(data.websiteUrl)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid website URL' },
        { status: 400 }
      );
    }

    if (data.facebookUrl && !isValidUrl(data.facebookUrl)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid Facebook URL' },
        { status: 400 }
      );
    }

    if (data.instagramUrl && !isValidUrl(data.instagramUrl)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid Instagram URL' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // NORMALIZE CONTENT (fix all-caps, etc.)
    // ==========================================================================
    
    const normalizedBusinessName = normalizeCapitalization(data.businessName.trim());
    const normalizedTagline = data.tagline ? normalizeCapitalization(data.tagline.trim()) : '';
    const normalizedDescription = data.description?.trim() || '';

    // ==========================================================================
    // CHECK FOR DUPLICATES
    // ==========================================================================
    
    const db = getAdminFirestore();

    const existingListing = await db
      .collection('directory_listings')
      .where('email', '==', data.email.trim().toLowerCase())
      .limit(1)
      .get();

    if (!existingListing.empty) {
      return NextResponse.json(
        { success: false, error: 'A listing with this email already exists. Please contact support if you need to update your listing.' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // CREATE LEAD
    // ==========================================================================
    
    const contactName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || normalizedBusinessName;
    
    const leadData = {
      businessName: normalizedBusinessName,
      contactName,
      firstName: data.firstName?.trim() || '',
      lastName: data.lastName?.trim() || '',
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || '',
      
      // Mark as directory signup
      source: LEAD_SOURCES.DIRECTORY_SIGNUP,
      sourceDetail: 'Directory advertising inquiry',
      
      // UTM tracking
      utmSource: data.utmSource || null,
      utmMedium: data.utmMedium || null,
      utmCampaign: data.utmCampaign || null,
      
      // Pipeline status
      priority: LEAD_PRIORITIES.HIGH,
      status: LEAD_STATUSES.ACTIVE,
      
      // Sites they're interested in
      siteCoverage: ['wesley-chapel', 'pasco'],
      
      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const leadRef = await db.collection('leads').add(leadData);

    // ==========================================================================
    // CREATE DIRECTORY LISTING (PENDING APPROVAL)
    // ==========================================================================
    
    const listingRef = db.collection('directory_listings').doc();
    
    const listingData = {
      id: listingRef.id,
      
      // Lead reference
      leadId: leadRef.id,
      
      // Business info (normalized)
      businessName: normalizedBusinessName,
      description: normalizedDescription,
      tagline: normalizedTagline,
      category: data.category,
      
      // Contact
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || '',
      websiteUrl: data.websiteUrl?.trim() || '',
      
      // Address
      address: data.address?.trim() || '',
      city: data.city?.trim() || '',
      state: data.state?.trim() || 'FL',
      zipCode: data.zipCode?.trim() || '',
      showAddress: Boolean(data.address),
      
      // Social
      facebookUrl: data.facebookUrl?.trim() || '',
      instagramUrl: data.instagramUrl?.trim() || '',
      showSocialLinks: Boolean(data.facebookUrl || data.instagramUrl),
      showContactInfo: true,
      
      // Status & Tier - PENDING APPROVAL
      status: 'pending', // Requires admin approval
      tier: DIRECTORY_TIERS.FREE,
      isFeatured: false,
      
      // No subscription for free tier
      subscriptionStatus: 'none',
      subscriptionId: null,
      stripeCustomerId: null,
      
      // Analytics
      analytics: {
        totalViews: 0,
        totalClicks: 0,
      },
      
      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'free_signup',
    };

    await listingRef.set(listingData);

    // Add activity to the lead
    await db.collection('leads').doc(leadRef.id).collection('activities').add({
      type: 'directory_listing_created',
      title: 'New Directory Advertising Inquiry',
      description: `Submitted directory listing for approval: ${normalizedBusinessName}`,
      listingId: listingRef.id,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'system',
    });

    return NextResponse.json({
      success: true,
      data: {
        leadId: leadRef.id,
        listingId: listingRef.id,
        status: 'pending',
        message: 'Your listing has been submitted for review. You will receive an email once it\'s approved.',
      },
    });

  } catch (error) {
    console.error('Directory signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create listing. Please try again.' },
      { status: 500 }
    );
  }
}
