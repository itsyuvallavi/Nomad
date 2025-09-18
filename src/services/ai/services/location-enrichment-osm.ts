/**
 * Location Enrichment Service using OpenStreetMap
 * Free alternative to LocationIQ using Nominatim and Overpass API
 */

import { openStreetMap } from '@/services/api/openstreetmap';
import { cityZones, findZoneForVenue } from '@/lib/constants/city-zones';
import { routeOptimizer, validateRouteEfficiency } from '@/services/ai/utils/route-optimizer';
import { optimizeDayActivities, calculateDayDistance } from '@/services/ai/utils/zone-based-planner';
import { logger } from '@/lib/monitoring/logger';

const LOG_CATEGORY = 'API' as const;
import type { GeneratePersonalizedItineraryOutput, Itinerary, Day, Activity } from '@/services/ai/schemas';

// Country code mapping for major cities and neighborhoods
const CITY_COUNTRY_MAP: Record<string, string> = {
  // Neighborhoods and districts
  'Gothic Quarter': 'ES',  // Barcelona
  'El Born': 'ES',         // Barcelona
  'Barceloneta': 'ES',     // Barcelona
  'Eixample': 'ES',        // Barcelona
  'Shibuya': 'JP',         // Tokyo
  'Harajuku': 'JP',        // Tokyo
  'Shinjuku': 'JP',        // Tokyo
  'Ginza': 'JP',           // Tokyo
  'Asakusa': 'JP',         // Tokyo
  'Montmartre': 'FR',      // Paris
  'Marais': 'FR',          // Paris
  'Latin Quarter': 'FR',   // Paris
  'Soho': 'GB',            // London
  'Covent Garden': 'GB',   // London
  'Shoreditch': 'GB',      // London
  'Manhattan': 'US',       // New York
  'Brooklyn': 'US',        // New York
  // Europe
  'Barcelona': 'ES',
  'Madrid': 'ES',
  'Valencia': 'ES',
  'Seville': 'ES',
  'Paris': 'FR',
  'Lyon': 'FR',
  'Marseille': 'FR',
  'Nice': 'FR',
  'London': 'GB',
  'Edinburgh': 'GB',
  'Manchester': 'GB',
  'Liverpool': 'GB',
  'Rome': 'IT',
  'Milan': 'IT',
  'Venice': 'IT',
  'Florence': 'IT',
  'Naples': 'IT',
  'Berlin': 'DE',
  'Munich': 'DE',
  'Hamburg': 'DE',
  'Frankfurt': 'DE',
  'Amsterdam': 'NL',
  'Rotterdam': 'NL',
  'Brussels': 'BE',
  'Vienna': 'AT',
  'Prague': 'CZ',
  'Budapest': 'HU',
  'Warsaw': 'PL',
  'Krakow': 'PL',
  'Copenhagen': 'DK',
  'Stockholm': 'SE',
  'Oslo': 'NO',
  'Helsinki': 'FI',
  'Dublin': 'IE',
  'Lisbon': 'PT',
  'Porto': 'PT',
  'Athens': 'GR',
  'Istanbul': 'TR',
  'Moscow': 'RU',
  'St Petersburg': 'RU',
  'Zurich': 'CH',
  'Geneva': 'CH',
  // Asia
  'Tokyo': 'JP',
  'Osaka': 'JP',
  'Kyoto': 'JP',
  'Seoul': 'KR',
  'Beijing': 'CN',
  'Shanghai': 'CN',
  'Hong Kong': 'HK',
  'Singapore': 'SG',
  'Bangkok': 'TH',
  'Phuket': 'TH',
  'Bali': 'ID',
  'Jakarta': 'ID',
  'Kuala Lumpur': 'MY',
  'Manila': 'PH',
  'New Delhi': 'IN',
  'Mumbai': 'IN',
  'Bangalore': 'IN',
  'Dubai': 'AE',
  'Abu Dhabi': 'AE',
  'Tel Aviv': 'IL',
  'Jerusalem': 'IL',
  // Americas
  'New York': 'US',
  'Los Angeles': 'US',
  'San Francisco': 'US',
  'Chicago': 'US',
  'Boston': 'US',
  'Miami': 'US',
  'Las Vegas': 'US',
  'Seattle': 'US',
  'Washington': 'US',
  'Washington DC': 'US',
  'San Diego': 'US',
  'Austin': 'US',
  'Portland': 'US',
  'Toronto': 'CA',
  'Vancouver': 'CA',
  'Montreal': 'CA',
  'Mexico City': 'MX',
  'Cancun': 'MX',
  'Buenos Aires': 'AR',
  'Rio de Janeiro': 'BR',
  'Sao Paulo': 'BR',
  'Lima': 'PE',
  'Santiago': 'CL',
  'Bogota': 'CO',
  // Oceania
  'Sydney': 'AU',
  'Melbourne': 'AU',
  'Brisbane': 'AU',
  'Perth': 'AU',
  'Auckland': 'NZ',
  'Wellington': 'NZ',
  'Queenstown': 'NZ',
  // Africa
  'Cairo': 'EG',
  'Cape Town': 'ZA',
  'Johannesburg': 'ZA',
  'Marrakech': 'MA',
  'Casablanca': 'MA',
  'Nairobi': 'KE',
  'Lagos': 'NG',
  'Accra': 'GH',
};

