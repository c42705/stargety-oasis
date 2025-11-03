/**
 * Konva Map Editor - Pan Hook
 * 
 * Handles canvas panning with middle mouse button or pan tool.
 * Supports both mouse and touch input.
 */

import { useCallback, useState, useRef } from 'react';
import type { Viewport, UseKonvaPanParams, UseKonvaPanReturn } from '../types';

/**
 * Hook for managing pan functionality
 * 
 * Provides panning with middle mouse button or pan tool + left click.
 * Tracks panning state and handles mouse/touch events.
 * 
 * @example
 * ```typescript
 * const { isPanning, handleMouseDown, handleMouseMove, handleMouseUp, panTo, resetPan } = useKonvaPan({
 *   viewport,
 *   onViewportChange: setViewport,
 *   enabled: currentTool === 'pan',
 * });
 * 
 * // In render:
 * <Stage
 *   onMouseDown={handleMouseDown}
 *   onMouseMove={handleMouseMove}
 *   onMouseUp={handleMouseUp}
 * >
 *   ...
 * </Stage>
 * ```
 */
export function useKonvaPan(params: UseKonvaPanParams): UseKonvaPanReturn {
  const {
    viewport,
    onViewportChange,
    enabled = false,
    enableMiddleButton = true,
  } = params;

  // State
  const [isPanning, setIsPanning] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // ==========================================================================
  // PAN ACTIONS
  // ==========================================================================

  /**
   * Pan to specific position
   */
  const panTo = useCallback(
    (x: number, y: number) => {
      onViewportChange({
        ...viewport,
        pan: { x, y },
      });
    },
    [viewport, onViewportChange]
  );

  /**
   * Pan by delta
   */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      onViewportChange({
        ...viewport,
        pan: {
          x: viewport.pan.x + dx,
          y: viewport.pan.y + dy,
        },
      });
    },
    [viewport, onViewportChange]
  );

  /**
   * Reset pan to origin
   */
  const resetPan = useCallback(() => {
    onViewportChange({
      ...viewport,
      pan: { x: 0, y: 0 },
    });
  }, [viewport, onViewportChange]);

  /**
   * Center pan on specific point
   */
  const centerOn = useCallback(
    (x: number, y: number, containerWidth: number, containerHeight: number) => {
      const pan = {
        x: containerWidth / 2 - x * viewport.zoom,
        y: containerHeight / 2 - y * viewport.zoom,
      };
      onViewportChange({ ...viewport, pan });
    },
    [viewport, onViewportChange]
  );

  // ==========================================================================
  // MOUSE EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle mouse down - start panning
   */
  const handleMouseDown = useCallback(
    (e: any) => {
      // Check if middle mouse button
      const isMiddleButton = e.evt.button === 1;
      
      // Check if left click with pan tool enabled
      const isLeftClickWithPanTool = e.evt.button === 0 && enabled;

      // Start panning if conditions are met
      if ((isMiddleButton && enableMiddleButton) || isLeftClickWithPanTool) {
        e.evt.preventDefault();
        setIsPanning(true);
        lastPosRef.current = {
          x: e.evt.clientX,
          y: e.evt.clientY,
        };
      }
    },
    [enabled, enableMiddleButton]
  );

  /**
   * Handle mouse move - update pan position
   */
  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isPanning) return;

      e.evt.preventDefault();

      // Calculate delta
      const dx = e.evt.clientX - lastPosRef.current.x;
      const dy = e.evt.clientY - lastPosRef.current.y;

      // Update viewport
      onViewportChange({
        ...viewport,
        pan: {
          x: viewport.pan.x + dx,
          y: viewport.pan.y + dy,
        },
      });

      // Update last position
      lastPosRef.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
      };
    },
    [isPanning, viewport, onViewportChange]
  );

  /**
   * Handle mouse up - stop panning
   */
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  /**
   * Handle mouse leave - stop panning if mouse leaves canvas
   */
  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ==========================================================================
  // TOUCH EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle touch start - start panning
   */
  const handleTouchStart = useCallback(
    (e: any) => {
      if (!enabled) return;

      const touch = e.evt.touches[0];
      if (touch) {
        e.evt.preventDefault();
        setIsPanning(true);
        lastPosRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    },
    [enabled]
  );

  /**
   * Handle touch move - update pan position
   */
  const handleTouchMove = useCallback(
    (e: any) => {
      if (!isPanning) return;

      const touch = e.evt.touches[0];
      if (touch) {
        e.evt.preventDefault();

        // Calculate delta
        const dx = touch.clientX - lastPosRef.current.x;
        const dy = touch.clientY - lastPosRef.current.y;

        // Update viewport
        onViewportChange({
          ...viewport,
          pan: {
            x: viewport.pan.x + dx,
            y: viewport.pan.y + dy,
          },
        });

        // Update last position
        lastPosRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    },
    [isPanning, viewport, onViewportChange]
  );

  /**
   * Handle touch end - stop panning
   */
  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    isPanning,

    // Actions
    panTo,
    panBy,
    resetPan,
    centerOn,

    // Mouse event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    // Touch event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

