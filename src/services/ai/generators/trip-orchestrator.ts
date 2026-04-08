/**
 * Trip Orchestrator Module
 * Main orchestration logic for trip generation
 * Coordinates between metadata, city generation, and enhancement modules
 */

import { logger } from '@/lib/monitoring/logger';
import { MetadataGenerator } from '../progressive/metadata-generator';
import { CityGenerator } from '../progressive/city-generator';
import { getNextDate } from '../utils/date.utils';
import { RouteOptimizer } from './route-optimizer';
 
import { ItineraryValidator } from './itinerary-validator';
import { ItineraryEnricher } from './itinerary-enricher';
import {
  TripMetadata,
  CityItinerary,
  GenerationParams,
  ProgressUpdate,
  DayPlan,
  GeneratePersonalizedItineraryOutput
} from '../types/core.types';

export interface StreamUpdate {
  type: 'progress' | 'city_complete' | 'complete' | 'metadata' | 'routes_optimized' | 'enrichment_complete' | 'costs_complete';
  message?: string;
  city?: string;
  data?: CityItinerary | TripMetadata | GeneratePersonalizedItineraryOutput;
  totalCities?: number;
  currentCity?: number;
  progress?: number;
}

export class TripOrchestrator {
  private metadataGenerator: MetadataGenerator;
  private cityGenerator: CityGenerator;
  private routeOptimizer: RouteOptimizer;
 
  private validator: ItineraryValidator;
  private enricher: ItineraryEnricher;

  constructor(apiKey?: string) {
    this.metadataGenerator = new MetadataGenerator();
    this.cityGenerator = new CityGenerator(apiKey);
    this.routeOptimizer = new RouteOptimizer();
 
    this.validator = new ItineraryValidator();
    this.enricher = new ItineraryEnricher();
  }

  /**
   * Orchestrate the complete trip generation process
   */
  async orchestrateGeneration(params: GenerationParams): Promise<{
    itinerary: GeneratePersonalizedItineraryOutput;
    updates: StreamUpdate[];
  }> {
    const updates: StreamUpdate[] = [];
    const startTime = Date.now();

    logger.info('AI', `🚀 Starting trip orchestration for ${params.destinations.join(', ')}`, { destinations: params.destinations });

    try {
      // Step 1: Generate metadata
      const metadata = await this.generateMetadata(params, updates);

      // Step 2: Generate city itineraries
      const cityItineraries = await this.generateCityItineraries(params, metadata, updates);

      // Step 3: Combine and structure
      const combinedItinerary = await this.combineAndStructure(
        metadata,
        cityItineraries.itineraries,
        params,
        updates
      );

      // Step 4: Enhance and optimize
      const finalItinerary = await this.enhanceAndOptimize(
        combinedItinerary,
        params,
        updates
      );

      const elapsedTime = Date.now() - startTime;
      logger.info('AI', `✅ Trip orchestration complete in ${elapsedTime}ms`, { elapsedMs: elapsedTime });

      return {
        itinerary: finalItinerary,
        updates
      };
    } catch (error) {
      logger.error('AI', '❌ Orchestration failed', { error });
      throw error;
    }
  }

