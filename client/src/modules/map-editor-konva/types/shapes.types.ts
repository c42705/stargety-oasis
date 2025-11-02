/**
 * Konva Map Editor - Shape Type Definitions
 * 
 * Detailed type definitions for shapes, including integration with
 * existing MapDataContext types for backward compatibility.
 */

import { InteractiveArea, ImpassableArea } from '../../../shared/MapDataContext';
import { Shape, ShapeGeometry, ShapeStyle, ShapeMetadata, ShapeCategory } from './konva.types';

// ============================================================================
// SHAPE CREATION
// ============================================================================

/**
 * Parameters for creating a new shape
 */
export interface CreateShapeParams {
  /** Shape category */
  category: ShapeCategory;
  /** Geometric definition */
  geometry: ShapeGeometry;
  /** Optional custom style (uses defaults if not provided) */
  style?: Partial<ShapeStyle>;
  /** Optional metadata */
  metadata?: Partial<ShapeMetadata>;
}

/**
 * Parameters for creating a polygon shape
 */
export interface CreatePolygonParams {
  /** Polygon vertices as coordinate pairs */
  vertices: Array<{ x: number; y: number }>;
  /** Shape category */
  category: ShapeCategory;
  /** Optional name */
  name?: string;
  /** Optional description */
  description?: string;
  /** Optional custom style */
  style?: Partial<ShapeStyle>;
}

/**
 * Parameters for creating a rectangle shape
 */
export interface CreateRectangleParams {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Shape category */
  category: ShapeCategory;
  /** Optional name */
  name?: string;
  /** Optional description */
  description?: string;
  /** Optional custom style */
  style?: Partial<ShapeStyle>;
}

// ============================================================================
// SHAPE UPDATES
// ============================================================================

/**
 * Parameters for updating a shape
 */
export interface UpdateShapeParams {
  /** Shape ID */
  id: string;
  /** Geometry updates */
  geometry?: Partial<ShapeGeometry>;
  /** Style updates */
  style?: Partial<ShapeStyle>;
  /** Metadata updates */
  metadata?: Partial<ShapeMetadata>;
}

/**
 * Parameters for moving a shape
 */
export interface MoveShapeParams {
  /** Shape ID */
  id: string;
  /** Delta X */
  dx: number;
  /** Delta Y */
  dy: number;
}

/**
 * Parameters for resizing a shape
 */
export interface ResizeShapeParams {
  /** Shape ID */
  id: string;
  /** New width (for rectangles) */
  width?: number;
  /** New height (for rectangles) */
  height?: number;
  /** Scale X factor */
  scaleX?: number;
  /** Scale Y factor */
  scaleY?: number;
}

/**
 * Parameters for rotating a shape
 */
export interface RotateShapeParams {
  /** Shape ID */
  id: string;
  /** Rotation angle in degrees */
  rotation: number;
}

// ============================================================================
// POLYGON VERTEX EDITING
// ============================================================================

/**
 * Polygon vertex handle
 */
export interface VertexHandle {
  /** Vertex index in the points array */
  index: number;
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Whether this is the origin vertex (first point) */
  isOrigin: boolean;
}

/**
 * Polygon edge midpoint handle (for adding vertices)
 */
export interface EdgeHandle {
  /** Index of the edge (between vertex[i] and vertex[i+1]) */
  edgeIndex: number;
  /** X coordinate of midpoint */
  x: number;
  /** Y coordinate of midpoint */
  y: number;
}

/**
 * Polygon editing state
 */
export interface PolygonEditState {
  /** Shape being edited */
  shapeId: string | null;
  /** Vertex handles */
  vertexHandles: VertexHandle[];
  /** Edge handles */
  edgeHandles: EdgeHandle[];
  /** Currently dragging vertex index */
  draggingVertexIndex: number | null;
  /** Whether hovering over a handle */
  hoveringHandleIndex: number | null;
}

// ============================================================================
// SHAPE VALIDATION
// ============================================================================

/**
 * Shape validation result
 */
