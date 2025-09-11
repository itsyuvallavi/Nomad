/**
 * Destination Parser Utility
 * Extracts and structures destinations from user input for better AI processing
 */

import { logger } from '@/lib/logger';

export interface ParsedDestination {
  name: string;
  days?: number; // in days (for compatibility with chunked generation)
  duration: number; // in days
  durationText: string; // original text like "a week" or "3 days"
  order: number;
}

export interface ParsedTrip {
  origin: string;
  destinations: ParsedDestination[];
  returnTo: string;
  totalDays: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Parse duration text into number of days
 */
function parseDuration(durationText: string): number {
  const text = durationText.toLowerCase().trim();
  
  // Handle "weekend" specifically as 3 days (Friday night to Sunday)
  if (text === 'weekend' || text === 'a weekend' || text === 'the weekend') {
    return 3;
  }
  
  // Handle "a week" or "one week" or "two weeks"
  if (text.includes('week')) {
    const weekMatch = text.match(/(\d+|a|one|two|three|four)\s*weeks?/);
    if (weekMatch) {
      const num = weekMatch[1];
      if (num === 'a' || num === 'one') return 7;
      if (num === 'two') return 14;
      if (num === 'three') return 21;
      if (num === 'four') return 28;
      return parseInt(num) * 7;
    }
    // Also check for just "two weeks" etc without the match
    if (text === 'two weeks') return 14;
    return 7; // default to 1 week
  }
  
  // Handle "X-day" format (e.g., "10-day")
  const hyphenDayMatch = text.match(/(\d+)[\s-]*days?/);
  if (hyphenDayMatch) {
    return parseInt(hyphenDayMatch[1]);
  }
  
  // Handle "X days"
  const dayMatch = text.match(/(\d+)\s*days?/);
  if (dayMatch) {
    return parseInt(dayMatch[1]);
  }
  
  // Handle "X nights"
  const nightMatch = text.match(/(\d+)\s*nights?/);
  if (nightMatch) {
    return parseInt(nightMatch[1]);
  }
  
  // Handle month
  if (text.includes('month')) {
    return 30;
  }
  
  // Default to 5 days if no duration specified
  logger.warn('AI', `Could not parse duration: "${durationText}", defaulting to 5 days`);
  return 5;
}

/**
 * Extract origin location from user input
 */
function extractOrigin(input: string): string {
  // Special case for known city names with spaces
  const knownCities = [
    'Los Angeles', 'New York', 'San Francisco', 'Las Vegas', 'San Diego',
    'Buenos Aires', 'Rio de Janeiro', 'Mexico City', 'Hong Kong', 'New Delhi',
    'Kuala Lumpur', 'Cape Town', 'St Petersburg', 'St Louis', 'Salt Lake City',
    'Washington DC', 'New Orleans', 'El Paso', 'Oklahoma City',
    'LA', 'NYC', 'SF', 'DC', 'LV', 'SD' // Common abbreviations
  ];
  
  // Check for known cities first - look for "from [City Name]"
  for (const city of knownCities) {
    const regex = new RegExp(`from\\s+${city.replace(' ', '\\s+')}`, 'i');
    if (regex.test(input)) {
      logger.info('AI', 'Extracted known city origin', { origin: city });
      return city;
    }
  }
  
  // Common patterns for origin - enhanced to handle more cases
  const patterns = [
    // Enhanced: More specific patterns with better stopping conditions
    /from\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\s+(?:to|on|in|next|this|for|plan|visit|i\s+want))/i,
    /\s+from\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/i,  // Handle "from X" at end of sentence
    /departing\s+(?:from\s+)?([A-Z][a-zA-Z\s]+?)(?=,|\s+(?:to|on|in|for))/i,
    /leaving\s+(?:from\s+)?([A-Z][a-zA-Z\s]+?)(?=,|\s+(?:to|on|in|for))/i,
    /starting\s+(?:from|in)\s+([A-Z][a-zA-Z\s]+?)(?=,|\s+(?:to|on|in|for))/i,
    // NEW: Better handling of "flying from" and "traveling from"
    /(?:flying|traveling|travelling)\s+from\s+([A-Z][a-zA-Z\s]+?)(?=\s+(?:to|on|in|for|,|\.|$))/i,
    // NEW: "based in" or "located in" patterns
    /(?:based|located)\s+in\s+([A-Z][a-zA-Z\s]+?)(?=\s+(?:to|on|in|for|,|\.|$))/i,
    // NEW: More natural language patterns
    /(?:i\s+am\s+in|currently\s+in|living\s+in)\s+([A-Z][a-zA-Z\s]+?)(?=\s+(?:to|on|in|for|and|,|\.|$))/i,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      // Clean up the match
      let origin = match[1].trim()
        .replace(/,$/, '')
        .replace(/\.$/, '')
        .replace(/\s+(visit|Visit|to|To|next|this).*$/, ''); // Remove trailing words
        
      // Don't return if it's too short or contains unwanted words
      if (origin.length > 2 && !origin.match(/^(visit|to|in|for|next|this)$/i)) {
        logger.info('AI', 'Extracted origin via pattern', { origin, pattern: pattern.source });
        return origin;
      }
    }
  }
  
  logger.warn('AI', 'Could not extract origin from input, will ask user');
  return '';
}

