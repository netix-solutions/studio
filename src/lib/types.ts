/**
 * Shared types and constants for the Lead Tracking Application
 */

// ============================================================================
// LEAD TYPES & CONSTANTS
// ============================================================================

/**
 * Lead source options for tracking marketing attribution
 */
export const LEAD_SOURCES = {
  WEBSITE: 'website',
  REFERRAL: 'referral',
  SOCIAL_MEDIA: 'social_media',
  GOOGLE_ADS: 'google_ads',
  FACEBOOK_ADS: 'facebook_ads',
  EMAIL_CAMPAIGN: 'email_campaign',
  COLD_OUTREACH: 'cold_outreach',
  EVENT: 'event',
  PARTNER: 'partner',
  DIRECTORY_SIGNUP: 'directory_signup',
  OTHER: 'other',
} as const;

export type LeadSource = typeof LEAD_SOURCES[keyof typeof LEAD_SOURCES];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  referral: 'Referral',
  social_media: 'Social Media',
  google_ads: 'Google Ads',
  facebook_ads: 'Facebook Ads',
  email_campaign: 'Email Campaign',
  cold_outreach: 'Cold Outreach',
  event: 'Event',
  partner: 'Partner',
  directory_signup: 'Directory Signup',
  other: 'Other',
};

/**
 * Lead priority levels
 */
export const LEAD_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type LeadPriority = typeof LEAD_PRIORITIES[keyof typeof LEAD_PRIORITIES];

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const LEAD_PRIORITY_COLORS: Record<LeadPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-600' },
  high: { bg: 'bg-orange-100', text: 'text-orange-600' },
  urgent: { bg: 'bg-red-100', text: 'text-red-600' },
};

/**
 * Lead status - active vs inactive tracking
 * Active leads are being actively pursued
 * Inactive leads are no longer worth pursuing
 */
export const LEAD_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type LeadStatus = typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
};

/**
 * Enhanced Lead interface with all tracking fields
 */
export interface Lead {
  id: string;

  // Contact information
  businessName: string;
  contactName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;

  // Site selection
  siteCoverage: string[];

  // Pipeline & Status
  priority: LeadPriority;
  status: LeadStatus; // active or inactive - whether lead is worth pursuing

  // Scoring (0-100)
  score: number;

  // Source tracking
  source: LeadSource;
  sourceDetail?: string; // e.g., specific referral name, campaign name
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Conversion tracking
  convertedToCustomerId?: string;
  convertedAt?: any; // Firestore Timestamp

  // Email automation tracking
  discountEmailSent?: boolean;
  discountEmailSentAt?: any; // Firestore Timestamp

  // Assignment
  assignedTo?: string; // User ID
  assignedToName?: string;

  // Value tracking
  estimatedValue?: number;

  // Notes
  notes?: string;

  // Timestamps
  createdAt: any; // Firestore Timestamp
  updatedAt?: any;
  lastContactedAt?: any;
  nextFollowUpAt?: any;

  // Legacy support
  [key: string]: any;
}

// ============================================================================
// ACTIVITY TYPES & CONSTANTS
// ============================================================================

/**
 * Activity types for the activity timeline
 */
export const ACTIVITY_TYPES = {
  NOTE: 'note',
  EMAIL_SENT: 'email_sent',
  EMAIL_RECEIVED: 'email_received',
  EMAIL_SCHEDULED: 'email_scheduled',
  CALL: 'call',
  MEETING: 'meeting',
  PRIORITY_CHANGE: 'priority_change',
  SCORE_CHANGE: 'score_change',
  CONVERSION: 'conversion',
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  ASSIGNMENT_CHANGE: 'assignment_change',
  PAGE_VISIT: 'page_visit',
  LOGIN: 'login',
} as const;

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Note Added',
  email_sent: 'Email Sent',
  email_received: 'Email Received',
  email_scheduled: 'Email Scheduled',
  call: 'Phone Call',
  meeting: 'Meeting',
  priority_change: 'Priority Changed',
  score_change: 'Score Updated',
  conversion: 'Converted to Customer',
  task_created: 'Task Created',
  task_completed: 'Task Completed',
  assignment_change: 'Assignment Changed',
  page_visit: 'Website Visit',
  login: 'Logged In',
};

/**
 * Activity interface for the activity timeline
 */
export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;

  // Content
  title: string;
  description?: string;

  // Metadata for specific activity types
  metadata?: {
    fromPriority?: LeadPriority;
    toPriority?: LeadPriority;
    oldScore?: number;
    newScore?: number;
    emailSubject?: string;
    emailTemplateId?: string;
    callDuration?: number; // in minutes
    meetingDuration?: number;
    customerId?: string;
    taskTitle?: string;
    pageUrl?: string; // for page_visit activity type
    pageTitle?: string; // for page_visit activity type
  };

  // Who performed the action
  createdBy: string;
  createdByName: string;

  // Timestamp
  createdAt: any; // Firestore Timestamp
}

// ============================================================================
// ADVERTISEMENT TYPES & CONSTANTS
// ============================================================================

/**
 * Sample ad dimensions (in pixels)
 */
export const AD_DIMENSIONS = {
  WIDTH: 600,
  HEIGHT: 200,
} as const;

/**
 * Advertisement status options - Simplified workflow
 *
 * The workflow is designed to be clear for both customers and admins:
 *
 * CUSTOMER JOURNEY:
 * 1. info_needed → Customer fills out business details
 * 2. design_pending → Customer designs ad OR requests custom design
 * 3. in_review → Admin reviews submission and creates/finalizes ad
 * 4. customer_approval → Customer approves the ad proof
 * 5. approved → Ready for admin to publish to ad manager
 * 6. live → Ad is active on websites
 *
 * ADMIN CAN JUMP IN AT ANY STEP to complete on behalf of customer
 */
