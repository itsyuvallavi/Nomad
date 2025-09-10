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
  
  // Handle "weekend" specifically as 2 days
  if (text === 'weekend' || text === 'a weekend' || text === 'the weekend') {
    return 2;
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
    'Washington DC', 'New Orleans', 'El Paso', 'Oklahoma City'
  ];
  
  // Check for known cities first - look for "from [City Name]"
  for (const city of knownCities) {
    const regex = new RegExp(`from\\s+${city.replace(' ', '\\s+')}`, 'i');
    if (regex.test(input)) {
      logger.info('AI', 'Extracted known city origin', { origin: city });
      return city;
    }
  }
  
  // Common patterns for origin - expanded to handle more cases
  const patterns = [
    /from\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\s+(?:to|on|in|next|this|for|plan|visit))/i,
    /\s+from\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/i,  // Handle "from X" at end of sentence
    /departing\s+(?:from\s+)?([A-Z][a-zA-Z\s]+?)(?=,|\s+(?:to|on|in|for))/i,
    /leaving\s+(?:from\s+)?([A-Z][a-zA-Z\s]+?)(?=,|\s+(?:to|on|in|for))/i,
    /starting\s+(?:from|in)\s+([A-Z][a-zA-Z\s]+?)(?=,|\s+(?:to|on|in|for))/i,
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
 * Main function to parse destinations from user input
 */
export function parseDestinations(input: string): ParsedTrip {
  logger.info('AI', 'Parsing destinations from user input', { inputLength: input.length });
  
  const origin = extractOrigin(input);
  const returnTo = extractReturn(input) || origin;
  const destinations: ParsedDestination[] = [];
  
  // Patterns to match destinations with durations
  const patterns = [
    // CRITICAL: "3 days in London" - Most common pattern, MUST be first
    // Updated to stop at "from" to avoid capturing origin info
    /(\d+\s*(?:days?|nights?))\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "a week in London" / "one week in London" - stop at "from"
    /((?:a|an|one|two|three|four)\s+weeks?)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "weekend in Paris" - stop at "from"
    /(weekend)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "weekend trip to Paris" - common pattern
    /(weekend)\s+trip\s+to\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "visit Zimbabwe for a week" - more specific to avoid false matches
    /(?:visit|explore)\s+([A-Z][a-zA-Z\s,]+?)\s+for\s+((?:\d+\s*)?(?:days?|weeks?))(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "spend a week in Madagascar"
    /spend\s+([\w\s]+?weeks?|[\w\s]+?days?)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "Zimbabwe for 7 days" - more specific
    /(?:^|[,\s])([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+for\s+(\d+\s*days?)(?=\s*(?:from|,|then|after|and|before|\.|$))/gi,
    // "to Zimbabwe" (without duration) - exclude common phrases
    /(?:travel to|fly to|go to)\s+([A-Z][a-zA-Z\s,]+?)(?=\s+(?:for|from|on|,|\.|$))/gi,
  ];

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
        destinations.push({
          name: city,
          days: cityDays,
          duration: cityDays,
          durationText: `${cityDays} days`,
          order: index + 1
        });
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
        destinations.push({
          name: city,
          days: cityDays,
          duration: cityDays,
          durationText: `${cityDays} days`,
          order: index + 1
        });
      });
      
      logger.info('AI', 'Parsed Include pattern with cities', { 
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
      });
    }
  }

  // Special handling for "Visit X, Y, and Z" pattern (capital V) - ONLY if no destinations yet
  // "Visit Tokyo, Kyoto, and Osaka" or "Visit London, Paris, Rome, and Barcelona"
  // Now handles multi-word city names like "Buenos Aires", "Rio de Janeiro"
  const visitCitiesMatch = input.match(/(?:visit|Visit)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)*(?:,?\s*and\s+[A-Z][a-zA-Z\s]+)?)/i);
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
        destinations.push({
          name: city,
          days: cityDays,
          duration: cityDays,
          durationText: `${cityDays} days`,
          order: index + 1
        });
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
  const acrossMatch = input.match(/(\d+\s*(?:days?|weeks?))\s+(?:across|visiting|in)\s+([A-Z][a-zA-Z\s,]+?)\s*(?:from|\.|$)/i);
  if (acrossMatch && destinations.length === 0) {
    const totalDuration = parseDuration(acrossMatch[1]);
    let citiesText = acrossMatch[2].trim();
    
    // Remove any trailing 'from ...' that got captured
    citiesText = citiesText.replace(/\s+from\s+.*$/i, '');
    
    // Split by comma and "and"
    const cities = citiesText.split(/,\s*(?:and\s+)?|\s+and\s+/).map(c => c.trim()).filter(c => c && c.length > 1 && c.toLowerCase() !== 'and');
    
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
        destinations.push({
          name: city,
          days: cityDays,
          duration: cityDays,
          durationText: `${cityDays} days`,
          order: index + 1
        });
      });
      
      logger.info('AI', 'Parsed visiting pattern', { 
        cities: cities.length, 
        totalDays: totalDuration,
        destinations: cities 
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
      // Patterns with duration first (e.g., "3 days in London", "weekend in Paris", "weekend trip to Paris")
      // Check for patterns that have duration in first group and destination in second
      if (pattern.source.includes(')\\s+in\\s+') || 
          pattern.source.includes('weekend)\\s+in') ||
          pattern.source.includes('weekend)\\s+trip\\s+to') ||
          pattern.source.includes('spend')) {
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
      
      foundDestinations.add(destination.toLowerCase());
      
      // Handle weekend specially
      const actualDuration = durationText.toLowerCase() === 'weekend' ? 2 : 
                            (durationText ? parseDuration(durationText) : 7);
      
      destinations.push({
        name: destination,
        days: actualDuration,
        duration: actualDuration,
        durationText: durationText || 'unspecified (7 days assumed)',
        order: order++
      });
    }
  }
  }  // Close the if statement for pattern matching

  // If no destinations were found with patterns, try a simple extraction
  if (destinations.length === 0) {
    const simpleMatch = input.match(/(?:in|to|visit|explore)\s+([A-Z][a-zA-Z\s,]+)/);
    if (simpleMatch) {
      const durationMatch = input.match(/(\d+\s*days?|a week|one week)/);
      const durationText = durationMatch ? durationMatch[0] : 'one week';
      destinations.push({
        name: simpleMatch[1].trim().replace(/,$/, ''),
        days: parseDuration(durationText),
        duration: parseDuration(durationText),
        durationText: durationText,
        order: 1
      });
    }
  }

  // Calculate total days
  let totalDays = destinations.reduce((sum, dest) => sum + dest.duration, 0);
  
  if(totalDays === 0) {
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
