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
  
  // Handle "a week" or "one week"
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
    return 7; // default to 1 week
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
  // Common patterns for origin
  const patterns = [
    /from\s+([A-Z][a-zA-Z\s,]+?)(?=\s+(?:to|on|in|next|this|for))/i,
    /departing\s+(?:from\s+)?([A-Z][a-zA-Z\s,]+?)(?=\s+(?:to|on|in|for))/i,
    /leaving\s+(?:from\s+)?([A-Z][a-zA-Z\s,]+?)(?=\s+(?:to|on|in|for))/i,
    /starting\s+(?:from|in)\s+([A-Z][a-zA-Z\s,]+?)(?=\s+(?:to|on|in|for))/i,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim().replace(/,$/, '');
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
    // "visit Zimbabwe for a week"
    /(?:visit|plan|trip to|explore)\s+([A-Z][a-zA-Z\s,]+?)\s+for\s+([\w\s]+?)(?:,|then|after|and|before|\.|$)/gi,
    // "spend a week in Madagascar" / "one week in London"
    /spend\s+([\w\s]+?)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?:,|then|after|and|before|\.|$)/gi,
    /([\w\s]+?week)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?:,|then|after|and|before|\.|$)/gi,
    // "Zimbabwe for 7 days" - be more specific about country names
    /(?:^|[,\s])([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+for\s+([\d\w\s]+?days?)(?:,|then|after|and|before|\.|$)/gi,
    // "3 days in Denmark"
    /([\d\w\s]+?days?)\s+in\s+([A-Z][a-zA-Z\s,]+?)(?:,|then|after|and|before|\.|$)/gi,
    // "to Zimbabwe" (without duration) - exclude common phrases
    /(?:travel to|fly to|go to)\s+([A-Z][a-zA-Z\s,]+?)(?=\s+(?:for|from|on|,|\.|$))/gi,
  ];
  
  // Extract all destinations
  let order = 1;
  const foundDestinations = new Set<string>();
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      let destination = '';
      let durationText = '';
      
      if (pattern.source.includes('spend') || pattern.source.includes('week\\s+in')) {
        durationText = match[1];
        destination = match[2];
      } else if (pattern.source.includes('days?\\s+in')) {
        durationText = match[1];
        destination = match[2];
      } else if (match[2]) {
        destination = match[1];
        durationText = match[2];
      } else {
        destination = match[1];
        durationText = '';
      }
      
      destination = destination.trim().replace(/,$/, '');
      
      if (foundDestinations.has(destination.toLowerCase())) continue;
      if (destination.toLowerCase() === origin.toLowerCase()) continue;
      if (destination.toLowerCase() === returnTo.toLowerCase() && destination !== '') continue;
      
      foundDestinations.add(destination.toLowerCase());
      
      destinations.push({
        name: destination,
        days: durationText ? parseDuration(durationText) : 7,  // Default to 7 days if unspecified
        duration: durationText ? parseDuration(durationText) : 7,
        durationText: durationText || 'unspecified (7 days assumed)',
        order: order++
      });
    }
  }

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
