/**
 * Canvas Initialization Utilities
 * 
 * Provides utilities for creating and configuring Fabric.js canvas instances
 * with optimal settings for the map editor.
 */

import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { SharedMapSystem } from '../../../shared/SharedMapSystem';
import {
  optimizeCanvasRendering,
  CanvasPerformanceMonitor,
  shouldOptimizePerformance
} from './performanceUtils';

/**
 * Configuration options for canvas initialization
 */
export interface CanvasInitOptions {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Callback when canvas is ready */
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  /** Callback to set up event listeners */
  setupEventListeners?: (canvas: fabric.Canvas) => void;
}

/**
 * Result of canvas initialization
 */
export interface CanvasInitResult {
  /** The initialized Fabric.js canvas */
  canvas: fabric.Canvas;
  /** Performance monitor instance */
  performanceMonitor: CanvasPerformanceMonitor;
  /** Cleanup function to dispose canvas and stop monitoring */
  cleanup: () => void;
}

/**
 * Create and configure a new Fabric.js canvas with optimal settings
 * 
 * This function:
 * 1. Creates a new Fabric.js canvas with map editor settings
 * 2. Configures default object controls (corners, borders, rotation)
 * 3. Initializes performance monitoring
 * 4. Applies performance optimizations if needed
 * 5. Detects and updates image dimensions
 * 6. Sets up event listeners
 * 
 * @param canvasElement - The HTML canvas element
 * @param options - Configuration options
 * @returns Canvas initialization result with cleanup function
 * 
 * @example
 * ```typescript
 * const { canvas, performanceMonitor, cleanup } = initializeFabricCanvas(
 *   canvasRef.current,
 *   {
 *     width: 800,
 *     height: 600,
 *     onCanvasReady: (canvas) => console.log('Canvas ready!'),
 *     setupEventListeners: (canvas) => setupCanvasEventListeners(canvas)
 *   }
 * );
 * 
 * // Later, when component unmounts:
 * cleanup();
 * ```
 */
export function initializeFabricCanvas(
  canvasElement: HTMLCanvasElement,
  options: CanvasInitOptions
): CanvasInitResult {
  const { width, height, onCanvasReady, setupEventListeners } = options;

  // Create Fabric.js canvas with optimal settings
  const canvas = new fabric.Canvas(canvasElement, {
    width,
    height,
    backgroundColor: 'transparent',
    selection: true,
    preserveObjectStacking: true,
    renderOnAddRemove: true,
    skipTargetFind: false,
    allowTouchScrolling: false,
    imageSmoothingEnabled: false
  });

  // Configure default object controls for better UX
  configureObjectControls();

  // Detect and fix any dimension mismatches
  detectImageDimensions();

  // Initialize performance monitoring
  const performanceMonitor = new CanvasPerformanceMonitor(canvas);

  // Apply initial performance optimizations if needed
  const currentZoom = canvas.getZoom();
  if (shouldOptimizePerformance(currentZoom)) {
    optimizeCanvasRendering(canvas, currentZoom);
    performanceMonitor.startMonitoring();
  }

  // Notify parent component that canvas is ready
  if (onCanvasReady) {
    onCanvasReady(canvas);
  }

  // Set up event listeners if provided
  if (setupEventListeners) {
    setupEventListeners(canvas);
  }

  // Create cleanup function
  const cleanup = () => {
    performanceMonitor.stopMonitoring();
    canvas.dispose();
  };

  return {
    canvas,
    performanceMonitor,
    cleanup
  };
}

/**
 * Configure default Fabric.js object controls
 * 
 * Sets up the appearance and behavior of object controls (corners, borders, rotation)
 * for all objects on the canvas.
 */
function configureObjectControls(): void {
  fabric.Object.prototype.set({
    transparentCorners: false,
    cornerColor: '#4A90E2',
    cornerStyle: 'circle',
    cornerSize: 8,
    borderColor: '#4A90E2',
    borderScaleFactor: 2,
    hasRotatingPoint: true,
    rotatingPointOffset: 30
  });
}

/**
 * Detect and update image dimensions asynchronously
 * 
 * This helps fix any dimension mismatches between the canvas and background image.
 * Runs after a short delay to ensure the canvas is fully initialized.
 */
function detectImageDimensions(): void {
  setTimeout(async () => {
    try {
      const mapSystem = SharedMapSystem.getInstance();
      await mapSystem.detectAndUpdateImageDimensions();
    } catch (error) {
      logger.warn('DIMENSION DETECTION FAILED ON CANVAS INIT', error);
    }
  }, 100);
}

