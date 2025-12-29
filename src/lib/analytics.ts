/**
 * Google Analytics 4 Event Tracking Utility
 *
 * This module provides type-safe event tracking for GA4.
 * All conversion events and user interactions are tracked here.
 *
 * GA4 Measurement ID: G-DF78ZBZW82
 */

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Lead source for attribution tracking
 */
export type AnalyticsLeadSource =
  | 'website'
  | 'google_ads'
  | 'facebook_ads'
  | 'social_media'
  | 'email_campaign'
  | 'referral'
  | 'partner'
  | 'other';

/**
 * Subscription plan details for ecommerce tracking
 */
export interface AnalyticsPlan {
  id: string;
  name: string;
  price: number; // in dollars
  billingCycle: 'monthly' | 'yearly';
}

/**
 * UTM parameters for campaign tracking
 */
export interface AnalyticsUtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

// ============================================================================
// CORE TRACKING FUNCTION
// ============================================================================

/**
 * Send an event to Google Analytics 4
 */
function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', eventName, params);
  } else {
    // Queue the event if gtag is not yet loaded
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...params,
    });
  }
}

/**
 * Set user properties for GA4
 */
function setUserProperties(properties: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('set', 'user_properties', properties);
  }
}

/**
 * Set user ID for cross-device tracking
 */
function setUserId(userId: string): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('config', 'G-DF78ZBZW82', {
      user_id: userId,
    });
  }
}

// ============================================================================
// CONVERSION EVENTS
// ============================================================================

/**
 * Track lead form submission (primary lead conversion)
 * GA4 Event: generate_lead
 */
export function trackLeadFormSubmission(params: {
  businessName: string;
  email: string;
  phone: string;
  siteCoverage: string[];
  source: AnalyticsLeadSource;
  leadScore: number;
  utm?: AnalyticsUtmParams;
}): void {
  trackEvent('generate_lead', {
    // Standard GA4 parameters
    currency: 'USD',
    value: 50, // Estimated lead value

    // Custom parameters
    business_name: params.businessName,
    lead_source: params.source,
    lead_score: params.leadScore,
    site_coverage: params.siteCoverage.join(', '),
    sites_count: params.siteCoverage.length,

    // UTM tracking
    utm_source: params.utm?.source,
    utm_medium: params.utm?.medium,
    utm_campaign: params.utm?.campaign,
    utm_term: params.utm?.term,
    utm_content: params.utm?.content,
  });
}

/**
 * Track user registration completion
 * GA4 Event: sign_up
 */
export function trackSignUp(params: {
  method: 'email' | 'google' | 'other';
  userId?: string;
  hasPendingPurchase?: boolean;
}): void {
  if (params.userId) {
    setUserId(params.userId);
  }

  trackEvent('sign_up', {
    method: params.method,
    has_pending_purchase: params.hasPendingPurchase ?? false,
  });
}

/**
 * Track user login
 * GA4 Event: login
 */
export function trackLogin(params: {
  method: 'email' | 'google' | 'other';
  userId?: string;
}): void {
  if (params.userId) {
    setUserId(params.userId);
  }

  trackEvent('login', {
    method: params.method,
  });
}

/**
 * Track successful purchase/subscription
 * GA4 Event: purchase (for ecommerce)
 */
export function trackPurchase(params: {
  transactionId: string;
  plan: AnalyticsPlan;
  userId?: string;
  couponCode?: string;
}): void {
  if (params.userId) {
    setUserId(params.userId);
  }

  // Calculate the transaction value
  const value = params.plan.billingCycle === 'yearly'
    ? params.plan.price
    : params.plan.price;

  trackEvent('purchase', {
    transaction_id: params.transactionId,
    value: value,
    currency: 'USD',
    coupon: params.couponCode,
    items: [{
      item_id: params.plan.id,
      item_name: params.plan.name,
      price: params.plan.price,
      quantity: 1,
      item_category: 'Subscription',
      item_variant: params.plan.billingCycle,
    }],
  });

  // Also track as a conversion event for easier reporting
  trackEvent('subscription_started', {
    plan_id: params.plan.id,
    plan_name: params.plan.name,
    billing_cycle: params.plan.billingCycle,
    value: value,
    currency: 'USD',
  });
}

