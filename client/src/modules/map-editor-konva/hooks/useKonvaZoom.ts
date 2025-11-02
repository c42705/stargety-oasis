/**
 * Konva Map Editor - Zoom Hook
 * 
 * Handles zoom functionality including zoom in/out buttons, mouse wheel zoom,
 * and zoom to specific levels. Integrates with camera controls.
 */

import { useCallback } from 'react';
import type { Viewport, UseKonvaZoomParams, UseKonvaZoomReturn } from '../types';
import { ZOOM } from '../constants/konvaConstants';
import { zoomToPoint } from '../utils/coordinateTransform';

/**
 * Hook for managing zoom functionality
 * 
 * Provides zoom in/out, mouse wheel zoom, and zoom to specific levels.
 * Ensures zoom stays within configured limits.
 * 
 * @example
 * ```typescript
 * const { zoomIn, zoomOut, zoomTo, handleWheel, zoomPercentage } = useKonvaZoom({
 *   viewport,
 *   onViewportChange: setViewport,
 *   config: { min: 0.3, max: 5.0, step: 0.1 },
 * });
 * 
 * // In render:
 * <Stage onWheel={handleWheel}>...</Stage>
 * <Button onClick={zoomIn}>Zoom In</Button>
 * <Button onClick={zoomOut}>Zoom Out</Button>
 * ```
 */
export function useKonvaZoom(params: UseKonvaZoomParams): UseKonvaZoomReturn {
  const {
    viewport,
    onViewportChange,
    config = {},
    enabled = true,
  } = params;

  const minZoom = config.min ?? ZOOM.MIN;
  const maxZoom = config.max ?? ZOOM.MAX;
  const zoomStep = config.step ?? ZOOM.STEP;
  const wheelSensitivity = config.wheelSensitivity ?? ZOOM.WHEEL_SENSITIVITY;

  // ==========================================================================
  // ZOOM UTILITIES
  // ==========================================================================

  /**
   * Clamp zoom value to configured limits
   */
  const clampZoom = useCallback(
    (zoom: number): number => {
      return Math.max(minZoom, Math.min(maxZoom, zoom));
    },
    [minZoom, maxZoom]
  );

  /**
   * Get current zoom as percentage
   */
  const zoomPercentage = Math.round(viewport.zoom * 100);

  /**
   * Check if at minimum zoom
   */
  const isAtMin = viewport.zoom <= minZoom;

  /**
   * Check if at maximum zoom
   */
  const isAtMax = viewport.zoom >= maxZoom;

  // ==========================================================================
  // ZOOM ACTIONS
  // ==========================================================================

  /**
   * Zoom in by one step
   */
  const zoomIn = useCallback(() => {
    if (!enabled) return;

    const newZoom = clampZoom(viewport.zoom + zoomStep);
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [enabled, viewport, onViewportChange, clampZoom, zoomStep]);

  /**
   * Zoom out by one step
   */
  const zoomOut = useCallback(() => {
    if (!enabled) return;

    const newZoom = clampZoom(viewport.zoom - zoomStep);
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [enabled, viewport, onViewportChange, clampZoom, zoomStep]);

  /**
   * Zoom to specific level
   */
  const zoomTo = useCallback(
    (zoom: number) => {
      if (!enabled) return;

      const newZoom = clampZoom(zoom);
      onViewportChange({ ...viewport, zoom: newZoom });
    },
    [enabled, viewport, onViewportChange, clampZoom]
  );

  /**
   * Reset zoom to 100%
   */
  const resetZoom = useCallback(() => {
    if (!enabled) return;

    onViewportChange({ ...viewport, zoom: 1.0 });
  }, [enabled, viewport, onViewportChange]);

  /**
   * Zoom to fit content
   * 
   * @param bounds - Bounds to fit in view
   * @param containerWidth - Container width in pixels
   * @param containerHeight - Container height in pixels
   * @param padding - Padding around bounds (default: 50)
   */
  const zoomToFit = useCallback(
    (
      bounds: { x: number; y: number; width: number; height: number },
      containerWidth: number,
      containerHeight: number,
      padding: number = 50
    ) => {
      if (!enabled) return;

      // Calculate zoom to fit bounds with padding
      const zoomX = (containerWidth - padding * 2) / bounds.width;
      const zoomY = (containerHeight - padding * 2) / bounds.height;
      const zoom = clampZoom(Math.min(zoomX, zoomY));

      // Calculate pan to center bounds
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      const pan = {
        x: containerWidth / 2 - centerX * zoom,
        y: containerHeight / 2 - centerY * zoom,
      };

      onViewportChange({ zoom, pan });
    },
    [enabled, onViewportChange, clampZoom]
  );

  // ==========================================================================
  // MOUSE WHEEL ZOOM
  // ==========================================================================

  /**
   * Handle mouse wheel zoom
   * Zooms to the point under the cursor
   */
  const handleWheel = useCallback(
    (e: any) => {
      if (!enabled) return;

      e.evt.preventDefault();

      // Calculate zoom delta
      const delta = -e.evt.deltaY * wheelSensitivity;
      const newZoom = clampZoom(viewport.zoom + delta);

      // If zoom didn't change (at limits), don't update
      if (newZoom === viewport.zoom) return;

      // Get pointer position
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();

      // Zoom to point under cursor
      const newViewport = zoomToPoint(pointerPos, newZoom, viewport);
      onViewportChange(newViewport);
    },
    [enabled, viewport, onViewportChange, clampZoom, wheelSensitivity]
  );

  // ==========================================================================
  // ZOOM TO PERCENTAGE
  // ==========================================================================

  /**
   * Zoom to specific percentage (e.g., 50 for 50%)
   */
  const zoomToPercentage = useCallback(
    (percentage: number) => {
      if (!enabled) return;

      const zoom = percentage / 100;
      zoomTo(zoom);
    },
    [enabled, zoomTo]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Current state
    zoom: viewport.zoom,
    zoomPercentage,
    isAtMin,
    isAtMax,

    // Actions
    zoomIn,
    zoomOut,
    zoomTo,
    resetZoom,
    zoomToFit,
    zoomToPercentage,

    // Event handlers
    handleWheel,
  };
}

