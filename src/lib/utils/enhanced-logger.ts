/**
 * Enhanced Logger with Winston
 * Adds file-based logging, performance tracking, and structured output
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { logger as existingLogger } from '@/lib/logger';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nomad-navigator' },
  transports: [
    // Error log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    // AI-specific log file
    new winston.transports.File({
      filename: path.join(logsDir, 'ai-flows.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => {
          if (info.category === 'AI' || info.flowName) {
            return JSON.stringify(info);
          }
          return '';
        })
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Performance tracking
interface PerformanceMetrics {
  aiFlows: Record<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    successRate: number;
    lastRun: string;
  }>;
  apiCalls: Record<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    errorRate: number;
  }>;
  parsingMetrics: {
    totalParses: number;
    successfulParses: number;
    avgParseTime: number;
    confidenceLevels: {
      high: number;
      medium: number;
      low: number;
    };
  };
  errorRate: number;
  uptime: number;
}

class EnhancedLogger {
  private winstonLogger: winston.Logger;
  private performanceTimers: Map<string, number> = new Map();
  private metrics: PerformanceMetrics = {
    aiFlows: {},
    apiCalls: {},
    parsingMetrics: {
      totalParses: 0,
      successfulParses: 0,
      avgParseTime: 0,
      confidenceLevels: {
        high: 0,
        medium: 0,
        low: 0
      }
    },
    errorRate: 0,
    uptime: Date.now()
  };
  private totalRequests = 0;
  private totalErrors = 0;

  constructor() {
    this.winstonLogger = winstonLogger;
  }

  /**
   * Start a timer for performance tracking
   */
  startTimer(id: string): string {
    this.performanceTimers.set(id, Date.now());
    return id;
  }

  /**
   * End a timer and return duration
   */
  endTimer(id: string): number {
    const startTime = this.performanceTimers.get(id);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.performanceTimers.delete(id);
    return duration;
  }

  /**
   * Log AI flow start
   */
  aiFlowStart(flowName: string, input: any): string {
    const flowId = `${flowName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTimer(flowId);
    
    this.winstonLogger.info('AI Flow Started', {
      flowId,
      flowName,
      inputLength: JSON.stringify(input).length,
      category: 'AI',
      timestamp: new Date().toISOString()
    });
    
    // Use existing logger for console output
    existingLogger.info('AI', `Flow started: ${flowName}`, { flowId });
    
    return flowId;
  }

  /**
   * Log AI flow end
   */
  aiFlowEnd(flowId: string, success: boolean, metrics?: any): void {
    const duration = this.endTimer(flowId);
    const flowName = flowId.split('_')[0];
    
    // Update metrics
    if (!this.metrics.aiFlows[flowName]) {
      this.metrics.aiFlows[flowName] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        successRate: 0,
        lastRun: ''
      };
    }
    
    const flowMetrics = this.metrics.aiFlows[flowName];
    flowMetrics.count++;
    flowMetrics.totalTime += duration;
    flowMetrics.avgTime = flowMetrics.totalTime / flowMetrics.count;
    flowMetrics.successRate = success 
      ? (flowMetrics.successRate * (flowMetrics.count - 1) + 1) / flowMetrics.count
      : (flowMetrics.successRate * (flowMetrics.count - 1)) / flowMetrics.count;
    flowMetrics.lastRun = new Date().toISOString();
    
    this.winstonLogger.info('AI Flow Completed', {
      flowId,
      flowName,
      duration,
      success,
      metrics,
      category: 'AI',
      timestamp: new Date().toISOString()
    });
    
    // Use existing logger for console output
    existingLogger.info('AI', `Flow completed: ${flowName} [${duration}ms]`, { success, metrics });
    
    if (!success) {
      this.totalErrors++;
    }
    this.totalRequests++;
    this.metrics.errorRate = this.totalErrors / this.totalRequests;
  }

  /**
   * Log parsing metrics
   */
  logParsingMetrics(
    parseTime: number, 
    success: boolean, 
    confidence: 'high' | 'medium' | 'low'
  ): void {
    const metrics = this.metrics.parsingMetrics;
    metrics.totalParses++;
    
    if (success) {
      metrics.successfulParses++;
    }
    
    // Update average parse time
    metrics.avgParseTime = 
      (metrics.avgParseTime * (metrics.totalParses - 1) + parseTime) / metrics.totalParses;
    
    // Update confidence levels
    metrics.confidenceLevels[confidence]++;
    
    this.winstonLogger.info('Parsing Metrics', {
      parseTime,
      success,
      confidence,
      totalParses: metrics.totalParses,
      successRate: metrics.successfulParses / metrics.totalParses,
      category: 'PARSING'
    });
  }

  /**
   * Log API call
   */
  apiCall(service: string, endpoint: string, details?: any): string {
    const timerId = `api_${service}_${Date.now()}`;
    this.startTimer(timerId);
    
    this.winstonLogger.info('API Call Started', {
      service,
      endpoint,
      details,
      category: 'API'
    });
    
    // Use existing logger for console
    existingLogger.apiCall(service, endpoint, details);
    
    return timerId;
  }

  /**
   * Log API response
   */
  apiResponse(timerId: string, service: string, success: boolean, details?: any): void {
    const duration = this.endTimer(timerId);
    
    // Update API metrics
    if (!this.metrics.apiCalls[service]) {
      this.metrics.apiCalls[service] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        errorRate: 0
      };
    }
    
    const apiMetrics = this.metrics.apiCalls[service];
    apiMetrics.count++;
    apiMetrics.totalTime += duration;
    apiMetrics.avgTime = apiMetrics.totalTime / apiMetrics.count;
    
    if (!success) {
      apiMetrics.errorRate = ((apiMetrics.errorRate * (apiMetrics.count - 1)) + 1) / apiMetrics.count;
    } else {
      apiMetrics.errorRate = (apiMetrics.errorRate * (apiMetrics.count - 1)) / apiMetrics.count;
    }
    
    this.winstonLogger.info('API Call Completed', {
      service,
      duration,
      success,
      details,
      category: 'API'
    });
    
    // Use existing logger for console
    existingLogger.apiResponse(timerId, service, details);
  }

  /**
   * Log error with stack trace
   */
  error(category: string, message: string, error: any): void {
    this.totalErrors++;
    this.totalRequests++;
    this.metrics.errorRate = this.totalErrors / this.totalRequests;
    
    this.winstonLogger.error(message, {
      category,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Use existing logger for console
    existingLogger.error(category as any, message, error);
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime
    };
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(category?: string, limit: number = 100): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const options: any = {
        limit,
        order: 'desc',
        fields: ['timestamp', 'level', 'message', 'category', 'flowName', 'duration']
      };
      
      if (category) {
        options.query = { category };
      }
      
      this.winstonLogger.query(options, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  }

  /**
   * Clear old logs
   */
  async clearOldLogs(daysToKeep: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const logFiles = fs.readdirSync(logsDir);
    
    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        this.winstonLogger.info('Log file deleted', { file, age: `${daysToKeep} days` });
      }
    }
  }

  /**
   * Export logs for analysis
   */
  async exportLogs(startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.getRecentLogs();
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(filteredLogs[0] || {}).join(',');
      const rows = filteredLogs.map(log => 
        Object.values(log).map(v => JSON.stringify(v)).join(',')
      );
      return [headers, ...rows].join('\n');
    }
    
    return JSON.stringify(filteredLogs, null, 2);
  }
  
  /**
   * Direct logging methods for compatibility with Phase 3
   */
  info(category: string, message: string, details?: any): void {
    this.winstonLogger.info(message, {
      category,
      details,
      timestamp: new Date().toISOString()
    });
    existingLogger.info(category as any, message, details);
  }
  
  error(category: string, message: string, error?: any): void {
    this.winstonLogger.error(message, {
      category,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });
    existingLogger.error(category as any, message, error);
  }
  
  warn(category: string, message: string, details?: any): void {
    this.winstonLogger.warn(message, {
      category,
      details,
      timestamp: new Date().toISOString()
    });
    existingLogger.warn(category as any, message, details);
  }
  
  debug(category: string, message: string, details?: any): void {
    this.winstonLogger.debug(message, {
      category,
      details,
      timestamp: new Date().toISOString()
    });
    existingLogger.debug(category as any, message, details);
  }
}

// Export singleton instance
export const enhancedLogger = new EnhancedLogger();

// Export types
export type { PerformanceMetrics };