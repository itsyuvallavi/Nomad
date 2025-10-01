/**
 * Retry Utilities
 * Handles automatic retry logic with exponential backoff
 */

import { logger } from '@/lib/monitoring/logger';

export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'rate_limit_exceeded',
    'timeout',
    '429',
    '503',
    '502',
    '500'
  ],
  onRetry: () => {}
};

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: Error | any): boolean {
  const errorString = error.toString().toLowerCase();
  const message = error.message?.toLowerCase() || '';
  const code = typeof error.code === 'string' ? error.code.toLowerCase() : String(error.code || '').toLowerCase();
  
  // Check for network errors
  if (error.name === 'NetworkError' || error.name === 'FetchError') {
    return true;
  }

  // Check for specific error codes/messages
  return DEFAULT_CONFIG.retryableErrors.some(retryable => {
    const pattern = retryable.toLowerCase();
    return (
      errorString.includes(pattern) ||
      message.includes(pattern) ||
      code.includes(pattern)
    );
  });
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoff(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
    config.maxDelay
  );
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      logger.debug('RETRY', `Attempt ${attempt}/${finalConfig.maxAttempts}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        logger.info('RETRY', 'Error is not retryable', { 
          error: error.message,
          attempt 
        });
        throw error;
      }
      
      // Check if we've exhausted attempts
      if (attempt === finalConfig.maxAttempts) {
        logger.error('RETRY', 'Max attempts reached', {
          error: error.message,
          attempts: finalConfig.maxAttempts
        });
        // Re-throw the last error after all attempts are exhausted
        throw lastError;
      }
      
      // Calculate backoff delay
      const delay = calculateBackoff(attempt, finalConfig);
      
      logger.info('RETRY', `Retrying after ${delay}ms`, {
        attempt,
        delay,
        error: error.message
      });
      
      // Call retry callback
      finalConfig.onRetry(attempt, error);
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This line should not be reachable if the loop always throws on the last attempt,
  // but it's here as a fallback and to satisfy TypeScript's strict checking.
  throw lastError || new Error('Retry failed without a specific error.');
}

/**
 * Retry wrapper for API calls
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  operationName: string,
  config?: RetryConfig
): Promise<T> {
  return withRetry(apiCall, {
    ...config,
    onRetry: (attempt, error) => {
      logger.warn('API', `${operationName} failed, retrying`, {
        attempt,
        error: error.message
      });
      
      // Call custom retry handler if provided
      config?.onRetry?.(attempt, error);
    }
  });
}

/**
 * Create a retry-wrapped version of a function
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: RetryConfig
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), config);
  }) as T;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (
      this.state === 'open' &&
      Date.now() - this.lastFailureTime > this.resetTimeout
    ) {
      this.state = 'half-open';
      this.failures = 0;
    }

    // If circuit is open, fail fast
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open - service unavailable');
    }

    try {
      const result = await fn();
      
      // Reset on success
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      // Open circuit if threshold reached
      if (this.failures >= this.threshold) {
        this.state = 'open';
        logger.error('CIRCUIT', 'Circuit breaker opened', {
          failures: this.failures,
          threshold: this.threshold
        });
      }
      
      throw error;
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }

  getState(): string {
    return this.state;
  }
}
