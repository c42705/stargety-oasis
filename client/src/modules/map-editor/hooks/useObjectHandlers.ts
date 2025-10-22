/**
 * Object Handlers Hook
 * 
 * Manages handlers for Fabric.js object modifications, including moving, scaling,
 * and synchronization with the shared map system.
 */

import { useCallback } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { ImpassableArea } from '../../../shared/MapDataContext';
import { CanvasObject } from '../types/fabricCanvas.types';

export interface UseObjectHandlersOptions {
  /** Whether grid snapping is enabled */
  gridVisible: boolean;
  /** Grid spacing for snapping */
  gridSpacing: number;
  /** Callback to update interactive area in shared map */
  onUpdateInteractiveArea: (id: string, updates: any) => Promise<void>;
  /** Callback to update collision area in shared map */
  onUpdateCollisionArea: (id: string, updates: any) => Promise<void>;
}

export interface UseObjectHandlersResult {
  /** Handle object modification (after transformation complete) */
  handleObjectModified: (object: CanvasObject) => Promise<void>;
  /** Handle object moving (real-time during drag) */
  handleObjectMoving: (object: CanvasObject) => void;
  /** Handle object scaling (real-time during scale) */
  handleObjectScaling: () => void;
  /** Snap object to grid */
  snapToGrid: (object: fabric.Object, spacing: number) => void;
}

/**
 * Hook for managing object modification handlers
 */
export function useObjectHandlers(options: UseObjectHandlersOptions): UseObjectHandlersResult {
  const {
    gridVisible,
    gridSpacing,
    onUpdateInteractiveArea,
    onUpdateCollisionArea
  } = options;

  /**
   * Snap object to grid
   */
  const snapToGrid = useCallback((object: fabric.Object, spacing: number) => {
    const left = Math.round((object.left || 0) / spacing) * spacing;
    const top = Math.round((object.top || 0) / spacing) * spacing;
    object.set({ left, top });
  }, []);

  /**
   * Handle object modification and sync with shared map
   * Called after transformation is complete (not during drag/scale)
   */
  const handleObjectModified = useCallback(async (object: CanvasObject) => {
    if (!object.mapElementId || !object.mapElementType) return;

    try {
      // Check if this is a polygon collision area
      const mapData = object.mapElementData as any;
      const isPolygon = mapData?.type === 'impassable-polygon';

      if (isPolygon && object.type === 'polygon') {
        // For polygons, extract the ABSOLUTE transformed points
        const polygon = object as fabric.Polygon;

        // DEBUG: Log polygon state before transformation
        logger.info('🔍 POLYGON MODIFY START', {
          id: object.mapElementId,
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY,
          angle: polygon.angle,
          pointsCount: polygon.points?.length,
          firstPoint: polygon.points?.[0]
        });

        // Get the transformation matrix to convert local points to world coordinates
        const matrix = polygon.calcTransformMatrix();

        // DEBUG: Log transformation matrix
        logger.info('🔍 TRANSFORMATION MATRIX', {
          id: object.mapElementId,
          matrix: [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]]
        });

        // Transform each point using the matrix
        const points = polygon.points?.map((point, index) => {
          // Apply transformation matrix to get absolute coordinates
          const transformedPoint = fabric.util.transformPoint(
            { x: point.x, y: point.y },
            matrix
          );

          // DEBUG: Log first and last point transformation
          if (index === 0 || index === polygon.points!.length - 1) {
            logger.info('🔍 POINT TRANSFORMATION', {
              id: object.mapElementId,
              index,
              original: { x: point.x, y: point.y },
              transformed: { x: transformedPoint.x, y: transformedPoint.y },
              rounded: { x: Math.round(transformedPoint.x), y: Math.round(transformedPoint.y) }
            });
          }

          return {
            x: Math.round(transformedPoint.x),
            y: Math.round(transformedPoint.y)
          };
        }) || [];

        const updates: Partial<ImpassableArea> = {
          type: 'impassable-polygon',
          points,
          x: 0, // Compatibility fields
          y: 0,
          width: 0,
          height: 0
        };

        if (object.mapElementType === 'collision' && object.mapElementId) {
          // DEBUG: Log before update
          logger.info('🔍 UPDATING COLLISION AREA', {
            id: object.mapElementId,
            pointsCount: points.length,
            firstPoint: points[0],
            lastPoint: points[points.length - 1]
          });

          await onUpdateCollisionArea(object.mapElementId, updates);

          // Update the mapElementData to reflect new points
          if (object.mapElementData && 'type' in object.mapElementData) {
            const areaData = object.mapElementData as any;
            object.mapElementData = {
              ...areaData,
              points
            } as any;
          }

          logger.info('✅ Polygon updated', { id: object.mapElementId, pointCount: points.length });
        }
      } else {
        // For rectangles and other shapes, use standard x/y/width/height
        const updates = {
          x: Math.round(object.left || 0),
          y: Math.round(object.top || 0),
          width: Math.round((object.width || 0) * (object.scaleX || 1)),
          height: Math.round((object.height || 0) * (object.scaleY || 1))
        };

        if (object.mapElementType === 'interactive' && object.mapElementId) {
          await onUpdateInteractiveArea(object.mapElementId, updates);
        } else if (object.mapElementType === 'collision' && object.mapElementId) {
          await onUpdateCollisionArea(object.mapElementId, updates);
        }
      }
    } catch (error) {
      logger.error('Failed to update map element', error);
    }
  }, [onUpdateInteractiveArea, onUpdateCollisionArea]);

  /**
   * Handle real-time object movement (immediate visual feedback only)
   * Called during drag, not after completion
   */
  const handleObjectMoving = useCallback((object: CanvasObject) => {
    // Snap to grid if enabled
    if (gridVisible && gridSpacing > 0) {
      snapToGrid(object, gridSpacing);
    }

    // Note: onObjectModified is NOT called here to prevent excessive callbacks during drag
    // The callback will be triggered only when the transformation is complete (object:modified event)
  }, [gridVisible, gridSpacing, snapToGrid]);

  /**
   * Handle real-time object scaling (immediate visual feedback only)
   * Called during scale, not after completion
   */
  const handleObjectScaling = useCallback(() => {
    // Note: Aspect ratio maintenance can be implemented here if needed
    // For now, we just provide visual feedback without triggering callbacks

    // Note: onObjectModified is NOT called here to prevent excessive callbacks during scaling
    // The callback will be triggered only when the transformation is complete (object:modified event)
  }, []);

  return {
    handleObjectModified,
    handleObjectMoving,
    handleObjectScaling,
    snapToGrid
  };
}

