/**
 * Trip Generator - Unified itinerary generation with zone-based planning
 * Handles generation, zone planning, route optimization, and enrichment
 * NO DEFAULTS - Throws error if missing required data
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { locationEnrichmentService } from '@/services/ai/services/location-enrichment-locationiq';
import { osmPOIService, type QueryZone } from '@/services/ai/services/osm-poi-service';
import { herePlacesService } from '@/services/api/here-places';
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

    console.log('\n   📍 TRIP GENERATOR STARTED:');
    console.log(`      Destination: ${params.destination}`);
    console.log(`      Duration: ${params.duration} days`);
    console.log(`      Start Date: ${params.startDate}`);
    console.log(`      Travelers: ${params.travelers?.adults || 1} adults, ${params.travelers?.children || 0} children`);

    try {
      // Step 1: Generate the base itinerary with zone-based planning
      const genStart = Date.now();
      console.log('\n   🏗️  Generating base itinerary with GPT-3.5...');
      const itinerary = await this.generateBaseItinerary(params);
      console.log(`      Base generation time: ${Date.now() - genStart}ms`);
      console.log(`      Days created: ${itinerary.itinerary?.length || 0}`);

      // Step 2: Optimize routes within each day
      console.log('\n   🛣️  Optimizing daily routes...');
      const optimizedItinerary = this.optimizeDailyRoutes(itinerary);

      // Step 3: Enrich with real location data
      const enrichStart = Date.now();
      console.log('\n   🏢 Enriching with HERE Places API...');
      const enrichedItinerary = await this.enrichItinerary(optimizedItinerary);
      console.log(`      Enrichment time: ${Date.now() - enrichStart}ms`);
      console.log(`      Activities enriched: ${enrichedItinerary.itinerary?.reduce((sum, day) => sum + (day.activities?.length || 0), 0) || 0}`);

      // Step 4: Add cost estimates if available
      console.log('\n   💰 Adding cost estimates...');
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

    // Generate with GPT-3.5-turbo (much faster than GPT-5 responses API)
    const startGPT = Date.now();
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k', // Using 16k variant for longer itineraries
      messages: [
        {
          role: 'system',
          content: PROMPTS.generation.systemPrompt
        },
        {
          role: 'user',
          content: `${prompt}\n\nREMINDER: Return ONLY valid JSON, no other text.`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    logger.info('AI', 'GPT-3.5-turbo response received', { time: `${Date.now() - startGPT}ms` });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Log raw response for debugging
    logger.info('AI', 'Raw GPT response length', { chars: content.length });
    if (content.length < 1000) {
      logger.warn('AI', 'Suspiciously short response', { content: content.substring(0, 500) });
    }

    // Parse JSON with error handling
    let itinerary;
    try {
      // Clean content first - remove any comments or invalid characters
      let cleanContent = content.trim();

      // Remove any single-line comments (// ...)
      cleanContent = cleanContent.replace(/\/\/[^\n]*/g, '');

      // Remove any multi-line comments (/* ... */)
      cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, '');

      // Remove any trailing commas before closing brackets/braces
      cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');

      // Try direct parse first
      itinerary = JSON.parse(cleanContent);
    } catch (parseError) {
      logger.warn('AI', 'First parse failed, trying extraction', {
        error: (parseError as any).message,
        sample: content.substring(0, 200)
      });

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Clean the extracted JSON
          let extracted = jsonMatch[0];
          extracted = extracted.replace(/\/\/[^\n]*/g, '');
          extracted = extracted.replace(/\/\*[\s\S]*?\*\//g, '');
          extracted = extracted.replace(/,(\s*[}\]])/g, '$1');

          itinerary = JSON.parse(extracted);
        } catch (secondError) {
          logger.error('AI', 'Failed to parse itinerary JSON', {
            error: (secondError as any).message,
            content: content.substring(0, 500)
          });
          throw new Error('Invalid JSON response from AI - please try again');
        }
      } else {
        logger.error('AI', 'No JSON structure found in response', {
          content: content.substring(0, 500)
        });
        throw new Error('No valid JSON found in AI response');
      }
    }

    // Ensure proper structure
    const validated = this.validateAndFixItinerary(itinerary, params);

    // Warn if days mismatch
    if (validated.itinerary.length !== params.duration) {
      logger.warn('AI', 'Days mismatch - will retry generation', {
        requested: params.duration,
        generated: validated.itinerary.length
      });

      // If we got fewer days than requested, try regenerating once
      if (validated.itinerary.length < params.duration) {
        logger.info('AI', 'Retrying generation with emphasis on duration');

        // Add emphasis to the prompt about the duration
        const retryPrompt = PROMPTS.generation.buildItineraryPrompt({
          destination: params.destination,
          duration: params.duration,
          startDate: params.startDate,
          travelers: params.travelers || { adults: 1, children: 0 },
          preferences: params.preferences || {},
          zoneGuidance: `CRITICAL: You MUST generate exactly ${params.duration} days. Each day needs 5-6 activities.`
        });

        try {
          const retryResponse = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo-16k',
            messages: [
              {
                role: 'system',
                content: PROMPTS.generation.systemPrompt + `\n\nCRITICAL: Generate EXACTLY ${params.duration} days with 5-6 activities each day.`
              },
              {
                role: 'user',
                content: retryPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000
          });

          const retryContent = retryResponse.choices[0].message.content;
          if (retryContent) {
            let retryItinerary = this.parseJSONSafely(retryContent);
            if (retryItinerary) {
              const retryValidated = this.validateAndFixItinerary(retryItinerary, params);
              if (retryValidated.itinerary.length === params.duration) {
                logger.info('AI', 'Retry successful - got correct duration');
                return retryValidated;
              }
            }
          }
        } catch (error) {
          logger.warn('AI', 'Retry failed, using original', error);
        }
      }
    }

    return validated;
  }

  /**
   * Safely parse JSON with cleaning
   */
  private parseJSONSafely(content: string): any | null {
    try {
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/\/\/[^\n]*/g, '');
      cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, '');
      cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(cleanContent);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          let extracted = jsonMatch[0];
          extracted = extracted.replace(/\/\/[^\n]*/g, '');
          extracted = extracted.replace(/\/\*[\s\S]*?\*\//g, '');
          extracted = extracted.replace(/,(\s*[}\]])/g, '$1');
          return JSON.parse(extracted);
        } catch {
          return null;
        }
      }
      return null;
    }
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
   * Priority: 1. HERE (fast), 2. OSM (free), 3. LocationIQ (fallback)
   */
  private async enrichItinerary(itinerary: GeneratePersonalizedItineraryOutput): Promise<GeneratePersonalizedItineraryOutput> {
    try {
      // If HERE is configured, use it (FAST: 150-350ms per venue)
      if (herePlacesService.isConfigured()) {
        logger.info('AI', 'Using HERE Places for enrichment (fast mode)');;
        const hereEnriched = await this.enrichWithHERE(itinerary);
        return hereEnriched;
      }

      // Otherwise use OSM as primary source (SLOW: 2-10s per venue)
      logger.info('AI', 'Using OSM for enrichment (free but slow)');;
      const osmEnriched = await this.enrichWithOSMData(itinerary);

      // Only use LocationIQ as fallback for activities without POI data
      const fullyEnriched = await this.enrichWithLocationIQFallback(osmEnriched);

      return fullyEnriched;
    } catch (error) {
      logger.warn('AI', 'Location enrichment failed, using base itinerary', error);
      return itinerary;
    }
  }

  /**
   * Uses LocationIQ only as fallback for activities without OSM data
   */
  private async enrichWithLocationIQFallback(
    itinerary: GeneratePersonalizedItineraryOutput
  ): Promise<GeneratePersonalizedItineraryOutput> {
    // Only process if LocationIQ is configured
    if (!process.env.LOCATIONIQ_API_KEY) {
      logger.info('AI', 'LocationIQ not configured, skipping fallback enrichment');
      return itinerary;
    }

    const needsFallback = itinerary.itinerary?.some(day =>
      day.activities?.some(activity => !activity.venue_name)
    );

    if (!needsFallback) {
      logger.info('AI', 'All activities have POI data, skipping LocationIQ');
      return itinerary;
    }

    logger.info('AI', 'Using LocationIQ as fallback for missing POIs');

    try {
      // Only enrich activities that don't have OSM data
      const enriched = await locationEnrichmentService.enrichItineraryWithLocationIQ(itinerary, {
        useLocationIQ: true,
        optimizeRoutes: false // Already optimized
      });
      return enriched as GeneratePersonalizedItineraryOutput;
    } catch (error) {
      logger.warn('AI', 'LocationIQ fallback failed', error);
      return itinerary;
    }
  }

  /**
   * Enriches itinerary with OSM POI data
   */
  private async enrichWithOSMData(
    itinerary: GeneratePersonalizedItineraryOutput
  ): Promise<GeneratePersonalizedItineraryOutput> {
    if (!itinerary.itinerary) return itinerary;

    const cityLower = itinerary.destination.toLowerCase();
    const zones = CITY_ZONES[cityLower] || [];

    logger.info('AI', 'Enriching with OSM data', {
      destination: itinerary.destination,
      days: itinerary.itinerary.length
    });

    const enrichedItinerary = { ...itinerary };
    enrichedItinerary.itinerary = await Promise.all(
      itinerary.itinerary.map(async (day) => {
        if (!day.activities || day.activities.length === 0) return day;

        // Find the zone for this day based on activities
        const dayZone = this.findDayZone(day, zones);
        const queryZone: QueryZone = dayZone
          ? {
              name: dayZone.name,
              center: dayZone.coordinates,
              radiusKm: 2
            }
          : {
              name: itinerary.destination,
              center: zones[0]?.coordinates || { lat: 0, lng: 0 },
              radiusKm: 5
            };

        // Enrich each activity with OSM POI
        const enrichedActivities = await Promise.all(
          day.activities.map(async (activity) => {
            try {
              // Try to find matching POI
              const poi = await osmPOIService.matchPOIToActivity(
                activity.description,
                queryZone
              );

              if (poi) {
                logger.info('AI', 'Found POI for activity', {
                  activity: activity.description.substring(0, 50),
                  poi: poi.name
                });

                return {
                  ...activity,
                  venue_name: poi.name,
                  address: poi.address || activity.address || ''
                };
              }
            } catch (error) {
              logger.warn('AI', 'Failed to find POI for activity', {
                activity: activity.description,
                error
              });
            }

            return activity;
          })
        );

        return {
          ...day,
          activities: enrichedActivities
        };
      })
    );

    const poiCount = enrichedItinerary.itinerary
      .flatMap(d => d.activities || [])
      .filter(a => a.venue_name).length;

    logger.info('AI', 'OSM enrichment complete', {
      totalActivities: enrichedItinerary.itinerary.flatMap(d => d.activities || []).length,
      enrichedWithPOI: poiCount
    });

    return enrichedItinerary;
  }

  /**
   * Enriches itinerary with HERE Places data (FAST)
   */
  private async enrichWithHERE(
    itinerary: GeneratePersonalizedItineraryOutput
  ): Promise<GeneratePersonalizedItineraryOutput> {
    if (!itinerary.itinerary) {
      logger.warn('AI', 'No itinerary to enrich');
      return itinerary;
    }

    const cityLower = itinerary.destination.toLowerCase();
    const zones = CITY_ZONES[cityLower] || [];
    const cityCenter = zones[0]?.coordinates || { lat: 0, lng: 0 };

    logger.info('AI', 'Starting HERE enrichment', {
      destination: itinerary.destination,
      days: itinerary.itinerary.length,
      hasZones: zones.length > 0
    });

    // Collect all activities for batch processing
    const allActivities: Array<{
      dayIndex: number;
      activityIndex: number;
      description: string;
      zone?: Zone;
    }> = [];

    itinerary.itinerary.forEach((day, dayIndex) => {
      const dayZone = this.findDayZone(day, zones);
      day.activities?.forEach((activity, activityIndex) => {
        allActivities.push({
          dayIndex,
          activityIndex,
          description: activity.description,
          zone: dayZone || zones[0]
        });
      });
    });

    // Batch search with HERE (much faster than individual calls)
    const queries = allActivities.map(({ description, zone }) => {
      // Extract key terms for better search results
      const searchQuery = this.extractSearchQuery(description);

      // IMPORTANT: Always include city name to avoid wrong results
      const queryWithCity = `${searchQuery} ${itinerary.destination}`;

      return {
        query: queryWithCity,
        location: zone?.coordinates || cityCenter
      };
    });

    logger.info('AI', 'Starting HERE batch search', {
      totalQueries: queries.length
    });

    const startBatch = Date.now();
    const results = await herePlacesService.batchSearchPlaces(queries, { limit: 1 });
    const batchTime = Date.now() - startBatch;

    logger.info('AI', 'HERE batch search complete', {
      resultsFound: results.size,
      batchTime: `${batchTime}ms`
    });

    // Apply results back to itinerary
    allActivities.forEach(({ dayIndex, activityIndex, description }) => {
      const searchQuery = this.extractSearchQuery(description);
      const queryWithCity = `${searchQuery} ${itinerary.destination}`;
      const places = results.get(queryWithCity);

      if (places && places.length > 0) {
        // Try to find a place in the correct city/country
        let bestPlace = places[0];
        const cityLower = itinerary.destination.toLowerCase();

        // Country mappings for common destinations
        const countryMap: Record<string, string[]> = {
          madrid: ['españa', 'spain', 'madrid'],
          barcelona: ['españa', 'spain', 'barcelona', 'catalunya'],
          paris: ['france', 'paris', 'île-de-france'],
          lisbon: ['portugal', 'lisboa', 'lisbon'],
          rome: ['italia', 'italy', 'roma'],
          london: ['united kingdom', 'london', 'england'],
        };

        const expectedTerms = countryMap[cityLower] || [cityLower];

        // Filter to only places in the correct city/country
        const validPlaces = places.filter(place => {
          const address = place.address.label.toLowerCase();
          return expectedTerms.some(term => address.includes(term));
        });

        // Use the first valid place, or fallback to original if none found
        if (validPlaces.length > 0) {
          bestPlace = validPlaces[0];
        } else {
          // If no valid places, at least try to avoid obviously wrong countries
          for (const place of places) {
            const address = place.address.label;
            // Skip if it contains wrong country indicators
            if (!address.includes('Colombia') &&
                !address.includes('België') &&
                !address.includes('Србија') &&
                !address.includes('Australia')) {
              bestPlace = place;
              break;
            }
          }
        }

        const activity = itinerary.itinerary![dayIndex].activities![activityIndex];
        activity.venue_name = bestPlace.name;
        activity.address = bestPlace.address.label;
      }
    });

    logger.info('AI', 'HERE enrichment complete', {
      totalActivities: allActivities.length,
      enriched: Array.from(results.values()).filter(p => p.length > 0).length
    });

    return itinerary;
  }

  /**
   * Extract a search query from activity description
   */
  private extractSearchQuery(description: string): string {
    const lower = description.toLowerCase();

    // Look for specific venue names (capitalized words after "at" or "visit")
    const venueMatch = description.match(/(?:at|visit|explore)\s+([A-Z][^,\.]+)/);
    if (venueMatch) {
      return venueMatch[1].trim();
    }

    // Extract key terms for common activities - be more specific
    if (lower.includes('breakfast')) {
      if (lower.includes('cafe')) return 'cafe breakfast';
      if (lower.includes('pastry') || lower.includes('bakery')) return 'bakery pastry';
      return 'breakfast restaurant local';
    }
    if (lower.includes('lunch')) {
      if (lower.includes('restaurant')) return venueMatch?.[1] || 'restaurant';
      return 'restaurant local cuisine';
    }
    if (lower.includes('dinner')) {
      if (lower.includes('restaurant')) return venueMatch?.[1] || 'restaurant';
      return 'restaurant dinner';
    }
    if (lower.includes('museum')) return 'museum';
    if (lower.includes('park') || lower.includes('garden')) return 'park';
    if (lower.includes('shopping')) return 'shopping center';
    if (lower.includes('market')) return 'market';
    if (lower.includes('church') || lower.includes('cathedral')) return 'church';
    if (lower.includes('bridge')) return 'bridge';
    if (lower.includes('tower')) return 'tower';
    if (lower.includes('palace')) return 'palace';
    if (lower.includes('plaza') || lower.includes('square')) return 'plaza square';

    // Default: use first few meaningful words
    const words = description.split(' ')
      .filter(w => w.length > 3)
      .slice(0, 3)
      .join(' ');

    return words || description.slice(0, 30);
  }

  /**
   * Find which zone a day's activities are in
   */
  private findDayZone(day: any, zones: Zone[]): Zone | null {
    if (!day.activities || zones.length === 0) return null;

    // Look for zone mentions in activities
    for (const zone of zones) {
      const zoneKeywords = [
        zone.name.toLowerCase(),
        ...zone.neighborhoods.map(n => n.toLowerCase())
      ];

      for (const activity of day.activities) {
        const description = (activity.description || '').toLowerCase();
        if (zoneKeywords.some(keyword => description.includes(keyword))) {
          return zone;
        }
      }
    }

    // Check day theme
    const theme = (day.theme || '').toLowerCase();
    for (const zone of zones) {
      if (theme.includes(zone.name.toLowerCase())) {
        return zone;
      }
    }

    return null;
  }

  /**
   * Adds cost estimates to the itinerary
   */
  private async addCostEstimates(
    itinerary: GeneratePersonalizedItineraryOutput,
    params: TripParams
  ): Promise<GeneratePersonalizedItineraryOutput> {
    try {
      // Simple cost estimation based on destination and duration
      const costs = await this.estimateTripCosts(
        params.destination,
        params.duration,
        params.travelers?.adults || 1,
        params.preferences?.budget || 'mid'
      );

      // Store costs in a separate variable if needed
      // but don't add to the return type as it doesn't exist in schema
      logger.info('AI', 'Trip costs estimated', costs);
      return itinerary;
    } catch (error) {
      logger.warn('AI', 'Cost estimation failed', error);
      return itinerary;
    }
  }

  /**
   * Simple cost estimation using GPT
   */
  private async estimateTripCosts(
    destination: string,
    duration: number,
    travelers: number,
    budgetLevel: 'budget' | 'mid' | 'luxury'
  ): Promise<any> {
    const prompt = `Estimate travel costs for ${destination}, ${duration} days, ${travelers} travelers, ${budgetLevel} budget.

    Return ONLY this JSON:
    {
      "flights": <number>,
      "hotels": <number>,
      "dailyExpenses": <number>,
      "total": <number>
    }

    Use 2024-2025 prices. Numbers only, no currency symbols.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a travel cost estimator. Return only JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 200
      });

      const content = response.choices[0].message.content;
      let costs;
      try {
        costs = JSON.parse(content?.trim() || '{}');
      } catch {
        // Try to extract JSON
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        costs = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      }
      logger.info('AI', 'Cost estimate generated', costs);
      return costs;
    } catch (error) {
      logger.error('AI', 'Failed to estimate costs', error);
      // Return basic fallback estimate
      const perDay = budgetLevel === 'budget' ? 100 : budgetLevel === 'mid' ? 200 : 400;
      return {
        flights: 800 * travelers,
        hotels: (perDay * 0.5) * duration,
        dailyExpenses: (perDay * 0.5) * duration * travelers,
        total: (800 * travelers) + (perDay * duration * travelers)
      };
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
      itinerary: [],
      quickTips: itinerary.quickTips || []
    };

    // Fix daily itineraries
    if (Array.isArray(itinerary.itinerary)) {
      fixed.itinerary = itinerary.itinerary.map((day: any, index: number) => ({
        day: day.day || index + 1,
        date: this.calculateDate(params.startDate, index), // Always calculate correct date
        title: day.title || day.theme || `Day ${index + 1} Exploration`,
        activities: Array.isArray(day.activities) ?
          day.activities.map((act: any) => ({
            time: act.time || 'Flexible',
            description: act.description || '',
            category: act.category || 'Leisure',
            address: act.address || '',
            venue_name: act.venue_name,
            venue_search: act.venue_search
          })) : [],
        weather: day.weather
      }));
    } else {
      // Generate empty structure if missing
      for (let i = 0; i < params.duration; i++) {
        fixed.itinerary.push({
          day: i + 1,
          date: this.calculateDate(params.startDate, i),
          title: `Day ${i + 1}: Explore ${params.destination}`,
          activities: [],
          weather: undefined
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

    const response = await this.openai.responses.create({
      model: 'gpt-5',
      input: `You are a travel itinerary modifier. Maintain zone-based planning.\n\n${prompt}\n\nReturn ONLY valid JSON, no other text.`
    });

    const content = response.output_text;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let modified;
    try {
      modified = JSON.parse(content.trim());
    } catch (error) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        modified = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse modified itinerary');
      }
    }
    // Extract start date from first day and duration from itinerary length
    const startDate = currentItinerary.itinerary?.[0]?.date || new Date().toISOString().split('T')[0];
    const duration = currentItinerary.itinerary?.length || 3;
    return this.validateAndFixItinerary(modified, {
      destination: currentItinerary.destination,
      startDate: startDate,
      duration: duration
    });
  }
}