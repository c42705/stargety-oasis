/**
 * useLayersHandlers Hook
 * 
 * Manages event handlers for the layers panel including shape selection, visibility toggle,
 * deletion, and zoom to shape functionality.
 */

import { useCallback, RefObject } from 'react';
import type { EditorTool } from '../types/konva.types';
import type { Shape, InteractiveArea, Viewport, LayersHandlersReturn } from '../types';
import type { UseKonvaHistoryReturn } from '../types/hooks.types';
import { calculateZoomToShape } from '../utils/zoomToShape';
import { logger } from '../../../shared/logger';

interface UseLayersHandlersParams {
  // State setters
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setCurrentTool: (tool: EditorTool) => void;
  setShapes: (shapes: Shape[] | ((prev: Shape[]) => Shape[])) => void;
  setAreaToDelete: (area: InteractiveArea | null) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setCollisionAreaToDelete: (area: any | null) => void;
  setShowCollisionDeleteConfirm: (show: boolean) => void;
  setViewport: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  
  // State values
  shapes: Shape[];
  areas: InteractiveArea[];
  impassableAreas: any[];
  
  // Refs
  mainRef: RefObject<HTMLDivElement | null>;
  
  // Other dependencies
  markDirty: () => void;
  history: UseKonvaHistoryReturn;
}

export function useLayersHandlers(params: UseLayersHandlersParams): LayersHandlersReturn {
  const {
    setSelectedIds,
    setCurrentTool,
    setShapes,
    setAreaToDelete,
    setShowDeleteConfirm,
    setCollisionAreaToDelete,
    setShowCollisionDeleteConfirm,
    setViewport,
    shapes,
    areas,
    impassableAreas,
    mainRef,
    markDirty,
    history,
  } = params;

  const handleShapeSelect = useCallback((shapeId: string) => {
    setSelectedIds([shapeId]);
    setCurrentTool('select');
  }, [setSelectedIds, setCurrentTool]);

  const handleShapeVisibilityToggle = useCallback((shapeId: string) => {
    setShapes(prev => prev.map(s => {
      if (s.id === shapeId) {
        // For collision layers, toggle opacity instead of visibility
        if (s.category === 'collision') {
          const currentOpacity = s.style.opacity ?? 0.7;
          const newOpacity = currentOpacity > 0.3 ? 0.15 : 0.7;
          return {
            ...s,
            style: {
              ...s.style,
              opacity: newOpacity
            }
          };
        }
        // For other layers, toggle visibility as before
        return { ...s, visible: !s.visible };
      }
      return s;
    }));
    history.pushState('Toggle shape visibility');
  }, [setShapes, history]);

  const handleShapeDelete = useCallback((shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    if (shape.category === 'interactive') {
      const area = areas.find(a => a.id === shapeId);
      if (area) {
        setAreaToDelete(area);
        setShowDeleteConfirm(true);
      }
    } else if (shape.category === 'collision') {
      const area = impassableAreas.find(a => a.id === shapeId);
      if (area) {
        setCollisionAreaToDelete(area);
        setShowCollisionDeleteConfirm(true);
      }
    } else if (shape.category === 'asset') {
      // Delete asset shapes directly without confirmation
      setShapes(prev => prev.filter(s => s.id !== shapeId));
      setSelectedIds(prev => prev.filter(id => id !== shapeId));
      markDirty();
      history.pushState('Delete asset');
      logger.info('ASSET_DELETED', { id: shapeId, name: shape.name });
    }
  }, [shapes, areas, impassableAreas, setShapes, setSelectedIds, setAreaToDelete, setShowDeleteConfirm, setCollisionAreaToDelete, setShowCollisionDeleteConfirm, markDirty, history]);

  const handleZoomToShape = useCallback((shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || !mainRef.current) return;

    const newViewport = calculateZoomToShape(
      shape,
      mainRef.current.offsetWidth,
      mainRef.current.offsetHeight,
      0.2 // 20% padding
    );

    setViewport(newViewport);
  }, [shapes, mainRef, setViewport]);

  return {
    handleShapeSelect,
    handleShapeVisibilityToggle,
    handleShapeDelete,
    handleZoomToShape,
  };
}