  /**
   * Step 1: Generate trip metadata
   */
  private async generateMetadata(
    params: GenerationParams,
    updates: StreamUpdate[]
  ): Promise<TripMetadata> {
    console.log('🔍 [TripOrchestrator] Received params:', {
      destinations: params.destinations,
      duration: params.duration,
      daysPerCity: params.daysPerCity,
      fullParams: JSON.stringify(params, null, 2)
    });

    logger.debug('AI', '📊 Generating metadata...', {
      destinations: params.destinations,
      duration: params.duration,
      daysPerCity: params.daysPerCity
    });

    const metadata = await this.metadataGenerator.generate(params);
    
    logger.debug('AI', '📊 Metadata generated', {
      daysPerCity: metadata.daysPerCity,
      totalDays: metadata.daysPerCity?.reduce((a, b) => a + b, 0) || metadata.duration
    });

    updates.push({
      type: 'metadata',
      data: metadata,
      progress: 20
    });

    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'metadata',
        data: metadata,
        progress: 20
      });
    }

    return metadata;
  }

  /**
   * Step 2: Generate city itineraries
   */
  private async generateCityItineraries(
    params: GenerationParams,
    metadata: TripMetadata,
    updates: StreamUpdate[]
  ): Promise<{ itineraries: CityItinerary[]; }> {
    const cityItineraries: CityItinerary[] = [];
    let currentDate = params.startDate;
    let currentDay = 1;

    // Ensure metadata.daysPerCity is set (metadata generator should always set it)
    if (!metadata.daysPerCity || metadata.daysPerCity.length !== params.destinations.length) {
      logger.warn('AI', '⚠️ metadata.daysPerCity missing or incorrect, recalculating', {
        provided: metadata.daysPerCity,
        destinations: params.destinations.length,
        duration: params.duration
      });
      // This should not happen, but if it does, distribute evenly
      const baseDays = Math.floor(params.duration / params.destinations.length);
      const remainder = params.duration % params.destinations.length;
      metadata.daysPerCity = params.destinations.map((_, idx) => baseDays + (idx < remainder ? 1 : 0));
      logger.debug('AI', '📊 Recalculated daysPerCity', { daysPerCity: metadata.daysPerCity });
    }

    for (let i = 0; i < params.destinations.length; i++) {
      const city = params.destinations[i];
      const daysForCity = metadata.daysPerCity[i];

      logger.debug('AI', `🏙️ Generating ${city} itinerary for ${daysForCity} days`, {
        city,
        days: daysForCity,
        dayIndex: i,
        daysPerCity: metadata.daysPerCity
      });

      const cityItinerary = await this.cityGenerator.generateCityItinerary({
        city,
        days: daysForCity,
        startDate: currentDate,
        startDayNumber: currentDay,
        preferences: params.preferences
      });

      cityItineraries.push(cityItinerary);

      // Calculate and send progress
      const progressPercent = 20 + ((i + 1) / params.destinations.length) * 40;

      updates.push({
        type: 'city_complete',
        city,
        data: cityItinerary,
        progress: progressPercent
      });

      if (params.onProgress) {
        this.sendProgress(params.onProgress, {
          type: 'city_complete',
          city,
          data: cityItinerary,
          progress: progressPercent
        });
      }

      // Move to next city's dates
      currentDate = getNextDate(currentDate, daysForCity);
      currentDay += daysForCity;
    }

    return { itineraries: cityItineraries };
  }

  /**
   * Step 3: Combine city itineraries into structured format
   */
  private async combineAndStructure(
    metadata: TripMetadata,
    cityItineraries: CityItinerary[],
    params: GenerationParams,
    updates: StreamUpdate[]
  ): Promise<GeneratePersonalizedItineraryOutput> {
    logger.debug('AI', '📦 Combining city itineraries...');

    // Flatten all days from all cities
    const allDays: DayPlan[] = [];
    for (const cityIt of cityItineraries) {
      allDays.push(...cityIt.days);
    }

    // Convert to standard format
    const dailyItineraries = allDays.map(day => ({
      dayNumber: day.day,
      date: day.date,
      city: day.city, // Include city for multi-city filtering
      title: day.title || `Day ${day.day} - ${day.city}`,
      activities: day.activities.map((act: any) => ({
        time: act.time,
        description: act.description,
        venue_name: act.venueName || act.venue_name,
        venue_search: act.venue_search,
        category: act.category,
        address: act.address,
        coordinates: act.coordinates,
        neighborhood: act.neighborhood,
        zone: act.zone,
        rating: act.rating
      })),
      weather: day.weather || 'Check local forecast'
    }));

    // Use metadata.duration which may have been corrected based on daysPerCity
    const finalDuration = metadata.duration || params.duration;
    const endDate = getNextDate(params.startDate, finalDuration - 1);

    return {
      destination: params.destinations.join(', '),
      title: metadata.title,
      duration: finalDuration,
      startDate: params.startDate,
      endDate: endDate,
      dailyItineraries,
      estimatedCost: metadata.estimatedCost,
      travelTips: metadata.quickTips,
      photoUrl: metadata.photoUrl
    } as GeneratePersonalizedItineraryOutput;
  }

  /**
   * Step 4: Enhance and optimize the itinerary
   */
  private async enhanceAndOptimize(
    itinerary: GeneratePersonalizedItineraryOutput,
    params: GenerationParams,
    updates: StreamUpdate[]
  ): Promise<GeneratePersonalizedItineraryOutput> {
    // Optimize routes
    logger.debug('AI', '🛣️ Optimizing routes...');
    const optimized = this.routeOptimizer.optimizeDailyRoutes(itinerary);

    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'routes_optimized',
        progress: 70
      });
    }

    // Enrich with location data
    logger.debug('AI', '🏢 Enriching locations...');
    const enriched = await this.enricher.enrichItinerary(optimized);

    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'enrichment_complete',
        progress: 85
      });
    }

    // Cost estimation removed per user request (no flight API available)

    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'costs_complete',
        progress: 95
      });
    }

    // Final validation
    const validated = this.validator.validateAndFixItinerary(enriched);

    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'complete',
        data: validated,
        progress: 100
      });
    }

    return validated;
  }

  /**
   * Send progress update without awaiting
   */
  private sendProgress(
    onProgress: (update: ProgressUpdate) => void | Promise<void>,
    update: ProgressUpdate
  ): void {
    try {
      onProgress(update);
    } catch (error) {
      logger.warn('AI', 'Progress callback error', { error });
    }
  }
}