/**
 * Extract return destination from user input
 */
function extractReturn(input: string): string {
  // Common patterns for return destination
  const patterns = [
    /(?:return|go back|fly back|head back|back home)\s+to\s+([A-Z][a-zA-Z\s,]+?)(?:\.|,|$)/i,
    /home\s+(?:to|in)\s+([A-Z][a-zA-Z\s,]+?)(?:\.|,|$)/i,
    /back\s+to\s+([A-Z][a-zA-Z\s,]+?)(?:\.|,|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim().replace(/,$/, '');
    }
  }
  
  // If no explicit return, assume return to origin
  return '';
}

/**
 * Validate a city name and duration
 */
function validateDestination(name: string, duration: number): { isValid: boolean; confidence: number; cleanedName: string } {
  const cleanedName = name.trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  
  // Basic validation rules
  if (cleanedName.length < 2) {
    return { isValid: false, confidence: 0, cleanedName };
  }
  
  // Check for invalid phrases
  const invalidPhrases = ['in days', 'in day', 'in weeks', 'in week', 'in months', 'in month'];
  if (invalidPhrases.includes(cleanedName.toLowerCase())) {
    return { isValid: false, confidence: 0, cleanedName };
  }
  
  // Check for common non-city words
  const invalidWords = ['from', 'to', 'in', 'for', 'and', 'the', 'visit', 'travel', 'trip', 'plan', 'want', 'be', 'spend', 
                        'days', 'day', 'week', 'weeks', 'month', 'months', 'year', 'starting', 'ending', 'departing'];
  if (invalidWords.includes(cleanedName.toLowerCase())) {
    return { isValid: false, confidence: 0, cleanedName };
  }
  
  // Duration validation
  if (duration < 1 || duration > 365) {
    return { isValid: false, confidence: 0, cleanedName };
  }
  
  // Calculate confidence based on characteristics
  let confidence = 0.5; // base confidence
  
  // Boost confidence for proper capitalization
  if (/^[A-Z][a-z]/.test(cleanedName)) {
    confidence += 0.2;
  }
  
  // Boost confidence for known city patterns
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(cleanedName)) {
    confidence += 0.2;
  }
  
  // Reduce confidence for very long names (likely not cities)
  if (cleanedName.length > 30) {
    confidence -= 0.3;
  }
  
  return { 
    isValid: confidence > 0.3, 
    confidence: Math.max(0, Math.min(1, confidence)), 
    cleanedName 
  };
}

/**
 * Main function to parse destinations from user input
 */