export const AD_STATUSES = {
  // Step 1: Customer needs to submit business info
  INFO_NEEDED: 'info_needed',
  // Step 2: Customer needs to design ad or upload assets for custom design
  DESIGN_PENDING: 'design_pending',
  // Step 3: Admin is reviewing and creating/finalizing the ad
  IN_REVIEW: 'in_review',
  // Step 4: Ad proof ready, customer needs to approve
  CUSTOMER_APPROVAL: 'customer_approval',
  // Step 5: Customer approved - ready for admin to publish to ad manager
  APPROVED: 'approved',
  // Step 6: Ad is live on the websites
  LIVE: 'live',
  // Ad temporarily paused
  PAUSED: 'paused',
  // Subscription ended, ad completed
  COMPLETED: 'completed',
  // Subscription canceled
  CANCELED: 'canceled',
  // Ad replaced by a new version, kept for history
  ARCHIVED: 'archived',
} as const;

export type AdStatus = typeof AD_STATUSES[keyof typeof AD_STATUSES];

// Legacy status mapping for backwards compatibility
export const LEGACY_STATUS_MAP: Record<string, AdStatus> = {
  'pending_info': 'info_needed',
  'pending_internal_review': 'in_review',
  'pending_ad_creation': 'in_review',
  'pending_customer_approval': 'customer_approval',
  'revision_requested': 'in_review',
  'holding': 'approved',
  'canceled_inactive': 'canceled',
};

/**
 * Normalize legacy statuses to new workflow
 */
export function normalizeAdStatus(status: string): AdStatus {
  if (Object.values(AD_STATUSES).includes(status as AdStatus)) {
    return status as AdStatus;
  }
  return LEGACY_STATUS_MAP[status] || 'info_needed';
}

export const AD_STATUS_LABELS: Record<AdStatus, string> = {
  info_needed: 'Info Needed',
  design_pending: 'Design Pending',
  in_review: 'In Review',
  customer_approval: 'Awaiting Approval',
  approved: 'Approved - Ready to Publish',
  live: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  canceled: 'Canceled',
  archived: 'Archived',
};

// Customer-facing labels (more friendly)
export const AD_STATUS_CUSTOMER_LABELS: Record<AdStatus, string> = {
  info_needed: 'Tell Us About Your Business',
  design_pending: 'Design Your Advertisement',
  in_review: 'Our Team is Working on Your Ad',
  customer_approval: 'Review & Approve Your Ad',
  approved: 'Your Ad is Approved!',
  live: 'Your Ad is Live!',
  paused: 'Your Ad is Paused',
  completed: 'Advertising Complete',
  canceled: 'Canceled',
  archived: 'Previous Ad Version',
};

// Admin action labels - what needs to be done
export const AD_STATUS_ADMIN_ACTIONS: Record<AdStatus, string> = {
  info_needed: 'Waiting for customer info (or complete on their behalf)',
  design_pending: 'Waiting for customer design (or create for them)',
  in_review: 'Review submission and create ad proof',
  customer_approval: 'Waiting for customer approval (or auto-approve)',
  approved: 'Publish to Ad Manager',
  live: 'Monitor performance',
  paused: 'Resume when ready',
  completed: 'No action needed',
  canceled: 'No action needed',
  archived: 'View historical version',
};

export const AD_STATUS_COLORS: Record<AdStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  info_needed: { variant: 'outline' },
  design_pending: { variant: 'outline' },
  in_review: { variant: 'default' },
  customer_approval: { variant: 'default' },
  approved: { variant: 'secondary' },
  live: { variant: 'secondary' },
  paused: { variant: 'outline' },
  completed: { variant: 'outline' },
  canceled: { variant: 'destructive' },
  archived: { variant: 'outline' },
};

/**
 * Pipeline stage colors for visualization
 */
export const AD_PIPELINE_STAGE_COLORS: Record<AdStatus, { bg: string; text: string; border: string }> = {
  info_needed: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  design_pending: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  in_review: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  customer_approval: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  approved: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  live: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  completed: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  canceled: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
};

/**
 * Workflow steps for the advertisement lifecycle - used for progress visualization
 */
export const AD_WORKFLOW_STEPS = [
  { id: 'info_needed', title: 'Business Info', description: 'Provide business details', step: 1 },
  { id: 'design_pending', title: 'Design Ad', description: 'Create or request ad design', step: 2 },
  { id: 'in_review', title: 'In Review', description: 'Team finalizing your ad', step: 3 },
  { id: 'customer_approval', title: 'Approve', description: 'Review and approve proof', step: 4 },
  { id: 'approved', title: 'Ready', description: 'Ready to go live', step: 5 },
  { id: 'live', title: 'Live', description: 'Ad is active', step: 6 },
] as const;

/**
 * Get the step number for a given status (1-6)
 */
export function getWorkflowStepNumber(status: AdStatus): number {
  const step = AD_WORKFLOW_STEPS.find(s => s.id === status);
  if (step) return step.step;
  // Handle end states
  if (status === 'paused') return 6;
  if (status === 'completed') return 6;
  if (status === 'canceled') return 0;
  if (status === 'archived') return 6;
  return 1;
}

/**
 * Check if workflow is complete (live or end state)
 */
export function isWorkflowComplete(status: AdStatus): boolean {
  return ['live', 'paused', 'completed', 'canceled', 'archived'].includes(status);
}

/**
 * Check if ad is in an active/actionable state
 */
export function isAdActive(status: AdStatus): boolean {
  return !['completed', 'canceled', 'archived'].includes(status);
}

/**
 * Get the next logical status in the workflow
 */
export function getNextWorkflowStatus(currentStatus: AdStatus): AdStatus | null {
  const statusOrder: AdStatus[] = ['info_needed', 'design_pending', 'in_review', 'customer_approval', 'approved', 'live'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= statusOrder.length - 1) return null;
  return statusOrder[currentIndex + 1];
}

/**
 * Ad design preferences for color scheme
 */
