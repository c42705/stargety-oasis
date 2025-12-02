/**
 * Konva Map Editor - Vertex Editing Hook
 * 
 * Provides polygon vertex editing functionality including:
 * - Vertex handle rendering and dragging
 * - Edge midpoint handles for adding new vertices
 * - Vertex deletion
 * - Real-time polygon updates
 */

import { useState, useCallback, useMemo } from 'react';
import type { Shape, PolygonGeometry } from '../types';
import type { VertexHandle, EdgeHandle, PolygonEditState } from '../types/shapes.types';

export interface UseKonvaVertexEditParams {
  /** Shape being edited (must be a polygon) */
  shape: Shape | null;
  /** Whether vertex editing is enabled */
  enabled: boolean;
  /** Callback when shape is updated */
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
}

export interface UseKonvaVertexEditReturn {
  /** Current edit state */
  editState: PolygonEditState;
  /** Vertex handles for rendering */
  vertexHandles: VertexHandle[];
  /** Edge handles for rendering */
  edgeHandles: EdgeHandle[];
  /** Whether currently editing */
  isEditing: boolean;
  /** Start editing a polygon */
  startEditing: (shape: Shape) => void;
  /** Stop editing */
  stopEditing: () => void;
  /** Handle vertex drag start */
  handleVertexDragStart: (vertexIndex: number) => void;
  /** Handle vertex drag move */
  handleVertexDragMove: (vertexIndex: number, x: number, y: number) => void;
  /** Handle vertex drag end */
  handleVertexDragEnd: (vertexIndex: number, x: number, y: number) => void;
  /** Handle edge click to add vertex */
  handleEdgeClick: (edgeIndex: number) => void;
  /** Handle vertex delete (right-click or delete key) */
  handleVertexDelete: (vertexIndex: number) => void;
  /** Handle vertex hover */
  handleVertexHover: (vertexIndex: number | null) => void;
}

/**
 * Hook for polygon vertex editing
 */