export function parseDestinations(input: string): ParsedTrip {
  logger.info('AI', 'Parsing destinations from user input', { inputLength: input.length });
  
  const origin = extractOrigin(input);
  const returnTo = extractReturn(input) || origin;
  const destinations: ParsedDestination[] = [];
  
  // Patterns to match destinations with durations - NEW ENHANCED VERSION
  const patterns = [
    // NEW: "X days in City and Y days in City2" - handles the Lisbon/Granada case
    /(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+?)\s+and\s+(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+?)(?=\s*(?:from|,|\.|$))/gi,
    
    // NEW: Comma-separated cities with shared duration - "3 days in London, Paris, Rome"
    /(\d+\s*(?:days?|weeks?))\s+in\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+){1,4})(?=\s*(?:from|\.|$))/gi,
    
    // NEW: "i want to be X days in Y" pattern
    /(?:i\s+want\s+to\s+be|i\s+want\s+to\s+spend|want\s+to\s+be|want\s+to\s+spend)\s+(\d+\s*(?:days?|weeks?))\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    
    // CRITICAL: "3 days in London" - Most common pattern, MUST be first
    // Updated to stop at "from" to avoid capturing origin info
    /(\d+\s*(?:days?|nights?))\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "a week in London" / "one week in London" - stop at "from"
    /((?:a|an|one|two|three|four)\s+weeks?)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "weekend in Paris" - stop at "from"
    /(weekend)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "weekend trip to Paris" - common pattern
    /(weekend)\s+trip\s+to\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // NEW: "Planning a 5-day trip to Tokyo" or "5-day trip to Tokyo" - handle both formats
    /(?:(?:planning|plan)\s+(?:a\s+)?)?(\d+[\s-]*days?)\s+trip\s+to\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "visit Zimbabwe for a week" - more specific to avoid false matches
    /(?:visit|explore)\s+([A-Z][a-zA-Z\s,]+?)\s+for\s+((?:\d+\s*)?(?:days?|weeks?))(?:\s|$)/gi,
    // "spend a week in Madagascar"
    /spend\s+([\w\s]+?weeks?|[\w\s]+?days?)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "Zimbabwe for 7 days" - more specific
    /(?:^|[,\s])([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+for\s+(\d+\s*days?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "to Zimbabwe" (without duration) - exclude common phrases
    /(?:travel to|fly to|go to)\s+([A-Z][a-zA-Z\s,]+?)(?=\s+(?:for|from|on|,|\.|$))/gi,
  ];

  // Special handling for "X days in City and Y days in City2" pattern FIRST
  // E.g. "2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada"
  // Also handle separated pattern: "10 days lisbon, 4 granada"
  let multiDestWithDaysMatch = input.match(/(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+?)\s+and\s+(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+?)(?=\s*(?:from|,|\.|$))/i);
  
  // Add specific handling for "X weeks in City1 and City2, Y days city1, Z city2" format
  if (!multiDestWithDaysMatch) {
    // Look for multiple day+city patterns AFTER the first comma (skip initial description)
    const afterFirstComma = input.includes(',') ? input.substring(input.indexOf(',') + 1) : input;
    const dayPatterns = [...afterFirstComma.matchAll(/(\d+)\s*(?:days?)?\s+([a-zA-Z]+)/gi)];
    if (dayPatterns.length >= 2) {
      const first = dayPatterns[0];
      const second = dayPatterns[1];
      multiDestWithDaysMatch = [
        first[0] + ', ' + second[0], // full match for logging
        first[1], // first days
        first[2], // first city
        second[1], // second days
        second[2]  // second city
      ];
    }
  }
  
  // If not found, try the separated numbers pattern: "10 days lisbon, 4 granada"
  if (!multiDestWithDaysMatch) {
    multiDestWithDaysMatch = input.match(/(\d+)\s*days?\s+([a-zA-Z][a-zA-Z\s]+?)(?:,\s*|\s+and\s+)(\d+)\s*days?\s+([a-zA-Z][a-zA-Z\s]+?)(?=\s*(?:from|,|\.|$))/i);
  }
  
  // Also try: "10 days in X, 4 days in Y" pattern
  if (!multiDestWithDaysMatch) {
    multiDestWithDaysMatch = input.match(/(\d+)\s*days?\s+in\s+([a-zA-Z][a-zA-Z\s]+?)(?:,\s*|\s+and\s+)(\d+)\s*days?\s+in\s+([a-zA-Z][a-zA-Z\s]+?)(?=\s*(?:from|,|\.|$))/i);
  }
  
  // NEW: Try "one week in Tokyo and 3 days in Kyoto" pattern
  if (!multiDestWithDaysMatch) {
    const textDurationMatch = input.match(/((?:one|two|three|four)\s+weeks?|a\s+week)\s+in\s+([A-Z][a-zA-Z\s]+?)\s+and\s+(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+?)(?=\s*(?:from|,|\.|$))/i);
    if (textDurationMatch) {
      const firstDurationText = textDurationMatch[1];
      const firstName = textDurationMatch[2].trim();
      const secondDays = parseInt(textDurationMatch[3]);
      const secondName = textDurationMatch[4].trim();
      const firstDays = parseDuration(firstDurationText);
      
      // Create a fake match array format to reuse the existing logic below
      multiDestWithDaysMatch = [
        textDurationMatch[0], // full match
        firstDays.toString(), // first duration as string
        firstName,            // first city
        secondDays.toString(), // second duration as string
        secondName            // second city
      ] as RegExpMatchArray;
    }
  }
  if (multiDestWithDaysMatch) {
    const firstDays = parseInt(multiDestWithDaysMatch[1]);
    const firstName = multiDestWithDaysMatch[2].trim();
    const secondDays = parseInt(multiDestWithDaysMatch[3]);
    const secondName = multiDestWithDaysMatch[4].trim();
    
    destinations.push({
      name: firstName,
      days: firstDays,
      duration: firstDays,
      durationText: `${firstDays} days`,
      order: 1
    });
    
    destinations.push({
      name: secondName,
      days: secondDays,
      duration: secondDays,
      durationText: `${secondDays} days`,
      order: 2
    });
    
    logger.info('AI', 'Parsed multi-destination with specific days', { 
      destinations: [
        `${firstName} (${firstDays} days)`,
        `${secondName} (${secondDays} days)`
      ]
    });
  }

  // Special handling for "Plan X weeks/days in LOCATION. Visit X, Y, and Z" pattern
  // E.g. "Plan 3 weeks in Japan from Los Angeles. Visit Tokyo, Kyoto, and Osaka."
  const planVisitMatch = input.match(/Plan\s+(\d+\s*(?:days?|weeks?))\s+in\s+[A-Z][a-zA-Z]+.*?(?:visit|Visit)\s+(.+?)(?:\.|$)/i);
  if (planVisitMatch && destinations.length === 0) {
    const totalDuration = parseDuration(planVisitMatch[1]);
    let citiesText = planVisitMatch[2];
    
    // Clean up the cities text - remove any trailing non-city content
    citiesText = citiesText.replace(/\.\s*I want.*$/i, '').trim();
    citiesText = citiesText.replace(/\.\s*.*$/i, '').trim();
    
    // Split by comma and "and", filtering out standalone "and"
    const cities = citiesText
      .split(/,\s*and\s+|,\s*/)
      .map(c => c.trim())
      .filter(c => c && c.length > 1 && c.toLowerCase() !== 'and');
    
    if (cities.length > 0) {
      const daysPerCity = Math.floor(totalDuration / cities.length);
      const remainder = totalDuration % cities.length;
      
      cities.forEach((city, index) => {
        const cityDays = daysPerCity + (index < remainder ? 1 : 0);
        // Validate destination before adding
        const validation = validateDestination(city, cityDays);
        if (validation.isValid) {
          destinations.push({
            name: validation.cleanedName,
            days: cityDays,
            duration: cityDays,
            durationText: `${cityDays} days`,
            order: index + 1
          });
        }
      });
      
      logger.info('AI', 'Parsed Plan+Visit pattern with cities', { 
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
      });
    }
  }

  // Special handling for "Include X, Y, and Z" pattern
  // E.g. "Plan a 10-day trip from San Francisco to Southeast Asia. Include Bangkok, Singapore, and Bali."
  const includeMatch = input.match(/(?:include|Include)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)*(?:,?\s*and\s+[A-Z][a-zA-Z\s]+)?)/i);
  if (includeMatch && destinations.length === 0) {
    const citiesText = includeMatch[1];
    // Split by comma and "and", allowing for multi-word city names
    const cities = citiesText
      .split(/,\s*and\s+|,\s*/)
      .map(c => c.trim())
      .filter(c => c && c.length > 1 && c.toLowerCase() !== 'and');
    
    // Look for duration in the full input
    const durationMatch = input.match(/(\d+)[\s-]*(?:days?|weeks?)/i);
    let totalDuration = 7; // default
    if (durationMatch) {
      totalDuration = parseDuration(durationMatch[0]);
    }
    
    if (cities.length > 0) {
      const daysPerCity = Math.floor(totalDuration / cities.length);
      const remainder = totalDuration % cities.length;
      
      cities.forEach((city, index) => {
        const cityDays = daysPerCity + (index < remainder ? 1 : 0);
        // Validate destination before adding
        const validation = validateDestination(city, cityDays);
        if (validation.isValid) {
          destinations.push({
            name: validation.cleanedName,
            days: cityDays,
            duration: cityDays,
            durationText: `${cityDays} days`,
            order: index + 1
          });
        }
      });
      
      logger.info('AI', 'Parsed Include pattern with cities', { 
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
      });
    }
  }

  // Special handling for "Visit X, Y, and Z" pattern (capital V) - TEMPORARILY DISABLED
  // "Visit Tokyo, Kyoto, and Osaka" or "Visit London, Paris, Rome, and Barcelona"
  // Now handles multi-word city names like "Buenos Aires", "Rio de Janeiro"
  // Fixed to stop at temporal or sequential indicators
  const visitCitiesMatch = false && input.match(/(?:visit|Visit)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)*(?:,?\s*and\s+[A-Z][a-zA-Z\s]+)?)(?=\s*(?:for|from|then|after|next|,|\.|$))/i);
  if (visitCitiesMatch && destinations.length === 0) {
    const citiesText = visitCitiesMatch[1];
    // Split by comma and "and", allowing for multi-word city names
    const cities = citiesText
      .split(/,\s*and\s+|,\s*/)
      .map(c => c.trim())
      .filter(c => c && c.length > 1 && c.toLowerCase() !== 'and');
    
    // Look for duration in the full input
    const durationMatch = input.match(/(\d+\s*(?:days?|weeks?))/i);
    let totalDuration = 7; // default
    if (durationMatch) {
      totalDuration = parseDuration(durationMatch[1]);
    }
    
    if (cities.length > 0) {
      const daysPerCity = Math.floor(totalDuration / cities.length);
      const remainder = totalDuration % cities.length;
      
      cities.forEach((city, index) => {
        const cityDays = daysPerCity + (index < remainder ? 1 : 0);
        // Validate destination before adding
        const validation = validateDestination(city, cityDays);
        if (validation.isValid) {
          destinations.push({
            name: validation.cleanedName,
            days: cityDays,
            duration: cityDays,
            durationText: `${cityDays} days`,
            order: index + 1
          });
        }
      });
      
      logger.info('AI', 'Parsed Visit pattern with cities', { 
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
      });
    }
  }

  // Special handling for "across" and "visiting" patterns with multiple cities
  // "2 weeks across London, Paris, Rome, and Barcelona"
  const acrossMatch = input.match(/(\d+\s*(?:days?|weeks?))\s+(?:across|visiting|in)\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|starting|\.|$))/i);
  if (acrossMatch && destinations.length === 0) {
    const totalDuration = parseDuration(acrossMatch[1]);
    let citiesText = acrossMatch[2].trim();
    
    // Remove any trailing 'from ...' or 'starting ...' that got captured
    citiesText = citiesText.replace(/\s+(?:from|starting)\s+.*$/i, '');
    
    // Split by comma and "and"
    const cities = citiesText.split(/,\s*(?:and\s+)?|\s+and\s+/).map(c => c.trim()).filter(c => c && c.length > 1 && c.toLowerCase() !== 'and');
    
    if (cities.length > 0) {
      const daysPerCity = Math.floor(totalDuration / cities.length);
      const remainder = totalDuration % cities.length;
      
      cities.forEach((city, index) => {
        const cityDays = daysPerCity + (index < remainder ? 1 : 0);
        // Validate destination before adding
        const validation = validateDestination(city, cityDays);
        if (validation.isValid) {
          destinations.push({
            name: validation.cleanedName,
            days: cityDays,
            duration: cityDays,
            durationText: `${cityDays} days`,
            order: index + 1
          });
        }
      });
      
      logger.info('AI', 'Parsed multi-city trip', { 
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
      });
    }
  }

  // Handle "exploring" patterns (including multi-destination)
  // "Two weeks exploring Hawaii, Fiji, and New Zealand"
  const exploringMatch = input.match(/((?:\d+|two|three|four)\s*(?:days?|weeks?))\s+exploring\s+([A-Z][a-zA-Z\s,]+?)\s*(?:from|\.|$)/i);
  if (exploringMatch && destinations.length === 0) {
    const totalDuration = parseDuration(exploringMatch[1]);
    let citiesText = exploringMatch[2].trim();
    
    // Remove any trailing 'from ...' that got captured
    citiesText = citiesText.replace(/\s+from\s+.*$/i, '');
    
    // Check if it's a list of cities or a single region
    if (citiesText.includes(',') || citiesText.toLowerCase().includes(' and ')) {
      // Multiple cities listed
      const cities = citiesText
        .split(/,\s*and\s+|,\s*|\s+and\s+/)
        .map(c => c.trim())
        .filter(c => c && c.length > 1 && c.toLowerCase() !== 'and');
      
      if (cities.length > 0) {
        const daysPerCity = Math.floor(totalDuration / cities.length);
        const remainder = totalDuration % cities.length;
        
        cities.forEach((city, index) => {
          const cityDays = daysPerCity + (index < remainder ? 1 : 0);
          destinations.push({
            name: city,
            days: cityDays,
            duration: cityDays,
            durationText: `${cityDays} days`,
            order: index + 1
          });
        });
        
        logger.info('AI', 'Parsed exploring pattern with cities', { 
          cities: cities.length, 
          totalDays: totalDuration,
          destinations: cities 
        });
      }
    } else {
      // Single region - use region mapping
      const region = citiesText;
      const regionMap: Record<string, string[]> = {
        'Europe': ['London', 'Paris', 'Rome', 'Barcelona', 'Amsterdam'],
        'Asia': ['Tokyo', 'Bangkok', 'Singapore', 'Hong Kong', 'Seoul'],
        'America': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco'],
      };
      
      const cities = regionMap[region] || [region];
      const daysPerCity = Math.floor(totalDuration / cities.length);
      const remainder = totalDuration % cities.length;
      
      cities.forEach((city, index) => {
        const cityDays = daysPerCity + (index < remainder ? 1 : 0);
        destinations.push({
          name: city,
          days: cityDays,
          duration: cityDays,
          durationText: `${cityDays} days`,
          order: index + 1
        });
      });
      
      logger.info('AI', 'Parsed region exploration', { 
        region,
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
      });
    }
  }

  // Special handling for "visiting X, Y, Z" pattern without explicit duration per city
  // "30 days visiting Buenos Aires, Santiago, Lima, Cusco, and Rio de Janeiro"
  const visitingMatch = input.match(/(\d+\s*(?:days?|weeks?))\s+visiting\s+([A-Z][a-zA-Z\s,]+?)\s*(?:from|\.|$)/i);
  if (visitingMatch && destinations.length === 0) {
    const totalDuration = parseDuration(visitingMatch[1]);
    let citiesText = visitingMatch[2].trim();
    
    // Remove any trailing 'from ...' that got captured
    citiesText = citiesText.replace(/\s+from\s+.*$/i, '');
    
    const cities = citiesText
      .split(/,\s*and\s+|,\s*/)
      .map(c => c.trim())
      .filter(c => c && c.length > 1 && c.toLowerCase() !== 'and');
    
    if (cities.length > 0) {
      const daysPerCity = Math.floor(totalDuration / cities.length);
      const remainder = totalDuration % cities.length;
      
      cities.forEach((city, index) => {
        const cityDays = daysPerCity + (index < remainder ? 1 : 0);
        // Validate destination before adding
        const validation = validateDestination(city, cityDays);
        if (validation.isValid) {
          destinations.push({
            name: validation.cleanedName,
            days: cityDays,
            duration: cityDays,
            durationText: `${cityDays} days`,
            order: index + 1
          });
        }
      });
      
      logger.info('AI', 'Parsed visiting pattern', { 
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
      });
    }
  }
  
  // Handle sequential destinations with "then" or "after"
  // E.g., "one week in Seoul, then visit Tokyo for a week"
  // E.g., "5 days in Paris, then 3 days in Rome"
  const sequentialPattern = /(\d+\s*(?:days?|weeks?)|one\s+week|a\s+week)\s+in\s+([A-Z][a-zA-Z\s]+?)(?:,?\s*(?:then|after\s+that|afterwards?|followed\s+by))/gi;
  const matches = [...input.matchAll(sequentialPattern)];
  
  if (matches.length > 0 && destinations.length === 0) {
    // First, extract all the "then" parts
    let remainingText = input;
    
    for (const match of matches) {
      const duration = parseDuration(match[1]);
      const city = match[2].trim();
      
      const validation = validateDestination(city, duration);
      if (validation.isValid) {
        destinations.push({
          name: validation.cleanedName,
          days: duration,
          duration: duration,
          durationText: match[1],
          order: destinations.length + 1
        });
      }
      
      // Remove the matched part to find what comes after "then"
      const matchEnd = match.index! + match[0].length;
      remainingText = input.substring(matchEnd);
    }
    
    // Now look for the destination after the last "then/after"
    // Try multiple patterns to extract the city name cleanly
    const afterPatterns = [
      /(?:i\s+want\s+to\s+)?(?:visit|go\s+to|spend\s+time\s+in)\s+([A-Z][a-zA-Z\s]+?)\s+for\s+(\d+\s*(?:days?|weeks?)|one\s+week|a\s+week)/i,
      /([A-Z][a-zA-Z\s]+?)\s+for\s+(\d+\s*(?:days?|weeks?)|one\s+week|a\s+week)/i,
      /(\d+\s*(?:days?|weeks?)|one\s+week|a\s+week)\s+in\s+([A-Z][a-zA-Z\s]+?)(?:\s|$)/i,
    ];
    
    for (const pattern of afterPatterns) {
      const afterMatch = remainingText.match(pattern);
      if (afterMatch) {
        // Check which group has the city (pattern 3 has it in group 2)
        const cityGroup = pattern.source.includes('in\\s+([A-Z]') ? 2 : 1;
        const durationGroup = cityGroup === 2 ? 1 : 2;
        
        const city = afterMatch[cityGroup].trim();
        const duration = parseDuration(afterMatch[durationGroup]);
        
        const validation = validateDestination(city, duration);
        if (validation.isValid) {
          destinations.push({
            name: validation.cleanedName,
            days: duration,
            duration: duration,
            durationText: afterMatch[durationGroup],
            order: destinations.length + 1
          });
          break; // Found valid destination, stop looking
        }
      }
    }
    
    if (destinations.length > 0) {
      logger.info('AI', 'Parsed sequential destinations with then/after', {
        count: destinations.length,
        destinations: destinations.map(d => `${d.name} (${d.days} days)`)
      });
    }
  }
  
  // Extract all destinations using existing patterns if we haven't found any yet
  let order = destinations.length + 1;
  const foundDestinations = new Set<string>();
  
  // Skip pattern matching if we already have destinations from special handling
  if (destinations.length === 0) {
    for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      let destination = '';
      let durationText = '';
      
      // Check pattern type based on structure
      // Handle multi-destination pattern with 4 groups
      if (match[4]) {
        // This is the "X days in City and Y days in City2" pattern
        // We'll handle this separately, skip in main loop
        continue;
      }
      // Handle comma-separated cities pattern - "3 days in London, Paris, Rome"
      else if (pattern.source.includes('(?:,\\s*[A-Z]') && match[2] && match[2].includes(',')) {
        durationText = match[1];
        const citiesText = match[2];
        const sharedDuration = parseDuration(durationText);
        
        // Split cities and distribute duration
        const cities = citiesText.split(',').map(c => c.trim()).filter(c => c && c.length > 1);
        const daysPerCity = Math.floor(sharedDuration / cities.length);
        const remainder = sharedDuration % cities.length;
        
        cities.forEach((city, index) => {
          const cityDays = daysPerCity + (index < remainder ? 1 : 0);
          if (!foundDestinations.has(city.toLowerCase())) {
            foundDestinations.add(city.toLowerCase());
            destinations.push({
              name: city,
              days: cityDays,
              duration: cityDays,
              durationText: `${cityDays} days`,
              order: order++
            });
          }
        });
        continue; // Skip normal processing for this match
      }
      // Patterns with duration first (e.g., "3 days in London", "weekend in Paris", "weekend trip to Paris")
      // Check for patterns that have duration in first group and destination in second
      else if (pattern.source.includes(')\\s+in\\s+') || 
          pattern.source.includes('weekend)\\s+in') ||
          pattern.source.includes('weekend)\\s+trip\\s+to') ||
          pattern.source.includes('days?)\\s+trip\\s+to') ||
          pattern.source.includes('spend') ||
          pattern.source.includes('want')) {
        durationText = match[1];
        destination = match[2];
      } 
      // Patterns with destination first (e.g., "visit London for 3 days")
      else if (match[2]) {
        destination = match[1];
        durationText = match[2];
      } 
      // Patterns with destination only
      else {
        destination = match[1];
        durationText = '';
      }
      
      destination = destination.trim().replace(/,$/, '');
      
      // Skip invalid or duplicate destinations
      if (!destination || destination.length < 2) continue;
      if (foundDestinations.has(destination.toLowerCase())) continue;
      if (destination.toLowerCase() === origin.toLowerCase()) continue;
      if (destination.toLowerCase() === returnTo.toLowerCase() && destination !== '') continue;
      
      // Handle weekend specially
      const actualDuration = durationText.toLowerCase() === 'weekend' ? 2 : 
                            (durationText ? parseDuration(durationText) : 7);
      
      // Validate destination with new validation function
      const validation = validateDestination(destination, actualDuration);
      if (!validation.isValid) {
        logger.warn('AI', `Skipping invalid destination: ${destination} (confidence: ${validation.confidence})`);
        continue;
      }
      
      foundDestinations.add(validation.cleanedName.toLowerCase());
      
      destinations.push({
        name: validation.cleanedName,
        days: actualDuration,
        duration: actualDuration,
        durationText: durationText || 'unspecified (7 days assumed)',
        order: order++
      });
    }
  }
  }  // Close the if statement for pattern matching

  // FALLBACK CASCADE: If no destinations were found with patterns, try multiple fallback strategies
  if (destinations.length === 0) {
    logger.info('AI', 'No destinations found with primary patterns, trying fallback strategies');
    
    // Fallback 1: Simple destination patterns
    const fallbackPatterns = [
      // Prioritize "trip to X" patterns first
      /(?:trip|travel|go)\s+to\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|for|next|in\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|,|\.|$))/i,
      /(?:i\s+want\s+to\s+go\s+to|going\s+to)\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|for|next|in\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|,|\.|$))/i,
      // Then "to X" patterns - but exclude months
      /(?:to|visit|explore)\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|for|next|in\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|,|\.|$))/i,
      // Standalone country/city at start followed by time info
      /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:in\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|next|for)/i,
      // Last resort - any capitalized word, but avoid months
      /(?:^|\s)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)(?!\s+(?:January|February|March|April|May|June|July|August|September|October|November|December))(?:\s+(?:for|in)\s+\d+\s*days?)?(?=\s*(?:from|,|\.|$))/i,
    ];
    
    for (const pattern of fallbackPatterns) {
      const match = input.match(pattern);
      if (match) {
        const destination = match[1].trim().replace(/,$/, '');
        const durationMatch = input.match(/(\d+\s*(?:days?|weeks?)|a\s+week|one\s+week|weekend)/i);
        const durationText = durationMatch ? durationMatch[0] : 'one week';
        const duration = parseDuration(durationText);
        
        const validation = validateDestination(destination, duration);
        if (validation.isValid) {
          destinations.push({
            name: validation.cleanedName,
            days: duration,
            duration: duration,
            durationText: durationText,
            order: 1
          });
          logger.info('AI', `Fallback extraction successful: ${validation.cleanedName} (${duration} days)`);
          break;
        }
      }
    }
    
    // Fallback 2: Extract any capitalized words that might be cities
    if (destinations.length === 0) {
      const capitalizedWords = input.match(/\b[A-Z][a-zA-Z]{2,}\b/g);
      if (capitalizedWords) {
        for (const word of capitalizedWords) {
          // Check if this word is part of the origin (e.g., "New" in "New York")
          if (origin && origin.toLowerCase().includes(word.toLowerCase())) {
            continue;
          }
          const validation = validateDestination(word, 7);
          if (validation.isValid && validation.confidence > 0.6) {
            destinations.push({
              name: validation.cleanedName,
              days: 7,
              duration: 7,
              durationText: 'one week (assumed)',
              order: 1
            });
            logger.info('AI', `Fallback word extraction: ${validation.cleanedName}`);
            break;
          }
        }
      }
    }
  }

  // Calculate total days
  let totalDays = destinations.reduce((sum, dest) => sum + dest.duration, 0);
  
  // Only default to 7 days if we have destinations but no explicit duration
  // If no destinations were found, keep totalDays as 0
  if(totalDays === 0 && destinations.length > 0) {
    logger.warn('AI', 'Total days calculated is 0, defaulting to 7');
    totalDays = 7;
  }

  const result: ParsedTrip = {
    origin,
    destinations,
    returnTo,
    totalDays
  };
  
  logger.info('AI', 'Destination parsing complete', {
    origin: result.origin,
    destinationCount: result.destinations.length,
    destinations: result.destinations.map(d => `${d.name} (${d.duration} days)`),
    returnTo: result.returnTo,
    totalDays: result.totalDays
  });
  
  return result;
}


