/**
 * Testing and Validation Utilities for Map Editor
 * 
 * Provides comprehensive testing tools for validating zoom functionality,
 * camera centering, debug overlays, and performance across all zoom levels.
 */

import * as fabric from 'fabric';
import { ZOOM_CONFIG } from '../constants/editorConstants';
import { getZoomState, validateZoomOperation } from './zoomUtils';
import { createComponentLogger } from './logging';

export interface ZoomTestResult {
  zoomLevel: number;
  percentage: string;
  isValid: boolean;
  canvasResponsive: boolean;
  renderTime: number;
  objectsVisible: number;
  gridVisible: boolean;
  error?: string;
}

export interface PerformanceTestResult {
  zoomLevel: number;
  fps: number;
  renderTime: number;
  memoryUsage: number;
  objectCount: number;
  isOptimized: boolean;
}

export interface ValidationReport {
  testName: string;
  timestamp: Date;
  zoomTests: ZoomTestResult[];
  performanceTests: PerformanceTestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageRenderTime: number;
    extremeZoomSupported: boolean;
  };
}

/**
 * Comprehensive zoom testing utility
 */
export class ZoomTester {
  private canvas: fabric.Canvas;
  private logger = createComponentLogger('ZoomTester');

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Test zoom functionality across the entire supported range
   */
  async testZoomRange(
    minZoom: number = ZOOM_CONFIG.MIN_DECIMAL,
    maxZoom: number = ZOOM_CONFIG.EXTREME_MAX_DECIMAL,
    steps: number = 20
  ): Promise<ZoomTestResult[]> {
    const results: ZoomTestResult[] = [];
    const zoomStep = (maxZoom - minZoom) / steps;

    this.logger.info('Starting comprehensive zoom range test', {
      operation: 'zoom_range_test',
      userAction: 'test_validation'
    }, { minZoom, maxZoom, steps });

    for (let i = 0; i <= steps; i++) {
      const zoomLevel = minZoom + (zoomStep * i);
      const result = await this.testSingleZoomLevel(zoomLevel);
      results.push(result);
      
      // Small delay to prevent overwhelming the browser
      await this.delay(50);
    }

    return results;
  }

