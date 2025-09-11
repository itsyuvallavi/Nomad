/**
 * Foursquare Places API integration for venue data
 * Free alternative to Google Places API for activities and venues
 */

import { logger } from '@/lib/logger';

// Foursquare Places API configuration
const FOURSQUARE_BASE_URL = 'https://places-api.foursquare.com/places';

// Lazy load API key to ensure env vars are loaded
function getFoursquareApiKey(): string | undefined {
  return process.env.FOURSQUARE_API_KEY;
}

export interface FoursquareVenue {
  fsq_id: string;
  name: string;
  categories: Array<{
    id: number;
    name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  location: {
    address?: string;
    formatted_address: string;
    country: string;
    locality?: string;
    region?: string;
    postcode?: string;
  };
  geocodes: {
    main: {
      latitude: number;
      longitude: number;
    };
  };
  rating?: number;
  price?: number; // 1-4 scale
  hours?: {
    display?: string;
    is_local_holiday?: boolean;
    open_now?: boolean;
  };
  website?: string;
  tel?: string;
  photos?: Array<{
    id: string;
    prefix: string;
    suffix: string;
    width: number;
    height: number;
  }>;
  popularity?: number;
  verified?: boolean;
  description?: string;
  tips?: Array<{
    text: string;
    created_at: string;
  }>;
}

// Category mappings for common activity types
const CATEGORY_MAPPINGS: Record<string, string> = {
  'restaurant': '13000', // Food category
  'attraction': '10000,12000,16000', // Arts & Entertainment, Shopping, Landmarks
  'hotel': '19014', // Hotels
  'accommodation': '19014', // Hotels
  'cafe': '13034,13035', // Café and Coffee Shop
  'bar': '13003', // Bar
  'nightlife': '13003,10032', // Bar and Nightclub
  'museum': '10027', // Museum
  'park': '16032', // Park
  'shopping': '17000', // Retail
  'entertainment': '10000', // Arts & Entertainment
  'outdoor': '16000,18000', // Landmarks & Outdoors, Recreation
};

/**
 * Search for places using Foursquare API
 */
export async function searchFoursquarePlaces(
  query: string,
  near: string,
  categories?: string,
  limit: number = 20
): Promise<FoursquareVenue[]> {
  const apiKey = getFoursquareApiKey();
  
  if (!apiKey) {
    logger.warn('Foursquare API', 'No API key found, returning empty results');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      near,
      limit: limit.toString(),
      fields: 'fsq_id,name,categories,location,geocodes,rating,price,hours,website,tel,photos,popularity,verified,description,tips'
    });

    if (categories) {
      params.append('categories', categories);
    }

    const response = await fetch(`${FOURSQUARE_BASE_URL}/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Foursquare API', `Search failed: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    logger.error('Foursquare API', `Search error: ${error}`);
    return [];
  }
}

/**
 * Get activities by category for a destination
 */
export async function getFoursquareActivities(
  destination: string,
  category: string,
  limit: number = 10
): Promise<FoursquareVenue[]> {
  const categoryIds = CATEGORY_MAPPINGS[category.toLowerCase()] || '';
  
  // If no specific category mapping, search with the category as query
  if (!categoryIds) {
    return searchFoursquarePlaces(category, destination, undefined, limit);
  }

  return searchFoursquarePlaces('', destination, categoryIds, limit);
}

/**
 * Get venue details by Foursquare ID
 */
export async function getFoursquareVenueDetails(fsqId: string): Promise<FoursquareVenue | null> {
  const apiKey = getFoursquareApiKey();
  
  if (!apiKey) {
    logger.warn('Foursquare API', 'No API key found');
    return null;
  }

  try {
    const response = await fetch(`${FOURSQUARE_BASE_URL}/${fsqId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17'
      }
    });

    if (!response.ok) {
      logger.error('Foursquare API', `Details fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('Foursquare API', `Details fetch error: ${error}`);
    return null;
  }
}

/**
 * Get venue photos
 */
export async function getFoursquareVenuePhotos(fsqId: string, limit: number = 5): Promise<any[]> {
  const apiKey = getFoursquareApiKey();
  
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(`${FOURSQUARE_BASE_URL}/${fsqId}/photos?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17'
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    logger.error('Foursquare API', `Photos fetch error: ${error}`);
    return [];
  }
}

/**
 * Convert Foursquare venue to a format compatible with our activity structure
 */
export function convertFoursquareToActivity(venue: FoursquareVenue) {
  return {
    description: venue.name,
    category: venue.categories?.[0]?.name || 'Activity',
    venue_name: venue.name,
    address: venue.location?.formatted_address || venue.location?.address || '',
    rating: venue.rating || 0,
    tips: venue.tips?.[0]?.text || venue.description || '',
    coordinates: venue.geocodes?.main ? {
      lat: venue.geocodes.main.latitude,
      lng: venue.geocodes.main.longitude
    } : undefined,
    price_level: venue.price,
    website: venue.website,
    phone: venue.tel,
    hours: venue.hours?.display,
    photo: venue.photos?.[0] ? 
      `${venue.photos[0].prefix}300x300${venue.photos[0].suffix}` : undefined
  };
}

/**
 * Test Foursquare API connection
 */
export async function testFoursquareConnection(): Promise<boolean> {
  const apiKey = getFoursquareApiKey();
  
  if (!apiKey) {
    logger.error('Foursquare API', 'No API key configured');
    return false;
  }

  try {
    // Test with a simple search for restaurants in London
    const venues = await searchFoursquarePlaces('restaurant', 'London', CATEGORY_MAPPINGS.restaurant, 1);
    
    if (venues.length > 0) {
      logger.info('Foursquare API', 'Connection test successful');
      return true;
    } else {
      logger.warn('Foursquare API', 'Connection test returned no results');
      return false;
    }
  } catch (error) {
    logger.error('Foursquare API', `Connection test failed: ${error}`);
    return false;
  }
}