/**
 * Google Places API integration for real venue data
 * Uses Google Maps API to find real restaurants, attractions, and accommodations
 */

import { logger } from '@/lib/logger';

// Google Maps API configuration
const PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Lazy load API key to ensure env vars are loaded
function getGoogleApiKey(): string | undefined {
  return process.env.GOOGLE_API_KEY;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  price_level?: number; // 0-4 scale
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  website?: string;
  formatted_phone_number?: string;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

/**
 * Search for places in a specific location
 */
export async function searchGooglePlaces(
  query: string,
  location: string,
  type?: string
): Promise<GooglePlace[]> {
  try {
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      if (typeof window !== 'undefined') {
        console.warn('📍 Google Places API key not configured');
      }
      logger.error('PLACES', 'Google API key not configured');
      return [];
    }
    
    if (typeof window !== 'undefined') {
      console.log(`📍 Searching Google Places: "${query}" in ${location}${type ? ` (type: ${type})` : ''}`);
    }
    logger.info('PLACES', 'Searching Google Places', { query, location, type });
    
    // First, geocode the location to get coordinates
    const geocodeUrl = `${PLACES_BASE_URL}/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      if (typeof window !== 'undefined') {
        console.warn(`📍 Location not found: ${location}`);
      }
      logger.warn('PLACES', 'Location not found', { location });
      return [];
    }
    
    const { lat, lng } = geocodeData.results[0].geometry.location;
    
    // Now search for places nearby
    const searchQuery = `${query} in ${location}`;
    const searchUrl = `${PLACES_BASE_URL}/textsearch/json?` + 
      `query=${encodeURIComponent(searchQuery)}` +
      `&location=${lat},${lng}` +
      `&radius=5000` + // 5km radius
      (type ? `&type=${type}` : '') +
      `&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
      logger.error('PLACES', 'Google Places API error', { status: searchData.status });
      return [];
    }
    
    const places = searchData.results || [];
    
    if (typeof window !== 'undefined') {
      console.log(`📍 Found ${places.length} places for "${query}" in ${location}`);
    }
    logger.info('PLACES', `Found ${places.length} places`, { query, location });
    
    return places.slice(0, 10); // Return top 10 results
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.error('📍 Google Places search failed:', error);
    }
    logger.error('PLACES', 'Failed to search places', { error });
    return [];
  }
}


/**
 * Find real venues for itinerary activities
 */
export async function findRealVenues(
  destination: string,
  category: 'restaurant' | 'tourist_attraction' | 'lodging' | 'museum' | 'park',
  count: number = 3
): Promise<Array<{ name: string; address: string; rating?: number }>> {
  const typeMap = {
    'restaurant': 'restaurant',
    'tourist_attraction': 'tourist_attraction',
    'lodging': 'lodging',
    'museum': 'museum',
    'park': 'park'
  };
  
  const places = await searchGooglePlaces(
    category === 'restaurant' ? 'best restaurants' : `top ${category}`,
    destination,
    typeMap[category]
  );
  
  return places.slice(0, count).map(place => ({
    name: place.name,
    address: place.formatted_address,
    rating: place.rating
  }));
}