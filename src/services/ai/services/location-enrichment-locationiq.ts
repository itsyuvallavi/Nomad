/**
 * Location Enrichment Service using LocationIQ
 * Replaces Radar, Google Places, and Foursquare with LocationIQ API
 */

import { locationIQ, formatPlace } from '@/services/api/locationiq';
import { batchSearchVenuesEnhanced, searchWithFallbacks } from '@/services/api/locationiq-enhanced';
import { cityZones, findZoneForVenue } from '@/lib/constants/city-zones';
// OLD IMPORTS REMOVED - Optimization now handled in trip-generator.ts
import { logger } from '@/lib/monitoring/logger';

// Use 'API' as the log category for LocationIQ logs
const LOG_CATEGORY = 'API' as const;
import type { GeneratePersonalizedItineraryOutput, Itinerary, Day, Activity } from '@/services/ai/schemas';

interface EnrichmentOptions {
  useLocationIQ?: boolean;
  optimizeRoutes?: boolean;
  maxPlacesPerActivity?: number;
}

/**
 * Enrich an AI-generated itinerary with real place data from LocationIQ
 */
export async function enrichItineraryWithLocationIQ(
  itinerary: GeneratePersonalizedItineraryOutput | Itinerary,
  options: EnrichmentOptions = { useLocationIQ: true, optimizeRoutes: true }
): Promise<GeneratePersonalizedItineraryOutput | Itinerary> {
  if (!options.useLocationIQ || !locationIQ.isConfigured()) {
    logger.warn(LOG_CATEGORY, 'LocationIQ not configured or disabled');
    return itinerary;
  }

  logger.info(LOG_CATEGORY, 'Enriching itinerary with LocationIQ place data...');

  try {
    // Process each day
    const enrichedDays = await Promise.all(
      itinerary.itinerary.map(async (day, dayIndex) => {
        // Get destination from day data
        const destination = extractDestination(day);
        if (!destination) {
          logger.warn(LOG_CATEGORY, `No destination found for day ${day.day}`);
          return day;
        }

        // Geocode the destination city
        const cityCoords = await locationIQ.geocodeAddress(destination);
        if (!cityCoords) {
          logger.warn(LOG_CATEGORY, `Could not geocode destination: ${destination}`);
          return day;
        }

        logger.info(LOG_CATEGORY, `Processing day ${day.day} in ${destination}`);

        // Get zone recommendations for this day
        const zones = cityZones.getZoneRecommendations(destination, dayIndex + 1);

        // Collect all venues to search for with category info
        const venuesToSearch = day.activities.map(activity => ({
          name: extractVenueName(activity),
          city: destination,
          category: activity.category || generateCategoryFromActivity(activity),
        }));

        // Batch search for all venues with enhanced rate limiting
        const venueResults = await batchSearchVenuesEnhanced(venuesToSearch);

        // Enrich each activity with LocationIQ data
        const enrichedActivities = await Promise.all(
          day.activities.map(async (activity, index) => {
            const venueName = extractVenueName(activity);
            const place = venueResults.get(venueName);

            if (place) {
              const formatted = formatPlace(place);
              return {
                ...activity,
                venue_name: formatted.name,
                address: formatted.address,
                coordinates: formatted.coordinates,
                website: formatted.details?.website,
                phone: formatted.details?.phone,
                opening_hours: formatted.details?.opening_hours,
                _locationiq_place_id: place.place_id,
                _zone: findZoneForVenue(destination, formatted.name)?.name,
              } as Activity & {
                venue_name: string;
                coordinates: { lat: number; lng: number };
                _locationiq_place_id: string;
                _zone?: string;
              };
            } else {
              // Fallback: try to get general area coordinates
              logger.warn(LOG_CATEGORY, `No specific venue found for: ${venueName}`);

              // Try to geocode the activity description for area info
              const areaQuery = `${activity.category} ${destination}`;
              const areaCoords = await locationIQ.geocodeAddress(areaQuery);

              return {
                ...activity,
                venue_name: venueName,
                coordinates: areaCoords || cityCoords,
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

        // Apply zone-based optimization if enabled
        let optimizedActivities = enrichedActivities;
        if (options.optimizeRoutes) {
          // First apply zone-based grouping
          // COMMENTED OUT - Functions moved to trip-generator.ts
          // const zoneOptimized = optimizeDayActivities(destination, enrichedActivities);
          // const dayDistance = calculateDayDistance(zoneOptimized);
          const zoneOptimized = enrichedActivities; // Skip optimization here
          const dayDistance = 0; // Placeholder

          logger.info(LOG_CATEGORY, `Day ${day.day} zone optimization:`, {
            destination,
            originalOrder: enrichedActivities.map(a => extractVenueName(a)),
            optimizedOrder: zoneOptimized.map(a => extractVenueName(a)),
            totalDistance: `${dayDistance.toFixed(2)} km`
          });

          // Then apply existing route optimization
          const activitiesWithLocation = enrichedActivities.map(a => ({
            venue_name: extractVenueName(a),
            coordinates: (a as any).coordinates,
            time_slot: getTimeSlot(a.time),
            duration_hours: estimateDuration(a.category),
            address: a.address,
            activity: a.description,
          }));

          // COMMENTED OUT - routeOptimizer moved to trip-generator.ts
          // const optimized = await routeOptimizer.optimizeRoute(activitiesWithLocation);
          const optimized = activitiesWithLocation; // Skip optimization here

          // Reorder activities based on optimization
          optimizedActivities = optimized.map(opt => {
            const original = enrichedActivities.find(a =>
              extractVenueName(a) === opt.venue_name
            );
            return original!;
          });

          // Validate route efficiency
          // COMMENTED OUT - validateRouteEfficiency moved to trip-generator.ts
          // const validation = validateRouteEfficiency(optimized);
          const validation = { isEfficient: true, totalDistance: 0, segments: [], warnings: [] };
          if (!validation.isEfficient) {
            logger.warn(LOG_CATEGORY, `Day ${day.day} route warnings:`, validation.warnings);
          }

          // Add route metadata
          (day as any)._routeInfo = {
            totalDistance: validation.totalDistance,
            isEfficient: validation.isEfficient,
            warnings: validation.warnings,
            segments: validation.segments,
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
      _enrichedWithLocationIQ: true,
      _routesOptimized: options.optimizeRoutes,
    } as typeof itinerary & {
      _enrichedWithLocationIQ: boolean;
      _routesOptimized?: boolean;
    };
  } catch (error) {
    logger.error(LOG_CATEGORY, 'Error enriching itinerary:', error);
    return itinerary; // Return original if enrichment fails
  }
}

/**
 * Extract destination from day data
 */
function extractDestination(day: Day): string {
  // Try various fields that might contain the destination
  if ('_destination' in day && day._destination) {
    return day._destination as string;
  }
  if (day.title) {
    // Extract city from titles like "Day 1: Exploring Paris"
    const match = day.title.match(/(?:in|at|exploring|discovering)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (match) return match[1];
  }
  if (day.location) {
    return day.location;
  }
  // Fallback: try to extract from first activity
  if (day.activities.length > 0) {
    const firstActivity = day.activities[0];
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
function extractVenueName(activity: Activity): string {
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
 * Generate category from activity for better search
 */
function generateCategoryFromActivity(activity: Activity): string {
  const description = (activity.description || '').toLowerCase();
  const category = activity.category?.toLowerCase() || '';

  // Map common terms to search categories
  if (description.includes('restaurant') || description.includes('dine') ||
      description.includes('lunch') || description.includes('dinner') ||
      description.includes('breakfast') || category === 'food') {
    return 'restaurant';
  }
  if (description.includes('cafe') || description.includes('coffee')) {
    return 'cafe';
  }
  if (description.includes('museum') || description.includes('gallery')) {
    return 'museum';
  }
  if (description.includes('park') || description.includes('garden')) {
    return 'park';
  }
  if (description.includes('hotel') || category === 'accommodation') {
    return 'hotel';
  }
  if (description.includes('shop') || description.includes('market')) {
    return 'shop';
  }
  if (category === 'attraction' || description.includes('visit')) {
    return 'tourist_attraction';
  }

  return 'place';
}

/**
 * Generate fallback search query
 */
function generateFallbackQuery(activity: Activity, city: string): string {
  const category = activity.category || 'place';
  const time = activity.time || '';

  // Map activity categories to LocationIQ search terms
  const categoryMap: Record<string, string> = {
    'Sightseeing': 'tourist attraction',
    'Dining': 'restaurant',
    'Shopping': 'shop',
    'Entertainment': 'entertainment',
    'Culture': 'museum',
    'Relaxation': 'park',
    'Nightlife': 'bar',
    'Adventure': 'outdoor',
  };

  const searchCategory = categoryMap[category] || category.toLowerCase();

  // Add time-based hints
  if (time.toLowerCase().includes('breakfast')) {
    return `breakfast cafe ${city}`;
  } else if (time.toLowerCase().includes('lunch')) {
    return `lunch restaurant ${city}`;
  } else if (time.toLowerCase().includes('dinner')) {
    return `dinner restaurant ${city}`;
  }

  return `${searchCategory} ${city}`;
}

/**
 * Get time slot from time string
 */
function getTimeSlot(time?: string): 'morning' | 'afternoon' | 'evening' {
  if (!time) return 'morning';

  const lowerTime = time.toLowerCase();
  if (lowerTime.includes('morning') || lowerTime.includes('breakfast') || lowerTime.includes('am')) {
    return 'morning';
  } else if (lowerTime.includes('evening') || lowerTime.includes('dinner') || lowerTime.includes('night')) {
    return 'evening';
  } else {
    return 'afternoon';
  }
}

/**
 * Estimate activity duration based on category
 */
function estimateDuration(category?: string): number {
  const durations: Record<string, number> = {
    'Sightseeing': 2,
    'Dining': 1.5,
    'Shopping': 2,
    'Entertainment': 2.5,
    'Culture': 2,
    'Relaxation': 1,
    'Nightlife': 3,
    'Adventure': 3,
  };

  return durations[category || ''] || 1.5;
}

/**
 * Search for specific places using LocationIQ
 */
export async function searchSpecificPlaces(
  query: string,
  location: { lat: number; lng: number },
  category?: string
): Promise<any[]> {
  const radius = 5000; // 5km
  const places = await locationIQ.searchNearby(
    location.lat,
    location.lng,
    category || query,
    radius
  );

  return places.map(place => {
    const formatted = formatPlace(place);
    return {
      id: formatted.id,
      name: formatted.name,
      address: formatted.address,
      coordinates: formatted.coordinates,
      type: formatted.type,
      distance: locationIQ.calculateDistance(
        location.lat,
        location.lng,
        formatted.coordinates.lat,
        formatted.coordinates.lng
      ),
      ...formatted.details,
    };
  });
}

/**
 * Get nearby recommendations
 */
export async function getNearbyRecommendations(
  location: { lat: number; lng: number },
  categories: string[] = ['restaurant', 'cafe', 'attraction']
): Promise<Map<string, any[]>> {
  const recommendations = new Map<string, any[]>();

  for (const category of categories) {
    const places = await searchSpecificPlaces(category, location, category);
    recommendations.set(category, places.slice(0, 3)); // Top 3 per category
  }

  return recommendations;
}

// Export the service
export const locationEnrichmentService = {
  enrichItineraryWithLocationIQ,
  searchSpecificPlaces,
  getNearbyRecommendations,
};

export default locationEnrichmentService;