/**
 * Convert parsed trip to structured prompt for AI
 */
export function buildStructuredPrompt(parsedTrip: ParsedTrip, originalPrompt: string): string {
  let structuredPrompt = `Generate a ${parsedTrip.totalDays}-day travel itinerary with the following structure:\n\n`;
  
  if (parsedTrip.origin) {
    structuredPrompt += `DEPARTURE: From ${parsedTrip.origin}\n`;
  }
  
  structuredPrompt += `\nDESTINATIONS (in order):\n`;
  parsedTrip.destinations.forEach((dest, idx) => {
    structuredPrompt += `${idx + 1}. ${dest.name}: ${dest.duration} days\n`;
    if (idx < parsedTrip.destinations.length - 1) {
      structuredPrompt += `   [Travel day between cities]\n`;
    }
  });
  
  if (parsedTrip.returnTo) {
    structuredPrompt += `\nRETURN: To ${parsedTrip.returnTo}\n`;
  }
  
  structuredPrompt += `\nTOTAL TRIP LENGTH: ${parsedTrip.totalDays} days\n`;
  structuredPrompt += `\nORIGINAL REQUEST: ${originalPrompt}\n`;
  structuredPrompt += `\nIMPORTANT: You MUST include ALL ${parsedTrip.destinations.length} destinations listed above in the exact order and duration specified.`;
  
  return structuredPrompt;
}
