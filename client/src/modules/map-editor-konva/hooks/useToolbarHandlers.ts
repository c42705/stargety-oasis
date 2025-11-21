/**
 * useToolbarHandlers Hook
 * 
 * Manages toolbar event handlers including tool selection, zoom controls, grid toggles, and undo/redo.
 * Uses Konva EditorTool type directly (no Fabric.js conversions).
 */

import { useCallback } from 'react';
import type { EditorTool } from '../types/konva.types';
import type { Shape, GridConfig, ToolbarHandlersReturn } from '../types';
import type { UseKonvaZoomReturn } from '../types/hooks.types';
import type { UseKonvaHistoryReturn } from '../types/hooks.types';
import type { UseKonvaBackgroundReturn } from '../types/hooks.types';
import { logger } from '../../../shared/logger';

interface UseToolbarHandlersParams {
  setCurrentTool: (tool: EditorTool) => void;
  zoom: UseKonvaZoomReturn;
  history: UseKonvaHistoryReturn;
  shapes: Shape[];
  viewportWidth: number;
  viewportHeight: number;
  background: UseKonvaBackgroundReturn;
  setGridConfig: (config: GridConfig | ((prev: GridConfig) => GridConfig)) => void;
}

export function useToolbarHandlers(params: UseToolbarHandlersParams): ToolbarHandlersReturn {
  const {
    setCurrentTool,
    zoom,
    history,
    shapes,
    viewportWidth,
    viewportHeight,
    background,
    setGridConfig,
  } = params;

  // Tool change handler - uses Konva EditorTool directly (NO conversion)
  const handleToolChange = useCallback((tool: EditorTool) => {
    setCurrentTool(tool);
  }, [setCurrentTool]);

  const handleZoomIn = useCallback(() => {
    zoom.zoomIn();
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    zoom.zoomOut();
  }, [zoom]);

  const handleZoomReset = useCallback(() => {
    zoom.resetZoom();
  }, [zoom]);

  const handleFitToScreen = useCallback(() => {
    // Initialize bounds
    let bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    let hasContent = false;

    // Include background image in bounds if it exists
    if (background.image && background.dimensions) {
      bounds.minX = 0;
      bounds.minY = 0;
      bounds.maxX = background.dimensions.width;
      bounds.maxY = background.dimensions.height;
      hasContent = true;
      logger.info('FIT_TO_SCREEN_BACKGROUND', {
        backgroundDimensions: background.dimensions
      });
    }

    // Include all shapes in bounds
    if (shapes.length > 0) {
      shapes.forEach(shape => {
        const geom = shape.geometry as any;
        if (geom.vertices) {
          // Polygon geometry
          geom.vertices.forEach((v: any) => {
            bounds.minX = Math.min(bounds.minX, v.x);
            bounds.minY = Math.min(bounds.minY, v.y);
            bounds.maxX = Math.max(bounds.maxX, v.x);
            bounds.maxY = Math.max(bounds.maxY, v.y);
          });
          hasContent = true;
        } else if (geom.x !== undefined && geom.y !== undefined && geom.width !== undefined && geom.height !== undefined) {
          // Rectangle or Image geometry
          bounds.minX = Math.min(bounds.minX, geom.x);
          bounds.minY = Math.min(bounds.minY, geom.y);
          bounds.maxX = Math.max(bounds.maxX, geom.x + geom.width);
          bounds.maxY = Math.max(bounds.maxY, geom.y + geom.height);
          hasContent = true;
        }
      });
    }

    // If no content, reset zoom
    if (!hasContent) {
      logger.info('FIT_TO_SCREEN_NO_CONTENT', { message: 'No shapes or background to fit' });
      zoom.resetZoom();
      return;
    }

    logger.info('FIT_TO_SCREEN_BOUNDS', {
      bounds,
      shapesCount: shapes.length,
      hasBackground: !!background.image
    });

    zoom.zoomToFit(
      {
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      },
      viewportWidth,
      viewportHeight,
      50 // padding
    );
  }, [zoom, shapes, viewportWidth, viewportHeight, background]);

  const handleToggleGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, visible: !prev.visible }));
  }, [setGridConfig]);

  const handleToggleSnapToGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  }, [setGridConfig]);

  const handleUndo = useCallback(() => {
    history.undo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRedo = useCallback(() => {
    history.redo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    handleToolChange,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFitToScreen,
    handleToggleGrid,
    handleToggleSnapToGrid,
    handleUndo,
    handleRedo,
  };
}

