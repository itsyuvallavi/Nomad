/**
 * Firebase Analytics Integration
 * Sends production logs to Firebase Analytics for monitoring
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, Analytics, logEvent } from 'firebase/analytics';

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let analytics: Analytics | null = null;

/**
 * Initialize Firebase Analytics
 */
export function initFirebaseAnalytics() {
  if (typeof window === 'undefined') return null; // Only run on client
  if (analytics) return analytics; // Already initialized
  
  try {
    // Initialize Firebase app if not already done
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize Analytics
    analytics = getAnalytics(app);
    
    console.log('🔥 Firebase Analytics initialized');
    return analytics;
  } catch (error) {
    console.warn('⚠️ Firebase Analytics initialization failed:', (error as Error).message);
    return null;
  }
}

/**
 * Log custom event to Firebase Analytics
 */
export function logCustomEvent(eventName: string, parameters?: Record<string, any>) {
  if (!analytics) {
    analytics = initFirebaseAnalytics();
  }
  
  if (!analytics) return; // Failed to initialize
  
  try {
    // Sanitize parameters to match Firebase requirements
    const sanitizedParams = parameters ? sanitizeParameters(parameters) : {};
    
    logEvent(analytics, eventName, sanitizedParams);
    console.log(`📈 [Analytics] ${eventName}`, sanitizedParams);
  } catch (error) {
    console.warn('⚠️ Failed to log analytics event:', (error as Error).message);
  }
}

/**
 * Sanitize parameters for Firebase Analytics
 */
function sanitizeParameters(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  Object.entries(params).forEach(([key, value]) => {
    // Firebase Analytics parameter constraints:
    // - Key must be ≤ 40 characters
    // - String values must be ≤ 100 characters
    // - Max 25 parameters per event
    
    const sanitizedKey = key.slice(0, 40);
    
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = value.slice(0, 100);
    } else if (typeof value === 'number') {
      sanitized[sanitizedKey] = value;
    } else if (typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else {
      // Convert complex objects to strings
      sanitized[sanitizedKey] = JSON.stringify(value).slice(0, 100);
    }
  });
  
  // Limit to 25 parameters
  const entries = Object.entries(sanitized);
  if (entries.length > 25) {
    return Object.fromEntries(entries.slice(0, 25));
  }
  
  return sanitized;
}

// Predefined analytics events for the travel app
export const AnalyticsEvents = {
  // User interactions
  ITINERARY_GENERATION_START: 'itinerary_generation_start',
  ITINERARY_GENERATION_SUCCESS: 'itinerary_generation_success',
  ITINERARY_GENERATION_ERROR: 'itinerary_generation_error',
  USER_PROMPT_SUBMITTED: 'user_prompt_submitted',
  USER_FEEDBACK_PROVIDED: 'user_feedback_provided',
  
  // System metrics
  API_RESPONSE_TIME: 'api_response_time',
  GENERATION_STRATEGY_USED: 'generation_strategy_used',
  ERROR_OCCURRED: 'error_occurred',
  
  // User engagement
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  PAGE_VIEW: 'page_view'
};

/**
 * Log itinerary generation events
 */
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

/**
 * Log user interactions
 */
export function logUserInteraction(action: string, data?: Record<string, any>) {
  logCustomEvent(`user_${action}`, {
    action,
    ...data
  });
}

/**
 * Log performance metrics
 */
export function logPerformanceMetric(metric: string, value: number, context?: Record<string, any>) {
  logCustomEvent(AnalyticsEvents.API_RESPONSE_TIME, {
    metric_name: metric,
    metric_value: value,
    ...context
  });
}

/**
 * Log system errors
 */
export function logSystemError(error: string, context?: Record<string, any>) {
  logCustomEvent(AnalyticsEvents.ERROR_OCCURRED, {
    error_type: error,
    ...context
  });
}

/**
 * Auto-initialize on import (client-side only)
 */
if (typeof window !== 'undefined') {
  // Initialize after a short delay to avoid blocking page load
  setTimeout(() => {
    initFirebaseAnalytics();
  }, 1000);
}