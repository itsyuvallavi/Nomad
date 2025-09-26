/**
 * Performance Monitoring Module
 * Tracks API response times, token usage, and operation performance
 */

import { logger } from './logger';

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
  timestamp: Date;
}

export interface OperationStats {
  operation: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  lastExecuted: Date;
}

/**
 * Performance monitor class
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private tokenUsage: TokenUsage[] = [];
  private slowOperationThreshold = 10000; // 10 seconds
  private readonly maxMetricsPerOperation = 100;

  /**
   * Start tracking an operation
   */
  startOperation(operation: string, metadata?: Record<string, any>): PerformanceMetric {
    const metric: PerformanceMetric = {
      operation,
      startTime: Date.now(),
      success: false,
      metadata
    };

    // Add to metrics map
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(metric);

    // Limit stored metrics per operation
    if (operationMetrics.length > this.maxMetricsPerOperation) {
      operationMetrics.shift();
    }

    return metric;
  }

  /**
   * End tracking an operation
   */
  endOperation(metric: PerformanceMetric, success = true): void {
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;

    // Log slow operations
    if (metric.duration > this.slowOperationThreshold) {
      this.logSlowOperation(metric);
    }

    // Log performance data
    logger.debug('Performance', {
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      metadata: metric.metadata
    });
  }

  /**
   * Track token usage
   */
  trackTokenUsage(usage: Omit<TokenUsage, 'timestamp'>): void {
    const record: TokenUsage = {
      ...usage,
      timestamp: new Date()
    };

    this.tokenUsage.push(record);

    // Keep only last 1000 records
    if (this.tokenUsage.length > 1000) {
      this.tokenUsage.shift();
    }

    // Log high-cost operations
    if (usage.cost > 0.5) {
      logger.warn('High token cost operation', usage);
    }
  }

  /**
   * Get statistics for an operation
   */
  getOperationStats(operation: string): OperationStats | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const completedMetrics = metrics.filter(m => m.duration !== undefined);
    if (completedMetrics.length === 0) {
      return null;
    }

    const durations = completedMetrics.map(m => m.duration!);
    const successCount = completedMetrics.filter(m => m.success).length;

    return {
      operation,
      count: completedMetrics.length,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successCount / completedMetrics.length,
      lastExecuted: new Date(completedMetrics[completedMetrics.length - 1].startTime)
    };
  }

  /**
   * Get all operation statistics
   */
  getAllStats(): OperationStats[] {
    const stats: OperationStats[] = [];
    for (const operation of this.metrics.keys()) {
      const operationStats = this.getOperationStats(operation);
      if (operationStats) {
        stats.push(operationStats);
      }
    }
    return stats.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  /**
   * Get token usage summary
   */
  getTokenUsageSummary(since?: Date): {
    totalTokens: number;
    totalCost: number;
    byOperation: Record<string, { tokens: number; cost: number }>;
    byModel: Record<string, { tokens: number; cost: number }>;
  } {
    const relevantUsage = since
      ? this.tokenUsage.filter(u => u.timestamp >= since)
      : this.tokenUsage;

    const summary = {
      totalTokens: 0,
      totalCost: 0,
      byOperation: {} as Record<string, { tokens: number; cost: number }>,
      byModel: {} as Record<string, { tokens: number; cost: number }>
    };

    for (const usage of relevantUsage) {
      summary.totalTokens += usage.totalTokens;
      summary.totalCost += usage.cost;

      // By operation
      if (!summary.byOperation[usage.operation]) {
        summary.byOperation[usage.operation] = { tokens: 0, cost: 0 };
      }
      summary.byOperation[usage.operation].tokens += usage.totalTokens;
      summary.byOperation[usage.operation].cost += usage.cost;

      // By model
      if (!summary.byModel[usage.model]) {
        summary.byModel[usage.model] = { tokens: 0, cost: 0 };
      }
      summary.byModel[usage.model].tokens += usage.totalTokens;
      summary.byModel[usage.model].cost += usage.cost;
    }

    return summary;
  }

  /**
   * Log slow operations
   */
  private logSlowOperation(metric: PerformanceMetric): void {
    logger.warn('Slow operation detected', {
      operation: metric.operation,
      duration: metric.duration,
      threshold: this.slowOperationThreshold,
      metadata: metric.metadata
    });
  }

  /**
   * Clear metrics older than specified date
   */
  clearOldMetrics(before: Date): void {
    const cutoffTime = before.getTime();

    for (const [operation, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.startTime >= cutoffTime);
      if (filtered.length === 0) {
        this.metrics.delete(operation);
      } else {
        this.metrics.set(operation, filtered);
      }
    }

    this.tokenUsage = this.tokenUsage.filter(u => u.timestamp >= before);
  }

  /**
   * Get performance report
   */
  generateReport(): string {
    const stats = this.getAllStats();
    const tokenSummary = this.getTokenUsageSummary();

    let report = '=== Performance Report ===\n\n';

    // Operation statistics
    report += 'Operation Performance:\n';
    for (const stat of stats.slice(0, 10)) {
      report += `  ${stat.operation}:\n`;
      report += `    Executions: ${stat.count}\n`;
      report += `    Avg Duration: ${Math.round(stat.averageDuration)}ms\n`;
      report += `    Success Rate: ${(stat.successRate * 100).toFixed(1)}%\n`;
      report += `    Last Run: ${stat.lastExecuted.toISOString()}\n`;
    }

    // Token usage
    report += '\nToken Usage:\n';
    report += `  Total Tokens: ${tokenSummary.totalTokens.toLocaleString()}\n`;
    report += `  Total Cost: $${tokenSummary.totalCost.toFixed(2)}\n`;

    report += '\n  By Operation:\n';
    for (const [op, usage] of Object.entries(tokenSummary.byOperation)) {
      report += `    ${op}: ${usage.tokens.toLocaleString()} tokens ($${usage.cost.toFixed(2)})\n`;
    }

    return report;
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): {
    metrics: Record<string, PerformanceMetric[]>;
    tokenUsage: TokenUsage[];
    stats: OperationStats[];
  } {
    return {
      metrics: Object.fromEntries(this.metrics),
      tokenUsage: this.tokenUsage,
      stats: this.getAllStats()
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance decorator for async functions
 */
export function trackPerformance(operation: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const metric = performanceMonitor.startOperation(
        `${operation}.${propertyKey}`
      );

      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endOperation(metric, true);
        return result;
      } catch (error) {
        performanceMonitor.endOperation(metric, false);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const metric = performanceMonitor.startOperation(operation, metadata);

  try {
    const result = await fn();
    performanceMonitor.endOperation(metric, true);
    return result;
  } catch (error) {
    performanceMonitor.endOperation(metric, false);
    throw error;
  }
}

/**
 * Create performance benchmarks
 */
export class PerformanceBenchmark {
  private benchmarks: Map<string, number> = new Map();

  /**
   * Set a benchmark
   */
  setBenchmark(name: string, targetMs: number): void {
    this.benchmarks.set(name, targetMs);
  }

  /**
   * Check if operation meets benchmark
   */
  checkBenchmark(name: string, actualMs: number): boolean {
    const target = this.benchmarks.get(name);
    if (!target) return true;

    const meetsTarget = actualMs <= target;

    if (!meetsTarget) {
      logger.warn('Benchmark exceeded', {
        benchmark: name,
        target: target,
        actual: actualMs,
        difference: actualMs - target
      });
    }

    return meetsTarget;
  }

  /**
   * Get all benchmarks
   */
  getAllBenchmarks(): Record<string, number> {
    return Object.fromEntries(this.benchmarks);
  }
}

// Default benchmarks
export const defaultBenchmarks = new PerformanceBenchmark();
defaultBenchmarks.setBenchmark('api.openai.completion', 15000);
defaultBenchmarks.setBenchmark('api.google.places', 2000);
defaultBenchmarks.setBenchmark('trip.generation.total', 30000);
defaultBenchmarks.setBenchmark('trip.generation.city', 10000);
defaultBenchmarks.setBenchmark('trip.metadata', 5000);