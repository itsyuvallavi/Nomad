/**
 * Unified AI Generator for Nomad Navigator
 * Consolidates all generation strategies into a single, maintainable implementation
 */

import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { parseDestinations } from '@/services/ai/utils/destination-parser';
import { GeneratePersonalizedItineraryOutputSchema, ItinerarySchema } from '@/services/ai/schemas';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { OpenAIProvider } from './providers/openai';
import { safeChat } from './safeChat';
import type { LLMProvider } from './providers/types';

// Performance metrics
interface GenerationMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  tokensUsed?: number;
  strategy: 'fast' | 'chunked' | 'simple';
  success: boolean;
  error?: string;
}

// Generation context interface
export interface GenerationContext {
  origin?: string;
  destinations: { city: string; days: number }[];
  startDate?: string;
  keys: { weather?: boolean }; // Removed unused places and amadeus
  flags: { stream?: boolean };
}

class UnifiedItineraryGenerator {
  private llm: LLMProvider;
  private metrics: GenerationMetrics[] = [];

  constructor(provider?: LLMProvider) {
    this.llm = provider || new OpenAIProvider();
    logger.info('AI', 'Unified generator initialized with provider:', this.llm.name);
  }

  public isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Main generation method - routes to appropriate strategy
   */
  public async generate(
    ctx: GenerationContext,
    emit?: (evt: string, data: any) => void
  ): Promise<GeneratePersonalizedItineraryOutput> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is required. Please add OPENAI_API_KEY to your .env file.');
    }

    const metrics: GenerationMetrics = {
      startTime: Date.now(),
      strategy: 'fast',
      success: false
    };

    try {
      // Choose strategy based on complexity
      const strategy = this.pickStrategy(ctx);
      logger.info('AI', 'Using strategy', { strategy: metrics.strategy });
      
      return await strategy(ctx, emit, metrics);
    } catch (error) {
      metrics.success = false;
      metrics.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      this.metrics.push(metrics);
      
      logger.info('AI', 'Generation metrics', {
        strategy: metrics.strategy,
        duration: `${(metrics.duration / 1000).toFixed(2)}s`,
        success: metrics.success
      });
    }
  }

  /**
   * Pick strategy based on context
   */
  private pickStrategy(ctx: GenerationContext): (ctx: GenerationContext, emit?: (evt: string, data: any) => void, metrics?: GenerationMetrics) => Promise<GeneratePersonalizedItineraryOutput> {
    const n = ctx.destinations.length;
    const totalDays = ctx.destinations.reduce((a, b) => a + b.days, 0);
    const hasAPIs = !!(ctx.keys.weather); // Only weather API check remains
    
    if (n === 1 && totalDays <= 5) return this.generateSimple.bind(this);
    if (hasAPIs && totalDays >= 6) return this.generateUltraFast.bind(this);
    return this.generateChunked.bind(this);
  }

  /**
   * Simple generation for straightforward trips
   */
  private async generateSimple(
    ctx: GenerationContext,
    emit?: (evt: string, data: any) => void,
    metrics?: GenerationMetrics
  ): Promise<GeneratePersonalizedItineraryOutput> {
    const system = 'You are a travel itinerary planner. Create a detailed day-by-day itinerary with activities, times, and addresses. Respond ONLY with valid JSON matching the schema.';
    const user = JSON.stringify(ctx);
    
    const result = await safeChat(this.llm, system, user, ItinerarySchema, { 
      temperature: 0.3, 
      maxTokens: 3500 
    });
    
    if (metrics) {
      metrics.success = true;
      metrics.strategy = 'simple';
    }

    return result as GeneratePersonalizedItineraryOutput;
  }

  /**
   * Chunked generation for complex multi-destination trips
   */
  private async generateChunked(
    ctx: GenerationContext,
    emit?: (evt: string, data: any) => void,
    metrics?: GenerationMetrics
  ): Promise<GeneratePersonalizedItineraryOutput> {
    // For now, use simple generation
    // TODO: Implement chunked generation with parallel processing
    if (metrics) {
      metrics.strategy = 'chunked';
    }
    return await this.generateSimple(ctx, emit, metrics);
  }

  /**
   * Ultra-fast generation with parallel API calls
   */
  private async generateUltraFast(
    ctx: GenerationContext,
    emit?: (evt: string, data: any) => void,
    metrics?: GenerationMetrics
  ): Promise<GeneratePersonalizedItineraryOutput> {
    // For now, use simple generation
    // TODO: Implement parallel processing with Places/Weather/Amadeus APIs
    if (metrics) {
      metrics.strategy = 'fast';
    }
    return await this.generateSimple(ctx, emit, metrics);
  }

  /**
   * Combine multiple destination chunks into single itinerary
   */
  private combineChunks(
    chunks: GeneratePersonalizedItineraryOutput[],
    parsedTrip: any
  ): GeneratePersonalizedItineraryOutput {
    const allDays: any[] = [];
    let dayCounter = 1;

    for (const chunk of chunks) {
      for (const day of chunk.itinerary) {
        allDays.push({
          ...day,
          day: dayCounter++
        });
      }
    }

    return {
      destination: parsedTrip.destinations.map((d: any) => d.name).join(', '),
      title: `${parsedTrip.totalDays}-Day ${parsedTrip.destinations.map((d: any) => d.name).join(' & ')} Adventure`,
      itinerary: allDays,
      quickTips: chunks.flatMap(c => c.quickTips || []).slice(0, 5)
    };
  }

  /**
   * Build the system prompt for OpenAI
   */
  private buildSystemPrompt(): string {
    return `You are an expert travel planner. Create detailed, realistic travel itineraries.

REQUIREMENTS:
1. Generate a complete day-by-day itinerary in JSON format
2. Include real places and accurate timings
3. Mix activities, meals, and experiences
4. Provide practical travel tips
5. Consider travel time between locations

OUTPUT FORMAT:
{
  "destination": "City, Country",
  "title": "Descriptive Trip Title",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day Title",
      "activities": [
        {
          "time": "9:00 AM",
          "description": "Activity description",
          "category": "Leisure|Food|Travel|Work|Attraction|Accommodation",
          "address": "Full address"
        }
      ]
    }
  ],
  "quickTips": ["Tip 1", "Tip 2", "Tip 3"]
}`;
  }

  /**
   * Build the user prompt with context
   */
  private buildUserPrompt(
    prompt: string,
    attachedFile?: string,
    conversationHistory?: string
  ): string {
    let fullPrompt = prompt;

    if (conversationHistory) {
      fullPrompt = `Previous conversation:\n${conversationHistory}\n\nCurrent request: ${prompt}`;
    }

    if (attachedFile) {
      fullPrompt += '\n\n[User has attached a file for reference]';
    }

    return fullPrompt;
  }

  /**
   * Get performance metrics
   */
  public getMetrics() {
    return {
      totalGenerations: this.metrics.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / this.metrics.length,
      successRate: this.metrics.filter(m => m.success).length / this.metrics.length,
      byStrategy: {
        fast: this.metrics.filter(m => m.strategy === 'fast'),
        chunked: this.metrics.filter(m => m.strategy === 'chunked'),
        simple: this.metrics.filter(m => m.strategy === 'simple')
      }
    };
  }
}

// Singleton instance
let generator: UnifiedItineraryGenerator | null = null;

export function getUnifiedGenerator(): UnifiedItineraryGenerator {
  if (!generator) {
    generator = new UnifiedItineraryGenerator();
  }
  return generator;
}

// Export the class for direct usage
export { UnifiedItineraryGenerator };

// Main export function for backwards compatibility
export async function generateUnifiedItinerary(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const gen = getUnifiedGenerator();
  
  // Convert prompt to GenerationContext for backwards compatibility
  const parsedTrip = parseDestinations(prompt);
  const ctx: GenerationContext = {
    origin: parsedTrip.origin,
    destinations: parsedTrip.destinations.map((d: any) => ({
      city: d.name,
      days: d.days
    })),
    keys: {
      weather: !!process.env.OPENWEATHERMAP
      // Removed Google Places and Amadeus - not implemented
    },
    flags: { stream: false }
  };
  
  return gen.generate(ctx);
}