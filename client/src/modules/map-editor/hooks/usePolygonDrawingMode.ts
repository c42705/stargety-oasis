import { useState, useCallback } from 'react';

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface PolygonDrawingState {
  isDrawing: boolean;
  points: PolygonPoint[];
  previewLine: fabric.Line | null;
  previewPolygon: fabric.Polygon | null;
  vertexCircles: fabric.Circle[];
}

export const usePolygonDrawingMode = () => {
  const [polygonDrawingMode, setPolygonDrawingMode] = useState(false);
  const [drawingState, setDrawingState] = useState<PolygonDrawingState>({
    isDrawing: false,
    points: [],
    previewLine: null,
    previewPolygon: null,
    vertexCircles: []
  });

  const startPolygonDrawing = useCallback(() => {
    setPolygonDrawingMode(true);
    setDrawingState({
      isDrawing: false,
      points: [],
      previewLine: null,
      previewPolygon: null,
      vertexCircles: []
    });
  }, []);

  const exitPolygonDrawing = useCallback(() => {
    setPolygonDrawingMode(false);
    setDrawingState({
      isDrawing: false,
      points: [],
      previewLine: null,
      previewPolygon: null,
      vertexCircles: []
    });
  }, []);

  const addPoint = useCallback((point: PolygonPoint) => {
    setDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      points: [...prev.points, point]
    }));
  }, []);

  const updatePreviewLine = useCallback((line: fabric.Line | null) => {
    setDrawingState(prev => ({
      ...prev,
      previewLine: line
    }));
  }, []);

  const updatePreviewPolygon = useCallback((polygon: fabric.Polygon | null) => {
    setDrawingState(prev => ({
      ...prev,
      previewPolygon: polygon
    }));
  }, []);

  const addVertexCircle = useCallback((circle: fabric.Circle) => {
    setDrawingState(prev => ({
      ...prev,
      vertexCircles: [...prev.vertexCircles, circle]
    }));
  }, []);

  const clearDrawing = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      isDrawing: false,
      points: [],
      previewLine: null,
      previewPolygon: null,
      vertexCircles: []
    }));
  }, []);

  const completePolygon = useCallback(() => {
    const points = drawingState.points;
    clearDrawing();
    return points;
  }, [drawingState.points, clearDrawing]);

  return {
    polygonDrawingMode,
    drawingState,
    startPolygonDrawing,
    exitPolygonDrawing,
    addPoint,
    updatePreviewLine,
    updatePreviewPolygon,
    addVertexCircle,
    clearDrawing,
    completePolygon,
    setDrawingState
  };
};

