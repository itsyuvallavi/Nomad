/**
 * Progressive Itinerary Generator
 * Generates itineraries in steps to prevent timeouts and provide better UX
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Types for progressive generation
export interface TripMetadata {
  title: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  duration: number;
  daysPerCity?: number[];
  estimatedCost?: {
    total: number;
    currency: string;
  };
  quickTips?: string[];
  photos?: string[];
}

export interface CityItinerary {
  city: string;
  startDay: number;
  endDay: number;
  days: DayPlan[];
}

export interface DayPlan {
  day: number;
  date: string;
  city: string;
  title: string;
  activities: Activity[];
  weather?: string;
}

export interface Activity {
  time: string;
  description: string;
  category: string;
  duration?: string;
  tips?: string;
  // These will be added during enrichment
  address?: string;
  venueName?: string;
  coordinates?: { lat: number; lng: number };
}

export class ProgressiveGenerator {
  private openai: OpenAI | null = null;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable or pass it to constructor.');
      }
      this.openai = new OpenAI({
        apiKey: this.apiKey,
      });
    }
    return this.openai;
  }

  /**
   * Step 1: Generate just the metadata (fast - 1-2 seconds)
   */
  async generateMetadata(params: {
    destinations: string[];
    duration: number;
    startDate: string;
    preferences?: any;
  }): Promise<TripMetadata> {
    const startTime = Date.now();
    logger.info('AI', 'Generating trip metadata', {
      destinations: params.destinations,
      duration: params.duration
    });

    // Quick metadata generation without AI for speed
    const endDate = this.calculateEndDate(params.startDate, params.duration);
    const daysPerCity = this.distributeDays(params.duration, params.destinations.length);

    const metadata: TripMetadata = {
      title: `${params.destinations.join(' & ')} Adventure`,
      destinations: params.destinations,
      startDate: params.startDate,
      endDate: endDate,
      duration: params.duration,
      daysPerCity: daysPerCity,
      estimatedCost: {
        total: Math.round(params.duration * 250), // Rough estimate: $250/day
        currency: 'USD'
      },
      quickTips: this.getQuickTips(params.destinations),
      photos: params.destinations.map(dest =>
        `https://source.unsplash.com/1200x800/?${encodeURIComponent(dest)}+tourism`
      )
    };

    const elapsed = Date.now() - startTime;
    logger.info('AI', 'Metadata generated instantly', { time: `${elapsed}ms` });

    return metadata;
  }

  /**
   * Step 2: Generate itinerary for a single city (3-5 seconds per city)
   */
  async generateCityItinerary(params: {
    city: string;
    days: number;
    startDate: string;
    startDayNumber: number;
    preferences?: any;
  }): Promise<CityItinerary> {
    const startTime = Date.now();
    logger.info('AI', 'Generating city itinerary', {
      city: params.city,
      days: params.days
    });

    const prompt = `Create EXACTLY ${params.days} days itinerary for ${params.city}.
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

    try {
      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Generate detailed day-by-day itinerary. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content?.trim();
      if (!content) throw new Error('No response from AI');

      // Parse JSON with error handling
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse AI response');
        }
      }

      // Ensure all days have the city field
      if (parsed.days) {
        parsed.days = parsed.days.map(day => ({
          ...day,
          city: day.city || params.city // Ensure city field exists
        }));
      }

      // Validate we got the right number of days
      if (parsed.days && parsed.days.length < params.days) {
        logger.warn('AI', `Got ${parsed.days.length} days instead of ${params.days} for ${params.city}, filling missing days`);

        // Fill in missing days with basic structure
        const existingDays = parsed.days.length;
        for (let i = existingDays; i < params.days; i++) {
          const dayNumber = params.startDayNumber + i;
          const dayDate = this.getNextDate(params.startDate, i);

          parsed.days.push({
            day: dayNumber,
            date: dayDate,
            city: params.city,  // Add city field
            title: `Day ${dayNumber} - ${params.city}`,
            activities: [
              { time: "09:00", description: `Explore ${params.city} neighborhoods`, category: "Leisure", duration: "2 hours" },
              { time: "11:00", description: `Visit local market or museum`, category: "Attraction", duration: "1.5 hours" },
              { time: "12:30", description: `Lunch at local restaurant`, category: "Food", duration: "1 hour" },
              { time: "14:00", description: `Walking tour of ${params.city}`, category: "Attraction", duration: "2 hours" },
              { time: "16:00", description: `Coffee break and relax`, category: "Leisure", duration: "1 hour" },
              { time: "19:00", description: `Dinner in ${params.city}`, category: "Food", duration: "1.5 hours" }
            ]
          });
        }
      }

      const cityItinerary: CityItinerary = {
        city: params.city,
        startDay: params.startDayNumber,
        endDay: params.startDayNumber + params.days - 1,
        days: parsed.days || []
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
   * Step 3: Combine all city itineraries into final format
   */
  combineCityItineraries(metadata: TripMetadata, cityItineraries: CityItinerary[]) {
    console.log(`📊 [combineCityItineraries] Combining ${cityItineraries.length} cities`);
    cityItineraries.forEach(city => {
      console.log(`  - ${city.city}: ${city.days.length} days (day ${city.startDay} to ${city.endDay})`);
    });

    const allDays = cityItineraries
      .flatMap(city => city.days)
      .sort((a, b) => a.day - b.day);

    console.log(`📊 [combineCityItineraries] Total days after combining: ${allDays.length}`);

    return {
      destination: metadata.destinations.join(', '),
      title: metadata.title,
      itinerary: allDays.map(day => ({
        title: day.title || `Day ${day.day} - ${day.city}`,
        day: day.day,
        date: day.date,
        activities: day.activities.map(act => ({
          time: act.time,
          description: act.description,
          category: act.category,
          address: act.address || 'Address not available',
          venue_name: act.venueName,
          rating: undefined,
          _tips: act.tips
        })),
        weather: day.weather || 'Check local forecast'
      })),
      quickTips: metadata.quickTips || [],
      cost: metadata.estimatedCost
    };
  }

  /**
   * Helper: Distribute days evenly across cities
   */
  private distributeDays(totalDays: number, cityCount: number): number[] {
    const baseDays = Math.floor(totalDays / cityCount);
    const remainder = totalDays % cityCount;
    const distribution = Array(cityCount).fill(baseDays);

    // Add remainder days to first cities
    for (let i = 0; i < remainder; i++) {
      distribution[i]++;
    }

    return distribution;
  }

  /**
   * Helper: Get quick tips for destinations
   */
  private getQuickTips(destinations: string[]): string[] {
    const tips: string[] = [];

    // Add specific tips based on destinations
    if (destinations.some(d => d.toLowerCase().includes('london'))) {
      tips.push('Get an Oyster card for London transport');
    }
    if (destinations.some(d => d.toLowerCase().includes('paris'))) {
      tips.push('Book Eiffel Tower tickets in advance');
    }
    if (destinations.some(d => d.toLowerCase().includes('brussels'))) {
      tips.push('Try authentic Belgian waffles and chocolate');
    }

    // Add general tips
    tips.push('Check visa requirements for your nationality');
    tips.push('Get travel insurance before departure');

    return tips.slice(0, 4); // Return max 4 tips
  }

  /**
   * Helper: Calculate end date
   */
  private calculateEndDate(startDate: string, duration: number): string {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration - 1);
    return end.toISOString().split('T')[0];
  }

  /**
   * Helper: Get next date
   */
  private getNextDate(currentDate: string, daysToAdd: number): string {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }

  /**
   * Main progressive generation flow
   */
  async generateProgressive(params: {
    destinations: string[];
    duration: number;
    startDate: string;
    preferences?: any;
    onProgress?: (update: any) => void | Promise<void>;
  }) {
    const updates: any[] = [];
    console.log('🚀 [ProgressiveGenerator] Starting generation for:', params.destinations);

    // Step 1: Generate metadata (fast)
    console.log('📊 [ProgressiveGenerator] Generating metadata...');
    const metadata = await this.generateMetadata(params);
    console.log('✅ [ProgressiveGenerator] Metadata generated:', { title: metadata.title, days: metadata.daysPerCity });

    if (params.onProgress) {
      console.log('📤 [ProgressiveGenerator] Sending metadata update to callback...');
      // Don't await - let generation continue while callback processes
      params.onProgress({
        type: 'metadata',
        data: metadata,
        progress: 20
      });
      console.log('✅ [ProgressiveGenerator] Metadata callback triggered, continuing generation...');
    }
    updates.push({ type: 'metadata', data: metadata });

    // Step 2: Generate each city
    const cityItineraries: CityItinerary[] = [];
    let currentDate = params.startDate;
    let currentDay = 1;

    console.log(`📍 [ProgressiveGenerator] Processing ${params.destinations.length} cities: ${params.destinations.join(', ')}`);

    for (let i = 0; i < params.destinations.length; i++) {
      const city = params.destinations[i];
      const daysForCity = metadata.daysPerCity?.[i] ||
        Math.floor(params.duration / params.destinations.length);

      console.log(`🏙️ [ProgressiveGenerator] City ${i + 1}/${params.destinations.length}: ${city} (${daysForCity} days)...`);
      console.log(`📅 [ProgressiveGenerator] Start date: ${currentDate}, Start day: ${currentDay}`);

      try {
        const cityItinerary = await this.generateCityItinerary({
          city,
          days: daysForCity,
          startDate: currentDate,
          startDayNumber: currentDay,
          preferences: params.preferences
        });
        console.log(`✅ [ProgressiveGenerator] ${city} itinerary generated with ${cityItinerary.days.length} days`);

        if (cityItinerary.days.length !== daysForCity) {
          console.warn(`⚠️ [ProgressiveGenerator] ${city} expected ${daysForCity} days but got ${cityItinerary.days.length}`);
        }

        cityItineraries.push(cityItinerary);

        // Update progress
        const progressPercent = 20 + ((i + 1) / params.destinations.length) * 60;
        if (params.onProgress) {
          console.log(`📤 [ProgressiveGenerator] Sending ${city} update to callback...`);
          // Don't await - let generation continue
          params.onProgress({
            type: 'city_complete',
            city,
            data: cityItinerary,
            progress: progressPercent
          });
          console.log(`✅ [ProgressiveGenerator] ${city} callback triggered, continuing...`);
        }
        updates.push({ type: 'city_complete', city, data: cityItinerary });
      } catch (cityError) {
        console.error(`❌ [ProgressiveGenerator] Failed to generate ${city}:`, cityError);
        throw new Error(`Failed to generate itinerary for ${city}: ${cityError.message}`);
      }

      // Move to next city's dates
      currentDate = this.getNextDate(currentDate, daysForCity);
      currentDay += daysForCity;
      console.log(`🔄 [ProgressiveGenerator] Moving to next city. Next date: ${currentDate}, Next day: ${currentDay}`);
    }
    console.log(`🏁 [ProgressiveGenerator] Finished processing all ${params.destinations.length} cities`);

    // Step 3: Combine into final itinerary
    console.log('📦 [ProgressiveGenerator] Combining all city itineraries...');
    const finalItinerary = this.combineCityItineraries(metadata, cityItineraries);
    console.log(`✅ [ProgressiveGenerator] Final itinerary ready with ${finalItinerary.itinerary.length} total days`);

    if (params.onProgress) {
      console.log('📤 [ProgressiveGenerator] Sending complete update...');
      // Don't await - let it process asynchronously
      params.onProgress({
        type: 'complete',
        data: finalItinerary,
        progress: 100
      });
    }

    console.log('🎉 [ProgressiveGenerator] Generation complete, returning itinerary');
    return {
      itinerary: finalItinerary,
      updates
    };
  }
}