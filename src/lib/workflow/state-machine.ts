/**
 * Ad Workflow State Machine
 *
 * Defines valid status transitions and enforces workflow rules.
 *
 * Workflow States:
 * 1. DRAFT_IN_PROGRESS - Customer is filling out business info
 * 2. DESIGN_PENDING - Customer needs to design ad or upload assets
 * 3. SUBMITTED_TO_ADMIN - Customer submitted, waiting for admin pickup
 * 4. IN_ADMIN_REVIEW - Admin is reviewing/creating the ad
 * 5. READY_FOR_APPROVAL - Admin sent proof, waiting for customer approval
 * 6. CUSTOMER_APPROVED - Customer approved, ready for handoff
 * 7. HANDOFF_READY - Ready to push to live ad server
 * 8. LIVE - Ad is active on websites
 * 9. PAUSED - Temporarily paused
 * 10. COMPLETED - Subscription ended
 * 11. CANCELED - Subscription canceled
 */

import type { AdStatus } from '../types';

/**
 * Enhanced ad statuses with clearer naming
 */
export const AD_WORKFLOW_STATUSES = {
  // Customer onboarding
  DRAFT_IN_PROGRESS: 'info_needed',
  DESIGN_PENDING: 'design_pending',

  // Admin processing
  SUBMITTED_TO_ADMIN: 'in_review',
  IN_ADMIN_REVIEW: 'in_review',

  // Approval cycle
  READY_FOR_APPROVAL: 'customer_approval',
  CUSTOMER_APPROVED: 'approved',

  // Live states
  HANDOFF_READY: 'approved',
  LIVE: 'live',
  PAUSED: 'paused',

  // End states
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  ARCHIVED: 'archived',
} as const;

/**
 * Valid transitions from each status
 * Key = current status, Value = array of valid next statuses
 */
export const VALID_TRANSITIONS: Record<AdStatus, AdStatus[]> = {
  // Customer fills info -> design step
  'info_needed': ['design_pending', 'canceled'],

  // Customer designs -> submit for review
  'design_pending': ['in_review', 'info_needed', 'canceled'],

  // Admin reviews -> send for approval or request more info
  'in_review': ['customer_approval', 'design_pending', 'info_needed', 'canceled'],

  // Customer approves or requests revision
  'customer_approval': ['approved', 'in_review', 'canceled'],

  // Approved -> go live or back to review
  'approved': ['live', 'in_review', 'canceled'],

  // Live -> pause, complete, archive (when replaced by new ad), or back to approved for updates
  'live': ['paused', 'completed', 'approved', 'archived'],

  // Paused -> resume, complete, or archive (when replaced)
  'paused': ['live', 'completed', 'canceled', 'archived'],

  // End states - no transitions allowed
  'completed': [],
  'canceled': [],
  'archived': [],
};

/**
 * Actions that can trigger status changes
 */
export type WorkflowAction =
  | 'SUBMIT_BUSINESS_INFO'
  | 'SUBMIT_DESIGN'
  | 'REQUEST_CUSTOM_DESIGN'
  | 'ADMIN_START_REVIEW'
  | 'ADMIN_SEND_FOR_APPROVAL'
  | 'ADMIN_REQUEST_MORE_INFO'
  | 'CUSTOMER_APPROVE'
  | 'CUSTOMER_REQUEST_REVISION'
  | 'ADMIN_PUBLISH'
  | 'ADMIN_PAUSE'
  | 'ADMIN_RESUME'
  | 'COMPLETE_SUBSCRIPTION'
  | 'CANCEL_SUBSCRIPTION'
  | 'ARCHIVE_FOR_REPLACEMENT'  // Archive ad when replaced by a new version
  | 'ADMIN_OVERRIDE'; // Admin can force any valid transition

/**
 * Mapping of actions to resulting status transitions
 */
export const ACTION_TRANSITIONS: Record<WorkflowAction, { from: AdStatus[]; to: AdStatus }> = {
  SUBMIT_BUSINESS_INFO: {
    from: ['info_needed'],
    to: 'design_pending',
  },
  SUBMIT_DESIGN: {
    from: ['design_pending'],
    to: 'in_review',
  },
  REQUEST_CUSTOM_DESIGN: {
    from: ['design_pending'],
    to: 'in_review',
  },
  ADMIN_START_REVIEW: {
    from: ['in_review'],
    to: 'in_review', // Status stays same, just marks admin started
  },
  ADMIN_SEND_FOR_APPROVAL: {
    from: ['in_review'],
    to: 'customer_approval',
  },
  ADMIN_REQUEST_MORE_INFO: {
    from: ['in_review', 'customer_approval'],
    to: 'design_pending',
  },
  CUSTOMER_APPROVE: {
    from: ['customer_approval'],
    to: 'approved',
  },
  CUSTOMER_REQUEST_REVISION: {
    from: ['customer_approval'],
    to: 'in_review',
  },
  ADMIN_PUBLISH: {
    from: ['approved'],
    to: 'live',
  },
  ADMIN_PAUSE: {
    from: ['live'],
    to: 'paused',
  },
  ADMIN_RESUME: {
    from: ['paused'],
    to: 'live',
  },
  COMPLETE_SUBSCRIPTION: {
    from: ['live', 'paused', 'approved'],
    to: 'completed',
  },
  CANCEL_SUBSCRIPTION: {
    from: ['info_needed', 'design_pending', 'in_review', 'customer_approval', 'approved', 'live', 'paused'],
    to: 'canceled',
  },
  ARCHIVE_FOR_REPLACEMENT: {
    from: ['live', 'paused'],
    to: 'archived',
  },
  ADMIN_OVERRIDE: {
    from: ['info_needed', 'design_pending', 'in_review', 'customer_approval', 'approved', 'live', 'paused'],
    to: 'info_needed', // Placeholder - actual target is passed separately
  },
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: AdStatus, to: AdStatus): boolean {
  const validTargets = VALID_TRANSITIONS[from];
  return validTargets?.includes(to) ?? false;
}