// Maximum distance from city center (in km) to consider a venue valid
const MAX_DISTANCE_FROM_CITY = 50;

/**
 * Get country code for a city
 */
function getCountryCode(city: string): string | undefined {
  // Try exact match first
  if (CITY_COUNTRY_MAP[city]) {
    return CITY_COUNTRY_MAP[city];
  }

  // Try case-insensitive match
  const cityLower = city.toLowerCase();
  for (const [mapCity, code] of Object.entries(CITY_COUNTRY_MAP)) {
    if (mapCity.toLowerCase() === cityLower) {
      return code;
    }
  }

  // Try partial match for cities with common variations
  for (const [mapCity, code] of Object.entries(CITY_COUNTRY_MAP)) {
    if (cityLower.includes(mapCity.toLowerCase()) ||
        mapCity.toLowerCase().includes(cityLower)) {
      return code;
    }
  }

  logger.warn(LOG_CATEGORY, `No country code found for city: ${city}. Search may be less accurate.`);
  return undefined;
}

interface EnrichmentOptions {
  useOSM?: boolean;
  optimizeRoutes?: boolean;
  maxPlacesPerActivity?: number;
}

/**
 * Enrich an AI-generated itinerary with real place data from OpenStreetMap
 */
export async function enrichItineraryWithOSM(
  itinerary: GeneratePersonalizedItineraryOutput | Itinerary,
  options: EnrichmentOptions = { useOSM: true, optimizeRoutes: true }
): Promise<GeneratePersonalizedItineraryOutput | Itinerary> {
  if (!options.useOSM) {
    logger.warn(LOG_CATEGORY, 'OSM enrichment disabled');
    return itinerary;
  }

  logger.info(LOG_CATEGORY, 'Enriching itinerary with OpenStreetMap place data...');

  try {
    // Process each day
    const enrichedDays = await Promise.all(
      itinerary.itinerary.map(async (day, dayIndex) => {
        // Get destination from day data
        const destination = extractDestination(day);
        if (!destination) {
          logger.warn(LOG_CATEGORY, `No destination found for day ${day.day}`);
          return {
            ...day,
            _destination: itinerary.destination || 'Unknown'
          } as Day & { _destination: string };
        }

        // Geocode the destination city
        const cityCoords = await openStreetMap.geocode(destination);
        if (!cityCoords) {
          logger.warn(LOG_CATEGORY, `Could not geocode destination: ${destination}`);
          return {
            ...day,
            _destination: destination
          } as Day & { _destination: string };
        }

        logger.info(LOG_CATEGORY, `Processing day ${day.day} in ${destination}`);

        // Get zone recommendations for this day
        const zones = cityZones.getZoneRecommendations(destination, dayIndex + 1);

        // Enrich each activity with OSM data
        const enrichedActivities = await Promise.all(
          day.activities.map(async (activity, index) => {
            const venueName = extractVenueName(activity);

            // Build search query with context
            const searchQuery = buildSearchQuery(venueName, destination, activity.category);

            // Get country code for better search accuracy
            const countryCode = getCountryCode(destination);

            // Search for the venue using OSM with country constraint
            const searchResults = await openStreetMap.searchPlace(searchQuery, {
              limit: 5,
              city: destination,
              country: countryCode,
            });

            let validResults: typeof searchResults = [];
            if (searchResults && searchResults.length > 0) {
              // Validate results are in the correct city
              validResults = searchResults.filter(place => {
                const placeCoords = {
                  lat: parseFloat(place.lat),
                  lng: parseFloat(place.lon)
                };
                const distance = openStreetMap.calculateDistance(
                  cityCoords.lat,
                  cityCoords.lng,
                  placeCoords.lat,
                  placeCoords.lng
                );
                // Check if venue is within reasonable distance from city center
                if (distance > MAX_DISTANCE_FROM_CITY) {
                  logger.warn(LOG_CATEGORY,
                    `Venue "${place.name || place.display_name}" is ${distance.toFixed(1)}km from ${destination} center, rejecting`);
                  return false;
                }
                return true;
              });

              if (validResults.length > 0) {
                const place = validResults[0];
                const formatted = openStreetMap.formatPlace(place);

              // Check for special needs (accessibility, dietary, medical)
              const specialData = await enrichSpecialNeeds(
                formatted.coordinates,
                activity,
                destination
              );

              return {
                ...activity,
                venue_name: formatted.name,
                address: formatted.address,
                coordinates: formatted.coordinates,
                website: formatted.website,
                phone: formatted.phone,
                opening_hours: formatted.opening_hours,
                wheelchair: formatted.wheelchair,
                ...specialData,
                _osm_place_id: place.place_id,
                _zone: findZoneForVenue(destination, formatted.name)?.name,
              } as Activity & {
                venue_name: string;
                coordinates: { lat: number; lng: number };
                _osm_place_id: number;
                _zone?: string;
              };
              } else {
                logger.warn(LOG_CATEGORY,
                  `All search results for "${venueName}" were too far from ${destination}, using fallback`);
                // Fall through to category search
              }
            }

            // If we get here, either no results or all were too far
            if (!searchResults || searchResults.length === 0 ||
                (searchResults.length > 0 && validResults.length === 0)) {
              // Fallback: try category search near city center
              logger.warn(LOG_CATEGORY, `Using category search fallback for: ${venueName}`);

              // Search for venues by category using Overpass
              const categoryVenues = await searchByCategory(
                cityCoords,
                activity.category || 'tourist_attraction'
              );

              if (categoryVenues.length > 0) {
                const venue = categoryVenues[0];
                return {
                  ...activity,
                  venue_name: venue.name || venueName,
                  address: venue.address || `${destination}`,
                  coordinates: venue.coordinates,
                  _approximateLocation: true,
                  _zone: zones?.[0]?.name,
                } as Activity & {
                  venue_name: string;
                  coordinates: { lat: number; lng: number };
                  _approximateLocation?: boolean;
                  _zone?: string;
                };
              }

              // Ultimate fallback: use city coordinates
              return {
                ...activity,
                venue_name: venueName,
                coordinates: cityCoords,
                _approximateLocation: true,
                _zone: zones?.[0]?.name,
              } as Activity & {
                venue_name: string;
                coordinates: { lat: number; lng: number };
                _approximateLocation?: boolean;
                _zone?: string;
              };
            }
          })
        );

        // Apply route optimization if enabled
        let optimizedActivities = enrichedActivities;
        if (options.optimizeRoutes) {
          // First apply zone-based grouping
          const zoneOptimized = optimizeDayActivities(destination, enrichedActivities as any);
          const dayDistance = calculateDayDistance(zoneOptimized as any);

          logger.info(LOG_CATEGORY, `Day ${day.day} zone optimization:`, {
            destination,
            originalOrder: enrichedActivities.filter(a => a).map(a => extractVenueName(a as Activity)),
            optimizedOrder: zoneOptimized.filter(a => a).map(a => extractVenueName(a as Activity)),
            totalDistance: `${dayDistance.toFixed(2)} km`
          });

          // Then optimize route using OSM's distance calculation
          const activitiesWithLocation = enrichedActivities
            .filter(a => a && (a as any).coordinates)
            .map(a => ({
              name: extractVenueName(a as Activity),
              lat: (a as any).coordinates.lat,
              lng: (a as any).coordinates.lng,
            }));

          const optimizedRoute = openStreetMap.optimizeRoute(activitiesWithLocation);

          // Reorder activities based on optimization
          optimizedActivities = optimizedRoute
            .map(opt => {
              const original = enrichedActivities.find(a =>
                extractVenueName(a as Activity) === opt.name
              );
              return original;
            })
            .filter((a): a is typeof enrichedActivities[0] => a !== undefined);

          // Calculate total distance
          let totalDistance = 0;
          for (let i = 0; i < optimizedRoute.length - 1; i++) {
            totalDistance += openStreetMap.calculateDistance(
              optimizedRoute[i].lat,
              optimizedRoute[i].lng,
              optimizedRoute[i + 1].lat,
              optimizedRoute[i + 1].lng
            );
          }

          // Add route metadata
          (day as any)._routeInfo = {
            totalDistance,
            optimized: true,
            originalOrder: enrichedActivities.filter(a => a).map(a => extractVenueName(a as Activity)),
            optimizedOrder: optimizedActivities.filter(a => a).map(a => extractVenueName(a as Activity)),
          };
        }

        return {
          ...day,
          activities: optimizedActivities,
          _destination: destination,
          _coordinates: cityCoords,
          _zones: zones?.map(z => z.name),
        } as Day & {
          _destination: string;
          _coordinates: { lat: number; lng: number };
          _zones?: string[];
        };
      })
    );

    return {
      ...itinerary,
      itinerary: enrichedDays,
      _enrichedWithOSM: true,
      _routesOptimized: options.optimizeRoutes,
    } as typeof itinerary & {
      _enrichedWithOSM: boolean;
      _routesOptimized?: boolean;
    };
  } catch (error) {
    logger.error(LOG_CATEGORY, 'Error enriching itinerary with OSM:', error);
    return itinerary; // Return original if enrichment fails
  }
}