export interface AdDesignPreferences {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontStyle?: 'modern' | 'classic' | 'bold' | 'elegant';
  additionalNotes?: string;
}

/**
 * Canvas element for the ad designer
 */
export interface AdDesignElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  align?: 'left' | 'center' | 'right';
  // Image properties
  src?: string;
}

/**
 * Saved ad design from the canvas designer
 */
export interface AdDesign {
  elements: AdDesignElement[];
  backgroundColor: string;
  savedAt?: any;
}

/**
 * Enhanced Advertisement interface
 */
export interface Advertisement {
  id: string;
  userId: string;
  subscriptionId: string;

  // Status - uses simplified workflow
  status: AdStatus;

  // Ad creative - the final ad image and destination
  adProofUrl?: string;
  adProofDestinationUrl?: string;

  // Customer-provided sample ad (600x200) - designed by customer using ad designer
  customerSampleAdUrl?: string;

  // Design preferences from Ad Designer
  designPreferences?: AdDesignPreferences;

  // Customer info (denormalized for display without additional lookups)
  businessName?: string;
  contactName?: string;
  contactTitle?: string;
  email?: string;
  phone?: string;
  cellPhone?: string;
  businessPhone?: string;
  adWebsiteUrl?: string;
  adText?: string;
  adNotes?: string;
  adTitle?: string;

  // Customer uploads (logos, images - up to 3)
  customerUploads?: string[];
  logoUrl?: string;

  // Whether customer requested custom design instead of designing themselves
  requestCustomDesign?: boolean;

  // Tracking timestamps - aligned with new workflow
  infoSubmittedAt?: any;       // When customer submitted business info (Step 1 complete)
  designSubmittedAt?: any;     // When customer submitted design/assets (Step 2 complete)
  sentForReviewAt?: any;       // When moved to in_review status
  sentForApprovalAt?: any;     // When proof sent to customer
  approvedAt?: any;            // When customer approved
  autoApprovalAt?: any;        // 48 hours from sentForApprovalAt for auto-approval
  publishedAt?: any;           // When published to ad manager
  liveAt?: any;                // When ad went live
  pausedAt?: any;              // When ad was paused
  completedAt?: any;           // When subscription ended

  // Revision tracking
  revisionCount?: number;
  revisionNotes?: string;

  // Ad change request tracking - for ad replacements
  isChangeRequest?: boolean;           // True if this ad was created as a change request
  changeRequestType?: 'self_design' | 'team_design';  // How the change was requested
  changeRequestedAt?: any;             // When the change was requested
  parentAdId?: string;                 // ID of the ad this is replacing (for new ads)
  replacedByAdId?: string;             // ID of the new ad that replaced this one (for archived ads)
  archivedAt?: any;                    // When this ad was archived

  // Ad Manager link - references live_ads collection
  liveAdId?: string;           // ID of the live_ad document when published

  // Performance tracking
  impressions?: number;
  clicks?: number;

  // Admin action tracking
  lastActionBy?: string;       // Admin who last took action
  lastActionAt?: any;          // When last admin action was taken
  notes?: string;              // Internal admin notes

  // Timestamps
  createdAt: any;
  updatedAt?: any;
}

/**
 * Helper function to calculate auto-approval deadline (48 hours from sent for approval)
 */
export function calculateAutoApprovalDeadline(sentForApprovalAt: any): Date {
  const sentDate = sentForApprovalAt?.toDate ? sentForApprovalAt.toDate() : new Date(sentForApprovalAt);
  return new Date(sentDate.getTime() + 48 * 60 * 60 * 1000);
}

/**
 * Check if an ad should be auto-approved (48 hours have passed)
 */
export function shouldAutoApprove(sentForApprovalAt: any): boolean {
  if (!sentForApprovalAt) return false;
  const deadline = calculateAutoApprovalDeadline(sentForApprovalAt);
  return new Date() >= deadline;
}

// ============================================================================
// USER/CUSTOMER TYPES
// ============================================================================

/**
 * User details interface - used for customer information display
 */
export interface UserDetails {
  id: string;
  email: string;
  contactName: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  adWebsiteUrl?: string;
  adText?: string;
  adNotes?: string;
  createdAt?: any;
  updatedAt?: any;
  // Manual entry tracking
  isManualEntry?: boolean;
  manualEntryBy?: string;
  manualEntryAt?: any;
}

/**
 * User profile - extends UserDetails with additional customer fields
 */
export interface UserProfile extends UserDetails {
  contactTitle?: string;
  cellPhone?: string;
  businessPhone?: string;
  adTitle?: string;
  logoUrl?: string;
  fileUploads?: string[];
  customerSampleAdUrl?: string;
  requestCustomDesign?: boolean;
}

// ============================================================================
// MANUAL SUBSCRIPTION TYPES
// ============================================================================

/**
 * Manual subscription for customers who purchased outside of Stripe
 */
export interface ManualSubscription {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;

  // Subscription details
  planName: string;
  amount: number; // in dollars
  billingPeriod: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';

  // Status
  status: 'active' | 'paused' | 'canceled' | 'expired';

  // Dates
  startDate: any;
  endDate?: any;

  // Manual entry tracking
  isManualEntry: true;
  paymentMethod?: string; // e.g., 'cash', 'check', 'invoice', 'other'
  paymentNotes?: string;

  // Admin tracking
  createdBy: string;
  createdByName?: string;
  createdAt: any;
  updatedAt?: any;
}

/**
 * Billing period options for manual subscriptions
 */
export const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  ONE_TIME: 'one_time',
  CUSTOM: 'custom',
} as const;

export type BillingPeriod = typeof BILLING_PERIODS[keyof typeof BILLING_PERIODS];

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  one_time: 'One-Time',
  custom: 'Custom',
};