/**
 * Check if an action can be performed from the current status
 */
export function canPerformAction(currentStatus: AdStatus, action: WorkflowAction): boolean {
  if (action === 'ADMIN_OVERRIDE') {
    // Admin override can be performed from any non-end state
    return !['completed', 'canceled'].includes(currentStatus);
  }

  const transition = ACTION_TRANSITIONS[action];
  return transition.from.includes(currentStatus);
}

/**
 * Get the resulting status after performing an action
 */
export function getNextStatus(currentStatus: AdStatus, action: WorkflowAction): AdStatus | null {
  if (!canPerformAction(currentStatus, action)) {
    return null;
  }
  return ACTION_TRANSITIONS[action].to;
}

/**
 * Get all valid actions from the current status
 */
export function getValidActions(currentStatus: AdStatus): WorkflowAction[] {
  return (Object.keys(ACTION_TRANSITIONS) as WorkflowAction[]).filter(
    action => canPerformAction(currentStatus, action)
  );
}

/**
 * Get all valid next statuses from the current status
 */
export function getValidNextStatuses(currentStatus: AdStatus): AdStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Status categories for UI grouping
 */
export const STATUS_CATEGORIES = {
  CUSTOMER_ACTION_NEEDED: ['info_needed', 'design_pending', 'customer_approval'] as AdStatus[],
  ADMIN_ACTION_NEEDED: ['in_review', 'approved'] as AdStatus[],
  ACTIVE: ['live'] as AdStatus[],
  INACTIVE: ['paused'] as AdStatus[],
  ENDED: ['completed', 'canceled', 'archived'] as AdStatus[],
};

/**
 * Check which category a status belongs to
 */
export function getStatusCategory(status: AdStatus): keyof typeof STATUS_CATEGORIES | null {
  for (const [category, statuses] of Object.entries(STATUS_CATEGORIES)) {
    if (statuses.includes(status)) {
      return category as keyof typeof STATUS_CATEGORIES;
    }
  }
  return null;
}

/**
 * Priority order for admin queue sorting
 * Lower number = higher priority
 */
export const ADMIN_QUEUE_PRIORITY: Record<AdStatus, number> = {
  'customer_approval': 1, // Auto-approve deadline approaching
  'in_review': 2,         // Needs admin action
  'approved': 3,          // Ready to publish
  'design_pending': 4,    // Waiting for customer
  'info_needed': 5,       // Waiting for customer
  'live': 6,              // Active, monitor
  'paused': 7,            // Inactive
  'completed': 8,         // Done
  'canceled': 9,          // Done
  'archived': 10,         // Historical, view only
};

/**
 * Get display text for what needs to happen next
 */
export function getNextStepDescription(status: AdStatus, isAdmin: boolean): string {
  const descriptions: Record<AdStatus, { admin: string; customer: string }> = {
    'info_needed': {
      admin: 'Waiting for customer to submit business information',
      customer: 'Please fill out your business information to continue',
    },
    'design_pending': {
      admin: 'Waiting for customer to submit their ad design or request custom design',
      customer: 'Design your advertisement or request our team to design it for you',
    },
    'in_review': {
      admin: 'Review the submission and create/finalize the ad proof',
      customer: 'Our team is working on your advertisement',
    },
    'customer_approval': {
      admin: 'Waiting for customer approval (48h auto-approve)',
      customer: 'Please review and approve your advertisement proof',
    },
    'approved': {
      admin: 'Publish the advertisement to the live ad server',
      customer: 'Your ad is approved and will be live soon!',
    },
    'live': {
      admin: 'Advertisement is running - monitor performance',
      customer: 'Your advertisement is live on our community websites!',
    },
    'paused': {
      admin: 'Advertisement is paused - resume when ready',
      customer: 'Your advertisement is currently paused',
    },
    'completed': {
      admin: 'Advertising period has ended',
      customer: 'Thank you for advertising with us!',
    },
    'canceled': {
      admin: 'Subscription was canceled',
      customer: 'Your subscription has been canceled',
    },
    'archived': {
      admin: 'This ad version has been replaced with a newer version',
      customer: 'This is a previous version of your advertisement',
    },
  };

  return descriptions[status]?.[isAdmin ? 'admin' : 'customer'] || 'Unknown status';
}

/**
 * Workflow step numbers for progress display
 */
export const WORKFLOW_STEP_NUMBERS: Record<AdStatus, number> = {
  'info_needed': 1,
  'design_pending': 2,
  'in_review': 3,
  'customer_approval': 4,
  'approved': 5,
  'live': 6,
  'paused': 6,
  'completed': 6,
  'canceled': 0,
  'archived': 6,
};

/**
 * Total number of main workflow steps
 */
export const TOTAL_WORKFLOW_STEPS = 6;

/**
 * Calculate workflow progress percentage
 */
export function getWorkflowProgress(status: AdStatus): number {
  const step = WORKFLOW_STEP_NUMBERS[status];
  if (step === 0) return 0;
  return Math.round((step / TOTAL_WORKFLOW_STEPS) * 100);
}
