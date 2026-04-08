import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/monitoring/logger';
import { stripUndefined } from '@/lib/utils/supabase-helpers';
import crypto from 'crypto';

/**
 * AI Response Cache Service - Supabase Implementation
 * Caches AI-generated itineraries in public.ai_cache table.
 * Falls back to memory-only if user is not authenticated.
 */

const TABLE = 'ai_cache';
const CACHE_DURATION_HOURS = 72;
const COMMON_DESTINATIONS = ['london', 'paris', 'tokyo', 'new york', 'rome', 'barcelona'];

interface CacheEntry {
  key: string;
  prompt: string;
  destination: string;
  duration: number;
  response: any;
  tokensSaved: number;
  createdAt: string;
  expiresAt: string;
  hitCount: number;
  lastAccessedAt: string;
}

class AIResponseCache {
  private memoryCache: Map<string, CacheEntry>;
  private commonCache: Map<string, any>;

  constructor() {
    this.memoryCache = new Map();
    this.commonCache = new Map();
    this.preloadCommonDestinations();
  }

  private async isAuthenticated(): Promise<boolean> {
    const { data } = await supabase.auth.getUser();
    return !!data.user;
  }

  private generateCacheKey(params: {
    destination: string;
    duration: number;
    startDate?: string;
    preferences?: any;
  }): string {
    const normalizedDest = params.destination.toLowerCase().trim();
    if (this.isSimpleRequest(params)) return `${normalizedDest}_${params.duration}d`;

    return crypto
      .createHash('md5')
      .update(JSON.stringify({
        dest: normalizedDest,
        dur: params.duration,
        prefs: params.preferences ? JSON.stringify(params.preferences).substring(0, 100) : '',
      }))
      .digest('hex');
  }

  private isSimpleRequest(params: any): boolean {
    const dest = params.destination?.toLowerCase().trim();
    return (
      COMMON_DESTINATIONS.includes(dest) &&
      params.duration >= 2 && params.duration <= 7 &&
      (!params.preferences || Object.keys(params.preferences).length <= 2)
    );
  }

  private preloadCommonDestinations() {
    this.commonCache.set('london_3d', {
      destination: 'London', duration: 3,
      template: { overview: 'Classic 3-day London experience' },
      tokensSaved: 2500,
    });
    this.commonCache.set('paris_3d', {
      destination: 'Paris', duration: 3,
      template: { overview: 'Romantic 3-day Paris itinerary' },
      tokensSaved: 2500,
    });
    this.commonCache.set('tokyo_3d', {
      destination: 'Tokyo', duration: 3,
      template: { overview: 'Modern and traditional Tokyo in 3 days' },
      tokensSaved: 2500,
    });
    logger.info('AICache', `Pre-loaded ${this.commonCache.size} destination templates`);
  }

  async get(params: {
    destination: string;
    duration: number;
    startDate?: string;
    preferences?: any;
  }): Promise<{ hit: boolean; data?: any; tokensSaved?: number }> {
    const cacheKey = this.generateCacheKey(params);

    // Memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const entry = this.memoryCache.get(cacheKey)!;
      entry.hitCount++;
      return { hit: true, data: entry.response, tokensSaved: entry.tokensSaved };
    }

    // Common templates
    if (this.isSimpleRequest(params) && this.commonCache.has(cacheKey)) {
      const template = this.commonCache.get(cacheKey);
      return { hit: true, data: template.template, tokensSaved: template.tokensSaved };
    }

    // Supabase cache
    if (await this.isAuthenticated()) {
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select('*')
          .eq('key', cacheKey)
          .single();

        if (!error && data && new Date(data.expires_at) > new Date()) {
          const entry: CacheEntry = {
            key: data.key,
            prompt: data.prompt,
            destination: data.destination,
            duration: data.duration,
            response: data.response,
            tokensSaved: data.tokens_saved,
            hitCount: data.hit_count,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
            lastAccessedAt: data.last_accessed_at,
          };

          this.memoryCache.set(cacheKey, entry);

          // Update hit count
          await supabase.from(TABLE).update({
            hit_count: data.hit_count + 1,
            last_accessed_at: new Date().toISOString(),
          }).eq('key', cacheKey);

          return { hit: true, data: entry.response, tokensSaved: entry.tokensSaved };
        }
      } catch (error) {
        logger.error('AICache', `Failed to get cache for ${cacheKey}`, error);
      }
    }

    return { hit: false };
  }

  async set(
    params: { destination: string; duration: number; startDate?: string; preferences?: any },
    response: any,
    tokensUsed: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(params);
    const tokensSaved = Math.round(tokensUsed * 0.9);
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    const entry: CacheEntry = {
      key: cacheKey,
      prompt: `${params.destination} for ${params.duration} days`,
      destination: params.destination.toLowerCase(),
      duration: params.duration,
      response,
      tokensSaved,
      createdAt: now,
      expiresAt: expiresAt.toISOString(),
      hitCount: 0,
      lastAccessedAt: now,
    };

    this.memoryCache.set(cacheKey, entry);

    if (await this.isAuthenticated()) {
      try {
        const cleaned = stripUndefined(entry);
        await supabase.from(TABLE).upsert({
          key: cleaned.key,
          prompt: cleaned.prompt,
          destination: cleaned.destination,
          duration: cleaned.duration,
          response: cleaned.response,
          tokens_saved: cleaned.tokensSaved,
          expires_at: cleaned.expiresAt,
          hit_count: 0,
          created_at: cleaned.createdAt,
          last_accessed_at: cleaned.lastAccessedAt,
        });
      } catch (error) {
        logger.error('AICache', `Failed to cache response for ${cacheKey}`, error);
      }
    }

    if (this.memoryCache.size > 100) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey !== undefined) this.memoryCache.delete(oldestKey);
    }
  }

  async getStats(): Promise<{ memoryCacheSize: number; templateCacheSize: number; totalTokensSaved: number; topDestinations: Array<{ destination: string; hits: number }> }> {
    let totalTokensSaved = 0;
    const destinationHits = new Map<string, number>();

    for (const entry of this.memoryCache.values()) {
      totalTokensSaved += entry.tokensSaved * entry.hitCount;
      destinationHits.set(entry.destination, (destinationHits.get(entry.destination) || 0) + entry.hitCount);
    }

    return {
      memoryCacheSize: this.memoryCache.size,
      templateCacheSize: this.commonCache.size,
      totalTokensSaved,
      topDestinations: Array.from(destinationHits.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([destination, hits]) => ({ destination, hits })),
    };
  }

  async clearCache(): Promise<void> {
    this.memoryCache.clear();
  }
}

export const aiCache = new AIResponseCache();