/**
 * Centralized localStorage Manager
 *
 * Handles all localStorage operations with:
 * - Standardized key naming
 * - Conflict resolution
 * - Safari ITP detection
 * - Type-safe operations
 */

// Standardized localStorage keys
export const STORAGE_KEYS = {
  // Recent searches
  RECENT_SEARCHES: 'nomad:recentSearches',

  // Conversation state
  CONVERSATION_CONTEXT: (id: string) => `nomad:conversation:context:${id}`,
  SESSION_ID: (id: string) => `nomad:conversation:session:${id}`,

  // Trip viewing
  VIEWING_TRIP: 'nomad:trip:viewing',

  // Auth state (Safari ITP workaround)
  PENDING_GOOGLE_AUTH: 'nomad:auth:pendingGoogle',
  AUTH_TIMESTAMP: 'nomad:auth:timestamp',
  AUTH_REDIRECT_URL: 'nomad:auth:redirectUrl',

  // Service worker
  APP_VISITED: 'nomad:sw:appVisited',
  SW_UPDATE_NOTIFIED: 'nomad:sw:updateNotified',
} as const;

/**
 * Detect if running in Safari with ITP (Intelligent Tracking Prevention)
 */
export function isSafariWithITP(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // Safari 13.1+ has ITP 2.3
  if (!isSafari) return false;

  const match = ua.match(/Version\/(\d+)/);
  if (!match) return false;

  const version = parseInt(match[1], 10);
  return version >= 13;
}

/**
 * Storage operation queue to prevent concurrent writes
 */
class StorageQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async add(operation: () => void): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        operation();
        resolve();
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }
    }

    this.processing = false;
  }
}

const storageQueue = new StorageQueue();

/**
 * Type-safe localStorage operations
 */
export class LocalStorageManager {
  /**
   * Get item from localStorage with type safety
   */
  static get<T = any>(key: string, defaultValue?: T): T | null {
    if (typeof window === 'undefined') return defaultValue || null;

    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue || null;

      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`[LocalStorage] Error reading key "${key}":`, error);
      return defaultValue || null;
    }
  }

  /**
   * Set item in localStorage with queuing to prevent conflicts
   */
  static async set(key: string, value: any): Promise<void> {
    if (typeof window === 'undefined') return;

    return storageQueue.add(() => {
      try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
      } catch (error) {
        console.error(`[LocalStorage] Error writing key "${key}":`, error);

        // Handle quota exceeded error
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('[LocalStorage] Quota exceeded, clearing old data...');
          this.clearOldData();

          // Retry once after clearing
          try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
          } catch (retryError) {
            console.error('[LocalStorage] Failed after quota cleanup:', retryError);
          }
        }
      }
    });
  }

  /**
   * Remove item from localStorage
   */
  static async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    return storageQueue.add(() => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`[LocalStorage] Error removing key "${key}":`, error);
      }
    });
  }

  /**
   * Clear all Nomad Navigator localStorage keys
   */
  static async clearAll(): Promise<void> {
    if (typeof window === 'undefined') return;

    return storageQueue.add(() => {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('nomad:')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('[LocalStorage] Error clearing all:', error);
      }
    });
  }

  /**
   * Clear old data to free up space
   * Removes conversation contexts older than 7 days and keeps only 5 recent searches
   */
  private static clearOldData(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

      // Remove old conversation contexts
      keys.forEach(key => {
        if (key.startsWith('nomad:conversation:')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.timestamp && now - data.timestamp > SEVEN_DAYS) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      });

      // Keep only 5 most recent searches
      const recentSearches = this.get<any[]>(STORAGE_KEYS.RECENT_SEARCHES, []);
      if (recentSearches && recentSearches.length > 5) {
        const trimmed = recentSearches
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 5);
        localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(trimmed));
      }
    } catch (error) {
      console.error('[LocalStorage] Error clearing old data:', error);
    }
  }

  /**
   * Get storage info (for debugging)
   */
  static getStorageInfo(): {
    used: number;
    total: number;
    keys: number;
    nomadKeys: number;
  } {
    if (typeof window === 'undefined') {
      return { used: 0, total: 0, keys: 0, nomadKeys: 0 };
    }

    const keys = Object.keys(localStorage);
    const nomadKeys = keys.filter(k => k.startsWith('nomad:'));

    let used = 0;
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
    });

    return {
      used,
      total: 5 * 1024 * 1024, // 5MB typical limit
      keys: keys.length,
      nomadKeys: nomadKeys.length,
    };
  }
}

/**
 * Migration helper to update old localStorage keys to new format
 */
export async function migrateOldLocalStorageKeys(): Promise<void> {
  if (typeof window === 'undefined') return;

  const migrations: Array<{ old: string; new: string }> = [
    { old: 'recentSearches', new: STORAGE_KEYS.RECENT_SEARCHES },
    { old: 'pendingGoogleAuth', new: STORAGE_KEYS.PENDING_GOOGLE_AUTH },
    { old: 'authTimestamp', new: STORAGE_KEYS.AUTH_TIMESTAMP },
    { old: 'authRedirectUrl', new: STORAGE_KEYS.AUTH_REDIRECT_URL },
    { old: 'app-visited', new: STORAGE_KEYS.APP_VISITED },
    { old: 'sw-update-last-notified', new: STORAGE_KEYS.SW_UPDATE_NOTIFIED },
    { old: 'viewingTrip', new: STORAGE_KEYS.VIEWING_TRIP },
  ];

  for (const { old, new: newKey } of migrations) {
    const oldValue = localStorage.getItem(old);
    if (oldValue !== null) {
      await LocalStorageManager.set(newKey, JSON.parse(oldValue));
      localStorage.removeItem(old);
      console.log(`[LocalStorage] Migrated ${old} → ${newKey}`);
    }
  }

  // Migrate conversation contexts (pattern-based)
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('conversation-context-')) {
      const id = key.replace('conversation-context-', '');
      const value = localStorage.getItem(key);
      if (value) {
        await LocalStorageManager.set(STORAGE_KEYS.CONVERSATION_CONTEXT(id), value);
        localStorage.removeItem(key);
        console.log(`[LocalStorage] Migrated ${key}`);
      }
    }

    if (key.startsWith('session-id-')) {
      const id = key.replace('session-id-', '');
      const value = localStorage.getItem(key);
      if (value) {
        await LocalStorageManager.set(STORAGE_KEYS.SESSION_ID(id), value);
        localStorage.removeItem(key);
        console.log(`[LocalStorage] Migrated ${key}`);
      }
    }
  }

  console.log('[LocalStorage] Migration complete');
}
