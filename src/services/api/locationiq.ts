/**
 * LocationIQ API Service
 * Provides geocoding, place search, and routing functionality
 * Used by AI services for location enrichment - NOT for map display
 */

import { logger } from '@/lib/monitoring/logger';

// Mock/stub implementations since we're removing map functionality
// These are kept to prevent breaking AI services that depend on them

export const locationIQ = {
  searchPlaces: async (query: string) => {
    logger.info('API', `Mock search for: ${query}`);
    return [];
  },

  geocodeAddress: async (address: string) => {
    logger.info('API', `Mock geocode for: ${address}`);
    return null;
  },

  reverseGeocode: async (lat: number, lon: number) => {
    logger.info('API', `Mock reverse geocode for: ${lat}, ${lon}`);
    return null;
  },

  getRoute: async (waypoints: any[]) => {
    logger.info('API', `Mock route calculation`);
    return null;
  }
};

export function formatPlace(place: any): string {
  return place?.display_name || place?.name || 'Unknown Location';
}

export function searchPlaces(query: string) {
  return locationIQ.searchPlaces(query);
}

export function geocodeAddress(address: string) {
  return locationIQ.geocodeAddress(address);
}

export function reverseGeocode(lat: number, lon: number) {
  return locationIQ.reverseGeocode(lat, lon);
}

export function getRoute(waypoints: any[]) {
  return locationIQ.getRoute(waypoints);
}

export function calculateDistance(point1: any, point2: any): number {
  // Simple Haversine formula for distance calculation
  if (!point1 || !point2) return 0;

  const R = 6371; // Earth's radius in km
  const lat1 = point1.lat || point1.latitude || 0;
  const lat2 = point2.lat || point2.latitude || 0;
  const lon1 = point1.lon || point1.longitude || 0;
  const lon2 = point2.lon || point2.longitude || 0;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in km
}

// Export types for compatibility
export interface LocationIQPlace {
  place_id?: string;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export default locationIQ;