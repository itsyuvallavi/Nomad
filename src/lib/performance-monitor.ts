/**
 * Performance Monitoring Utility
 * Tracks and reports key performance metrics
 */

interface PerformanceMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  TTI?: number; // Time to Interactive
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observer: PerformanceObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObserver();
      this.measureTTFB();
    }
  }

  /**
   * Initialize performance observer
   */
  private initializeObserver() {
    try {
      // Observe LCP
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
        console.log('LCP:', this.metrics.LCP);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe FCP
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.FCP = entry.startTime;
            console.log('FCP:', this.metrics.FCP);
          }
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Observe FID
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.FID = entry.processingStart - entry.startTime;
          console.log('FID:', this.metrics.FID);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Observe CLS
      let clsValue = 0;
      let clsEntries: any[] = [];
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries() as any[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        });
        this.metrics.CLS = clsValue;
        console.log('CLS:', this.metrics.CLS);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

    } catch (error) {
      console.error('Failed to initialize performance observer:', error);
    }
  }

  /**
   * Measure Time to First Byte
   */
  private measureTTFB() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        this.metrics.TTFB = navigationEntry.responseStart - navigationEntry.fetchStart;
        console.log('TTFB:', this.metrics.TTFB);
      }
    }
  }

  /**
   * Measure Time to Interactive
   */
  measureTTI() {
    if (typeof window !== 'undefined' && window.performance) {
      // Simplified TTI measurement
      const tti = performance.now();
      this.metrics.TTI = tti;
      console.log('TTI:', this.metrics.TTI);
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Report metrics to analytics or monitoring service
   */
  reportMetrics() {
    const metrics = this.getMetrics();
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.table(metrics);
    }

    // In production, you could send to analytics service
    // Example: sendToAnalytics(metrics);
    
    return metrics;
  }

  /**
   * Track custom timing
   */
  trackTiming(name: string, duration: number) {
    console.log(`Custom timing - ${name}: ${duration}ms`);
    
    // You could send this to analytics
    if (typeof window !== 'undefined' && window.performance) {
      performance.measure(name, {
        start: performance.now() - duration,
        duration
      });
    }
  }
}

// Create singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Get or create performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor!;
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor() {
  if (typeof window === 'undefined') {
    return null;
  }
  return getPerformanceMonitor();
}