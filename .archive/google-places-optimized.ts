/**
 * Google Places API - Cost Optimized Version
 * Minimizes API calls to reduce costs while maintaining functionality
 */

import { logger } from '@/lib/logger';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Cache for place searches to avoid duplicate API calls
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Search for a place with heavy caching and minimal fields
 * Only requests essential fields to reduce cost
 */
export async function searchPlaceMinimal(params: {
  query: string;
  location?: { lat: number; lng: number };
  type?: string;
}) {
  if (!GOOGLE_API_KEY) {
    logger.warn('API', 'Google API key not configured');
    return null;
  }

  // Check cache first
  const cacheKey = JSON.stringify(params);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.info('API', 'Using cached Google Places result');
    return cached.data;
  }

  try {
    const searchParams = new URLSearchParams({
      key: GOOGLE_API_KEY,
      query: params.query,
      // Only request essential fields to minimize cost
      fields: 'name,formatted_address,geometry,rating,price_level',
      inputtype: 'textquery',
    });

    if (params.location) {
      searchParams.append('location', `${params.location.lat},${params.location.lng}`);
      searchParams.append('radius', '10000'); // 10km radius
    }

    const response = await fetch(
      `${PLACES_API_URL}/findplacefromtext/json?${searchParams}`
    );

    if (!response.ok) {
      logger.error('API', 'Google Places search failed', { status: response.status });
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'ZERO_RESULTS') {
      logger.info('API', 'No results found for place search');
      return null;
    }

    if (data.status !== 'OK') {
      logger.error('API', `Google Places API error: ${data.status}`, data);
      return null;
    }

    // Cache the result
    searchCache.set(cacheKey, { data: data.candidates?.[0], timestamp: Date.now() });
    
    logger.info('API', 'Google Places search successful (minimal fields)');
    return data.candidates?.[0];
  } catch (error) {
    logger.error('API', 'Google Places search error', error);
    return null;
  }
}

/**
 * Get basic place details - only when absolutely necessary
 * Uses minimal fields to reduce cost
 */
export async function getPlaceDetailsMinimal(placeId: string) {
  if (!GOOGLE_API_KEY) {
    return null;
  }

  // Check cache
  const cacheKey = `details_${placeId}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.info('API', 'Using cached place details');
    return cached.data;
  }

  try {
    const searchParams = new URLSearchParams({
      key: GOOGLE_API_KEY,
      place_id: placeId,
      // Absolute minimum fields only
      fields: 'name,formatted_address,geometry,rating,website,formatted_phone_number',
    });

    const response = await fetch(
      `${PLACES_API_URL}/details/json?${searchParams}`
    );

    if (!response.ok) {
      logger.error('API', 'Place details request failed');
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      logger.error('API', `Place details error: ${data.status}`);
      return null;
    }

    // Cache the result
    searchCache.set(cacheKey, { data: data.result, timestamp: Date.now() });
    
    logger.info('API', 'Place details retrieved (minimal fields)');
    return data.result;
  } catch (error) {
    logger.error('API', 'Place details error', error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses at once to reduce API calls
 * Uses Google's Geocoding API which is cheaper than Places
 */
export async function batchGeocode(addresses: string[]) {
  if (!GOOGLE_API_KEY || addresses.length === 0) {
    return [];
  }

  const results = [];
  
  // Process in batches to avoid rate limits
  for (const address of addresses.slice(0, 5)) { // Limit to 5 addresses
    try {
      const searchParams = new URLSearchParams({
        key: GOOGLE_API_KEY,
        address: address,
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${searchParams}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results?.[0]) {
          results.push({
            address,
            location: data.results[0].geometry.location,
            formattedAddress: data.results[0].formatted_address,
          });
        }
      }
    } catch (error) {
      logger.error('API', `Geocoding failed for ${address}`, error);
    }
  }

  logger.info('API', `Geocoded ${results.length} addresses`);
  return results;
}

/**
 * Search nearby places with strict limits
 * Only use when absolutely necessary
 */
export async function searchNearbyMinimal(params: {
  location: { lat: number; lng: number };
  type: string;
  maxResults?: number;
}) {
  if (!GOOGLE_API_KEY) {
    return [];
  }

  const cacheKey = `nearby_${params.location.lat}_${params.location.lng}_${params.type}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.info('API', 'Using cached nearby search');
    return cached.data;
  }

  try {
    const searchParams = new URLSearchParams({
      key: GOOGLE_API_KEY,
      location: `${params.location.lat},${params.location.lng}`,
      radius: '5000', // 5km radius
      type: params.type,
      fields: 'name,vicinity,geometry,rating', // Minimal fields
    });

    const response = await fetch(
      `${PLACES_API_URL}/nearbysearch/json?${searchParams}`
    );

    if (!response.ok) {
      logger.error('API', 'Nearby search failed');
      return [];
    }

    const data = await response.json();
    
    // Limit results to save on potential detail lookups
    const results = data.results?.slice(0, params.maxResults || 3) || [];
    
    // Cache the results
    searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
    
    logger.info('API', `Found ${results.length} nearby places (limited)`);
    return results;
  } catch (error) {
    logger.error('API', 'Nearby search error', error);
    return [];
  }
}

/**
 * Clear old cache entries to prevent memory issues
 */
export function clearOldCache() {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
  logger.info('API', `Cache cleaned, ${searchCache.size} entries remaining`);
}

// Clean cache every hour
if (typeof window !== 'undefined') {
  setInterval(clearOldCache, 1000 * 60 * 60);
}