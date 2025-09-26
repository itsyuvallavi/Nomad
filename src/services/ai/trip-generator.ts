/**
 * Trip Generator V3 - Refactored Version
 * Main interface that delegates to specialized generator modules
 * Maintains backward compatibility while improving code organization
 */

import { logger } from '@/lib/monitoring/logger';
import { TripOrchestrator, StreamUpdate } from './generators/trip-orchestrator';
import { TripFormatter } from './generators/trip-formatter';
import { ItineraryValidator } from './generators/itinerary-validator';
import { MetadataGenerator } from './progressive/metadata-generator';
import { CityGenerator } from './progressive/city-generator';
import {
  TripMetadata,
  CityItinerary,
  GenerationParams,
  DayPlan,
  Activity,
  GeneratePersonalizedItineraryOutput
} from './types/core.types';

// Re-export types for backward compatibility
export type {
  TripMetadata,
  CityItinerary,
  DayPlan,
  Activity,
  StreamUpdate
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

/**
 * Main TripGenerator class - maintains original API while using new modular structure
 */
export class TripGenerator {
  private orchestrator: TripOrchestrator;
  private formatter: TripFormatter;
  private validator: ItineraryValidator;
  private metadataGenerator: MetadataGenerator;
  private cityGenerator: CityGenerator;

  constructor(apiKey?: string) {
    this.orchestrator = new TripOrchestrator(apiKey);
    this.formatter = new TripFormatter();
    this.validator = new ItineraryValidator();
    this.metadataGenerator = new MetadataGenerator();
    this.cityGenerator = new CityGenerator(apiKey);

    logger.debug('AI', 'Trip Generator V3 initialized - Refactored modular version');
  }

  /**
   * Main progressive generation flow
   * Delegates to TripOrchestrator
   */
  async generateProgressive(params: GenerationParams): Promise<{
    itinerary: GeneratePersonalizedItineraryOutput;
    updates: StreamUpdate[];
  }> {
    // Validate parameters
    const tripParams = this.formatter.convertToTripParams(params);
    this.validator.validateParams(tripParams);

    // Orchestrate generation
    return this.orchestrator.orchestrateGeneration(params);
  }

  /**
   * Compatibility method for traditional TripGenerator interface
   * This makes migration easier - same interface, progressive implementation
   */
  async generateItinerary(params: any): Promise<GeneratePersonalizedItineraryOutput> {
    const progressiveParams = this.formatter.convertToProgressiveParams(params);
    const result = await this.generateProgressive(progressiveParams);
    return result.itinerary;
  }

  /**
   * Modify an existing itinerary based on user feedback
   * (Feature from traditional generator)
   */
  async modifyItinerary(
    currentItinerary: GeneratePersonalizedItineraryOutput,
    userFeedback: string
  ): Promise<GeneratePersonalizedItineraryOutput> {
    logger.info('🔄 Modifying itinerary based on feedback');

    // For now, we'll need to regenerate with modifications
    // In future, could make this more granular
    throw new Error('Modification not yet implemented in progressive generator');
  }

  /**
   * Legacy methods for backward compatibility
   */

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
   * Combine city itineraries into final format
   * @deprecated Use generateProgressive instead
   */
  combineIntoFinalFormat(
    metadata: TripMetadata,
    cityItineraries: CityItinerary[],
    params: GenerationParams
  ): GeneratePersonalizedItineraryOutput {
    return this.formatter.combineIntoStructuredFormat(metadata, cityItineraries, params);
  }

  /**
   * Validate parameters
   */
  validateParams(params: TripParams): void {
    this.validator.validateParams(params);
  }

  /**
   * Format an itinerary
   */
  formatItinerary(itinerary: any): GeneratePersonalizedItineraryOutput {
    return this.formatter.validateFormat(itinerary);
  }
}