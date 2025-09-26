/**
 * Intent Extractor Module
 * Core logic for extracting and validating user intent
 * Orchestrates other parser modules
 */

import { DateParser, DateRange } from './date-parser';
import { DestinationParser, MultiCityIntent } from './destination-parser';
import { PreferenceParser, TravelersInfo, UserPreferences, BudgetLevel } from './preference-parser';
import { logger } from '@/lib/monitoring/logger';

// Main parsed intent structure
export interface ParsedIntent {
  destination?: string;
  destinations?: string[];  // For multi-city trips
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: TravelersInfo;
  budget?: BudgetLevel;
  interests?: string[];
  preferences?: UserPreferences;
  modificationRequest?: string;
}

export class IntentExtractor {
  private dateParser: DateParser;
  private destinationParser: DestinationParser;
  private preferenceParser: PreferenceParser;

  constructor() {
    this.dateParser = new DateParser();
    this.destinationParser = new DestinationParser();
    this.preferenceParser = new PreferenceParser();
  }

  /**
   * Main extraction method - orchestrates all parsers
   */
  extract(message: string, currentIntent?: ParsedIntent): ParsedIntent {
    const extracted: ParsedIntent = currentIntent ? { ...currentIntent } : {};

    try {
      // 1. Extract destinations
      const destinations = this.destinationParser.extractAllDestinations(message);
      if (destinations.length > 1) {
        extracted.destinations = destinations;
        extracted.destination = destinations.join(', ');
        console.log('🗺️  Multi-city trip detected:', destinations);
      } else if (destinations.length === 1) {
        extracted.destination = destinations[0];
      }

      // 2. Extract dates and duration
      const dateRange = this.dateParser.extractDateRange(message);
      if (dateRange.startDate) extracted.startDate = dateRange.startDate;
      if (dateRange.endDate) extracted.endDate = dateRange.endDate;
      if (dateRange.duration) extracted.duration = dateRange.duration;

      // Also check for explicit duration
      const explicitDuration = this.dateParser.extractDuration(message);
      if (explicitDuration && !extracted.duration) {
        extracted.duration = explicitDuration;
      }

      // 3. Extract travelers
      const travelers = this.preferenceParser.extractTravelers(message);
      if (travelers) {
        extracted.travelers = travelers;
      }

      // 4. Extract budget
      const budget = this.preferenceParser.extractBudget(message);
      if (budget) {
        extracted.budget = budget;
      }

      // 5. Extract interests and preferences
      const preferences = this.preferenceParser.extractPreferences(message);
      if (preferences.interests && preferences.interests.length > 0) {
        extracted.interests = preferences.interests;
      }
      extracted.preferences = preferences;

      // 6. Check for modification requests
      if (this.isModificationRequest(message)) {
        extracted.modificationRequest = message;
      }

      // Log extraction results
      this.logExtractionResults(extracted);

    } catch (error) {
      logger.error('Error extracting intent:', error);
    }

    return extracted;
  }

  /**
   * Extract multi-city specific intent
   */
  extractMultiCity(message: string): MultiCityIntent {
    return this.destinationParser.extractMultiCityIntent(message);
  }

  /**
   * Validate extracted intent
   */
  validate(data: any): ParsedIntent {
    const validated: ParsedIntent = {};

    // Validate destination
    if (data.destination && typeof data.destination === 'string') {
      validated.destination = data.destination.trim();
    }

    // Validate destinations (multi-city)
    if (data.destinations && Array.isArray(data.destinations)) {
      validated.destinations = data.destinations
        .filter((d: any) => typeof d === 'string' && d.length > 0)
        .map((d: string) => d.trim());
    }

    // Validate dates
    if (data.startDate && this.dateParser.validateDate(data.startDate)) {
      validated.startDate = this.dateParser.formatDate(new Date(data.startDate));
    }

    if (data.endDate && this.dateParser.validateDate(data.endDate)) {
      validated.endDate = this.dateParser.formatDate(new Date(data.endDate));
    }

    // Validate duration
    if (data.duration && typeof data.duration === 'number' && data.duration > 0 && data.duration <= 365) {
      validated.duration = data.duration;
    }

    // Validate travelers
    if (data.travelers) {
      validated.travelers = {
        adults: Math.max(1, Math.min(20, data.travelers.adults || 1)),
        children: Math.max(0, Math.min(20, data.travelers.children || 0))
      };
    }

    // Validate budget
    if (data.budget && ['budget', 'medium', 'luxury'].includes(data.budget)) {
      validated.budget = data.budget;
    }

    // Validate interests
    if (data.interests && Array.isArray(data.interests)) {
      validated.interests = data.interests
        .filter((i: any) => typeof i === 'string')
        .map((i: string) => i.toLowerCase().trim())
        .slice(0, 10); // Limit to 10 interests
    }

    // Validate preferences
    if (data.preferences) {
      validated.preferences = this.preferenceParser.validatePreferences(data.preferences);
    }

    // Validate modification request
    if (data.modificationRequest && typeof data.modificationRequest === 'string') {
      validated.modificationRequest = data.modificationRequest;
    }

    return validated;
  }

  /**
   * Check if message is a modification request
   */
  private isModificationRequest(message: string): boolean {
    const modificationKeywords = [
      'change', 'modify', 'update', 'replace', 'switch',
      'different', 'another', 'instead', 'alternative',
      'more', 'less', 'fewer', 'add', 'remove', 'skip'
    ];

    const lowerMessage = message.toLowerCase();
    return modificationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Log extraction results for debugging
   */
  private logExtractionResults(extracted: ParsedIntent): void {
    console.log('   🔍 INTENT EXTRACTION:');
    console.log(`      Destination: ${extracted.destination || 'not found'}`);
    if (extracted.destinations) {
      console.log(`      Multi-city: ${extracted.destinations.join(', ')}`);
    }
    console.log(`      Duration: ${extracted.duration || 'not found'} days`);
    console.log(`      Start Date: ${extracted.startDate || 'not found'}`);
    console.log(`      End Date: ${extracted.endDate || 'not found'}`);
    if (extracted.travelers) {
      console.log(`      Travelers: ${extracted.travelers.adults} adults, ${extracted.travelers.children} children`);
    }
    if (extracted.budget) {
      console.log(`      Budget: ${extracted.budget}`);
    }
    if (extracted.interests && extracted.interests.length > 0) {
      console.log(`      Interests: ${extracted.interests.join(', ')}`);
    }
  }

  /**
   * Format intent for display
   */
  formatIntent(intent: ParsedIntent): string {
    const parts: string[] = [];

    if (intent.destination) {
      parts.push(`Destination: ${intent.destination}`);
    }

    if (intent.duration) {
      parts.push(`Duration: ${intent.duration} days`);
    }

    if (intent.startDate) {
      parts.push(`Starting: ${intent.startDate}`);
    }

    if (intent.travelers) {
      const travelerText = intent.travelers.children > 0
        ? `${intent.travelers.adults} adults, ${intent.travelers.children} children`
        : `${intent.travelers.adults} adult${intent.travelers.adults > 1 ? 's' : ''}`;
      parts.push(`Travelers: ${travelerText}`);
    }

    if (intent.budget) {
      parts.push(`Budget: ${intent.budget}`);
    }

    return parts.join(' | ');
  }
}