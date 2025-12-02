// Editor Actions - Reusable actions for Konva editor
import type { Shape, Viewport } from '../types';
import { Dispatch, SetStateAction } from 'react';

// Temporary utility stubs - implement these from existing editor utilities
const calculateZoomToShape = (shape: Shape, w: number, h: number, p: number): Viewport => ({
  zoom: 1,
  pan: {
    x: -(shape.geometry?.x || 0) + w / 2,
    y: -(shape.geometry?.y || 0) + h / 2
  }
});
const groupShapes = (shapes: Shape[]): Shape[] => shapes.map(s => ({ ...s }));
const ungroupShapes = (shapes: Shape[]): Shape[] => shapes.map(s => ({ ...s }));

export const handleZoomToShape = (
  shape: Shape,
  canvasWidth: number,
  canvasHeight: number,
  padding = 0.2,
  setViewport: Dispatch<SetStateAction<Viewport>>
): Viewport => {
  // Implementation from KonvaMapEditorModule
  const newViewport = calculateZoomToShape(shape, canvasWidth, canvasHeight, padding);
  setViewport(newViewport);
  return newViewport;
};

export const handleGroupShapes = (
  shapeIds: string[],
  shapes: Shape[],
  setShapes: Dispatch<SetStateAction<Shape[]>>,
  markDirty: () => void
) => {
  const shapesToGroup = shapes.filter(s => shapeIds.includes(s.id));
  if (shapesToGroup.length < 2) return;

  const groupedShapes = groupShapes(shapesToGroup);
  const updatedShapes = shapes.map((s: any) =>
    groupedShapes.find((gs: any) => gs.id === s.id) || s
  );

  setShapes(updatedShapes);
  markDirty();
};

export const handleUngroupShapes = (
  shapeIds: string[],
  shapes: Shape[],
  setShapes: Dispatch<SetStateAction<Shape[]>>,
  markDirty: () => void
) => {
  const shapesToUngroup = shapes.filter(s => shapeIds.includes(s.id));
  if (shapesToUngroup.length === 0) return;

  const ungroupedShapes = ungroupShapes(shapesToUngroup);
  const updatedShapes = shapes.map((s: any) =>
    ungroupedShapes.find((us: any) => us.id === s.id) || s
  );

  setShapes(updatedShapes);
  markDirty();
};

// Re-export utils
export * from './shapeFactories';
export * from './mapDataAdapter';
export * from './zoomToShape';
