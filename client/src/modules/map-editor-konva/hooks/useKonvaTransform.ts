/**
 * Konva Map Editor - Transform Hook
 * 
 * Handles shape transformation including drag-to-move and resize.
 */

import { useCallback } from 'react';
import type {
  Shape,
  ShapeGeometry,
  RectangleGeometry,
  PolygonGeometry,
  UseKonvaTransformParams,
  UseKonvaTransformReturn,
} from '../types';

/**
 * Hook for shape transformation functionality
 * 
 * Provides drag-to-move and resize functionality for selected shapes.
 * 
 * @example
 * ```typescript
 * const {
 *   handleDragEnd,
 *   handleTransformEnd,
 *   canTransform,
 * } = useKonvaTransform({
 *   selectedIds,
 *   shapes,
 *   onShapeUpdate: (id, updates) => updateShape(id, updates),
 * });
 * ```
 */
export function useKonvaTransform(
  params: UseKonvaTransformParams
): UseKonvaTransformReturn {
  const {
    selectedIds,
    shapes,
    onShapeUpdate,
  } = params;

  // ==========================================================================
  // TRANSFORM UTILITIES
  // ==========================================================================

  /**
   * Check if a shape can be transformed
   */
  const canTransform = useCallback(
    (shapeId: string): boolean => {
      return selectedIds.includes(shapeId);
    },
    [selectedIds]
  );

  /**
   * Get shape by ID
   */
  const getShape = useCallback(
    (shapeId: string): Shape | undefined => {
      return shapes.find((s) => s.id === shapeId);
    },
    [shapes]
  );

  // ==========================================================================
  // DRAG HANDLERS
  // ==========================================================================

  /**
   * Handle drag end - update shape position
   */
  const handleDragEnd = useCallback(
    (shapeId: string, e: any) => {
      const shape = getShape(shapeId);
      if (!shape || !canTransform(shapeId)) return;

      const node = e.target;
      const newX = node.x();
      const newY = node.y();

      // Update shape geometry based on type
      if (shape.geometry.type === 'rectangle') {
        const updates: Partial<RectangleGeometry> = {
          x: newX,
          y: newY,
        };
        onShapeUpdate?.(shapeId, { geometry: { ...shape.geometry, ...updates } });
      } else if (shape.geometry.type === 'polygon') {
        // For polygons, we need to update the points array
        // The drag moves the entire polygon, so we just update x/y offset
        const updates: Partial<PolygonGeometry> = {
          points: shape.geometry.points, // Keep points the same
        };
        
        // Calculate the delta from the original position
        const deltaX = newX;
        const deltaY = newY;
        
        // Update all points by the delta
        const newPoints = [...shape.geometry.points];
        for (let i = 0; i < newPoints.length; i += 2) {
          newPoints[i] += deltaX;
          newPoints[i + 1] += deltaY;
        }
        
        // Reset node position to 0,0 since we've updated the points
        node.x(0);
        node.y(0);

        onShapeUpdate?.(shapeId, { geometry: { ...shape.geometry, points: newPoints } });
      }
    },
    [getShape, canTransform, onShapeUpdate]
  );

  // ==========================================================================
  // TRANSFORM HANDLERS
  // ==========================================================================

  /**
   * Handle transform end - update shape size/rotation
   */
  const handleTransformEnd = useCallback(
    (shapeId: string, node: any) => {
      const shape = getShape(shapeId);
      if (!shape || !canTransform(shapeId)) return;

      if (shape.geometry.type === 'rectangle') {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale to 1 and adjust width/height instead
        node.scaleX(1);
        node.scaleY(1);

        const updates: Partial<RectangleGeometry> = {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
          rotation: node.rotation(),
        };

        onShapeUpdate?.(shapeId, { geometry: { ...shape.geometry, ...updates } });
      } else if (shape.geometry.type === 'polygon') {
        // For polygons, we keep the scale and rotation
        const updates: Partial<PolygonGeometry> = {
          points: shape.geometry.points,
        };

        // Apply scale to points
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        if (scaleX !== 1 || scaleY !== 1) {
          const newPoints = [...shape.geometry.points];
          for (let i = 0; i < newPoints.length; i += 2) {
            newPoints[i] *= scaleX;
            newPoints[i + 1] *= scaleY;
          }
          updates.points = newPoints;
          
          // Reset scale
          node.scaleX(1);
          node.scaleY(1);
        }

        onShapeUpdate?.(shapeId, { geometry: { ...shape.geometry, ...updates } });
      }
    },
    [getShape, canTransform, onShapeUpdate]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    state: {
      isTransforming: false,
      transformType: null,
      originalShapes: [],
    },

    // Transform queries
    canTransform: selectedIds.length > 0,

    // Event handlers
    handleTransformStart: () => {},
    handleTransform: () => {},
    handleDragEnd,
    handleTransformEnd,
    cancelTransform: () => {},
  };
}

