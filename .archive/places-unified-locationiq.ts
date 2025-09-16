/**
 * Unified Places API - Uses ONLY LocationIQ for dynamic place data
 * No static data, no hardcoded venues - everything from LocationIQ API
 */

import { logger } from '@/lib/monitoring/logger';
import { locationIQ, formatPlace, searchNearby } from './locationiq';

const LOG_CATEGORY = 'API' as const;

export interface UnifiedActivity {
  description: string;
  category: string;
  venue_name: string;
  address: string;
  rating?: number;
  tips?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  price_level?: number;
  website?: string;
  phone?: string;
  hours?: string;
  photo?: string;
  source: 'locationiq';
}

/**
 * Map activity categories to LocationIQ search terms
 */
const CATEGORY_TO_LOCATIONIQ: Record<string, string> = {
  'restaurant': 'restaurant',
  'food': 'restaurant cafe',
  'cafe': 'cafe coffee',
  'tourist_attraction': 'tourism attraction monument',
  'attraction': 'tourism museum gallery',
  'museum': 'museum',
  'park': 'park garden',
  'shopping_mall': 'shopping mall',
  'shopping': 'shop store',
  'art_gallery': 'gallery art',
  'leisure': 'leisure entertainment',
  'entertainment': 'cinema theatre nightclub',
  'hotel': 'hotel accommodation',
  'bar': 'bar pub',
  'nightlife': 'nightclub bar pub'
};

/**
 * Get activities for a destination using ONLY LocationIQ
 * @param destination - City name or location
 * @param category - Category of activities to search for
 * @param count - Number of activities to return
 */
export async function getUnifiedActivities(
  destination: string,
  category?: string,
  count: number = 5
): Promise<UnifiedActivity[]> {
  try {
    logger.info(LOG_CATEGORY, `Getting activities for ${destination} - ${category || 'all'}`);

    // First, geocode the destination to get coordinates
    const cityCoords = await locationIQ.geocodeAddress(destination);

    if (!cityCoords) {
      logger.warn(LOG_CATEGORY, `Could not geocode destination: ${destination}`);
      return [];
    }

    // Determine search query based on category
    const searchQuery = category
      ? CATEGORY_TO_LOCATIONIQ[category.toLowerCase()] || category
      : 'restaurant cafe museum attraction park';

    // Search for places near the destination
    const places = await searchNearby(
      cityCoords.lat,
      cityCoords.lng,
      searchQuery,
      5000 // 5km radius
    );

    if (!places || places.length === 0) {
      logger.warn(LOG_CATEGORY, `No places found for ${destination} - ${category}`);

      // Try a broader search
      const broaderPlaces = await locationIQ.searchPlaces({
        query: `${searchQuery} ${destination}`,
        limit: count * 2
      });

      if (!broaderPlaces || broaderPlaces.length === 0) {
        return [];
      }

      // Convert to UnifiedActivity format
      return broaderPlaces.slice(0, count).map(place => {
        const formatted = formatPlace(place);
        return convertLocationIQToActivity(formatted, category || 'general');
      });
    }

    // Convert LocationIQ places to UnifiedActivity format
    const activities = places.slice(0, count).map(place => {
      const formatted = formatPlace(place);
      return convertLocationIQToActivity(formatted, category || 'general');
    });

    logger.info(LOG_CATEGORY, `Found ${activities.length} activities from LocationIQ`);
    return activities;

  } catch (error) {
    logger.error(LOG_CATEGORY, `Failed to get activities: ${error}`);
    return [];
  }
}

/**
 * Convert LocationIQ place to UnifiedActivity format
 */
function convertLocationIQToActivity(place: any, category: string): UnifiedActivity {
  // Generate appropriate description based on category
  const descriptions: Record<string, string> = {
    'restaurant': `Dine at ${place.name}`,
    'food': `Enjoy a meal at ${place.name}`,
    'cafe': `Coffee break at ${place.name}`,
    'attraction': `Visit ${place.name}`,
    'museum': `Explore ${place.name}`,
    'park': `Relax at ${place.name}`,
    'shopping': `Shop at ${place.name}`,
    'entertainment': `Entertainment at ${place.name}`,
    'hotel': `Stay at ${place.name}`,
    'bar': `Drinks at ${place.name}`,
    'nightlife': `Night out at ${place.name}`
  };

  const description = descriptions[category.toLowerCase()] || `Visit ${place.name}`;

  return {
    description,
    category: category.charAt(0).toUpperCase() + category.slice(1),
    venue_name: place.name,
    address: place.address,
    coordinates: place.coordinates,
    website: place.details?.website,
    phone: place.details?.phone,
    hours: place.details?.opening_hours,
    tips: place.details?.cuisine || 'Check current hours and availability',
    source: 'locationiq'
  };
}

/**
 * Search for specific activities using LocationIQ
 */
export async function searchActivities(
  query: string,
  destination: string,
  count: number = 5
): Promise<UnifiedActivity[]> {
  try {
    logger.info(LOG_CATEGORY, `Searching for "${query}" in ${destination}`);

    // Search with LocationIQ
    const places = await locationIQ.searchPlaces({
      query: `${query} ${destination}`,
      limit: count * 2 // Get extra to filter
    });

    if (!places || places.length === 0) {
      logger.warn(LOG_CATEGORY, `No results for "${query}" in ${destination}`);
      return [];
    }

    // Convert to UnifiedActivity format
    const activities = places.slice(0, count).map(place => {
      const formatted = formatPlace(place);

      // Try to determine category from the query
      let category = 'general';
      for (const [cat, terms] of Object.entries(CATEGORY_TO_LOCATIONIQ)) {
        if (query.toLowerCase().includes(cat) || terms.includes(query.toLowerCase())) {
          category = cat;
          break;
        }
      }

      return convertLocationIQToActivity(formatted, category);
    });

    return activities;

  } catch (error) {
    logger.error(LOG_CATEGORY, `Search failed: ${error}`);
    return [];
  }
}

/**
 * Get random diverse activities for a destination
 */
export async function getRandomActivities(
  destination: string,
  count: number = 5
): Promise<UnifiedActivity[]> {
  const categories = ['restaurant', 'attraction', 'cafe', 'park', 'shopping'];
  const activities: UnifiedActivity[] = [];

  // Get 1-2 activities from each category
  for (const category of categories) {
    const categoryCount = Math.ceil(count / categories.length);
    const categoryActivities = await getUnifiedActivities(
      destination,
      category,
      categoryCount
    );

    activities.push(...categoryActivities);

    if (activities.length >= count) {
      break;
    }
  }

  // Shuffle and return requested count
  return activities
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

/**
 * Check if LocationIQ is configured and working
 */
export function isLocationIQConfigured(): boolean {
  return locationIQ.isConfigured();
}

// Export main interface matching the old API
export {
  getUnifiedActivities as getActivities,
  searchActivities as searchPlaces,
  getRandomActivities as getRandomStaticActivities,
  isLocationIQConfigured as hasStaticData
};

// Default export for compatibility
export default {
  getActivities: getUnifiedActivities,
  searchPlaces: searchActivities,
  getRandomActivities: getRandomActivities,
  isConfigured: isLocationIQConfigured
};