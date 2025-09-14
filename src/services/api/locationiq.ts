/**
 * LocationIQ API Service
 * Handles all interactions with LocationIQ API for geocoding, places, and routing
 * Replaces Google Places, Radar, and Foursquare APIs
 */

import { logger } from '@/lib/monitoring/logger';

// Use 'API' as the log category for LocationIQ logs
const LOG_CATEGORY = 'API' as const;

// LocationIQ API configuration
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY || process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

// Rate limiting configuration - LocationIQ free tier is 2 req/sec, 5000/day
const RATE_LIMIT = {
  maxRequests: 2, // 2 requests per second for free tier
  windowMs: 1000, // 1 second window
  requests: [] as number[],
  dailyLimit: 5000,
  dailyCount: 0,
  lastReset: Date.now(),
};

// Check rate limit with automatic delay
async function checkRateLimit(): Promise<boolean> {
  const now = Date.now();

  // Reset daily counter if needed
  if (now - RATE_LIMIT.lastReset > 86400000) { // 24 hours
    RATE_LIMIT.dailyCount = 0;
    RATE_LIMIT.lastReset = now;
  }

  // Check daily limit
  if (RATE_LIMIT.dailyCount >= RATE_LIMIT.dailyLimit) {
    logger.error(LOG_CATEGORY, 'Daily rate limit exceeded');
    return false;
  }

  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.windowMs);

  // If at limit, wait before allowing request
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
    const oldestRequest = Math.min(...RATE_LIMIT.requests);
    const waitTime = RATE_LIMIT.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
    if (waitTime > 0) {
      logger.debug(LOG_CATEGORY, `Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return checkRateLimit(); // Recursive call after wait
    }
  }

  RATE_LIMIT.requests.push(now);
  RATE_LIMIT.dailyCount++;
  return true;
}

// Types
export interface LocationIQPlace {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  extratags?: {
    website?: string;
    phone?: string;
    opening_hours?: string;
    cuisine?: string;
    wheelchair?: string;
  };
  type?: string;
  category?: string;
  importance?: number;
}

export interface SearchOptions {
  query: string;
  city?: string;
  country?: string;
  limit?: number;
  viewbox?: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  bounded?: boolean;
}

export interface RouteOptions {
  coordinates: Array<[number, number]>; // [lng, lat] pairs
  profile?: 'driving-car' | 'foot-walking' | 'cycling-regular';
  alternatives?: boolean;
  steps?: boolean;
  geometries?: 'polyline' | 'geojson';
}

/**
 * Search for places using LocationIQ
 */
export async function searchPlaces(options: SearchOptions): Promise<LocationIQPlace[]> {
  if (!LOCATIONIQ_API_KEY) {
    logger.error(LOG_CATEGORY, 'API key not configured');
    throw new Error('LocationIQ API key is required');
  }

  if (!(await checkRateLimit())) {
    logger.warn(LOG_CATEGORY, 'Rate limit exceeded');
    throw new Error('Rate limit exceeded');
  }

  try {
    const params = new URLSearchParams({
      key: LOCATIONIQ_API_KEY,
      q: options.query,
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      limit: String(options.limit || 5),
    });

    // Add city/country to search for better results
    if (options.city) {
      params.set('q', `${options.query} ${options.city}`);
    }
    if (options.country) {
      params.append('countrycodes', options.country.toLowerCase());
    }

    // Add viewbox for geographic bounding
    if (options.viewbox) {
      params.set('viewbox', options.viewbox.join(','));
      if (options.bounded) {
        params.set('bounded', '1');
      }
    }

    const url = `${LOCATIONIQ_BASE_URL}/search.php?${params}`;
    logger.info(LOG_CATEGORY, `Searching: ${options.query}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`LocationIQ API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      logger.warn(LOG_CATEGORY, 'Unexpected response format');
      return [];
    }

    logger.info(LOG_CATEGORY, `Found ${data.length} places for "${options.query}"`);
    return data;
  } catch (error) {
    logger.error(LOG_CATEGORY, `Search failed: ${error}`);
    throw error;
  }
}

/**
 * Get place details by ID
 */
export async function getPlaceDetails(placeId: string): Promise<LocationIQPlace | null> {
  if (!LOCATIONIQ_API_KEY) {
    logger.error(LOG_CATEGORY, 'API key not configured');
    throw new Error('LocationIQ API key is required');
  }

  if (!(await checkRateLimit())) {
    logger.warn(LOG_CATEGORY, 'Rate limit exceeded');
    return null;
  }

  try {
    const params = new URLSearchParams({
      key: LOCATIONIQ_API_KEY,
      osm_id: placeId,
      format: 'json',
      addressdetails: '1',
      extratags: '1',
    });

    const url = `${LOCATIONIQ_BASE_URL}/details.php?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`LocationIQ API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error(LOG_CATEGORY, `Failed to get place details: ${error}`);
    return null;
  }
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const places = await searchPlaces({ query: address, limit: 1 });

    if (places.length === 0) {
      logger.warn(LOG_CATEGORY, `No results for address: ${address}`);
      return null;
    }

    const place = places[0];
    return {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    };
  } catch (error) {
    logger.error(LOG_CATEGORY, `Geocoding failed: ${error}`);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!LOCATIONIQ_API_KEY) {
    logger.error(LOG_CATEGORY, 'API key not configured');
    return null;
  }

  if (!(await checkRateLimit())) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      key: LOCATIONIQ_API_KEY,
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1',
    });

    const url = `${LOCATIONIQ_BASE_URL}/reverse.php?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`LocationIQ API error: ${response.status}`);
    }

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    logger.error(LOG_CATEGORY, `Reverse geocoding failed: ${error}`);
    return null;
  }
}

