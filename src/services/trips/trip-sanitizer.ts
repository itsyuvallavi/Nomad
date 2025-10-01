/**
 * Trip Data Sanitizer
 * Handles cleaning and validating trip data before storage
 */

import { logger } from '@/lib/monitoring/logger';

export class TripSanitizer {
  /**
   * Clean any object for Firestore storage
   * Removes undefined, functions, and problematic values
   */
  static cleanForFirestore(obj: any): any {
    if (obj === undefined || obj === null) return null;
    if (obj instanceof Date) return obj;
    if (typeof obj === 'function') return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj
        .map(item => this.cleanForFirestore(item))
        .filter(item => item !== null);
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanValue = this.cleanForFirestore(value);
      if (cleanValue !== null && cleanValue !== undefined) {
        cleaned[key] = cleanValue;
      }
    }

    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }

  /**
   * Extract title from various sources
   */
  static extractTitle(input: any): string {
    // Try to extract title from various sources
    if (input.title) return input.title;

    if (input.destination) {
      const duration = input.duration || 3;
      return `${input.destination} - ${duration} days`;
    }

    if (input.itinerary?.title) {
      return input.itinerary.title;
    }

    if (input.itinerary?.destination) {
      const duration = input.itinerary.duration || 3;
      return `${input.itinerary.destination} - ${duration} days`;
    }

    if (input.prompt) {
      // Extract destination from prompt
      const patterns = [
        /(?:trip to|visit|travel to|explore)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:trip|vacation|holiday|itinerary)/i,
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:for|in|\d)/i
      ];

      for (const pattern of patterns) {
        const match = input.prompt.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      // Fallback to truncated prompt
      return input.prompt.substring(0, 50) + (input.prompt.length > 50 ? '...' : '');
    }

    return 'Untitled Trip';
  }

  /**
   * Extract destination from various sources
   */
  static extractDestination(input: any): string {
    if (input.destination) return input.destination;

    if (input.itinerary?.destination) {
      return input.itinerary.destination;
    }

    if (input.itinerary?.itinerary?.[0]?.location) {
      return input.itinerary.itinerary[0].location;
    }

    if (input.chatState?.intent?.destination) {
      return input.chatState.intent.destination;
    }

    return 'Unknown';
  }

  /**
   * Extract and validate duration
   */
  static extractDuration(input: any): number {
    // Direct duration
    if (input.duration && typeof input.duration === 'number') {
      return Math.max(1, Math.min(365, input.duration));
    }

    // From itinerary
    if (input.itinerary?.duration) {
      return Math.max(1, Math.min(365, input.itinerary.duration));
    }

    // Calculate from dates
    if (input.startDate && input.endDate) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0 && days <= 365) {
        return days;
      }
    }

    // From itinerary array length
    if (input.itinerary?.itinerary?.length) {
      return input.itinerary.itinerary.length;
    }

    // Default
    return 3;
  }

  /**
   * Generate relevant tags from trip data
   */
  static generateTags(input: any): string[] {
    const tags = new Set<string>();

    // Add existing tags
    if (Array.isArray(input.tags)) {
      input.tags.forEach((tag: string) => tags.add(tag.toLowerCase()));
    }

    // Add destination as tag
    const destination = this.extractDestination(input);
    if (destination !== 'Unknown') {
      tags.add(destination.toLowerCase());
    }

    // Add travel style
    if (input.travelStyle) {
      tags.add(input.travelStyle);
    }

    // Add duration category
    const duration = this.extractDuration(input);
    if (duration <= 3) tags.add('weekend');
    else if (duration <= 7) tags.add('week-long');
    else if (duration <= 14) tags.add('two-weeks');
    else tags.add('extended');

    // Add interests from itinerary
    if (input.itinerary?.interests) {
      input.itinerary.interests.forEach((interest: string) => {
        tags.add(interest.toLowerCase());
      });
    }

    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }

  /**
   * Validate and clean trip updates
   */
  static validateUpdate(updates: any): any {
    const cleaned: any = {};

    // Remove fields that shouldn't be updated
    const forbiddenFields = ['id', 'userId', 'createdAt'];

    for (const [key, value] of Object.entries(updates)) {
      if (forbiddenFields.includes(key)) {
        logger.warn('TripSanitizer', `Attempted to update forbidden field: ${key}`);
        continue;
      }

      const cleanValue = this.cleanForFirestore(value);
      if (cleanValue !== null && cleanValue !== undefined) {
        cleaned[key] = cleanValue;
      }
    }

    return cleaned;
  }
}