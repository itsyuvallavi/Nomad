/**
 * Itinerary Combiner Module
 * Combines city itineraries into final format
 */

import { TripMetadata, CityItinerary } from '../types/core.types';

export class ItineraryCombiner {
  /**
   * Combine all city itineraries into final format
   */
  combine(metadata: TripMetadata, cityItineraries: CityItinerary[]) {
    console.log(`📊 [ItineraryCombiner] Combining ${cityItineraries.length} cities`);

    cityItineraries.forEach(city => {
      console.log(`  - ${city.city}: ${city.days.length} days (day ${city.startDay} to ${city.endDay})`);
    });

    const allDays = this.mergeAndSortDays(cityItineraries);
    console.log(`📊 [ItineraryCombiner] Total days after combining: ${allDays.length}`);

    return {
      destination: metadata.destinations.join(', '),
      title: metadata.title,
      itinerary: this.formatDaysForOutput(allDays),
      quickTips: metadata.quickTips || [],
      cost: metadata.estimatedCost
    };
  }

  /**
   * Merge and sort days from all cities
   */
  private mergeAndSortDays(cityItineraries: CityItinerary[]) {
    return cityItineraries
      .flatMap(city => city.days)
      .sort((a, b) => a.day - b.day);
  }

  /**
   * Format days for final output
   */
  private formatDaysForOutput(days: any[]) {
    return days.map(day => ({
      title: day.title || `Day ${day.day} - ${day.city}`,
      day: day.day,
      date: day.date,
      activities: this.formatActivities(day.activities || []),
      weather: day.weather || 'Check local forecast'
    }));
  }

  /**
   * Format activities for output
   */
  private formatActivities(activities: any[]) {
    return activities.map(act => ({
      time: act.time,
      description: act.description,
      category: act.category,
      address: act.address || 'Address not available',
      venue_name: act.venueName,
      rating: undefined,
      _tips: act.tips
    }));
  }
}