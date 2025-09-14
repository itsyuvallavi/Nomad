/**
 * Enhanced Error Handler
 * Provides user-friendly error messages and recovery suggestions
 */

import { logger } from '@/lib/monitoring/logger';

export enum ErrorCategory {
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  API_ERROR = 'api_error',
  AUTH = 'auth',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface ErrorInfo {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  suggestions: string[];
  isRetryable: boolean;
  statusCode?: number;
}

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: Error | any): ErrorCategory {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  const status = error.status || error.statusCode;

  // Network errors
  if (
    code === 'econnreset' ||
    code === 'enotfound' ||
    code === 'econnrefused' ||
    message.includes('network') ||
    message.includes('fetch')
  ) {
    return ErrorCategory.NETWORK;
  }

  // Rate limiting
  if (
    status === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return ErrorCategory.RATE_LIMIT;
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('must be')
  ) {
    return ErrorCategory.VALIDATION;
  }

  // Authentication errors
  if (
    status === 401 ||
    status === 403 ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('api key')
  ) {
    return ErrorCategory.AUTH;
  }

  // Timeout errors
  if (
    code === 'etimedout' ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return ErrorCategory.TIMEOUT;
  }

  // API errors
  if (
    status >= 500 ||
    message.includes('api') ||
    message.includes('server')
  ) {
    return ErrorCategory.API_ERROR;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error information
 */
export function getErrorInfo(error: Error | any): ErrorInfo {
  const category = categorizeError(error);
  const originalMessage = error.message || 'An unexpected error occurred';

  switch (category) {
    case ErrorCategory.NETWORK:
      return {
        category,
        message: originalMessage,
        userMessage: 'Connection issue detected. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again'
        ],
        isRetryable: true
      };

    case ErrorCategory.RATE_LIMIT:
      return {
        category,
        message: originalMessage,
        userMessage: 'We\'re experiencing high demand. Please wait a moment.',
        suggestions: [
          'Wait 30 seconds before trying again',
          'Try a simpler request',
          'Break your trip into smaller segments'
        ],
        isRetryable: true,
        statusCode: 429
      };

    case ErrorCategory.VALIDATION:
      return {
        category,
        message: originalMessage,
        userMessage: parseValidationMessage(originalMessage),
        suggestions: [
          'Include your departure city (e.g., "from New York")',
          'Specify the number of days',
          'Add your travel dates',
          'Keep your request under 30 days'
        ],
        isRetryable: false
      };

    case ErrorCategory.AUTH:
      return {
        category,
        message: originalMessage,
        userMessage: 'Authentication issue. Please contact support if this persists.',
        suggestions: [
          'Refresh the page',
          'Clear your browser cache',
          'Contact support if the issue continues'
        ],
        isRetryable: false,
        statusCode: 401
      };

    case ErrorCategory.TIMEOUT:
      return {
        category,
        message: originalMessage,
        userMessage: 'The request took too long. Let\'s try again.',
        suggestions: [
          'Try a simpler itinerary',
          'Reduce the number of days',
          'Focus on fewer destinations'
        ],
        isRetryable: true
      };

    case ErrorCategory.API_ERROR:
      return {
        category,
        message: originalMessage,
        userMessage: 'Our travel planning service is temporarily unavailable.',
        suggestions: [
          'Wait a few minutes and try again',
          'Try a different destination',
          'Simplify your request'
        ],
        isRetryable: true,
        statusCode: 500
      };

    default:
      return {
        category: ErrorCategory.UNKNOWN,
        message: originalMessage,
        userMessage: 'Something went wrong. Please try again.',
        suggestions: [
          'Refresh the page',
          'Try a different request',
          'Contact support if this continues'
        ],
        isRetryable: true
      };
  }
}

/**
 * Parse validation error messages to be more user-friendly
 */
function parseValidationMessage(message: string): string {
  if (message.includes('departure') || message.includes('origin')) {
    return 'Please tell me where you\'re traveling from (e.g., "from New York")';
  }
  
  if (message.includes('too complex') || message.includes('too many')) {
    return 'Your trip seems quite complex. Try planning fewer destinations or a shorter duration.';
  }
  
  if (message.includes('date')) {
    return 'Please include your travel dates or duration (e.g., "5 days" or "March 15-20")';
  }
  
  if (message.includes('destination')) {
    return 'Please specify where you\'d like to go';
  }

  return 'Please provide more details about your trip';
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: Error | any): object {
  return {
    message: error.message,
    stack: error.stack,
    code: error.code,
    status: error.status || error.statusCode,
    category: categorizeError(error),
    timestamp: new Date().toISOString()
  };
}

/**
 * Handle and log an error appropriately
 */
export function handleError(
  error: Error | any,
  context: string,
  additionalInfo?: any
): ErrorInfo {
  const errorInfo = getErrorInfo(error);
  const logData = {
    ...formatErrorForLogging(error),
    context,
    ...additionalInfo
  };

  // Log based on severity
  if (errorInfo.category === ErrorCategory.VALIDATION) {
    logger.info('ERROR', 'Validation error', logData);
  } else if (errorInfo.isRetryable) {
    logger.warn('ERROR', 'Retryable error occurred', logData);
  } else {
    logger.error('ERROR', 'Error occurred', logData);
  }

  return errorInfo;
}

/**
 * Create a user-friendly error response
 */
export function createErrorResponse(error: Error | any): {
  success: false;
  error: ErrorInfo;
  timestamp: string;
} {
  return {
    success: false,
    error: getErrorInfo(error),
    timestamp: new Date().toISOString()
  };
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorInfo = handleError(error, context, { args });
      throw new Error(errorInfo.userMessage);
    }
  }) as T;
}