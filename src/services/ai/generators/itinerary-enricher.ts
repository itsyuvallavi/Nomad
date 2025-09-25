/**
 * Itinerary Enricher Module
 * Enriches itineraries with real location data from APIs
 */

import { GeneratePersonalizedItineraryOutput, Activity } from '../types/core.types';
import { getCityZones } from '../data/city-zones';
import { herePlacesService } from '@/services/api/places/here-places';
import { logger } from '@/lib/monitoring/logger';

export class ItineraryEnricher {
  /**
   * Enrich itinerary with real location data
   */
  async enrichItinerary(
    itinerary: GeneratePersonalizedItineraryOutput
  ): Promise<GeneratePersonalizedItineraryOutput> {
    if (!itinerary.dailyItineraries) {
      console.log('🤖 [AI] No dailyItineraries to enrich');
      return itinerary;
    }

    const destination = itinerary.destination || '';
    const zones = getCityZones(destination);

    console.log('🤖 [AI] Starting enrichment', {
      destination,
      days: itinerary.dailyItineraries.length,
      hasZones: zones.length > 0,
      firstDayActivities: itinerary.dailyItineraries[0]?.activities?.length || 0
    });

    // Collect activities needing enrichment
    const activitiesToEnrich = this.collectActivitiesToEnrich(itinerary);

    if (activitiesToEnrich.length === 0) {
      console.log('🤖 [AI] No activities need enrichment');
      return itinerary;
    }

    // Enrich with HERE Places
    await this.enrichWithHERE(itinerary, activitiesToEnrich, destination);

    return itinerary;
  }

  /**
   * Collect all activities that need enrichment
   */
  private collectActivitiesToEnrich(
    itinerary: GeneratePersonalizedItineraryOutput
  ): Array<{
    dayIndex: number;
    activityIndex: number;
    activity: Activity;
    searchQuery: string;
  }> {
    const activities: Array<{
      dayIndex: number;
      activityIndex: number;
      activity: Activity;
      searchQuery: string;
    }> = [];

    itinerary.dailyItineraries?.forEach((day, dayIndex) => {
      day.activities?.forEach((activity, activityIndex) => {
        // Always enrich if address is missing or is placeholder
        const needsEnrichment = !activity.address ||
          activity.address === 'Address N/A' ||
          activity.address === 'Address not available' ||
          !activity.coordinates;

        if (needsEnrichment && (activity.venue_name || activity.venue_search || activity.description)) {
          // Use venue_search if available (it's specifically formatted for search)
          // Otherwise use venue_name, falling back to description
          const searchQuery = activity.venue_search ||
            activity.venue_name ||
            this.extractSearchQuery(activity.description || '');

          if (searchQuery && searchQuery.trim()) {
            activities.push({
              dayIndex,
              activityIndex,
              activity,
              searchQuery: searchQuery.trim()
            });
          }
        }
      });
    });

    console.log('🤖 [AI] Activities to enrich:', {
      total: activities.length,
      queries: activities.slice(0, 5).map(a => a.searchQuery)
    });

    return activities;
  }