  /**
   * Test a single zoom level comprehensively
   */
  async testSingleZoomLevel(zoomLevel: number): Promise<ZoomTestResult> {
    const startTime = performance.now();
    
    try {
      // Validate zoom operation
      const validation = validateZoomOperation(this.canvas, zoomLevel, 'test');
      if (!validation.isValid) {
        return {
          zoomLevel,
          percentage: `${Math.round(zoomLevel * 100)}%`,
          isValid: false,
          canvasResponsive: false,
          renderTime: 0,
          objectsVisible: 0,
          gridVisible: false,
          error: validation.error
        };
      }

      // Apply zoom
      const originalZoom = this.canvas.getZoom();
      this.canvas.setZoom(zoomLevel);

      // Measure render time
      const renderStartTime = performance.now();
      this.canvas.renderAll();
      const renderTime = performance.now() - renderStartTime;

      // Test canvas responsiveness
      const canvasResponsive = await this.testCanvasResponsiveness();

      // Count visible objects
      const objectsVisible = this.countVisibleObjects();

      // Check grid visibility (if grid is enabled)
      const gridVisible = this.isGridVisible();

      // Restore original zoom
      this.canvas.setZoom(originalZoom);
      this.canvas.renderAll();

      const totalTime = performance.now() - startTime;

      return {
        zoomLevel,
        percentage: `${Math.round(zoomLevel * 100)}%`,
        isValid: true,
        canvasResponsive,
        renderTime,
        objectsVisible,
        gridVisible,
      };

    } catch (error) {
      return {
        zoomLevel,
        percentage: `${Math.round(zoomLevel * 100)}%`,
        isValid: false,
        canvasResponsive: false,
        renderTime: 0,
        objectsVisible: 0,
        gridVisible: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test canvas responsiveness at current zoom level
   */
  private async testCanvasResponsiveness(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000); // 1 second timeout
      
      try {
        // Simulate user interaction
        const center = this.canvas.getCenter();
        this.canvas.absolutePan(new fabric.Point(center.left + 10, center.top + 10));
        this.canvas.renderAll();
        this.canvas.absolutePan(new fabric.Point(center.left, center.top));
        this.canvas.renderAll();
        
        clearTimeout(timeout);
        resolve(true);
      } catch (error) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  /**
   * Count visible objects in the current viewport
   */
  private countVisibleObjects(): number {
    const viewportBounds = this.canvas.calcViewportBoundaries();
    return this.canvas.getObjects().filter(obj => {
      const objBounds = obj.getBoundingRect();
      return this.isRectInViewport(objBounds, viewportBounds);
    }).length;
  }

  /**
   * Check if grid is visible at current zoom level
   */
  private isGridVisible(): boolean {
    // This is a simplified check - in a real implementation,
    // you would check the actual grid rendering state
    const zoom = this.canvas.getZoom();
    return zoom < 5.0; // Grid typically hidden at extreme zoom levels
  }

  /**
   * Check if rectangle intersects with viewport
   */
  private isRectInViewport(rect: any, viewport: any): boolean {
    return !(rect.left > viewport.br.x || 
             rect.left + rect.width < viewport.tl.x ||
             rect.top > viewport.br.y || 
             rect.top + rect.height < viewport.tl.y);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Performance testing utility
 */
export class PerformanceTester {
  private canvas: fabric.Canvas;
  private logger = createComponentLogger('PerformanceTester');

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Test performance across different zoom levels
   */
  async testPerformanceAcrossZooms(
    zoomLevels: number[] = [0.3, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0]
  ): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    this.logger.info('Starting performance test across zoom levels', {
      operation: 'performance_test',
      userAction: 'test_validation'
    }, { zoomLevels });

    for (const zoomLevel of zoomLevels) {
      const result = await this.testPerformanceAtZoom(zoomLevel);
      results.push(result);
      await this.delay(100); // Allow browser to recover
    }

    return results;
  }

  /**
   * Test performance at a specific zoom level
   */
  async testPerformanceAtZoom(zoomLevel: number): Promise<PerformanceTestResult> {
    const originalZoom = this.canvas.getZoom();
    
    try {
      // Apply zoom
      this.canvas.setZoom(zoomLevel);

      // Measure FPS over a short period
      const fps = await this.measureFPS(1000); // 1 second

      // Measure render time
      const renderTime = this.measureRenderTime();

      // Get memory usage (if available)
      const memoryUsage = this.getMemoryUsage();

      // Count objects
      const objectCount = this.canvas.getObjects().length;

      // Check if optimizations are applied
      const isOptimized = zoomLevel >= ZOOM_CONFIG.OBJECT_FOCUS_MAX_DECIMAL;

      return {
        zoomLevel,
        fps,
        renderTime,
        memoryUsage,
        objectCount,
        isOptimized
      };

    } finally {
      // Restore original zoom
      this.canvas.setZoom(originalZoom);
      this.canvas.renderAll();
    }
  }

  /**
   * Measure FPS over a given duration
   */
  private async measureFPS(duration: number): Promise<number> {
    return new Promise((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();

      const countFrame = () => {
        frameCount++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const fps = Math.round((frameCount * 1000) / elapsed);
          resolve(fps);
        }
      };

      requestAnimationFrame(countFrame);
    });
  }

  /**
   * Measure render time for a single frame
   */
  private measureRenderTime(): number {
    const startTime = performance.now();
    this.canvas.renderAll();
    return performance.now() - startTime;
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Generate comprehensive validation report
 */
export const generateValidationReport = async (
  canvas: fabric.Canvas,
  testName: string = 'Map Editor Zoom Validation'
): Promise<ValidationReport> => {
  const zoomTester = new ZoomTester(canvas);
  const performanceTester = new PerformanceTester(canvas);

  const logger = createComponentLogger('ValidationReport');
  logger.info('Generating comprehensive validation report', {
    operation: 'validation_report',
    userAction: 'test_validation'
  });

  // Run zoom tests
  const zoomTests = await zoomTester.testZoomRange();

  // Run performance tests
  const performanceTests = await performanceTester.testPerformanceAcrossZooms();

  // Calculate summary
  const totalTests = zoomTests.length;
  const passed = zoomTests.filter(test => test.isValid && test.canvasResponsive).length;
  const failed = totalTests - passed;
  const averageRenderTime = zoomTests.reduce((sum, test) => sum + test.renderTime, 0) / totalTests;
  const extremeZoomSupported = zoomTests.some(test => 
    test.zoomLevel >= ZOOM_CONFIG.OBJECT_FOCUS_MAX_DECIMAL && test.isValid
  );

  const report: ValidationReport = {
    testName,
    timestamp: new Date(),
    zoomTests,
    performanceTests,
    summary: {
      totalTests,
      passed,
      failed,
      averageRenderTime,
      extremeZoomSupported
    }
  };

  logger.info('Validation report generated', {
    operation: 'validation_report',
    userAction: 'test_completed'
  }, report.summary);

  return report;
};

/**
 * Quick validation for development
 */
export const quickValidation = async (canvas: fabric.Canvas): Promise<boolean> => {
  const logger = createComponentLogger('QuickValidation');
  
  try {
    // Test key zoom levels
    const keyZoomLevels = [0.3, 1.0, 2.0, 3.1, 5.0];
    const tester = new ZoomTester(canvas);
    
    for (const zoom of keyZoomLevels) {
      const result = await tester.testSingleZoomLevel(zoom);
      if (!result.isValid) {
        logger.error(`Quick validation failed at zoom ${zoom}`, {
          operation: 'quick_validation',
          zoom
        }, result);
        return false;
      }
    }
    
    logger.info('Quick validation passed', {
      operation: 'quick_validation',
      userAction: 'validation_success'
    });
    
    return true;
  } catch (error) {
    logger.error('Quick validation error', {
      operation: 'quick_validation'
    }, error);
    return false;
  }
};
