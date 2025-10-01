/**
 * Itinerary Validator Module
 * Validates and fixes itinerary structure
 * Ensures consistency and completeness
 */

import {
  GeneratePersonalizedItineraryOutput,
  DailyItinerary,
  convertLegacyItinerary
} from '../types/core.types';
import { TripParams } from '../trip-generator';
import { logger } from '@/lib/monitoring/logger';
import { safeJsonParse } from '../utils/validation.utils';
import { calculateDate, calculateEndDate } from '../utils/date.utils';

export class ItineraryValidator {
  /**
   * Parse JSON safely with error handling
   */
  parseJSONSafely(content: string): any | null {
    try {
      return JSON.parse(content);
    } catch (error) {
      // Try to fix common JSON issues
      try {
        // Remove any markdown code blocks
        let cleaned = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '');

        // Fix common issues
        cleaned = cleaned
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys

        return JSON.parse(cleaned);
      } catch (secondError) {
        logger.error('AI', 'Failed to parse JSON', {
          error: secondError,
          sample: content.slice(0, 200)
        });
        return null;
      }
    }
  }

  /**
   * Ensure itinerary has proper structure
   */
  ensureItineraryStructure(
    data: any,
    params: TripParams
  ): GeneratePersonalizedItineraryOutput {
    // Convert legacy format if needed
    const converted = convertLegacyItinerary(data);

    const itinerary: GeneratePersonalizedItineraryOutput = {
      destination: converted.destination || params.destination,
      startDate: converted.startDate || params.startDate,
      endDate: converted.endDate || calculateEndDate(params.startDate, params.duration),
      duration: converted.duration || params.duration,
      travelers: converted.travelers || params.travelers || { adults: 1, children: 0 },
      dailyItineraries: converted.dailyItineraries || [],
      accommodation: converted.accommodation || {
        name: 'Recommended Hotel',
        type: 'hotel',
        location: params.destination,
        priceRange: params.budget || 'medium'
      },
      estimatedCost: converted.estimatedCost,
      transportationOptions: converted.transportationOptions || [],
      weatherConsideration: converted.weatherConsideration || 'Check forecast before departure',
      localTips: converted.localTips || converted.quickTips || [],
      totalCost: converted.totalCost
    };

    // Ensure each day has proper structure
    if (itinerary.dailyItineraries) {
      itinerary.dailyItineraries = itinerary.dailyItineraries.map((day, index) => ({
        ...day,
        dayNumber: day.dayNumber || index + 1,
        date: day.date || calculateDate(params.startDate, index),
        activities: day.activities || [],
        meals: day.meals || {}
      }));
    }

    return itinerary;
  }

  /**
   * Validate and fix any issues in the itinerary
   */
  validateAndFixItinerary(
    itinerary: GeneratePersonalizedItineraryOutput
  ): GeneratePersonalizedItineraryOutput {
    // Ensure we have the right number of days
    if (itinerary.dailyItineraries && itinerary.duration) {
      const expectedDays = itinerary.duration;
      const actualDays = itinerary.dailyItineraries.length;

      if (actualDays < expectedDays) {
        // Add missing days
        for (let i = actualDays; i < expectedDays; i++) {
          itinerary.dailyItineraries.push({
            dayNumber: i + 1,
            date: calculateDate(itinerary.startDate!, i),
            activities: [],
            meals: {}
          });
        }
        logger.debug('AI', 'Added missing days to itinerary', {
          added: expectedDays - actualDays
        });
      } else if (actualDays > expectedDays) {
        // Trim extra days
        itinerary.dailyItineraries = itinerary.dailyItineraries.slice(0, expectedDays);
        logger.debug('AI', 'Trimmed extra days from itinerary', {
          removed: actualDays - expectedDays
        });
      }
    }

    // Ensure dates are correct
    if (itinerary.dailyItineraries && itinerary.startDate) {
      itinerary.dailyItineraries.forEach((day, index) => {
        day.date = calculateDate(itinerary.startDate!, index);
        day.dayNumber = index + 1;
      });
    }

    // Validate activities
    if (itinerary.dailyItineraries) {
      itinerary.dailyItineraries.forEach(day => {
        // Ensure each day has at least some activities
        if (!day.activities || day.activities.length === 0) {
          logger.warn('AI', 'Day has no activities', {
            dayNumber: day.dayNumber
          });
        }

        // Validate each activity
        day.activities = day.activities.map(activity => ({
          ...activity,
          description: activity.description || 'Activity',
          category: activity.category || 'Leisure'
        }));
      });
    }

    return itinerary;
  }


  /**
   * Count total activities in itinerary
   */
  countActivities(itinerary: GeneratePersonalizedItineraryOutput): number {
    if (!itinerary.dailyItineraries) return 0;

    return itinerary.dailyItineraries.reduce((total, day) => {
      return total + (day.activities?.length || 0);
    }, 0);
  }

  /**
   * Validate trip parameters
   */
  validateParams(params: TripParams): void {
    if (!params.destination || !params.startDate || !params.duration) {
      throw new Error('Missing required parameters: destination, startDate, and duration are required');
    }

    // Validate date format
    if (!params.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    // Validate duration
    if (params.duration < 1 || params.duration > 365) {
      throw new Error('Duration must be between 1 and 365 days');
    }

    // Validate budget if provided
    if (params.budget && !['budget', 'medium', 'luxury'].includes(params.budget)) {
      logger.warn('AI', 'Invalid budget value, using medium', {
        provided: params.budget
      });
    }
  }
}