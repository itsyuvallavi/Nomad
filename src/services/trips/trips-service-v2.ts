/**
 * Trips Service V2 - Refactored
 * Core CRUD operations for trips in Firestore
 * Delegates complex operations to specialized modules
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/services/firebase/auth';
import { logger } from '@/lib/monitoring/logger';
import { TripSanitizer } from './trip-sanitizer';
import { TripSyncService } from './trip-sync-service';
import type { Trip, CreateTripInput, TripQueryOptions } from './trip-types';

export class TripsServiceV2 {
  private readonly COLLECTION_NAME = 'trips';
  private readonly syncService: TripSyncService;

  constructor() {
    this.syncService = new TripSyncService();
  }

  /**
   * Create a new trip
   */
  async createTrip(input: CreateTripInput): Promise<Trip> {
    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract and clean data
    const tripData: Trip = {
      id: tripId,
      userId: input.userId,
      title: input.title || TripSanitizer.extractTitle(input),
      destination: input.destination || TripSanitizer.extractDestination(input),
      prompt: input.prompt,
      startDate: input.startDate,
      endDate: input.endDate,
      duration: input.duration || TripSanitizer.extractDuration(input),
      budget: input.budget,
      currency: input.currency || 'USD',
      travelStyle: input.travelStyle || 'mid-range',
      status: 'draft',
      chatState: TripSanitizer.cleanForFirestore(input.chatState),
      itinerary: TripSanitizer.cleanForFirestore(input.itinerary),
      createdAt: Timestamp.now(),
      updatedAt: serverTimestamp() as Timestamp,
      isFavorite: false,
      tags: input.tags || TripSanitizer.generateTags(input),
      imageUrl: input.imageUrl
    };

    try {
      const tripRef = doc(db, this.COLLECTION_NAME, tripId);
      await setDoc(tripRef, tripData);

      logger.info('TripsService', `Created trip ${tripId}`, {
        destination: tripData.destination,
        duration: tripData.duration
      });

      return tripData;
    } catch (error) {
      logger.error('TripsService', `Failed to create trip ${tripId}`, error);
      throw new Error(`Failed to create trip: ${error}`);
    }
  }

  /**
   * Get trips for a user with flexible query options
   */
  async getUserTrips(options: TripQueryOptions): Promise<Trip[]> {
    const {
      userId,
      limit = 50,
      orderBy: orderField = 'createdAt',
      orderDirection = 'desc',
      status,
      isFavorite
    } = options;

    try {
      // Build query constraints
      const constraints = [
        where('userId', '==', userId),
        orderBy(orderField, orderDirection),
        firestoreLimit(limit)
      ];

      // Add optional filters
      if (status) {
        constraints.splice(1, 0, where('status', '==', status));
      }
      if (typeof isFavorite === 'boolean') {
        constraints.splice(1, 0, where('isFavorite', '==', isFavorite));
      }

      const tripsQuery = query(collection(db, this.COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(tripsQuery);

      const trips: Trip[] = [];
      querySnapshot.forEach((doc) => {
        trips.push({ id: doc.id, ...doc.data() } as Trip);
      });

      logger.info('TripsService', `Retrieved ${trips.length} trips for user ${userId}`);
      return trips;

    } catch (error: any) {
      // Handle missing index error
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        logger.warn('TripsService', 'Index not available, falling back to simple query');
        return this.getUserTripsSimple(userId, limit);
      }

      logger.error('TripsService', `Failed to get trips for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Simplified query without ordering (fallback for missing indexes)
   */
  private async getUserTripsSimple(userId: string, limit: number): Promise<Trip[]> {
    const tripsQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(tripsQuery);
    const trips: Trip[] = [];

    querySnapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });

    // Manual sorting and limiting
    trips.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    return trips.slice(0, limit);
  }

  /**
   * Get a single trip by ID
   */
  async getTrip(tripId: string): Promise<Trip | null> {
    try {
      const tripRef = doc(db, this.COLLECTION_NAME, tripId);
      const tripSnap = await getDoc(tripRef);

      if (!tripSnap.exists()) {
        logger.warn('TripsService', `Trip ${tripId} not found`);
        return null;
      }

      // Update last opened timestamp
      await updateDoc(tripRef, {
        lastOpenedAt: serverTimestamp()
      });

      return { id: tripSnap.id, ...tripSnap.data() } as Trip;

    } catch (error) {
      logger.error('TripsService', `Failed to get trip ${tripId}`, error);
      throw error;
    }
  }

  /**
   * Update a trip
   */
  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
    try {
      // Clean and validate updates
      const cleanedUpdates = TripSanitizer.validateUpdate(updates);
      cleanedUpdates.updatedAt = serverTimestamp();

      const tripRef = doc(db, this.COLLECTION_NAME, tripId);
      await updateDoc(tripRef, cleanedUpdates);

      logger.info('TripsService', `Updated trip ${tripId}`, {
        fields: Object.keys(cleanedUpdates)
      });

    } catch (error) {
      logger.error('TripsService', `Failed to update trip ${tripId}`, error);
      throw error;
    }
  }

  /**
   * Delete a trip
   */
  async deleteTrip(tripId: string): Promise<void> {
    try {
      const tripRef = doc(db, this.COLLECTION_NAME, tripId);
      await deleteDoc(tripRef);

      logger.info('TripsService', `Deleted trip ${tripId}`);
    } catch (error) {
      logger.error('TripsService', `Failed to delete trip ${tripId}`, error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(tripId: string, isFavorite: boolean): Promise<void> {
    await this.updateTrip(tripId, { isFavorite });
  }

  /**
   * Update trip status
   */
  async updateTripStatus(tripId: string, status: Trip['status']): Promise<void> {
    await this.updateTrip(tripId, { status });
  }

  /**
   * Get recent trips
   */
  async getRecentTrips(userId: string, limit: number = 5): Promise<Trip[]> {
    return this.getUserTrips({
      userId,
      limit,
      orderBy: 'lastOpenedAt',
      orderDirection: 'desc'
    });
  }

  /**
   * Get favorite trips
   */
  async getFavoriteTrips(userId: string, limit: number = 10): Promise<Trip[]> {
    return this.getUserTrips({
      userId,
      limit,
      isFavorite: true
    });
  }

  /**
   * Search trips by destination or tags
   */
  async searchTrips(userId: string, searchTerm: string): Promise<Trip[]> {
    const allTrips = await this.getUserTrips({ userId, limit: 100 });

    const searchLower = searchTerm.toLowerCase();
    return allTrips.filter(trip =>
      trip.destination.toLowerCase().includes(searchLower) ||
      trip.title.toLowerCase().includes(searchLower) ||
      trip.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Sync operations (delegated to TripSyncService)
   */
  async syncLocalStorageToFirestore(userId: string) {
    return this.syncService.syncLocalStorageToFirestore(userId);
  }

  async checkForNewTrips(userId: string) {
    return this.syncService.checkForNewTrips(userId);
  }

  async performFullSync(userId: string) {
    return this.syncService.performFullSync(userId);
  }
}

// Export singleton instance
export const tripsServiceV2 = new TripsServiceV2();