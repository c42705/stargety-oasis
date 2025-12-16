/**
 * Shape Creation Handlers Hook
 *
 * Handles onShapeCreate callbacks for polygon and rectangle drawing modes.
 * Centralizes logic for creating interactive areas and collision areas from shapes.
 *
 * @version 1.0.0
 * @date 2025-11-28
 */

import { useCallback } from 'react';
import { logger } from '../../../shared/logger';
import type { Shape, EditorTool } from '../types';
import type { InteractiveArea, ImpassableArea } from '../../../shared/MapDataContext';
import { getColorForActionType, InteractiveAreaActionType } from '../../../shared/MapDataContext';

// Types for pending area data
interface PendingAreaData {
  name?: string;
  description?: string;
  actionType?: InteractiveAreaActionType;
  color?: string;
}

interface PendingCollisionAreaData {
  name?: string;
  color?: string;
  drawingMode?: 'rectangle' | 'polygon';
}

// Internal type for collision area creation (with required name)
interface NewCollisionArea {
  id: string;
  name: string;
  type: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<{ x: number; y: number }>;
}

interface UseShapeCreationHandlersParams {
  // Pending data state
  pendingAreaData: PendingAreaData | null;
  pendingCollisionAreaData: PendingCollisionAreaData | null;
  // Existing areas for naming (both types)
  impassableAreas: ImpassableArea[];
  interactiveAreas: InteractiveArea[];
  // State setters
  setPendingAreaData: (data: PendingAreaData | null) => void;
  setPendingCollisionAreaData: (data: PendingCollisionAreaData | null) => void;
  setDrawingMode: (mode: boolean) => void;
  setCollisionDrawingMode: (mode: boolean) => void;
  setCurrentTool: React.Dispatch<React.SetStateAction<EditorTool>>;
  // Store actions
  addInteractiveArea: (area: InteractiveArea) => void;
  addCollisionArea: (area: NewCollisionArea) => void;
  markDirty: () => void;
  // History
  history: { pushState: (label: string) => void };
}

interface UseShapeCreationHandlersReturn {
  handlePolygonShapeCreate: (shape: Shape) => void;
  handleRectShapeCreate: (shape: Shape) => void;
  handleCollisionRectShapeCreate: (shape: Shape) => void;
}

/**
 * Hook for handling shape creation callbacks
 */
