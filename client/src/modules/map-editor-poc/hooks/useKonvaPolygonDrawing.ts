/**
 * Konva Map Editor POC - Polygon Drawing Hook
 * Handles polygon drawing with click to add vertices
 */

import { useCallback, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { POCShape, POCShapeCategory, POCPolygonGeometry } from '../types/konva.types';
import { POC_STYLES } from '../constants/konvaConstants';

interface UseKonvaPolygonDrawingProps {
  enabled: boolean;
  category: POCShapeCategory;
  onShapeCreate: (shape: POCShape) => void;
  viewport: { zoom: number; pan: { x: number; y: number } };
}

interface PolygonDrawingState {
  isDrawing: boolean;
  vertices: { x: number; y: number }[];
  previewPoint: { x: number; y: number } | null;
  isOriginHovered: boolean;
}

export const useKonvaPolygonDrawing = ({
  enabled,
  category,
  onShapeCreate,
  viewport,
}: UseKonvaPolygonDrawingProps) => {
  const [drawingState, setDrawingState] = useState<PolygonDrawingState>({
    isDrawing: false,
    vertices: [],
    previewPoint: null,
    isOriginHovered: false,
  });

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - viewport.pan.x) / viewport.zoom,
        y: (screenY - viewport.pan.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Check if a point is near the origin (first vertex)
  const isNearOrigin = useCallback(
    (point: { x: number; y: number }) => {
      if (drawingState.vertices.length < 2) return false; // Need at least 2 vertices to close

      const origin = drawingState.vertices[0];
      const distance = Math.sqrt(
        Math.pow(point.x - origin.x, 2) + Math.pow(point.y - origin.y, 2)
      );

      // Threshold in world coordinates (adjust based on zoom if needed)
      const threshold = 10 / viewport.zoom; // 10 pixels in screen space
      return distance < threshold;
    },
    [drawingState.vertices, viewport.zoom]
  );

  // Complete polygon helper
  const completePolygon = useCallback(() => {
    if (drawingState.vertices.length < 3) return;

    // Create polygon shape
    const points: number[] = [];
    drawingState.vertices.forEach((vertex) => {
      points.push(vertex.x, vertex.y);
    });

    const geometry: POCPolygonGeometry = {
      type: 'polygon',
      points,
    };

    const shape: POCShape = {
      id: uuidv4(),
      category,
      geometry,
      style: POC_STYLES[category],
      metadata: {},
    };

    onShapeCreate(shape);

    // Reset state
    setDrawingState({
      isDrawing: false,
      vertices: [],
      previewPoint: null,
      isOriginHovered: false,
    });
  }, [drawingState.vertices, category, onShapeCreate]);

  const handleClick = useCallback(
    (e: any) => {
      if (!enabled) return;

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

      // Check if clicking on origin to close polygon
      if (isNearOrigin(worldPos) && drawingState.vertices.length >= 3) {
        // Complete the polygon by closing it
        completePolygon();
        return;
      }

      setDrawingState((prev) => ({
        ...prev,
        isDrawing: true,
        vertices: [...prev.vertices, worldPos],
      }));
    },
    [enabled, screenToWorld, isNearOrigin, drawingState.vertices.length, completePolygon]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!drawingState.isDrawing || drawingState.vertices.length === 0) return;

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

      // Check if hovering over origin
      const hovering = isNearOrigin(worldPos);

      setDrawingState((prev) => ({
        ...prev,
        previewPoint: worldPos,
        isOriginHovered: hovering,
      }));
    },
    [drawingState.isDrawing, drawingState.vertices.length, screenToWorld, isNearOrigin]
  );

  const handleDoubleClick = useCallback(() => {
    if (!drawingState.isDrawing || drawingState.vertices.length < 3) return;
    completePolygon();
  }, [drawingState.isDrawing, drawingState.vertices.length, completePolygon]);

  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      vertices: [],
      previewPoint: null,
      isOriginHovered: false,
    });
  }, []);

  // Keyboard listener for Enter and Escape
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && drawingState.isDrawing && drawingState.vertices.length >= 3) {
        completePolygon();
      } else if (e.key === 'Escape' && drawingState.isDrawing) {
        cancelDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, drawingState.isDrawing, drawingState.vertices.length, completePolygon, cancelDrawing]);

  // Get preview lines
  const getPreviewLines = useCallback(() => {
    if (!drawingState.isDrawing || drawingState.vertices.length === 0) return null;

    const points: number[] = [];

    // Add all vertices
    drawingState.vertices.forEach((vertex) => {
      points.push(vertex.x, vertex.y);
    });

    // Add preview point if exists
    if (drawingState.previewPoint) {
      points.push(drawingState.previewPoint.x, drawingState.previewPoint.y);

      // If hovering over origin and can close, add closing line back to origin
      if (drawingState.isOriginHovered && drawingState.vertices.length >= 3) {
        points.push(drawingState.vertices[0].x, drawingState.vertices[0].y);
      }
    }

    return points;
  }, [drawingState]);

  return {
    isDrawing: drawingState.isDrawing,
    vertices: drawingState.vertices,
    isOriginHovered: drawingState.isOriginHovered,
    handleClick,
    handleMouseMove,
    handleDoubleClick,
    cancelDrawing,
    getPreviewLines,
  };
};