// ============================================================================
// ECOMMERCE FUNNEL EVENTS
// ============================================================================

/**
 * Track viewing the pricing page
 * GA4 Event: view_item_list
 */
export function trackViewPricingPage(params: {
  plans: Array<{ id: string; name: string; price: number }>;
  fromLeadForm?: boolean;
  businessName?: string;
}): void {
  trackEvent('view_item_list', {
    item_list_id: 'pricing_plans',
    item_list_name: 'Pricing Plans',
    from_lead_form: params.fromLeadForm ?? false,
    business_name: params.businessName,
    items: params.plans.map((plan, index) => ({
      item_id: plan.id,
      item_name: plan.name,
      price: plan.price,
      quantity: 1,
      index: index,
      item_category: 'Subscription',
    })),
  });
}

/**
 * Track selecting a pricing plan
 * GA4 Event: select_item
 */
export function trackSelectPlan(params: {
  plan: AnalyticsPlan;
}): void {
  trackEvent('select_item', {
    item_list_id: 'pricing_plans',
    item_list_name: 'Pricing Plans',
    items: [{
      item_id: params.plan.id,
      item_name: params.plan.name,
      price: params.plan.price,
      quantity: 1,
      item_category: 'Subscription',
      item_variant: params.plan.billingCycle,
    }],
  });
}

/**
 * Track billing cycle change (monthly/yearly toggle)
 * GA4 Event: custom event
 */
export function trackBillingCycleChange(params: {
  from: 'monthly' | 'yearly';
  to: 'monthly' | 'yearly';
  planId?: string;
}): void {
  trackEvent('billing_cycle_changed', {
    from_cycle: params.from,
    to_cycle: params.to,
    plan_id: params.planId,
  });
}

/**
 * Track checkout initiation
 * GA4 Event: begin_checkout
 */
export function trackBeginCheckout(params: {
  plan: AnalyticsPlan;
  userId?: string;
  isLoggedIn: boolean;
}): void {
  if (params.userId) {
    setUserId(params.userId);
  }

  trackEvent('begin_checkout', {
    currency: 'USD',
    value: params.plan.price,
    is_logged_in: params.isLoggedIn,
    items: [{
      item_id: params.plan.id,
      item_name: params.plan.name,
      price: params.plan.price,
      quantity: 1,
      item_category: 'Subscription',
      item_variant: params.plan.billingCycle,
    }],
  });
}

/**
 * Track add payment info step (before Stripe checkout)
 * GA4 Event: add_payment_info
 */
export function trackAddPaymentInfo(params: {
  plan: AnalyticsPlan;
}): void {
  trackEvent('add_payment_info', {
    currency: 'USD',
    value: params.plan.price,
    payment_type: 'stripe',
    items: [{
      item_id: params.plan.id,
      item_name: params.plan.name,
      price: params.plan.price,
      quantity: 1,
      item_category: 'Subscription',
      item_variant: params.plan.billingCycle,
    }],
  });
}

// ============================================================================
// ADVERTISEMENT FUNNEL EVENTS
// ============================================================================

/**
 * Track ad creation started
 */
export function trackAdCreationStarted(params: {
  advertisementId: string;
  method: 'self_design' | 'team_design';
}): void {
  trackEvent('ad_creation_started', {
    advertisement_id: params.advertisementId,
    design_method: params.method,
  });
}

/**
 * Track business info submission for ad
 */
export function trackAdInfoSubmitted(params: {
  advertisementId: string;
  businessName: string;
}): void {
  trackEvent('ad_info_submitted', {
    advertisement_id: params.advertisementId,
    business_name: params.businessName,
  });
}

/**
 * Track ad design submission
 */
