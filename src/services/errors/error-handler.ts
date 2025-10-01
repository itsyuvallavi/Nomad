/**
 * Centralized Error Handler Module
 * Provides custom error classes, error recovery strategies, and user-friendly messages
 */

import { logger } from '@/lib/monitoring/logger';

/**
 * Base custom error class
 */
export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    public readonly code: string,
    isRetryable = false,
    userMessage?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.isRetryable = isRetryable;
    this.userMessage = userMessage || this.getDefaultUserMessage();
    this.context = context;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  protected abstract getDefaultUserMessage(): string;

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      userMessage: this.userMessage,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * API-related errors
 */
export class APIError extends BaseError {
  constructor(
    message: string,
    public readonly apiName: string,
    public readonly statusCode?: number,
    isRetryable = false,
    context?: Record<string, any>
  ) {
    const code = `API_${apiName.toUpperCase()}_ERROR`;
    super(message, code, isRetryable, undefined, { ...context, statusCode, apiName });
  }

  protected getDefaultUserMessage(): string {
    if (this.statusCode === 429) {
      return 'Service is temporarily busy. Please try again in a moment.';
    }
    if (this.statusCode && this.statusCode >= 500) {
      return 'External service is temporarily unavailable. Please try again later.';
    }
    return 'Unable to connect to external service. Please check your connection and try again.';
  }
}

/**
 * OpenAI-specific errors
 */
export class OpenAIError extends APIError {
  constructor(
    message: string,
    public readonly model?: string,
    statusCode?: number,
    isRetryable = false,
    context?: Record<string, any>
  ) {
    super(message, 'OPENAI', statusCode, isRetryable, { ...context, model });
  }

  protected getDefaultUserMessage(): string {
    if (this.statusCode === 429) {
      return 'AI service is experiencing high demand. Please wait a moment and try again.';
    }
    if (this.message.includes('timeout')) {
      return 'AI response took too long. Please try a simpler request.';
    }
    if (this.message.includes('api key')) {
      return 'AI service configuration error. Please contact support.';
    }
    return 'Unable to generate AI response. Please try again.';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    context?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', false, undefined, { ...context, field, value });
  }

  protected getDefaultUserMessage(): string {
    if (this.field) {
      return `Invalid ${this.field}. Please check your input and try again.`;
    }
    return 'Invalid input provided. Please check your request and try again.';
  }
}

/**
 * Trip generation errors
 */
export class TripGenerationError extends BaseError {
  constructor(
    message: string,
    public readonly phase: 'metadata' | 'city' | 'enrichment' | 'validation' | 'formatting',
    public readonly city?: string,
    isRetryable = false,
    context?: Record<string, any>
  ) {
    const code = `TRIP_GEN_${phase.toUpperCase()}_ERROR`;
    super(message, code, isRetryable, undefined, { ...context, phase, city });
  }

  protected getDefaultUserMessage(): string {
    switch (this.phase) {
      case 'metadata':
        return 'Unable to analyze trip requirements. Please try simplifying your request.';
      case 'city':
        return this.city
          ? `Unable to generate itinerary for ${this.city}. Please try a different destination.`
          : 'Unable to generate city itinerary. Please try again.';
      case 'enrichment':
        return 'Unable to add location details. Your itinerary is ready but may lack some information.';
      case 'validation':
        return 'Generated itinerary has some issues. Please try regenerating.';
      case 'formatting':
        return 'Unable to format the itinerary properly. Please try again.';
      default:
        return 'Error generating trip itinerary. Please try again.';
    }
  }
}

/**
 * Network/Connection errors
 */
export class NetworkError extends BaseError {
  constructor(
    message: string,
    public readonly url?: string,
    isRetryable = true,
    context?: Record<string, any>
  ) {
    super(message, 'NETWORK_ERROR', isRetryable, undefined, { ...context, url });
  }

  protected getDefaultUserMessage(): string {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends BaseError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(message, 'RATE_LIMIT_ERROR', true, undefined, { ...context, service, retryAfter });
  }

