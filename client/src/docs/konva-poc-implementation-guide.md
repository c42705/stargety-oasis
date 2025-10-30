# React Konva POC Implementation Guide

## Overview

This guide provides detailed implementation instructions for the React Konva Proof-of-Concept (POC) map editor. The POC is a **standalone, isolated component** designed to validate Konva's suitability before committing to a full migration.

---

## Project Setup

### 1. Install Dependencies

```bash
npm install konva react-konva
npm install --save-dev @types/konva
```

### 2. Create Directory Structure

```bash
mkdir -p client/src/modules/map-editor-poc/{hooks,components,utils,types,constants}
```

### 3. Create Entry Point

Create `client/src/modules/map-editor-poc/index.ts`:
```typescript
export { KonvaMapEditorPOC } from './KonvaMapEditorPOC';
export type * from './types/konva.types';
```

---

## Core Types Definition

### File: `types/konva.types.ts`

```typescript
// Shape geometry types
export interface POCRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface POCPolygon {
  points: Array<{ x: number; y: number }>;
}

export type POCGeometry = POCRectangle | POCPolygon;

// Shape style
export interface POCShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

// Shape model
export interface POCShape {
  id: string;
  type: 'rectangle' | 'polygon';
  category: 'interactive' | 'collision';
  geometry: POCGeometry;
  style: POCShapeStyle;
  metadata: {
    name?: string;
    description?: string;
    [key: string]: any;
  };
}

// Selection state
export interface POCSelection {
  selectedIds: string[];
  mode: 'single' | 'multi';
}

// Viewport state
export interface POCViewport {
  zoom: number;
  pan: { x: number; y: number };
}

// Grid configuration
export interface POCGrid {
  visible: boolean;
  spacing: number;
  snap: boolean;
  opacity: number;
}

// Tool types
export type POCTool = 'select' | 'draw-rect' | 'draw-polygon' | 'pan' | 'edit-polygon';

// History state
export interface POCHistory {
  past: POCMapState[];
  future: POCMapState[];
}

// Main state
export interface POCMapState {
  shapes: {
    interactive: POCShape[];
    collision: POCShape[];
  };
  selection: POCSelection;
  viewport: POCViewport;
  grid: POCGrid;
  tool: POCTool;
  history: POCHistory;
  backgroundImage?: {
    url: string;
    width: number;
    height: number;
  };
}

// Polygon drawing state
export interface POCPolygonDrawingState {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;
  category: 'interactive' | 'collision';
}

// Rectangle drawing state
export interface POCRectDrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number } | null;
  currentRect: POCRectangle | null;
  category: 'interactive' | 'collision';
}
```

---

## Constants

### File: `constants/konvaConstants.ts`

```typescript
export const POC_CONSTANTS = {
  // Canvas dimensions
  DEFAULT_WIDTH: 1920,
  DEFAULT_HEIGHT: 1080,
  
  // Zoom constraints
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 4.0,
  ZOOM_STEP: 0.1,
  ZOOM_WHEEL_SENSITIVITY: 0.999,
  
  // Grid
  DEFAULT_GRID_SPACING: 32,
  GRID_COLOR: '#cccccc',
  GRID_OPACITY: 0.3,
  
  // Shapes
  MIN_RECT_SIZE: 10,
  MIN_POLYGON_POINTS: 3,
  
  // Selection
  SELECTION_STROKE_COLOR: '#00aaff',
  SELECTION_STROKE_WIDTH: 2,
  
  // Interactive areas
  INTERACTIVE_FILL: 'rgba(0, 255, 0, 0.3)',
  INTERACTIVE_STROKE: '#00ff00',
  
  // Collision areas
  COLLISION_FILL: 'rgba(255, 0, 0, 0.3)',
  COLLISION_STROKE: '#ff0000',
  
  // Polygon editing
  VERTEX_RADIUS: 6,
  VERTEX_FILL: '#ffffff',
  VERTEX_STROKE: '#0000ff',
  VERTEX_STROKE_WIDTH: 2,
  
  // Performance
  HISTORY_MAX_SIZE: 50,
  
  // Layer names
  LAYERS: {
    BACKGROUND: 'background',
    GRID: 'grid',
    COLLISION: 'collision',
    INTERACTIVE: 'interactive',
    SELECTION: 'selection',
    EDITING: 'editing'
  }
};

export const POC_STYLES = {
  interactive: {
    fill: POC_CONSTANTS.INTERACTIVE_FILL,
    stroke: POC_CONSTANTS.INTERACTIVE_STROKE,
    strokeWidth: 2,
    opacity: 1
  },
  collision: {
    fill: POC_CONSTANTS.COLLISION_FILL,
    stroke: POC_CONSTANTS.COLLISION_STROKE,
    strokeWidth: 2,
    opacity: 1
  },
  selected: {
    stroke: POC_CONSTANTS.SELECTION_STROKE_COLOR,
    strokeWidth: POC_CONSTANTS.SELECTION_STROKE_WIDTH
  }
};
```

