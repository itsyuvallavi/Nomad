/**
 * HERE Places API Integration
 * Fast alternative to OSM for venue/POI data
 * Docs: https://developer.here.com/documentation/places/dev_guide/topics/quick-start.html
 */

import { logger } from '@/lib/monitoring/logger';

export interface HEREPlace {
  id: string;
  name: string;
  address: {
    label: string;
    street?: string;
    city?: string;
    postalCode?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
  categories?: Array<{
    id: string;
    name: string;
  }>;
  openingHours?: string[];
  rating?: number;
  distance?: number;
}

export interface HERESearchOptions {
  at?: { lat: number; lng: number };  // Center point
  in?: string;  // Bounding box or circle
  limit?: number;
  categories?: string[];
  q?: string;  // Search query
}

class HEREPlacesService {
  private apiKey: string | undefined;
  private baseUrl = 'https://discover.search.hereapi.com/v1';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Will be loaded on first use
    this.apiKey = undefined;
  }

  /**
   * Check if HERE API is configured
   */
  isConfigured(): boolean {
    // Check environment variable at runtime, not just at construction
    if (!this.apiKey && process.env.HERE_API_KEY) {
      this.apiKey = process.env.HERE_API_KEY;
    }
    return !!this.apiKey;
  }

  /**
   * Search for places/venues
   */
  async searchPlaces(query: string, options: HERESearchOptions = {}): Promise<HEREPlace[]> {
    if (!this.isConfigured()) {
      logger.warn('API', 'HERE API key not configured, falling back to OSM');
      return [];
    }

    // Check cache
    const cacheKey = this.getCacheKey(query, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('API', 'HERE cache hit', { query });
      return cached;
    }

    try {
      const params = new URLSearchParams({
        apiKey: this.apiKey || '',
        q: query,
        limit: String(options.limit || 5),
      });

      // Add location context
      if (options.at) {
        params.append('at', `${options.at.lat},${options.at.lng}`);
      } else if (options.in) {
        params.append('in', options.in);
      }

      // Add categories if specified
      if (options.categories?.length) {
        params.append('categories', options.categories.join(','));
      }

      const url = `${this.baseUrl}/discover?${params}`;

      const startTime = Date.now();
      const response = await fetch(url);
      const fetchTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = await response.json();
      const places = this.transformResponse(data);

      if (fetchTime > 1000) {
        logger.warn('API', 'HERE slow response', { query, fetchTime: `${fetchTime}ms` });
      }

      // Cache the result
      this.addToCache(cacheKey, places);

      return places;
    } catch (error) {
      logger.error('API', 'HERE Places search failed', error);
      return [];
    }
  }

  /**
   * Batch search for multiple venues (more efficient)
   */
  async batchSearchPlaces(
    queries: Array<{ query: string; location?: { lat: number; lng: number } }>,
    options: HERESearchOptions = {}
  ): Promise<Map<string, HEREPlace[]>> {
    const results = new Map<string, HEREPlace[]>();

    // Process all queries in parallel with concurrency limit
    const batchSize = 10; // Increased from 5 to 10 for better parallelism
    const allResults: Array<{ query: string; places: HEREPlace[] }> = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      // Create promises for this batch
      const batchPromises = batch.map(async ({ query, location }) => {
        const searchOptions = { ...options };
        if (location) {
          searchOptions.at = location;
        }

        const places = await this.searchPlaces(query, searchOptions);
        return { query, places };
      });

      // Execute batch in parallel
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);

      // Only delay if more batches to process (reduced from 100ms to 50ms)
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Populate results map
    allResults.forEach(({ query, places }) => {
      results.set(query, places);
    });

    return results;
  }

  /**
   * Get details for a specific place
   */
  async getPlaceDetails(placeId: string): Promise<HEREPlace | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        apiKey: this.apiKey || '',
      });

      const url = `${this.baseUrl}/lookup?id=${placeId}&${params}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformPlace(data);
    } catch (error) {
      logger.error('API', 'HERE place details failed', error);
      return null;
    }
  }

  /**
   * Find the best matching POI for an activity description
   */
  async findPOIForActivity(
    activityDescription: string,
    location: { lat: number; lng: number },
    radiusKm: number = 2
  ): Promise<HEREPlace | null> {
    // Extract venue name and type from description
    const venueInfo = this.extractVenueInfo(activityDescription);

    const options: HERESearchOptions = {
      at: location,
      in: `circle:${location.lat},${location.lng};r=${radiusKm * 1000}`,
      limit: 5, // Get more results to filter through
    };

    // Add category filters based on activity type
    if (venueInfo.category) {
      options.categories = this.mapToHERECategories(venueInfo.category);
    }

    const places = await this.searchPlaces(venueInfo.query, options);

    // Return the best match (HERE sorts by relevance)
    return places[0] || null;
  }

  /**
   * Transform HERE API response to our format
   */
  private transformResponse(data: any): HEREPlace[] {
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: any) => this.transformPlace(item));
  }

  private transformPlace(item: any): HEREPlace {
    return {
      id: item.id,
      name: item.title || 'Unknown',
      address: {
        label: item.address?.label || '',
        street: item.address?.street,
        city: item.address?.city,
        postalCode: item.address?.postalCode,
      },
      position: item.position || { lat: 0, lng: 0 },
      categories: item.categories,
      openingHours: item.openingHours?.text,
      rating: item.averageRating,
      distance: item.distance,
    };
  }

  /**
   * Extract venue information from activity description
   */
  private extractVenueInfo(description: string): { query: string; category?: string } {
    const lower = description.toLowerCase();

    // Try to extract specific venue name
    const venueMatch = description.match(/(?:at|visit|explore)\s+([A-Z][^,\.]+)/);
    if (venueMatch) {
      return { query: venueMatch[1].trim() };
    }

    // Categorize and create search query
    if (lower.includes('breakfast') || lower.includes('brunch')) {
      return { query: 'breakfast restaurant', category: 'restaurant' };
    }
    if (lower.includes('lunch')) {
      return { query: 'restaurant', category: 'restaurant' };
    }
    if (lower.includes('dinner')) {
      return { query: 'dinner restaurant', category: 'restaurant' };
    }
    if (lower.includes('museum')) {
      return { query: 'museum', category: 'museum' };
    }
    if (lower.includes('park') || lower.includes('garden')) {
      return { query: 'park', category: 'park' };
    }
    if (lower.includes('shopping')) {
      return { query: 'shopping center', category: 'shopping' };
    }
    if (lower.includes('market')) {
      return { query: 'market', category: 'market' };
    }

    // Default: use first significant words
    const words = description.split(' ').slice(0, 4).join(' ');
    return { query: words };
  }

  /**
   * Map activity categories to HERE category IDs
   */
  private mapToHERECategories(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      restaurant: ['100-1000-0000'], // Eat & Drink
      museum: ['200-2000-0000'], // Leisure & Outdoor
      park: ['550-5510-0000'], // Recreation
      shopping: ['600-6100-0000'], // Shopping
      hotel: ['500-5000-0000'], // Accommodation
      attraction: ['300-3000-0000'], // Sights & Museums
      transport: ['400-4000-0000'], // Transport
    };

    return categoryMap[category] || [];
  }

  /**
   * Cache management
   */
  private getCacheKey(query: string, options: HERESearchOptions): string {
    return `${query}-${JSON.stringify(options)}`;
  }

  private getFromCache(key: string): HEREPlace[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private addToCache(key: string, data: HEREPlace[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }
}

// Export singleton instance
export const herePlacesService = new HEREPlacesService();