/**
 * Konva Map Editor - Polygon Drawing Hook
 * 
 * Handles polygon drawing with click-to-add-vertex workflow.
 * Supports grid snapping, validation, and keyboard shortcuts.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import type {
  UseKonvaPolygonDrawingParams,
  UseKonvaPolygonDrawingReturn,
} from '../types';
import { screenToWorld } from '../utils/coordinateTransform';
import { createPolygonShape } from '../utils/shapeFactories';
import { validatePolygon } from '../utils/validation';
import { POLYGON_DRAWING } from '../constants/konvaConstants';
import { shouldIgnoreKeyboardEvent } from '../../../shared/keyboardFocusUtils';

/**
 * Internal drawing state
 */
interface InternalDrawingState {
  isDrawing: boolean;
  vertices: Array<{ x: number; y: number }>;
  previewPoint: { x: number; y: number } | null;
  isOriginHovered: boolean;
}

/**
 * Hook for polygon drawing functionality
 * 
 * Provides click-to-add-vertex workflow with preview lines, origin hover detection,
 * and automatic polygon completion when clicking near the origin.
 * 
 * @example
 * ```typescript
 * const {
 *   isDrawing,
 *   vertices,
 *   previewLines,
 *   handleClick,
 *   handleMouseMove,
 *   cancelDrawing,
 * } = useKonvaPolygonDrawing({
 *   enabled: currentTool === 'polygon',
 *   category: 'collision',
 *   viewport,
 *   gridConfig,
 *   onShapeCreate: (shape) => addShape(shape),
 *   onValidationError: (errors) => showErrors(errors),
 * });
 * ```
 */
