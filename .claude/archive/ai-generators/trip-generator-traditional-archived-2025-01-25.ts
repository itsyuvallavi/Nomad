/**
 * Trip Generator V2 - Ultra-modular version
 * Core orchestrator for itinerary generation
 * Delegates all specific tasks to specialized modules
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { GeneratePersonalizedItineraryOutput } from './types/core.types';

// Import specialized modules
import { getCityZones } from './data/city-zones';
import { RouteOptimizer } from './generators/route-optimizer';
import { CostEstimator } from './generators/cost-estimator';
import { PromptBuilder } from './generators/prompt-builder';
import { ItineraryValidator } from './generators/itinerary-validator';
import { ItineraryEnricher } from './generators/itinerary-enricher';

// Using HERE Places API exclusively for location data
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
  budget?: 'budget' | 'medium' | 'luxury';
  interests?: string[];
}

export class TripGenerator {
  private openai: OpenAI;
  private routeOptimizer: RouteOptimizer;
  private costEstimator: CostEstimator;
  private promptBuilder: PromptBuilder;
  private validator: ItineraryValidator;
  private enricher: ItineraryEnricher;

  constructor() {
    this.openai = getOpenAIClient();
    this.routeOptimizer = new RouteOptimizer();
    this.costEstimator = new CostEstimator();
    this.promptBuilder = new PromptBuilder();
    this.validator = new ItineraryValidator();
    this.enricher = new ItineraryEnricher();

    logger.debug('AI', 'Trip Generator V2 initialized');
  }

  /**
   * Generate a complete itinerary
   */
  async generateItinerary(params: TripParams): Promise<GeneratePersonalizedItineraryOutput> {
    // Validate parameters
    this.validator.validateParams(params);

    console.log(`\n   📍 TRIP GENERATOR STARTED:`);
    console.log(`      Destination: ${params.destination}`);
    console.log(`      Duration: ${params.duration} days`);
    console.log(`      Start Date: ${params.startDate}\n`);

    try {
      const startTime = Date.now();

      // Step 1: Generate base itinerary with GPT
      console.log(`   🏗️  Generating base itinerary...`);
      const baseItinerary = await this.generateBaseItinerary(params);
      console.log(`      Generation time: ${Date.now() - startTime}ms\n`);

      // Step 2: Optimize routes
      console.log(`   🛣️  Optimizing routes...`);
      const optimized = this.routeOptimizer.optimizeDailyRoutes(baseItinerary);

      // Step 3: Enrich with real location data
      console.log(`   🏢 Enriching locations...`);
      const enriched = await this.enricher.enrichItinerary(optimized);

      // Step 4: Add cost estimates
      console.log(`   💰 Calculating costs...`);
      const budgetLevel = params.budget ||
        (params.preferences?.budget === 'mid' ? 'medium' : params.preferences?.budget) ||
        'medium';

      const withCosts = await this.costEstimator.addCostEstimates(enriched, {
        budget: budgetLevel as 'budget' | 'medium' | 'luxury',
        travelers: params.travelers
      });

      // Step 5: Final validation
      const validated = this.validator.validateAndFixItinerary(withCosts);

      console.log(`\n   ✅ Generation complete (${Date.now() - startTime}ms)`);
      return validated;

    } catch (error) {
      logger.error('AI', 'Failed to generate itinerary', { error });
      throw error;
    }
  }

  /**
   * Generate base itinerary using GPT
   */
  private async generateBaseItinerary(
    params: TripParams
  ): Promise<GeneratePersonalizedItineraryOutput> {
    // Get zone guidance
    const zones = getCityZones(params.destination);
    const zoneGuidance = this.promptBuilder.buildZoneGuidance(zones, params.duration);

    // Build prompts
    const systemPrompt = PROMPTS.generation?.systemPrompt || this.getDefaultSystemPrompt();
    const userPrompt = this.promptBuilder.buildItineraryPrompt(params, zoneGuidance);

    try {
      // Call GPT
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4o-mini');
      }

      // Parse and validate
      const parsed = this.validator.parseJSONSafely(content);
      if (!parsed) {
        throw new Error('Failed to parse GPT response');
      }

      return this.validator.ensureItineraryStructure(parsed, params);

    } catch (error) {
      logger.error('AI', 'GPT generation failed', { error });
      throw error;
    }
  }

  /**
   * Modify an existing itinerary
   */
  async modifyItinerary(
    currentItinerary: GeneratePersonalizedItineraryOutput,
    userFeedback: string
  ): Promise<GeneratePersonalizedItineraryOutput> {
    console.log('🔄 Modifying itinerary based on feedback');

    const prompts = this.promptBuilder.buildModificationPrompt(
      currentItinerary,
      userFeedback
    );

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: prompts.user }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT for modification');
      }

      const parsed = this.validator.parseJSONSafely(content);
      if (!parsed) {
        throw new Error('Failed to parse modified itinerary');
      }

      // Process through pipeline
      const optimized = this.routeOptimizer.optimizeDailyRoutes(parsed);
      const enriched = await this.enricher.enrichItinerary(optimized);
      return this.validator.validateAndFixItinerary(enriched);

    } catch (error) {
      logger.error('AI', 'Failed to modify itinerary', { error });
      throw error;
    }
  }

  /**
   * Get default system prompt if PROMPTS not available
   */
  private getDefaultSystemPrompt(): string {
    return `You are an expert travel planner. Create detailed, personalized itineraries.

    Format your response as a JSON object with this structure:
    {
      "destination": "city name",
      "title": "trip title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "duration": number,
      "dailyItineraries": [
        {
          "dayNumber": number,
          "date": "YYYY-MM-DD",
          "title": "day title",
          "activities": [
            {
              "time": "time string",
              "description": "activity description",
              "venue_name": "specific venue name",
              "address": "address if known",
              "category": "Activity category"
            }
          ]
        }
      ],
      "accommodation": {
        "name": "hotel name",
        "type": "hotel type",
        "location": "area/neighborhood"
      },
      "localTips": ["tip 1", "tip 2"]
    }`;
  }
}