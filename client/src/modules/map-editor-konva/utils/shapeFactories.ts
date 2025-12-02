/**
 * Konva Map Editor - Shape Factory Utilities
 *
 * Factory functions for creating shapes with proper defaults, validation, and ID generation.
 * All shapes are created with consistent structure and styling.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Shape,
  ShapeCategory,
  ShapeStyle,
  ShapeMetadata,
  PolygonGeometry,
  RectangleGeometry,
  ImageGeometry,
  CreatePolygonParams,
  CreateRectangleParams,
  CreateImageParams,
  CreateShapeParams,
} from '../types';
import { COLLISION_STYLE, INTERACTIVE_STYLE } from '../constants/konvaConstants';

// ============================================================================
// STYLE HELPERS
// ============================================================================

/**
 * Get default style for a shape category
 */
function getDefaultStyle(category: ShapeCategory): ShapeStyle {
  if (category === 'collision') {
    return { ...COLLISION_STYLE };
  } else if (category === 'asset') {
    // Assets (images) have minimal styling - mostly transparent
    return {
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
      opacity: 1,
    };
  }
  return { ...INTERACTIVE_STYLE };
}

/**
 * Merge custom style with defaults
 */
function mergeStyle(category: ShapeCategory, customStyle?: Partial<ShapeStyle>): ShapeStyle {
  const defaultStyle = getDefaultStyle(category);
  return customStyle ? { ...defaultStyle, ...customStyle } : defaultStyle;
}

// ============================================================================
// METADATA HELPERS
// ============================================================================

/**
 * Create default metadata with timestamps
 */
function createDefaultMetadata(customMetadata?: Partial<ShapeMetadata>): ShapeMetadata {
  const now = new Date();
  return {
    createdAt: now,
    modifiedAt: now,
    ...customMetadata,
  };
}

// ============================================================================
// POLYGON FACTORIES
// ============================================================================

/**
 * Create a polygon shape from vertices
 *
 * @param params - Polygon creation parameters
 * @returns Complete polygon shape
 *
 * @example
 * ```typescript
 * const polygon = createPolygonShape({
 *   vertices: [
 *     { x: 0, y: 0 },
 *     { x: 100, y: 0 },
 *     { x: 100, y: 100 },
 *     { x: 0, y: 100 },
 *   ],
 *   category: 'collision',
 *   name: 'Wall Section',
 * });
 * ```
 */
export function createPolygonShape(params: CreatePolygonParams): Shape {
  const { vertices, category, name, description, style: customStyle } = params;

  // Convert vertices to flat array format [x1, y1, x2, y2, ...]
  const points: number[] = [];
  vertices.forEach((vertex) => {
    points.push(vertex.x, vertex.y);
  });

  const geometry: PolygonGeometry = {
    type: 'polygon',
    points,
  };

  const metadata = createDefaultMetadata({
    name,
    description,
  });

  return {
    id: uuidv4(),
    category,
    geometry,
    style: mergeStyle(category, customStyle),
    metadata,
  };
}

/**
 * Create a polygon shape from flat points array
 *
 * @param points - Flat array of coordinates [x1, y1, x2, y2, ...]
 * @param category - Shape category
 * @param name - Optional name
 * @param customStyle - Optional custom style
 * @returns Complete polygon shape
 *
 * @example
 * ```typescript
 * const polygon = createPolygonFromPoints(
 *   [0, 0, 100, 0, 100, 100, 0, 100],
 *   'collision',
 *   'Wall'
 * );
 * ```
 */
export function createPolygonFromPoints(
  points: number[],
  category: ShapeCategory,
  name?: string,
  customStyle?: Partial<ShapeStyle>
): Shape {
  const geometry: PolygonGeometry = {
    type: 'polygon',
    points: [...points], // Create copy
  };

  const metadata = createDefaultMetadata({ name });

  return {
    id: uuidv4(),
    category,
    geometry,
    style: mergeStyle(category, customStyle),
    metadata,
  };
}

// ============================================================================
// RECTANGLE FACTORIES
// ============================================================================

/**
 * Create a rectangle shape
 *
 * @param params - Rectangle creation parameters
 * @returns Complete rectangle shape
 *
 * @example
 * ```typescript
 * const rect = createRectangleShape({
 *   x: 100,
 *   y: 100,
 *   width: 200,
 *   height: 150,
 *   category: 'interactive',
 *   name: 'Meeting Room',
 * });
 * ```
 */
export function createRectangleShape(params: CreateRectangleParams): Shape {
  const { x, y, width, height, category, name, description, style: customStyle } = params;

  const geometry: RectangleGeometry = {
    type: 'rectangle',
    x,
    y,
    width,
    height,
  };

  const metadata = createDefaultMetadata({
    name,
    description,
  });

  return {
    id: uuidv4(),
    category,
    geometry,
    style: mergeStyle(category, customStyle),
    metadata,
  };
}

// ============================================================================
// IMAGE FACTORIES
// ============================================================================

/**
 * Create an image shape
 *
 * @param params - Image creation parameters
 * @returns Complete image shape
 *
 * @example
 * ```typescript
 * const imageShape = createImageShape({
 *   x: 100,
 *   y: 100,
 *   width: 200,
 *   height: 200,
 *   imageData: 'data:image/png;base64,...',
 *   fileName: 'my-sprite.png',
 *   name: 'Custom Sprite',
 * });
 * ```
 */
