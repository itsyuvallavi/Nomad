/**
 * Metadata Generator Module
 * Generates trip metadata quickly without AI calls
 */

import { logger } from '@/lib/monitoring/logger';
import { TripMetadata } from '../types/core.types';

export class MetadataGenerator {
  /**
   * Generate trip metadata (fast - no AI needed)
   */
  async generate(params: {
    destinations: string[];
    duration: number;
    startDate: string;
    daysPerCity?: number[];
    preferences?: any;
  }): Promise<TripMetadata> {
    const startTime = Date.now();

    logger.info('AI', 'Generating trip metadata', {
      destinations: params.destinations,
      duration: params.duration,
      daysPerCity: params.daysPerCity
    });

    // Use provided daysPerCity if available, otherwise distribute evenly
    let daysPerCity: number[];
    let finalDuration = params.duration;
    
    if (params.daysPerCity && params.daysPerCity.length === params.destinations.length) {
      daysPerCity = params.daysPerCity;
      const sumOfDays = daysPerCity.reduce((a, b) => a + b, 0);
      
      // If daysPerCity is provided, duration should match the sum
      if (sumOfDays !== params.duration) {
        logger.warn('AI', '⚠️ daysPerCity sum does not match duration, using sum as duration', {
          providedDuration: params.duration,
          daysPerCitySum: sumOfDays,
          daysPerCity: params.daysPerCity
        });
        finalDuration = sumOfDays;
      }
    } else {
      daysPerCity = this.distributeDays(params.duration, params.destinations.length);
    }
    
    const endDate = this.calculateEndDate(params.startDate, finalDuration);
    
    console.log('🔍 [MetadataGenerator] Days distribution:', {
      providedDaysPerCity: params.daysPerCity,
      calculatedDaysPerCity: daysPerCity,
      destinations: params.destinations,
      totalDays: daysPerCity.reduce((a, b) => a + b, 0),
      originalDuration: params.duration,
      finalDuration: finalDuration
    });

    logger.debug('AI', '📊 Days distribution calculated', {
      provided: params.daysPerCity,
      calculated: daysPerCity,
      totalDays: daysPerCity.reduce((a, b) => a + b, 0),
      originalDuration: params.duration,
      finalDuration: finalDuration,
      destinations: params.destinations.length
    });

    const photos = await this.generatePhotoUrls(params.destinations);
    const metadata: TripMetadata = {
      title: this.generateTitle(params.destinations),
      destinations: params.destinations,
      startDate: params.startDate,
      endDate: endDate,
      duration: finalDuration, // Use corrected duration if daysPerCity was provided
      daysPerCity: daysPerCity,
      estimatedCost: this.estimateCost(finalDuration, params.preferences?.budget),
      quickTips: this.getQuickTips(params.destinations),
      photos: photos,
      photoUrl: photos[0] // Add the first photo as the main photoUrl
    };

    const elapsed = Date.now() - startTime;
    logger.info('AI', 'Metadata generated instantly', { time: `${elapsed}ms` });

    return metadata;
  }

  /**
   * Generate a trip title
   */
  private generateTitle(destinations: string[]): string {
    // Return only city names, properly capitalized
    return destinations.map(city =>
      city.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    ).join(' & ');
  }

  /**
   * Distribute days evenly across cities
   */
  private distributeDays(totalDays: number, cityCount: number): number[] {
    const baseDays = Math.floor(totalDays / cityCount);
    const remainder = totalDays % cityCount;
    const distribution = Array(cityCount).fill(baseDays);

    // Add remainder days to first cities
    for (let i = 0; i < remainder; i++) {
      distribution[i]++;
    }

    return distribution;
  }

  /**
   * Estimate trip cost based on duration and budget level
   */
  private estimateCost(duration: number, budget?: string): { total: number; currency: string } {
    const dailyCosts = {
      budget: 150,
      medium: 250,
      luxury: 500
    };

    const dailyCost = dailyCosts[budget as keyof typeof dailyCosts] || 250;

    return {
      total: Math.round(duration * dailyCost),
      currency: 'USD'
    };
  }

  /**
   * Get destination-specific tips
   */
  private getQuickTips(destinations: string[]): string[] {
    const tips: string[] = [];
    const destinationTips: Record<string, string> = {
      london: 'Get an Oyster card for London transport',
      paris: 'Book Eiffel Tower tickets in advance',
      brussels: 'Try authentic Belgian waffles and chocolate',
      rome: 'Book Vatican tickets online to skip lines',
      barcelona: 'Visit Sagrada Familia early morning',
      amsterdam: 'Rent bikes to explore like a local',
      berlin: 'Get the Berlin Welcome Card for transport',
      prague: 'Exchange money - many places don\'t accept cards',
      vienna: 'Try the famous Sachertorte cake',
      budapest: 'Visit the thermal baths for relaxation'
    };

    // Add specific tips based on destinations
    destinations.forEach(dest => {
      const destLower = dest.toLowerCase();
      Object.entries(destinationTips).forEach(([key, tip]) => {
        if (destLower.includes(key)) {
          tips.push(tip);
        }
      });
    });

    // Add general tips if we don't have enough specific ones
    if (tips.length < 2) {
      tips.push('Check visa requirements for your nationality');
      tips.push('Get travel insurance before departure');
    }

    return tips.slice(0, 4); // Return max 4 tips
  }

  /**
   * Generate placeholder photo URLs
   * Actual images are fetched client-side via /api/images
   */
  private async generatePhotoUrls(destinations: string[]): Promise<string[]> {
    // Return empty array - images will be fetched by the frontend component
    // This keeps metadata generation fast and doesn't make external API calls
    logger.info('IMAGE', 'Metadata generated without images - frontend will fetch via /api/images');
    return [];
  }

  /**
   * Calculate end date from start date and duration
   */
  private calculateEndDate(startDate: string, duration: number): string {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration - 1);
    return end.toISOString().split('T')[0];
  }
}