/**
 * Konva Map Editor - Polygon Drawing Hook
 * 
 * Handles polygon drawing with click-to-add-vertex workflow.
 * Supports grid snapping, validation, and keyboard shortcuts.
 */

import { useCallback, useState, useEffect } from 'react';
import type {
  Viewport,
  GridConfig,
  Shape,
  ShapeCategory,
  UseKonvaPolygonDrawingParams,
  UseKonvaPolygonDrawingReturn,
} from '../types';
import { screenToWorld } from '../utils/coordinateTransform';
import { createPolygonShape } from '../utils/shapeFactories';
import { validatePolygon } from '../utils/validation';
import { POLYGON_DRAWING } from '../constants/konvaConstants';

/**
 * Internal drawing state
 */
interface PolygonDrawingState {
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
  const [drawingState, setDrawingState] = useState<PolygonDrawingState>({
    isDrawing: false,
    vertices: [],
    previewPoint: null,
    isOriginHovered: false,
  });

  // ==========================================================================
  // COORDINATE UTILITIES
  // ==========================================================================

  /**
   * Snap point to grid if enabled
   */
  const snapPoint = useCallback(
    (point: { x: number; y: number }): { x: number; y: number } => {
      if (!gridConfig?.snapToGrid || !snapToGridFn) {
        return point;
      }
      return snapToGridFn(point.x, point.y);
    },
    [gridConfig?.snapToGrid, snapToGridFn]
  );

  // ==========================================================================
  // ORIGIN DETECTION
  // ==========================================================================

  /**
   * Check if a point is near the origin (first vertex)
   */
  const isNearOrigin = useCallback(
    (point: { x: number; y: number }): boolean => {
      if (drawingState.vertices.length < POLYGON_DRAWING.MIN_VERTICES) {
        return false;
      }

      const origin = drawingState.vertices[0];
      const distance = Math.sqrt(
        Math.pow(point.x - origin.x, 2) + Math.pow(point.y - origin.y, 2)
      );

      // Threshold in world coordinates (adjust based on zoom)
      const threshold = POLYGON_DRAWING.CLOSE_THRESHOLD / viewport.zoom;
      return distance < threshold;
    },
    [drawingState.vertices, viewport.zoom]
  );

  // ==========================================================================
  // POLYGON COMPLETION
  // ==========================================================================

  /**
   * Complete polygon and create shape
   */
  const completePolygon = useCallback(() => {
    if (drawingState.vertices.length < POLYGON_DRAWING.MIN_VERTICES) {
      onValidationError?.([
        `Polygon must have at least ${POLYGON_DRAWING.MIN_VERTICES} vertices`,
      ]);
      return;
    }

    if (drawingState.vertices.length > POLYGON_DRAWING.MAX_VERTICES) {
      onValidationError?.([
        `Polygon cannot have more than ${POLYGON_DRAWING.MAX_VERTICES} vertices`,
      ]);
      return;
    }

    // Create shape
    const shape = createPolygonShape({
      vertices: drawingState.vertices,
      category,
    });

    // Validate polygon
    const validation = validatePolygon(shape.geometry as any);
    if (!validation.isValid) {
      onValidationError?.(validation.errors);
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Polygon warnings:', validation.warnings);
    }

    // Create shape
    onShapeCreate(shape);

    // Reset state
    setDrawingState({
      isDrawing: false,
      vertices: [],
      previewPoint: null,
      isOriginHovered: false,
    });
  }, [drawingState.vertices, category, onShapeCreate, onValidationError]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle canvas click - add vertex or complete polygon
   */
  const handleClick = useCallback(
    (e: any) => {
      if (!enabled) return;

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
      const snappedPos = snapPoint(worldPos);

      // Check if clicking on origin to close polygon
      if (isNearOrigin(snappedPos)) {
        completePolygon();
        return;
      }

      // Add vertex
      setDrawingState((prev) => ({
        ...prev,
        isDrawing: true,
        vertices: [...prev.vertices, snappedPos],
      }));
    },
    [enabled, viewport, snapPoint, isNearOrigin, completePolygon]
  );

  /**
   * Handle mouse move - update preview point and origin hover state
   */
  const handleMouseMove = useCallback(
    (e: any) => {
      if (!drawingState.isDrawing || drawingState.vertices.length === 0) return;

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
      const snappedPos = snapPoint(worldPos);

      // Check if hovering over origin
      const hovering = isNearOrigin(snappedPos);

      setDrawingState((prev) => ({
        ...prev,
        previewPoint: snappedPos,
        isOriginHovered: hovering,
      }));
    },
    [drawingState.isDrawing, drawingState.vertices.length, viewport, snapPoint, isNearOrigin]
  );

  /**
   * Handle double click - complete polygon
   */
  const handleDoubleClick = useCallback(() => {
    if (!drawingState.isDrawing || drawingState.vertices.length < POLYGON_DRAWING.MIN_VERTICES) {
      return;
    }
    completePolygon();
  }, [drawingState.isDrawing, drawingState.vertices.length, completePolygon]);

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
      // Enter - complete polygon
      if (e.key === 'Enter' && drawingState.isDrawing && drawingState.vertices.length >= POLYGON_DRAWING.MIN_VERTICES) {
        e.preventDefault();
        completePolygon();
      }
      // Escape - cancel drawing
      else if (e.key === 'Escape' && drawingState.isDrawing) {
        e.preventDefault();
        cancelDrawing();
      }
      // Backspace - remove last vertex
      else if (e.key === 'Backspace' && drawingState.isDrawing && drawingState.vertices.length > 0) {
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

    // Actions
    completePolygon,
    cancelDrawing,
    removeLastVertex,
  };
}

