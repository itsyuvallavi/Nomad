/**
 * AI-powered destination parser using OpenAI
 * This replaces the fragile regex-based parsing with actual language understanding
 */

import { openai, MODEL_CONFIG } from '@/services/ai/openai-config';
import { logger } from '@/lib/logger';

export interface AIParseResult {
  origin?: string;
  destinations: Array<{
    name: string;
    days: number;
  }>;
  totalDays: number;
  startDate?: string;
  error?: string;
}

const PARSE_PROMPT = `You are a travel itinerary parser. Extract travel information from user input.

IMPORTANT: If the input contains conversation history (user: and assistant: messages), combine information from ALL user messages to understand the complete trip request.

Return a JSON object with:
- origin: starting city (optional - empty string "" if not mentioned)
- destinations: array of {name: city/country name, days: number}
- totalDays: sum of all days
- startDate: travel start date in YYYY-MM-DD format (if mentioned, otherwise null)

Rules:
- If user says "next month", use first day of next month from today
- "Weekend" = 3 days  
- "Week" or "one week" = 7 days
- If no duration specified for a destination, assume 7 days
- For sequential trips (using "then", "after", "followed by"), list each destination separately with their individual durations
- For trips "across" multiple cities with total duration, divide the total duration equally among all cities
- Extract actual city/country names, not phrases like "days" or "in days"
- If you see "X days in days" this is likely a typo - return empty destinations array
- Never use "days", "weeks", "months" as destination names
- If origin includes "from" or "departing from", extract just the city name

Examples:
Input: "5 days in Paris, then 3 days in Rome"
Output: {"origin": null, "destinations": [{"name": "Paris", "days": 5}, {"name": "Rome", "days": 3}], "totalDays": 8, "startDate": null}

Input: "From NYC for 2 weeks in Tokyo, then Kyoto for 5 days"
Output: {"origin": "NYC", "destinations": [{"name": "Tokyo", "days": 14}, {"name": "Kyoto", "days": 5}], "totalDays": 19, "startDate": null}

Input: "Weekend trip from LA to Paris next month"
Output: {"origin": "LA", "destinations": [{"name": "Paris", "days": 3}], "totalDays": 3, "startDate": "2025-10-01"}

Input: "2 weeks across London, Paris, Rome, and Barcelona"
Output: {"origin": null, "destinations": [{"name": "London", "days": 4}, {"name": "Paris", "days": 4}, {"name": "Rome", "days": 3}, {"name": "Barcelona", "days": 3}], "totalDays": 14, "startDate": null}

Input: "4 days in days from New York"
Output: {"origin": "New York", "destinations": [], "totalDays": 0, "startDate": null}

Input: "user: I want to visit Seoul for a week then Tokyo for a week\nassistant: Where are you departing from?\nuser: From LA"
Output: {"origin": "LA", "destinations": [{"name": "Seoul", "days": 7}, {"name": "Tokyo", "days": 7}], "totalDays": 14, "startDate": null}`;

export async function parseWithAI(userInput: string): Promise<AIParseResult> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    logger.info('AI', 'Using AI-powered destination parser', { 
      inputLength: userInput.length 
    });

    const response = await openai.chat.completions.create({
      model: MODEL_CONFIG.model,
      messages: [
        { role: 'system', content: PARSE_PROMPT },
        { role: 'user', content: userInput }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed: AIParseResult = JSON.parse(content);
    
    // Validate the response
    if (!parsed.destinations || !Array.isArray(parsed.destinations)) {
      throw new Error('Invalid destinations in parsed response');
    }

    // Calculate total days if not provided
    if (!parsed.totalDays) {
      parsed.totalDays = parsed.destinations.reduce((sum, dest) => sum + dest.days, 0);
    }

    logger.info('AI', 'AI parsing successful', {
      origin: parsed.origin,
      destinationCount: parsed.destinations.length,
      destinations: parsed.destinations.map(d => `${d.name} (${d.days} days)`),
      totalDays: parsed.totalDays
    });

    return parsed;

  } catch (error: any) {
    logger.error('AI', 'AI parsing failed', error);
    
    // Return a fallback empty result
    return {
      destinations: [],
      totalDays: 0,
      error: error.message
    };
  }
}

/**
 * Wrapper to match the existing parseDestinations interface
 */
export async function parseDestinationsWithAI(input: string) {
  const result = await parseWithAI(input);
  
  return {
    origin: result.origin || '',
    destinations: result.destinations.map((dest, index) => ({
      name: dest.name,
      days: dest.days,
      duration: dest.days,
      durationText: `${dest.days} days`,
      order: index + 1
    })),
    returnTo: result.origin || '',
    totalDays: result.totalDays,
    startDate: result.startDate ? new Date(result.startDate) : undefined
  };
}