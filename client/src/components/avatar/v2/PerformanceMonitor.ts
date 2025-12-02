/**
 * Performance Monitor
 * Utilities for tracking and measuring avatar system performance
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

/**
 * Performance metric
 */
export interface PerformanceMetric {
  /** Operation name */
  operation: string;
  
  /** Start time (ms) */
  startTime: number;
  
  /** End time (ms) */
  endTime?: number;
  
  /** Duration (ms) */
  duration?: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  /** Operation name */
  operation: string;
  
  /** Number of measurements */
  count: number;
  
  /** Average duration (ms) */
  average: number;
  
  /** Minimum duration (ms) */
  min: number;
  
  /** Maximum duration (ms) */
  max: number;
  
  /** Total duration (ms) */
  total: number;
  
  /** Last measurement (ms) */
  last: number;
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  /** Timestamp */
  timestamp: number;
  
  /** Used JS heap size (bytes) */
  usedJSHeapSize?: number;
  
  /** Total JS heap size (bytes) */
  totalJSHeapSize?: number;
  
  /** JS heap size limit (bytes) */
  jsHeapSizeLimit?: number;
  
  /** Number of cached textures */
  cachedTextureCount: number;
  
  /** Estimated texture memory (bytes) */
  estimatedTextureMemory: number;
}

/**
 * Performance Monitor
 * Tracks performance metrics for the avatar system
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static activeTimers: Map<string, number> = new Map();
  private static enabled: boolean = true;
  private static maxMetrics: number = 1000; // Keep last 1000 metrics
  
  /**
   * Enable/disable performance monitoring
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Check if monitoring is enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Start timing an operation
   */
  static startTimer(operation: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const timerId = `${operation}_${Date.now()}`;
    this.activeTimers.set(timerId, Date.now());
    
    this.metrics.push({
      operation,
      startTime: Date.now(),
      metadata
    });
    
    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  /**
   * End timing an operation
   */
  static endTimer(operation: string): number | null {
    if (!this.enabled) return null;
    
    const endTime = Date.now();
    
    // Find the most recent metric for this operation without an end time
    const metric = [...this.metrics]
      .reverse()
      .find(m => m.operation === operation && !m.endTime);
    
    if (metric) {
      metric.endTime = endTime;
      metric.duration = endTime - metric.startTime;
      return metric.duration;
    }
    
    return null;
  }
  
  /**
   * Measure an async operation
   */
  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }
    
    this.startTimer(operation, metadata);
    try {
      const result = await fn();
      this.endTimer(operation);
      return result;
    } catch (error) {
      this.endTimer(operation);
      throw error;
    }
  }
  
  /**
   * Measure a synchronous operation
   */
  static measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.enabled) {
      return fn();
    }
    
    this.startTimer(operation, metadata);
    try {
      const result = fn();
      this.endTimer(operation);
      return result;
    } catch (error) {
      this.endTimer(operation);
      throw error;
    }
  }
  
  /**
   * Get statistics for an operation
   */
  static getStats(operation: string): PerformanceStats | null {
    const operationMetrics = this.metrics.filter(
      m => m.operation === operation && m.duration !== undefined
    );
    
    if (operationMetrics.length === 0) {
      return null;
    }
    
    const durations = operationMetrics.map(m => m.duration!);
    const total = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      operation,
      count: durations.length,
      average: total / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total,
      last: durations[durations.length - 1]
    };
  }
  
  /**
   * Get all statistics
   */
  static getAllStats(): PerformanceStats[] {
    const operations = new Set(this.metrics.map(m => m.operation));
    return Array.from(operations)
      .map(op => this.getStats(op))
      .filter((stats): stats is PerformanceStats => stats !== null);
  }
  
  /**
   * Get memory snapshot
   */
  static getMemorySnapshot(
    cachedTextureCount: number = 0,
    estimatedTextureMemory: number = 0
  ): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      cachedTextureCount,
      estimatedTextureMemory
    };
    
    // Add browser memory info if available
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      snapshot.usedJSHeapSize = memory.usedJSHeapSize;
      snapshot.totalJSHeapSize = memory.totalJSHeapSize;
      snapshot.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }
    
    return snapshot;
  }
  
  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Print performance report to console
   */
  static printReport(): void {
    console.group('🎯 Avatar System Performance Report');
    
    const stats = this.getAllStats();
    
    if (stats.length === 0) {
      console.log('No performance data collected');
      console.groupEnd();
      return;
    }
    
    // Sort by average duration (slowest first)
    stats.sort((a, b) => b.average - a.average);
    
    console.table(
      stats.map(s => ({
        Operation: s.operation,
        Count: s.count,
        'Avg (ms)': s.average.toFixed(2),
        'Min (ms)': s.min.toFixed(2),
        'Max (ms)': s.max.toFixed(2),
        'Total (ms)': s.total.toFixed(2),
        'Last (ms)': s.last.toFixed(2)
      }))
    );
    
    console.groupEnd();
  }
  
  /**
   * Print memory report to console
   */
  static printMemoryReport(snapshot: MemorySnapshot): void {
    console.group('💾 Memory Usage Report');
    
    console.log('Timestamp:', new Date(snapshot.timestamp).toLocaleTimeString());
    console.log('Cached Textures:', snapshot.cachedTextureCount);
    console.log('Estimated Texture Memory:', this.formatBytes(snapshot.estimatedTextureMemory));
    
    if (snapshot.usedJSHeapSize !== undefined) {
      console.log('Used JS Heap:', this.formatBytes(snapshot.usedJSHeapSize));
      console.log('Total JS Heap:', this.formatBytes(snapshot.totalJSHeapSize || 0));
      console.log('JS Heap Limit:', this.formatBytes(snapshot.jsHeapSizeLimit || 0));
      
      const usagePercent = ((snapshot.usedJSHeapSize / (snapshot.jsHeapSizeLimit || 1)) * 100).toFixed(2);
      console.log('Heap Usage:', `${usagePercent}%`);
    }
    
    console.groupEnd();
  }
  
  /**
   * Clear all metrics
   */
  static clear(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }
  
  /**
   * Get raw metrics
   */
  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).AvatarPerformanceMonitor = PerformanceMonitor;
}

