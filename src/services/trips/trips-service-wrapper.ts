/**
 * Trips Service Wrapper
 * Maintains backward compatibility while using new modular architecture
 */

import { tripsServiceV2 } from './trips-service-v2';
import type { Trip, CreateTripInput } from './trip-types';

class TripsServiceWrapper {
  private service = tripsServiceV2;

  // Maintain all original method signatures
  async createTrip(input: CreateTripInput): Promise<Trip> {
    return this.service.createTrip(input);
  }

  async getUserTrips(userId: string, limitCount: number = 50): Promise<Trip[]> {
    return this.service.getUserTrips({
      userId,
      limit: limitCount
    });
  }

  async getTrip(tripId: string): Promise<Trip | null> {
    return this.service.getTrip(tripId);
  }

  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
    return this.service.updateTrip(tripId, updates);
  }

  async deleteTrip(tripId: string): Promise<void> {
    return this.service.deleteTrip(tripId);
  }

  async toggleFavorite(tripId: string, isFavorite: boolean): Promise<void> {
    return this.service.toggleFavorite(tripId, isFavorite);
  }

  async updateTripStatus(tripId: string, status: Trip['status']): Promise<void> {
    return this.service.updateTripStatus(tripId, status);
  }

  async syncLocalStorageToFirestore(userId: string): Promise<any> {
    return this.service.syncLocalStorageToFirestore(userId);
  }

  // Additional convenience methods
  async getRecentTrips(userId: string, limit: number = 5): Promise<Trip[]> {
    return this.service.getRecentTrips(userId, limit);
  }

  async getFavoriteTrips(userId: string, limit: number = 10): Promise<Trip[]> {
    return this.service.getFavoriteTrips(userId, limit);
  }

  async searchTrips(userId: string, searchTerm: string): Promise<Trip[]> {
    return this.service.searchTrips(userId, searchTerm);
  }
}

// Export singleton instance for backward compatibility
export const tripsService = new TripsServiceWrapper();