export function useShapeCreationHandlers(
  params: UseShapeCreationHandlersParams
): UseShapeCreationHandlersReturn {
  const {
    pendingAreaData,
    pendingCollisionAreaData,
    impassableAreas,
    interactiveAreas,
    setPendingAreaData,
    setPendingCollisionAreaData,
    setDrawingMode,
    setCollisionDrawingMode,
    setCurrentTool,
    addInteractiveArea,
    addCollisionArea,
    markDirty,
    history,
  } = params;

  /**
   * Handle polygon shape creation (for interactive areas with impassable action type)
   */
  const handlePolygonShapeCreate = useCallback((shape: Shape) => {
    logger.debug('POLYGON_SHAPE_CREATE', { shapeId: shape.id, geometryType: shape.geometry.type });

    if (shape.geometry.type !== 'polygon') return;

    const polygon = shape.geometry;

    // Convert flat points array to array of point objects
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < polygon.points.length; i += 2) {
      points.push({ x: polygon.points[i], y: polygon.points[i + 1] });
    }

    // Calculate bounding box for AABB collision detection
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Auto-generate name - use pending data or auto-generate unique name
    // Count total areas (both interactive and impassable) to avoid duplicate names
    const totalAreas = interactiveAreas.length + impassableAreas.length;
    const defaultName = pendingCollisionAreaData?.name || `Area ${totalAreas + 1}`;

    // Default to 'impassable' action type for polygon areas
    const actionType: InteractiveAreaActionType = 'impassable';

    const newArea: InteractiveArea = {
      id: shape.id,
      name: defaultName,
      description: undefined,
      color: getColorForActionType(actionType),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      actionType,
      actionConfig: null,
      shapeType: 'polygon',
      points,
    };

    logger.info('POLYGON_INTERACTIVE_AREA_CREATED', {
      id: newArea.id,
      name: newArea.name,
      pointsCount: points.length,
      actionType,
    });

    addInteractiveArea(newArea);
    setPendingCollisionAreaData(null);
    markDirty();
    history.pushState('Draw polygon');
    setCurrentTool('select');
    setCollisionDrawingMode(false);
  }, [
    pendingCollisionAreaData,
    impassableAreas.length,
    addInteractiveArea,
    setPendingCollisionAreaData,
    markDirty,
    history,
    setCurrentTool,
    setCollisionDrawingMode,
  ]);

  /**
   * Handle rectangle shape creation (for interactive areas)
   */
  const handleRectShapeCreate = useCallback((shape: Shape) => {
    logger.debug('RECT_SHAPE_CREATE', {
      shapeId: shape.id,
      geometryType: shape.geometry.type,
      hasPendingData: !!pendingAreaData,
    });

    if (!pendingAreaData || shape.geometry.type !== 'rectangle') {
      logger.error('AREA_CREATE_FAILED', {
        reason: !pendingAreaData ? 'No pending area data' : 'Geometry not rectangle',
      });
      return;
    }

    const rect = shape.geometry;
    // Default to 'impassable' action type for new areas
    const actionType = pendingAreaData.actionType || 'impassable';
    const newArea: InteractiveArea = {
      id: shape.id,
      name: pendingAreaData.name || 'New Area',
      description: pendingAreaData.description,
      color: pendingAreaData.color || getColorForActionType(actionType),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      actionType,
      actionConfig: null,
      shapeType: 'rectangle',
    };

    logger.info('INTERACTIVE_AREA_CREATED', { areaId: newArea.id, areaName: newArea.name });

    addInteractiveArea(newArea);
    setPendingAreaData(null);
    markDirty();
    history.pushState('Draw rectangle');
    setDrawingMode(false);
    setCurrentTool('select');
  }, [
    pendingAreaData,
    addInteractiveArea,
    setPendingAreaData,
    markDirty,
    history,
    setDrawingMode,
    setCurrentTool,
  ]);

  /**
   * Handle collision rectangle shape creation (creates interactive area with impassable action type)
   */
  const handleCollisionRectShapeCreate = useCallback((shape: Shape) => {
    logger.debug('COLLISION_RECT_SHAPE_CREATE', { shapeId: shape.id });

    if (!pendingCollisionAreaData || shape.geometry.type !== 'rectangle') return;

    const rect = shape.geometry;
    // Count total areas (both interactive and impassable) to avoid duplicate names
    const totalAreas = interactiveAreas.length + impassableAreas.length;
    const defaultName = pendingCollisionAreaData.name || `Area ${totalAreas + 1}`;

    // Default to 'impassable' action type for collision rectangles
    const actionType: InteractiveAreaActionType = 'impassable';

    const newArea: InteractiveArea = {
      id: shape.id,
      name: defaultName,
      description: undefined,
      color: getColorForActionType(actionType),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      actionType,
      actionConfig: null,
      shapeType: 'rectangle',
    };

    logger.info('COLLISION_RECT_INTERACTIVE_AREA_CREATED', {
      id: newArea.id,
      name: newArea.name,
      actionType,
    });

    addInteractiveArea(newArea);
    setPendingCollisionAreaData(null);
    markDirty();
    history.pushState('Draw collision rectangle');
    setCollisionDrawingMode(false);
    setCurrentTool('select');
  }, [
    pendingCollisionAreaData,
    interactiveAreas.length,
    impassableAreas.length,
    addInteractiveArea,
    setPendingCollisionAreaData,
    markDirty,
    history,
    setCollisionDrawingMode,
    setCurrentTool,
  ]);

  return {
    handlePolygonShapeCreate,
    handleRectShapeCreate,
    handleCollisionRectShapeCreate,
  };
}

