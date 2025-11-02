/**
 * Konva Map Editor - Core Type Definitions
 * 
 * Production-grade type definitions for the Konva-based map editor.
 * These types provide type safety and documentation for all editor features.
 */

import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';

// ============================================================================
// VIEWPORT & CAMERA
// ============================================================================

/**
 * Viewport state representing the current view of the canvas
 */
export interface Viewport {
  /** Current zoom level (1.0 = 100%, 0.5 = 50%, 2.0 = 200%) */
  zoom: number;
  /** Pan offset in screen coordinates */
  pan: {
    x: number;
    y: number;
  };
}

/**
 * Zoom configuration limits
 */
export interface ZoomConfig {
  min: number;
  max: number;
  step: number;
  wheelSensitivity: number;
}

// ============================================================================
// GRID CONFIGURATION
// ============================================================================

/**
 * Grid configuration for the canvas
 */
export interface GridConfig {
  /** Whether the grid is visible */
  visible: boolean;
  /** Grid cell size in pixels */
  spacing: number;
  /** Grid pattern type */
  pattern: 'dots' | 'lines';
  /** Grid color */
  color: string;
  /** Grid opacity (0-1) */
  opacity: number;
}

// ============================================================================
// TOOLS
// ============================================================================

/**
 * Available editor tools
 */
export type EditorTool = 
  | 'select'      // Selection and manipulation
  | 'pan'         // Canvas panning
  | 'polygon'     // Polygon drawing
  | 'rect'        // Rectangle drawing (if needed)
  | 'edit-vertex' // Polygon vertex editing
  | 'delete';     // Delete tool

/**
 * Tool state information
 */
export interface ToolState {
  /** Currently active tool */
  current: EditorTool;
  /** Previous tool (for returning after temporary tool use) */
  previous: EditorTool | null;
  /** Whether a tool operation is in progress */
  isActive: boolean;
}

// ============================================================================
// SHAPES - GEOMETRY
// ============================================================================

/**
 * Base geometry interface
 */
export interface BaseGeometry {
  type: string;
}

/**
 * Rectangle geometry
 */
export interface RectangleGeometry extends BaseGeometry {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // in degrees
  scaleX?: number;
  scaleY?: number;
}

/**
 * Polygon geometry
 * Points are stored as flat array: [x1, y1, x2, y2, ...]
 */
export interface PolygonGeometry extends BaseGeometry {
  type: 'polygon';
  /** Flat array of coordinates [x1, y1, x2, y2, ...] */
  points: number[];
  /** Position for transformation */
  x?: number;
  y?: number;
  rotation?: number; // in degrees
  scaleX?: number;
  scaleY?: number;
}

/**
 * Union type for all geometry types
 */
export type ShapeGeometry = RectangleGeometry | PolygonGeometry;

// ============================================================================
// SHAPES - STYLE
// ============================================================================

/**
 * Visual style for shapes
 */
export interface ShapeStyle {
  /** Fill color (hex or rgba) */
  fill: string;
  /** Stroke color (hex or rgba) */
  stroke: string;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Overall opacity (0-1) */
  opacity: number;
  /** Dash pattern for stroke (e.g., [5, 5] for dashed line) */
  dash?: number[];
}

// ============================================================================
// SHAPES - CATEGORIES
// ============================================================================

/**
 * Shape category determines behavior and styling
 */
export type ShapeCategory = 
  | 'collision'    // Impassable areas (collision detection)
  | 'interactive'; // Interactive areas (clickable zones)

// ============================================================================
// SHAPES - MAIN DEFINITION
// ============================================================================

/**
 * Complete shape definition
 */
export interface Shape {
  /** Unique identifier */
  id: string;
  /** Shape category */
  category: ShapeCategory;
  /** Geometric definition */
  geometry: ShapeGeometry;
  /** Visual styling */
  style: ShapeStyle;
  /** Additional metadata */
  metadata: ShapeMetadata;
}

/**
 * Shape metadata for additional information
 */
