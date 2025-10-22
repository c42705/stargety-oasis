/**
 * Polygon Drawing Hook
 * 
 * Manages the state machine for drawing polygon collision areas in the map editor.
 * Handles vertex addition, preview rendering, polygon completion, and cancellation.
 */

import { useState, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { ImpassableArea } from '../../../shared/MapDataContext';
import { PolygonDrawingState } from '../types/fabricCanvas.types';

export interface UsePolygonDrawingOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Whether grid snapping is enabled */
  gridVisible: boolean;
  /** Grid spacing for snapping */
  gridSpacing: number;
  /** Current impassable areas (for naming) */
  impassableAreas: ImpassableArea[];
  /** Callback to add collision area to shared map */
  onAddCollisionArea: (area: ImpassableArea) => void;
  /** Callback to update local impassable areas state */
  onUpdateImpassableAreas: (updater: (prev: ImpassableArea[]) => ImpassableArea[]) => void;
  /** Pending collision area data (name, etc.) from modal */
  pendingCollisionAreaData?: Partial<ImpassableArea> | null;
}

export interface UsePolygonDrawingResult {
  /** Current polygon drawing state */
  polygonDrawingState: PolygonDrawingState;
  /** Add a vertex to the polygon being drawn */
  addPolygonVertex: (point: { x: number; y: number }) => void;
  /** Update the preview line and polygon */
  updatePolygonPreview: (mousePoint: { x: number; y: number }) => void;
  /** Complete the polygon and add it to the canvas */
  completePolygon: () => void;
  /** Cancel polygon drawing and clean up */
  cancelPolygonDrawing: () => void;
  /** Snap a point to the grid */
  snapPointToGrid: (point: { x: number; y: number }) => { x: number; y: number };
}

/**
 * Hook for managing polygon drawing state and operations
 */
