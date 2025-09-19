/**
 * OpenStreetMap API Service
 * Free geocoding and place search using Nominatim and Overpass API
 * No API key required!
 */

import { logger } from '@/lib/monitoring/logger';

const LOG_CATEGORY = 'API' as const;

// API endpoints (all free, no auth required)
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Rate limiting (be respectful of free services)
const RATE_LIMIT = {
  requests: [] as number[],
  windowMs: 1000, // 1 second
  maxRequests: 1, // 1 request per second (Nominatim requirement)
};

async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.windowMs);

  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
    const oldestRequest = Math.min(...RATE_LIMIT.requests);
    const waitTime = RATE_LIMIT.windowMs - (now - oldestRequest) + 100;
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  RATE_LIMIT.requests.push(now);
}

// Types
export interface OSMPlace {
  place_id: number;
  osm_id: number;
  osm_type: string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
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
    wheelchair?: string;
    cuisine?: string;
    diet?: string;
  };
  boundingbox?: [string, string, string, string];
}

export interface OverpassPOI {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    'name:en'?: string;
    amenity?: string;
    tourism?: string;
    cuisine?: string;
    opening_hours?: string;
    website?: string;
    phone?: string;
    wheelchair?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'diet:vegetarian'?: string;
    'diet:vegan'?: string;
  };
}

/**
 * Search for a place using Nominatim
 */
export async function searchPlace(
  query: string,
  options: {
    limit?: number;
    country?: string;
    city?: string;
    acceptLanguage?: string;
  } = {}
): Promise<OSMPlace[]> {
  await respectRateLimit();

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      limit: String(options.limit || 5),
      'accept-language': options.acceptLanguage || 'en',
    });

    if (options.country) {
      params.append('countrycodes', options.country.toLowerCase());
    }

    const url = `${NOMINATIM_API}/search?${params}`;

    logger.info(LOG_CATEGORY, `Searching OSM for: ${query}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NomadNavigator/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(LOG_CATEGORY, `Found ${data.length} results for "${query}"`);

    return data;
  } catch (error) {
    logger.error(LOG_CATEGORY, `OSM search failed: ${error}`);
    throw error;
  }
}

/**
 * Geocode an address to coordinates
 */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const results = await searchPlace(address, { limit: 1 });

  if (results.length > 0) {
    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
    };
  }

  return null;
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<OSMPlace | null> {
  await respectRateLimit();

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1',
    });

    const url = `${NOMINATIM_API}/reverse?${params}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NomadNavigator/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error(LOG_CATEGORY, `Reverse geocode failed: ${error}`);
    return null;
  }
}

/**
 * Search for POIs using Overpass API
 * This can find restaurants, attractions, etc. with detailed tags
 */
export async function searchPOIs(
  lat: number,
  lng: number,
  radius: number = 1000, // meters
  filters: {
    amenity?: string[]; // restaurant, cafe, hospital, etc.
    tourism?: string[]; // museum, attraction, hotel, etc.
    wheelchair?: boolean;
    vegetarian?: boolean;
    vegan?: boolean;
  } = {}
): Promise<OverpassPOI[]> {
  try {
    // Build Overpass QL query
    let query = `[out:json][timeout:25];(`;

    // Add amenity filters
    if (filters.amenity?.length) {
      filters.amenity.forEach(amenity => {
        query += `node["amenity"="${amenity}"](around:${radius},${lat},${lng});`;
      });
    }

    // Add tourism filters
    if (filters.tourism?.length) {
      filters.tourism.forEach(tourism => {
        query += `node["tourism"="${tourism}"](around:${radius},${lat},${lng});`;
      });
    }

    // Default: search for common POIs
    if (!filters.amenity?.length && !filters.tourism?.length) {
      query += `node["amenity"](around:${radius},${lat},${lng});`;
      query += `node["tourism"](around:${radius},${lat},${lng});`;
    }

    query += ');out body;>;out skel qt;';

    logger.info(LOG_CATEGORY, `Searching POIs near ${lat},${lng}`);

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter results based on additional criteria
    let pois: OverpassPOI[] = data.elements || [];

    // Filter by wheelchair accessibility
    if (filters.wheelchair) {
      pois = pois.filter(poi =>
        poi.tags.wheelchair === 'yes' ||
        poi.tags.wheelchair === 'designated'
      );
    }

    // Filter by dietary options
    if (filters.vegetarian) {
      pois = pois.filter(poi =>
        poi.tags['diet:vegetarian'] === 'yes' ||
        poi.tags['diet:vegetarian'] === 'only'
      );
    }

    if (filters.vegan) {
      pois = pois.filter(poi =>
        poi.tags['diet:vegan'] === 'yes' ||
        poi.tags['diet:vegan'] === 'only'
      );
    }

    logger.info(LOG_CATEGORY, `Found ${pois.length} POIs`);
    return pois;
  } catch (error) {
    logger.error(LOG_CATEGORY, `POI search failed: ${error}`);
    return [];
  }
}

