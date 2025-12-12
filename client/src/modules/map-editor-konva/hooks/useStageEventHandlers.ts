/**
 * useStageEventHandlers Hook
 * 
 * Manages stage/canvas event handlers including click, mouse down/move/up, and double-click.
 * Routes events to appropriate tool handlers based on current tool and drawing mode.
 */

import { useCallback } from 'react';
import type { EditorTool } from '../types/konva.types';
import type { InteractiveArea, StageEventHandlersReturn } from '../types';
import type { UseKonvaPanReturn, UseKonvaSelectionReturn, UseKonvaPolygonDrawingReturn, UseKonvaRectDrawingReturn } from '../types/hooks.types';
import { logger } from '../../../shared/logger';

interface UseStageEventHandlersParams {
  // Current state
  currentTool: EditorTool;
  isSpacebarPressed: boolean;
  collisionDrawingMode: boolean;
  drawingMode: boolean;
  pendingCollisionAreaData: any | null;
  pendingAreaData: Partial<InteractiveArea> | null;
  
  // Hook instances
  pan: UseKonvaPanReturn;
  selection: UseKonvaSelectionReturn;
  polygonDrawing: UseKonvaPolygonDrawingReturn;
  rectDrawing: UseKonvaRectDrawingReturn;
  collisionRectDrawing: UseKonvaRectDrawingReturn;
}

export function useStageEventHandlers(params: UseStageEventHandlersParams): StageEventHandlersReturn {
  const {
    currentTool,
    isSpacebarPressed,
    collisionDrawingMode,
    drawingMode,
    pendingCollisionAreaData,
    pendingAreaData,
    pan,
    selection,
    polygonDrawing,
    rectDrawing,
    collisionRectDrawing,
  } = params;

  const handleStageClick = useCallback((e: any) => {
    if (currentTool === 'select') {
      selection.handleStageClick(e);
    } else if (currentTool === 'polygon') {
      polygonDrawing.handleClick(e);
    }
  }, [currentTool, selection, polygonDrawing]);

  const handleStageMouseDown = useCallback((e: any) => {
    // Pan tool or spacebar pressed - enable panning
    if (currentTool === 'pan' || isSpacebarPressed) {
      pan.handleMouseDown(e);
    } else if (currentTool === 'select') {
      selection.handleMouseDown(e);
    } else if (currentTool === 'rect') {
      // Handle both interactive and collision rectangle drawing
      if (collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle') {
        logger.info('RECT_DRAWING_MOUSE_DOWN_COLLISION', {
          collisionDrawingMode,
          pendingCollisionAreaData
        });
        collisionRectDrawing.handleMouseDown(e);
      } else {
        logger.info('RECT_DRAWING_MOUSE_DOWN_INTERACTIVE', {
          drawingMode,
          pendingAreaData,
          currentTool
        });
        rectDrawing.handleMouseDown(e);
      }
    }
  }, [currentTool, isSpacebarPressed, collisionDrawingMode, pendingCollisionAreaData, drawingMode, pendingAreaData, pan, selection, collisionRectDrawing, rectDrawing]);

  const handleStageMouseMove = useCallback((e: any) => {
    // Pan tool or spacebar pressed - enable panning
    if (currentTool === 'pan' || isSpacebarPressed) {
      pan.handleMouseMove(e);
    } else if (currentTool === 'select') {
      selection.handleMouseMove(e);
    } else if (currentTool === 'polygon') {
      polygonDrawing.handleMouseMove(e);
    } else if (currentTool === 'rect') {
      // Handle both interactive and collision rectangle drawing
      if (collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle') {
        collisionRectDrawing.handleMouseMove(e);
      } else {
        rectDrawing.handleMouseMove(e);
      }
    }
  }, [currentTool, isSpacebarPressed, collisionDrawingMode, pendingCollisionAreaData, pan, selection, polygonDrawing, collisionRectDrawing, rectDrawing]);

  const handleStageMouseUp = useCallback(() => {
    // Always call pan.handleMouseUp to ensure panning state is cleared
    // This is important when spacebar is released while dragging
    pan.handleMouseUp();

    if (currentTool === 'select') {
      selection.handleMouseUp();
    } else if (currentTool === 'rect') {
      // Handle both interactive and collision rectangle drawing
      if (collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle') {
        logger.info('RECT_DRAWING_MOUSE_UP_COLLISION', {
          collisionDrawingMode,
          pendingCollisionAreaData
        });
        collisionRectDrawing.handleMouseUp();
      } else {
        logger.info('RECT_DRAWING_MOUSE_UP_INTERACTIVE', {
          drawingMode,
          pendingAreaData,
          currentTool
        });
        rectDrawing.handleMouseUp();
      }
    }
  }, [currentTool, collisionDrawingMode, pendingCollisionAreaData, drawingMode, pendingAreaData, pan, selection, collisionRectDrawing, rectDrawing]);

  const handleStageDoubleClick = useCallback(() => {
    if (currentTool === 'polygon') {
      polygonDrawing.handleDoubleClick();
    }
  }, [currentTool, polygonDrawing]);

  return {
    handleStageClick,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleStageDoubleClick,
  };
}