---

## Utility Functions

### File: `utils/konvaCoordinates.ts`

```typescript
import { POCViewport } from '../types/konva.types';

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: POCViewport
): { x: number; y: number } {
  return {
    x: (screenX - viewport.pan.x) / viewport.zoom,
    y: (screenY - viewport.pan.y) / viewport.zoom
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: POCViewport
): { x: number; y: number } {
  return {
    x: worldX * viewport.zoom + viewport.pan.x,
    y: worldY * viewport.zoom + viewport.pan.y
  };
}

/**
 * Snap point to grid
 */
export function snapToGrid(
  x: number,
  y: number,
  gridSpacing: number,
  enabled: boolean
): { x: number; y: number } {
  if (!enabled || gridSpacing <= 0) {
    return { x, y };
  }
  
  return {
    x: Math.round(x / gridSpacing) * gridSpacing,
    y: Math.round(y / gridSpacing) * gridSpacing
  };
}

/**
 * Calculate distance between two points
 */
export function distance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if point is inside rectangle
 */
export function isPointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
```

### File: `utils/konvaShapeFactory.ts`

```typescript
import { POCShape, POCRectangle, POCPolygon } from '../types/konva.types';
import { POC_STYLES } from '../constants/konvaConstants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a rectangle shape
 */
export function createRectangleShape(
  rect: POCRectangle,
  category: 'interactive' | 'collision',
  metadata?: Record<string, any>
): POCShape {
  return {
    id: uuidv4(),
    type: 'rectangle',
    category,
    geometry: rect,
    style: POC_STYLES[category],
    metadata: metadata || {}
  };
}

/**
 * Create a polygon shape
 */
export function createPolygonShape(
  points: Array<{ x: number; y: number }>,
  category: 'interactive' | 'collision',
  metadata?: Record<string, any>
): POCShape {
  return {
    id: uuidv4(),
    type: 'polygon',
    category,
    geometry: { points },
    style: POC_STYLES[category],
    metadata: metadata || {}
  };
}

/**
 * Duplicate a shape with new ID
 */
export function duplicateShape(shape: POCShape, offset: { x: number; y: number }): POCShape {
  const newShape = { ...shape, id: uuidv4() };
  
  if (newShape.type === 'rectangle') {
    const rect = newShape.geometry as POCRectangle;
    newShape.geometry = {
      ...rect,
      x: rect.x + offset.x,
      y: rect.y + offset.y
    };
  } else if (newShape.type === 'polygon') {
    const poly = newShape.geometry as POCPolygon;
    newShape.geometry = {
      points: poly.points.map(p => ({
        x: p.x + offset.x,
        y: p.y + offset.y
      }))
    };
  }
  
  return newShape;
}
```

### File: `utils/konvaSerializer.ts`

```typescript
import { POCMapState } from '../types/konva.types';

/**
 * Serialize state to JSON
 */
export function serializeState(state: POCMapState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Deserialize state from JSON
 */
export function deserializeState(json: string): POCMapState {
  return JSON.parse(json);
}

/**
 * Create a deep copy of state (for history)
 */
export function cloneState(state: POCMapState): POCMapState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Compare two states for equality (shallow)
 */
export function statesEqual(state1: POCMapState, state2: POCMapState): boolean {
  return JSON.stringify(state1) === JSON.stringify(state2);
}
```

---

## Hook: Canvas Initialization

### File: `hooks/useKonvaCanvas.ts`

```typescript
import { useRef, useEffect, useState } from 'react';
import Konva from 'konva';

export interface UseKonvaCanvasOptions {
  width: number;
  height: number;
  onStageReady?: (stage: Konva.Stage) => void;
}

export function useKonvaCanvas(options: UseKonvaCanvasOptions) {
  const { width, height, onStageReady } = options;
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (containerRef.current && !stageRef.current) {
      const stage = new Konva.Stage({
        container: containerRef.current,
        width,
        height
      });

      stageRef.current = stage;
      setIsReady(true);

      if (onStageReady) {
        onStageReady(stage);
      }
    }

    return () => {
      if (stageRef.current) {
        stageRef.current.destroy();
        stageRef.current = null;
      }
    };
  }, [width, height, onStageReady]);

  return {
    containerRef,
    stageRef,
    isReady
  };
}
```

---

## Hook: Zoom Controls

### File: `hooks/useKonvaZoom.ts`