export interface ShapeMetadata {
  /** Display name */
  name?: string;
  /** Description */
  description?: string;
  /** Area type (for interactive areas) */
  areaType?: 'meeting-room' | 'presentation-hall' | 'coffee-corner' | 'game-zone' | 'custom';
  /** Creation timestamp */
  createdAt?: Date;
  /** Last modified timestamp */
  modifiedAt?: Date;
  /** Custom properties */
  [key: string]: any;
}

// ============================================================================
// SELECTION
// ============================================================================

/**
 * Selection state
 */
export interface SelectionState {
  /** IDs of selected shapes */
  selectedIds: string[];
  /** Whether multi-select mode is active (Ctrl held) */
  isMultiSelect: boolean;
  /** Selection rectangle (for drag-to-select) */
  selectionRect: SelectionRect | null;
}

/**
 * Selection rectangle for drag-to-select
 */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// HISTORY (UNDO/REDO)
// ============================================================================

/**
 * History state for undo/redo
 */
export interface HistoryState {
  /** Past states (for undo) */
  past: EditorSnapshot[];
  /** Future states (for redo) */
  future: EditorSnapshot[];
  /** Maximum history size */
  maxSize: number;
}

/**
 * Snapshot of editor state for history
 */
export interface EditorSnapshot {
  /** All shapes at this point in time */
  shapes: Shape[];
  /** Selected shape IDs */
  selectedIds: string[];
  /** Timestamp */
  timestamp: Date;
  /** Optional description of the change */
  description?: string;
}

// ============================================================================
// EDITOR STATE
// ============================================================================

/**
 * Complete editor state
 */
export interface EditorState {
  /** Viewport configuration */
  viewport: Viewport;
  /** Grid configuration */
  grid: GridConfig;
  /** All shapes in the editor */
  shapes: Shape[];
  /** Selection state */
  selection: SelectionState;
  /** Current tool */
  tool: ToolState;
  /** History for undo/redo */
  history: HistoryState;
  /** Background image URL */
  backgroundImage?: string;
  /** Background image dimensions */
  backgroundImageDimensions?: {
    width: number;
    height: number;
  };
  /** World dimensions */
  worldDimensions: {
    width: number;
    height: number;
  };
  /** Whether the editor is in preview mode (read-only) */
  isPreviewMode: boolean;
  /** Whether changes have been made since last save */
  isDirty: boolean;
}

// ============================================================================
// DRAWING STATE
// ============================================================================

/**
 * Polygon drawing state
 */
export interface PolygonDrawingState {
  /** Whether currently drawing */
  isDrawing: boolean;
  /** Vertices added so far */
  vertices: Array<{ x: number; y: number }>;
  /** Current preview point (follows cursor) */
  previewPoint: { x: number; y: number } | null;
  /** Whether hovering over the origin point (to close polygon) */
  isOriginHovered: boolean;
  /** Minimum vertices required */
  minVertices: number;
}

/**
 * Rectangle drawing state
 */
export interface RectangleDrawingState {
  /** Whether currently drawing */
  isDrawing: boolean;
  /** Start point */
  startPoint: { x: number; y: number } | null;
  /** Current point */
  currentPoint: { x: number; y: number } | null;
  /** Whether the size meets minimum requirements */
  isValidSize: boolean;
}

// ============================================================================
// TRANSFORMATION
// ============================================================================

/**
 * Transformation state for selected shapes
 */
export interface TransformState {
  /** Whether transformation is in progress */
  isTransforming: boolean;
  /** Type of transformation */
  transformType: 'move' | 'resize' | 'rotate' | null;
  /** Original shapes before transformation (for cancel) */
  originalShapes: Shape[];
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Custom event types for the editor
 */
export type EditorEventType =
  | 'shape:created'
  | 'shape:updated'
  | 'shape:deleted'
  | 'selection:changed'
  | 'viewport:changed'
  | 'tool:changed'
  | 'history:changed';

/**
 * Event payload for editor events
 */
export interface EditorEvent<T = any> {
  type: EditorEventType;
  payload: T;
  timestamp: Date;
}

// ============================================================================
// KONVA REFERENCES
// ============================================================================

/**
 * Konva stage reference
 */
export type StageRef = Konva.Stage | null;

/**
 * Konva layer reference
 */
export type LayerRef = Konva.Layer | null;

/**
 * Konva event object (re-export for convenience)
 */
export type { KonvaEventObject };

