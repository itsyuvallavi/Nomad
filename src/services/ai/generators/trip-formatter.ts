/**
 * Trip Formatter Module
 * Handles formatting and conversion of trip data between different formats
 * Ensures backward compatibility with legacy formats
 */

import { getNextDate } from '../utils/date.utils';
import {
  TripMetadata,
  CityItinerary,
  DayPlan,
  Activity,
  GeneratePersonalizedItineraryOutput,
  GenerationParams
} from '../types/core.types';

export interface LegacyActivity {
  time: string;
  description: string;
  venue_name: string;
  category: string;
  address: string;
  rating?: number;
  _tips?: string[];
}

export interface LegacyDayPlan {
  day: number;
  date: string;
  title: string;
  activities: LegacyActivity[];
  weather: string;
}

export class TripFormatter {
  /**
   * Combine city itineraries into a structured format
   */
  combineIntoStructuredFormat(
    metadata: TripMetadata,
    cityItineraries: CityItinerary[],
    params: GenerationParams
  ): GeneratePersonalizedItineraryOutput {
    // Flatten all days from all cities
    const allDays: DayPlan[] = [];
    for (const cityIt of cityItineraries) {
      allDays.push(...cityIt.days);
    }

    // Convert to standard format
    const dailyItineraries = this.formatDailyItineraries(allDays);

    // Create legacy format for backward compatibility
    const legacyItinerary = this.formatLegacyItinerary(allDays);

    // Calculate end date
    const endDate = getNextDate(params.startDate, params.duration - 1);

    return {
      destination: params.destinations.join(', '),
      title: metadata.title,
      duration: params.duration,
      startDate: params.startDate,
      endDate: endDate,
      dailyItineraries,
      itinerary: legacyItinerary, // Legacy format for UI compatibility
      estimatedCost: metadata.estimatedCost,
      travelTips: metadata.quickTips,
      photoUrl: metadata.photoUrl,
      quickTips: metadata.quickTips, // Add for UI compatibility
      cost: metadata.estimatedCost // Add for UI compatibility
    } as any;
  }

  /**
   * Format daily itineraries in standard format
   */
  private formatDailyItineraries(allDays: DayPlan[]) {
    return allDays.map(day => ({
      dayNumber: day.day,
      date: day.date,
      title: day.title || `Day ${day.day} - ${day.city}`,
      activities: this.formatActivities(day.activities),
      weather: day.weather || 'Check local forecast'
    }));
  }

  /**
   * Format activities with all necessary fields
   */
  private formatActivities(activities: Activity[]) {
    return activities.map((act: any) => ({
      time: act.time,
      description: act.description,
      venue_name: act.venueName || act.venue_name,
      venue_search: act.venue_search,
      category: act.category,
      address: act.address,
      coordinates: act.coordinates,
      neighborhood: act.neighborhood,
      zone: act.zone,
      rating: act.rating,
      tips: act.tips
    }));
  }

  /**
   * Format itinerary in legacy format for backward compatibility
   */
  private formatLegacyItinerary(allDays: DayPlan[]): LegacyDayPlan[] {
    return allDays.map(day => ({
      day: day.day,
      date: day.date,
      title: day.title || `Day ${day.day} - ${day.city}`,
      activities: this.formatLegacyActivities(day.activities),
      weather: day.weather || 'Check local forecast'
    }));
  }

  /**
   * Format activities in legacy format
   */
  private formatLegacyActivities(activities: Activity[]): LegacyActivity[] {
    return activities.map((act: any) => ({
      time: act.time,
      description: act.description,
      venue_name: act.venueName || act.venue_name,
      category: act.category,
      address: act.address || 'Address not available',
      rating: act.rating,
      _tips: act.tips
    }));
  }

  /**
   * Convert traditional params to progressive params
   */
  convertToProgressiveParams(params: any): GenerationParams {
    const destinations = params.destination
      ? params.destination.split(',').map((d: string) => d.trim())
      : ['Unknown'];

    return {
      destinations,
      duration: params.duration,
      startDate: params.startDate,
      preferences: {
        budget: params.budget || params.preferences?.budget,
        interests: params.interests || params.preferences?.interests,
        pace: params.preferences?.pace,
        mustSee: params.preferences?.mustSee,
        avoid: params.preferences?.avoid
      },
      travelers: params.travelers,
      onProgress: params.onProgress
    };
  }

  /**
   * Convert progressive params to traditional trip params
   */
  convertToTripParams(params: GenerationParams): any {
    return {
      destination: params.destinations.join(', '),
      startDate: params.startDate,
      duration: params.duration,
      travelers: params.travelers,
      preferences: params.preferences,
      budget: params.preferences?.budget
    };
  }

  /**
   * Format progress update for client
   */
  formatProgressUpdate(type: string, data?: any, progress?: number): any {
    return {
      type,
      timestamp: new Date().toISOString(),
      progress: progress || 0,
      data,
      message: this.getProgressMessage(type, data)
    };
  }

  /**
   * Get human-readable progress message
   */
  private getProgressMessage(type: string, data?: any): string {
    switch (type) {
      case 'metadata':
        return 'Analyzing trip requirements...';
      case 'city_complete':
        return `Generated itinerary for ${data?.city || 'city'}`;
      case 'routes_optimized':
        return 'Optimized daily routes for efficiency';
      case 'enrichment_complete':
        return 'Added location details and recommendations';
      case 'costs_complete':
        return 'Calculated cost estimates';
      case 'complete':
        return 'Trip planning complete!';
      default:
        return 'Processing...';
    }
  }

  /**
   * Validate and clean itinerary format
   */
  validateFormat(itinerary: any): GeneratePersonalizedItineraryOutput {
    // Ensure all required fields exist
    if (!itinerary.destination) {
      throw new Error('Missing destination in itinerary');
    }

    if (!itinerary.dailyItineraries || !Array.isArray(itinerary.dailyItineraries)) {
      throw new Error('Missing or invalid dailyItineraries');
    }

    if (!itinerary.startDate || !itinerary.duration) {
      throw new Error('Missing date information');
    }

    // Clean and validate each day
    const cleanedDailyItineraries = itinerary.dailyItineraries.map((day: any, index: number) => ({
      dayNumber: day.dayNumber || index + 1,
      date: day.date || getNextDate(itinerary.startDate, index),
      title: day.title || `Day ${index + 1}`,
      activities: Array.isArray(day.activities) ? day.activities : [],
      weather: day.weather || 'Check local forecast'
    }));

    return {
      ...itinerary,
      dailyItineraries: cleanedDailyItineraries,
      endDate: itinerary.endDate || getNextDate(itinerary.startDate, itinerary.duration - 1)
    };
  }
}