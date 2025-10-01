import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';

/**
 * Rate limiting middleware for API routes
 * Implements token bucket algorithm with exponential backoff
 */

interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;         // Max requests per window
  skipSuccessfulRequests?: boolean; // Only count failed requests
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  message?: string;           // Error message
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  retryAfter?: number;
  consecutiveErrors: number;
}

class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.buckets = new Map();
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute default
      maxRequests: config.maxRequests || 10,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      message: config.message || 'Too many requests, please try again later.'
    };

    // Clean up old buckets periodically
    setInterval(() => this.cleanup(), this.config.windowMs);
  }

  /**
   * Default key generator using IP address
   */
  private defaultKeyGenerator(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `rate_limit_${ip}`;
  }

  /**
   * Check if request should be rate limited
   */
  async check(req: NextRequest): Promise<{
    allowed: boolean;
    retryAfter?: number;
    remaining?: number;
  }> {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();

    let bucket = this.buckets.get(key);

    if (!bucket) {
      // Create new bucket
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: now,
        consecutiveErrors: 0
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(
      (timePassed / this.config.windowMs) * this.config.maxRequests
    );

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(
        this.config.maxRequests,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill = now;
    }

    // Check if we have tokens available
    if (bucket.tokens > 0) {
      bucket.tokens--;
      bucket.consecutiveErrors = 0;

      logger.info('RateLimiter', `Request allowed for ${key}`, {
        remaining: bucket.tokens
      });

      return {
        allowed: true,
        remaining: bucket.tokens
      };
    }

    // Calculate retry after with exponential backoff
    bucket.consecutiveErrors++;
    const backoffMs = Math.min(
      this.config.windowMs * Math.pow(2, bucket.consecutiveErrors - 1),
      300000 // Max 5 minutes
    );

    bucket.retryAfter = now + backoffMs;

    logger.warn('RateLimiter', `Request blocked for ${key}`, {
      consecutiveErrors: bucket.consecutiveErrors,
      retryAfter: backoffMs
    });

    return {
      allowed: false,
      retryAfter: Math.ceil(backoffMs / 1000) // Return in seconds
    };
  }

  /**
   * Record successful request (potentially restore tokens)
   */
  recordSuccess(req: NextRequest): void {
    if (this.config.skipSuccessfulRequests) {
      const key = this.config.keyGenerator!(req);
      const bucket = this.buckets.get(key);

      if (bucket && bucket.tokens < this.config.maxRequests) {
        bucket.tokens++; // Restore token for successful request
      }
    }
  }

  /**
   * Record failed request (for exponential backoff)
   */
  recordError(req: NextRequest): void {
    const key = this.config.keyGenerator!(req);
    const bucket = this.buckets.get(key);

    if (bucket) {
      bucket.consecutiveErrors++;
    }
  }

  /**
   * Clean up old buckets
   */
  private cleanup(): void {
    const now = Date.now();
    const expireTime = this.config.windowMs * 2;

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > expireTime) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Create middleware function
   */
  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const { allowed, retryAfter } = await this.check(req);

      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            error: this.config.message,
            retryAfter: retryAfter
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter?.toString() || '60',
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(
                Date.now() + (retryAfter || 60) * 1000
              ).toISOString()
            }
          }
        );
      }

      return null; // Allow request to proceed
    };
  }
}

// Pre-configured rate limiters for different endpoints

// AI generation endpoint - strict limits
export const aiGenerationLimiter = new RateLimiter({
  windowMs: 60000,      // 1 minute
  maxRequests: 5,       // 5 requests per minute
  message: 'AI generation rate limit exceeded. Please wait before trying again.'
});

// General API endpoints - moderate limits
export const apiLimiter = new RateLimiter({
  windowMs: 60000,      // 1 minute
  maxRequests: 30,      // 30 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.'
});

// Auth endpoints - very strict limits
export const authLimiter = new RateLimiter({
  windowMs: 900000,     // 15 minutes
  maxRequests: 5,       // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Only count failed attempts
  message: 'Too many authentication attempts. Please try again later.'
});

/**
 * Exponential backoff helper for OpenAI API calls
 */
export class ExponentialBackoff {
  private baseDelay: number;
  private maxDelay: number;
  private maxRetries: number;

  constructor(
    baseDelay: number = 1000,
    maxDelay: number = 60000,
    maxRetries: number = 5
  ) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.maxRetries = maxRetries;
  }

  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, delay: number, error: any) => void
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        if (attempt < this.maxRetries - 1) {
          const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt),
            this.maxDelay
          );

          // Add jitter to prevent thundering herd
          const jitter = Math.random() * delay * 0.1;
          const finalDelay = delay + jitter;

          if (onRetry) {
            onRetry(attempt + 1, finalDelay, error);
          }

          logger.info('ExponentialBackoff', `Retrying after ${finalDelay}ms`, {
            attempt: attempt + 1,
            error: error.message
          });

          await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
      }
    }

    logger.error('ExponentialBackoff', 'Max retries exceeded', lastError);
    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    // OpenAI specific error codes
    if (error.status === 429) return true; // Rate limit
    if (error.status === 500) return true; // Server error
    if (error.status === 502) return true; // Bad gateway
    if (error.status === 503) return true; // Service unavailable
    if (error.status === 504) return true; // Gateway timeout

    // Network errors
    if (error.code === 'ECONNRESET') return true;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ENOTFOUND') return true;

    return false;
  }
}

// Export a default backoff instance for OpenAI calls
export const openAIBackoff = new ExponentialBackoff(1000, 30000, 3);