export function createImageShape(params: CreateImageParams): Shape {
  const { x, y, width, height, imageData, fileName, name, description, style: customStyle } = params;

  // Validate image data
  if (!imageData || !imageData.startsWith('data:image/')) {
    throw new Error('Invalid image data: must be a base64 data URL');
  }

  // Validate dimensions
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid dimensions: width and height must be positive');
  }

  if (width > 800 || height > 800) {
    throw new Error('Invalid dimensions: maximum size is 800x800 pixels');
  }

  const geometry: ImageGeometry = {
    type: 'image',
    x,
    y,
    width,
    height,
    imageData,
    fileName,
  };

  const metadata = createDefaultMetadata({
    name: name || fileName || 'Custom Asset',
    description,
  });

  return {
    id: uuidv4(),
    category: 'asset',
    geometry,
    style: mergeStyle('asset', customStyle),
    metadata,
  };
}

// ============================================================================
// GENERIC FACTORY
// ============================================================================

/**
 * Create a shape from generic parameters
 *
 * @param params - Shape creation parameters
 * @returns Complete shape
 */
export function createShape(params: CreateShapeParams): Shape {
  const { category, geometry, style: customStyle, metadata: customMetadata } = params;

  return {
    id: uuidv4(),
    category,
    geometry,
    style: mergeStyle(category, customStyle),
    metadata: createDefaultMetadata(customMetadata),
  };
}

// ============================================================================
// SHAPE DUPLICATION
// ============================================================================

/**
 * Duplicate a shape with a new ID and optional offset
 *
 * @param shape - Shape to duplicate
 * @param offset - Optional offset to apply
 * @returns Duplicated shape with new ID
 *
 * @example
 * ```typescript
 * const duplicate = duplicateShape(originalShape, { x: 20, y: 20 });
 * ```
 */
export function duplicateShape(
  shape: Shape,
  offset: { x: number; y: number } = { x: 20, y: 20 }
): Shape {
  const newShape: Shape = {
    ...shape,
    id: uuidv4(),
    metadata: {
      ...shape.metadata,
      createdAt: new Date(),
      modifiedAt: new Date(),
    },
  };

  // Apply offset based on geometry type
  if (newShape.geometry.type === 'polygon') {
    const points = [...newShape.geometry.points];
    for (let i = 0; i < points.length; i += 2) {
      points[i] += offset.x;
      points[i + 1] += offset.y;
    }
    newShape.geometry = {
      ...newShape.geometry,
      points,
    };
  } else if (newShape.geometry.type === 'rectangle') {
    newShape.geometry = {
      ...newShape.geometry,
      x: newShape.geometry.x + offset.x,
      y: newShape.geometry.y + offset.y,
    };
  }

  return newShape;
}

// ============================================================================
// SHAPE CLONING
// ============================================================================

/**
 * Clone a shape (same ID, deep copy)
 *
 * @param shape - Shape to clone
 * @returns Cloned shape
 */
export function cloneShape(shape: Shape): Shape {
  return {
    ...shape,
    geometry: { ...shape.geometry },
    style: { ...shape.style },
    metadata: { ...shape.metadata },
  };
}

// ============================================================================
// BATCH CREATION
// ============================================================================

/**
 * Create multiple polygon shapes from an array of vertex arrays
 *
 * @param polygonsData - Array of polygon data
 * @param category - Shape category for all polygons
 * @returns Array of polygon shapes
 */
export function createPolygonShapes(
  polygonsData: Array<{ vertices: Array<{ x: number; y: number }>; name?: string }>,
  category: ShapeCategory
): Shape[] {
  return polygonsData.map((data) =>
    createPolygonShape({
      vertices: data.vertices,
      category,
      name: data.name,
    })
  );
}

/**
 * Create multiple rectangle shapes from an array of rectangle data
 *
 * @param rectanglesData - Array of rectangle data
 * @param category - Shape category for all rectangles
 * @returns Array of rectangle shapes
 */
export function createRectangleShapes(
  rectanglesData: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
  }>,
  category: ShapeCategory
): Shape[] {
  return rectanglesData.map((data) =>
    createRectangleShape({
      ...data,
      category,
    })
  );
}


// ============================================================================
// SHAPE GROUPING
// ============================================================================

/**
 * Group multiple shapes together by assigning them a shared group ID
 *
 * @param shapes - Shapes to group
 * @param groupId - Optional group ID (generates new UUID if not provided)
 * @returns Shapes with group ID assigned
 *
 * @example
 * ```typescript
 * const grouped = groupShapes([shape1, shape2, shape3]);
 * ```
 */
export function groupShapes(
  shapes: Shape[],
  groupId?: string
): Shape[] {
  const id = groupId || uuidv4();
  return shapes.map(shape => ({
    ...shape,
    metadata: {
      ...shape.metadata,
      groupId: id,
    },
  }));
}

/**
 * Ungroup shapes by removing their group ID
 *
 * @param shapes - Shapes to ungroup
 * @returns Shapes with group ID removed
 *
 * @example
 * ```typescript
 * const ungrouped = ungroupShapes([shape1, shape2, shape3]);
 * ```
 */
export function ungroupShapes(shapes: Shape[]): Shape[] {
  return shapes.map(shape => ({
    ...shape,
    metadata: {
      ...shape.metadata,
      groupId: undefined,
    },
  }));
}

/**
 * Get all shapes in the same group as the given shape
 *
 * @param shape - Shape to find group members for
 * @param allShapes - All shapes to search through
 * @returns Array of shapes in the same group (including the input shape)
 *
 * @example
 * ```typescript
 * const groupMembers = getGroupMembers(selectedShape, allShapes);
 * ```
 */
export function getGroupMembers(
  shape: Shape,
  allShapes: Shape[]
): Shape[] {
  if (!shape.metadata.groupId) {
    return [shape];
  }

  return allShapes.filter(
    s => s.metadata.groupId === shape.metadata.groupId
  );
}

/**
 * Check if a shape is part of a group
 *
 * @param shape - Shape to check
 * @returns True if shape is grouped
 */
export function isGrouped(shape: Shape): boolean {
  return !!shape.metadata.groupId;
}
