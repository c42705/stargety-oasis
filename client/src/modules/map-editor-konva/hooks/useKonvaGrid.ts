/**
 * Konva Map Editor - Grid Hook
 * 
 * Handles grid rendering with configurable spacing, pattern, and opacity.
 * Uses layer caching for performance.
 */

import { useMemo } from 'react';
import type { GridConfig, UseKonvaGridParams, UseKonvaGridReturn } from '../types';
import { GRID_DEFAULTS } from '../constants/konvaConstants';

/**
 * Hook for managing grid rendering
 * 
 * Provides grid line data for rendering with React Konva.
 * Optimizes grid rendering based on zoom level and canvas size.
 * 
 * @example
 * ```typescript
 * const { gridLines, gridConfig, shouldRenderGrid } = useKonvaGrid({
 *   config: gridConfig,
 *   canvasWidth: 2000,
 *   canvasHeight: 2000,
 *   viewport,
 * });
 * 
 * // In render:
 * {shouldRenderGrid && gridLines.map((line, i) => (
 *   <Line key={i} points={line.points} stroke={line.stroke} {...line.props} />
 * ))}
 * ```
 */
export function useKonvaGrid(params: UseKonvaGridParams): UseKonvaGridReturn {
  const {
    config = GRID_DEFAULTS,
    canvasWidth,
    canvasHeight,
    viewport,
  } = params;

  const {
    enabled = GRID_DEFAULTS.enabled,
    spacing = GRID_DEFAULTS.spacing,
    color = GRID_DEFAULTS.color,
    opacity = GRID_DEFAULTS.opacity,
    pattern = GRID_DEFAULTS.pattern,
  } = config;

  // ==========================================================================
  // GRID OPTIMIZATION
  // ==========================================================================

  /**
   * Determine if grid should be rendered based on zoom level
   */
  const shouldRenderGrid = useMemo(() => {
    if (!enabled) return false;
    
    // Hide grid at extreme zoom levels for performance
    if (viewport && viewport.zoom > 5.0) return false;
    if (viewport && viewport.zoom < 0.2) return false;
    
    return true;
  }, [enabled, viewport]);

  /**
   * Calculate optimal grid spacing based on zoom level
   */
  const effectiveSpacing = useMemo(() => {
    if (!viewport) return spacing;

    // Adjust spacing based on zoom to maintain visual consistency
    const zoom = viewport.zoom;
    
    // At high zoom, use smaller spacing
    if (zoom > 2.0) {
      return spacing / 2;
    }
    
    // At low zoom, use larger spacing
    if (zoom < 0.5) {
      return spacing * 2;
    }
    
    return spacing;
  }, [spacing, viewport]);

  /**
   * Calculate effective opacity based on zoom level
   */
  const effectiveOpacity = useMemo(() => {
    if (!viewport) return opacity;

    const zoom = viewport.zoom;
    
    // Reduce opacity at extreme zoom levels
    if (zoom > 3.0) {
      return opacity * 0.5;
    }
    
    if (zoom < 0.4) {
      return opacity * 0.7;
    }
    
    return opacity;
  }, [opacity, viewport]);

  // ==========================================================================
  // GRID LINE GENERATION
  // ==========================================================================

  /**
   * Generate grid lines based on pattern
   */
  const gridLines = useMemo(() => {
    if (!shouldRenderGrid) return [];

    const lines: Array<{
      points: number[];
      stroke: string;
      strokeWidth: number;
      opacity: number;
      listening: boolean;
    }> = [];

    const gridSpacing = effectiveSpacing;
    const gridOpacity = effectiveOpacity;

    // Generate vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSpacing) {
      lines.push({
        points: [x, 0, x, canvasHeight],
        stroke: color,
        strokeWidth: 1,
        opacity: gridOpacity,
        listening: false,
      });
    }

    // Generate horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSpacing) {
      lines.push({
        points: [0, y, canvasWidth, y],
        stroke: color,
        strokeWidth: 1,
        opacity: gridOpacity,
        listening: false,
      });
    }

    return lines;
  }, [
    shouldRenderGrid,
    effectiveSpacing,
    effectiveOpacity,
    canvasWidth,
    canvasHeight,
    color,
  ]);

  // ==========================================================================
  // GRID SNAPPING
  // ==========================================================================

  /**
   * Snap a point to the grid
   */
  const snapToGrid = (x: number, y: number): { x: number; y: number } => {
    if (!config.snapToGrid) {
      return { x, y };
    }

    const gridSpacing = effectiveSpacing;
    return {
      x: Math.round(x / gridSpacing) * gridSpacing,
      y: Math.round(y / gridSpacing) * gridSpacing,
    };
  };

  /**
   * Snap an array of points to the grid
   */
  const snapPointsToGrid = (
    points: Array<{ x: number; y: number }>
  ): Array<{ x: number; y: number }> => {
    if (!config.snapToGrid) {
      return points;
    }

    return points.map((point) => snapToGrid(point.x, point.y));
  };

  // ==========================================================================
  // GRID CONFIGURATION
  // ==========================================================================

  /**
   * Get current grid configuration
   */
  const gridConfig: GridConfig = {
    enabled,
    spacing: effectiveSpacing,
    color,
    opacity: effectiveOpacity,
    pattern,
    snapToGrid: config.snapToGrid ?? false,
  };

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Grid rendering
    gridLines,
    shouldRenderGrid,

    // Grid configuration
    gridConfig,
    effectiveSpacing,
    effectiveOpacity,

    // Grid snapping
    snapToGrid,
    snapPointsToGrid,
  };
}

