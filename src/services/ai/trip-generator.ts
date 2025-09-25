/**
 * Trip Generator V3 - Progressive by Default
 * Unified generator with all features:
 * - Progressive generation with real-time updates
 * - Route optimization by zones
 * - Cost estimation
 * - Location enrichment via HERE API
 * - Full validation
 * - Zone guidance for better organization
 */

import { logger } from '@/lib/monitoring/logger';
import { MetadataGenerator } from './progressive/metadata-generator';
import { CityGenerator } from './progressive/city-generator';
import { getNextDate } from './utils/date.utils';
import {
  TripMetadata,
  CityItinerary,
  GenerationParams,
  ProgressUpdate,
  DayPlan,
  Activity,
  GeneratePersonalizedItineraryOutput
} from './types/core.types';

// Import ALL generator modules (from traditional generator)
import { RouteOptimizer } from './generators/route-optimizer';
import { CostEstimator } from './generators/cost-estimator';
import { ItineraryValidator } from './generators/itinerary-validator';
import { ItineraryEnricher } from './generators/itinerary-enricher';
import { PromptBuilder } from './generators/prompt-builder';

// Re-export types for backward compatibility
export type {
  TripMetadata,
  CityItinerary,
  DayPlan,
  Activity
};

// Export TripParams interface for compatibility
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
  budget?: 'budget' | 'medium' | 'luxury';
  interests?: string[];
}

export class TripGenerator {
  private metadataGenerator: MetadataGenerator;
  private cityGenerator: CityGenerator;

  // Add all generator modules from traditional generator
  private routeOptimizer: RouteOptimizer;
  private costEstimator: CostEstimator;
  private validator: ItineraryValidator;
  private enricher: ItineraryEnricher;
  private promptBuilder: PromptBuilder;

  constructor(apiKey?: string) {
    this.metadataGenerator = new MetadataGenerator();
    this.cityGenerator = new CityGenerator(apiKey);

    // Initialize all generator modules
    this.routeOptimizer = new RouteOptimizer();
    this.costEstimator = new CostEstimator();
    this.validator = new ItineraryValidator();
    this.enricher = new ItineraryEnricher();
    this.promptBuilder = new PromptBuilder();

    logger.debug('AI', 'Trip Generator V3 initialized - Progressive by default');
  }

