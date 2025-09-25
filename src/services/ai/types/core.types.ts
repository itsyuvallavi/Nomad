/**
 * AI Service Types - Single Source of Truth
 * Consolidated type definitions for all AI modules
 */

// ========================================
// Core Activity & Itinerary Types
// ========================================

export interface Activity {
  time?: string;
  description: string;
  venue_name?: string;
  venue_search?: string;
  category?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  neighborhood?: string;
  zone?: string;
  rating?: number;
}

export interface DailyItinerary {
  dayNumber: number;
  date: string;
  title?: string;
  activities: Activity[];
  meals?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  weather?: {
    temp?: { min: number; max: number; day: number };
    weather?: { main: string; description: string };
    humidity?: number;
  };
}

export interface TransportationOption {
  type: string;
  description: string;
  cost?: number;
  duration?: string;
}

export interface Accommodation {
  name: string;
  type: string;
  location: string;
  priceRange?: string;
  rating?: number;
  amenities?: string[];
}

// ========================================
// Intent & Context Types
// ========================================

export type IntentType =
  | 'single_city'
  | 'multi_city'
  | 'discovery'
  | 'question'
  | 'unclear';

export interface UserIntent {
  type: IntentType;
  destination?: string;
  destinations?: string[];
  duration?: number;
  startDate?: string;
  endDate?: string;
  budgetLevel?: 'budget' | 'medium' | 'premium' | 'luxury';
  interests?: string[];
  travelStyle?: string;
  groupSize?: number;
  specialRequests?: string[];
  hasChildren?: boolean;
  needsAccessibility?: boolean;
}

export interface ConversationContext {
  intent?: UserIntent;
  currentStep?: string;
  missingInfo?: string[];
  lastQuestion?: string;
  extractedInfo?: Record<string, any>;
}

// ========================================
// Progressive Generation Types
// ========================================

export interface TripMetadata {
  title: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  duration: number;
  daysPerCity?: number[];
  estimatedCost?: {
    total: number;
    currency: string;
  };
  quickTips?: string[];
  photos?: string[];
}

export interface CityItinerary {
  city: string;
  startDay: number;
  endDay: number;
  days: DayPlan[];
}

export interface DayPlan {
  day: number;
  date: string;
  city: string;
  title: string;
  activities: Activity[];
  weather?: string;
}

export interface ProgressUpdate {
  type: 'metadata' | 'city_complete' | 'complete' | 'routes_optimized' | 'enrichment_complete' | 'costs_complete';
  data?: any;
  progress: number;
  city?: string;
}

export interface GenerationParams {
  destinations: string[];
  duration: number;
  startDate: string;
  preferences?: any;
  travelers?: {
    adults: number;
    children: number;
  };
  onProgress?: (update: ProgressUpdate) => void | Promise<void>;
}

export interface CityGenerationParams {
  city: string;
  days: number;
  startDate: string;
  startDayNumber: number;
  preferences?: any;
}

export interface BaseItinerary {
  destination: string;
  duration: number;
  startDate?: string;
  endDate?: string;
  title?: string;
  days: Array<{
    dayNumber: number;
    date: string;
    title?: string;
    theme?: string;
    activities: Activity[];
  }>;
  quickTips?: string[];
  estimatedCost?: {
    total: number;
    currency: string;
    perPerson?: number;
  };
}

export interface ProgressiveMetadata {
  generationId: string;
  destination: string;
  duration: number;
  startDate?: string;
  endDate?: string;
  estimatedTime?: number;
  totalCost?: number;
  currency?: string;
}

export interface ProgressiveResponse {
  type: 'metadata' | 'city' | 'complete' | 'error' | 'question';
  status: 'processing' | 'completed' | 'failed' | 'awaiting_input';
  progress: number;
  metadata?: ProgressiveMetadata;
  baseItinerary?: BaseItinerary;
  itinerary?: BaseItinerary;
  message?: string;
  error?: string;
  awaitingInput?: string;
  conversationContext?: string;
}

// ========================================
// Complete Itinerary Output Type
// ========================================

export interface GeneratePersonalizedItineraryOutput {
  destination: string;
  destinations?: string[];  // For multi-city trips
  title?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: {
    adults: number;
    children: number;
  };
  dailyItineraries?: DailyItinerary[];

  // Legacy compatibility - maps to new structure
  itinerary?: Array<{
    day: number;
    date: string;
    title: string;
    activities: Activity[];
    weather?: any;
  }>;

  accommodation?: Accommodation;
  estimatedCost?: number;
  totalCost?: number;
  costBreakdown?: {
    flights: number;
    accommodation: number;
    dailyExpenses: number;
    activities: number;
    localTransport: number;
    total: number;
    currency: string;
    perPerson: number;
  };
  transportationOptions?: TransportationOption[];
  weatherConsideration?: string;
  localTips?: string[];
  quickTips?: string[];
}

// ========================================
// Cache Types
// ========================================

export interface CacheEntry {
  key: string;
  intent: UserIntent;
  response: any;
  timestamp: number;
  hits: number;
}

// ========================================
// API Response Types
// ========================================

export interface AIResponse {
  success: boolean;
  data?: {
    generationId?: string;
    message?: string;
    pollUrl?: string;
    type?: string;
    status?: string;
    progress?: number;
    metadata?: ProgressiveMetadata;
    baseItinerary?: BaseItinerary;
    itinerary?: BaseItinerary;
    intent?: UserIntent;
    context?: ConversationContext;
    awaitingInput?: string;
    conversationContext?: string;
  };
  error?: string;
}

// ========================================
// Utility Functions
// ========================================

/**
 * Convert legacy itinerary format to new format
 */
export function convertLegacyItinerary(
  data: any
): GeneratePersonalizedItineraryOutput {
  // If it has the old 'itinerary' array format
  if (data.itinerary && Array.isArray(data.itinerary) && !data.dailyItineraries) {
    return {
      ...data,
      dailyItineraries: data.itinerary.map((day: any) => ({
        dayNumber: day.day || day.dayNumber,
        date: day.date,
        title: day.title,
        activities: day.activities || [],
        weather: day.weather
      }))
    };
  }

  // If it already has dailyItineraries
  if (data.dailyItineraries) {
    return data;
  }

  // Create empty structure
  return {
    destination: data.destination || '',
    title: data.title,
    startDate: data.startDate,
    endDate: data.endDate,
    duration: data.duration,
    dailyItineraries: [],
    quickTips: data.quickTips || [],
    localTips: data.localTips || []
  };
}

// ========================================
// Type Guards
// ========================================

export function isActivity(obj: any): obj is Activity {
  return obj && typeof obj.description === 'string';
}

export function isDailyItinerary(obj: any): obj is DailyItinerary {
  return obj &&
    typeof obj.dayNumber === 'number' &&
    typeof obj.date === 'string' &&
    Array.isArray(obj.activities);
}

export function isUserIntent(obj: any): obj is UserIntent {
  return obj &&
    typeof obj.type === 'string' &&
    ['single_city', 'multi_city', 'discovery', 'question', 'unclear'].includes(obj.type);
}