/**
 * Build optimized search query for OSM
 */
function buildSearchQuery(venueName: string, city: string, category?: string): string {
  // Remove generic terms that might confuse search
  const cleanVenue = venueName
    .replace(/venue|place|location|spot/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Don't add city if venue name already includes it
  if (cleanVenue.toLowerCase().includes(city.toLowerCase())) {
    return cleanVenue;
  }

  // Add city context for better results
  return `${cleanVenue} ${city}`;
}

/**
 * Search by category using Overpass API
 */
async function searchByCategory(
  cityCoords: { lat: number; lng: number },
  category: string
): Promise<Array<{ name: string; coordinates: { lat: number; lng: number }; address: string }>> {
  // Map AI categories to OSM amenity/tourism tags
  const categoryMap: Record<string, { amenity?: string[]; tourism?: string[] }> = {
    'Sightseeing': { tourism: ['attraction', 'museum', 'viewpoint'] },
    'Dining': { amenity: ['restaurant', 'cafe'] },
    'Shopping': { amenity: ['marketplace', 'shop'] },
    'Entertainment': { amenity: ['theatre', 'cinema', 'nightclub'] },
    'Culture': { tourism: ['museum', 'gallery', 'artwork'] },
    'Relaxation': { amenity: ['spa'], tourism: ['park'] },
    'Nightlife': { amenity: ['bar', 'pub', 'nightclub'] },
    'Adventure': { tourism: ['attraction'] },
    'Food': { amenity: ['restaurant', 'cafe', 'fast_food'] },
    'Accommodation': { tourism: ['hotel', 'guest_house'] },
  };

  const searchConfig = categoryMap[category] || { tourism: ['attraction'] };

  const pois = await openStreetMap.searchPOIs(
    cityCoords.lat,
    cityCoords.lng,
    2000, // 2km radius
    searchConfig
  );

  return pois
    .filter(poi => poi.tags.name) // Must have a name
    .slice(0, 5) // Top 5 results
    .map(poi => ({
      name: poi.tags.name || 'Unknown',
      coordinates: { lat: poi.lat, lng: poi.lon },
      address: formatPOIAddress(poi),
    }));
}

/**
 * Format POI address from tags
 */
function formatPOIAddress(poi: any): string {
  const parts = [
    poi.tags['addr:housenumber'],
    poi.tags['addr:street'],
    poi.tags['addr:city'],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

/**
 * Enrich with special needs data (accessibility, dietary, medical)
 */
async function enrichSpecialNeeds(
  coordinates: { lat: number; lng: number },
  activity: Activity,
  city: string
): Promise<any> {
  const specialData: any = {};

  // Check for dietary restrictions in restaurants
  if (activity.category === 'Food') {
    const restaurants = await openStreetMap.findRestaurants(
      coordinates.lat,
      coordinates.lng,
      {
        vegetarian: true,
        vegan: true,
      }
    );

    if (restaurants.length > 0) {
      specialData.dietary_options = {
        vegetarian: restaurants.some(r => r.tags['diet:vegetarian'] === 'yes'),
        vegan: restaurants.some(r => r.tags['diet:vegan'] === 'yes'),
      };
    }
  }

  // Check for medical facilities if mentioned
  const description = (activity.description || '').toLowerCase();
  if (description.includes('medical') || description.includes('hospital') ||
      description.includes('dialysis') || description.includes('pharmacy')) {
    const medicalType = description.includes('dialysis') ? 'dialysis' :
                       description.includes('pharmacy') ? 'pharmacy' : 'hospital';

    const facilities = await openStreetMap.findMedicalFacilities(
      coordinates.lat,
      coordinates.lng,
      medicalType as any
    );

    if (facilities.length > 0) {
      specialData.nearby_medical = facilities.slice(0, 3).map(f => ({
        name: f.tags.name || `${medicalType} facility`,
        distance: openStreetMap.calculateDistance(
          coordinates.lat,
          coordinates.lng,
          f.lat,
          f.lon
        ),
        phone: f.tags.phone,
      }));
    }
  }

  return specialData;
}

/**
 * Extract destination from day data
 */
function extractDestination(day: any): string {
  // Try various fields that might contain the destination
  // Check for destination_city first (used in multi-city trips)
  if ('destination_city' in day && day.destination_city) {
    let dest = day.destination_city as string;
    // Handle compound destinations like "Shibuya and Harajuku"
    if (dest.includes(' and ')) {
      // Take the first part for geocoding
      dest = dest.split(' and ')[0].trim();
    }
    return dest;
  }
  if ('destination' in day && day.destination) {
    let dest = day.destination as string;
    // Handle compound destinations
    if (dest.includes(' and ')) {
      dest = dest.split(' and ')[0].trim();
    }
    return dest;
  }
  if ('_destination' in day && day._destination) {
    return day._destination as string;
  }
  // Check for city field directly
  if ('city' in day && day.city) {
    return day.city as string;
  }
  // Check for nested location fields
  if (day.location) {
    if (typeof day.location === 'string') {
      return day.location;
    } else if (typeof day.location === 'object') {
      if (day.location.city) return day.location.city;
      if (day.location.name) return day.location.name;
    }
  }
  if (day.title) {
    // Extract city from titles like "Day 1: Exploring Paris" or "Day 1 in Paris"
    const match = day.title.match(/(?:in|at|exploring|discovering)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (match) {
      let dest = match[1];
      // Handle compound destinations in titles
      if (dest.includes(' and ')) {
        dest = dest.split(' and ')[0].trim();
      }
      return dest;
    }
  }
  // Fallback: try to extract from first activity
  if (day.activities && day.activities.length > 0) {
    const firstActivity = day.activities[0];
    // Check if activity has location/city info
    if (firstActivity.location) return firstActivity.location;
    if (firstActivity.city) return firstActivity.city;
    if (firstActivity.address) {
      const parts = firstActivity.address.split(',');
      return parts[parts.length - 2]?.trim() || parts[parts.length - 1]?.trim() || '';
    }
  }
  return '';
}

/**
 * Extract venue name from activity
 */
function extractVenueName(activity: Activity | undefined | null): string {
  if (!activity) {
    return 'Unknown';
  }
  // Check if activity already has a venue_name field
  if ('venue_name' in activity && activity.venue_name) {
    return activity.venue_name as string;
  }

  // Try to extract from description
  const description = activity.description || '';

  // Look for patterns like "Visit the Louvre Museum" or "Lunch at Café de Flore"
  const patterns = [
    /(?:visit|explore|see|tour)\s+(?:the\s+)?([A-Z][^,\.\n]+)/i,
    /(?:breakfast|lunch|dinner|meal|eat)\s+(?:at\s+)?([A-Z][^,\.\n]+)/i,
    /(?:shop|shopping)\s+(?:at\s+)?([A-Z][^,\.\n]+)/i,
    /^([A-Z][^:,\.\n]+)(?:\s*[-:]\s*)/,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: use category as a hint
  return `${activity.category} venue`;
}

/**
 * Search for specific places using OSM
 */
export async function searchSpecificPlaces(
  query: string,
  location: { lat: number; lng: number },
  category?: string
): Promise<any[]> {
  const pois = await openStreetMap.searchPOIs(
    location.lat,
    location.lng,
    5000, // 5km radius
    category ? { amenity: [category] } : {}
  );

  return pois.map(poi => ({
    id: poi.id,
    name: poi.tags.name || 'Unknown',
    address: formatPOIAddress(poi),
    coordinates: { lat: poi.lat, lng: poi.lon },
    type: poi.tags.amenity || poi.tags.tourism || 'place',
    distance: openStreetMap.calculateDistance(
      location.lat,
      location.lng,
      poi.lat,
      poi.lon
    ),
    wheelchair: poi.tags.wheelchair,
    opening_hours: poi.tags.opening_hours,
    website: poi.tags.website,
    phone: poi.tags.phone,
  }));
}

/**
 * Get nearby recommendations using Overpass API
 */
export async function getNearbyRecommendations(
  location: { lat: number; lng: number },
  categories: string[] = ['restaurant', 'cafe', 'museum']
): Promise<Map<string, any[]>> {
  const recommendations = new Map<string, any[]>();

  for (const category of categories) {
    const places = await searchSpecificPlaces(category, location, category);
    recommendations.set(category, places.slice(0, 3)); // Top 3 per category
  }

  return recommendations;
}

// Export the service
export const locationEnrichmentServiceOSM = {
  enrichItineraryWithOSM,
  searchSpecificPlaces,
  getNearbyRecommendations,
};

export default locationEnrichmentServiceOSM;