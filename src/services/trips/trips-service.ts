/**
 * Trips Service - Main Export File
 * Re-exports the refactored modular implementation
 * Maintains backward compatibility for existing imports
 */

// Re-export all types
export type {
  Trip,
  CreateTripInput,
  LocalSearchData,
  TripQueryOptions,
  TripUpdateInput
} from './trip-types';

// Re-export the service instance
export { tripsService } from './trips-service-wrapper';

// Also export the class for those who want to create new instances
export { TripsServiceV2 as TripsService } from './trips-service-v2';

// Export utility modules for direct access if needed
export { TripSanitizer } from './trip-sanitizer';
export { TripSyncService } from './trip-sync-service';