/**
 * Payment method options for manual entries
 */
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CHECK: 'check',
  INVOICE: 'invoice',
  BANK_TRANSFER: 'bank_transfer',
  CREDIT_CARD_OFFLINE: 'credit_card_offline',
  OTHER: 'other',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  invoice: 'Invoice',
  bank_transfer: 'Bank Transfer',
  credit_card_offline: 'Credit Card (Offline)',
  other: 'Other',
};

// ============================================================================
// TASK TYPES (for follow-up reminders)
// ============================================================================

/**
 * Task status options
 */
export const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
} as const;

export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES];

/**
 * Task interface for follow-up reminders
 */
export interface Task {
  id: string;
  leadId?: string;
  customerId?: string;
  advertisementId?: string;

  title: string;
  description?: string;
  status: TaskStatus;

  dueAt?: any;
  completedAt?: any;

  assignedTo?: string;
  assignedToName?: string;

  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate lead score based on various factors
 */
export function calculateLeadScore(lead: Partial<Lead>): number {
  let score = 0;

  // Base score for having contact info
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.businessName) score += 10;

  // Source quality scoring
  const sourceScores: Partial<Record<LeadSource, number>> = {
    referral: 20,
    website: 15,
    google_ads: 12,
    facebook_ads: 10,
    social_media: 8,
    email_campaign: 8,
    partner: 15,
    event: 12,
    cold_outreach: 5,
    directory_signup: 18, // High intent - they signed up for directory
    other: 5,
  };
  score += sourceScores[lead.source as LeadSource] || 5;

  // Site coverage (more sites = higher value)
  const siteCoverageScore = (lead.siteCoverage?.length || 0) * 10;
  score += Math.min(siteCoverageScore, 20);

  // Cap at 100
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Get time since last contact (human readable)
 */
export function getTimeSinceLastContact(lastContactedAt: any): string {
  if (!lastContactedAt) return 'Never contacted';

  const lastContact = lastContactedAt.toDate ? lastContactedAt.toDate() : new Date(lastContactedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastContact.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// COMMUNITY WEBSITES CONFIGURATION
// ============================================================================

/**
 * Community websites where ads can be deployed
 * Each website has a unique ID and configuration
 */
export const COMMUNITY_WEBSITES = {
  WESLEY_CHAPEL: 'wesley-chapel',
  PASCO_COUNTY: 'pasco-county',
} as const;

export type CommunityWebsiteId = typeof COMMUNITY_WEBSITES[keyof typeof COMMUNITY_WEBSITES];

export interface CommunityWebsite {
  id: CommunityWebsiteId;
  name: string;
  shortName: string;
  description: string;
  domain?: string;
  color: { bg: string; text: string; border: string };
}

export const COMMUNITY_WEBSITE_CONFIG: Record<CommunityWebsiteId, CommunityWebsite> = {
  'wesley-chapel': {
    id: 'wesley-chapel',
    name: 'Wesley Chapel Community',
    shortName: 'Wesley Chapel',
    description: 'Wesley Chapel community website',
    domain: 'wesleychapelcommunity.com',
    color: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  },
  'pasco-county': {
    id: 'pasco-county',
    name: 'Pasco County Community',
    shortName: 'Pasco County',
    description: 'Pasco County community website',
    domain: 'pascocountycommunity.com',
    color: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  },
};

export const COMMUNITY_WEBSITE_LIST: CommunityWebsite[] = Object.values(COMMUNITY_WEBSITE_CONFIG);

// ============================================================================
// LIVE AD SERVER TYPES & CONSTANTS
// ============================================================================

/**
 * Ad placement types - where ads can be displayed
 * Currently only inline ads are supported (displayed at 300x100 pixels)
 */
export const AD_PLACEMENTS = {
  INLINE: 'inline',
} as const;

export type AdPlacement = typeof AD_PLACEMENTS[keyof typeof AD_PLACEMENTS];

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  inline: 'Inline (Content)',
};

export const AD_PLACEMENT_DIMENSIONS: Record<AdPlacement, { width: number; height: number }> = {
  inline: { width: 600, height: 200 },
};

/**
 * Live ad status options
 */
export const LIVE_AD_STATUSES = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  SCHEDULED: 'scheduled',
  EXPIRED: 'expired',
  ARCHIVED: 'archived',
} as const;

export type LiveAdStatus = typeof LIVE_AD_STATUSES[keyof typeof LIVE_AD_STATUSES];

export const LIVE_AD_STATUS_LABELS: Record<LiveAdStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  scheduled: 'Scheduled',
  expired: 'Expired',
  archived: 'Archived',
};

export const LIVE_AD_STATUS_COLORS: Record<LiveAdStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
  expired: { bg: 'bg-slate-100', text: 'text-slate-600' },
  archived: { bg: 'bg-red-100', text: 'text-red-600' },
};

/**
 * Live Ad interface - ads that are served to external websites
 */
export interface LiveAd {
  id: string;

  // Basic info
  name: string;
  description?: string;

  // Creative
  imageUrl: string;
  targetUrl: string;
  altText?: string;

  // Placement & sizing
  placement: AdPlacement;
  width?: number;
  height?: number;

  // Website Targeting - which community websites to show on
  targetWebsites?: CommunityWebsiteId[]; // Array of website IDs (e.g., ['wesley-chapel', 'pasco-county'])

  // Legacy targeting (deprecated - use targetWebsites instead)
  targetSites?: string[]; // Optional: specific sites to show on

  // Display settings
  weight: number; // 1-100, higher = more likely to be shown
  status: LiveAdStatus;

  // Scheduling
  startDate?: any; // Firestore Timestamp
  endDate?: any; // Firestore Timestamp

  // Link to customer advertisement (optional)
  sourceAdvertisementId?: string;
  customerId?: string;
  customerName?: string;

  // Analytics
  impressions: number;
  clicks: number;

  // Directory listing settings
  showInDirectory: boolean;
  directoryListing?: LiveAdDirectoryListing;

  // Timestamps
  createdAt: any;
  updatedAt?: any;
  createdBy?: string;
}

