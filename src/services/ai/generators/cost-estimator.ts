/**
 * Cost Estimator Module
 * Estimates trip costs based on destination, duration, and budget level
 * Provides detailed cost breakdowns for flights, hotels, and daily expenses
 */

import type { GeneratePersonalizedItineraryOutput } from '../types/core.types';
import { logger } from '@/lib/monitoring/logger';

export interface TripCostEstimate {
  flights: number;
  hotels: number;
  dailyExpenses: number;
  activities: number;
  localTransport: number;
  total: number;
  currency: string;
}

export class CostEstimator {
  // Base costs by region and budget level (in USD)
  private readonly baseCosts = {
    europe: {
      budget: { hotel: 50, meals: 30, transport: 15, activities: 20 },
      medium: { hotel: 120, meals: 60, transport: 25, activities: 40 },
      luxury: { hotel: 300, meals: 150, transport: 50, activities: 80 }
    },
    asia: {
      budget: { hotel: 30, meals: 20, transport: 10, activities: 15 },
      medium: { hotel: 80, meals: 40, transport: 20, activities: 30 },
      luxury: { hotel: 250, meals: 100, transport: 40, activities: 60 }
    },
    americas: {
      budget: { hotel: 60, meals: 35, transport: 20, activities: 25 },
      medium: { hotel: 150, meals: 70, transport: 30, activities: 45 },
      luxury: { hotel: 400, meals: 180, transport: 60, activities: 90 }
    },
    default: {
      budget: { hotel: 50, meals: 30, transport: 15, activities: 20 },
      medium: { hotel: 120, meals: 60, transport: 25, activities: 40 },
      luxury: { hotel: 300, meals: 150, transport: 50, activities: 80 }
    }
  };

  // Flight cost estimates by region (round trip in USD)
  private readonly flightCosts = {
    domestic: { budget: 200, medium: 400, luxury: 800 },
    shortHaul: { budget: 300, medium: 600, luxury: 1200 },
    mediumHaul: { budget: 500, medium: 1000, luxury: 2500 },
    longHaul: { budget: 800, medium: 1500, luxury: 4000 }
  };

  /**
   * Add cost estimates to itinerary
   */
  async addCostEstimates(
    itinerary: GeneratePersonalizedItineraryOutput,
    params: {
      budget?: 'budget' | 'medium' | 'luxury';
      travelers?: { adults: number; children: number };
    }
  ): Promise<GeneratePersonalizedItineraryOutput> {
    const budget = params.budget || 'medium';
    const adults = params.travelers?.adults || 1;
    const children = params.travelers?.children || 0;

    const estimate = await this.estimateTripCosts(
      itinerary.destination || 'Unknown',
      itinerary.dailyItineraries?.length || 0,
      budget,
      adults,
      children
    );

    // Add to itinerary
    const updatedItinerary = {
      ...itinerary,
      estimatedCost: estimate.total,
      costBreakdown: {
        flights: estimate.flights,
        accommodation: estimate.hotels,
        dailyExpenses: estimate.dailyExpenses,
        activities: estimate.activities,
        localTransport: estimate.localTransport,
        total: estimate.total,
        currency: estimate.currency,
        perPerson: Math.round(estimate.total / (adults + children * 0.7))
      }
    };

    logger.info('AI', 'Cost estimate added', {
      destination: itinerary.destination,
      budget,
      total: estimate.total
    });

    return updatedItinerary;
  }

  /**
   * Estimate trip costs
   */
  async estimateTripCosts(
    destination: string,
    duration: number,
    budget: 'budget' | 'medium' | 'luxury',
    adults: number = 1,
    children: number = 0
  ): Promise<TripCostEstimate> {
    const region = this.determineRegion(destination);
    const costs = this.baseCosts[region] || this.baseCosts.default;
    const dailyCosts = costs[budget];

    // Calculate flight costs
    const flightDistance = this.estimateFlightDistance(destination);
    const flightCategory = this.getFlightCategory(flightDistance);
    const flightCost = this.flightCosts[flightCategory][budget];

    // Calculate accommodation (children often stay free or at reduced rate)
    const roomsNeeded = Math.ceil((adults + children) / 2);
    const hotelTotal = dailyCosts.hotel * roomsNeeded * (duration - 1); // nights = days - 1

    // Calculate daily expenses
    const mealsPerDay = dailyCosts.meals * adults + (dailyCosts.meals * 0.5 * children);
    const mealsTotal = mealsPerDay * duration;

    // Calculate transport
    const transportPerDay = dailyCosts.transport * (adults + children * 0.5);
    const transportTotal = transportPerDay * duration;

    // Calculate activities
    const activitiesPerDay = dailyCosts.activities * adults + (dailyCosts.activities * 0.5 * children);
    const activitiesTotal = activitiesPerDay * duration;

    // Total per person costs
    const totalFlights = flightCost * (adults + children * 0.7);

    const estimate: TripCostEstimate = {
      flights: Math.round(totalFlights),
      hotels: Math.round(hotelTotal),
      dailyExpenses: Math.round(mealsTotal),
      activities: Math.round(activitiesTotal),
      localTransport: Math.round(transportTotal),
      total: 0,
      currency: 'USD'
    };

    estimate.total =
      estimate.flights +
      estimate.hotels +
      estimate.dailyExpenses +
      estimate.activities +
      estimate.localTransport;

    logger.debug('AI', 'Trip cost estimated', {
      destination,
      duration,
      budget,
      total: estimate.total
    });

    return estimate;
  }

