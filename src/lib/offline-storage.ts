import { logger } from '@/lib/logger';

const CACHE_NAME = 'nomad-navigator-v1';
const SEARCH_CACHE_KEY = 'recent-searches';
const ITINERARY_CACHE_KEY = 'recent-itineraries';
const MAX_CACHED_ITEMS = 10;

interface CachedSearch {
  id: string;
  query: string;
  timestamp: number;
  response: any;
}

interface CachedItinerary {
  id: string;
  destination: string;
  timestamp: number;
  data: any;
}

class OfflineStorage {
  private dbName = 'NomadNavigatorDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init() {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      logger.warn('SYSTEM', 'IndexedDB not available');
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        logger.error('SYSTEM', 'Failed to open IndexedDB', { error: request.error });
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('SYSTEM', 'IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('searches')) {
          const searchStore = db.createObjectStore('searches', { keyPath: 'id' });
          searchStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('itineraries')) {
          const itineraryStore = db.createObjectStore('itineraries', { keyPath: 'id' });
          itineraryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async cacheSearch(query: string, response: any): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction(['searches'], 'readwrite');
    const store = transaction.objectStore('searches');

    const cachedSearch: CachedSearch = {
      id: this.generateId(query),
      query,
      timestamp: Date.now(),
      response
    };

    try {
      await this.promisifyRequest(store.put(cachedSearch));
      await this.cleanOldSearches();
      logger.info('SYSTEM', 'Search cached successfully', { query });
    } catch (error) {
      logger.error('SYSTEM', 'Failed to cache search', { error });
    }
  }

  async getCachedSearch(query: string): Promise<CachedSearch | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction(['searches'], 'readonly');
    const store = transaction.objectStore('searches');
    const id = this.generateId(query);

    try {
      const result = await this.promisifyRequest(store.get(id));
      if (result) {
        // Check if cache is still fresh (24 hours)
        const isStale = Date.now() - result.timestamp > 24 * 60 * 60 * 1000;
        if (isStale) {
          await this.deleteCachedSearch(id);
          return null;
        }
        logger.info('SYSTEM', 'Retrieved cached search', { query });
        return result;
      }
    } catch (error) {
      logger.error('SYSTEM', 'Failed to retrieve cached search', { error });
    }

    return null;
  }

  async cacheItinerary(destination: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction(['itineraries'], 'readwrite');
    const store = transaction.objectStore('itineraries');

    const cachedItinerary: CachedItinerary = {
      id: this.generateId(destination),
      destination,
      timestamp: Date.now(),
      data
    };

    try {
      await this.promisifyRequest(store.put(cachedItinerary));
      await this.cleanOldItineraries();
      logger.info('SYSTEM', 'Itinerary cached successfully', { destination });
    } catch (error) {
      logger.error('SYSTEM', 'Failed to cache itinerary', { error });
    }
  }

  async getCachedItinerary(destination: string): Promise<CachedItinerary | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction(['itineraries'], 'readonly');
    const store = transaction.objectStore('itineraries');
    const id = this.generateId(destination);

    try {
      const result = await this.promisifyRequest(store.get(id));
      if (result) {
        logger.info('SYSTEM', 'Retrieved cached itinerary', { destination });
        return result;
      }
    } catch (error) {
      logger.error('SYSTEM', 'Failed to retrieve cached itinerary', { error });
    }

    return null;
  }

  async getRecentSearches(): Promise<CachedSearch[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    const transaction = this.db.transaction(['searches'], 'readonly');
    const store = transaction.objectStore('searches');
    const index = store.index('timestamp');

    try {
      const results = await this.promisifyRequest(index.getAll());
      return results
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_CACHED_ITEMS);
    } catch (error) {
      logger.error('SYSTEM', 'Failed to get recent searches', { error });
      return [];
    }
  }

  async getRecentItineraries(): Promise<CachedItinerary[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    const transaction = this.db.transaction(['itineraries'], 'readonly');
    const store = transaction.objectStore('itineraries');
    const index = store.index('timestamp');

    try {
      const results = await this.promisifyRequest(index.getAll());
      return results
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_CACHED_ITEMS);
    } catch (error) {
      logger.error('SYSTEM', 'Failed to get recent itineraries', { error });
      return [];
    }
  }

  private async cleanOldSearches(): Promise<void> {
    const searches = await this.getRecentSearches();
    if (searches.length <= MAX_CACHED_ITEMS) return;

    const transaction = this.db!.transaction(['searches'], 'readwrite');
    const store = transaction.objectStore('searches');

    // Delete older searches beyond the limit
    const toDelete = searches.slice(MAX_CACHED_ITEMS);
    for (const search of toDelete) {
      await this.promisifyRequest(store.delete(search.id));
    }
  }

  private async cleanOldItineraries(): Promise<void> {
    const itineraries = await this.getRecentItineraries();
    if (itineraries.length <= MAX_CACHED_ITEMS) return;

    const transaction = this.db!.transaction(['itineraries'], 'readwrite');
    const store = transaction.objectStore('itineraries');

    // Delete older itineraries beyond the limit
    const toDelete = itineraries.slice(MAX_CACHED_ITEMS);
    for (const itinerary of toDelete) {
      await this.promisifyRequest(store.delete(itinerary.id));
    }
  }

  private async deleteCachedSearch(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['searches'], 'readwrite');
    const store = transaction.objectStore('searches');
    await this.promisifyRequest(store.delete(id));
  }

  private generateId(input: string): string {
    // Simple hash function for generating IDs
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction(['searches', 'itineraries'], 'readwrite');
    
    try {
      await this.promisifyRequest(transaction.objectStore('searches').clear());
      await this.promisifyRequest(transaction.objectStore('itineraries').clear());
      logger.info('SYSTEM', 'All offline data cleared');
    } catch (error) {
      logger.error('SYSTEM', 'Failed to clear offline data', { error });
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();