// ============================================================================
// ADVERTISER DIRECTORY TYPES & CONSTANTS
// ============================================================================

/**
 * Business categories for directory filtering
 */
/**
 * Business categories for community directory (max 12)
 * Consolidated for local community businesses
 */
export const BUSINESS_CATEGORIES = {
  RESTAURANTS_FOOD: 'restaurants_food',
  HOME_SERVICES: 'home_services',
  HEALTH_MEDICAL: 'health_medical',
  BEAUTY_WELLNESS: 'beauty_wellness',
  PROFESSIONAL_SERVICES: 'professional_services',
  AUTOMOTIVE: 'automotive',
  RETAIL_SHOPPING: 'retail_shopping',
  REAL_ESTATE: 'real_estate',
  EDUCATION_CHILDCARE: 'education_childcare',
  FITNESS_RECREATION: 'fitness_recreation',
  PETS_ANIMALS: 'pets_animals',
  OTHER: 'other',
} as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[keyof typeof BUSINESS_CATEGORIES];

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  restaurants_food: 'Restaurants & Food',
  home_services: 'Home Services',
  health_medical: 'Health & Medical',
  beauty_wellness: 'Beauty & Wellness',
  professional_services: 'Professional Services',
  automotive: 'Automotive',
  retail_shopping: 'Retail & Shopping',
  real_estate: 'Real Estate',
  education_childcare: 'Education & Childcare',
  fitness_recreation: 'Fitness & Recreation',
  pets_animals: 'Pets & Animals',
  other: 'Other',
};

export const BUSINESS_CATEGORY_ICONS: Record<BusinessCategory, string> = {
  restaurants_food: '🍽️',
  home_services: '🏠',
  health_medical: '🏥',
  beauty_wellness: '💆',
  professional_services: '💼',
  automotive: '🚗',
  retail_shopping: '🛍️',
  real_estate: '🏘️',
  education_childcare: '📚',
  fitness_recreation: '🏋️',
  pets_animals: '🐾',
  other: '📌',
};

/**
 * Directory listing status for moderation
 */
export const DIRECTORY_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  HIDDEN: 'hidden',
  REJECTED: 'rejected',
} as const;

export type DirectoryStatus = typeof DIRECTORY_STATUSES[keyof typeof DIRECTORY_STATUSES];

export const DIRECTORY_STATUS_LABELS: Record<DirectoryStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  hidden: 'Hidden',
  rejected: 'Rejected',
};

export const DIRECTORY_STATUS_COLORS: Record<DirectoryStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  hidden: { bg: 'bg-slate-100', text: 'text-slate-600' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * Business hours for a single day
 */
export interface DayHours {
  isOpen: boolean;
  openTime?: string; // Format: "HH:MM" (24-hour)
  closeTime?: string; // Format: "HH:MM" (24-hour)
  is24Hours?: boolean;
}

/**
 * Weekly business hours schedule
 */
export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  timezone?: string; // e.g., "America/New_York"
  holidayNote?: string; // e.g., "Hours may vary on holidays"
}

/**
 * Payment methods accepted by a business
 */
export const PAYMENT_METHODS_ACCEPTED = {
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  PAYPAL: 'paypal',
  VENMO: 'venmo',
  ZELLE: 'zelle',
  CHECK: 'check',
  INVOICE: 'invoice',
  FINANCING: 'financing',
} as const;

export type PaymentMethodAccepted = typeof PAYMENT_METHODS_ACCEPTED[keyof typeof PAYMENT_METHODS_ACCEPTED];

export const PAYMENT_METHOD_ACCEPTED_LABELS: Record<PaymentMethodAccepted, string> = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  paypal: 'PayPal',
  venmo: 'Venmo',
  zelle: 'Zelle',
  check: 'Check',
  invoice: 'Invoice',
  financing: 'Financing Available',
};

export const PAYMENT_METHOD_ACCEPTED_ICONS: Record<PaymentMethodAccepted, string> = {
  cash: '💵',
  credit_card: '💳',
  debit_card: '💳',
  apple_pay: '',
  google_pay: '',
  paypal: '',
  venmo: '',
  zelle: '',
  check: '📝',
  invoice: '📄',
  financing: '💰',
};

/**
 * Business amenities/features
 */
export const BUSINESS_AMENITIES = {
  WIFI: 'wifi',
  PARKING: 'parking',
  WHEELCHAIR_ACCESSIBLE: 'wheelchair_accessible',
  PET_FRIENDLY: 'pet_friendly',
  OUTDOOR_SEATING: 'outdoor_seating',
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
  CURBSIDE: 'curbside',
  APPOINTMENT_REQUIRED: 'appointment_required',
  WALK_INS_WELCOME: 'walk_ins_welcome',
  FAMILY_FRIENDLY: 'family_friendly',
  SENIOR_DISCOUNT: 'senior_discount',
  MILITARY_DISCOUNT: 'military_discount',
  VETERAN_OWNED: 'veteran_owned',
  WOMEN_OWNED: 'women_owned',
  MINORITY_OWNED: 'minority_owned',
  LOCALLY_OWNED: 'locally_owned',
  ECO_FRIENDLY: 'eco_friendly',
  CERTIFIED_ORGANIC: 'certified_organic',
  LICENSED_INSURED: 'licensed_insured',
} as const;

export type BusinessAmenity = typeof BUSINESS_AMENITIES[keyof typeof BUSINESS_AMENITIES];

