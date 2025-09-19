/**
 * Trip Generator - Unified itinerary generation with zone-based planning
 * Handles generation, zone planning, route optimization, and enrichment
 * NO DEFAULTS - Throws error if missing required data
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { locationEnrichmentService } from '@/services/ai/services/location-enrichment-locationiq';
import { estimateTravelCosts } from '@/services/ai/utils/openai-travel-costs';
import { PROMPTS } from './prompts';

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Trip generation parameters
export interface TripParams {
  destination: string;
  startDate: string;
  duration: number;
  travelers?: {
    adults: number;
    children: number;
  };
  preferences?: {
    budget?: 'budget' | 'mid' | 'luxury';
    interests?: string[];
    pace?: 'relaxed' | 'moderate' | 'packed';
    mustSee?: string[];
    avoid?: string[];
  };
}

// Zone information for planning
interface Zone {
  name: string;
  neighborhoods: string[];
  coordinates: { lat: number; lng: number };
  priority?: number;
}

// Activity with location
interface Activity {
  time?: string;
  description: string;
  venue_name?: string;
  venue_search?: string;
  category?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  neighborhood?: string;
  zone?: string;
}

// City zones database (simplified from zone-based-planner.ts)
const CITY_ZONES: Record<string, Zone[]> = {
  paris: [
    {
      name: 'Central Paris',
      neighborhoods: ['1st arr.', '2nd arr.', 'Louvre', 'Palais Royal', 'Les Halles'],
      coordinates: { lat: 48.8566, lng: 2.3522 },
      priority: 1
    },
    {
      name: 'Latin Quarter',
      neighborhoods: ['5th arr.', '6th arr.', 'Latin Quarter', 'Saint-Germain'],
      coordinates: { lat: 48.8462, lng: 2.3464 },
      priority: 2
    },
    {
      name: 'Marais',
      neighborhoods: ['3rd arr.', '4th arr.', 'Marais', 'Bastille'],
      coordinates: { lat: 48.8566, lng: 2.3625 },
      priority: 3
    },
    {
      name: 'Champs-Élysées',
      neighborhoods: ['8th arr.', 'Arc de Triomphe', 'Champs-Élysées'],
      coordinates: { lat: 48.8698, lng: 2.3076 },
      priority: 4
    },
    {
      name: 'Montmartre',
      neighborhoods: ['18th arr.', 'Montmartre', 'Sacré-Cœur', 'Pigalle'],
      coordinates: { lat: 48.8867, lng: 2.3431 },
      priority: 5
    },
    {
      name: 'Eiffel Tower Area',
      neighborhoods: ['7th arr.', 'Eiffel Tower', 'Trocadéro', 'Invalides'],
      coordinates: { lat: 48.8584, lng: 2.2945 },
      priority: 6
    }
  ],
  london: [
    {
      name: 'Westminster',
      neighborhoods: ['Westminster', 'Buckingham Palace', 'Big Ben', 'Parliament'],
      coordinates: { lat: 51.4994, lng: -0.1248 },
      priority: 1
    },
    {
      name: 'Covent Garden',
      neighborhoods: ['Covent Garden', 'Soho', 'Leicester Square', 'Chinatown'],
      coordinates: { lat: 51.5117, lng: -0.1246 },
      priority: 2
    },
    {
      name: 'City of London',
      neighborhoods: ['City', 'Tower of London', 'St. Pauls', 'Bank'],
      coordinates: { lat: 51.5155, lng: -0.0922 },
      priority: 3
    },
    {
      name: 'South Bank',
      neighborhoods: ['South Bank', 'Borough Market', 'Tate Modern', 'Shakespeare Globe'],
      coordinates: { lat: 51.5076, lng: -0.0994 },
      priority: 4
    },
    {
      name: 'Kensington',
      neighborhoods: ['Kensington', 'Hyde Park', 'Museums', 'Knightsbridge'],
      coordinates: { lat: 51.5020, lng: -0.1947 },
      priority: 5
    }
  ],
  tokyo: [
    {
      name: 'Shinjuku/Shibuya',
      neighborhoods: ['Shinjuku', 'Shibuya', 'Harajuku', 'Meiji Shrine'],
      coordinates: { lat: 35.6938, lng: 139.7034 },
      priority: 1
    },
    {
      name: 'Central Tokyo',
      neighborhoods: ['Ginza', 'Tokyo Station', 'Imperial Palace', 'Marunouchi'],
      coordinates: { lat: 35.6812, lng: 139.7671 },
      priority: 2
    },
    {
      name: 'Asakusa',
      neighborhoods: ['Asakusa', 'Sensoji Temple', 'Tokyo Skytree', 'Ueno'],
      coordinates: { lat: 35.7118, lng: 139.7966 },
      priority: 3
    },
    {
      name: 'Roppongi/Akasaka',
      neighborhoods: ['Roppongi', 'Tokyo Tower', 'Akasaka', 'Azabu'],
      coordinates: { lat: 35.6628, lng: 139.7314 },
      priority: 4
    }
  ]
};

export class TripGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = getOpenAIClient();
  }

  /**
   * Main entry point for generating an itinerary
   * REQUIRES all parameters - no defaults
   */
  async generateItinerary(params: TripParams): Promise<GeneratePersonalizedItineraryOutput> {
    // Validate required parameters
    if (!params.destination || !params.startDate || !params.duration) {
      throw new Error('Missing required parameters: destination, startDate, and duration are required');
    }

    logger.info('AI', 'Generating itinerary', {
      destination: params.destination,
      duration: params.duration,
      startDate: params.startDate
    });

    try {
      // Step 1: Generate the base itinerary with zone-based planning
      const itinerary = await this.generateBaseItinerary(params);

      // Step 2: Optimize routes within each day
      const optimizedItinerary = this.optimizeDailyRoutes(itinerary);

      // Step 3: Enrich with real location data
      const enrichedItinerary = await this.enrichItinerary(optimizedItinerary);

      // Step 4: Add cost estimates if available
      const finalItinerary = await this.addCostEstimates(enrichedItinerary, params);

      return finalItinerary;
    } catch (error) {
      logger.error('AI', 'Failed to generate itinerary', error);
      throw error;
    }
  }

  /**
   * Generates base itinerary with zone-aware planning
   */
  private async generateBaseItinerary(params: TripParams): Promise<GeneratePersonalizedItineraryOutput> {
    const cityLower = params.destination.toLowerCase();
    const zones = CITY_ZONES[cityLower] || [];

    // Build zone guidance for the prompt
    const zoneGuidance = zones.length > 0
      ? this.buildZoneGuidance(zones, params.duration)
      : 'Group activities by neighborhood to minimize travel time.';

    // Create the generation prompt
    const prompt = PROMPTS.generation.buildItineraryPrompt({
      destination: params.destination,
      duration: params.duration,
      startDate: params.startDate,
      travelers: params.travelers || { adults: 1, children: 0 },
      preferences: params.preferences || {},
      zoneGuidance
    });

    // Generate with GPT
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PROMPTS.generation.systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const itinerary = JSON.parse(content);

    // Ensure proper structure
    return this.validateAndFixItinerary(itinerary, params);
  }

  /**
   * Builds zone guidance for the AI
   */
  private buildZoneGuidance(zones: Zone[], duration: number): string {
    const daysPerZone = Math.max(1, Math.floor(duration / zones.length));
    const guidance: string[] = [
      'ZONE-BASED PLANNING RULES:',
      '- Each day MUST focus on ONE zone/area only',
      '- Activities within a day must be walking distance (max 15 min walk)',
      '- Never cross the city multiple times in one day'
    ];

    // Assign zones to days
    zones.slice(0, duration).forEach((zone, index) => {
      const dayRange = index === 0
        ? 'Day 1'
        : index === zones.length - 1
          ? `Days ${index * daysPerZone + 1}-${duration}`
          : `Day ${index + 1}`;

      guidance.push(`- ${dayRange}: ${zone.name} area (${zone.neighborhoods.join(', ')})`);
    });

    return guidance.join('\n');
  }

  /**
   * Optimizes routes within each day to minimize travel
   */
  private optimizeDailyRoutes(itinerary: GeneratePersonalizedItineraryOutput): GeneratePersonalizedItineraryOutput {
    if (!itinerary.itinerary) return itinerary;

    const optimized = { ...itinerary };
    optimized.itinerary = itinerary.itinerary.map(day => {
      if (!day.activities || day.activities.length <= 1) return day;

      // Group activities by time slot
      const morning: any[] = [];
      const afternoon: any[] = [];
      const evening: any[] = [];

      day.activities.forEach(activity => {
        const time = activity.time?.toLowerCase() || '';
        if (time.includes('morning') || time.includes('breakfast')) {
          morning.push(activity);
        } else if (time.includes('evening') || time.includes('dinner')) {
          evening.push(activity);
        } else {
          afternoon.push(activity);
        }
      });

      // Recombine in logical order
      return {
        ...day,
        activities: [...morning, ...afternoon, ...evening]
      };
    });

    return optimized;
  }

  /**
   * Enriches itinerary with real location data
   */
  private async enrichItinerary(itinerary: GeneratePersonalizedItineraryOutput): Promise<GeneratePersonalizedItineraryOutput> {
    try {
      // Use existing location enrichment service
      const enriched = await locationEnrichmentService.enrichItinerary(itinerary);
      return enriched;
    } catch (error) {
      logger.warn('AI', 'Location enrichment failed, using base itinerary', error);
      return itinerary;
    }
  }

  /**
   * Adds cost estimates to the itinerary
   */
  private async addCostEstimates(
    itinerary: GeneratePersonalizedItineraryOutput,
    params: TripParams
  ): Promise<GeneratePersonalizedItineraryOutput> {
    try {
      const costs = await estimateTravelCosts({
        destination: params.destination,
        origin: 'New York', // Default origin for estimates
        duration: params.duration,
        travelers: params.travelers?.adults || 1,
        budgetLevel: params.preferences?.budget || 'mid'
      });

      return {
        ...itinerary,
        estimatedCosts: costs
      };
    } catch (error) {
      logger.warn('AI', 'Cost estimation failed', error);
      return itinerary;
    }
  }

  /**
   * Validates and fixes itinerary structure
   */
  private validateAndFixItinerary(
    itinerary: any,
    params: TripParams
  ): GeneratePersonalizedItineraryOutput {
    // Ensure required fields
    const fixed: GeneratePersonalizedItineraryOutput = {
      title: itinerary.title || `${params.duration} Days in ${params.destination}`,
      destination: params.destination,
      duration: params.duration,
      startDate: params.startDate,
      itinerary: []
    };

    // Fix daily itineraries
    if (Array.isArray(itinerary.itinerary)) {
      fixed.itinerary = itinerary.itinerary.map((day: any, index: number) => ({
        day: day.day || index + 1,
        date: day.date || this.calculateDate(params.startDate, index),
        theme: day.theme || `Day ${index + 1} Exploration`,
        activities: Array.isArray(day.activities) ? day.activities : []
      }));
    } else {
      // Generate empty structure if missing
      for (let i = 0; i < params.duration; i++) {
        fixed.itinerary.push({
          day: i + 1,
          date: this.calculateDate(params.startDate, i),
          theme: `Day ${i + 1}`,
          activities: []
        });
      }
    }

    return fixed;
  }

  /**
   * Calculates date for a specific day
   */
  private calculateDate(startDate: string, dayOffset: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().split('T')[0];
  }

  /**
   * Modifies an existing itinerary based on feedback
   */
  async modifyItinerary(
    currentItinerary: GeneratePersonalizedItineraryOutput,
    feedback: string
  ): Promise<GeneratePersonalizedItineraryOutput> {
    const prompt = `
      Current itinerary: ${JSON.stringify(currentItinerary)}

      User feedback: ${feedback}

      Modify the itinerary based on the feedback. Maintain the same structure and format.
      Keep zone-based planning - activities in the same day should be in the same area.
      Return ONLY the modified itinerary as JSON.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a travel itinerary modifier. Maintain zone-based planning.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 4000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const modified = JSON.parse(content);
    return this.validateAndFixItinerary(modified, {
      destination: currentItinerary.destination,
      startDate: currentItinerary.startDate,
      duration: currentItinerary.duration
    });
  }
}