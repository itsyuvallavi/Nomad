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
    preferences?: any;
  }): Promise<TripMetadata> {
    const startTime = Date.now();

    logger.info('AI', 'Generating trip metadata', {
      destinations: params.destinations,
      duration: params.duration
    });

    const endDate = this.calculateEndDate(params.startDate, params.duration);
    const daysPerCity = this.distributeDays(params.duration, params.destinations.length);

    const metadata: TripMetadata = {
      title: this.generateTitle(params.destinations),
      destinations: params.destinations,
      startDate: params.startDate,
      endDate: endDate,
      duration: params.duration,
      daysPerCity: daysPerCity,
      estimatedCost: this.estimateCost(params.duration, params.preferences?.budget),
      quickTips: this.getQuickTips(params.destinations),
      photos: this.generatePhotoUrls(params.destinations)
    };

    const elapsed = Date.now() - startTime;
    logger.info('AI', 'Metadata generated instantly', { time: `${elapsed}ms` });

    return metadata;
  }

  /**
   * Generate a trip title
   */
  private generateTitle(destinations: string[]): string {
    if (destinations.length === 1) {
      return `${destinations[0]} Adventure`;
    } else if (destinations.length === 2) {
      return `${destinations.join(' & ')} Journey`;
    } else {
      return `${destinations.join(' & ')} Tour`;
    }
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
   * Generate photo URLs for destinations
   */
  private generatePhotoUrls(destinations: string[]): string[] {
    return destinations.map(dest =>
      `https://source.unsplash.com/1200x800/?${encodeURIComponent(dest)}+tourism`
    );
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