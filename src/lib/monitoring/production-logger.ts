/**
 * Production logging service for user interactions and system monitoring
 * Logs to multiple destinations: local files, Firebase Analytics, and console
 */

interface UserInteraction {
  sessionId: string;
  userId?: string;
  action: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
  prompt?: string;
  response?: {
    destinations: string;
    days: number;
    activities: number;
    duration: string;
    success: boolean;
    error?: string;
  };
  metadata?: Record<string, any>;
}

interface ItineraryGeneration {
  id: string;
  sessionId: string;
  timestamp: string;
  input: {
    prompt: string;
    model: string;
    strategy: string;
  };
  output?: {
    destinations: string;
    days: number;
    activities: number;
    title: string;
    duration: string;
    success: boolean;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  performance: {
    totalDuration: number;
    apiCalls: number;
    cacheHit: boolean;
  };
  userContext: {
    userAgent: string;
    referrer?: string;
    timezone: string;
    language: string;
  };
}

interface SystemMetrics {
  timestamp: string;
  type: 'performance' | 'error' | 'usage';
  metric: string;
  value: number | string;
  context?: Record<string, any>;
}

class ProductionLogger {
  private sessionId: string;
  private isProduction: boolean;
  private logBuffer: Array<UserInteraction | ItineraryGeneration | SystemMetrics> = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Start periodic flush in production
    if (this.isProduction) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic flushing of logs
   */
  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Get user context information
   */
  private getUserContext() {
    if (typeof window === 'undefined') return {};
    
    return {
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  /**
   * Log user interaction
   */
  logUserInteraction(action: string, details?: Record<string, any>) {
    const interaction: UserInteraction = {
      sessionId: this.sessionId,
      action,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      metadata: details
    };

    this.addToBuffer(interaction);
    
    // Console log for debugging
    console.log('👤 [USER]', action, details);
  }

  /**
   * Log itinerary generation request/response
   */
  logItineraryGeneration(data: Partial<ItineraryGeneration>) {
    const log: ItineraryGeneration = {
      id: data.id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      input: data.input!,
      output: data.output,
      error: data.error,
      performance: data.performance!,
      userContext: this.getUserContext() as any
    };

    this.addToBuffer(log);
    
    // Console log for debugging
    const status = log.error ? '❌ FAILED' : '✅ SUCCESS';
    const duration = log.performance.totalDuration;
    console.log(`🚀 [GENERATION] ${status} - ${log.input.prompt} (${duration}ms)`);
  }

  /**
   * Log system metrics
   */
  logMetric(type: SystemMetrics['type'], metric: string, value: number | string, context?: Record<string, any>) {
    const log: SystemMetrics = {
      timestamp: new Date().toISOString(),
      type,
      metric,
      value,
      context
    };

    this.addToBuffer(log);
    
    // Console log for debugging
    console.log(`📊 [METRIC] ${type}:${metric} = ${value}`, context);
  }

  /**
   * Add log entry to buffer
   */
  private addToBuffer(entry: UserInteraction | ItineraryGeneration | SystemMetrics) {
    this.logBuffer.push(entry);

    // Auto-flush if buffer gets too large
    if (this.logBuffer.length >= 50) {
      this.flushLogs();
    }
  }

  /**
   * Flush logs to persistent storage
   */
  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Save to local storage for development
      if (!this.isProduction && typeof window !== 'undefined') {
        const existingLogs = JSON.parse(localStorage.getItem('nomad_logs') || '[]');
        existingLogs.push(...logs);
        
        // Keep only last 500 entries
        if (existingLogs.length > 500) {
          existingLogs.splice(0, existingLogs.length - 500);
        }
        
        localStorage.setItem('nomad_logs', JSON.stringify(existingLogs));
      }

      // In production, send to analytics service
      if (this.isProduction) {
        await this.sendToAnalytics(logs);
      }

      // Also save to file system in development/server
      if (typeof window === 'undefined') {
        await this.saveToFile(logs);
      }

    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Put logs back in buffer to retry
      this.logBuffer.unshift(...logs);
    }
  }

