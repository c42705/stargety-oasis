/**
 * Konva Map Editor - MapDataContext Adapter
 * 
 * Adapter layer to integrate Konva editor with existing MapDataContext.
 * Handles conversion between Konva shapes and MapData format.
 */

import type { Shape, ShapeCategory } from '../types';
import type { InteractiveArea, ImpassableArea } from '../../../shared/MapDataContext';
import { isPolygonGeometry, isRectangleGeometry } from '../types';

// ============================================================================
// SHAPE TO MAPDATA CONVERSION
// ============================================================================

/**
 * Convert Konva shape to InteractiveArea
 * 
 * @param shape - Konva shape (must be rectangle geometry)
 * @returns InteractiveArea for MapDataContext
 * 
 * @throws Error if shape is not a rectangle
 */
export function shapeToInteractiveArea(shape: Shape): InteractiveArea {
  if (!isRectangleGeometry(shape.geometry)) {
    throw new Error('Interactive areas must be rectangles');
  }

  return {
    id: shape.id,
    name: shape.metadata.name || 'Unnamed Area',
    type: (shape.metadata.interactiveType as any) || 'custom',
    x: shape.geometry.x,
    y: shape.geometry.y,
    width: shape.geometry.width,
    height: shape.geometry.height,
    color: shape.style.fill || '#00ff00',
    description: shape.metadata.description || '',
  };
}

/**
 * Convert Konva shape to ImpassableArea
 * 
 * @param shape - Konva shape (can be rectangle or polygon)
 * @returns ImpassableArea for MapDataContext
 */
export function shapeToImpassableArea(shape: Shape): ImpassableArea {
  if (isRectangleGeometry(shape.geometry)) {
    // Rectangle impassable area
    return {
      id: shape.id,
      x: shape.geometry.x,
      y: shape.geometry.y,
      width: shape.geometry.width,
      height: shape.geometry.height,
      name: shape.metadata.name,
      type: 'rectangle',
      color: shape.style.fill,
    };
  } else if (isPolygonGeometry(shape.geometry)) {
    // Polygon impassable area
    // Convert flat points array to array of point objects
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < shape.geometry.points.length; i += 2) {
      points.push({
        x: shape.geometry.points[i],
        y: shape.geometry.points[i + 1],
      });
    }

    // Calculate bounding box for x, y, width, height (required fields)
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      id: shape.id,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      name: shape.metadata.name,
      type: 'impassable-polygon',
      points,
      color: shape.style.fill,
    };
  } else {
    throw new Error(`Unsupported geometry type: ${(shape.geometry as any).type}`);
  }
}

/**
 * Convert Konva shape to MapData format based on category
 * 
 * @param shape - Konva shape
 * @returns InteractiveArea or ImpassableArea
 */
export function shapeToMapData(shape: Shape): InteractiveArea | ImpassableArea {
  if (shape.category === 'interactive') {
    return shapeToInteractiveArea(shape);
  } else {
    return shapeToImpassableArea(shape);
  }
}

/**
 * Convert array of shapes to MapData format
 * 
 * @param shapes - Array of Konva shapes
 * @returns Object with interactiveAreas and impassableAreas arrays
 */
export function shapesToMapData(shapes: Shape[]): {
  interactiveAreas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
} {
  const interactiveAreas: InteractiveArea[] = [];
  const impassableAreas: ImpassableArea[] = [];

  shapes.forEach((shape) => {
    try {
      if (shape.category === 'interactive') {
        interactiveAreas.push(shapeToInteractiveArea(shape));
      } else if (shape.category === 'collision') {
        impassableAreas.push(shapeToImpassableArea(shape));
      }
    } catch (error) {
      console.error(`Failed to convert shape ${shape.id}:`, error);
    }
  });

  return { interactiveAreas, impassableAreas };
}

// ============================================================================
// MAPDATA TO SHAPE CONVERSION
// ============================================================================

/**
 * Convert InteractiveArea to Konva shape
 * 
 * @param area - InteractiveArea from MapDataContext
 * @returns Konva shape
 */
