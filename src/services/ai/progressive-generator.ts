/**
 * Progressive Itinerary Generator (Refactored)
 * Orchestrates progressive generation using specialized modules
 */

import { logger } from '@/lib/monitoring/logger';
import { MetadataGenerator } from './progressive/metadata-generator';
import { CityGenerator } from './progressive/city-generator';
import { ItineraryCombiner } from './progressive/itinerary-combiner';
import {
  TripMetadata,
  CityItinerary,
  GenerationParams,
  ProgressUpdate,
  DayPlan,
  Activity
} from './types/core.types';

// Re-export types for backward compatibility
export type {
  TripMetadata,
  CityItinerary,
  DayPlan,
  Activity
};

export class ProgressiveGenerator {
  private metadataGenerator: MetadataGenerator;
  private cityGenerator: CityGenerator;
  private itineraryCombiner: ItineraryCombiner;

  constructor(apiKey?: string) {
    this.metadataGenerator = new MetadataGenerator();
    this.cityGenerator = new CityGenerator(apiKey);
    this.itineraryCombiner = new ItineraryCombiner();
  }

  /**
   * Main progressive generation flow
   */
  async generateProgressive(params: GenerationParams) {
    const updates: any[] = [];
    console.log('🚀 [ProgressiveGenerator] Starting generation for:', params.destinations);

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

    // Step 2: Generate each city
    const cityItineraries = await this.generateAllCities(params, metadata);
    updates.push(...cityItineraries.updates);

    // Step 3: Combine into final itinerary
    console.log('📦 [ProgressiveGenerator] Combining all city itineraries...');
    const finalItinerary = this.itineraryCombiner.combine(
      metadata,
      cityItineraries.itineraries
    );
    console.log(`✅ [ProgressiveGenerator] Final itinerary ready with ${finalItinerary.itinerary.length} total days`);

    // Send completion update
    if (params.onProgress) {
      this.sendProgress(params.onProgress, {
        type: 'complete',
        data: finalItinerary,
        progress: 100
      });
    }

    console.log('🎉 [ProgressiveGenerator] Generation complete, returning itinerary');
    return {
      itinerary: finalItinerary,
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
      currentDate = this.getNextDate(currentDate, daysForCity);
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

  /**
   * Helper: Get next date
   */
  private getNextDate(currentDate: string, daysToAdd: number): string {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
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
    return this.itineraryCombiner.combine(metadata, cityItineraries);
  }
}