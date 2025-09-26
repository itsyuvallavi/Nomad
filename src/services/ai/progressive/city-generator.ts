/**
 * City Itinerary Generator Module
 * Generates detailed itineraries for individual cities
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { CityItinerary, DayPlan, CityGenerationParams } from '../types/core.types';
import { getTokenConfig, tokenTracker, calculateTokenCost } from '../config/token-limits';

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
      return cached;
    }

    logger.info('AI', 'Generating city itinerary', {
      city: params.city,
      days: params.days,
      cacheHit: false
    });

    const prompt = this.buildPrompt(params);

    try {
      console.log(`🤖 [CityGenerator] Calling OpenAI for ${params.city}...`);

      // Add timeout to prevent hanging - increased to 120s for complex requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Failed to generate itinerary for ${params.city}: OpenAI request timeout after 120s`)), 120000)
      );

      const tokenConfig = getTokenConfig('CITY_GENERATION');
      const apiPromise = this.getOpenAI().chat.completions.create({
        model: tokenConfig.model,
        messages: [
          {
            role: 'system',
            content: 'Generate detailed day-by-day itinerary. Return only valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: tokenConfig.temperature || 0.8,
        max_tokens: tokenConfig.maxTokens
      });

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

IMPORTANT: You MUST generate EXACTLY ${params.days} days. Each day must have a complete set of activities.

Generate ${params.days} days with 5-6 activities per day including:
- Morning activity (9:00-10:00)
- Mid-morning activity (11:00)
- Lunch (12:30-13:00)
- Afternoon activities (14:00, 16:00)
- Evening/dinner (19:00)

Include specific venue names for each activity.

Return a JSON object with EXACTLY ${params.days} days numbered from ${params.startDayNumber} to ${params.startDayNumber + params.days - 1}:
{
  "city": "${params.city}",
  "days": [
    {
      "day": ${params.startDayNumber},
      "date": "${params.startDate}",
      "title": "Day ${params.startDayNumber} - ${params.city}",
      "activities": [
        {
          "time": "09:00",
          "description": "Visit Tower of London",
          "venueName": "Tower of London",
          "category": "Attraction",
          "duration": "2 hours",
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
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Could not parse AI response');
    }
  }

  /**
   * Validate and fix city itinerary
   */
  private validateAndFix(parsed: Partial<CityItinerary>, params: CityGenerationParams): { days: DayPlan[] } {
    // Ensure all days have the city field
    if (parsed.days) {
      parsed.days = parsed.days.map((day: Partial<DayPlan>) => ({
        ...day,
        city: day.city || params.city
      }));
    }

    // Validate we got the right number of days
    if (!parsed.days || parsed.days.length < params.days) {
      const missingCount = params.days - (parsed.days?.length || 0);
      logger.warn('AI', `Missing ${missingCount} days for ${params.city}, generating defaults`);

      parsed.days = parsed.days || [];
      this.addMissingDays(parsed.days, params);
    }

    return parsed;
  }

  /**
   * Add missing days with default activities
   */
  private addMissingDays(days: DayPlan[], params: CityGenerationParams): void {
    const existingDays = days.length;

    for (let i = existingDays; i < params.days; i++) {
      const dayNumber = params.startDayNumber + i;
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