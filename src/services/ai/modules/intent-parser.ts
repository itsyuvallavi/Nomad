/**
 * Intent Parser Module - Refactored Version
 * Main orchestrator that delegates to specialized parser modules
 * Maintains backward compatibility while improving code organization
 */

import { IntentExtractor, ParsedIntent } from '../parsers/intent-extractor';
import { DateParser } from '../parsers/date-parser';
import { DestinationParser, MultiCityIntent } from '../parsers/destination-parser';
import { PreferenceParser } from '../parsers/preference-parser';
import { logger } from '@/lib/monitoring/logger';

// Re-export types for backward compatibility
export type { ParsedIntent, MultiCityIntent };

/**
 * Main IntentParser class - maintains original API while using new modular structure
 */
export class IntentParser {
  private extractor: IntentExtractor;
  private dateParser: DateParser;
  private destinationParser: DestinationParser;
  private preferenceParser: PreferenceParser;

  constructor() {
    this.extractor = new IntentExtractor();
    this.dateParser = new DateParser();
    this.destinationParser = new DestinationParser();
    this.preferenceParser = new PreferenceParser();
  }

  /**
   * Extract multi-city intent from message
   * Delegates to DestinationParser
   */
  extractMultiCityIntent(message: string): MultiCityIntent {
    return this.destinationParser.extractMultiCityIntent(message);
  }

  /**
   * Format multi-city destination for display
   * Delegates to DestinationParser
   */
  formatMultiCityDestination(intent: MultiCityIntent): string {
    return this.destinationParser.formatMultiCityDestination(intent);
  }

  /**
   * Extract dates, duration, and other intent from patterns
   * Main extraction method - delegates to IntentExtractor
   */
  extractWithPatterns(message: string, currentIntent?: ParsedIntent): Partial<ParsedIntent> {
    return this.extractor.extract(message, currentIntent);
  }

  /**
   * Extract start date from text
   * Delegates to DateParser
   */
  extractStartDate(text: string): string | null {
    return this.dateParser.extractStartDate(text);
  }

  /**
   * Validate extracted intent
   * Delegates to IntentExtractor
   */
  validateExtractedIntent(data: any): Partial<ParsedIntent> {
    return this.extractor.validate(data);
  }

  /**
   * Additional utility methods for backward compatibility
   */

  /**
   * Extract duration from text
   */
  extractDuration(text: string): number | null {
    return this.dateParser.extractDuration(text);
  }

  /**
   * Format date to ISO string
   */
  formatDate(date: Date): string {
    return this.dateParser.formatDate(date);
  }

  /**
   * Extract all destinations from text
   */
  extractDestinations(text: string): string[] {
    return this.destinationParser.extractAllDestinations(text);
  }

  /**
   * Extract user preferences
   */
  extractPreferences(text: string) {
    return this.preferenceParser.extractPreferences(text);
  }

  /**
   * Extract traveler information
   */
  extractTravelers(text: string) {
    return this.preferenceParser.extractTravelers(text);
  }

  /**
   * Format intent for logging
   */
  formatIntent(intent: ParsedIntent): string {
    return this.extractor.formatIntent(intent);
  }
}