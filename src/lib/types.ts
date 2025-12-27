/**
 * Shared types and constants for the Lead Tracking Application
 */

// ============================================================================
// LEAD TYPES & CONSTANTS
// ============================================================================

/**
 * Lead pipeline stages - represents the sales funnel
 */
export const LEAD_STAGES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL_SENT: 'proposal_sent',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
} as const;

export type LeadStage = typeof LEAD_STAGES[keyof typeof LEAD_STAGES];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const LEAD_STAGE_ORDER: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
];

export const LEAD_STAGE_COLORS: Record<LeadStage, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  contacted: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  qualified: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  proposal_sent: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  negotiation: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  won: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

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
  stage: LeadStage;
  priority: LeadPriority;

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
  CALL: 'call',
  MEETING: 'meeting',
  STAGE_CHANGE: 'stage_change',
  PRIORITY_CHANGE: 'priority_change',
  SCORE_CHANGE: 'score_change',
  CONVERSION: 'conversion',
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  ASSIGNMENT_CHANGE: 'assignment_change',
} as const;

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Note Added',
  email_sent: 'Email Sent',
  email_received: 'Email Received',
  call: 'Phone Call',
  meeting: 'Meeting',
  stage_change: 'Stage Changed',
  priority_change: 'Priority Changed',
  score_change: 'Score Updated',
  conversion: 'Converted to Customer',
  task_created: 'Task Created',
  task_completed: 'Task Completed',
  assignment_change: 'Assignment Changed',
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
    fromStage?: LeadStage;
    toStage?: LeadStage;
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
 * Customer onboarding status - tracks where customer is in the onboarding workflow
 */
export const CUSTOMER_ONBOARDING_STATUSES = {
  PENDING_BUSINESS_INFO: 'pending_business_info',
  PENDING_AD_DESIGN: 'pending_ad_design',
  INFO_SUBMITTED: 'info_submitted',
  COMPLETE: 'complete',
} as const;

export type CustomerOnboardingStatus = typeof CUSTOMER_ONBOARDING_STATUSES[keyof typeof CUSTOMER_ONBOARDING_STATUSES];

export const CUSTOMER_ONBOARDING_LABELS: Record<CustomerOnboardingStatus, string> = {
  pending_business_info: 'Waiting for Business Info',
  pending_ad_design: 'Waiting for Ad Design Preferences',
  info_submitted: 'Info Submitted - Under Review',
  complete: 'Onboarding Complete',
};

/**
 * Advertisement status options - full workflow
 */
export const AD_STATUSES = {
  // Customer needs to submit business info
  PENDING_INFO: 'pending_info',
  // Customer has submitted info, waiting for internal review
  PENDING_INTERNAL_REVIEW: 'pending_internal_review',
  // Ad is being created by external application
  PENDING_AD_CREATION: 'pending_ad_creation',
  // Ad proof ready, sent to customer for approval
  PENDING_CUSTOMER_APPROVAL: 'pending_customer_approval',
  // Customer requested changes
  REVISION_REQUESTED: 'revision_requested',
  // Customer approved the ad
  APPROVED: 'approved',
  // Ad is live on the websites
  LIVE: 'live',
  // Ad temporarily paused
  PAUSED: 'paused',
  // Subscription ended, ad completed
  COMPLETED: 'completed',
  // Subscription canceled
  CANCELED_INACTIVE: 'canceled_inactive',
} as const;

export type AdStatus = typeof AD_STATUSES[keyof typeof AD_STATUSES];

export const AD_STATUS_LABELS: Record<AdStatus, string> = {
  pending_info: 'Awaiting Customer Info',
  pending_internal_review: 'Under Internal Review',
  pending_ad_creation: 'Ad Being Created',
  pending_customer_approval: 'Awaiting Customer Approval',
  revision_requested: 'Revision Requested',
  approved: 'Approved',
  live: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  canceled_inactive: 'Canceled',
};

export const AD_STATUS_COLORS: Record<AdStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending_info: { variant: 'outline' },
  pending_internal_review: { variant: 'default' },
  pending_ad_creation: { variant: 'default' },
  pending_customer_approval: { variant: 'default' },
  revision_requested: { variant: 'destructive' },
  approved: { variant: 'secondary' },
  live: { variant: 'secondary' },
  paused: { variant: 'outline' },
  completed: { variant: 'outline' },
  canceled_inactive: { variant: 'destructive' },
};

/**
 * Pipeline stage colors for the Kanban board visualization
 */
export const AD_PIPELINE_STAGE_COLORS: Record<AdStatus, { bg: string; text: string; border: string }> = {
  pending_info: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  pending_internal_review: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  pending_ad_creation: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  pending_customer_approval: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  revision_requested: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  approved: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  live: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  completed: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  canceled_inactive: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

/**
 * Workflow steps for the advertisement lifecycle
 */
export const AD_WORKFLOW_STEPS = [
  { id: 'pending_info', title: 'Submit Info', description: 'Customer provides business details' },
  { id: 'pending_internal_review', title: 'Under Review', description: 'Team reviews submission' },
  { id: 'pending_ad_creation', title: 'Ad Creation', description: 'Design team creates ad' },
  { id: 'pending_customer_approval', title: 'Approval', description: 'Customer reviews proof' },
  { id: 'live', title: 'Live', description: 'Ad is active' },
] as const;

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
 * Enhanced Advertisement interface
 */
export interface Advertisement {
  id: string;
  userId: string;
  subscriptionId: string;

  // Status
  status: AdStatus;

  // Ad creative
  adProofUrl?: string;
  adProofDestinationUrl?: string;

  // Customer-provided sample ad (600x200)
  customerSampleAdUrl?: string;

  // Design preferences from Ad Designer
  designPreferences?: AdDesignPreferences;

  // Customer info (denormalized)
  businessName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  adWebsiteUrl?: string;
  adText?: string;
  adNotes?: string;

  // Customer uploads (logos, images)
  customerUploads?: string[];

  // Tracking timestamps
  infoSubmittedAt?: any;
  sentForReviewAt?: any;
  sentForApprovalAt?: any;
  approvedAt?: any;
  autoApprovalAt?: any; // 48 hours from sentForApprovalAt
  liveAt?: any;
  completedAt?: any;

  // Revision tracking
  revisionCount?: number;
  revisionNotes?: string;

  // Performance (for future ad tracking)
  impressions?: number;
  clicks?: number;

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
    other: 5,
  };
  score += sourceScores[lead.source as LeadSource] || 5;

  // Site coverage (more sites = higher value)
  const siteCoverageScore = (lead.siteCoverage?.length || 0) * 10;
  score += Math.min(siteCoverageScore, 20);

  // Engagement scoring based on stage
  const stageScores: Partial<Record<LeadStage, number>> = {
    new: 0,
    contacted: 10,
    qualified: 20,
    proposal_sent: 25,
    negotiation: 30,
  };
  score += stageScores[lead.stage as LeadStage] || 0;

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

/**
 * Get stage progression percentage for funnel visualization
 */
export function getStageProgressPercentage(stage: LeadStage): number {
  const stageIndex = LEAD_STAGE_ORDER.indexOf(stage);
  if (stageIndex === -1) return 0;
  // Exclude 'lost' from calculation as it's an end state
  const activeStages: LeadStage[] = LEAD_STAGE_ORDER.filter((s): s is Exclude<LeadStage, 'lost'> => s !== 'lost');
  const activeIndex = activeStages.indexOf(stage as any);
  if (activeIndex === -1) return 0;
  return Math.round((activeIndex / (activeStages.length - 1)) * 100);
}
