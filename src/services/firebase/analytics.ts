/**
 * Analytics Stub
 * Replaces Firebase Analytics with console logging (dev) / no-op (production).
 * Drop-in replacement — all function signatures are identical to the Firebase version.
 */

// Predefined analytics events for the travel app
export const AnalyticsEvents = {
  ITINERARY_GENERATION_START: 'itinerary_generation_start',
  ITINERARY_GENERATION_SUCCESS: 'itinerary_generation_success',
  ITINERARY_GENERATION_ERROR: 'itinerary_generation_error',
  USER_PROMPT_SUBMITTED: 'user_prompt_submitted',
  USER_FEEDBACK_PROVIDED: 'user_feedback_provided',
  API_RESPONSE_TIME: 'api_response_time',
  GENERATION_STRATEGY_USED: 'generation_strategy_used',
  ERROR_OCCURRED: 'error_occurred',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  PAGE_VIEW: 'page_view'
};

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Log custom event — console-based in dev, no-op in production.
 * Replace with PostHog / Mixpanel / Plausible if you need production analytics.
 */
export function logCustomEvent(eventName: string, parameters?: Record<string, any>) {
  if (isDev && typeof window !== 'undefined') {
    console.log(`📈 [Analytics] ${eventName}`, parameters ?? {});
  }
}

export function initFirebaseAnalytics() {
  return null; // no-op; kept for backward compatibility
}

export function logItineraryGeneration(status: 'start' | 'success' | 'error', data: {
  prompt_length?: number;
  destinations?: string;
  days?: number;
  duration_ms?: number;
  error_message?: string;
  strategy?: string;
}) {
  const eventName = status === 'start'
    ? AnalyticsEvents.ITINERARY_GENERATION_START
    : status === 'success'
    ? AnalyticsEvents.ITINERARY_GENERATION_SUCCESS
    : AnalyticsEvents.ITINERARY_GENERATION_ERROR;
  logCustomEvent(eventName, data);
}

export function logUserInteraction(action: string, data?: Record<string, any>) {
  logCustomEvent(`user_${action}`, { action, ...data });
}

export function logPerformanceMetric(metric: string, value: number, context?: Record<string, any>) {
  logCustomEvent(AnalyticsEvents.API_RESPONSE_TIME, {
    metric_name: metric,
    metric_value: value,
    ...context
  });
}

export function logSystemError(error: string, context?: Record<string, any>) {
  logCustomEvent(AnalyticsEvents.ERROR_OCCURRED, {
    error_type: error,
    ...context
  });
}

// Null export — kept for any code that imports { analytics } from old firebase/auth.ts
export const analytics = null;