```typescript
import { useCallback } from 'react';
import { POCViewport } from '../types/konva.types';
import { POC_CONSTANTS } from '../constants/konvaConstants';

export interface UseKonvaZoomOptions {
  viewport: POCViewport;
  onViewportChange: (viewport: POCViewport) => void;
}

export function useKonvaZoom(options: UseKonvaZoomOptions) {
  const { viewport, onViewportChange } = options;

  const zoomIn = useCallback(() => {
    const newZoom = Math.min(
      viewport.zoom + POC_CONSTANTS.ZOOM_STEP,
      POC_CONSTANTS.MAX_ZOOM
    );
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [viewport, onViewportChange]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(
      viewport.zoom - POC_CONSTANTS.ZOOM_STEP,
      POC_CONSTANTS.MIN_ZOOM
    );
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [viewport, onViewportChange]);

  const zoomToPoint = useCallback(
    (point: { x: number; y: number }, delta: number) => {
      const oldZoom = viewport.zoom;
      let newZoom = oldZoom * Math.pow(POC_CONSTANTS.ZOOM_WHEEL_SENSITIVITY, delta);
      newZoom = Math.max(POC_CONSTANTS.MIN_ZOOM, Math.min(newZoom, POC_CONSTANTS.MAX_ZOOM));

      // Calculate new pan to keep point under cursor
      const mousePointTo = {
        x: (point.x - viewport.pan.x) / oldZoom,
        y: (point.y - viewport.pan.y) / oldZoom
      };

      const newPan = {
        x: point.x - mousePointTo.x * newZoom,
        y: point.y - mousePointTo.y * newZoom
      };

      onViewportChange({ zoom: newZoom, pan: newPan });
    },
    [viewport, onViewportChange]
  );

  const setZoom = useCallback(
    (zoom: number) => {
      const clampedZoom = Math.max(
        POC_CONSTANTS.MIN_ZOOM,
        Math.min(zoom, POC_CONSTANTS.MAX_ZOOM)
      );
      onViewportChange({ ...viewport, zoom: clampedZoom });
    },
    [viewport, onViewportChange]
  );

  return {
    zoomIn,
    zoomOut,
    zoomToPoint,
    setZoom,
    canZoomIn: viewport.zoom < POC_CONSTANTS.MAX_ZOOM,
    canZoomOut: viewport.zoom > POC_CONSTANTS.MIN_ZOOM
  };
}
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Setup project structure
- [ ] Install dependencies
- [ ] Create types, constants, utilities
- [ ] Implement `useKonvaCanvas` hook
- [ ] Implement `useKonvaZoom` hook
- [ ] Implement `useKonvaPan` hook
- [ ] Create basic `KonvaMapEditorPOC` component
- [ ] Render static grid
- [ ] Test zoom functionality

### Week 2: Drawing Tools
- [ ] Implement `useKonvaRectDrawing` hook
- [ ] Implement `useKonvaPolygonDrawing` hook
- [ ] Implement `useKonvaSelection` hook
- [ ] Create `KonvaShapes` component
- [ ] Test rectangle drawing
- [ ] Test polygon drawing
- [ ] Test selection

### Week 3: Editing & History
- [ ] Implement `useKonvaTransform` hook (move/resize)
- [ ] Implement `useKonvaPolygonEditor` hook (vertex editing)
- [ ] Implement `useKonvaHistory` hook (undo/redo)
- [ ] Create `KonvaPolygonEditor` component
- [ ] Create `KonvaTransformer` component
- [ ] Test all editing operations
- [ ] Test undo/redo

### Week 4: Polish & Testing
- [ ] Implement `useKonvaLayers` hook
- [ ] Add background image support
- [ ] Implement duplicate functionality
- [ ] Implement delete functionality
- [ ] Performance testing (100, 500, 1000 shapes)
- [ ] Side-by-side comparison with Fabric.js
- [ ] Create evaluation report

---

## Testing Strategy

### Manual Testing
1. Create test scenes with varying complexity
2. Test all tools at different zoom levels
3. Test edge cases (minimum sizes, overlapping shapes, etc.)
4. Test keyboard shortcuts
5. Test performance with many shapes

### Automated Testing
1. Unit tests for utilities (coordinates, serialization, etc.)
2. Integration tests for hooks
3. Snapshot tests for rendered output
4. Performance benchmarks

### Comparison Testing
1. Create identical scenes in Fabric.js and Konva
2. Compare visual output
3. Compare performance metrics
4. Document differences

---

## Next Steps

1. Review this guide with the team
2. Assign developer(s) to POC
3. Create POC branch: `feature/konva-poc`
4. Begin Week 1 implementation
5. Weekly progress reviews
6. Week 5: Evaluation and decision

---

**Document Version:** 1.0  
**Date:** 2025-10-28  
**Status:** DRAFT - Implementation Guide

