/**
 * Enhanced Destination Parser
 * Uses Phase 1 text processing tools for improved parsing
 */

import { TravelDateParser } from '@/lib/utils/date-parser';
import { TravelInputValidator } from '@/lib/utils/input-validator';
import { logger } from '@/lib/logger';

export interface EnhancedParseResult {
  // Core information
  origin: string;
  destinations: Array<{
    city: string;
    days: number;
  }>;
  
  // Date information
  startDate?: Date;
  endDate?: Date;
  totalDays: number;
  
  // Additional context
  travelers: number;
  budget?: {
    amount: number;
    currency: string;
    perPerson: boolean;
  };
  
  // Validation status
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  
  // Original and cleaned input
  originalInput: string;
  sanitizedInput: string;
}

export class EnhancedDestinationParser {
  /**
   * Main parsing function that combines all text processing tools
   */
  static parse(input: string): EnhancedParseResult {
    const startTime = Date.now();
    logger.info('AI', 'Enhanced parsing starting', { inputLength: input.length });
    
    // Step 1: Validate and sanitize input
    const validation = TravelInputValidator.validateTravelRequest(input);
    
    // Step 2: Extract dates
    const dateInfo = TravelDateParser.inferTravelDates(validation.sanitized);
    
    // Step 3: Extract destinations
    const destinations = this.extractDestinations(validation.sanitized);
    
    // Step 4: Extract origin
    const origin = this.extractOrigin(validation.sanitized);
    
    // Step 5: Calculate total days
    let totalDays = dateInfo.duration || 0;
    if (totalDays === 0) {
      // Try to infer from destinations
      totalDays = destinations.reduce((sum, dest) => sum + dest.days, 0);
      if (totalDays === 0) {
        // Check for explicit duration in text
        const extractedDuration = TravelDateParser.extractDuration(validation.sanitized);
        totalDays = extractedDuration || 7; // Default to 7 days
      }
    }
    
    // Step 6: Validate trip duration
    const durationValid = TravelInputValidator.validateTripDuration(totalDays);
    if (!durationValid && totalDays > 30) {
      validation.warnings.push(`Trip duration of ${totalDays} days exceeds maximum of 30 days`);
    }
    
    // Step 7: Calculate confidence level
    const confidence = this.calculateConfidence({
      hasOrigin: !!origin,
      hasDestinations: destinations.length > 0,
      hasValidDates: dateInfo.confidence !== 'low',
      validationPassed: validation.isValid,
      durationValid
    });
    
    const result: EnhancedParseResult = {
      origin,
      destinations,
      startDate: dateInfo.startDate,
      endDate: dateInfo.endDate,
      totalDays,
      travelers: validation.extractedInfo.travelerCount || 1,
      budget: validation.extractedInfo.budget,
      isValid: validation.isValid && destinations.length > 0,
      confidence,
      warnings: validation.warnings,
      originalInput: input,
      sanitizedInput: validation.sanitized
    };
    
    const processingTime = Date.now() - startTime;
    logger.info('AI', 'Enhanced parsing complete', { 
      processingTime,
      confidence,
      destinationCount: destinations.length,
      totalDays,
      hasOrigin: !!origin
    });
    
    return result;
  }
  
  /**
   * Extract destinations from sanitized text
   */
  private static extractDestinations(text: string): Array<{ city: string; days: number }> {
    const destinations: Array<{ city: string; days: number }> = [];
    const normalized = text.toLowerCase();
    
    // Common destination patterns
    const patterns = [
      // "X days in City"
      /(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|\.|\sand\s|\sthen\s|$)/gi,
      // "City for X days"
      /([A-Z][a-zA-Z\s]+?)\s+for\s+(\d+)\s*days?/gi,
      // "week in City"
      /(?:a\s+)?week\s+in\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|\.|\sand\s|\sthen\s|$)/gi,
      // "City, Country"
      /(?:to|in|at|visit)\s+([A-Z][a-zA-Z\s]+?)(?:,\s*[A-Z][a-zA-Z\s]+?)?(?:\s|,|\.|\sand\s|\sthen\s|$)/gi
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        let city = '';
        let days = 7; // Default
        
        if (pattern.source.includes('days?\\s+in')) {
          // Pattern: "X days in City"
          days = parseInt(match[1]);
          city = match[2].trim();
        } else if (pattern.source.includes('for\\s+')) {
          // Pattern: "City for X days"
          city = match[1].trim();
          days = parseInt(match[2]);
        } else if (pattern.source.includes('week\\s+in')) {
          // Pattern: "week in City"
          city = match[1].trim();
          days = 7;
        } else {
          // Generic pattern
          city = match[1].trim();
        }
        
        // Clean and validate city name
        const cleanedCity = TravelInputValidator.sanitizeDestination(city);
        if (cleanedCity && cleanedCity.length > 2) {
          // Check if not already added
          const exists = destinations.some(d => 
            d.city.toLowerCase() === cleanedCity.toLowerCase()
          );
          
          if (!exists) {
            destinations.push({
              city: this.properCase(cleanedCity),
              days: days || 7
            });
          }
        }
      }
    }
    
    // Special handling for multi-city mentions
    if (destinations.length === 0) {
      // Look for city names with "and" or commas
      const multiCityPattern = /(?:visit|tour|explore)\s+([A-Z][a-zA-Z\s,]+?)(?:\sfor|\sduring)/gi;
      const multiMatch = multiCityPattern.exec(text);
      if (multiMatch) {
        const cities = multiMatch[1].split(/,|\sand\s/);
        for (const city of cities) {
          const cleanedCity = TravelInputValidator.sanitizeDestination(city.trim());
          if (cleanedCity && cleanedCity.length > 2) {
            destinations.push({
              city: this.properCase(cleanedCity),
              days: Math.floor(7 / cities.length) || 1
            });
          }
        }
      }
    }
    
    return destinations;
  }
  
  /**
   * Extract origin/departure location
   */
  private static extractOrigin(text: string): string {
    const patterns = [
      /(?:from|leaving|departing)\s+([A-Z][a-zA-Z\s]+?)(?:\s+to|\s+for|\s|,|$)/i,
      /(?:flying|fly|flight)\s+(?:from|out\s+of)\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|$)/i,
      /^([A-Z][a-zA-Z\s]+?)\s+to\s+[A-Z]/i // "NYC to Paris" pattern
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        const origin = TravelInputValidator.sanitizeDestination(match[1].trim());
        if (origin && origin.length > 2) {
          return this.properCase(origin);
        }
      }
    }
    
    return '';
  }
  
  /**
   * Calculate confidence level
   */
  private static calculateConfidence(factors: {
    hasOrigin: boolean;
    hasDestinations: boolean;
    hasValidDates: boolean;
    validationPassed: boolean;
    durationValid: boolean;
  }): 'high' | 'medium' | 'low' {
    let score = 0;
    
    if (factors.hasOrigin) score += 2;
    if (factors.hasDestinations) score += 2;
    if (factors.hasValidDates) score += 2;
    if (factors.validationPassed) score += 1;
    if (factors.durationValid) score += 1;
    
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }
  
  /**
   * Convert string to proper case
   */
  private static properCase(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}