/**
 * Master Travel Parser
 * Combines all Phase 1 and Phase 2 text processing tools
 * Provides centralized, robust input processing with caching
 */

import { TravelDateParser } from './date-parser';
import { TravelInputValidator } from './input-validator';
// Removed nlp-parser and enhanced-logger imports - files were deleted

// Define types that were from nlp-parser
export type TripType = 'business' | 'leisure' | 'adventure' | 'relaxation' | 'cultural' | 'mixed';

export interface TravelEntities {
  cities: Array<{ name: string; confidence: number }>;
  countries: Array<{ name: string; confidence: number }>;
  places?: Array<{ name: string; type: string; confidence: number }>;
  dates: Array<{ text: string; parsed?: Date }>;
  numbers: Array<{ value: number; context: string }>;
  keywords: string[];
  travelers?: number;
  budget?: { amount: number; currency: string };
  activities?: string[];
  durations?: number[];
}

export interface TravelPreferences {
  accommodation: 'budget' | 'mid-range' | 'luxury' | 'any';
  pace: 'slow' | 'moderate' | 'fast';
  flexibility: 'strict' | 'flexible' | 'very-flexible';
  interests: string[];
}

// Cache for parsed results
const parseCache = new Map<string, ParsedTravelRequest>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface ParsedTravelRequest {
  // Core travel information
  origin?: string;
  destinations: Array<{
    city: string;
    days: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
  
  // Dates and duration
  startDate?: Date;
  endDate?: Date;
  duration: number;
  dateConfidence: 'high' | 'medium' | 'low';
  
  // Travelers and budget
  travelers: number;
  travelerType: 'solo' | 'couple' | 'family' | 'group';
  budget?: {
    amount: number;
    currency: string;
    perPerson: boolean;
  };
  
  // Trip characteristics
  tripType: TripType;
  preferences: TravelPreferences;
  activities: string[];
  urgency: 'immediate' | 'planning' | 'exploring';
  
  // Validation and quality
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  suggestions: string[];
  
  // Processing metadata
  originalInput: string;
  sanitizedInput: string;
  processingTime: number;
  usedCache: boolean;
  parsingMethod: 'nlp' | 'pattern' | 'hybrid';
  
  // NLP entities
  entities: TravelEntities;
}

export class MasterTravelParser {
  /**
   * Main parsing function - combines all tools
   */
  static async parseUserInput(input: string): Promise<ParsedTravelRequest> {
    const startTime = Date.now();
    // Removed enhanced logger - using console.log for debugging
    const flowId = Date.now().toString();
    console.log('[MasterParser] Starting parse:', { flowId, input: input.substring(0, 100) });
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(input);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('[MasterParser] Cache hit:', { flowId, processingTime: Date.now() - startTime });
        return { ...cached, usedCache: true };
      }
      
      // Step 1: Sanitize and validate input
      const validation = TravelInputValidator.validateTravelRequest(input);
      
      // Step 2: Extract entities using NLP
      // Simple entity extraction (replacing AdvancedTravelParser)
      const entities = this.extractEntities(validation.sanitized);
      
      // Step 3: Parse dates with multiple strategies
      const dateResult = this.parseDatesComprehensive(validation.sanitized, entities);
      
      // Step 4: Extract destinations with NLP and patterns
      const destinations = this.extractDestinationsHybrid(validation.sanitized, entities);
      
      // Step 5: Extract origin
      const origin = this.extractOriginAdvanced(validation.sanitized, entities);
      
      // Step 6: Determine travelers and budget
      const travelers = entities.travelers || validation.extractedInfo.travelerCount || 1;
      const travelerType = this.determineTravelerType(travelers, validation.sanitized);
      const budget = entities.budget 
        ? { ...entities.budget, perPerson: true }
        : validation.extractedInfo.budget 
        ? { ...validation.extractedInfo.budget, perPerson: true }
        : undefined;
      
      // Step 7: Extract preferences and trip type
      const tripType = this.identifyTripType(validation.sanitized);
      const preferences = this.extractTravelPreferences(validation.sanitized);
      const urgency = this.detectUrgency(validation.sanitized);
      
      // Step 8: Calculate confidence and generate suggestions
      const confidence = this.calculateOverallConfidence({
        hasOrigin: !!origin,
        destinations: destinations,
        dateConfidence: dateResult.confidence,
        validationPassed: validation.isValid,
        entitiesFound: (entities.places?.length || 0) > 0
      });
      
      const suggestions = this.generateSuggestions({
        hasOrigin: !!origin,
        hasDestinations: destinations.length > 0,
        hasDates: !!dateResult.startDate,
        hasBudget: !!budget
      });
      
      // Build result
      const result: ParsedTravelRequest = {
        origin,
        destinations,
        startDate: dateResult.startDate,
        endDate: dateResult.endDate,
        duration: dateResult.duration || 7,
        dateConfidence: dateResult.confidence,
        travelers,
        travelerType,
        budget,
        tripType,
        preferences,
        activities: entities.activities || [],
        urgency,
        isValid: validation.isValid && destinations.length > 0,
        confidence,
        warnings: validation.warnings,
        suggestions,
        originalInput: input,
        sanitizedInput: validation.sanitized,
        processingTime: Date.now() - startTime,
        usedCache: false,
        parsingMethod: this.determineParsingMethod(entities, destinations),
        entities
      };
      
      // Cache the result
      this.cacheResult(cacheKey, result);
      
      // Log metrics
      console.log('[MasterParser] Parsing metrics:', {
        processingTime: result.processingTime,
        isValid: result.isValid,
        confidence: result.confidence
      });
      
      console.log('[MasterParser] Parse complete:', { 
        flowId,
        confidence: result.confidence,
        destinationCount: result.destinations.length,
        processingTime: result.processingTime
      });
      
      return result;
      
    } catch (error: any) {
      console.error('[MasterParser] Parse failed:', { flowId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Parse dates using multiple strategies
   */
  private static parseDatesComprehensive(
    text: string, 
    entities: TravelEntities
  ): {
    startDate?: Date;
    endDate?: Date;
    duration?: number;
    confidence: 'high' | 'medium' | 'low';
  } {
    // Try date-fns parser first
    const dateParserResult = TravelDateParser.inferTravelDates(text);
    
    // Check NLP-extracted dates
    let nlpConfidence: 'high' | 'medium' | 'low' = 'low';
    if (entities.dates.length > 0) {
      // Try to parse NLP dates
      for (const dateStr of entities.dates) {
        const parsed = TravelDateParser.parseFlexibleDate(dateStr.text);
        if (parsed.startDate && parsed.confidence === 'high') {
          nlpConfidence = 'high';
          break;
        }
      }
    }
    
    // Check duration from NLP
    let duration = dateParserResult.duration;
    if (!duration && entities.durations && entities.durations.length > 0) {
      duration = TravelDateParser.extractDuration(entities.durations[0].toString()) || undefined;
    }
    
    // Combine results with confidence scoring
    const hasGoodDates = dateParserResult.startDate && dateParserResult.confidence !== 'low';
    const hasNlpDates = nlpConfidence !== 'low';
    
    let finalConfidence: 'high' | 'medium' | 'low';
    if (hasGoodDates && hasNlpDates) {
      finalConfidence = 'high';
    } else if (hasGoodDates || hasNlpDates) {
      finalConfidence = 'medium';
    } else {
      finalConfidence = 'low';
    }
    
    return {
      startDate: dateParserResult.startDate,
      endDate: dateParserResult.endDate,
      duration: duration || dateParserResult.duration,
      confidence: finalConfidence
    };
  }
  
  /**
   * Extract destinations using hybrid approach
   */
  private static extractDestinationsHybrid(
    text: string,
    entities: TravelEntities
  ): Array<{ city: string; days: number; confidence: 'high' | 'medium' | 'low' }> {
    const destinations = new Map<string, { days: number; confidence: 'high' | 'medium' | 'low' }>();
    
    // Add NLP-detected places
    entities.places?.forEach(place => {
      const cleaned = TravelInputValidator.sanitizeDestination(place.name);
      if (cleaned && cleaned.length > 2) {
        destinations.set(cleaned.toLowerCase(), {
          days: 7, // Default
          confidence: 'high'
        });
      }
    });
    
    // Pattern-based extraction for days
    const patterns = [
      /(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|\.|\sand\s|\sthen\s|$)/gi,
      /([A-Z][a-zA-Z\s]+?)\s+for\s+(\d+)\s*days?/gi,
      /spend\s+(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        let city = '';
        let days = 7;
        
        if (pattern.source.includes('days?\\s+in')) {
          days = parseInt(match[1]);
          city = match[2].trim();
        } else if (pattern.source.includes('for\\s+')) {
          city = match[1].trim();
          days = parseInt(match[2]);
        } else if (pattern.source.includes('spend')) {
          days = parseInt(match[1]);
          city = match[2].trim();
        }
        
        const cleaned = TravelInputValidator.sanitizeDestination(city);
        if (cleaned && cleaned.length > 2) {
          const key = cleaned.toLowerCase();
          const existing = destinations.get(key);
          
          // Update with more specific information
          if (!existing || days !== 7) {
            destinations.set(key, {
              days,
              confidence: 'high'
            });
          }
        }
      }
    }
    
    // Convert to array and format
    return Array.from(destinations.entries()).map(([city, info]) => ({
      city: this.properCase(city),
      days: info.days,
      confidence: info.confidence
    }));
  }
  
  /**
   * Extract origin with advanced patterns
   */
  private static extractOriginAdvanced(text: string, entities: TravelEntities): string | undefined {
    // Check for explicit from patterns
    const fromPatterns = [
      /(?:from|leaving|departing)\s+([A-Z][a-zA-Z\s]+?)(?:\s+to|\s+for|\s|,|$)/i,
      /(?:flying|fly|flight)\s+(?:from|out\s+of)\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|$)/i,
      /^([A-Z][a-zA-Z\s]+?)\s+to\s+[A-Z]/i,
      /(?:based\s+in|living\s+in|starting\s+from)\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|$)/i
    ];
    
    for (const pattern of fromPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const origin = TravelInputValidator.sanitizeDestination(match[1].trim());
        if (origin && origin.length > 2) {
          // Verify it's not in destinations
          const isDestination = entities.places?.some(place => 
            place.name.toLowerCase() === origin.toLowerCase()
          );
          
          if (!isDestination) {
            return this.properCase(origin);
          }
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Determine traveler type based on count and context
   */
  private static determineTravelerType(
    count: number, 
    text: string
  ): 'solo' | 'couple' | 'family' | 'group' {
    const normalized = text.toLowerCase();
    
    if (normalized.includes('solo') || count === 1) return 'solo';
    if (normalized.includes('couple') || normalized.includes('honeymoon') || count === 2) return 'couple';
    if (normalized.includes('family') || (count >= 3 && count <= 6)) return 'family';
    if (count > 6 || normalized.includes('group')) return 'group';
    
    return 'solo';
  }
  
  /**
   * Calculate overall confidence score
   */
  private static calculateOverallConfidence(factors: {
    hasOrigin: boolean;
    destinations: any[];
    dateConfidence: 'high' | 'medium' | 'low';
    validationPassed: boolean;
    entitiesFound: boolean;
  }): 'high' | 'medium' | 'low' {
    let score = 0;
    const maxScore = 10;
    
    if (factors.hasOrigin) score += 2;
    if (factors.destinations.length > 0) score += 3;
    if (factors.destinations.length > 1) score += 1;
    if (factors.dateConfidence === 'high') score += 2;
    else if (factors.dateConfidence === 'medium') score += 1;
    if (factors.validationPassed) score += 1;
    if (factors.entitiesFound) score += 1;
    
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 70) return 'high';
    if (percentage >= 40) return 'medium';
    return 'low';
  }
  
  /**
   * Generate helpful suggestions
   */
  private static generateSuggestions(status: {
    hasOrigin: boolean;
    hasDestinations: boolean;
    hasDates: boolean;
    hasBudget: boolean;
  }): string[] {
    const suggestions: string[] = [];
    
    if (!status.hasOrigin) {
      suggestions.push('Add your departure city for accurate flight information');
    }
    if (!status.hasDestinations) {
      suggestions.push('Specify which cities or countries you want to visit');
    }
    if (!status.hasDates) {
      suggestions.push('Include your travel dates or preferred time of year');
    }
    if (!status.hasBudget) {
      suggestions.push('Mention your budget for personalized recommendations');
    }
    
    return suggestions;
  }
  
  /**
   * Determine which parsing method was most effective
   */
  private static determineParsingMethod(
    entities: TravelEntities,
    destinations: any[]
  ): 'nlp' | 'pattern' | 'hybrid' {
    if ((entities.places?.length || 0) > 0 && destinations.length > 0) {
      return 'hybrid';
    }
    if ((entities.places?.length || 0) > 0) {
      return 'nlp';
    }
    return 'pattern';
  }
  
  /**
   * Cache management
   */
  private static getCacheKey(input: string): string {
    return `parse_${input.toLowerCase().replace(/\s+/g, '_').substring(0, 100)}`;
  }
  
  private static getFromCache(key: string): ParsedTravelRequest | null {
    const cached = parseCache.get(key) as (ParsedTravelRequest & { cachedAt?: number }) | undefined;
    if (cached?.cachedAt && Date.now() - cached.cachedAt < CACHE_TTL) {
      return cached;
    }
    if (cached) {
      parseCache.delete(key);
    }
    return null;
  }
  
  private static cacheResult(key: string, result: ParsedTravelRequest): void {
    // Limit cache size
    if (parseCache.size > 100) {
      const firstKey = parseCache.keys().next().value;
      if (firstKey) parseCache.delete(firstKey);
    }
    // When caching, add cachedAt timestamp for TTL calculation
    const resultToCache = { ...result, cachedAt: Date.now() };
    parseCache.set(key, resultToCache);
  }
  
  /**
   * Utility: Convert to proper case
   */
  private static properCase(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Simple entity extraction (replacing AdvancedTravelParser)
   */
  private static extractEntities(text: string): TravelEntities {
    const cityRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const numberRegex = /\b\d+\b/g;
    
    const cities = [];
    const matches = text.match(cityRegex) || [];
    for (const match of matches) {
      // Simple city detection - could be enhanced with a city database
      if (match.length > 2 && !['The', 'And', 'For', 'From', 'To'].includes(match)) {
        cities.push({ name: match, confidence: 0.7 });
      }
    }
    
    const numbers = [];
    const numMatches = text.match(numberRegex) || [];
    for (const num of numMatches) {
      numbers.push({ value: parseInt(num), context: 'general' });
    }
    
    return {
      cities,
      countries: [],
      dates: [],
      numbers,
      keywords: text.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    };
  }
  
  /**
   * Identify trip type from text
   */
  private static identifyTripType(text: string): TripType {
    const lower = text.toLowerCase();
    if (lower.includes('business') || lower.includes('work')) return 'business';
    if (lower.includes('adventure') || lower.includes('hiking')) return 'adventure';
    if (lower.includes('relax') || lower.includes('beach')) return 'relaxation';
    if (lower.includes('culture') || lower.includes('museum')) return 'cultural';
    return 'leisure';
  }
  
  /**
   * Extract travel preferences
   */
  private static extractTravelPreferences(text: string): TravelPreferences {
    const lower = text.toLowerCase();
    
    let accommodation: 'budget' | 'mid-range' | 'luxury' | 'any' = 'mid-range';
    if (lower.includes('budget') || lower.includes('cheap')) accommodation = 'budget';
    if (lower.includes('luxury') || lower.includes('premium')) accommodation = 'luxury';
    
    let pace: 'slow' | 'moderate' | 'fast' = 'moderate';
    if (lower.includes('relax') || lower.includes('slow')) pace = 'slow';
    if (lower.includes('packed') || lower.includes('busy')) pace = 'fast';
    
    const interests = [];
    if (lower.includes('food')) interests.push('food');
    if (lower.includes('history')) interests.push('history');
    if (lower.includes('art')) interests.push('art');
    if (lower.includes('nature')) interests.push('nature');
    
    return {
      accommodation,
      pace,
      flexibility: 'flexible',
      interests
    };
  }
  
  /**
   * Detect urgency level
   */
  private static detectUrgency(text: string): 'immediate' | 'planning' | 'exploring' {
    const lower = text.toLowerCase();
    if (lower.includes('tomorrow') || lower.includes('today')) return 'immediate';
    if (lower.includes('next week') || lower.includes('next month')) return 'planning';
    return 'exploring';
  }
  
  /**
   * Clear cache
   */
  static clearCache(): void {
    parseCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: parseCache.size,
      maxSize: 100,
      ttl: CACHE_TTL
    };
  }
}