/**
 * City Itinerary Generator Module
 * Generates detailed itineraries for individual cities
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { CityItinerary, DayPlan, CityGenerationParams } from '../types/core.types';
import { getTokenConfig, tokenTracker, calculateTokenCost } from '../config/token-limits';
import { openAIBackoff } from '@/lib/middleware/rate-limiter';
import { getNextDate } from '../utils/date.utils';

interface CityCache {
  key: string;
  result: CityItinerary;
  timestamp: number;
}

export class CityGenerator {
  private openai: OpenAI | null = null;
  private apiKey: string | undefined;
  private cache: Map<string, CityCache> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      this.openai = new OpenAI({ apiKey: this.apiKey });
    }
    return this.openai;
  }

  /**
   * Generate itinerary for a single city
   */
  async generateCityItinerary(params: CityGenerationParams): Promise<CityItinerary> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(params);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('AI', 'City itinerary served from cache', {
        city: params.city,
        days: params.days,
        cacheHit: true
      });

      // CRITICAL: Re-number days even for cached results to ensure sequential numbering
      // This fixes old cached entries that might have wrong day numbers
      const correctedDays = cached.days.map((day, index) => ({
        ...day,
        day: params.startDayNumber + index,
        title: day.title || `Day ${params.startDayNumber + index} - ${params.city}`
      }));

      return {
        ...cached,
        days: correctedDays,
        startDay: params.startDayNumber,
        endDay: params.startDayNumber + params.days - 1
      };
    }

    logger.info('AI', 'Generating city itinerary', {
      city: params.city,
      days: params.days,
      cacheHit: false
    });

    const prompt = this.buildPrompt(params);

    try {
      console.log(`🤖 [CityGenerator] Calling OpenAI for ${params.city}...`);

      // Add timeout to prevent hanging - increased to 240s for complex/multi-day requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Failed to generate itinerary for ${params.city}: OpenAI request timeout after 240s`)), 240000)
      );

      const tokenConfig = getTokenConfig('CITY_GENERATION');

      // Use exponential backoff for OpenAI API calls
      const apiPromise = openAIBackoff.execute(
        () => this.getOpenAI().chat.completions.create({
          model: tokenConfig.model,
          messages: [
            {
              role: 'system',
              content: 'Generate detailed day-by-day itinerary. Return only valid JSON.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: tokenConfig.temperature || 0.8,
          max_tokens: tokenConfig.maxTokens,
          response_format: { type: 'json_object' }
        }),
        (attempt, delay, error) => {
          logger.warn('CityGenerator', `Retrying OpenAI call for ${params.city} (attempt ${attempt})`, {
            delay,
            error: error.message
          });
        }
      );

      const response = await Promise.race([apiPromise, timeoutPromise]) as OpenAI.Chat.Completions.ChatCompletion;
      console.log(`✅ [CityGenerator] OpenAI response received for ${params.city}`);

      // Track token usage
      if (response.usage) {
        const cost = calculateTokenCost(
          tokenConfig.model,
          response.usage.prompt_tokens,
          response.usage.completion_tokens
        );
        tokenTracker.track('CITY_GENERATION', {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens,
          estimatedCost: cost
        });
        logger.debug('AI', 'City generation tokens', {
          city: params.city,
          model: tokenConfig.model,
          tokens: response.usage.total_tokens,
          cost: cost.toFixed(4)
        });
      }

      const content = response.choices[0].message.content?.trim();
      if (!content) throw new Error('No response from AI');

      const parsed = this.parseResponse(content);
      const validated = this.validateAndFix(parsed, params);

      const cityItinerary: CityItinerary = {
        city: params.city,
        startDay: params.startDayNumber,
        endDay: params.startDayNumber + params.days - 1,
        days: validated.days || []
      };

      const elapsed = Date.now() - startTime;
      logger.info('AI', 'City itinerary generated', {
        city: params.city,
        days: cityItinerary.days.length,
        expectedDays: params.days,
        time: `${elapsed}ms`
      });

      // Cache the result
      this.saveToCache(cacheKey, cityItinerary);

      return cityItinerary;

    } catch (error) {
      logger.error('AI', 'Failed to generate city itinerary', error);
      console.error(`❌ [CityGenerator] Error generating ${params.city}:`, error);
      throw error;
    }
  }

  /**
   * Generate cache key for city parameters
   */
  private generateCacheKey(params: CityGenerationParams): string {
    const key = `${params.city}-${params.days}-${params.startDayNumber}`;
    const interests = params.interests?.sort().join(',') || '';
    const budget = params.budget || '';
    return `city:${key}:${interests}:${budget}`.toLowerCase();
  }

  /**
   * Get from cache if valid
   */
  private getFromCache(key: string): CityItinerary | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    console.log(`🎯 [CityGenerator] Cache hit for key: ${key}`);
    return cached.result;
  }

  /**
   * Save to cache
   */
  private saveToCache(key: string, result: CityItinerary): void {
    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now()
    });
    console.log(`💾 [CityGenerator] Cached result for key: ${key}`);

    // Clean old entries if cache grows too large
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.CACHE_TTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  public clearCache(): void {
    this.cache.clear();
    logger.info('AI', 'City generator cache cleared');
  }

  /**
   * Build prompt for city generation
   */
  private buildPrompt(params: CityGenerationParams): string {
    return `Create EXACTLY ${params.days} days itinerary for ${params.city}.
Start date: ${params.startDate}
Start day number: ${params.startDayNumber}

CRITICAL REQUIREMENTS:

1. GEOGRAPHIC ROUTE OPTIMIZATION
   - Activities within each day MUST be geographically close to each other
   - Order activities to create a LOGICAL, EFFICIENT route (no zigzagging across the city)
   - Group activities by neighborhood/area.
   - STRICT NEIGHBORHOOD RULE: EVERY day MUST have a specific "neighborhood" field (e.g., "Downtown" or "West End"). ALL activities plotted for that ONE day MUST physically reside within roughly a ~5km radius of each other in that exact neighborhood.
   - FATAL ERROR if you generate activities on opposite sides of a vast city (e.g., Downtown LA in the morning and Santa Monica in the afternoon) during the same single day.
   - NO backtracking (don't go downtown → north → south → back downtown)
   - Create a smooth flow: Morning area → Move to adjacent area → Evening area nearby

2. REALISTIC TIME ALLOCATION
   - Allocate realistic duration based on activity type:

   FULL DAY activities (6-8 hours):
   - Theme parks, water parks
   - Day trips outside the city

   HALF DAY activities (3-5 hours):
   - Major museums (Louvre, British Museum, etc.)
   - Zoos, aquariums, large parks
   - Beach visits
   - Major hiking trails
   - Shopping districts (if exploring multiple stores)

   2-3 HOUR activities:
   - Mid-size museums/galleries
   - Walking tours
   - Botanical gardens
   - Historic sites

   1-1.5 HOUR activities:
   - Small museums/galleries
   - Churches, temples
   - Markets
   - Viewpoints

   30-45 MINUTE activities:
   - Coffee breaks
   - Quick photo stops
   - Small monuments

   MEALS:
   - Breakfast: 30-45 min
   - Lunch: 1-1.5 hours
   - Dinner: 1.5-2 hours

   - NEVER schedule more than 2-3 major (3+ hour) activities per day
   - Account for travel time between locations (add 15-30 min buffer)
   - Don't overschedule - realistic days only!

3. DAILY STRUCTURE
   - Limit to 4-6 activities per day (including meals)
   - If day has a zoo (4h), museum (3h), it can only fit 2-3 other activities MAX
   - Balance activity intensity (don't stack all major attractions in one day)

CRITICAL: Include specific venue names for each activity in the "venue_name" field (NOT "venueName").
This field is used to search for addresses and coordinates, so be specific (e.g., "Tower of London" not just "Tower").

Return a JSON object with EXACTLY ${params.days} days numbered from ${params.startDayNumber} to ${params.startDayNumber + params.days - 1}:
{
  "city": "${params.city}",
  "days": [
    {
      "day": ${params.startDayNumber},
      "date": "${params.startDate}",
      "title": "Day ${params.startDayNumber} - ${params.city}",
      "neighborhood": "Specific neighborhood name (e.g., 'Beverly Hills & West Hollywood')",
      "activities": [
        {
          "time": "09:00",
          "description": "Visit Tower of London",
          "venue_name": "Tower of London",
          "address": "London EC3N 4AB, UK",
          "category": "Attraction",
          "duration": "2.5 hours",
          "tips": "Book tickets online to skip lines"
        }
      ]
    }${params.days > 1 ? `,
    ... (${params.days - 1} more days with day numbers ${params.startDayNumber + 1} to ${params.startDayNumber + params.days - 1})` : ''}
  ]
}

Categories: Attraction, Food, Leisure, Work, Travel, Accommodation`;
  }

  /**
   * Parse AI response with error handling
   */
  private parseResponse(content: string): Partial<CityItinerary> {
    try {
      return JSON.parse(content);
    } catch (e) {
      console.log('⚠️ Initial JSON parse failed, attempting repair...');

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];

        // Common JSON fixes
        // 1. Remove trailing commas before closing brackets/braces
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

        // 2. Fix unquoted property names (common in malformed JSON)
        jsonStr = jsonStr.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

        // 3. Find the last valid position before error
        try {
          JSON.parse(jsonStr);
        } catch (parseError: any) {
          // Extract position from error message
          const posMatch = parseError.message.match(/position (\d+)/);
          if (posMatch) {
            const errorPos = parseInt(posMatch[1]);
            console.log(`🔍 Error at position ${errorPos}, attempting truncation...`);

            // Find the last complete object before the error
            // Strategy: truncate at the last valid closing of an array element
            let truncatePos = errorPos - 1;
            let depth = 0;

            // Walk backwards to find a safe truncation point
            for (let i = errorPos - 1; i >= 0; i--) {
              const char = jsonStr[i];
              if (char === '}') depth++;
              if (char === '{') depth--;

              // Found a complete object at the right depth
              if (char === '}' && depth === 1) {
                truncatePos = i + 1;
                break;
              }
            }

            // Truncate and close structures
            jsonStr = jsonStr.substring(0, truncatePos);
          }
        }

        // 4. Fix incomplete arrays or objects at the end
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;

        // Add missing closing brackets/braces
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          jsonStr += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          jsonStr += '}';
        }

        try {
          const parsed = JSON.parse(jsonStr);
          console.log('✅ JSON successfully repaired');
          return parsed;
        } catch (e2) {
          console.error('❌ JSON repair failed:', e2);
          console.error('Malformed JSON (first 500 chars):', jsonStr.substring(0, 500));
          console.error('Malformed JSON (last 500 chars):', jsonStr.substring(Math.max(0, jsonStr.length - 500)));
          throw new Error(`Could not parse AI response: ${(e2 as Error).message}`);
        }
      }
      throw new Error('Could not extract JSON from AI response');
    }
  }

  /**
   * Validate and fix city itinerary
   */
  private validateAndFix(parsed: Partial<CityItinerary>, params: CityGenerationParams): { days: DayPlan[] } {
    // Ensure all days have required fields
    if (parsed.days) {
      parsed.days = parsed.days.map((day: Partial<DayPlan>, index: number) => {
        const correctedDay = params.startDayNumber + index;

        // Log if GPT returned wrong day number
        if (day.day && day.day !== correctedDay) {
          console.log(`⚠️ [CityGenerator] GPT returned day ${day.day}, correcting to ${correctedDay} for ${params.city}`);
        }

        return {
          day: correctedDay, // ALWAYS use startDayNumber + index (don't trust GPT's numbering)
          date: day.date ?? getNextDate(params.startDate, index),
          title: day.title ?? `Day ${correctedDay} - ${params.city}`,
          city: day.city || params.city,
          activities: day.activities || [],
          weather: day.weather
        };
      }) as DayPlan[];
    }

    // Validate we got the right number of days
    if (!parsed.days || parsed.days.length < params.days) {
      const missingCount = params.days - (parsed.days?.length || 0);
      logger.warn('AI', `Missing ${missingCount} days for ${params.city}, generating defaults`);

      parsed.days = parsed.days || [];
      this.addMissingDays(parsed.days, params);
    }

    return { days: parsed.days || [] };
  }

  /**
   * Add missing days with default activities
   * CRITICAL: Uses params.startDayNumber to ensure sequential numbering across multi-city trips
   */
  private addMissingDays(days: DayPlan[], params: CityGenerationParams): void {
    const existingDays = days.length;

    for (let i = existingDays; i < params.days; i++) {
      const dayNumber = params.startDayNumber + i; // Sequential numbering from startDayNumber
      const dayDate = this.getNextDate(params.startDate, i);

      days.push({
        day: dayNumber,
        date: dayDate,
        city: params.city,
        title: `Day ${dayNumber} - ${params.city}`,
        activities: this.getDefaultActivities(params.city)
      });
    }
  }

  /**
   * Get default activities for a city
   */
  private getDefaultActivities(city: string) {
    return [
      {
        time: "09:00",
        description: `Explore ${city} neighborhoods`,
        category: "Leisure",
        duration: "2 hours"
      },
      {
        time: "11:00",
        description: `Visit local market or museum`,
        category: "Attraction",
        duration: "1.5 hours"
      },
      {
        time: "12:30",
        description: `Lunch at local restaurant`,
        category: "Food",
        duration: "1 hour"
      },
      {
        time: "14:00",
        description: `Walking tour of ${city}`,
        category: "Attraction",
        duration: "2 hours"
      },
      {
        time: "16:00",
        description: `Coffee break and relax`,
        category: "Leisure",
        duration: "1 hour"
      },
      {
        time: "19:00",
        description: `Dinner in ${city}`,
        category: "Food",
        duration: "1.5 hours"
      }
    ];
  }

  /**
   * Get next date helper
   */
  private getNextDate(currentDate: string, daysToAdd: number): string {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }
}