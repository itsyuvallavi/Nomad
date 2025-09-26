/**
 * Parallel City Generator Module
 * Optimized version that generates multiple city itineraries in parallel
 * Includes error recovery and partial failure handling
 */

import { CityGenerator } from './city-generator';
import { logger } from '@/lib/monitoring/logger';
import { getNextDate } from '../utils/date.utils';
import {
  CityItinerary,
  GenerationParams,
  TripMetadata,
  ProgressUpdate
} from '../types/core.types';

export interface ParallelGenerationResult {
  itineraries: CityItinerary[];
  failures: CityGenerationFailure[];
  executionTime: number;
}

export interface CityGenerationFailure {
  city: string;
  error: Error;
  retryCount: number;
}

export interface CityGenerationTask {
  city: string;
  days: number;
  startDate: string;
  startDayNumber: number;
  preferences?: any;
}

export class ParallelCityGenerator {
  private cityGenerator: CityGenerator;
  private maxConcurrency: number;
  private maxRetries: number;

  constructor(apiKey?: string, maxConcurrency = 3, maxRetries = 2) {
    this.cityGenerator = new CityGenerator(apiKey);
    this.maxConcurrency = maxConcurrency;
    this.maxRetries = maxRetries;
  }

  /**
   * Generate all city itineraries in parallel with controlled concurrency
   */
  async generateAllCitiesParallel(
    params: GenerationParams,
    metadata: TripMetadata,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<ParallelGenerationResult> {
    const startTime = Date.now();
    const tasks = this.prepareCityTasks(params, metadata);

    logger.info('🚀 Starting parallel city generation', {
      cities: params.destinations,
      totalTasks: tasks.length,
      maxConcurrency: this.maxConcurrency
    });

    const results: CityItinerary[] = [];
    const failures: CityGenerationFailure[] = [];

    // Process tasks in batches to control concurrency
    const batches = this.createBatches(tasks, this.maxConcurrency);
    let completedCities = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, {
        cities: batch.map(t => t.city)
      });

      // Execute batch in parallel
      const batchPromises = batch.map(task =>
        this.generateWithRetry(task, this.maxRetries)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Process batch results
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const task = batch[i];

        if (result.status === 'fulfilled') {
          results.push(result.value);
          completedCities++;

          // Send progress update
          if (onProgress) {
            const progress = 20 + (completedCities / tasks.length) * 60;
            onProgress({
              type: 'city_complete',
              city: task.city,
              data: result.value,
              progress
            });
          }

          logger.info(`✅ Successfully generated ${task.city}`, {
            days: task.days
          });
        } else {
          const failure: CityGenerationFailure = {
            city: task.city,
            error: result.reason,
            retryCount: this.maxRetries
          };
          failures.push(failure);

          logger.error(`❌ Failed to generate ${task.city}`, {
            error: result.reason.message
          });

          // Try fallback generation for failed city
          const fallback = await this.generateFallback(task);
          if (fallback) {
            results.push(fallback);
            completedCities++;
          }
        }
      }
    }

    const executionTime = Date.now() - startTime;
    logger.info('✨ Parallel city generation complete', {
      successfulCities: results.length,
      failedCities: failures.length,
      executionTimeMs: executionTime
    });

    return {
      itineraries: this.sortByStartDate(results),
      failures,
      executionTime
    };
  }

  /**
   * Prepare city generation tasks
   */
  private prepareCityTasks(
    params: GenerationParams,
    metadata: TripMetadata
  ): CityGenerationTask[] {
    const tasks: CityGenerationTask[] = [];
    let currentDate = params.startDate;
    let currentDay = 1;

    for (let i = 0; i < params.destinations.length; i++) {
      const city = params.destinations[i];
      const daysForCity = metadata.daysPerCity?.[i] ||
        Math.floor(params.duration / params.destinations.length);

      tasks.push({
        city,
        days: daysForCity,
        startDate: currentDate,
        startDayNumber: currentDay,
        preferences: params.preferences
      });

      currentDate = getNextDate(currentDate, daysForCity);
      currentDay += daysForCity;
    }

    return tasks;
  }

  /**
   * Create batches for controlled concurrency
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Generate city itinerary with retry logic
   */
  private async generateWithRetry(
    task: CityGenerationTask,
    maxRetries: number
  ): Promise<CityItinerary> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`🔄 Retry attempt ${attempt}/${maxRetries} for ${task.city}`);
          // Add exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }

        const result = await this.cityGenerator.generateCityItinerary(task);
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Attempt ${attempt + 1} failed for ${task.city}`, {
          error: lastError.message
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error(`Failed to generate ${task.city} after ${maxRetries} retries`);
  }

  /**
   * Generate fallback itinerary for failed city
   */
  private async generateFallback(task: CityGenerationTask): Promise<CityItinerary | null> {
    try {
      logger.info(`🛡️ Attempting fallback generation for ${task.city}`);

      // Create a simplified itinerary structure
      const days = [];
      for (let i = 0; i < task.days; i++) {
        const dayNumber = task.startDayNumber + i;
        const date = getNextDate(task.startDate, i);

        days.push({
          day: dayNumber,
          date,
          city: task.city,
          title: `Day ${dayNumber} - ${task.city}`,
          activities: this.generateFallbackActivities(task.city),
          weather: 'Check local forecast'
        });
      }

      return {
        city: task.city,
        days
      };
    } catch (error) {
      logger.error(`Fallback generation failed for ${task.city}`, { error });
      return null;
    }
  }

  /**
   * Generate generic fallback activities
   */
  private generateFallbackActivities(city: string) {
    return [
      {
        time: '09:00',
        description: 'Explore city center and main attractions',
        category: 'exploration',
        venue_search: `city center ${city}`
      },
      {
        time: '12:00',
        description: 'Lunch at local restaurant',
        category: 'dining',
        venue_search: `restaurants ${city}`
      },
      {
        time: '14:00',
        description: 'Visit popular tourist attractions',
        category: 'sightseeing',
        venue_search: `tourist attractions ${city}`
      },
      {
        time: '18:00',
        description: 'Dinner and evening activities',
        category: 'dining',
        venue_search: `dinner restaurants ${city}`
      }
    ];
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retry on timeout, rate limit, or network errors
    if (message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('network') ||
        message.includes('econnreset') ||
        message.includes('socket')) {
      return true;
    }

    // Don't retry on validation or API key errors
    if (message.includes('api key') ||
        message.includes('invalid') ||
        message.includes('validation')) {
      return false;
    }

    // Default to retry for unknown errors
    return true;
  }

  /**
   * Sort city itineraries by start date
   */
  private sortByStartDate(itineraries: CityItinerary[]): CityItinerary[] {
    return itineraries.sort((a, b) => {
      const dateA = a.days[0]?.date || '';
      const dateB = b.days[0]?.date || '';
      return dateA.localeCompare(dateB);
    });
  }

  /**
   * Delay helper for backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Optimize batch size based on current performance
   */
  optimizeBatchSize(averageResponseTime: number): number {
    // Dynamic batch sizing based on response times
    if (averageResponseTime < 5000) {
      return Math.min(5, this.maxConcurrency);
    } else if (averageResponseTime < 10000) {
      return Math.min(3, this.maxConcurrency);
    } else {
      return Math.min(2, this.maxConcurrency);
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics() {
    return {
      maxConcurrency: this.maxConcurrency,
      maxRetries: this.maxRetries
    };
  }
}