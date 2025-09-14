/**
 * Request Deduplication utility
 * Prevents duplicate API calls for the same data
 */

type PendingRequest = {
  promise: Promise<any>;
  timestamp: number;
};

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly REQUEST_TTL = 5000; // 5 seconds

  /**
   * Clean up old pending requests
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.pendingRequests.entries()) {
      if (now - value.timestamp > this.REQUEST_TTL) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Deduplicate a request
   * If the same request is already in flight, return the existing promise
   */
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Clean up old requests
    this.cleanup();

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`Request deduplicated: ${key}`);
      return pending.promise as Promise<T>;
    }

    // Create new request
    const promise = fetcher().finally(() => {
      // Remove from pending when complete
      this.pendingRequests.delete(key);
    });

    // Store as pending
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }
}

// Create singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Hook for React components to deduplicate requests
 */
export function useDeduplicatedRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): () => Promise<T> {
  return () => requestDeduplicator.deduplicate(key, fetcher);
}