/**
 * Unified Zoom Utilities for Map Editor
 * 
 * Centralizes all zoom-related calculations and operations to ensure
 * consistency across the map editor and support for extreme zoom levels.
 */

import * as fabric from 'fabric';
import { ZOOM_CONFIG } from '../constants/editorConstants';

export interface ZoomState {
  zoom: number;
  percentage: number;
  isAtMin: boolean;
  isAtMax: boolean;
  isExtreme: boolean;
}

export interface ViewportDimensions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ZoomToObjectOptions {
  padding?: number;
  maxZoom?: number;
  minZoom?: number;
}

/**
 * Get current zoom state with metadata
 */
export const getZoomState = (currentZoom: number): ZoomState => {
  const percentage = Math.round(currentZoom * 100);
  
  return {
    zoom: currentZoom,
    percentage,
    isAtMin: currentZoom <= ZOOM_CONFIG.MIN_DECIMAL,
    isAtMax: currentZoom >= ZOOM_CONFIG.MAX_DECIMAL,
    isExtreme: currentZoom >= ZOOM_CONFIG.OBJECT_FOCUS_MAX_DECIMAL
  };
};

/**
 * Clamp zoom value to valid range
 */
export const clampZoom = (zoom: number, useExtreme: boolean = false): number => {
  const maxZoom = useExtreme ? ZOOM_CONFIG.EXTREME_MAX_DECIMAL : ZOOM_CONFIG.MAX_DECIMAL;
  return Math.max(ZOOM_CONFIG.MIN_DECIMAL, Math.min(zoom, maxZoom));
};

/**
 * Calculate zoom step (in/out) with proper clamping
 */
export const calculateZoomStep = (currentZoom: number, direction: 'in' | 'out', useExtreme: boolean = false): number => {
  const multiplier = direction === 'in' ? ZOOM_CONFIG.STEP_MULTIPLIER : (1 / ZOOM_CONFIG.STEP_MULTIPLIER);
  const newZoom = currentZoom * multiplier;
  return clampZoom(newZoom, useExtreme);
};

/**
 * Get viewport dimensions from container element
 */
export const getViewportDimensions = (container: Element): ViewportDimensions => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2
  };
};

/**
 * Calculate fit-to-screen zoom level
 */
export const calculateFitToScreenZoom = (
  worldWidth: number,
  worldHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = ZOOM_CONFIG.FIT_SCREEN_PADDING
): number => {
  const availableWidth = containerWidth - (padding * 2);
  const availableHeight = containerHeight - (padding * 2);
  
  const zoomX = availableWidth / worldWidth;
  const zoomY = availableHeight / worldHeight;
  
  // Use the smaller zoom to ensure everything fits
  const fitZoom = Math.min(zoomX, zoomY);
  
  // Clamp to valid zoom range
  return clampZoom(fitZoom);
};

/**
 * Calculate zoom to fit object with options
 */
export const calculateZoomToObject = (
  objectBounds: { left: number; top: number; width: number; height: number },
  containerWidth: number,
  containerHeight: number,
  options: ZoomToObjectOptions = {}
): { zoom: number; centerX: number; centerY: number } => {
  const {
    padding = 100,
    maxZoom = ZOOM_CONFIG.OBJECT_FOCUS_MAX_DECIMAL,
    minZoom = ZOOM_CONFIG.MIN_DECIMAL
  } = options;

  // Validate object bounds
  if (objectBounds.width <= 0 || objectBounds.height <= 0) {
    throw new Error('Invalid object dimensions for zoom calculation');
  }

  // Validate container dimensions
  if (containerWidth <= 0 || containerHeight <= 0) {
    throw new Error('Invalid container dimensions for zoom calculation');
  }

  // Calculate available space
  const availableWidth = containerWidth - (padding * 2);
  const availableHeight = containerHeight - (padding * 2);

  // Calculate zoom to fit object
  const zoomX = availableWidth / objectBounds.width;
  const zoomY = availableHeight / objectBounds.height;
  const fitZoom = Math.min(zoomX, zoomY);

  // Apply zoom constraints
  const clampedZoom = Math.max(minZoom, Math.min(fitZoom, maxZoom));

  // Calculate object center
  const centerX = objectBounds.left + objectBounds.width / 2;
  const centerY = objectBounds.top + objectBounds.height / 2;

  return {
    zoom: clampedZoom,
    centerX,
    centerY
  };
};

/**
 * Apply zoom and pan to Fabric.js canvas with proper centering
 */
export const applyZoomAndPan = (
  canvas: fabric.Canvas,
  zoom: number,
  centerX: number,
  centerY: number,
  viewportDimensions: ViewportDimensions
): void => {
  // Apply zoom
  canvas.setZoom(zoom);

  // Calculate pan offset to center the point
  const panX = viewportDimensions.centerX - centerX * zoom;
  const panY = viewportDimensions.centerY - centerY * zoom;

  // Apply pan
  canvas.absolutePan(new fabric.Point(panX, panY));
  
  // Render changes
  canvas.renderAll();
};

/**
 * Validate zoom operation before execution
 */
export const validateZoomOperation = (
  canvas: fabric.Canvas | null,
  targetZoom: number,
  operation: string
): { isValid: boolean; error?: string } => {
  if (!canvas) {
    return { isValid: false, error: `Canvas not available for ${operation}` };
  }

  const zoomState = getZoomState(targetZoom);
  
  if (targetZoom < ZOOM_CONFIG.MIN_DECIMAL) {
    return { isValid: false, error: `Zoom level ${zoomState.percentage}% is below minimum (${ZOOM_CONFIG.MIN_DECIMAL * 100}%)` };
  }

  if (targetZoom > ZOOM_CONFIG.EXTREME_MAX_DECIMAL) {
    return { isValid: false, error: `Zoom level ${zoomState.percentage}% exceeds maximum (${ZOOM_CONFIG.EXTREME_MAX_DECIMAL * 100}%)` };
  }

  return { isValid: true };
};

/**
 * Performance-optimized zoom application with debouncing
 */
export const createDebouncedZoomHandler = (
  callback: (zoom: number) => void,
  delay: number = 100
): ((zoom: number) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (zoom: number) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(zoom);
      timeoutId = null;
    }, delay);
  };
};

/**
 * Check if zoom level requires special handling for performance
 */
export const requiresPerformanceOptimization = (zoom: number): boolean => {
  return zoom >= ZOOM_CONFIG.OBJECT_FOCUS_MAX_DECIMAL;
};

/**
 * Get recommended grid spacing for zoom level
 */
export const getOptimalGridSpacing = (zoom: number, baseSpacing: number): number => {
  // At high zoom levels, increase grid spacing to maintain performance
  if (zoom >= 3.0) {
    return baseSpacing * 2;
  } else if (zoom >= 2.0) {
    return baseSpacing * 1.5;
  }
  return baseSpacing;
};