/**
 * Find specific tourist attractions in a city
 */
export async function findTouristAttractions(
  city: string,
  limit: number = 10
): Promise<Array<{
  name: string;
  coordinates: { lat: number; lng: number };
  address: string;
  type: string;
}>> {
  try {
    // First, get city coordinates
    const cityCoords = await geocode(city);
    if (!cityCoords) {
      throw new Error(`City not found: ${city}`);
    }

    // Search for tourist attractions
    const pois = await searchPOIs(
      cityCoords.lat,
      cityCoords.lng,
      5000, // 5km radius
      {
        tourism: ['museum', 'attraction', 'artwork', 'gallery', 'viewpoint'],
      }
    );

    // Map to simplified format
    return pois
      .filter(poi => poi.tags.name) // Must have a name
      .slice(0, limit)
      .map(poi => ({
        name: poi.tags.name || poi.tags['name:en'] || 'Unknown',
        coordinates: { lat: poi.lat, lng: poi.lon },
        address: [
          poi.tags['addr:housenumber'],
          poi.tags['addr:street'],
          poi.tags['addr:city'],
        ].filter(Boolean).join(', ') || 'Address not available',
        type: poi.tags.tourism || poi.tags.amenity || 'attraction',
      }));
  } catch (error) {
    logger.error(LOG_CATEGORY, `Failed to find attractions: ${error}`);
    return [];
  }
}

/**
 * Find restaurants with dietary options
 */
export async function findRestaurants(
  lat: number,
  lng: number,
  options: {
    vegetarian?: boolean;
    vegan?: boolean;
    wheelchair?: boolean;
    cuisine?: string;
  } = {}
): Promise<OverpassPOI[]> {
  const pois = await searchPOIs(lat, lng, 1000, {
    amenity: ['restaurant', 'cafe'],
    ...options,
  });

  // Additional filtering by cuisine if specified
  if (options.cuisine) {
    return pois.filter(poi =>
      poi.tags.cuisine?.toLowerCase().includes(options.cuisine!.toLowerCase())
    );
  }

  return pois;
}

/**
 * Find medical facilities (hospitals, pharmacies, dialysis centers)
 */
export async function findMedicalFacilities(
  lat: number,
  lng: number,
  type: 'hospital' | 'pharmacy' | 'dialysis' | 'doctor' = 'hospital'
): Promise<OverpassPOI[]> {
  const amenityMap = {
    hospital: 'hospital',
    pharmacy: 'pharmacy',
    dialysis: 'dialysis',
    doctor: 'doctors',
  };

  return searchPOIs(lat, lng, 3000, {
    amenity: [amenityMap[type]],
  });
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Optimize route to minimize travel distance (simple TSP solution)
 */
export function optimizeRoute(
  points: Array<{ name: string; lat: number; lng: number }>
): Array<{ name: string; lat: number; lng: number }> {
  if (points.length <= 2) return points;

  const optimized: typeof points = [];
  const remaining = [...points];

  // Start with the first point
  optimized.push(remaining.shift()!);

  // Greedy approach: always go to the nearest unvisited point
  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearestIndex = 0;
    let minDistance = Infinity;

    remaining.forEach((point, index) => {
      const distance = calculateDistance(
        current.lat,
        current.lng,
        point.lat,
        point.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    optimized.push(remaining.splice(nearestIndex, 1)[0]);
  }

  return optimized;
}

/**
 * Format OSM place to friendly format
 */
export function formatPlace(place: OSMPlace) {
  const address = place.address;
  const formattedAddress = [
    address?.house_number,
    address?.road,
    address?.suburb || address?.neighbourhood,
    address?.city,
    address?.country,
  ].filter(Boolean).join(', ');

  return {
    name: place.name || place.display_name.split(',')[0],
    coordinates: {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    },
    address: formattedAddress || place.display_name,
    type: place.type || place.class || 'place',
    wheelchair: place.extratags?.wheelchair,
    website: place.extratags?.website,
    phone: place.extratags?.phone,
    opening_hours: place.extratags?.opening_hours,
  };
}

// Export main service
export const openStreetMap = {
  searchPlace,
  geocode,
  reverseGeocode,
  searchPOIs,
  findTouristAttractions,
  findRestaurants,
  findMedicalFacilities,
  calculateDistance,
  optimizeRoute,
  formatPlace,
};