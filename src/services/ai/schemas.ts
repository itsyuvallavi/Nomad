/**
 * AI Schemas - Re-export from core types
 * This file provides backward compatibility for imports looking for schemas
 */

// Re-export all types from core.types.ts
export type {
  // Core Types
  Activity,
  DailyItinerary,
  TransportationOption,
  Accommodation,
  LocalInsight,

  // City & Destination Types
  CityItinerary,
  Destination,

  // Generation Parameters
  GenerationParams,
  UserPreferences,

  // Metadata Types
  TripMetadata,
  BudgetBreakdown,

  // Progress Updates
  ProgressUpdate,

  // Complete Output Type
  GeneratePersonalizedItineraryOutput,

  // Parser Types
  DestinationInfo,
  ExtractedDates,
  ParsedUserIntent,
  UserQuery
} from './types/core.types';

// Re-export validation schemas if needed
export { itinerarySchema, activitySchema } from './schemas/validation.schemas';