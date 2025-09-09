/**
 * Unified AI Generator for Nomad Navigator
 * Consolidates all generation strategies into a single, maintainable implementation
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { parseDestinations } from '@/ai/utils/destination-parser';
import { GeneratePersonalizedItineraryOutputSchema } from '@/ai/schemas';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

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

class UnifiedItineraryGenerator {
  private openai: OpenAI | null = null;
  private metrics: GenerationMetrics[] = [];

  constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      logger.info('AI', 'OpenAI client initialized');
    } else {
      logger.error('AI', 'No OpenAI API key found');
    }
  }

  public isConfigured(): boolean {
    return this.openai !== null;
  }

  /**
   * Main generation method - routes to appropriate strategy
   */
  public async generate(
    prompt: string,
    attachedFile?: string,
    conversationHistory?: string
  ): Promise<GeneratePersonalizedItineraryOutput> {
    if (!this.openai) {
      throw new Error('OpenAI API key is required. Please add OPENAI_API_KEY to your .env file.');
    }

    const metrics: GenerationMetrics = {
      startTime: Date.now(),
      strategy: 'fast',
      success: false
    };

    try {
      // Parse the trip to understand complexity
      const parsedTrip = parseDestinations(prompt);
      const isMultiDestination = parsedTrip.destinations.length > 1;
      const isLongTrip = parsedTrip.totalDays > 7;

      // Choose strategy based on complexity
      if (isMultiDestination || isLongTrip) {
        metrics.strategy = 'chunked';
        logger.info('AI', 'Using chunked strategy', {
          destinations: parsedTrip.destinations.length,
          days: parsedTrip.totalDays
        });
        return await this.generateChunked(prompt, attachedFile, conversationHistory, metrics);
      } else {
        metrics.strategy = 'simple';
        logger.info('AI', 'Using simple strategy');
        return await this.generateSimple(prompt, attachedFile, conversationHistory, metrics);
      }
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
   * Simple generation for straightforward trips
   */
  private async generateSimple(
    prompt: string,
    attachedFile?: string,
    conversationHistory?: string,
    metrics?: GenerationMetrics
  ): Promise<GeneratePersonalizedItineraryOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(prompt, attachedFile, conversationHistory);

    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    const validated = GeneratePersonalizedItineraryOutputSchema.parse(parsed);
    
    if (metrics) {
      metrics.success = true;
      metrics.tokensUsed = completion.usage?.total_tokens;
    }

    return validated;
  }

  /**
   * Chunked generation for complex multi-destination trips
   */
  private async generateChunked(
    prompt: string,
    attachedFile?: string,
    conversationHistory?: string,
    metrics?: GenerationMetrics
  ): Promise<GeneratePersonalizedItineraryOutput> {
    const parsedTrip = parseDestinations(prompt);
    const chunks: any[] = [];

    // Generate each destination separately
    for (const destination of parsedTrip.destinations) {
      const chunkPrompt = `Create a ${destination.days}-day itinerary for ${destination.name}. 
        This is part of a larger trip: ${prompt}`;
      
      const chunk = await this.generateSimple(chunkPrompt, attachedFile);
      chunks.push(chunk);
    }

    // Combine chunks into final itinerary
    const combined = this.combineChunks(chunks, parsedTrip);
    
    if (metrics) {
      metrics.success = true;
    }

    return combined;
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

// Main export function for backwards compatibility
export async function generateUnifiedItinerary(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const gen = getUnifiedGenerator();
  return gen.generate(prompt, attachedFile, conversationHistory);
}