export const BUSINESS_AMENITY_LABELS: Record<BusinessAmenity, string> = {
  wifi: 'Free WiFi',
  parking: 'Free Parking',
  wheelchair_accessible: 'Wheelchair Accessible',
  pet_friendly: 'Pet Friendly',
  outdoor_seating: 'Outdoor Seating',
  delivery: 'Delivery Available',
  pickup: 'Pickup Available',
  curbside: 'Curbside Service',
  appointment_required: 'Appointment Required',
  walk_ins_welcome: 'Walk-ins Welcome',
  family_friendly: 'Family Friendly',
  senior_discount: 'Senior Discount',
  military_discount: 'Military Discount',
  veteran_owned: 'Veteran Owned',
  women_owned: 'Women Owned',
  minority_owned: 'Minority Owned',
  locally_owned: 'Locally Owned',
  eco_friendly: 'Eco-Friendly',
  certified_organic: 'Certified Organic',
  licensed_insured: 'Licensed & Insured',
};

export const BUSINESS_AMENITY_ICONS: Record<BusinessAmenity, string> = {
  wifi: '📶',
  parking: '🅿️',
  wheelchair_accessible: '♿',
  pet_friendly: '🐾',
  outdoor_seating: '🪑',
  delivery: '🚚',
  pickup: '📦',
  curbside: '🚗',
  appointment_required: '📅',
  walk_ins_welcome: '🚶',
  family_friendly: '👨‍👩‍👧‍👦',
  senior_discount: '👴',
  military_discount: '🎖️',
  veteran_owned: '🇺🇸',
  women_owned: '👩‍💼',
  minority_owned: '🌍',
  locally_owned: '🏘️',
  eco_friendly: '🌱',
  certified_organic: '🌿',
  licensed_insured: '✅',
};

/**
 * Directory listing customization - stored on LiveAd
 * This is for the OLD system where directory info is embedded in live_ads
 */
export interface LiveAdDirectoryListing {
  // Business identity
  businessName: string;
  tagline?: string; // Short business tagline (max 100 chars)
  description?: string; // Business description (max 500 chars)

  // Contact information
  phone?: string;
  email?: string;
  websiteUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Additional contact options
  secondaryPhone?: string; // Alternative phone number
  appointmentUrl?: string; // Online booking/scheduling link
  menuUrl?: string; // Menu or catalog link

  // Business details
  yearEstablished?: number;

  // Social media links
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  yelpUrl?: string;
  googleBusinessUrl?: string;

  // Visual customization
  logoUrl?: string; // Square logo for directory card
  bannerImageUrl?: string; // Wide banner image for expanded view
  galleryImages?: string[]; // Additional images (max 6)

  // Business categorization
  category?: BusinessCategory;
  subcategory?: string;

  // Business hours
  businessHours?: BusinessHours;

  // Payment & amenities
  paymentMethodsAccepted?: PaymentMethodAccepted[];
  amenities?: BusinessAmenity[];

  // Display preferences
  showContactInfo: boolean;
  showSocialLinks: boolean;
  showAddress: boolean;
  showBusinessHours?: boolean;
  showAmenities?: boolean;

  // Moderation
  directoryStatus: DirectoryStatus;
  directoryApprovedAt?: any;
  directoryApprovedBy?: string;
  directoryRejectionReason?: string;
  moderationNotes?: string; // Admin notes about the listing

  // Feature flags
  isFeatured?: boolean; // Featured listings appear first
  featuredUntil?: any; // When featured status expires
  isPremium?: boolean; // Premium listing with enhanced features

  // Analytics (populated by system)
  viewCount?: number; // Profile views
  clickCount?: number; // Click-throughs
  lastViewedAt?: any;

  // Timestamps
  directoryListingCreatedAt?: any;
  directoryListingUpdatedAt?: any;
  lastSubmittedAt?: any; // When customer last submitted for review
}

/**
 * Create default directory listing from advertisement data
 */
export function createDefaultDirectoryListing(
  ad: Partial<Advertisement>,
  customerName?: string
): DirectoryListing {
  return {
    businessName: ad.businessName || customerName || 'Business Name',
    tagline: '',
    description: '',
    phone: ad.phone || ad.businessPhone || '',
    email: ad.email || '',
    websiteUrl: ad.adWebsiteUrl || '',
    showContactInfo: true,
    showSocialLinks: true,
    showAddress: false,
    directoryStatus: 'pending',
    logoUrl: ad.logoUrl || '',
  };
}

/**
 * Check if a directory listing is visible (approved and active ad)
 * Note: showInDirectory === false explicitly hides the listing,
 * but undefined or true allows it to be visible (for backwards compatibility)
 */
export function isDirectoryListingVisible(ad: LiveAd): boolean {
  if (ad.showInDirectory === false) return false;
  if (ad.status !== 'active') return false;
  if (!ad.directoryListing) return false;
  if (ad.directoryListing.directoryStatus !== 'approved') return false;
  return true;
}

/**
 * Ad impression/click event for analytics
 */
export interface AdEvent {
  id: string;
  adId: string;
  type: 'impression' | 'click';

  // Context
  referrer?: string;
  userAgent?: string;
  ipHash?: string; // Hashed for privacy

  // Timestamp
  timestamp: any;
}

/**
 * Calculate click-through rate
 */
export function calculateCTR(impressions: number, clicks: number): number {
  if (impressions === 0) return 0;
  return Math.round((clicks / impressions) * 10000) / 100; // Returns percentage with 2 decimals
}

/**
 * Check if a live ad is currently active based on status and schedule
 */
export function isAdCurrentlyActive(ad: LiveAd): boolean {
  if (ad.status !== 'active' && ad.status !== 'scheduled') return false;

  const now = new Date();

  if (ad.startDate) {
    const startDate = ad.startDate?.toDate ? ad.startDate.toDate() : new Date(ad.startDate);
    if (now < startDate) return false;
  }

  if (ad.endDate) {
    const endDate = ad.endDate?.toDate ? ad.endDate.toDate() : new Date(ad.endDate);
    if (now > endDate) return false;
  }

  return true;
}

/**
 * Select an ad based on weights (weighted random selection)
 */
