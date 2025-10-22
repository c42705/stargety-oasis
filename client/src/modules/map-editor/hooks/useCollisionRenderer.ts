/**
 * Collision Renderer Hook
 * 
 * Manages rendering of collision areas (rectangles and polygons) with smart update
 * detection to prevent unnecessary re-renders and position drift. This is a
 * performance-critical component with sophisticated change detection logic.
 */

import { useCallback, MutableRefObject } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { ImpassableArea } from '../../../shared/MapDataContext';
import { CanvasObject } from '../types/fabricCanvas.types';

export interface UseCollisionRendererOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Collision areas from SharedMap */
  collisionAreas: ImpassableArea[];
  /** Grid spacing (for dependency tracking) */
  gridSpacing: number;
  /** Reference to currently dragging polygon ID (for drift prevention) */
  draggingPolygonIdRef: MutableRefObject<string | null>;
}

export interface UseCollisionRendererResult {
  /** Render collision areas on the canvas */
  renderCollisionAreas: () => void;
  /** Check if polygon points have changed */
  polygonPointsChanged: (existingPolygon: fabric.Polygon, newPoints: { x: number; y: number }[]) => boolean;
}

/**
 * Hook for managing collision area rendering with smart updates
 */
export function useCollisionRenderer(options: UseCollisionRendererOptions): UseCollisionRendererResult {
  const {
    canvas,
    collisionAreas,
    gridSpacing,
    draggingPolygonIdRef
  } = options;

  /**
   * Check if polygon points have changed by comparing current Fabric transformation
   * with new points from storage
   */
  const polygonPointsChanged = useCallback((
    existingPolygon: fabric.Polygon,
    newPoints: { x: number; y: number }[]
  ): boolean => {
    // Calculate the CURRENT absolute points from the Fabric polygon's transformation
    // This is the source of truth, not the stale mapElementData
    const matrix = existingPolygon.calcTransformMatrix();
    const currentAbsolutePoints = existingPolygon.points?.map((point) => {
      const transformedPoint = fabric.util.transformPoint(
        { x: point.x, y: point.y },
        matrix
      );
      return {
        x: Math.round(transformedPoint.x),
        y: Math.round(transformedPoint.y)
      };
    }) || [];

    if (currentAbsolutePoints.length !== newPoints.length) return true;

    // Check if any point coordinates differ
    for (let i = 0; i < currentAbsolutePoints.length; i++) {
      if (Math.abs(currentAbsolutePoints[i].x - newPoints[i].x) > 0.01 ||
          Math.abs(currentAbsolutePoints[i].y - newPoints[i].y) > 0.01) {
        return true;
      }
    }

    return false;
  }, []);

  /**
   * Render collision areas on the canvas
   * Uses smart update detection to avoid unnecessary re-renders
   */
  const renderCollisionAreas = useCallback(() => {
    if (!canvas || !collisionAreas) return;

    // DEBUG: Log render start
    logger.info('🎨 RENDER COLLISION AREAS START', {
      areasCount: collisionAreas.length,
      polygonAreas: collisionAreas.filter((a: any) => a.type === 'impassable-polygon').length,
      draggingPolygonId: draggingPolygonIdRef.current
    });

    // Get existing collision area objects
    const existingAreas = canvas.getObjects().filter(obj =>
      (obj as CanvasObject).mapElementType === 'collision'
    );

    // Create a map of existing objects by ID for efficient lookup
    const existingAreasMap = new Map<string, fabric.Object>();
    existingAreas.forEach(obj => {
      const id = (obj as CanvasObject).mapElementId;
      if (id) {
        existingAreasMap.set(id, obj);
      }
    });

    // Track which IDs we've processed
    const processedIds = new Set<string>();

    // Process collision areas - update existing or create new
    collisionAreas.forEach(area => {
      processedIds.add(area.id);

      // Check if this area already exists on canvas
      const existingObj = existingAreasMap.get(area.id);

      // DEBUG: Log area processing
      if ('type' in area && (area as any).type === 'impassable-polygon') {
        logger.info('🎨 PROCESSING POLYGON AREA', {
          id: area.id,
          name: area.name,
          hasExisting: !!existingObj,
          hasPoints: !!(area as any).points,
          pointsCount: (area as any).points?.length
        });
      }

      // For polygons, update points if object exists
      if (existingObj && 'type' in area && (area as any).type === 'impassable-polygon' && (area as any).points) {
        const polygon = existingObj as fabric.Polygon;
        const absolutePoints = (area as any).points;

        // 🛡️ DRIFT PREVENTION: Skip smart update if this polygon is currently being dragged
        if (draggingPolygonIdRef.current === area.id) {
          logger.info('⏭️ SKIP SMART UPDATE', {
            id: area.id,
            reason: 'Currently being dragged',
            timestamp: new Date().toISOString()
          });
          return; // Don't update the polygon that's being dragged
        }

        // 🛡️ DIRTY CHECKING: Skip update if points haven't changed
        const pointsChanged = polygonPointsChanged(polygon, absolutePoints);
        if (!pointsChanged) {
          logger.info('⏭️ SKIP SMART UPDATE', {
            id: area.id,
            reason: 'Points unchanged (calculated from current Fabric transformation)',
            timestamp: new Date().toISOString()
          });
          return; // Don't update if data is identical
        } else {
          // Calculate current absolute points for logging
          const matrix = polygon.calcTransformMatrix();
          const currentAbsolutePoints = polygon.points?.map((point) => {
            const transformedPoint = fabric.util.transformPoint(
              { x: point.x, y: point.y },
              matrix
            );
            return {
              x: Math.round(transformedPoint.x),
              y: Math.round(transformedPoint.y)
            };
          }) || [];

          logger.warn('🔄 POINTS CHANGED DETECTED', {
            id: area.id,
            currentPointsCount: currentAbsolutePoints.length,
            storagePointsCount: absolutePoints.length,
            currentFirstPoint: currentAbsolutePoints[0],
            storageFirstPoint: absolutePoints[0],
            currentLastPoint: currentAbsolutePoints[currentAbsolutePoints.length - 1],
            storageLastPoint: absolutePoints[absolutePoints.length - 1],
            reason: 'Current Fabric transformation differs from storage',
            timestamp: new Date().toISOString()
          });
        }

        // Capture position BEFORE smart update for flash/jump detection
        const positionBefore = {
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY,
          angle: polygon.angle
        };
        const timestampBefore = Date.now();

        // ⚡ FLASH DETECTION - Log position before smart update
        logger.info('⚡ BEFORE SMART UPDATE', {
          id: area.id,
          position: positionBefore,
          timestamp: new Date().toISOString()
        });

        // DEBUG: Log smart update start
        logger.info('🔄 SMART UPDATE START', {
          id: area.id,
          existingLeft: polygon.left,
          existingTop: polygon.top,
          absolutePointsCount: absolutePoints.length,
          firstAbsolutePoint: absolutePoints[0]
        });

        // Convert absolute points to relative points
        const minX = Math.min(...absolutePoints.map((p: any) => p.x));
        const minY = Math.min(...absolutePoints.map((p: any) => p.y));
        const relativePoints = absolutePoints.map((p: any) => ({
          x: p.x - minX,
          y: p.y - minY
        }));

        // DEBUG: Log coordinate conversion
        logger.info('🔄 COORDINATE CONVERSION', {
          id: area.id,
          minX,
          minY,
          firstRelativePoint: relativePoints[0],
          lastRelativePoint: relativePoints[relativePoints.length - 1]
        });

        // Update polygon with relative points and correct position
        polygon.set({
          points: relativePoints,
          left: minX,
          top: minY,
          scaleX: 1,
          scaleY: 1,
          angle: 0
        });

        const timestampAfterSet = Date.now();

        // ⚡ FLASH DETECTION - Log position after polygon.set()
        logger.info('⚡ AFTER SET', {
          id: area.id,
          position: { left: polygon.left, top: polygon.top, scaleX: polygon.scaleX, scaleY: polygon.scaleY },
          duration: timestampAfterSet - timestampBefore,
          timestamp: new Date().toISOString()
        });

        // DEBUG: Log after set
        logger.info('🔄 AFTER SET', {
          id: area.id,
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY
        });

        polygon.setCoords(); // Recalculate bounding box

        const timestampAfterSetCoords = Date.now();

        // ⚡ FLASH DETECTION - Log position after polygon.setCoords()
        logger.info('⚡ AFTER SETCOORDS', {
          id: area.id,
          position: { left: polygon.left, top: polygon.top },
          duration: timestampAfterSetCoords - timestampAfterSet,
          timestamp: new Date().toISOString()
        });

        // DEBUG: Log after setCoords
        logger.info('🔄 AFTER SETCOORDS', {
          id: area.id,
          left: polygon.left,
          top: polygon.top,
          aCoords: polygon.aCoords ? {
            tl: polygon.aCoords.tl,
            br: polygon.aCoords.br
          } : null
        });

        // ⚠️ POSITION JUMP DETECTION - Check if position changed unexpectedly
        const positionAfter = {
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY,
          angle: polygon.angle
        };

        const positionDiff = {
          left: (positionAfter.left || 0) - (positionBefore.left || 0),
          top: (positionAfter.top || 0) - (positionBefore.top || 0),
          scaleX: (positionAfter.scaleX || 1) - (positionBefore.scaleX || 1),
          scaleY: (positionAfter.scaleY || 1) - (positionBefore.scaleY || 1),
          angle: (positionAfter.angle || 0) - (positionBefore.angle || 0)
        };

        // Log if position changed (jump detected)
        if (Math.abs(positionDiff.left) > 0.1 || Math.abs(positionDiff.top) > 0.1) {
          logger.warn('⚠️ POSITION JUMP DETECTED', {
            id: area.id,
            before: positionBefore,
            after: positionAfter,
            diff: positionDiff,
            source: 'smart-update',
            timestamp: new Date().toISOString()
          });

          // Also log to console with expanded values for easy reading
          console.warn(`⚠️ POSITION JUMP DETECTED - Polygon: ${area.id}`);
          console.warn(`  BEFORE: left=${positionBefore.left}, top=${positionBefore.top}`);
          console.warn(`  AFTER:  left=${positionAfter.left}, top=${positionAfter.top}`);
          console.warn(`  DRIFT:  Δleft=${positionDiff.left.toFixed(2)}, Δtop=${positionDiff.top.toFixed(2)}`);
          console.warn(`  This polygon was NOT the one being dragged - it jumped during smart update!`);
        }

        (polygon as any).mapElementData = area; // Update metadata
        canvas.renderAll();

        logger.info('✅ SMART UPDATE COMPLETE', { id: area.id });
        return; // Skip recreation
      }

      // If object exists and is not a polygon, or if it's a different type, remove it
      if (existingObj) {
        canvas.remove(existingObj);
      }

      // Check if this is a polygon collision area
      if ('type' in area && (area as any).type === 'impassable-polygon' && (area as any).points) {
        // Polygon collision area - points are in absolute world coordinates
        // We need to convert them to relative coordinates for Fabric.js
        const polygonArea = area as any;
        const absolutePoints = polygonArea.points;

        // 🔃 [Polygon Load] Log polygon loaded from storage and being reconstructed in editor
        logger.info('🔃 [Polygon Load] RECONSTRUCTING IN EDITOR', {
          timestamp: new Date().toISOString(),
          id: area.id,
          name: area.name,
          type: polygonArea.type,
          pointsCount: absolutePoints.length,
          allPoints: absolutePoints,
          boundingBox: {
            x: polygonArea.x,
            y: polygonArea.y,
            width: polygonArea.width,
            height: polygonArea.height
          },
          color: polygonArea.color
        });

        // Calculate bounding box of absolute points
        const minX = Math.min(...absolutePoints.map((p: any) => p.x));
        const minY = Math.min(...absolutePoints.map((p: any) => p.y));

        // Convert absolute points to relative points (relative to top-left of bounding box)
        const relativePoints = absolutePoints.map((p: any) => ({
          x: p.x - minX,
          y: p.y - minY
        }));

        const polygon = new fabric.Polygon(relativePoints, {
          fill: 'rgba(239, 68, 68, 0.3)',
          stroke: '#ef4444',
          strokeWidth: 2,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          left: minX, // Position at the bounding box location
          top: minY,
          objectCaching: false // Disable caching for better transformation handling
        }) as CanvasObject;

        polygon.mapElementId = area.id;
        polygon.mapElementType = 'collision';
        polygon.mapElementData = area;

        canvas.add(polygon);

        // 🔃 [Polygon Load] Log polygon fully reconstructed and rendered on canvas
        logger.info('🔃 [Polygon Load] FULLY RECONSTRUCTED ON CANVAS', {
          timestamp: new Date().toISOString(),
          id: area.id,
          name: area.name,
          fabricObject: {
            left: polygon.left,
            top: polygon.top,
            width: polygon.width,
            height: polygon.height,
            pointsCount: (polygon as any).points?.length || 0
          },
          originalData: {
            pointsCount: absolutePoints.length,
            allPoints: absolutePoints,
            boundingBox: {
              x: polygonArea.x,
              y: polygonArea.y,
              width: polygonArea.width,
              height: polygonArea.height
            }
          },
          dataIntegrityCheck: {
            pointsCountMatch: ((polygon as any).points?.length || 0) === absolutePoints.length,
            positionMatch: polygon.left === minX && polygon.top === minY
          }
        });
      } else {
        // Regular collision area (rectangle)
        const rect = new fabric.Rect({
          left: area.x,
          top: area.y,
          width: area.width,
          height: area.height,
          fill: 'rgba(239, 68, 68, 0.3)',
          stroke: '#ef4444',
          strokeWidth: 2,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true
        }) as CanvasObject;

        rect.mapElementId = area.id;
        rect.mapElementType = 'collision';
        rect.mapElementData = area;

        canvas.add(rect);
      }
    });

    // Remove objects that no longer exist in the data
    existingAreasMap.forEach((obj, id) => {
      if (!processedIds.has(id)) {
        canvas.remove(obj);
      }
    });

    // Note: Layer order will be coordinated after all elements are loaded
    canvas.renderAll();
  }, [canvas, collisionAreas, gridSpacing, draggingPolygonIdRef, polygonPointsChanged]);

  return {
    renderCollisionAreas,
    polygonPointsChanged
  };
}

