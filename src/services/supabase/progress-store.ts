import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/monitoring/logger';
import { stripUndefined } from '@/lib/utils/supabase-helpers';

/**
 * Supabase-based progress storage for AI generation
 * Replaces the Firebase Firestore implementation
 */

const TABLE = 'ai_generation_progress';
const EXPIRY_HOURS = 24;

export interface ProgressData {
  type: 'processing' | 'complete' | 'error' | 'question' | 'confirmation';
  status: string;
  progress: number;
  message: string;
  awaitingInput?: string;
  hasItinerary?: boolean;
  intent?: any;
  missingFields?: string[];
  mode?: string;
  metadata?: any;
  city?: string;
  cityData?: any;
  allCities?: any[];
  itinerary?: any;
  conversationContext?: any;
  error?: boolean;
  stack?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
}

class ProgressStore {
  private memoryCache: Map<string, ProgressData>;

  constructor() {
    this.memoryCache = new Map();
  }

  private async isAuthenticated(): Promise<boolean> {
    const { data } = await supabase.auth.getUser();
    return !!data.user;
  }

  async set(generationId: string, data: ProgressData): Promise<void> {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + EXPIRY_HOURS);

      const progressData: ProgressData = {
        ...data,
        updatedAt: now,
        createdAt: data.createdAt || now,
        expiresAt: expiresAt.toISOString(),
      };

      this.memoryCache.set(generationId, stripUndefined(progressData));

      if (!(await this.isAuthenticated())) {
        logger.info('ProgressStore', `Saved to memory only (unauthenticated): ${generationId}`);
        return;
      }

      const cleaned = stripUndefined(progressData);
      await supabase.from(TABLE).upsert({
        id: generationId,
        type: cleaned.type,
        status: cleaned.status,
        progress: cleaned.progress,
        message: cleaned.message,
        awaiting_input: cleaned.awaitingInput ?? null,
        has_itinerary: cleaned.hasItinerary ?? null,
        intent: cleaned.intent ?? null,
        missing_fields: cleaned.missingFields ?? null,
        mode: cleaned.mode ?? null,
        metadata: cleaned.metadata ?? null,
        city: cleaned.city ?? null,
        city_data: cleaned.cityData ?? null,
        all_cities: cleaned.allCities ?? null,
        itinerary: cleaned.itinerary ?? null,
        conversation_context: cleaned.conversationContext ?? null,
        error: cleaned.error ?? null,
        stack: cleaned.stack ?? null,
        expires_at: cleaned.expiresAt,
        created_at: cleaned.createdAt,
        updated_at: cleaned.updatedAt,
      });

      if (data.type === 'complete' || data.type === 'error') {
        setTimeout(() => this.memoryCache.delete(generationId), 5 * 60 * 1000);
      }
    } catch (error) {
      logger.error('ProgressStore', `Failed to save progress for ${generationId}`, error);
      this.memoryCache.set(generationId, stripUndefined(data));
    }
  }

  async get(generationId: string): Promise<ProgressData | null> {
    // Memory cache first
    if (this.memoryCache.has(generationId)) {
      return this.memoryCache.get(generationId) || null;
    }

    if (!(await this.isAuthenticated())) return null;

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', generationId)
        .single();

      if (error || !data) return null;

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.delete(generationId);
        return null;
      }

      const progress: ProgressData = {
        type: data.type,
        status: data.status,
        progress: data.progress,
        message: data.message,
        awaitingInput: data.awaiting_input,
        hasItinerary: data.has_itinerary,
        intent: data.intent,
        missingFields: data.missing_fields,
        mode: data.mode,
        metadata: data.metadata,
        city: data.city,
        cityData: data.city_data,
        allCities: data.all_cities,
        itinerary: data.itinerary,
        conversationContext: data.conversation_context,
        error: data.error,
        stack: data.stack,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        expiresAt: data.expires_at,
      };

      this.memoryCache.set(generationId, progress);
      return progress;
    } catch (error) {
      logger.error('ProgressStore', `Failed to get progress for ${generationId}`, error);
      return this.memoryCache.get(generationId) || null;
    }
  }

  async delete(generationId: string): Promise<void> {
    try {
      this.memoryCache.delete(generationId);
      await supabase.from(TABLE).delete().eq('id', generationId);
    } catch (error) {
      logger.error('ProgressStore', `Failed to delete progress for ${generationId}`, error);
    }
  }

  async has(generationId: string): Promise<boolean> {
    if (this.memoryCache.has(generationId)) return true;
    const data = await this.get(generationId);
    return data !== null;
  }

  async cleanupExpired(): Promise<void> {
    logger.info('ProgressStore', 'Cleanup expired entries would run via scheduled Supabase function');
  }
}

export const progressStore = new ProgressStore();
