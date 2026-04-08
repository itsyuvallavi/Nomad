/**
 * Trip Sync Service - Supabase Implementation
 * Handles syncing between localStorage and Supabase (public.trips table)
 */

import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/monitoring/logger';
import { TripSanitizer } from './trip-sanitizer';
import type { LocalSearchData, Trip } from './trip-types';

export class TripSyncService {
  private readonly TABLE = 'trips';
  private readonly SYNC_FLAG_KEY = 'trips_synced_to_supabase';

  /**
   * Sync local storage searches to Supabase
   */
  async syncLocalStorageToFirestore(userId: string): Promise<{ synced: number; errors: number }> {
    if (typeof window === 'undefined') return { synced: 0, errors: 0 };

    const stats = { synced: 0, errors: 0 };

    try {
      const alreadySynced = localStorage.getItem(this.SYNC_FLAG_KEY);
      if (alreadySynced) {
        logger.info('TripSync', 'LocalStorage already synced to Supabase');
        return stats;
      }

      const localSearches = localStorage.getItem('nomadSearches');
      if (!localSearches) return stats;

      const searches: LocalSearchData[] = JSON.parse(localSearches);
      logger.info('TripSync', `Syncing ${searches.length} local searches`);

      for (const search of searches) {
        try {
          // Check if trip already exists
          const { data } = await supabase.from(this.TABLE).select('id').eq('id', search.id).single();
          if (data) continue; // already exists

          await this.createTripFromSearch(userId, search);
          stats.synced++;
        } catch (error) {
          logger.error('TripSync', `Failed to sync trip ${search.id}`, error);
          stats.errors++;
        }
      }

      if (stats.synced > 0) {
        localStorage.setItem(this.SYNC_FLAG_KEY, 'true');
        logger.info('TripSync', `Synced ${stats.synced} trips`);
      }
    } catch (error) {
      logger.error('TripSync', 'Failed to sync localStorage', error);
    }

    return stats;
  }

  private async createTripFromSearch(userId: string, search: LocalSearchData): Promise<void> {
    const now = new Date(search.timestamp || Date.now()).toISOString();

    await supabase.from(this.TABLE).insert({
      id: search.id,
      user_id: userId,
      title: TripSanitizer.extractTitle(search),
      destination: search.destination || 'Unknown',
      prompt: search.message || '',
      duration: search.duration || 3,
      currency: 'USD',
      travel_style: 'mid-range',
      status: 'draft',
      chat_state: TripSanitizer.cleanForFirestore(search.response),
      created_at: now,
      updated_at: now,
      is_favorite: false,
      tags: TripSanitizer.generateTags(search),
    });
  }

  /**
   * Check for new trips in Supabase that aren't in localStorage
   */
  async checkForNewTrips(userId: string): Promise<Trip[]> {
    if (typeof window === 'undefined') return [];

    try {
      const localSearches = localStorage.getItem('nomadSearches');
      const localIds = new Set<string>(
        localSearches ? (JSON.parse(localSearches) as LocalSearchData[]).map(s => s.id) : []
      );

      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const newTrips: Trip[] = (data ?? [])
        .filter(row => !localIds.has(row.id))
        .map(this.rowToTrip);

      if (newTrips.length > 0) {
        await this.updateLocalStorageWithNewTrips(newTrips);
      }

      return newTrips;
    } catch (error) {
      logger.error('TripSync', 'Failed to check for new trips', error);
      return [];
    }
  }

  private async updateLocalStorageWithNewTrips(trips: Trip[]): Promise<void> {
    try {
      const localSearches = localStorage.getItem('nomadSearches');
      const searches: LocalSearchData[] = localSearches ? JSON.parse(localSearches) : [];

      for (const trip of trips) {
        searches.push({
          id: trip.id,
          message: trip.prompt,
          response: trip.chatState,
          timestamp: trip.createdAt,
          synced: true,
          destination: trip.destination,
          duration: trip.duration,
        });
      }

      localStorage.setItem('nomadSearches', JSON.stringify(searches));
    } catch (error) {
      logger.error('TripSync', 'Failed to update localStorage', error);
    }
  }

  async performFullSync(userId: string): Promise<{
    localToFirestore: { synced: number; errors: number };
    firestoreToLocal: number;
  }> {
    const localToFirestore = await this.syncLocalStorageToFirestore(userId);
    const newTrips = await this.checkForNewTrips(userId);
    return { localToFirestore, firestoreToLocal: newTrips.length };
  }

  private rowToTrip(row: any): Trip {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title ?? '',
      destination: row.destination ?? '',
      prompt: row.prompt ?? '',
      startDate: row.start_date,
      endDate: row.end_date,
      duration: row.duration ?? 0,
      currency: row.currency ?? 'USD',
      travelStyle: row.travel_style ?? 'mid-range',
      status: row.status ?? 'draft',
      chatState: row.chat_state,
      itinerary: row.itinerary,
      budget: row.budget,
      imageUrl: row.image_url,
      isFavorite: row.is_favorite ?? false,
      tags: row.tags ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastOpenedAt: row.last_opened_at,
    } as any;
  }
}