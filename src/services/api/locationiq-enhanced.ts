/**
 * Enhanced LocationIQ API Service with Improved Rate Limiting
 * Features: Exponential backoff, retry logic, better search fallbacks
 */

import { logger } from '@/lib/monitoring/logger';

const LOG_CATEGORY = 'API' as const;

// LocationIQ API configuration
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY || process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

// Enhanced rate limiting with queue
class RateLimiter {
  private requests: number[] = [];
  private queue: Array<() => void> = [];
  private readonly maxRequests = 60; // Free tier limit
  private readonly windowMs = 60000; // 1 minute
  private readonly minDelay = 1000; // Minimum 1 second between requests
  private lastRequestTime = 0;

  async waitForSlot(): Promise<void> {
    // Clean old requests
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // Enforce minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelay) {
      await this.delay(this.minDelay - timeSinceLastRequest);
    }

    // Check if we're at the limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      logger.info(LOG_CATEGORY, `Rate limit reached, waiting ${waitTime}ms`);
      await this.delay(waitTime);
      return this.waitForSlot(); // Recursively try again
    }

    // Record this request
    this.requests.push(Date.now());
    this.lastRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): { used: number; remaining: number; resetIn: number } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    const oldestRequest = this.requests[0];
    const resetIn = oldestRequest ? this.windowMs - (now - oldestRequest) : 0;

    return {
      used: this.requests.length,
      remaining: this.maxRequests - this.requests.length,
      resetIn: Math.max(0, resetIn)
    };
  }
}

const rateLimiter = new RateLimiter();

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error.message?.includes('API key') || error.message?.includes('401')) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(LOG_CATEGORY, `Attempt ${attempt + 1} failed, retrying in ${delay}ms`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Enhanced search with fallback patterns
 */
export async function searchWithFallbacks(
  venueName: string,
  city: string,
  category?: string
): Promise<any | null> {
  // Wait for rate limit slot
  await rateLimiter.waitForSlot();

  const searchPatterns = [
    // 1. Try exact venue name with city
    `${venueName} ${city}`,

    // 2. Try without special characters
    `${venueName.replace(/['']/g, '')} ${city}`,

    // 3. Try partial name (first significant words)
    `${venueName.split(' ').slice(0, 2).join(' ')} ${city}`,

    // 4. Try category fallback if venue not found
    category ? `${category} near ${venueName} ${city}` : null,

    // 5. Try just the category in city
    category ? `${category} ${city}` : null
  ].filter(Boolean);

  for (const searchQuery of searchPatterns) {
    try {
      const params = new URLSearchParams({
        key: LOCATIONIQ_API_KEY!,
        q: searchQuery!,
        format: 'json',
        addressdetails: '1',
        extratags: '1',
        limit: '1'
      });

      const url = `${LOCATIONIQ_BASE_URL}/search.php?${params}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.status === 429) {
        // Rate limit hit - wait and retry
        logger.warn(LOG_CATEGORY, 'Rate limit (429) from API, backing off');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (!response.ok) {
        logger.warn(LOG_CATEGORY, `Search failed for pattern: ${searchQuery}`, { status: response.status });
        continue;
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        logger.info(LOG_CATEGORY, `Found venue with pattern: ${searchQuery}`);
        return data[0];
      }
    } catch (error) {
      logger.warn(LOG_CATEGORY, `Search pattern failed: ${searchQuery}`, { error });
      continue;
    }
  }

  logger.warn(LOG_CATEGORY, `No results found for any pattern: ${venueName} in ${city}`);
  return null;
}

/**
 * Batch search with intelligent queuing
 */
export async function batchSearchVenuesEnhanced(
  venues: Array<{ name: string; city: string; category?: string }>
): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  const cache = new Map<string, any>();

  logger.info(LOG_CATEGORY, `Batch searching ${venues.length} venues with rate limiting`);

  // Process in chunks to avoid overwhelming the API
  const chunkSize = 5;
  for (let i = 0; i < venues.length; i += chunkSize) {
    const chunk = venues.slice(i, i + chunkSize);

    // Process chunk in parallel with rate limiting
    const chunkResults = await Promise.all(
      chunk.map(async venue => {
        const cacheKey = `${venue.name}:${venue.city}`;

        // Check cache first
        if (cache.has(cacheKey)) {
          return { name: venue.name, result: cache.get(cacheKey) };
        }

        // Search with fallbacks
        const result = await searchWithFallbacks(venue.name, venue.city, venue.category);

        // Cache the result
        if (result) {
          cache.set(cacheKey, result);
        }

        return { name: venue.name, result };
      })
    );

    // Add to results map
    chunkResults.forEach(({ name, result }) => {
      if (result) {
        results.set(name, result);
      }
    });

    // Log progress
    logger.info(LOG_CATEGORY, `Processed ${Math.min(i + chunkSize, venues.length)}/${venues.length} venues`);

    // Show rate limit status
    const status = rateLimiter.getStatus();
    logger.debug(LOG_CATEGORY, `Rate limit status: ${status.used}/${status.used + status.remaining} requests used`);
  }

  logger.info(LOG_CATEGORY, `Batch search complete: ${results.size}/${venues.length} venues found`);
  return results;
}

/**
 * Get rate limiter status for monitoring
 */
export function getRateLimitStatus() {
  return rateLimiter.getStatus();
}

// Export the original functions for backward compatibility
export { searchPlaces, geocodeAddress, reverseGeocode, getRoute, formatPlace } from './locationiq';

// Export the rate limiter instance for testing
export { rateLimiter };