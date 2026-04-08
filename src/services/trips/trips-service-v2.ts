/**
 * Trips Service V2 - Supabase Implementation
 * Core CRUD operations for trips stored in Supabase (public.trips table)
 */

import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/monitoring/logger';
import { TripSanitizer } from './trip-sanitizer';
import { TripSyncService } from './trip-sync-service';
import type { Trip, CreateTripInput, TripQueryOptions } from './trip-types';

export class TripsServiceV2 {
  private readonly TABLE = 'trips';
  private readonly syncService: TripSyncService;

  constructor() {
    this.syncService = new TripSyncService();
  }

  /**
   * Create a new trip
   */
  async createTrip(input: CreateTripInput): Promise<Trip> {
    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const tripData: any = {
      id: tripId,
      user_id: input.userId,
      title: input.title || TripSanitizer.extractTitle(input),
      destination: input.destination || TripSanitizer.extractDestination(input),
      prompt: input.prompt,
      start_date: input.startDate,
      end_date: input.endDate,
      duration: input.duration || TripSanitizer.extractDuration(input),
      currency: input.currency || 'USD',
      travel_style: input.travelStyle || 'mid-range',
      status: 'draft',
      chat_state: TripSanitizer.cleanForFirestore(input.chatState),
      itinerary: TripSanitizer.cleanForFirestore(input.itinerary),
      created_at: now,
      updated_at: now,
      is_favorite: false,
      tags: input.tags || TripSanitizer.generateTags(input),
    };

    if (input.budget != null) tripData.budget = input.budget;
    if (input.imageUrl != null) tripData.image_url = input.imageUrl;

    const { error } = await supabase.from(this.TABLE).insert(tripData);

    if (error) {
      logger.error('TripsService', `Failed to create trip ${tripId}`, error);
      throw new Error(`Failed to create trip: ${error.message}`);
    }

    logger.info('TripsService', `Created trip ${tripId}`);
    return this.rowToTrip(tripData);
  }

  /**
   * Get trips for a user
   */
  async getUserTrips(options: TripQueryOptions): Promise<Trip[]> {
    const {
      userId,
      limit = 50,
      orderBy: orderField = 'created_at',
      orderDirection = 'desc',
      status,
      isFavorite,
    } = options;

    // Map camelCase fields to snake_case DB columns
    const columnMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      lastOpenedAt: 'last_opened_at',
    };
    const dbColumn = columnMap[orderField] ?? orderField;

    let q = supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .order(dbColumn, { ascending: orderDirection === 'asc' })
      .limit(limit);

    if (status) q = q.eq('status', status);
    if (typeof isFavorite === 'boolean') q = q.eq('is_favorite', isFavorite);

    const { data, error } = await q;

    if (error) {
      logger.error('TripsService', `Failed to get trips for ${userId}`, error);
      throw error;
    }

    const trips = (data ?? []).map(this.rowToTrip);
    logger.info('TripsService', `Retrieved ${trips.length} trips for ${userId}`);
    return trips;
  }

  /**
   * Get a single trip by ID
   */
  async getTrip(tripId: string): Promise<Trip | null> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      logger.error('TripsService', `Failed to get trip ${tripId}`, error);
      throw error;
    }

    // Update last opened
    await supabase
      .from(this.TABLE)
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', tripId);

    return this.rowToTrip(data);
  }

  /**
   * Update a trip
   */
  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
    const cleanedUpdates = TripSanitizer.validateUpdate(updates);

    // Map camelCase to snake_case for DB
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (cleanedUpdates.title !== undefined) dbUpdates.title = cleanedUpdates.title;
    if (cleanedUpdates.destination !== undefined) dbUpdates.destination = cleanedUpdates.destination;
    if (cleanedUpdates.status !== undefined) dbUpdates.status = cleanedUpdates.status;
    if (cleanedUpdates.isFavorite !== undefined) dbUpdates.is_favorite = cleanedUpdates.isFavorite;
    if (cleanedUpdates.chatState !== undefined) dbUpdates.chat_state = cleanedUpdates.chatState;
    if (cleanedUpdates.itinerary !== undefined) dbUpdates.itinerary = cleanedUpdates.itinerary;
    if (cleanedUpdates.tags !== undefined) dbUpdates.tags = cleanedUpdates.tags;
    if (cleanedUpdates.imageUrl !== undefined) dbUpdates.image_url = cleanedUpdates.imageUrl;
    if (cleanedUpdates.budget !== undefined) dbUpdates.budget = cleanedUpdates.budget;
    if (cleanedUpdates.duration !== undefined) dbUpdates.duration = cleanedUpdates.duration;
    if (cleanedUpdates.currency !== undefined) dbUpdates.currency = cleanedUpdates.currency;
    if (cleanedUpdates.travelStyle !== undefined) dbUpdates.travel_style = cleanedUpdates.travelStyle;

    const { error } = await supabase.from(this.TABLE).update(dbUpdates).eq('id', tripId);

    if (error) {
      logger.error('TripsService', `Failed to update trip ${tripId}`, error);
      throw error;
    }
  }

  /**
   * Delete a trip
   */
  async deleteTrip(tripId: string): Promise<void> {
    const { error } = await supabase.from(this.TABLE).delete().eq('id', tripId);
    if (error) {
      logger.error('TripsService', `Failed to delete trip ${tripId}`, error);
      throw error;
    }
  }

  async toggleFavorite(tripId: string, isFavorite: boolean): Promise<void> {
    await this.updateTrip(tripId, { isFavorite });
  }

  async updateTripStatus(tripId: string, status: Trip['status']): Promise<void> {
    await this.updateTrip(tripId, { status });
  }

  async getRecentTrips(userId: string, limit: number = 5): Promise<Trip[]> {
    return this.getUserTrips({ userId, limit, orderBy: 'lastOpenedAt', orderDirection: 'desc' });
  }

  async getFavoriteTrips(userId: string, limit: number = 10): Promise<Trip[]> {
    return this.getUserTrips({ userId, limit, isFavorite: true });
  }

  async searchTrips(userId: string, searchTerm: string): Promise<Trip[]> {
    const allTrips = await this.getUserTrips({ userId, limit: 100 });
    const lower = searchTerm.toLowerCase();
    return allTrips.filter(t =>
      t.destination.toLowerCase().includes(lower) ||
      t.title.toLowerCase().includes(lower) ||
      t.tags?.some(tag => tag.toLowerCase().includes(lower))
    );
  }

  async syncLocalStorageToFirestore(userId: string) {
    return this.syncService.syncLocalStorageToFirestore(userId);
  }

  async checkForNewTrips(userId: string) {
    return this.syncService.checkForNewTrips(userId);
  }

  async performFullSync(userId: string) {
    return this.syncService.performFullSync(userId);
  }

  /** Convert snake_case DB row to camelCase Trip object */
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

export const tripsServiceV2 = new TripsServiceV2();