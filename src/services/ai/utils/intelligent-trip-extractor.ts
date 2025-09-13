/**
 * Intelligent Trip Extractor
 * Uses AI to extract structured trip information from natural language
 * This provides more reliable parsing for complex multi-destination trips
 */

import { openai } from '../openai-config';
import { logger } from '@/lib/logger';

export interface ExtractedDestination {
  city: string;
  country?: string;
  duration: number; // in days
  order: number;
}

export interface ExtractedTripInfo {
  origin: {
    city: string;
    country?: string;
  };
  destinations: ExtractedDestination[];
  returnTo?: {
    city: string;
    country?: string;
  };
  startDate?: string;
  totalDays: number;
  travelStyle?: string;
  budget?: string;
  travelers?: number;
  special_requirements?: string[];
}

/**
 * Extract structured trip information using OpenAI
 * This is more reliable than regex for complex trips
 */
export async function extractTripInfoWithAI(prompt: string): Promise<ExtractedTripInfo> {
  const startTime = Date.now();
  logger.info('AI', 'Extracting trip structure with AI', { promptLength: prompt.length });
  
  const systemPrompt = `You are a travel planning assistant that extracts structured information from natural language trip requests.

Extract the following information and return as JSON:
{
  "origin": {
    "city": "Starting city",
    "country": "Starting country (if mentioned)"
  },
  "destinations": [
    {
      "city": "Destination city name",
      "country": "Country (if different from city)",
      "duration": number (in days),
      "order": number (1, 2, 3, etc.)
    }
  ],
  "returnTo": {
    "city": "Return city (if different from origin)",
    "country": "Return country"
  },
  "startDate": "Extracted date or time period",
  "totalDays": total number of days,
  "travelStyle": "budget/moderate/luxury (if mentioned)",
  "budget": "Specific budget if mentioned",
  "travelers": number of travelers (default 1),
  "special_requirements": ["Any special requirements mentioned"]
}

Important rules:
1. Convert all duration phrases to days: "a week" = 7, "weekend" = 3, "fortnight" = 14
2. If no duration given for a destination, estimate based on context (default 3-5 days)
3. Extract destinations in the order they're mentioned
4. Zimbabwe is a country (capital: Harare)
5. Nicaragua is a country (capital: Managua)
6. Madagascar is a country (capital: Antananarivo)
7. Ethiopia is a country (capital: Addis Ababa)
8. If someone says "visit Denmark", Denmark is the destination
9. Parse "after X then Y" as sequential destinations
10. The total days should be the sum of all destination durations`;

  try {
    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 1000
    });

    const extracted = JSON.parse(completion.choices[0].message.content || '{}');
    
    const duration = Date.now() - startTime;
    logger.info('AI', 'Trip extraction completed', { 
      duration: `${duration}ms`,
      destinationCount: extracted.destinations?.length || 0,
      totalDays: extracted.totalDays
    });
    
    return extracted;
  } catch (error) {
    logger.error('AI', 'Failed to extract trip info with AI', { error });
    throw new Error(`Failed to extract trip information: ${error}`);
  }
}

/**
 * Convert extracted info to a structured prompt for the main AI
 * This creates a clear, unambiguous prompt that the AI can easily process
 */
export function createStructuredPrompt(info: ExtractedTripInfo): string {
  let prompt = `Create a detailed itinerary for the following trip:\n\n`;
  
  // Origin
  prompt += `STARTING FROM: ${info.origin.city}`;
  if (info.origin.country) prompt += `, ${info.origin.country}`;
  prompt += '\n\n';
  
  // Destinations
  prompt += 'DESTINATIONS (in order):\n';
  info.destinations.forEach((dest, index) => {
    prompt += `${index + 1}. ${dest.city}`;
    if (dest.country) prompt += `, ${dest.country}`;
    prompt += ` - ${dest.duration} days\n`;
  });
  prompt += '\n';
  
  // Return
  if (info.returnTo) {
    prompt += `RETURNING TO: ${info.returnTo.city}`;
    if (info.returnTo.country) prompt += `, ${info.returnTo.country}`;
    prompt += '\n\n';
  }
  
  // Additional details
  if (info.startDate) {
    prompt += `TRAVEL DATES: Starting ${info.startDate}\n`;
  }
  prompt += `TOTAL DURATION: ${info.totalDays} days\n`;
  
  if (info.travelers && info.travelers > 1) {
    prompt += `NUMBER OF TRAVELERS: ${info.travelers}\n`;
  }
  
  if (info.travelStyle) {
    prompt += `TRAVEL STYLE: ${info.travelStyle}\n`;
  }
  
  if (info.budget) {
    prompt += `BUDGET: ${info.budget}\n`;
  }
  
  if (info.special_requirements && info.special_requirements.length > 0) {
    prompt += `SPECIAL REQUIREMENTS: ${info.special_requirements.join(', ')}\n`;
  }
  
  prompt += '\nPlease create a day-by-day itinerary with activities, dining recommendations, and travel tips for each destination.';
  
  return prompt;
}

/**
 * Fallback regex-based parser for simple trips
 * Used when AI extraction is not available or for simple cases
 */
export function quickExtractDestinations(prompt: string): ExtractedDestination[] {
  const destinations: ExtractedDestination[] = [];
  
  // Common patterns
  const patterns = [
    /(\d+)\s*days?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /visit\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+for\s+(\d+)\s*days?/gi,
    /spend\s+(\d+)\s*days?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+for\s+a\s+week/gi,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const days = match[1] ? parseInt(match[1]) : 7;
      const city = match[2] || match[1];
      
      if (city && !destinations.find(d => d.city === city)) {
        destinations.push({
          city: city.trim(),
          duration: days,
          order: destinations.length + 1
        });
      }
    }
  });
  
  return destinations;
}

/**
 * Main extraction function with fallback
 */
export async function extractTripInfo(
  prompt: string,
  useAI: boolean = true
): Promise<ExtractedTripInfo> {
  // For simple trips or when AI is disabled, use quick extraction
  if (!useAI || prompt.length < 50) {
    const destinations = quickExtractDestinations(prompt);
    
    // Try to find origin
    const originMatch = prompt.match(/from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    const returnMatch = prompt.match(/(?:return|back)\s+(?:home\s+)?to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    
    return {
      origin: {
        city: originMatch ? originMatch[1] : 'Current Location'
      },
      destinations,
      returnTo: returnMatch ? { city: returnMatch[1] } : undefined,
      totalDays: destinations.reduce((sum, d) => sum + d.duration, 0)
    };
  }
  
  // For complex trips, use AI extraction
  return extractTripInfoWithAI(prompt);
}