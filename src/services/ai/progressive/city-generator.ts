/**
 * City Itinerary Generator Module
 * Generates detailed itineraries for individual cities
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { CityItinerary, DayPlan, CityGenerationParams } from '../types/core.types';

export class CityGenerator {
  private openai: OpenAI | null = null;
  private apiKey: string | undefined;

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

    logger.info('AI', 'Generating city itinerary', {
      city: params.city,
      days: params.days
    });

    const prompt = this.buildPrompt(params);

    try {
      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate detailed day-by-day itinerary. Return only valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000
      });

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

      return cityItinerary;

    } catch (error) {
      logger.error('AI', 'Failed to generate city itinerary', error);
      throw error;
    }
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
  private parseResponse(content: string): any {
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
  private validateAndFix(parsed: any, params: CityGenerationParams): any {
    // Ensure all days have the city field
    if (parsed.days) {
      parsed.days = parsed.days.map((day: any) => ({
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