  /**
   * Enrich with HERE Places API
   */
  private async enrichWithHERE(
    itinerary: GeneratePersonalizedItineraryOutput,
    activitiesToEnrich: Array<{
      dayIndex: number;
      activityIndex: number;
      activity: Activity;
      searchQuery: string;
    }>,
    destination: string
  ): Promise<void> {
    console.log('🤖 [AI] Starting HERE batch search', {
      totalQueries: activitiesToEnrich.length
    });

    const startTime = Date.now();

    try {
      // Prepare search queries - don't add destination if it's already in the query
      const searchQueries = activitiesToEnrich.map(item => {
        // Check if destination is already in the search query
        const queryLower = item.searchQuery.toLowerCase();
        const destLower = destination.toLowerCase();

        // Only add destination if it's not already included
        const finalQuery = queryLower.includes(destLower)
          ? item.searchQuery
          : `${item.searchQuery} ${destination}`;

        return { query: finalQuery };
      });

      // Batch search
      const resultsMap = await herePlacesService.batchSearchPlaces(searchQueries);

      console.log('🤖 [AI] HERE search complete', {
        resultsFound: Array.from(resultsMap.values()).filter(r => r && r.length > 0).length,
        time: `${Date.now() - startTime}ms`,
        sampleResults: Array.from(resultsMap.entries()).slice(0, 3).map(([q, r]) => ({
          query: q,
          found: r?.length || 0
        }))
      });

      // Apply results
      let enrichedCount = 0;
      activitiesToEnrich.forEach((item) => {
        const queryLower = item.searchQuery.toLowerCase();
        const destLower = destination.toLowerCase();
        const finalQuery = queryLower.includes(destLower)
          ? item.searchQuery
          : `${item.searchQuery} ${destination}`;

        const searchResult = resultsMap.get(finalQuery);
        if (searchResult && searchResult.length > 0) {
          const place = searchResult[0];
          const activity = itinerary.dailyItineraries![item.dayIndex].activities![item.activityIndex];

          // Always update venue name if we found a place
          if (place.name) {
            activity.venue_name = place.name;
          }

          // Always update coordinates if available
          if (place.position) {
            activity.coordinates = {
              lat: place.position.lat,
              lng: place.position.lng
            };
          }

          // Always update address if available
          if (place.address && place.address.label) {
            activity.address = place.address.label;
            console.log('🤖 [AI] Updated address for', item.searchQuery, '→', place.address.label);
          }

          if (place.categories && place.categories.length > 0) {
            // Map HERE category to our category enum
            const categoryName = place.categories[0].name.toLowerCase();
            if (categoryName.includes('food') || categoryName.includes('restaurant')) {
              activity.category = 'Food';
            } else if (categoryName.includes('hotel') || categoryName.includes('accommodation')) {
              activity.category = 'Accommodation';
            } else if (categoryName.includes('museum') || categoryName.includes('attraction')) {
              activity.category = 'Attraction';
            } else {
              activity.category = 'Leisure';
            }
          }

          if (place.rating) {
            activity.rating = place.rating;
          }

          enrichedCount++;
        } else {
          // Fallback: If no search result found, at least remove the placeholder
          const activity = itinerary.dailyItineraries![item.dayIndex].activities![item.activityIndex];
          if (activity.address === 'Address N/A' || activity.address === 'Address not available') {
            // For debugging: set a test address to see if it appears
            activity.address = `Near ${destination} city center`;
            console.log('🤖 [AI] No result for', item.searchQuery, '- using fallback address');
          }
        }
      });

      console.log('🤖 [AI] Enrichment complete', {
        total: activitiesToEnrich.length,
        enriched: enrichedCount
      });

    } catch (error) {
      logger.error('API', 'HERE enrichment failed', { error });
      console.log('⚠️  Enrichment failed, continuing without location data');
    }
  }

  /**
   * Extract search query from description
   */
  private extractSearchQuery(description: string): string {
    // Remove common words
    const stopWords = [
      'visit', 'explore', 'see', 'tour', 'head',
      'to', 'the', 'at', 'in', 'go', 'enjoy',
      'experience', 'discover', 'check', 'out',
      'stop', 'by', 'walk', 'through', 'around'
    ];

    const words = description.toLowerCase().split(/\s+/);
    const filtered = words.filter(word =>
      !stopWords.includes(word) && word.length > 2
    );

    // Return up to 3 key words
    return filtered.slice(0, 3).join(' ');
  }

  /**
   * Enrich with weather data (optional)
   */
  async enrichWithWeather(
    itinerary: GeneratePersonalizedItineraryOutput
  ): Promise<GeneratePersonalizedItineraryOutput> {
    // This could be implemented to add weather forecasts
    // Currently just a placeholder
    logger.debug('AI', 'Weather enrichment not implemented');
    return itinerary;
  }

  /**
   * Enrich with images (optional)
   */
  async enrichWithImages(
    itinerary: GeneratePersonalizedItineraryOutput
  ): Promise<GeneratePersonalizedItineraryOutput> {
    // This could be implemented to add images for destinations
    // Currently just a placeholder
    logger.debug('AI', 'Image enrichment not implemented');
    return itinerary;
  }
}