export function trackAdDesignSubmitted(params: {
  advertisementId: string;
  designMethod: 'self_design' | 'team_design';
}): void {
  trackEvent('ad_design_submitted', {
    advertisement_id: params.advertisementId,
    design_method: params.designMethod,
  });
}

/**
 * Track ad approval
 */
export function trackAdApproved(params: {
  advertisementId: string;
}): void {
  trackEvent('ad_approved', {
    advertisement_id: params.advertisementId,
  });
}

/**
 * Track ad going live
 */
export function trackAdLive(params: {
  advertisementId: string;
  businessName?: string;
  targetSites?: string[];
}): void {
  trackEvent('ad_live', {
    advertisement_id: params.advertisementId,
    business_name: params.businessName,
    target_sites: params.targetSites?.join(', '),
  });
}

// ============================================================================
// ENGAGEMENT EVENTS
// ============================================================================

/**
 * Track page view with custom dimensions
 */
export function trackPageView(params: {
  pagePath: string;
  pageTitle: string;
  userId?: string;
}): void {
  if (params.userId) {
    setUserId(params.userId);
  }

  trackEvent('page_view', {
    page_path: params.pagePath,
    page_title: params.pageTitle,
  });
}

/**
 * Track CTA button clicks
 */
export function trackCtaClick(params: {
  ctaName: string;
  ctaLocation: string;
  destinationUrl?: string;
}): void {
  trackEvent('cta_click', {
    cta_name: params.ctaName,
    cta_location: params.ctaLocation,
    destination_url: params.destinationUrl,
  });
}

/**
 * Track phone call clicks
 */
export function trackPhoneClick(params: {
  phoneNumber: string;
  location: string;
}): void {
  trackEvent('phone_click', {
    phone_number: params.phoneNumber,
    click_location: params.location,
  });
}

/**
 * Track FAQ interactions
 */
export function trackFaqInteraction(params: {
  question: string;
  action: 'expand' | 'collapse';
}): void {
  trackEvent('faq_interaction', {
    question: params.question,
    action: params.action,
  });
}

/**
 * Track form field focus (for funnel analysis)
 */
export function trackFormFieldFocus(params: {
  formName: string;
  fieldName: string;
}): void {
  trackEvent('form_field_focus', {
    form_name: params.formName,
    field_name: params.fieldName,
  });
}

/**
 * Track form abandonment
 */
export function trackFormAbandonment(params: {
  formName: string;
  lastField: string;
  fieldsCompleted: number;
  totalFields: number;
}): void {
  trackEvent('form_abandonment', {
    form_name: params.formName,
    last_field: params.lastField,
    fields_completed: params.fieldsCompleted,
    total_fields: params.totalFields,
    completion_rate: (params.fieldsCompleted / params.totalFields) * 100,
  });
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

/**
 * Track errors that impact user experience
 */
export function trackError(params: {
  errorType: string;
  errorMessage: string;
  context: string;
  userId?: string;
}): void {
  trackEvent('error', {
    error_type: params.errorType,
    error_message: params.errorMessage,
    error_context: params.context,
    user_id: params.userId,
  });
}

/**
 * Track checkout errors
 */
export function trackCheckoutError(params: {
  errorMessage: string;
  planId?: string;
  step: 'initiation' | 'payment' | 'confirmation';
}): void {
  trackEvent('checkout_error', {
    error_message: params.errorMessage,
    plan_id: params.planId,
    checkout_step: params.step,
  });
}

// ============================================================================
// USER PROPERTIES
// ============================================================================

/**
 * Set customer type after subscription
 */
export function setCustomerType(params: {
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  isNewCustomer: boolean;
}): void {
  setUserProperties({
    customer_type: params.planName,
    billing_cycle: params.billingCycle,
    is_new_customer: params.isNewCustomer,
  });
}

/**
 * Set lead properties for segmentation
 */
export function setLeadProperties(params: {
  source: AnalyticsLeadSource;
  score: number;
  siteCoverage: string[];
}): void {
  setUserProperties({
    lead_source: params.source,
    lead_score: params.score,
    sites_interested: params.siteCoverage.join(', '),
  });
}