  protected getDefaultUserMessage(): string {
    if (this.retryAfter) {
      return `Too many requests. Please wait ${this.retryAfter} seconds and try again.`;
    }
    return 'Too many requests. Please wait a moment and try again.';
  }
}

/**
 * Unknown errors (catch-all)
 */
export class UnknownError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, 'UNKNOWN_ERROR', false, undefined, context);
  }

  protected getDefaultUserMessage(): string {
    return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends BaseError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly timeoutMs: number,
    context?: Record<string, any>
  ) {
    super(message, 'TIMEOUT_ERROR', true, undefined, { ...context, operation, timeoutMs });
  }

  protected getDefaultUserMessage(): string {
    return 'Request took too long to complete. Please try again with a simpler request.';
  }
}

/**
 * Central error handler class
 */
export class ErrorHandler {
  /**
   * Handle error with logging and recovery strategies
   */
  static handle(error: unknown, operation: string): BaseError {
    // Convert to BaseError if needed
    const baseError = this.toBaseError(error, operation);

    // Log the error
    this.logError(baseError, operation);

    // Apply recovery strategy if available
    this.applyRecoveryStrategy(baseError);

    return baseError;
  }

  /**
   * Convert any error to BaseError
   */
  private static toBaseError(error: unknown, operation: string): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific error patterns
      const message = error.message.toLowerCase();

      // OpenAI errors
      if (message.includes('openai') || message.includes('gpt')) {
        return new OpenAIError(error.message, undefined, undefined, true);
      }

      // Network errors
      if (message.includes('fetch') || message.includes('network') || message.includes('econnrefused')) {
        return new NetworkError(error.message);
      }

      // Timeout errors
      if (message.includes('timeout')) {
        return new TimeoutError(error.message, operation, 30000);
      }

      // Rate limit errors
      if (message.includes('rate limit') || message.includes('429')) {
        return new RateLimitError(error.message, operation);
      }

      // Validation errors
      if (message.includes('invalid') || message.includes('validation')) {
        return new ValidationError(error.message);
      }
    }

    // Unknown error
    return new UnknownError(
      error instanceof Error ? error.message : String(error)
    );
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: BaseError, operation: string): void {
    const logData = {
      operation,
      code: error.code,
      isRetryable: error.isRetryable,
      context: error.context
    };

    if (error instanceof ValidationError) {
      logger.warn('ERROR', `Validation error in ${operation}`, logData);
    } else if (error.isRetryable) {
      logger.info('RETRY', `Retryable error in ${operation}`, logData);
    } else {
      logger.error('ERROR', `Error in ${operation}`, { ...logData, error });
    }
  }

  /**
   * Apply recovery strategies based on error type
   */
  static applyRecoveryStrategy(error: BaseError): void {
    if (error instanceof RateLimitError && error.retryAfter) {
      // Could implement automatic retry queue here
      logger.info('RETRY', 'Rate limit recovery', {
        service: error.service,
        retryAfter: error.retryAfter
      });
    }

    if (error instanceof NetworkError) {
      // Could implement circuit breaker pattern here
      logger.info('CIRCUIT', 'Network error recovery initiated', {});
    }
  }

  /**
   * Create user-friendly error response
   */
  static createErrorResponse(error: BaseError): {
    error: string;
    message: string;
    code: string;
    retryable: boolean;
    details?: any;
  } {
    return {
      error: error.name,
      message: error.userMessage,
      code: error.code,
      retryable: error.isRetryable,
      details: process.env.NODE_ENV === 'development' ? error.context : undefined
    };
  }

  /**
   * Wrap async function with error handling
   */
  static async withErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const handledError = this.handle(error, operation);

      if (fallback !== undefined && !handledError.isRetryable) {
        logger.info('ERROR', `Using fallback for ${operation}`, { fallback });
        return fallback;
      }

      throw handledError;
    }
  }
}