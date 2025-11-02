/**
 * Map Editor - React Konva Implementation
 * 
 * This module provides a production-ready map editor using React Konva,
 * replacing the previous Fabric.js implementation.
 * 
 * @module map-editor-konva
 */

// Main component
export { KonvaMapCanvas } from './components/KonvaMapCanvas';

// Hooks
export * from './hooks/useKonvaLayers';
export { useKonvaZoom } from './hooks/useKonvaZoom';
export { useKonvaPan } from './hooks/useKonvaPan';
export { useKonvaGrid } from './hooks/useKonvaGrid';
export { useKonvaBackground } from './hooks/useKonvaBackground';
export { useKonvaPolygonDrawing } from './hooks/useKonvaPolygonDrawing';
export { useKonvaRectDrawing } from './hooks/useKonvaRectDrawing';
// export { useKonvaSelection } from './hooks/useKonvaSelection';
// export { useKonvaTransform } from './hooks/useKonvaTransform';
// export { useKonvaHistory } from './hooks/useKonvaHistory';

// Components
export { PolygonDrawingPreview } from './components/PolygonDrawingPreview';
export { RectangleDrawingPreview } from './components/RectangleDrawingPreview';
// export { TransformableShape } from './components/TransformableShape';
// export { PolygonEditor } from './components/PolygonEditor';
// export { SelectionRect } from './components/SelectionRect';

// Types
export type * from './types';

// Constants
export * from './constants/konvaConstants';

// Utilities
export * from './utils/coordinateTransform';
export * from './utils/shapeFactories';
export * from './utils/validation';
export * from './utils/mapDataAdapter';
export * from './utils/sharedMapAdapter';

// Temporary export to prevent empty module error
export const MAP_EDITOR_KONVA_VERSION = '0.1.0-alpha';
export const MAP_EDITOR_KONVA_STATUS = 'In Development - Phase 1: Foundation & Infrastructure';

