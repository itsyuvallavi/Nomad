/**
 * Google Places API integration for real venue data
 * Uses Google Maps API to find real restaurants, attractions, and accommodations
 */

import { logger } from '@/lib/logger';

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_API_KEY;
const PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

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
    logger.info('PLACES', 'Searching Google Places', { query, location, type });
    
    // First, geocode the location to get coordinates
    const geocodeUrl = `${PLACES_BASE_URL}/textsearch/json?query=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
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
      `&key=${GOOGLE_MAPS_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
      logger.error('PLACES', 'Google Places API error', { status: searchData.status });
      return [];
    }
    
    const places = searchData.results || [];
    logger.info('PLACES', `Found ${places.length} places`, { query, location });
    
    return places.slice(0, 10); // Return top 10 results
  } catch (error) {
    logger.error('PLACES', 'Failed to search places', { error });
    return [];
  }
}

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
  try {
    const detailsUrl = `${PLACES_BASE_URL}/details/json?` +
      `place_id=${placeId}` +
      `&fields=name,formatted_address,rating,price_level,types,geometry,opening_hours,website,formatted_phone_number,user_ratings_total,photos` +
      `&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(detailsUrl);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      logger.error('PLACES', 'Failed to get place details', { status: data.status });
      return null;
    }
    
    return data.result;
  } catch (error) {
    logger.error('PLACES', 'Failed to get place details', { error });
    return null;
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