/**
 * City Zones Configuration Loader
 *
 * This file provides type-safe access to city zone data stored in JSON.
 * The actual data is in data/static/city-zones.json to reduce bundle size
 * and improve maintainability.
 *
 * Previous size: 695 lines
 * New size: ~100 lines (85% reduction)
 */

import cityZonesData from '@/data/static/city-zones.json';

export interface CityZone {
  name: string;
  areas: string[];
  attractions: string[];
  restaurants: string[];
  coordinates: { lat: number; lng: number };
  description?: string;
}

export interface CityConfig {
  zones: CityZone[];
  transitInfo?: {
    metro?: boolean;
    bus?: boolean;
    tram?: boolean;
    bike?: boolean;
  };
  walkingCity?: boolean;
}

// Type-safe city zones data
export const CITY_ZONES: Record<string, CityConfig> = cityZonesData as Record<string, CityConfig>;

/**
 * Get zone recommendations for a specific city and day
 */
export function getZoneRecommendations(city: string, day: number): CityZone[] | null {
  const cityConfig = CITY_ZONES[city];
  if (!cityConfig) return null;

  const zones = cityConfig.zones;
  if (zones.length === 0) return null;

  // Recommend 1-2 zones per day for efficient exploration
  const zonesPerDay = Math.min(2, Math.ceil(zones.length / 3));
  const startIndex = (day - 1) * zonesPerDay;
  const endIndex = Math.min(startIndex + zonesPerDay, zones.length);

  return zones.slice(startIndex, endIndex);
}

/**
 * Find the zone for a specific venue
 */
export function findZoneForVenue(city: string, venueName: string): CityZone | null {
  const cityConfig = CITY_ZONES[city];
  if (!cityConfig) return null;

  for (const zone of cityConfig.zones) {
    // Check attractions
    if (zone.attractions.some(attraction =>
      attraction.toLowerCase().includes(venueName.toLowerCase()) ||
      venueName.toLowerCase().includes(attraction.toLowerCase())
    )) {
      return zone;
    }

    // Check restaurants
    if (zone.restaurants.some(restaurant =>
      restaurant.toLowerCase().includes(venueName.toLowerCase()) ||
      venueName.toLowerCase().includes(restaurant.toLowerCase())
    )) {
      return zone;
    }
  }

  return null;
}

/**
 * Get nearby zones (adjacent or close zones)
 */
export function getNearbyZones(city: string, currentZone: CityZone): CityZone[] {
  const cityConfig = CITY_ZONES[city];
  if (!cityConfig) return [];

  const MAX_DISTANCE_KM = 3; // Consider zones within 3km as nearby

  return cityConfig.zones.filter(zone => {
    if (zone.name === currentZone.name) return false;

    const distance = calculateZoneDistance(currentZone, zone);
    return distance <= MAX_DISTANCE_KM;
  });
}

/**
 * Calculate approximate distance between zone centers
 */
function calculateZoneDistance(zone1: CityZone, zone2: CityZone): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(zone2.coordinates.lat - zone1.coordinates.lat);
  const dLng = toRad(zone2.coordinates.lng - zone1.coordinates.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(zone1.coordinates.lat)) *
    Math.cos(toRad(zone2.coordinates.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get transit recommendation for a city
 */
export function getTransitRecommendation(city: string): string {
  const cityConfig = CITY_ZONES[city];
  if (!cityConfig) return "Check local transit options";

  const transit = cityConfig.transitInfo;
  if (!transit) return "Walking and public transit recommended";

  const options = [];
  if (transit.metro) options.push("Metro");
  if (transit.bus) options.push("Bus");
  if (transit.tram) options.push("Tram");
  if (transit.bike) options.push("Bike sharing");

  if (cityConfig.walkingCity) {
    return `Walking-friendly city. Also available: ${options.join(", ")}`;
  } else {
    return `Public transit recommended: ${options.join(", ")}`;
  }
}

// Export utility functions
export const cityZones = {
  getZoneRecommendations,
  findZoneForVenue,
  getNearbyZones,
  getTransitRecommendation,
};

export default cityZones;