export function selectAdByWeight(ads: LiveAd[]): LiveAd | null {
  if (ads.length === 0) return null;
  if (ads.length === 1) return ads[0];

  const totalWeight = ads.reduce((sum, ad) => sum + (ad.weight || 1), 0);
  let random = Math.random() * totalWeight;

  for (const ad of ads) {
    random -= ad.weight || 1;
    if (random <= 0) return ad;
  }

  return ads[ads.length - 1];
}

// ============================================================================
// DATABASE RECONCILIATION TYPES & CONSTANTS
// ============================================================================

/**
 * Issue severity levels
 */
export const ISSUE_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type IssueSeverity = typeof ISSUE_SEVERITY[keyof typeof ISSUE_SEVERITY];

export const ISSUE_SEVERITY_COLORS: Record<IssueSeverity, { bg: string; text: string; border: string }> = {
  info: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  critical: { bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-500' },
};

/**
 * Issue categories for reconciliation
 */
export const ISSUE_CATEGORIES = {
  CUSTOMER_DATA: 'customer_data',
  SUBSCRIPTION_DATA: 'subscription_data',
  REVENUE_DATA: 'revenue_data',
  ADVERTISEMENT_DATA: 'advertisement_data',
  LEAD_DATA: 'lead_data',
  USER_DATA: 'user_data',
} as const;

export type IssueCategory = typeof ISSUE_CATEGORIES[keyof typeof ISSUE_CATEGORIES];

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  customer_data: 'Customer Data',
  subscription_data: 'Subscription Data',
  revenue_data: 'Revenue Metrics',
  advertisement_data: 'Advertisement Data',
  lead_data: 'Lead Data',
  user_data: 'User Data',
};

/**
 * A single reconciliation issue found during the check
 */
export interface ReconciliationIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedEntityId?: string;
  affectedEntityType?: 'customer' | 'subscription' | 'advertisement' | 'lead' | 'user';
  suggestedFix?: string;
  canAutoFix: boolean;
  metadata?: Record<string, any>;
}

/**
 * Summary of a reconciliation run
 */
export interface ReconciliationSummary {
  totalCustomers: number;
  totalSubscriptions: number;
  totalActiveSubscriptions: number;
  totalAdvertisements: number;
  totalLeads: number;
  totalUsers: number;
  calculatedMRR: number;
  calculatedARR: number;
  issuesCount: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
}

/**
 * Complete reconciliation report
 */
export interface ReconciliationReport {
  id: string;
  createdAt: any; // Firestore Timestamp
  completedAt?: any;
  status: 'running' | 'completed' | 'failed';
  summary: ReconciliationSummary;
  issues: ReconciliationIssue[];
  fixesApplied: number;
  error?: string;
}

/**
 * Options for running reconciliation
 */
export interface ReconciliationOptions {
  checkCustomers: boolean;
  checkSubscriptions: boolean;
  checkRevenue: boolean;
  checkAdvertisements: boolean;
  checkLeads: boolean;
  checkUsers: boolean;
  autoFixEnabled: boolean;
}

// ============================================================================
// EMAIL EVENT TRACKING
// ============================================================================

/**
 * Email event types for tracking
 */
export const EMAIL_EVENT_TYPES = {
  APPROVAL_REQUEST: 'approval_request',
  APPROVAL_REMINDER: 'approval_reminder',
  AD_APPROVED: 'ad_approved',
  AD_LIVE: 'ad_live',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  CUSTOM: 'custom',
} as const;

export type EmailEventType = typeof EMAIL_EVENT_TYPES[keyof typeof EMAIL_EVENT_TYPES];

/**
 * Email event record for idempotency and tracking
 * Stored in /users/{userId}/advertisements/{adId}/emailEvents/{eventId}
 */
export interface EmailEvent {
  id: string;
  type: EmailEventType;
  recipientEmail: string;
  subject: string;
  sentAt: any; // Firestore Timestamp
  sentBy: 'system' | 'admin';
  sentByUserId?: string;

  // For idempotency - unique key to prevent duplicate sends
  idempotencyKey?: string;

  // Tracking
  mailDocId?: string; // Reference to /mail collection doc

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Generate an idempotency key for an email event
 * Used to prevent duplicate emails within a time window
 */
export function generateEmailIdempotencyKey(
  adId: string,
  eventType: EmailEventType,
  timeWindowMinutes: number = 60
): string {
  const windowStart = Math.floor(Date.now() / (timeWindowMinutes * 60 * 1000));
  return `${adId}:${eventType}:${windowStart}`;
}

// ============================================================================
// AD DRAFT VERSION TYPES (for designer state storage)
// ============================================================================

/**
 * Ad draft version for storing designer state history
 * Stored in /users/{userId}/advertisements/{adId}/versions/{versionId}
 */
export interface AdDraftVersion {
  id: string;
  versionNumber: number;
  elements: AdDesignElement[];
  backgroundColor: string;
  previewImageUrl: string;
  createdAt: any; // Firestore Timestamp
  createdBy: 'customer' | 'admin';
  createdByUserId: string;
  notes?: string;
  isApproved?: boolean;
  isFinal?: boolean;
}

// ============================================================================
// SUBSCRIPTION INTEGRATION TYPES
// ============================================================================

/**
 * Stripe customer record (synced from Stripe via Firebase Extension)
 * Stored in /customers/{userId}
 */
export interface StripeCustomer {
  email: string;
  stripeId?: string;
  stripeLink?: string;

  // For manual entries
  isManualEntry?: boolean;

  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Subscription record (synced from Stripe or manual)
 * Stored in /customers/{userId}/subscriptions/{subscriptionId}
 */
export interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'canceled' | 'unpaid' | 'past_due' | 'incomplete';

  // Stripe data
  created?: any; // Timestamp
  current_period_start?: any;
  current_period_end?: any;
  cancel_at_period_end?: boolean;

  // Plan info
  items?: Array<{
    price: {
      id: string;
      unit_amount: number;
      recurring?: { interval: 'month' | 'year' };
      product: { name: string };
    };
  }>;

