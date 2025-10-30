/**
 * Konva Map Editor POC - Type Definitions
 * Minimal types for Week 1 POC
 */

// Viewport state
export interface POCViewport {
  zoom: number;
  pan: {
    x: number;
    y: number;
  };
}

// Grid configuration
export interface POCGrid {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
}

// Tool types
export type POCTool = 'select' | 'pan' | 'rect' | 'polygon';

// Shape geometry
export interface POCRectGeometry {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface POCPolygonGeometry {
  type: 'polygon';
  points: number[]; // [x1, y1, x2, y2, ...]
}

export type POCGeometry = POCRectGeometry | POCPolygonGeometry;

// Shape category
export type POCShapeCategory = 'collision' | 'interactive';

// Shape style
export interface POCShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

// Shape definition
export interface POCShape {
  id: string;
  category: POCShapeCategory;
  geometry: POCGeometry;
  style: POCShapeStyle;
  metadata: Record<string, any>;
}

// Main POC state
export interface POCState {
  shapes: {
    collision: POCShape[];
    interactive: POCShape[];
  };
  viewport: POCViewport;
  grid: POCGrid;
  tool: POCTool;
  selectedIds: string[];
}