  /**
   * Determine region from destination
   */
  private determineRegion(destination: string): keyof typeof this.baseCosts {
    const dest = destination.toLowerCase();

    // Europe
    const europeDestinations = [
      'paris', 'london', 'rome', 'barcelona', 'amsterdam', 'berlin',
      'prague', 'vienna', 'budapest', 'lisbon', 'madrid', 'athens'
    ];
    if (europeDestinations.some(city => dest.includes(city))) {
      return 'europe';
    }

    // Asia
    const asiaDestinations = [
      'tokyo', 'kyoto', 'osaka', 'seoul', 'bangkok', 'singapore',
      'hong kong', 'taipei', 'shanghai', 'beijing', 'delhi', 'mumbai'
    ];
    if (asiaDestinations.some(city => dest.includes(city))) {
      return 'asia';
    }

    // Americas
    const americasDestinations = [
      'new york', 'los angeles', 'chicago', 'miami', 'san francisco',
      'toronto', 'vancouver', 'mexico city', 'buenos aires', 'rio'
    ];
    if (americasDestinations.some(city => dest.includes(city))) {
      return 'americas';
    }

    return 'default';
  }

  /**
   * Estimate flight distance based on destination
   */
  private estimateFlightDistance(destination: string): number {
    const dest = destination.toLowerCase();

    // Rough estimates from US East Coast
    const distances: Record<string, number> = {
      // Domestic
      'new york': 0,
      'los angeles': 2500,
      'chicago': 800,
      'miami': 1200,
      'san francisco': 2600,

      // Short haul
      'toronto': 400,
      'mexico city': 2100,
      'cancun': 1600,

      // Medium haul
      'london': 3500,
      'paris': 3700,
      'amsterdam': 3800,
      'madrid': 3600,

      // Long haul
      'tokyo': 7000,
      'singapore': 9500,
      'sydney': 10000,
      'dubai': 7000,
      'johannesburg': 8000
    };

    // Find matching destination
    for (const [city, distance] of Object.entries(distances)) {
      if (dest.includes(city)) {
        return distance;
      }
    }

    // Default to medium haul
    return 4000;
  }

  /**
   * Get flight category based on distance
   */
  private getFlightCategory(distance: number): keyof typeof this.flightCosts {
    if (distance < 500) return 'domestic';
    if (distance < 3000) return 'shortHaul';
    if (distance < 6000) return 'mediumHaul';
    return 'longHaul';
  }

  /**
   * Format cost for display
   */
  formatCost(amount: number, currency: string = 'USD'): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥'
    };

    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${amount.toLocaleString()}`;
  }

  /**
   * Get budget recommendations
   */
  getBudgetRecommendations(
    destination: string,
    duration: number
  ): {
    budget: { min: number; max: number };
    medium: { min: number; max: number };
    luxury: { min: number; max: number };
  } {
    const budgetEst = this.estimateTripCostsSync(destination, duration, 'budget');
    const mediumEst = this.estimateTripCostsSync(destination, duration, 'medium');
    const luxuryEst = this.estimateTripCostsSync(destination, duration, 'luxury');

    return {
      budget: {
        min: Math.round(budgetEst.total * 0.8),
        max: Math.round(budgetEst.total * 1.2)
      },
      medium: {
        min: Math.round(mediumEst.total * 0.8),
        max: Math.round(mediumEst.total * 1.2)
      },
      luxury: {
        min: Math.round(luxuryEst.total * 0.8),
        max: Math.round(luxuryEst.total * 1.5)
      }
    };
  }

  /**
   * Synchronous version of cost estimation for recommendations
   */
  private estimateTripCostsSync(
    destination: string,
    duration: number,
    budget: 'budget' | 'medium' | 'luxury'
  ): TripCostEstimate {
    const region = this.determineRegion(destination);
    const costs = this.baseCosts[region] || this.baseCosts.default;
    const dailyCosts = costs[budget];

    const flightDistance = this.estimateFlightDistance(destination);
    const flightCategory = this.getFlightCategory(flightDistance);
    const flightCost = this.flightCosts[flightCategory][budget];

    return {
      flights: flightCost,
      hotels: dailyCosts.hotel * (duration - 1),
      dailyExpenses: dailyCosts.meals * duration,
      activities: dailyCosts.activities * duration,
      localTransport: dailyCosts.transport * duration,
      total: flightCost +
        dailyCosts.hotel * (duration - 1) +
        dailyCosts.meals * duration +
        dailyCosts.activities * duration +
        dailyCosts.transport * duration,
      currency: 'USD'
    };
  }
}