  // For manual entries
  isManualEntry?: boolean;
  planName?: string;
  amount?: number;
  billingPeriod?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';
  paymentMethod?: string;
  paymentNotes?: string;
  createdBy?: string;
}

/**
 * Check if a subscription is active
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialing';
}

/**
 * Get subscription display info
 */
export function getSubscriptionDisplayInfo(subscription: Subscription): {
  planName: string;
  priceDisplay: string;
  renewalDate: string | null;
} {
  const planName = subscription.items?.[0]?.price?.product?.name
    || subscription.planName
    || 'Subscription';

  const amount = subscription.items?.[0]?.price?.unit_amount
    ? subscription.items[0].price.unit_amount / 100
    : subscription.amount || 0;

  const interval = subscription.items?.[0]?.price?.recurring?.interval
    || subscription.billingPeriod
    || 'month';

  const priceDisplay = `$${amount}/${interval}`;

  const periodEnd = subscription.current_period_end;
  const renewalDate = periodEnd?.seconds
    ? new Date(periodEnd.seconds * 1000).toLocaleDateString()
    : null;

  return { planName, priceDisplay, renewalDate };
}

// ============================================================================
// DIRECTORY LISTING TYPES (NEW - Paid Business Directory System)
// ============================================================================

/**
 * Directory listing tiers
 * Note: 'included' is a free listing that comes with any ad subscription
 */
export const DIRECTORY_TIERS = {
  FREE: 'free', // Free signup (limited time promotion)
  INCLUDED: 'included', // Free with ad subscription
  LEGACY: 'legacy', // Migrated from old system
} as const;

export type DirectoryTier = typeof DIRECTORY_TIERS[keyof typeof DIRECTORY_TIERS];

export const DIRECTORY_TIER_LABELS: Record<DirectoryTier, string> = {
  free: 'Free Listing',
  included: 'Included with Ad',
  legacy: 'Legacy (Free)',
};

export const DIRECTORY_TIER_COLORS: Record<DirectoryTier, { bg: string; text: string }> = {
  free: { bg: 'bg-green-100', text: 'text-green-700' },
  included: { bg: 'bg-blue-100', text: 'text-blue-700' },
  legacy: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

/**
 * Directory listing subscription status
 */
export const DIRECTORY_SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELED: 'canceled',
  LEGACY: 'legacy',
} as const;

export type DirectorySubscriptionStatus = typeof DIRECTORY_SUBSCRIPTION_STATUSES[keyof typeof DIRECTORY_SUBSCRIPTION_STATUSES];

/**
 * Directory listing status
 */
export const DIRECTORY_LISTING_STATUSES = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXPIRED: 'expired',
} as const;

export type DirectoryListingStatus = typeof DIRECTORY_LISTING_STATUSES[keyof typeof DIRECTORY_LISTING_STATUSES];

/**
 * Directory listing interface
 * Stored in /directory_listings/{listingId}
 */
export interface DirectoryListing {
  id: string;

  // Business Information
  businessName: string;
  tagline?: string;
  description?: string;
  category: BusinessCategory;
  yearEstablished?: number;

  // Contact
  email?: string;
  contactEmail?: string; // alias for email
  contactName?: string;
  phone?: string;
  websiteUrl?: string;

  // Visual
  logoUrl?: string;
  bannerImageUrl?: string;
  galleryImages?: string[];

  // Address (optional)
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  showAddress?: boolean;

  // Social Links (flat for form compatibility)
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  yelpUrl?: string;
  googleBusinessUrl?: string;

  // Additional Links
  secondaryPhone?: string;
  appointmentUrl?: string;
  menuUrl?: string;

  // Display Preferences
  showContactInfo?: boolean;
  showSocialLinks?: boolean;

  // User & Subscription
  userId?: string;
  leadId?: string; // For free signups
  subscriptionStatus: DirectorySubscriptionStatus;
  subscriptionId?: string;
  stripeCustomerId?: string;
  priceId?: string;
  currentPeriodEnd?: any; // Firestore Timestamp

  // Listing Status & Tier
  status: DirectoryListingStatus;
  tier: DirectoryTier;
  isFeatured: boolean;
  sortOrder?: number;

  // Analytics (summary)
  analytics?: {
    totalViews: number;
    totalClicks: number;
    lastViewed?: any; // Firestore Timestamp
  };

  // Metadata
  createdAt: any; // Firestore Timestamp
  updatedAt?: any;
  createdBy: string; // userId or 'self-service' or 'free_signup'
}

/**
 * Directory listing analytics (daily breakdown)
 * Stored in /directory_listings/{listingId}/analytics/{date}
 */
export interface DirectoryListingAnalytics {
  date: string; // YYYY-MM-DD
  views: number;
  clicks: number;
  timestamp: any; // Firestore Timestamp
}

/**
 * Check if a directory listing is visible (active status)
 */
export function isDirectoryListingActive(listing: DirectoryListing): boolean {
  return listing.status === 'active' 
    && (listing.subscriptionStatus === 'active' || listing.subscriptionStatus === 'legacy');
}

/**
 * Get directory listing display tier name
 */
export function getDirectoryTierDisplay(tier: DirectoryTier): string {
  return DIRECTORY_TIER_LABELS[tier] || 'Unknown';
}

/**
 * Draft listing data (stored temporarily before checkout)
 * Stored in /directory_drafts/{draftId}
 */
export interface DirectoryDraft {
  id: string;
  businessName: string;
  contactEmail: string;
  contactName: string;
  phone: string;
  websiteUrl: string;
  description: string;
  category: BusinessCategory;
  logoUrl: string;
  bannerImageUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  socialLinks?: {
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    youtubeUrl?: string;
    tiktokUrl?: string;
  };
  selectedTier: DirectoryTier;
  selectedPriceId: string;
  createdAt: any; // Firestore Timestamp
  expiresAt: any; // Firestore Timestamp (30 min expiry)
}