export function useKonvaPolygonDrawing(
  params: UseKonvaPolygonDrawingParams
): UseKonvaPolygonDrawingReturn {
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
  const [drawingState, setDrawingState] = useState<InternalDrawingState>({
    isDrawing: false,
    vertices: [],
    previewPoint: null,
    isOriginHovered: false,
  });

  // Flag to trigger polygon completion
  const shouldCompleteRef = useRef(false);

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
  // POLYGON COMPLETION
  // ==========================================================================

  /**
   * Effect to complete polygon when flag is set
   * This ensures we use the current state, not stale closure state
   */
  useEffect(() => {
    if (!shouldCompleteRef.current) return;

    shouldCompleteRef.current = false;

    console.log('[PolygonDrawing] Completing polygon with current state:', {
      vertexCount: drawingState.vertices.length,
      isDrawing: drawingState.isDrawing,
    });

    if (drawingState.vertices.length < POLYGON_DRAWING.MIN_VERTICES) {
      console.log('[PolygonDrawing] Cannot complete - not enough vertices');
      onValidationError?.([
        `Polygon must have at least ${POLYGON_DRAWING.MIN_VERTICES} vertices`,
      ]);
      return;
    }

    if (drawingState.vertices.length > POLYGON_DRAWING.MAX_VERTICES) {
      console.log('[PolygonDrawing] Cannot complete - too many vertices');
      onValidationError?.([
        `Polygon cannot have more than ${POLYGON_DRAWING.MAX_VERTICES} vertices`,
      ]);
      return;
    }

    console.log('[PolygonDrawing] Creating polygon shape...');

    // Create shape
    const shape = createPolygonShape({
      vertices: drawingState.vertices,
      category,
    });

    console.log('[PolygonDrawing] Shape created:', shape);

    // Validate polygon
    const validation = validatePolygon(shape.geometry as any);
    if (!validation.isValid) {
      console.log('[PolygonDrawing] Validation failed:', validation.errors);
      onValidationError?.(validation.errors);
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Polygon warnings:', validation.warnings);
    }

    console.log('[PolygonDrawing] Calling onShapeCreate...');

    // Create shape
    onShapeCreate?.(shape);

    console.log('[PolygonDrawing] Resetting drawing state...');

    // Reset state
    setDrawingState({
      isDrawing: false,
      vertices: [],
      previewPoint: null,
      isOriginHovered: false,
    });

    console.log('[PolygonDrawing] Polygon completed successfully!');
  }, [drawingState, category, onShapeCreate, onValidationError]);

  /**
   * Trigger polygon completion
   */
  const completePolygon = useCallback(() => {
    console.log('[PolygonDrawing] Setting completion flag...');
    shouldCompleteRef.current = true;
    // Force a re-render to trigger the useEffect
    setDrawingState(prev => ({ ...prev }));
  }, []);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle canvas click - add vertex or complete polygon
   */
  const handleClick = useCallback(
    (e: any) => {
      if (!enabled) {
        console.log('[PolygonDrawing] Click ignored - not enabled');
        return;
      }

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
      const snappedPos = snapPoint(worldPos);

      // Use functional state update to access current state
      setDrawingState((prev) => {
        console.log('[PolygonDrawing] Click at:', snappedPos, 'current vertices:', prev.vertices.length);

        // Check if clicking on origin to close polygon
        const origin = prev.vertices[0];
        if (prev.vertices.length >= POLYGON_DRAWING.MIN_VERTICES && origin) {
          const distance = Math.sqrt(
            Math.pow(snappedPos.x - origin.x, 2) + Math.pow(snappedPos.y - origin.y, 2)
          );
          const threshold = POLYGON_DRAWING.CLOSE_THRESHOLD / viewport.zoom;

          if (distance < threshold) {
            console.log('[PolygonDrawing] Clicking near origin - triggering completion');
            // Set flag to trigger completion
            shouldCompleteRef.current = true;
            return prev; // Don't add vertex, completion will happen in useEffect
          }
        }

        // Add vertex
        console.log('[PolygonDrawing] Adding vertex');
        return {
          ...prev,
          isDrawing: true,
          vertices: [...prev.vertices, snappedPos],
        };
      });
    },
    [enabled, viewport, snapPoint]
  );

  /**
   * Handle mouse move - update preview point and origin hover state
   */
  const handleMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
      const snappedPos = snapPoint(worldPos);

      // Use functional state update to access current state
      setDrawingState((prev) => {
        if (!prev.isDrawing || prev.vertices.length === 0) return prev;

        // Check if hovering over origin
        const origin = prev.vertices[0];
        let hovering = false;

        if (prev.vertices.length >= POLYGON_DRAWING.MIN_VERTICES && origin) {
          const distance = Math.sqrt(
            Math.pow(snappedPos.x - origin.x, 2) + Math.pow(snappedPos.y - origin.y, 2)
          );
          const threshold = POLYGON_DRAWING.CLOSE_THRESHOLD / viewport.zoom;
          hovering = distance < threshold;
        }

        if (hovering && !prev.isOriginHovered) {
          console.log('[PolygonDrawing] Hovering over origin - should show yellow highlight');
        }

        return {
          ...prev,
          previewPoint: snappedPos,
          isOriginHovered: hovering,
        };
      });
    },
    [viewport, snapPoint]
  );

  /**
   * Handle double click - complete polygon
   */
  const handleDoubleClick = useCallback(() => {
    // Access current state via ref or check in completePolygon
    setDrawingState((prev) => {
      console.log('[PolygonDrawing] Double-click detected', {
        isDrawing: prev.isDrawing,
        vertexCount: prev.vertices.length,
        minVertices: POLYGON_DRAWING.MIN_VERTICES
      });

      if (!prev.isDrawing || prev.vertices.length < POLYGON_DRAWING.MIN_VERTICES) {
        console.log('[PolygonDrawing] Double-click ignored - not enough vertices');
        return prev;
      }

      console.log('[PolygonDrawing] Triggering polygon completion via double-click');
      // Set flag to trigger completion
      shouldCompleteRef.current = true;
      return prev; // Completion will happen in useEffect
    });
  }, []);

  /**
   * Cancel drawing and reset state
   */
  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      vertices: [],
      previewPoint: null,
      isOriginHovered: false,
    });
  }, []);

  /**
   * Remove last vertex (backspace)
   */
  const removeLastVertex = useCallback(() => {
    if (drawingState.vertices.length === 0) return;

    setDrawingState((prev) => ({
      ...prev,
      vertices: prev.vertices.slice(0, -1),
      isDrawing: prev.vertices.length > 1, // Stop drawing if removing last vertex
    }));
  }, [drawingState.vertices.length]);

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard events when typing in inputs or when modal is open
      if (shouldIgnoreKeyboardEvent()) {
        console.log('[PolygonDrawing] Keyboard event ignored - input focused or modal open');
        return;
      }

      console.log('[PolygonDrawing] Key pressed:', e.key, {
        isDrawing: drawingState.isDrawing,
        vertexCount: drawingState.vertices.length
      });

      // Enter - complete polygon
      if (e.key === 'Enter' && drawingState.isDrawing && drawingState.vertices.length >= POLYGON_DRAWING.MIN_VERTICES) {
        console.log('[PolygonDrawing] Completing polygon via Enter key');
        e.preventDefault();
        completePolygon();
      }
      // Escape - cancel drawing
      else if (e.key === 'Escape' && drawingState.isDrawing) {
        console.log('[PolygonDrawing] Canceling polygon via Escape key');
        e.preventDefault();
        cancelDrawing();
      }
      // Backspace - remove last vertex
      else if (e.key === 'Backspace' && drawingState.isDrawing && drawingState.vertices.length > 0) {
        console.log('[PolygonDrawing] Removing last vertex via Backspace key');
        e.preventDefault();
        removeLastVertex();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, drawingState.isDrawing, drawingState.vertices.length, completePolygon, cancelDrawing, removeLastVertex]);

  // ==========================================================================
  // PREVIEW LINES
  // ==========================================================================

  /**
   * Get preview lines for rendering
   */
  const previewLines = useCallback((): number[] | null => {
    if (!drawingState.isDrawing || drawingState.vertices.length === 0) {
      return null;
    }

    const points: number[] = [];

    // Add all vertices
    drawingState.vertices.forEach((vertex) => {
      points.push(vertex.x, vertex.y);
    });

    // Add preview point if exists
    if (drawingState.previewPoint) {
      points.push(drawingState.previewPoint.x, drawingState.previewPoint.y);

      // If hovering over origin and can close, add closing line back to origin
      if (drawingState.isOriginHovered && drawingState.vertices.length >= POLYGON_DRAWING.MIN_VERTICES) {
        points.push(drawingState.vertices[0].x, drawingState.vertices[0].y);
      }
    }

    return points;
  }, [drawingState]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    state: {
      ...drawingState,
      minVertices: params.minVertices || POLYGON_DRAWING.MIN_VERTICES,
    } as any, // Type assertion to match PolygonDrawingState
    isDrawing: drawingState.isDrawing,
    vertices: drawingState.vertices,
    previewPoint: drawingState.previewPoint,
    isOriginHovered: drawingState.isOriginHovered,
    vertexCount: drawingState.vertices.length,
    canComplete: drawingState.vertices.length >= POLYGON_DRAWING.MIN_VERTICES,

    // Preview data
    previewLines: previewLines(),

    // Event handlers
    handleClick,
    handleMouseMove,
    handleDoubleClick,
    handleEscape: cancelDrawing,

    // Actions
    cancel: cancelDrawing,
    removeLastVertex,
  };
}

