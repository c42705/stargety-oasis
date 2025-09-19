/**
 * Performance Optimization Utilities for Map Editor
 * 
 * Provides performance optimizations for high zoom levels and large canvases,
 * including debouncing, throttling, and selective rendering strategies.
 */

import * as fabric from 'fabric';
import { ZOOM_CONFIG } from '../constants/editorConstants';

export interface PerformanceConfig {
  enableDebouncing: boolean;
  enableThrottling: boolean;
  enableSelectiveRendering: boolean;
  debounceDelay: number;
  throttleDelay: number;
  maxObjectsForFullRendering: number;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableDebouncing: true,
  enableThrottling: true,
  enableSelectiveRendering: true,
  debounceDelay: 100,
  throttleDelay: 16, // ~60fps
  maxObjectsForFullRendering: 100
};

/**
 * Create a debounced function that delays execution
 */
export const createDebounced = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
};

/**
 * Create a throttled function that limits execution frequency
 */
export const createThrottled = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastExecution = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastExecution >= delay) {
      func(...args);
      lastExecution = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecution = Date.now();
        timeoutId = null;
      }, delay - (now - lastExecution));
    }
  };
};

/**
 * Check if performance optimizations should be enabled based on zoom level
 */
export const shouldOptimizePerformance = (zoom: number, objectCount: number = 0): boolean => {
  return zoom >= ZOOM_CONFIG.OBJECT_FOCUS_MAX_DECIMAL || objectCount > DEFAULT_PERFORMANCE_CONFIG.maxObjectsForFullRendering;
};

/**
 * Get performance configuration based on current conditions
 */
export const getPerformanceConfig = (zoom: number, objectCount: number = 0): PerformanceConfig => {
  const baseConfig = { ...DEFAULT_PERFORMANCE_CONFIG };

  if (shouldOptimizePerformance(zoom, objectCount)) {
    return {
      ...baseConfig,
      debounceDelay: Math.min(baseConfig.debounceDelay * 1.5, 200),
      throttleDelay: Math.max(baseConfig.throttleDelay * 2, 32),
      enableSelectiveRendering: true
    };
  }

  return baseConfig;
};

/**
 * Optimize canvas rendering based on zoom level and object count
 */
export const optimizeCanvasRendering = (canvas: fabric.Canvas, zoom: number): void => {
  const objectCount = canvas.getObjects().length;
  const shouldOptimize = shouldOptimizePerformance(zoom, objectCount);

  if (shouldOptimize) {
    // Disable object caching for better performance at high zoom
    canvas.getObjects().forEach(obj => {
      if (obj.objectCaching !== false) {
        obj.set('objectCaching', false);
      }
    });

    // Reduce selection border thickness at high zoom
    canvas.selectionBorderColor = 'rgba(74, 144, 226, 0.5)';
    canvas.selectionLineWidth = Math.max(1, 2 / zoom);
  } else {
    // Re-enable object caching for normal zoom levels
    canvas.getObjects().forEach(obj => {
      if (obj.objectCaching !== true) {
        obj.set('objectCaching', true);
      }
    });

    // Normal selection appearance
    canvas.selectionBorderColor = '#4A90E2';
    canvas.selectionLineWidth = 2;
  }
};

/**
 * Create performance-optimized event handlers for canvas
 */
export const createOptimizedCanvasHandlers = (
  canvas: fabric.Canvas,
  zoom: number
) => {
  const config = getPerformanceConfig(zoom, canvas.getObjects().length);

  const optimizedRender = config.enableThrottling
    ? createThrottled(() => canvas.renderAll(), config.throttleDelay)
    : () => canvas.renderAll();

  const optimizedObjectModified = config.enableDebouncing
    ? createDebounced((e: any) => {
        // Handle object modification with debouncing
        console.log('Object modified (debounced):', e.target);
      }, config.debounceDelay)
    : (e: any) => {
        console.log('Object modified:', e.target);
      };

  const optimizedSelectionChanged = config.enableThrottling
    ? createThrottled((e: any) => {
        // Handle selection changes with throttling
        console.log('Selection changed (throttled):', e.selected);
      }, config.throttleDelay)
    : (e: any) => {
        console.log('Selection changed:', e.selected);
      };

  return {
    optimizedRender,
    optimizedObjectModified,
    optimizedSelectionChanged,
    config
  };
};

/**
 * Monitor canvas performance and adjust settings dynamically
 */
export class CanvasPerformanceMonitor {
  private canvas: fabric.Canvas;
  private frameCount = 0;
  private lastFrameTime = 0;
  private averageFPS = 60;
  private isMonitoring = false;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();

    const monitor = () => {
      if (!this.isMonitoring) return;

      const currentTime = performance.now();
      this.frameCount++;

      if (currentTime - this.lastFrameTime >= 1000) {
        this.averageFPS = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = currentTime;

        // Adjust performance settings based on FPS
        this.adjustPerformanceSettings();
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  private adjustPerformanceSettings(): void {
    const zoom = this.canvas.getZoom();
    const objectCount = this.canvas.getObjects().length;

    // If FPS is low, apply more aggressive optimizations
    if (this.averageFPS < 30) {
      console.warn('🐌 Low FPS detected, applying performance optimizations', {
        fps: this.averageFPS,
        zoom,
        objectCount
      });
      optimizeCanvasRendering(this.canvas, zoom);
    } else if (this.averageFPS > 50) {
      // If FPS is good, we can relax some optimizations
      console.log('✅ Good FPS, maintaining current optimizations', {
        fps: this.averageFPS,
        zoom,
        objectCount
      });
    }
  }

  getPerformanceMetrics() {
    return {
      averageFPS: this.averageFPS,
      objectCount: this.canvas.getObjects().length,
      zoom: this.canvas.getZoom(),
      isOptimized: shouldOptimizePerformance(this.canvas.getZoom(), this.canvas.getObjects().length)
    };
  }
}

/**
 * Batch canvas operations for better performance
 */
export const batchCanvasOperations = (
  canvas: fabric.Canvas,
  operations: (() => void)[]
): void => {
  // Disable rendering during batch operations
  canvas.renderOnAddRemove = false;

  try {
    operations.forEach(operation => operation());
  } finally {
    // Re-enable rendering and render once
    canvas.renderOnAddRemove = true;
    canvas.renderAll();
  }
};