export function interactiveAreaToShape(area: InteractiveArea): Shape {
  return {
    id: area.id,
    category: 'interactive',
    geometry: {
      type: 'rectangle',
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
    },
    style: {
      fill: area.color || 'rgba(0, 255, 0, 0.3)',
      stroke: area.color || '#00ff00',
      strokeWidth: 2,
      opacity: 0.7,
    },
    metadata: {
      name: area.name,
      description: area.description,
      interactiveType: area.type,
      createdAt: new Date(),
      modifiedAt: new Date(),
    },
  };
}

/**
 * Convert ImpassableArea to Konva shape
 * 
 * @param area - ImpassableArea from MapDataContext
 * @returns Konva shape
 */
export function impassableAreaToShape(area: ImpassableArea): Shape {
  // Check if it's a polygon
  if (area.type === 'impassable-polygon' && area.points && area.points.length > 0) {
    // Convert points array to flat array
    const points: number[] = [];
    area.points.forEach((point) => {
      points.push(point.x, point.y);
    });

    return {
      id: area.id,
      category: 'collision',
      geometry: {
        type: 'polygon',
        points,
      },
      style: {
        fill: area.color || 'rgba(255, 0, 0, 0.3)',
        stroke: area.color || '#ff0000',
        strokeWidth: 2,
        opacity: 0.7,
      },
      metadata: {
        name: area.name,
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    };
  } else {
    // Rectangle impassable area
    return {
      id: area.id,
      category: 'collision',
      geometry: {
        type: 'rectangle',
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
      },
      style: {
        fill: area.color || 'rgba(255, 0, 0, 0.3)',
        stroke: area.color || '#ff0000',
        strokeWidth: 2,
        opacity: 0.7,
      },
      metadata: {
        name: area.name,
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    };
  }
}

/**
 * Convert MapData areas to Konva shapes
 * 
 * @param interactiveAreas - Array of InteractiveArea
 * @param impassableAreas - Array of ImpassableArea
 * @returns Array of Konva shapes
 */
export function mapDataToShapes(
  interactiveAreas: InteractiveArea[],
  impassableAreas: ImpassableArea[]
): Shape[] {
  const shapes: Shape[] = [];

  interactiveAreas.forEach((area) => {
    try {
      shapes.push(interactiveAreaToShape(area));
    } catch (error) {
      console.error(`Failed to convert interactive area ${area.id}:`, error);
    }
  });

  impassableAreas.forEach((area) => {
    try {
      shapes.push(impassableAreaToShape(area));
    } catch (error) {
      console.error(`Failed to convert impassable area ${area.id}:`, error);
    }
  });

  return shapes;
}

// ============================================================================
// CATEGORY FILTERING
// ============================================================================

/**
 * Filter shapes by category
 * 
 * @param shapes - Array of shapes
 * @param category - Category to filter by
 * @returns Filtered shapes
 */
export function filterShapesByCategory(shapes: Shape[], category: ShapeCategory): Shape[] {
  return shapes.filter((shape) => shape.category === category);
}

/**
 * Get interactive shapes only
 */
export function getInteractiveShapes(shapes: Shape[]): Shape[] {
  return filterShapesByCategory(shapes, 'interactive');
}

/**
 * Get collision shapes only
 */
export function getCollisionShapes(shapes: Shape[]): Shape[] {
  return filterShapesByCategory(shapes, 'collision');
}

// ============================================================================
// SYNC HELPERS
// ============================================================================

/**
 * Sync shapes with MapData
 * Updates only the shapes that have changed
 * 
 * @param currentShapes - Current shapes in editor
 * @param interactiveAreas - Interactive areas from MapData
 * @param impassableAreas - Impassable areas from MapData
 * @returns Updated shapes array
 */
export function syncShapesWithMapData(
  currentShapes: Shape[],
  interactiveAreas: InteractiveArea[],
  impassableAreas: ImpassableArea[]
): Shape[] {
  const newShapes = mapDataToShapes(interactiveAreas, impassableAreas);
  const currentShapeIds = new Set(currentShapes.map((s) => s.id));
  const newShapeIds = new Set(newShapes.map((s) => s.id));

  // Keep shapes that still exist in MapData
  const updatedShapes = currentShapes.filter((shape) => newShapeIds.has(shape.id));

  // Add new shapes from MapData
  newShapes.forEach((newShape) => {
    if (!currentShapeIds.has(newShape.id)) {
      updatedShapes.push(newShape);
    }
  });

  return updatedShapes;
}

