/**
 * Konva Map Editor POC - Rectangle Drawing Hook
 * Handles rectangle drawing with click and drag
 */

import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { POCShape, POCShapeCategory, POCRectGeometry } from '../types/konva.types';
import { POC_STYLES } from '../constants/konvaConstants';

interface UseKonvaRectDrawingProps {
  enabled: boolean;
  category: POCShapeCategory;
  onShapeCreate: (shape: POCShape) => void;
  viewport: { zoom: number; pan: { x: number; y: number } };
}

interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const useKonvaRectDrawing = ({
  enabled,
  category,
  onShapeCreate,
  viewport,
}: UseKonvaRectDrawingProps) => {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
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

  const handleMouseDown = useCallback(
    (e: any) => {
      if (!enabled || e.evt.button !== 0) return; // Only left click

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

      setDrawingState({
        isDrawing: true,
        startX: worldPos.x,
        startY: worldPos.y,
        currentX: worldPos.x,
        currentY: worldPos.y,
      });
    },
    [enabled, screenToWorld]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!drawingState.isDrawing) return;

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

      setDrawingState((prev) => ({
        ...prev,
        currentX: worldPos.x,
        currentY: worldPos.y,
      }));
    },
    [drawingState.isDrawing, screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawingState.isDrawing) return;

    const width = Math.abs(drawingState.currentX - drawingState.startX);
    const height = Math.abs(drawingState.currentY - drawingState.startY);

    // Only create shape if it has meaningful size
    if (width > 5 && height > 5) {
      const x = Math.min(drawingState.startX, drawingState.currentX);
      const y = Math.min(drawingState.startY, drawingState.currentY);

      const geometry: POCRectGeometry = {
        type: 'rect',
        x,
        y,
        width,
        height,
      };

      const shape: POCShape = {
        id: uuidv4(),
        category,
        geometry,
        style: POC_STYLES[category],
        metadata: {},
      };

      onShapeCreate(shape);
    }

    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [drawingState, category, onShapeCreate]);

  // Get preview rectangle geometry
  const getPreviewRect = useCallback(() => {
    if (!drawingState.isDrawing) return null;

    const x = Math.min(drawingState.startX, drawingState.currentX);
    const y = Math.min(drawingState.startY, drawingState.currentY);
    const width = Math.abs(drawingState.currentX - drawingState.startX);
    const height = Math.abs(drawingState.currentY - drawingState.startY);

    return { x, y, width, height };
  }, [drawingState]);

  return {
    isDrawing: drawingState.isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getPreviewRect,
  };
};