export function useKonvaVertexEdit(
  params: UseKonvaVertexEditParams
): UseKonvaVertexEditReturn {
  const { shape, enabled, onShapeUpdate, onCancel } = params;

  // Edit state
  const [editState, setEditState] = useState<PolygonEditState>({
    shapeId: null,
    vertexHandles: [],
    edgeHandles: [],
    draggingVertexIndex: null,
    hoveringHandleIndex: null,
  });

  /**
   * Calculate vertex handles from polygon points
   */
  const vertexHandles = useMemo((): VertexHandle[] => {
    if (!shape || !enabled || shape.geometry.type !== 'polygon') {
      return [];
    }

    const geometry = shape.geometry as PolygonGeometry;
    const points = geometry.points;
    const handles: VertexHandle[] = [];

    // Points array is flat: [x1, y1, x2, y2, ...]
    for (let i = 0; i < points.length; i += 2) {
      handles.push({
        index: i / 2,
        x: points[i],
        y: points[i + 1],
        isOrigin: i === 0,
      });
    }

    return handles;
  }, [shape, enabled]);

  /**
   * Calculate edge handles (midpoints between vertices)
   */
  const edgeHandles = useMemo((): EdgeHandle[] => {
    if (!shape || !enabled || shape.geometry.type !== 'polygon') {
      return [];
    }

    const geometry = shape.geometry as PolygonGeometry;
    const points = geometry.points;
    const handles: EdgeHandle[] = [];

    // Calculate midpoints between consecutive vertices
    for (let i = 0; i < points.length; i += 2) {
      const nextI = (i + 2) % points.length;
      const midX = (points[i] + points[nextI]) / 2;
      const midY = (points[i + 1] + points[nextI + 1]) / 2;

      handles.push({
        edgeIndex: i / 2,
        x: midX,
        y: midY,
      });
    }

    return handles;
  }, [shape, enabled]);

  /**
   * Start editing a polygon
   */
  const startEditing = useCallback((shapeToEdit: Shape) => {
    if (shapeToEdit.geometry.type !== 'polygon') {
      console.warn('Can only edit polygon shapes');
      return;
    }

    setEditState({
      shapeId: shapeToEdit.id,
      vertexHandles: [],
      edgeHandles: [],
      draggingVertexIndex: null,
      hoveringHandleIndex: null,
    });
  }, []);

  /**
   * Stop editing
   */
  const stopEditing = useCallback(() => {
    setEditState({
      shapeId: null,
      vertexHandles: [],
      edgeHandles: [],
      draggingVertexIndex: null,
      hoveringHandleIndex: null,
    });
    onCancel?.();
  }, [onCancel]);

  /**
   * Handle vertex drag start
   */
  const handleVertexDragStart = useCallback((vertexIndex: number) => {
    setEditState(prev => ({
      ...prev,
      draggingVertexIndex: vertexIndex,
    }));
  }, []);

  /**
   * Handle vertex drag move
   */
  const handleVertexDragMove = useCallback(
    (vertexIndex: number, x: number, y: number) => {
      if (!shape || shape.geometry.type !== 'polygon') return;

      const geometry = shape.geometry as PolygonGeometry;
      const newPoints = [...geometry.points];
      const pointIndex = vertexIndex * 2;

      newPoints[pointIndex] = x;
      newPoints[pointIndex + 1] = y;

      // Update shape immediately for real-time feedback
      onShapeUpdate?.(shape.id, {
        geometry: {
          ...geometry,
          points: newPoints,
        },
      });
    },
    [shape, onShapeUpdate]
  );

  /**
   * Handle vertex drag end
   */
  const handleVertexDragEnd = useCallback(
    (vertexIndex: number, x: number, y: number) => {
      if (!shape || shape.geometry.type !== 'polygon') return;

      const geometry = shape.geometry as PolygonGeometry;
      const newPoints = [...geometry.points];
      const pointIndex = vertexIndex * 2;

      newPoints[pointIndex] = x;
      newPoints[pointIndex + 1] = y;

      // Final update
      onShapeUpdate?.(shape.id, {
        geometry: {
          ...geometry,
          points: newPoints,
        },
      });

      setEditState(prev => ({
        ...prev,
        draggingVertexIndex: null,
      }));
    },
    [shape, onShapeUpdate]
  );

  /**
   * Handle edge click to add a new vertex
   */
  const handleEdgeClick = useCallback(
    (edgeIndex: number) => {
      if (!shape || shape.geometry.type !== 'polygon') return;

      const geometry = shape.geometry as PolygonGeometry;
      const points = [...geometry.points];
      
      // Calculate insertion point (midpoint of the edge)
      const i = edgeIndex * 2;
      const nextI = (i + 2) % points.length;
      const midX = (points[i] + points[nextI]) / 2;
      const midY = (points[i + 1] + points[nextI + 1]) / 2;

      // Insert new vertex after the current edge
      const insertIndex = i + 2;
      points.splice(insertIndex, 0, midX, midY);

      onShapeUpdate?.(shape.id, {
        geometry: {
          ...geometry,
          points,
        },
      });
    },
    [shape, onShapeUpdate]
  );

  /**
   * Handle vertex deletion
   */
  const handleVertexDelete = useCallback(
    (vertexIndex: number) => {
      if (!shape || shape.geometry.type !== 'polygon') return;

      const geometry = shape.geometry as PolygonGeometry;
      const points = [...geometry.points];

      // Don't allow deleting if we'd go below minimum vertices (3)
      if (points.length <= 6) {
        // 6 values = 3 vertices (x,y pairs)
        console.warn('Cannot delete vertex: polygon must have at least 3 vertices');
        return;
      }

      // Remove the vertex (2 values: x and y)
      const pointIndex = vertexIndex * 2;
      points.splice(pointIndex, 2);

      onShapeUpdate?.(shape.id, {
        geometry: {
          ...geometry,
          points,
        },
      });
    },
    [shape, onShapeUpdate]
  );

  /**
   * Handle vertex hover
   */
  const handleVertexHover = useCallback((vertexIndex: number | null) => {
    setEditState(prev => ({
      ...prev,
      hoveringHandleIndex: vertexIndex,
    }));
  }, []);

  return {
    editState,
    vertexHandles,
    edgeHandles,
    isEditing: editState.shapeId !== null && enabled,
    startEditing,
    stopEditing,
    handleVertexDragStart,
    handleVertexDragMove,
    handleVertexDragEnd,
    handleEdgeClick,
    handleVertexDelete,
    handleVertexHover,
  };
}