/**
 * Get route between multiple points
 */
export async function getRoute(options: RouteOptions): Promise<any> {
  if (!LOCATIONIQ_API_KEY) {
    logger.error(LOG_CATEGORY, 'API key not configured');
    throw new Error('LocationIQ API key is required');
  }

  if (!(await checkRateLimit())) {
    return null;
  }

  try {
    const coordinates = options.coordinates.map(coord => coord.join(',')).join(';');
    const params = new URLSearchParams({
      key: LOCATIONIQ_API_KEY,
      alternatives: options.alternatives ? 'true' : 'false',
      steps: options.steps ? 'true' : 'false',
      geometries: options.geometries || 'geojson',
      overview: 'full',
    });

    const profile = options.profile || 'driving-car';
    const url = `${LOCATIONIQ_BASE_URL}/directions/${profile}/${coordinates}?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`LocationIQ API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(LOG_CATEGORY, `Route calculated: ${data.routes?.[0]?.distance}m, ${data.routes?.[0]?.duration}s`);
    return data;
  } catch (error) {
    logger.error(LOG_CATEGORY, `Route calculation failed: ${error}`);
    throw error;
  }
}

/**
 * Search for nearby places
 */
export async function searchNearby(
  lat: number,
  lng: number,
  category: string,
  radius: number = 1000
): Promise<LocationIQPlace[]> {
  try {
    // Calculate bounding box from center point and radius
    const radiusInDegrees = radius / 111000; // Rough conversion
    const viewbox: [number, number, number, number] = [
      lng - radiusInDegrees,
      lat - radiusInDegrees,
      lng + radiusInDegrees,
      lat + radiusInDegrees,
    ];

    const places = await searchPlaces({
      query: category,
      viewbox,
      bounded: true,
      limit: 10,
    });

    // Filter by actual distance
    return places.filter(place => {
      const placeLat = parseFloat(place.lat);
      const placeLng = parseFloat(place.lon);
      const distance = calculateDistance(lat, lng, placeLat, placeLng);
      return distance <= radius;
    });
  } catch (error) {
    logger.error(LOG_CATEGORY, `Nearby search failed: ${error}`);
    return [];
  }
}

/**
 * Calculate distance between two points (in meters)
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert LocationIQ place to a standard format
 */
export function formatPlace(place: LocationIQPlace): {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: string;
  details?: any;
} {
  return {
    id: place.place_id,
    name: place.name || place.display_name.split(',')[0],
    address: place.display_name,
    coordinates: {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    },
    type: place.type || place.category || 'place',
    details: {
      website: place.extratags?.website,
      phone: place.extratags?.phone,
      opening_hours: place.extratags?.opening_hours,
      cuisine: place.extratags?.cuisine,
      wheelchair: place.extratags?.wheelchair,
    },
  };
}

/**
 * Batch search for multiple venues
 */
export async function batchSearchVenues(venues: Array<{ name: string; city: string; fallback?: string }>): Promise<Map<string, LocationIQPlace | null>> {
  const results = new Map<string, LocationIQPlace | null>();

  for (const venue of venues) {
    try {
      // Try primary search
      let places = await searchPlaces({
        query: venue.name,
        city: venue.city,
        limit: 1,
      });

      // Try fallback if no results
      if (places.length === 0 && venue.fallback) {
        logger.info(LOG_CATEGORY, `Trying fallback search for ${venue.name}`);
        places = await searchPlaces({
          query: venue.fallback,
          city: venue.city,
          limit: 1,
        });
      }

      results.set(venue.name, places[0] || null);
    } catch (error) {
      logger.error(LOG_CATEGORY, `Failed to search for ${venue.name}: ${error}`);
      results.set(venue.name, null);
    }
  }

  return results;
}

// Export main functions
export const locationIQ = {
  searchPlaces,
  getPlaceDetails,
  geocodeAddress,
  reverseGeocode,
  getRoute,
  searchNearby,
  calculateDistance,
  formatPlace,
  batchSearchVenues,
  isConfigured: () => !!LOCATIONIQ_API_KEY,
};

export default locationIQ;