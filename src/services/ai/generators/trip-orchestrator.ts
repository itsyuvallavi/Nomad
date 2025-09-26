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
import { CostEstimator } from './cost-estimator';
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
  private costEstimator: CostEstimator;
  private validator: ItineraryValidator;
  private enricher: ItineraryEnricher;

  constructor(apiKey?: string) {
    this.metadataGenerator = new MetadataGenerator();
    this.cityGenerator = new CityGenerator(apiKey);
    this.routeOptimizer = new RouteOptimizer();
    this.costEstimator = new CostEstimator();
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

    logger.info('🚀 Starting trip orchestration', { destinations: params.destinations });

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
      logger.info('✅ Trip orchestration complete', { elapsedMs: elapsedTime });

      return {
        itinerary: finalItinerary,
        updates
      };
    } catch (error) {
      logger.error('❌ Orchestration failed', { error });
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
    logger.debug('📊 Generating metadata...');

    const metadata = await this.metadataGenerator.generate(params);

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

    for (let i = 0; i < params.destinations.length; i++) {
      const city = params.destinations[i];
      const daysForCity = metadata.daysPerCity?.[i] ||
        Math.floor(params.duration / params.destinations.length);

      logger.debug(`🏙️ Generating ${city} itinerary`, { days: daysForCity });

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
    logger.debug('📦 Combining city itineraries...');

    // Flatten all days from all cities
    const allDays: DayPlan[] = [];
    for (const cityIt of cityItineraries) {
      allDays.push(...cityIt.days);
    }

    // Convert to standard format
    const dailyItineraries = allDays.map(day => ({
      dayNumber: day.day,
      date: day.date,
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
    logger.debug('🛣️ Optimizing routes...');
    const optimized = this.routeOptimizer.optimizeDailyRoutes(itinerary);

    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'routes_optimized',
        progress: 70
      });
    }

    // Enrich with location data
    logger.debug('🏢 Enriching locations...');
    const enriched = await this.enricher.enrichItinerary(optimized);

    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'enrichment_complete',
        progress: 85
      });
    }

    // Add cost estimates
    logger.debug('💰 Calculating costs...');
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

    // Final validation
    const validated = this.validator.validateAndFixItinerary(withCosts);

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
      logger.warn('Progress callback error', { error });
    }
  }
}