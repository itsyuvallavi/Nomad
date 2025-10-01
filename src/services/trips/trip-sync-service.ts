/**
 * Trip Sync Service
 * Handles syncing between localStorage and Firestore
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/services/firebase/auth';
import { logger } from '@/lib/monitoring/logger';
import { TripSanitizer } from './trip-sanitizer';
import type { LocalSearchData, Trip } from './trip-types';

export class TripSyncService {
  private readonly COLLECTION_NAME = 'trips';
  private readonly SYNC_FLAG_KEY = 'trips_synced_to_firestore';

  /**
   * Sync local storage searches to Firestore
   */
  async syncLocalStorageToFirestore(userId: string): Promise<{ synced: number; errors: number }> {
    if (typeof window === 'undefined') {
      return { synced: 0, errors: 0 };
    }

    const stats = { synced: 0, errors: 0 };

    try {
      // Check if already synced
      const alreadySynced = localStorage.getItem(this.SYNC_FLAG_KEY);
      if (alreadySynced) {
        logger.info('TripSync', 'LocalStorage already synced to Firestore');
        return stats;
      }

      // Get local searches
      const localSearches = localStorage.getItem('nomadSearches');
      if (!localSearches) {
        logger.info('TripSync', 'No local searches to sync');
        return stats;
      }

      const searches: LocalSearchData[] = JSON.parse(localSearches);
      logger.info('TripSync', `Syncing ${searches.length} local searches to Firestore`);

      // Process each search
      for (const search of searches) {
        try {
          // Check if trip already exists
          const existingTrip = await this.checkTripExists(search.id);
          if (existingTrip) {
            logger.debug('TripSync', `Trip ${search.id} already exists, skipping`);
            continue;
          }

          // Create trip from search
          await this.createTripFromSearch(userId, search);
          stats.synced++;

          logger.info('TripSync', `Synced trip ${search.id} to Firestore`);
        } catch (error) {
          logger.error('TripSync', `Failed to sync trip ${search.id}`, error);
          stats.errors++;
        }
      }

      // Mark as synced if at least some were successful
      if (stats.synced > 0) {
        localStorage.setItem(this.SYNC_FLAG_KEY, 'true');
        logger.info('TripSync', `Successfully synced ${stats.synced} trips to Firestore`);
      }

    } catch (error) {
      logger.error('TripSync', 'Failed to sync localStorage to Firestore', error);
    }

    return stats;
  }

  /**
   * Check if a trip already exists
   */
  private async checkTripExists(tripId: string): Promise<boolean> {
    try {
      const tripRef = doc(db, this.COLLECTION_NAME, tripId);
      const tripSnap = await getDoc(tripRef);
      return tripSnap.exists();
    } catch (error) {
      logger.error('TripSync', `Failed to check if trip ${tripId} exists`, error);
      return false;
    }
  }

  /**
   * Create a trip from local search data
   */
  private async createTripFromSearch(userId: string, search: LocalSearchData): Promise<void> {
    const tripData = {
      id: search.id,
      userId,
      title: TripSanitizer.extractTitle(search),
      destination: search.destination || 'Unknown',
      prompt: search.message || '',
      duration: search.duration || 3,
      currency: 'USD',
      travelStyle: 'mid-range' as const,
      status: 'draft' as const,
      chatState: TripSanitizer.cleanForFirestore(search.response),
      createdAt: Timestamp.fromDate(new Date(search.timestamp || Date.now())),
      updatedAt: serverTimestamp(),
      isFavorite: false,
      tags: TripSanitizer.generateTags(search)
    };

    const tripRef = doc(db, this.COLLECTION_NAME, search.id);
    await setDoc(tripRef, tripData);
  }

  /**
   * Check for new trips in Firestore that aren't in localStorage
   */
  async checkForNewTrips(userId: string): Promise<Trip[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    const newTrips: Trip[] = [];

    try {
      // Get local trip IDs
      const localSearches = localStorage.getItem('nomadSearches');
      const localTripIds = new Set<string>();

      if (localSearches) {
        const searches: LocalSearchData[] = JSON.parse(localSearches);
        searches.forEach(s => localTripIds.add(s.id));
      }

      // Get Firestore trips
      const tripsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(tripsQuery);

      // Find trips not in localStorage
      querySnapshot.forEach((doc) => {
        if (!localTripIds.has(doc.id)) {
          newTrips.push({ id: doc.id, ...doc.data() } as Trip);
        }
      });

      if (newTrips.length > 0) {
        logger.info('TripSync', `Found ${newTrips.length} new trips in Firestore`);

        // Optionally update localStorage with new trips
        await this.updateLocalStorageWithNewTrips(newTrips);
      }

    } catch (error) {
      logger.error('TripSync', 'Failed to check for new trips', error);
    }

    return newTrips;
  }

  /**
   * Update localStorage with new trips from Firestore
   */
  private async updateLocalStorageWithNewTrips(trips: Trip[]): Promise<void> {
    try {
      const localSearches = localStorage.getItem('nomadSearches');
      const searches: LocalSearchData[] = localSearches ? JSON.parse(localSearches) : [];

      for (const trip of trips) {
        searches.push({
          id: trip.id,
          message: trip.prompt,
          response: trip.chatState,
          timestamp: trip.createdAt.toDate().toISOString(),
          synced: true,
          destination: trip.destination,
          duration: trip.duration
        });
      }

      localStorage.setItem('nomadSearches', JSON.stringify(searches));
      logger.info('TripSync', `Updated localStorage with ${trips.length} new trips`);
    } catch (error) {
      logger.error('TripSync', 'Failed to update localStorage with new trips', error);
    }
  }

  /**
   * Perform bidirectional sync
   */
  async performFullSync(userId: string): Promise<{
    localToFirestore: { synced: number; errors: number };
    firestoreToLocal: number;
  }> {
    const localToFirestore = await this.syncLocalStorageToFirestore(userId);
    const newTrips = await this.checkForNewTrips(userId);

    return {
      localToFirestore,
      firestoreToLocal: newTrips.length
    };
  }
}