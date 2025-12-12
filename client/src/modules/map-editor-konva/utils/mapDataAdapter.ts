/**
 * Konva Map Editor - MapDataContext Adapter
 * 
 * Adapter layer to integrate Konva editor with existing MapDataContext.
 * Handles conversion between Konva shapes and MapData format.
 */

import type { Shape, ShapeCategory } from '../types';
import type {
  InteractiveArea,
  ImpassableArea,
  Asset,
  InteractiveAreaActionType,
  InteractiveAreaActionConfig,
} from '../../../shared/MapDataContext';
import { getColorForActionType } from '../../../shared/MapDataContext';
import { isPolygonGeometry, isRectangleGeometry, isImageGeometry } from '../types';

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

  // Extract action configuration from shape metadata
  const actionType = (shape.metadata.actionType as InteractiveAreaActionType) || 'none';
  const actionConfig = (shape.metadata.actionConfig as InteractiveAreaActionConfig) || null;

  return {
    id: shape.id,
    name: shape.metadata.name || 'Unnamed Area',
    x: shape.geometry.x,
    y: shape.geometry.y,
    width: shape.geometry.width,
    height: shape.geometry.height,
    color: shape.style.fill || '#00ff00',
    description: shape.metadata.description || '',
    actionType,
    actionConfig,
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
 * Convert Konva shape to Asset
 *
 * @param shape - Konva shape (must be image geometry)
 * @returns Asset for MapDataContext
 */
export function shapeToAsset(shape: Shape): Asset {
  if (!isImageGeometry(shape.geometry)) {
    throw new Error('Assets must be image geometry');
  }

  return {
    id: shape.id,
    x: shape.geometry.x,
    y: shape.geometry.y,
    width: shape.geometry.width,
    height: shape.geometry.height,
    imageData: shape.geometry.imageData,
    fileName: shape.geometry.fileName,
    rotation: shape.geometry.rotation,
    scaleX: shape.geometry.scaleX,
    scaleY: shape.geometry.scaleY,
  };
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
 * @returns Object with interactiveAreas, impassableAreas, and assets arrays
 */
export function shapesToMapData(shapes: Shape[]): {
  interactiveAreas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
  assets: Asset[];
} {
  const interactiveAreas: InteractiveArea[] = [];
  const impassableAreas: ImpassableArea[] = [];
  const assets: Asset[] = [];

  shapes.forEach((shape) => {
    try {
      if (shape.category === 'interactive') {
        interactiveAreas.push(shapeToInteractiveArea(shape));
      } else if (shape.category === 'collision') {
        impassableAreas.push(shapeToImpassableArea(shape));
      } else if (shape.category === 'asset') {
        assets.push(shapeToAsset(shape));
      }
    } catch (error) {
      console.error(`Failed to convert shape ${shape.id}:`, error);
    }
  });

  return { interactiveAreas, impassableAreas, assets };
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
  // Auto-derive color from action type if not explicitly set
  const derivedColor = getColorForActionType(area.actionType || 'none');
  const areaColor = area.color || derivedColor;

  // Check if it's a polygon shape
  if (area.shapeType === 'polygon' && area.points && area.points.length > 0) {
    // Convert points array to flat array for Konva Line
    const points: number[] = [];
    area.points.forEach((point) => {
      points.push(point.x, point.y);
    });

    return {
      id: area.id,
      category: 'interactive',
      geometry: {
        type: 'polygon',
        points,
      },
      style: {
        fill: areaColor,
        stroke: areaColor,
        strokeWidth: 2,
        opacity: 0.7,
      },
      metadata: {
        name: area.name,
        description: area.description,
        actionType: area.actionType,
        actionConfig: area.actionConfig,
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    };
  }

  // Default: Rectangle shape
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
      fill: areaColor,
      stroke: areaColor,
      strokeWidth: 2,
      opacity: 0.7,
    },
    metadata: {
      name: area.name,
      description: area.description,
      actionType: area.actionType,
      actionConfig: area.actionConfig,
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
 * Convert Asset to Konva shape
 *
 * @param asset - Asset from MapDataContext
 * @returns Konva shape
 */
export function assetToShape(asset: Asset): Shape {
  return {
    id: asset.id,
    category: 'asset',
    geometry: {
      type: 'image',
      x: asset.x,
      y: asset.y,
      width: asset.width,
      height: asset.height,
      imageData: asset.imageData,
      fileName: asset.fileName,
      rotation: asset.rotation,
      scaleX: asset.scaleX,
      scaleY: asset.scaleY,
    },
    style: {
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
      opacity: 1,
    },
    metadata: {
      name: asset.fileName || 'Asset',
      createdAt: new Date(),
      modifiedAt: new Date(),
    },
    visible: true,
  };
}

/**
 * Convert MapData areas to Konva shapes
 *
 * @param interactiveAreas - Array of InteractiveArea
 * @param impassableAreas - Array of ImpassableArea
 * @param assets - Array of Asset (optional for backward compatibility)
 * @returns Array of Konva shapes
 */
export function mapDataToShapes(
  interactiveAreas: InteractiveArea[],
  impassableAreas: ImpassableArea[],
  assets?: Asset[]
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

  // Convert assets to shapes if provided
  if (assets && assets.length > 0) {
    assets.forEach((asset) => {
      try {
        shapes.push(assetToShape(asset));
      } catch (error) {
        console.error(`Failed to convert asset ${asset.id}:`, error);
      }
    });
  }

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