  /**
   * Send logs to Firebase Analytics or other service
   */
  private async sendToAnalytics(logs: Array<UserInteraction | ItineraryGeneration | SystemMetrics>) {
    // Only send to Firebase Analytics in production and on client side
    if (!this.isProduction || typeof window === 'undefined') return;

    try {
      // Dynamic import to avoid server-side issues
      const { logCustomEvent } = await import('@/services/firebase/analytics');
      
      logs.forEach(log => {
        if ('action' in log) {
          // User interaction
          logCustomEvent(`user_${log.action}`, {
            timestamp: log.timestamp,
            session_id: log.sessionId?.slice(-8), // Last 8 chars for privacy
            ...log.metadata
          });
          
        } else if ('input' in log) {
          // Itinerary generation
          const eventName = log.error ? 'itinerary_generation_error' : 'itinerary_generation_success';
          
          logCustomEvent(eventName, {
            prompt_length: log.input.prompt.length,
            strategy: log.input.strategy,
            model: log.input.model,
            duration_ms: log.performance.totalDuration,
            api_calls: log.performance.apiCalls,
            cache_hit: log.performance.cacheHit,
            destinations: log.output?.destinations,
            days: log.output?.days,
            activities: log.output?.activities,
            error_message: log.error?.message,
            user_agent: log.userContext.userAgent?.slice(0, 50), // Truncate for privacy
            timezone: log.userContext.timezone
          });
          
        } else {
          // System metric
          logCustomEvent('system_metric', {
            metric_type: log.type,
            metric_name: log.metric,
            metric_value: typeof log.value === 'string' ? log.value.slice(0, 50) : log.value,
            ...log.context
          });
        }
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to send analytics:', (error as Error).message);
    }
  }

  /**
   * Save logs to file (server-side only)
   */
  private async saveToFile(logs: Array<UserInteraction | ItineraryGeneration | SystemMetrics>) {
    try {
      // Import fs only on server side
      const fs = await import('fs');
      const path = await import('path');
      
      const logDir = path.join(process.cwd(), 'logs', 'production');
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(logDir, `production-${today}.json`);

      // Ensure directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Append logs to daily file
      const logEntries = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      fs.appendFileSync(logFile, logEntries);

    } catch (error) {
      // Silently fail if we can't write to file system
      console.warn('Could not write logs to file:', (error as Error).message);
    }
  }

  /**
   * Get logs for analysis (development only)
   */
  getLogs(): Array<UserInteraction | ItineraryGeneration | SystemMetrics> {
    if (this.isProduction) return [];
    
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('nomad_logs') || '[]');
    }
    
    return [];
  }

  /**
   * Clear all logs (development only)
   */
  clearLogs() {
    if (this.isProduction) return;
    
    this.logBuffer = [];
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nomad_logs');
    }
    
    console.log('📝 [LOGGER] All logs cleared');
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics() {
    const logs = this.getLogs();
    const sessionLogs = logs.filter(log => 
      'sessionId' in log && log.sessionId === this.sessionId
    );

    const itineraryGenerations = sessionLogs.filter(log => 
      'input' in log
    ) as ItineraryGeneration[];

    const userInteractions = sessionLogs.filter(log => 
      'action' in log
    ) as UserInteraction[];

    return {
      sessionId: this.sessionId,
      totalGenerations: itineraryGenerations.length,
      successfulGenerations: itineraryGenerations.filter(g => !g.error).length,
      averageResponseTime: itineraryGenerations.reduce((sum, g) => 
        sum + g.performance.totalDuration, 0
      ) / Math.max(itineraryGenerations.length, 1),
      totalInteractions: userInteractions.length,
      commonActions: this.getMostCommonActions(userInteractions),
      sessionDuration: this.getSessionDuration(logs)
    };
  }

  private getMostCommonActions(interactions: UserInteraction[]) {
    const actionCounts = interactions.reduce((counts, interaction) => {
      counts[interaction.action] = (counts[interaction.action] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
  }

  private getSessionDuration(logs: Array<UserInteraction | ItineraryGeneration | SystemMetrics>) {
    const sessionLogs = logs.filter(log => 
      'sessionId' in log && log.sessionId === this.sessionId
    );

    if (sessionLogs.length === 0) return 0;

    const timestamps = sessionLogs.map(log => new Date(log.timestamp).getTime());
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  /**
   * Cleanup on page unload
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    this.flushLogs();
  }
}

// Export singleton instance
export const productionLogger = new ProductionLogger();

// Cleanup on page unload (client-side only)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    productionLogger.destroy();
  });
}

// Helper functions for common logging scenarios
export const logUserAction = (action: string, details?: Record<string, any>) => {
  productionLogger.logUserInteraction(action, details);
};

export const logItinerary = (data: Partial<ItineraryGeneration>) => {
  productionLogger.logItineraryGeneration(data);
};

export const logPerformance = (metric: string, value: number, context?: Record<string, any>) => {
  productionLogger.logMetric('performance', metric, value, context);
};

export const logError = (metric: string, error: string, context?: Record<string, any>) => {
  productionLogger.logMetric('error', metric, error, context);
};

export const logUsage = (metric: string, value: string | number, context?: Record<string, any>) => {
  productionLogger.logMetric('usage', metric, value, context);
};