/**
 * Cache Manager Module
 * Manages caching of AI responses and intent extractions
 * Reduces API calls and improves response times
 */

import { ParsedIntent } from './intent-parser';
import { logger } from '@/lib/monitoring/logger';

interface CacheEntry<T> {
  input: string;
  output: T;
  timestamp: number;
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttlMs: number = 3600000, maxSize: number = 100) {
    this.cache = new Map();
    this.ttl = ttlMs;
    this.maxSize = maxSize;
  }

  /**
   * Generate a cache key from input string
   */
  getCacheKey(input: string): string {
    // Simple hash function for cache key
    return input.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Get item from cache if valid
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      logger.debug('AI', 'Cache entry expired', { key });
      return null;
    }

    logger.debug('AI', 'Cache hit', { key });
    return entry.output;
  }

  /**
   * Add item to cache with automatic size management
   */
  set(key: string, value: T): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.debug('AI', 'Evicted oldest cache entry', { key: oldestKey });
      }
    }

    this.cache.set(key, {
      input: key,
      output: value,
      timestamp: Date.now()
    });

    logger.debug('AI', 'Added to cache', { key, cacheSize: this.cache.size });
  }

  /**
   * Clear expired entries from cache
   */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('AI', 'Cleaned expired cache entries', { removed });
    }

    return removed;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug('AI', 'Cleared cache', { entriesRemoved: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    oldestEntry: number | null;
  } {
    let oldestTimestamp: number | null = null;

    for (const entry of this.cache.values()) {
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      oldestEntry: oldestTimestamp ? Date.now() - oldestTimestamp : null
    };
  }

  /**
   * Check if cache has a valid entry for key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiry
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Specialized cache for intent extraction
export class IntentCache extends CacheManager<Partial<ParsedIntent>> {
  constructor() {
    super(3600000, 100); // 1 hour TTL, 100 max entries
  }

  /**
   * Get intent from cache with fuzzy matching
   */
  getIntent(message: string): Partial<ParsedIntent> | null {
    // Try exact match first
    const key = this.getCacheKey(message);
    const exact = this.get(key);
    if (exact) return exact;

    // Try fuzzy matching for similar messages
    const words = message.toLowerCase().split(/\s+/);
    const minMatchWords = Math.max(2, Math.floor(words.length * 0.7));

    for (const [cachedKey, entry] of (this as any).cache.entries()) {
      const cachedWords = cachedKey.split(/\s+/);
      const matchingWords = words.filter(w => cachedWords.includes(w));

      if (matchingWords.length >= minMatchWords) {
        // Check if entry is still valid
        if (Date.now() - entry.timestamp <= this.ttl) {
          logger.debug('AI', 'Fuzzy cache hit', { original: message, matched: cachedKey });
          return entry.output;
        }
      }
    }

    return null;
  }

  /**
   * Cache intent with variations
   */
  setIntent(message: string, intent: Partial<ParsedIntent>): void {
    // Cache the exact message
    const key = this.getCacheKey(message);
    this.set(key, intent);

    // Also cache common variations
    const variations = this.generateVariations(message);
    for (const variation of variations) {
      const varKey = this.getCacheKey(variation);
      if (!this.has(varKey)) {
        this.set(varKey, intent);
      }
    }
  }

  /**
   * Generate common variations of a message for better cache hits
   */
  private generateVariations(message: string): string[] {
    const variations: string[] = [];
    const lower = message.toLowerCase();

    // Remove common filler words
    const withoutFillers = lower
      .replace(/\b(please|could you|can you|i want to|i'd like to|i would like to)\b/g, '')
      .trim();

    if (withoutFillers !== lower) {
      variations.push(withoutFillers);
    }

    // Normalize date expressions
    const dateNormalized = lower
      .replace(/\bnext week\b/g, '7 days')
      .replace(/\bthis weekend\b/g, '3 days')
      .replace(/\bnext month\b/g, '30 days');

    if (dateNormalized !== lower) {
      variations.push(dateNormalized);
    }

    return variations;
  }
}