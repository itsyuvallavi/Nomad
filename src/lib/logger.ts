/**
 * Centralized logging service for all API calls and app events
 * Provides formatted console output with performance tracking
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'AI' | 'API' | 'IMAGE' | 'WEATHER' | 'PLACES' | 'SYSTEM' | 'USER';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  duration?: number;
}

// Store log history for debugging
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 100;

// Performance tracking
const performanceTimers = new Map<string, number>();

/**
 * Main logger class
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isEnabled = true;

  /**
   * Start a performance timer
   */
  startTimer(id: string): void {
    performanceTimers.set(id, Date.now());
  }

  /**
   * End a performance timer and return duration
   */
  endTimer(id: string): number {
    const startTime = performanceTimers.get(id);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    performanceTimers.delete(id);
    return duration;
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, category: LogCategory, message: string, details?: any, duration?: number) {
    if (!this.isEnabled && level !== 'error') return;

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      category,
      message,
      details,
      duration,
    };

    // Add to history
    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) {
      logHistory.shift();
    }

    // Format for console
    const emoji = this.getCategoryEmoji(category);
    const color = this.getLevelColor(level);
    const durationStr = duration ? ` [${duration}ms]` : '';
    
    // Console output with styling
    const consoleMessage = `${emoji} [${category}] ${message}${durationStr}`;
    
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.log(`%c${consoleMessage}`, `color: ${color}`, details || '');
        }
        break;
      case 'info':
        console.log(`%c${consoleMessage}`, `color: ${color}`, details || '');
        break;
      case 'warn':
        console.warn(consoleMessage, details || '');
        break;
      case 'error':
        console.error(consoleMessage, details || '');
        break;
    }
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: LogCategory): string {
    const emojis: Record<LogCategory, string> = {
      AI: '🤖',
      API: '🔌',
      IMAGE: '📸',
      WEATHER: '🌤️',
      PLACES: '📍',
      SYSTEM: '⚙️',
      USER: '👤',
    };
    return emojis[category] || '📝';
  }

  /**
   * Get color for log level
   */
  private getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: '#gray',
      info: '#0066cc',
      warn: '#ff9900',
      error: '#cc0000',
    };
    return colors[level];
  }

  // Public logging methods
  debug(category: LogCategory, message: string, details?: any) {
    this.log('debug', category, message, details);
  }

  info(category: LogCategory, message: string, details?: any) {
    this.log('info', category, message, details);
  }

  warn(category: LogCategory, message: string, details?: any) {
    this.log('warn', category, message, details);
  }

  error(category: LogCategory, message: string, details?: any) {
    this.log('error', category, message, details);
  }

  // Specialized logging methods for common operations
  apiCall(service: string, endpoint: string, details?: any) {
    const timerId = `api-${service}-${Date.now()}`;
    this.startTimer(timerId);
    this.info('API', `Calling ${service}: ${endpoint}`, details);
    return timerId;
  }

  apiResponse(timerId: string, service: string, details?: any) {
    const duration = this.endTimer(timerId);
    this.log('info', 'API', `Response from ${service} [${duration}ms]`, { ...details, duration });
  }

  apiError(service: string, error: any) {
    this.error('API', `Error from ${service}`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
  }

  aiGeneration(step: string, details?: any) {
    this.info('AI', `Generation: ${step}`, details);
  }

  imageLoad(source: string, destination: string, success: boolean) {
    const level = success ? 'info' : 'warn';
    this.log(level, 'IMAGE', `${source} image for ${destination}`, { success });
  }

  // Get log history for debugging
  getHistory(): LogEntry[] {
    return [...logHistory];
  }

  // Clear log history
  clearHistory() {
    logHistory.length = 0;
    this.info('SYSTEM', 'Log history cleared');
  }

  // Enable/disable logging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.info('SYSTEM', `Logging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logAPI = logger.apiCall.bind(logger);
export const logAPIResponse = logger.apiResponse.bind(logger);
export const logAPIError = logger.apiError.bind(logger);
export const logAI = logger.aiGeneration.bind(logger);
export const logImage = logger.imageLoad.bind(logger);