export function usePolygonDrawing(options: UsePolygonDrawingOptions): UsePolygonDrawingResult {
  const {
    canvas,
    gridVisible,
    gridSpacing,
    impassableAreas,
    onAddCollisionArea,
    onUpdateImpassableAreas,
    pendingCollisionAreaData
  } = options;

  // Polygon drawing state
  const [polygonDrawingState, setPolygonDrawingState] = useState<PolygonDrawingState>({
    isDrawing: false,
    points: [],
    vertexCircles: []
  });

  // Use refs for preview elements to avoid stale closures and re-render issues
  const polygonPreviewLineRef = useRef<fabric.Line | null>(null);
  const polygonPreviewPolygonRef = useRef<fabric.Polygon | null>(null);

  /**
   * Snap a point to the grid if grid snapping is enabled
   */
  const snapPointToGrid = useCallback((point: { x: number; y: number }): { x: number; y: number } => {
    if (!gridVisible || gridSpacing <= 0) {
      return point;
    }
    return {
      x: Math.round(point.x / gridSpacing) * gridSpacing,
      y: Math.round(point.y / gridSpacing) * gridSpacing
    };
  }, [gridVisible, gridSpacing]);

  /**
   * Add a vertex to the polygon being drawn
   */
  const addPolygonVertex = useCallback((point: { x: number; y: number }) => {
    if (!canvas) return;

    // Snap to grid if enabled
    const snappedPoint = snapPointToGrid(point);

    // Add vertex circle
    const circle = new fabric.Circle({
      left: snappedPoint.x - 4,
      top: snappedPoint.y - 4,
      radius: 4,
      fill: '#ef4444',
      stroke: '#fff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center'
    });
    canvas.add(circle);

    setPolygonDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      points: [...prev.points, snappedPoint],
      vertexCircles: [...prev.vertexCircles, circle]
    }));

    canvas.renderAll();
  }, [canvas, snapPointToGrid]);

  /**
   * Update the preview line and polygon as the mouse moves
   */
  const updatePolygonPreview = useCallback((mousePoint: { x: number; y: number }) => {
    if (!canvas || polygonDrawingState.points.length === 0) return;

    // Remove old preview line using ref
    if (polygonPreviewLineRef.current) {
      canvas.remove(polygonPreviewLineRef.current);
      polygonPreviewLineRef.current = null;
    }

    // Remove old preview polygon using ref
    if (polygonPreviewPolygonRef.current) {
      canvas.remove(polygonPreviewPolygonRef.current);
      polygonPreviewPolygonRef.current = null;
    }

    const lastPoint = polygonDrawingState.points[polygonDrawingState.points.length - 1];
    const snappedMouse = snapPointToGrid(mousePoint);

    // Create preview line from last point to mouse
    const previewLine = new fabric.Line(
      [lastPoint.x, lastPoint.y, snappedMouse.x, snappedMouse.y],
      {
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      }
    );
    canvas.add(previewLine);
    polygonPreviewLineRef.current = previewLine;

    // If we have at least 2 points, show preview polygon
    if (polygonDrawingState.points.length >= 2) {
      const previewPoints = [...polygonDrawingState.points, snappedMouse];
      const previewPolygon = new fabric.Polygon(previewPoints, {
        fill: 'rgba(239, 68, 68, 0.3)',
        stroke: '#ef4444',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        opacity: 0.5
      });
      canvas.add(previewPolygon);
      polygonPreviewPolygonRef.current = previewPolygon;
    }

    canvas.renderAll();
  }, [canvas, polygonDrawingState.points, snapPointToGrid]);

  /**
   * Complete the polygon and add it to the canvas
   */
  const completePolygon = useCallback(() => {
    if (!canvas || polygonDrawingState.points.length < 3) {
      logger.warn('Polygon must have at least 3 points');
      return;
    }

    // Clean up preview elements using refs
    if (polygonPreviewLineRef.current) {
      canvas.remove(polygonPreviewLineRef.current);
      polygonPreviewLineRef.current = null;
    }
    if (polygonPreviewPolygonRef.current) {
      canvas.remove(polygonPreviewPolygonRef.current);
      polygonPreviewPolygonRef.current = null;
    }
    polygonDrawingState.vertexCircles.forEach(circle => canvas.remove(circle));

    // Create final polygon (selectable when select tool is active)
    const polygon = new fabric.Polygon(polygonDrawingState.points, {
      fill: 'rgba(239, 68, 68, 0.3)',
      stroke: '#ef4444',
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockRotation: true,
      objectCaching: false
    });

    // Generate unique ID for the polygon
    const polygonId = `impassable-polygon-${Date.now()}`;
    const polygonName = pendingCollisionAreaData?.name || `Impassable Polygon ${impassableAreas.filter(a => a.type === 'impassable-polygon').length + 1}`;

    // Calculate bounding box
    const xs = polygonDrawingState.points.map(p => p.x);
    const ys = polygonDrawingState.points.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const boundingBox = {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    // Log polygon creation
    logger.info('🆕 [Polygon Save] POLYGON CREATED IN EDITOR', {
      timestamp: new Date().toISOString(),
      id: polygonId,
      name: polygonName,
      type: 'impassable-polygon',
      pointsCount: polygonDrawingState.points.length,
      allPoints: polygonDrawingState.points,
      boundingBox,
      fabricPosition: {
        left: polygon.left,
        top: polygon.top,
        width: polygon.width,
        height: polygon.height
      },
      color: '#ef4444'
    });

    // Store polygon data with proper bounding box
    const polygonData: ImpassableArea = {
      ...pendingCollisionAreaData, // Include any additional data from modal
      id: polygonId,
      name: polygonName,
      type: 'impassable-polygon',
      points: polygonDrawingState.points,
      color: '#ef4444',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    // Add metadata to fabric object
    (polygon as any).mapElementId = polygonId;
    (polygon as any).mapElementType = 'collision';
    (polygon as any).mapElementData = polygonData;

    canvas.add(polygon);
    canvas.renderAll();

    // Add to impassable areas state
    onUpdateImpassableAreas(prev => [...prev, polygonData]);

    // Persist to shared map
    onAddCollisionArea(polygonData);

    // Reset polygon drawing state
    setPolygonDrawingState({
      isDrawing: false,
      points: [],
      vertexCircles: []
    });

    logger.info('Polygon collision area created', { id: polygonId, points: polygonDrawingState.points.length });
  }, [canvas, polygonDrawingState, impassableAreas, onAddCollisionArea, onUpdateImpassableAreas, pendingCollisionAreaData]);

  /**
   * Cancel polygon drawing and clean up all preview elements
   */
  const cancelPolygonDrawing = useCallback(() => {
    if (!canvas) return;

    // Clean up all preview elements using refs
    if (polygonPreviewLineRef.current) {
      canvas.remove(polygonPreviewLineRef.current);
      polygonPreviewLineRef.current = null;
    }
    if (polygonPreviewPolygonRef.current) {
      canvas.remove(polygonPreviewPolygonRef.current);
      polygonPreviewPolygonRef.current = null;
    }
    polygonDrawingState.vertexCircles.forEach(circle => canvas.remove(circle));

    // Reset state
    setPolygonDrawingState({
      isDrawing: false,
      points: [],
      vertexCircles: []
    });

    canvas.renderAll();
  }, [canvas, polygonDrawingState]);

  return {
    polygonDrawingState,
    addPolygonVertex,
    updatePolygonPreview,
    completePolygon,
    cancelPolygonDrawing,
    snapPointToGrid
  };
}