  /**
   * Main progressive generation flow - Enhanced with all features
   */
  async generateProgressive(params: GenerationParams): Promise<{
    itinerary: GeneratePersonalizedItineraryOutput;
    updates: any[];
  }> {
    const updates: any[] = [];
    const startTime = Date.now();
    console.log('🚀 [ProgressiveGenerator] Starting generation for:', params.destinations);

    // Validate parameters
    const tripParams = this.convertToTripParams(params);
    this.validator.validateParams(tripParams);

    // Step 1: Generate metadata (fast)
    console.log('📊 [ProgressiveGenerator] Generating metadata...');
    const metadata = await this.metadataGenerator.generate(params);
    console.log('✅ [ProgressiveGenerator] Metadata generated:', {
      title: metadata.title,
      days: metadata.daysPerCity
    });

    // Send metadata update
    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'metadata',
        data: metadata,
        progress: 20
      });
    }
    updates.push({ type: 'metadata', data: metadata });

    // Step 2: Generate each city with zone guidance
    const cityItineraries = await this.generateAllCities(params, metadata);
    updates.push(...cityItineraries.updates);

    // Step 3: Combine into structured itinerary
    console.log('📦 [ProgressiveGenerator] Combining all city itineraries...');
    const combinedItinerary = this.combineIntoStructuredFormat(
      metadata,
      cityItineraries.itineraries,
      params
    );
    console.log(`✅ [ProgressiveGenerator] Combined ${combinedItinerary.dailyItineraries?.length || 0} days`);

    // Step 4: Optimize routes
    console.log('🛣️ [ProgressiveGenerator] Optimizing routes...');
    const optimized = this.routeOptimizer.optimizeDailyRoutes(combinedItinerary);
    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'routes_optimized',
        progress: 70
      });
    }

    // Step 5: Enrich with real location data
    console.log('🏢 [ProgressiveGenerator] Enriching locations...');
    const enriched = await this.enricher.enrichItinerary(optimized);
    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'enrichment_complete',
        progress: 85
      });
    }

    // Step 6: Add cost estimates
    console.log('💰 [ProgressiveGenerator] Calculating costs...');
    const withCosts = await this.costEstimator.addCostEstimates(enriched, {
      budget: (params.preferences?.budget || 'medium') as 'budget' | 'medium' | 'luxury',
      travelers: params.travelers
    });
    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'costs_complete',
        progress: 95
      });
    }

    // Step 7: Final validation
    const validated = this.validator.validateAndFixItinerary(withCosts);

    // Send completion update
    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'complete',
        data: validated,
        progress: 100
      });
    }

    console.log(`\n   ✅ Generation complete (${Date.now() - startTime}ms)`);
    return {
      itinerary: validated,
      updates
    };
  }

  /**
   * Generate all city itineraries
   */
  private async generateAllCities(
    params: GenerationParams,
    metadata: TripMetadata
  ): Promise<{ itineraries: CityItinerary[]; updates: any[] }> {
    const cityItineraries: CityItinerary[] = [];
    const updates: any[] = [];
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
        const cityItinerary = await this.cityGenerator.generateCityItinerary({
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
          this.sendProgress(params.onProgress, {
            type: 'city_complete',
            city,
            data: cityItinerary,
            progress: progressPercent
          });
        }
        updates.push({ type: 'city_complete', city, data: cityItinerary });

      } catch (cityError: any) {
        console.error(`❌ [ProgressiveGenerator] Failed to generate ${city}:`, cityError);
        throw new Error(`Failed to generate itinerary for ${city}: ${cityError.message}`);
      }

      // Move to next city's dates
      currentDate = getNextDate(currentDate, daysForCity);
      currentDay += daysForCity;
      console.log(`🔄 [ProgressiveGenerator] Moving to next city. Next date: ${currentDate}, Next day: ${currentDay}`);
    }

    console.log(`🏁 [ProgressiveGenerator] Finished processing all ${params.destinations.length} cities`);
    return { itineraries: cityItineraries, updates };
  }

  /**
   * Send progress update without awaiting
   */
  private sendProgress(
    onProgress: (update: ProgressUpdate) => void | Promise<void>,
    update: ProgressUpdate
  ): void {
    console.log(`📤 [ProgressiveGenerator] Sending ${update.type} update to callback...`);
    // Don't await - let generation continue while callback processes
    onProgress(update);
    console.log(`✅ [ProgressiveGenerator] ${update.type} callback triggered, continuing...`);
  }


  // Legacy methods for backward compatibility

  /**
   * @deprecated Use generateProgressive instead
   */
  async generateMetadata(params: {
    destinations: string[];
    duration: number;
    startDate: string;
    preferences?: any;
  }): Promise<TripMetadata> {
    return this.metadataGenerator.generate(params);
  }

  /**
   * @deprecated Use generateProgressive instead
   */
  async generateCityItinerary(params: {
    city: string;
    days: number;
    startDate: string;
    startDayNumber: number;
    preferences?: any;
  }): Promise<CityItinerary> {
    return this.cityGenerator.generateCityItinerary(params);
  }

  /**
   * @deprecated Use generateProgressive instead
   */
  combineCityItineraries(metadata: TripMetadata, cityItineraries: CityItinerary[]) {
    return this.combineItineraries(metadata, cityItineraries);
  }

  // ========================================
  // Itinerary Combining Logic (merged from itinerary-combiner.ts)
  // ========================================

  /**
   * Combine all city itineraries into final format
   */
  private combineItineraries(metadata: TripMetadata, cityItineraries: CityItinerary[]) {
    console.log(`📊 [ProgressiveGenerator] Combining ${cityItineraries.length} cities`);

    cityItineraries.forEach(city => {
      console.log(`  - ${city.city}: ${city.days.length} days (day ${city.startDay} to ${city.endDay})`);
    });

    const allDays = this.mergeAndSortDays(cityItineraries);
    console.log(`📊 [ProgressiveGenerator] Total days after combining: ${allDays.length}`);

    return {
      destination: metadata.destinations.join(', '),
      title: metadata.title,
      itinerary: this.formatDaysForOutput(allDays),
      quickTips: metadata.quickTips || [],
      cost: metadata.estimatedCost
    };
  }

  /**
   * Merge and sort days from all cities
   */
  private mergeAndSortDays(cityItineraries: CityItinerary[]) {
    return cityItineraries
      .flatMap(city => city.days)
      .sort((a, b) => a.day - b.day);
  }

  /**
   * Format days for final output
   */
  private formatDaysForOutput(days: any[]) {
    return days.map(day => ({
      title: day.title || `Day ${day.day} - ${day.city}`,
      day: day.day,
      date: day.date,
      activities: this.formatActivities(day.activities || []),
      weather: day.weather || 'Check local forecast'
    }));
  }

  /**
   * Format activities for output
   */
  private formatActivities(activities: any[]) {
    return activities.map(act => ({
      time: act.time,
      description: act.description,
      category: act.category,
      address: act.address || 'Address not available',
      venue_name: act.venueName,
      rating: undefined,
      _tips: act.tips
    }));
  }

  /**
   * Convert GenerationParams to TripParams for validators
   */
  private convertToTripParams(params: GenerationParams): any {
    return {
      destination: params.destinations.join(', '),
      startDate: params.startDate,
      duration: params.duration,
      travelers: params.travelers,
      preferences: params.preferences,
      budget: params.preferences?.budget,
      interests: params.preferences?.interests
    };
  }

  /**
   * Combine city itineraries into structured format for generators
   */
  private combineIntoStructuredFormat(
    metadata: TripMetadata,
    cityItineraries: CityItinerary[],
    params: GenerationParams
  ): GeneratePersonalizedItineraryOutput {
    const allDays = this.mergeAndSortDays(cityItineraries);

    // Convert to the format expected by generators
    const dailyItineraries = allDays.map(day => ({
      day: day.day,
      date: day.date,
      city: day.city,
      activities: day.activities.map((act: any) => ({
        time: act.time,
        description: act.description,
        venue_name: act.venueName || act.venue_name,
        category: act.category,
        address: act.address,
        coordinates: act.coordinates,
        neighborhood: act.neighborhood,
        zone: act.zone,
        rating: act.rating
      }))
    }));

    // Calculate end date
    const endDate = getNextDate(params.startDate, params.duration - 1);

    return {
      destination: params.destinations.join(', '),
      title: metadata.title,
      duration: params.duration,
      startDate: params.startDate,
      endDate: endDate,
      dailyItineraries,
      estimatedCost: metadata.estimatedCost,
      travelTips: metadata.quickTips,
      photoUrl: metadata.photoUrl
    };
  }

  /**
   * Modify an existing itinerary based on user feedback
   * (Feature from traditional generator)
   */
  async modifyItinerary(
    currentItinerary: GeneratePersonalizedItineraryOutput,
    userFeedback: string
  ): Promise<GeneratePersonalizedItineraryOutput> {
    console.log('🔄 Modifying itinerary based on feedback');

    // For now, we'll need to regenerate with modifications
    // In future, could make this more granular
    throw new Error('Modification not yet implemented in progressive generator');
  }

  /**
   * Compatibility method for traditional TripGenerator interface
   * This makes migration easier - same interface, progressive implementation
   */
  async generateItinerary(params: any): Promise<GeneratePersonalizedItineraryOutput> {
    // Convert traditional params to progressive params
    const destinations = params.destination
      ? params.destination.split(',').map((d: string) => d.trim())
      : ['Unknown'];

    const progressiveParams: GenerationParams = {
      destinations,
      duration: params.duration,
      startDate: params.startDate,
      preferences: {
        budget: params.budget || params.preferences?.budget,
        interests: params.interests || params.preferences?.interests,
        pace: params.preferences?.pace,
        mustSee: params.preferences?.mustSee,
        avoid: params.preferences?.avoid
      },
      travelers: params.travelers
    };

    const result = await this.generateProgressive(progressiveParams);
    return result.itinerary;
  }
}