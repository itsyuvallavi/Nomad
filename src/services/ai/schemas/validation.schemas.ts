/**
 * Zod Validation Schemas
 * Runtime validation schemas for AI responses and user inputs
 * Used only where runtime validation is needed (e.g., API responses)
 */

import { z } from 'zod';

// ========================================
// Activity and Itinerary Schemas
// ========================================

export const ActivitySchema = z.object({
  time: z.string().optional(),
  description: z.string().min(2),
  venue_name: z.string().optional(),
  venue_search: z.string().optional(),
  category: z.enum(['Work', 'Leisure', 'Food', 'Travel', 'Accommodation', 'Attraction']).optional(),
  address: z.string().optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  neighborhood: z.string().optional(),
  zone: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
});

export const WeatherSchema = z.object({
  temp: z.object({
    min: z.number(),
    max: z.number(),
    day: z.number()
  }),
  weather: z.object({
    main: z.string(),
    description: z.string(),
    icon: z.string().optional()
  }),
  humidity: z.number().optional(),
  wind_speed: z.number().optional(),
  pop: z.number().optional()
}).optional();

export const DaySchema = z.object({
  day: z.number().int().min(1),
  dayNumber: z.number().int().min(1).optional(), // Support both formats
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2),
  activities: z.array(ActivitySchema).default([]),
  weather: WeatherSchema,
  meals: z.object({
    breakfast: z.string().optional(),
    lunch: z.string().optional(),
    dinner: z.string().optional()
  }).optional()
});

export const ItinerarySchema = z.object({
  destination: z.string().min(2),
  destinations: z.array(z.string()).optional(), // For multi-city
  title: z.string().min(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.number().optional(),
  itinerary: z.array(DaySchema).min(1).optional(), // Legacy format
  dailyItineraries: z.array(DaySchema).min(1).optional(), // New format
  days: z.array(DaySchema).min(1).optional(), // Progressive format
  quickTips: z.array(z.string()).default([]),
  localTips: z.array(z.string()).optional(),
  estimatedCost: z.number().optional(),
  totalCost: z.number().optional(),
  costBreakdown: z.object({
    flights: z.number(),
    accommodation: z.number(),
    dailyExpenses: z.number(),
    activities: z.number(),
    localTransport: z.number(),
    total: z.number(),
    currency: z.string(),
    perPerson: z.number()
  }).optional()
});

// ========================================
// Intent and Context Schemas
// ========================================

export const IntentSchema = z.object({
  type: z.enum(['single_city', 'multi_city', 'discovery', 'question', 'unclear']),
  destination: z.string().optional(),
  destinations: z.array(z.string()).optional(),
  duration: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetLevel: z.enum(['budget', 'medium', 'premium', 'luxury']).optional(),
  interests: z.array(z.string()).optional(),
  travelStyle: z.string().optional(),
  groupSize: z.number().optional(),
  specialRequests: z.array(z.string()).optional(),
  hasChildren: z.boolean().optional(),
  needsAccessibility: z.boolean().optional()
});

export const ConversationContextSchema = z.object({
  intent: IntentSchema.optional(),
  currentStep: z.string().optional(),
  missingInfo: z.array(z.string()).optional(),
  lastQuestion: z.string().optional(),
  extractedInfo: z.record(z.any()).optional()
});

// ========================================
// API Response Schemas
// ========================================

export const AIResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    generationId: z.string().optional(),
    message: z.string().optional(),
    pollUrl: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    progress: z.number().optional(),
    metadata: z.any().optional(),
    baseItinerary: z.any().optional(),
    itinerary: z.any().optional(),
    intent: IntentSchema.optional(),
    context: ConversationContextSchema.optional(),
    awaitingInput: z.string().optional(),
    conversationContext: z.string().optional()
  }).optional(),
  error: z.string().optional()
});

// ========================================
// Validation Helpers
// ========================================

/**
 * Safely parse and validate an itinerary response
 */
export function validateItinerary(data: unknown): z.infer<typeof ItinerarySchema> | null {
  try {
    return ItinerarySchema.parse(data);
  } catch (error) {
    console.error('Itinerary validation failed:', error);
    return null;
  }
}

/**
 * Safely parse and validate user intent
 */
export function validateIntent(data: unknown): z.infer<typeof IntentSchema> | null {
  try {
    return IntentSchema.parse(data);
  } catch (error) {
    console.error('Intent validation failed:', error);
    return null;
  }
}

/**
 * Validate AI response structure
 */
export function validateAIResponse(data: unknown): z.infer<typeof AIResponseSchema> | null {
  try {
    return AIResponseSchema.parse(data);
  } catch (error) {
    console.error('AI response validation failed:', error);
    return null;
  }
}