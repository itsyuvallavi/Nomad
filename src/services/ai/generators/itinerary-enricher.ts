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
    if (!itinerary.dailyItineraries) return itinerary;

    const destination = itinerary.destination || '';
    const zones = getCityZones(destination);

    console.log('🤖 [AI] Starting enrichment', {
      destination,
      days: itinerary.dailyItineraries.length,
      hasZones: zones.length > 0
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
        if (!activity.coordinates && (activity.venue_name || activity.description)) {
          const searchQuery = this.extractSearchQuery(
            activity.venue_name || activity.description
          );

          activities.push({
            dayIndex,
            activityIndex,
            activity,
            searchQuery
          });
        }
      });
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
      // Prepare search queries
      const searchQueries = activitiesToEnrich.map(item => ({
        query: `${item.searchQuery} ${destination}`
      }));

      // Batch search
      const resultsMap = await herePlacesService.batchSearchPlaces(searchQueries);

      console.log('🤖 [AI] HERE search complete', {
        resultsFound: Array.from(resultsMap.values()).filter(r => r && r.length > 0).length,
        time: `${Date.now() - startTime}ms`
      });

      // Apply results
      let enrichedCount = 0;
      activitiesToEnrich.forEach((item, index) => {
        const query = `${item.searchQuery} ${destination}`;
        const searchResult = resultsMap.get(query);
        if (searchResult && searchResult.length > 0) {
          const place = searchResult[0];
          const activity = itinerary.dailyItineraries![item.dayIndex].activities![item.activityIndex];

          // Update activity with real data
          if (!activity.venue_name && place.name) {
            activity.venue_name = place.name;
          }

          if (place.coordinates) {
            activity.coordinates = place.coordinates;
          }

          if (place.address) {
            activity.address = place.address;
          }

          if (place.category) {
            activity.category = place.category;
          }

          if (place.rating) {
            activity.rating = place.rating;
          }

          enrichedCount++;
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