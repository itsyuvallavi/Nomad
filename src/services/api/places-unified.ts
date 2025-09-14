/**
 * Unified Places API - Uses ONLY LocationIQ for all place data
 * No static data, no fallbacks - pure dynamic API data
 */

// Re-export everything from the LocationIQ implementation
export * from './places-unified-locationiq';
export { default } from './places-unified-locationiq';

// Import specific functions for backward compatibility
import {
  getActivities,
  searchPlaces,
  getRandomActivities,
  isLocationIQConfigured
} from './places-unified-locationiq';

// Export with old function names for compatibility
export {
  getActivities as getUnifiedActivities,
  searchPlaces as searchUnifiedActivities,
  getRandomActivities as getRandomStaticActivities,
  isLocationIQConfigured as hasStaticData
};