export interface ShapeValidationResult {
  /** Whether the shape is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Polygon validation options
 */
export interface PolygonValidationOptions {
  /** Minimum number of vertices */
  minVertices?: number;
  /** Minimum area in square pixels */
  minArea?: number;
  /** Check for self-intersection */
  checkSelfIntersection?: boolean;
  /** Check for clockwise/counter-clockwise winding */
  checkWinding?: boolean;
}

/**
 * Rectangle validation options
 */
export interface RectangleValidationOptions {
  /** Minimum width in pixels */
  minWidth?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
}

// ============================================================================
// SHAPE CONVERSION (MapDataContext Integration)
// ============================================================================

/**
 * Convert Konva shape to InteractiveArea (for MapDataContext)
 */
export interface ShapeToInteractiveAreaParams {
  shape: Shape;
}

/**
 * Convert Konva shape to ImpassableArea (for MapDataContext)
 */
export interface ShapeToImpassableAreaParams {
  shape: Shape;
}

/**
 * Convert InteractiveArea to Konva shape
 */
export interface InteractiveAreaToShapeParams {
  area: InteractiveArea;
}

/**
 * Convert ImpassableArea to Konva shape
 */
export interface ImpassableAreaToShapeParams {
  area: ImpassableArea;
}

// ============================================================================
// SHAPE QUERIES
// ============================================================================

/**
 * Query parameters for finding shapes
 */
export interface ShapeQuery {
  /** Filter by category */
  category?: ShapeCategory;
  /** Filter by IDs */
  ids?: string[];
  /** Filter by bounding box intersection */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Filter by point containment */
  containsPoint?: {
    x: number;
    y: number;
  };
  /** Filter by metadata */
  metadata?: Partial<ShapeMetadata>;
}

/**
 * Shape query result
 */
export interface ShapeQueryResult {
  /** Matching shapes */
  shapes: Shape[];
  /** Total count */
  count: number;
}

// ============================================================================
// SHAPE BOUNDS
// ============================================================================

/**
 * Bounding box for a shape
 */
export interface ShapeBounds {
  /** Minimum X coordinate */
  minX: number;
  /** Minimum Y coordinate */
  minY: number;
  /** Maximum X coordinate */
  maxX: number;
  /** Maximum Y coordinate */
  maxY: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Center X */
  centerX: number;
  /** Center Y */
  centerY: number;
}

// ============================================================================
// SHAPE OPERATIONS
// ============================================================================

/**
 * Result of a shape operation
 */
export interface ShapeOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Resulting shape (if applicable) */
  shape?: Shape;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Batch shape operation
 */
export interface BatchShapeOperation {
  /** Operation type */
  type: 'create' | 'update' | 'delete';
  /** Shape ID (for update/delete) */
  id?: string;
  /** Shape data (for create/update) */
  data?: Partial<Shape>;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Individual results */
  results: ShapeOperationResult[];
  /** Overall errors */
  errors: string[];
}

// ============================================================================
// SHAPE SERIALIZATION
// ============================================================================

/**
 * Serialized shape (for storage/transmission)
 */
export interface SerializedShape {
  id: string;
  category: ShapeCategory;
  geometry: ShapeGeometry;
  style: ShapeStyle;
  metadata: ShapeMetadata;
  version: number;
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Include metadata */
  includeMetadata?: boolean;
  /** Include style */
  includeStyle?: boolean;
  /** Pretty print JSON */
  prettyPrint?: boolean;
  /** Version number */
  version?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for polygon geometry
 */
export function isPolygonGeometry(geometry: ShapeGeometry): geometry is import('./konva.types').PolygonGeometry {
  return geometry.type === 'polygon';
}

/**
 * Type guard for rectangle geometry
 */
export function isRectangleGeometry(geometry: ShapeGeometry): geometry is import('./konva.types').RectangleGeometry {
  return geometry.type === 'rectangle';
}

/**
 * Type guard for collision shape
 */
export function isCollisionShape(shape: Shape): boolean {
  return shape.category === 'collision';
}

/**
 * Type guard for interactive shape
 */
export function isInteractiveShape(shape: Shape): boolean {
  return shape.category === 'interactive';
}

