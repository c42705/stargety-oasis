/**
 * Konva Map Editor - Rectangle Drawing Hook
 * 
 * Handles rectangle drawing with click-and-drag workflow.
 * Supports grid snapping and minimum size validation.
 */

import { useCallback, useState } from 'react';
import type {
  Viewport,
  GridConfig,
  Shape,
  ShapeCategory,
  UseKonvaRectDrawingParams,
  UseKonvaRectDrawingReturn,
} from '../types';
import { screenToWorld } from '../utils/coordinateTransform';
import { createRectangleShape } from '../utils/shapeFactories';
import { validateRectangle } from '../utils/validation';
import { RECTANGLE_DRAWING } from '../constants/konvaConstants';

/**
 * Internal drawing state
 */
interface RectDrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Hook for rectangle drawing functionality
 * 
 * Provides click-and-drag workflow for drawing rectangles with preview.
 * 
 * @example
 * ```typescript
 * const {
 *   isDrawing,
 *   previewRect,
 *   handleMouseDown,
 *   handleMouseMove,
 *   handleMouseUp,
 * } = useKonvaRectDrawing({
 *   enabled: currentTool === 'rectangle',
 *   category: 'collision',
 *   viewport,
 *   gridConfig,
 *   onShapeCreate: (shape) => addShape(shape),
 *   onValidationError: (errors) => showErrors(errors),
 * });
 * ```
 */
export function useKonvaRectDrawing(
  params: UseKonvaRectDrawingParams
): UseKonvaRectDrawingReturn {
  const {
    enabled = false,
    category,
    viewport,
    gridConfig,
    onShapeCreate,
    onValidationError,
    snapToGrid: snapToGridFn,
  } = params;

  // Drawing state
  const [drawingState, setDrawingState] = useState<RectDrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // ==========================================================================
  // COORDINATE UTILITIES
  // ==========================================================================

  /**
   * Snap point to grid if enabled
   */
  const snapPoint = useCallback(
    (point: { x: number; y: number }): { x: number; y: number } => {
      if (!snapToGridFn) {
        return point;
      }
      return snapToGridFn(point.x, point.y);
    },
    [snapToGridFn]
  );

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle mouse down - start drawing rectangle
   */
  const handleMouseDown = useCallback(
    (e: any) => {
      if (!enabled || e.evt.button !== 0) return; // Only left click

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
      const snappedPos = snapPoint(worldPos);

      setDrawingState({
        isDrawing: true,
        startX: snappedPos.x,
        startY: snappedPos.y,
        currentX: snappedPos.x,
        currentY: snappedPos.y,
      });
    },
    [enabled, viewport, snapPoint]
  );

  /**
   * Handle mouse move - update rectangle preview
   */
  const handleMouseMove = useCallback(
    (e: any) => {
      if (!drawingState.isDrawing) return;

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
      const snappedPos = snapPoint(worldPos);

      setDrawingState((prev) => ({
        ...prev,
        currentX: snappedPos.x,
        currentY: snappedPos.y,
      }));
    },
    [drawingState.isDrawing, viewport, snapPoint]
  );

  /**
   * Handle mouse up - complete rectangle
   */
  const handleMouseUp = useCallback(() => {
    if (!drawingState.isDrawing) return;

    const width = Math.abs(drawingState.currentX - drawingState.startX);
    const height = Math.abs(drawingState.currentY - drawingState.startY);

    // Check minimum size
    if (width < RECTANGLE_DRAWING.MIN_WIDTH || height < RECTANGLE_DRAWING.MIN_HEIGHT) {
      onValidationError?.([
        `Rectangle must be at least ${RECTANGLE_DRAWING.MIN_WIDTH}x${RECTANGLE_DRAWING.MIN_HEIGHT} pixels`,
      ]);
      setDrawingState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      return;
    }

    // Calculate normalized position (top-left corner)
    const x = Math.min(drawingState.startX, drawingState.currentX);
    const y = Math.min(drawingState.startY, drawingState.currentY);

    // Create shape
    const shape = createRectangleShape({
      x,
      y,
      width,
      height,
      category,
    });

    // Validate rectangle
    const validation = validateRectangle(shape.geometry as any);
    if (!validation.isValid) {
      onValidationError?.(validation.errors);
      setDrawingState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Rectangle warnings:', validation.warnings);
    }

    // Create shape
    onShapeCreate?.(shape);

    // Reset state
    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [drawingState, category, onShapeCreate, onValidationError]);

  /**
   * Cancel drawing
   */
  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, []);

  // ==========================================================================
  // PREVIEW RECTANGLE
  // ==========================================================================

  /**
   * Get preview rectangle for rendering
   */
  const previewRect = useCallback((): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null => {
    if (!drawingState.isDrawing) return null;

    const x = Math.min(drawingState.startX, drawingState.currentX);
    const y = Math.min(drawingState.startY, drawingState.currentY);
    const width = Math.abs(drawingState.currentX - drawingState.startX);
    const height = Math.abs(drawingState.currentY - drawingState.startY);

    return { x, y, width, height };
  }, [drawingState]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    state: {
      isDrawing: drawingState.isDrawing,
      startPoint: drawingState.isDrawing ? { x: drawingState.startX, y: drawingState.startY } : null,
      currentPoint: drawingState.isDrawing ? { x: drawingState.currentX, y: drawingState.currentY } : null,
      isValidSize: drawingState.isDrawing &&
        Math.abs(drawingState.currentX - drawingState.startX) >= (params.minSize || RECTANGLE_DRAWING.MIN_WIDTH) &&
        Math.abs(drawingState.currentY - drawingState.startY) >= (params.minSize || RECTANGLE_DRAWING.MIN_WIDTH),
    },
    isDrawing: drawingState.isDrawing,

    // Preview data
    previewRect: previewRect(),

    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    // Actions
    cancel: cancelDrawing,
    cancelDrawing,
  };
}

