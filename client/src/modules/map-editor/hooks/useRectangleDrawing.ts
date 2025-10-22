/**
 * Rectangle Drawing Hook
 * 
 * Manages the state machine for drawing rectangular interactive and collision areas
 * in the map editor. Handles drag-to-draw, size validation, and area creation.
 */

import { useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { InteractiveArea, ImpassableArea } from '../../../shared/MapDataContext';
import { RectangleDrawingState } from '../types/fabricCanvas.types';

export interface UseRectangleDrawingOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Whether interactive area drawing mode is active */
  drawingMode: boolean;
  /** Whether collision area drawing mode is active */
  collisionDrawingMode: boolean;
  /** Data for the interactive area being drawn */
  drawingAreaData?: Partial<InteractiveArea>;
  /** Data for the collision area being drawn */
  drawingCollisionAreaData?: Partial<ImpassableArea>;
  /** Minimum area size in pixels */
  minAreaSize: number;
  /** Callback when interactive area is drawn */
  onAreaDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  /** Callback when collision area is drawn */
  onCollisionAreaDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  /** Callback to force re-render */
  onForceRender?: () => void;
}

export interface UseRectangleDrawingResult {
  /** Current rectangle drawing state */
  rectangleDrawingState: RectangleDrawingState;
  /** Start drawing a rectangle */
  handleDrawingStart: (pointer: fabric.Point) => void;
  /** Update rectangle as mouse moves */
  handleDrawingMove: (pointer: fabric.Point) => void;
  /** Complete rectangle drawing */
  handleDrawingEnd: () => void;
}

/**
 * Hook for managing rectangle drawing state and operations
 */
export function useRectangleDrawing(options: UseRectangleDrawingOptions): UseRectangleDrawingResult {
  const {
    canvas,
    drawingMode,
    collisionDrawingMode,
    drawingAreaData,
    drawingCollisionAreaData,
    minAreaSize,
    onAreaDrawn,
    onCollisionAreaDrawn,
    onForceRender
  } = options;

  // Rectangle drawing state
  const [rectangleDrawingState, setRectangleDrawingState] = useState<RectangleDrawingState>({
    isDrawing: false,
    startPoint: null,
    drawingRect: null,
    drawingText: null,
    isValidSize: false
  });

  /**
   * Start drawing a rectangle
   */
  const handleDrawingStart = useCallback((pointer: fabric.Point) => {
    if (!canvas || (!drawingMode && !collisionDrawingMode)) return;

    // Create preview rectangle with appropriate styling
    let rectColor: string;
    let rectFill: string;
    let textLabel: string;

    if (collisionDrawingMode) {
      rectColor = '#ef4444';
      rectFill = 'rgba(239, 68, 68, 0.3)';
      textLabel = drawingCollisionAreaData?.name || 'Collision Area';
    } else {
      rectColor = drawingAreaData?.color || '#4A90E2';
      rectFill = drawingAreaData?.color || '#4A90E2';
      textLabel = drawingAreaData?.name || 'New Area';
    }

    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: rectFill,
      fillOpacity: 0.3,
      stroke: rectColor,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    });

    // Create preview text label
    const text = new fabric.Text(textLabel, {
      left: pointer.x,
      top: pointer.y,
      fontSize: 14,
      fill: '#333',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      visible: false // Initially hidden until area is large enough
    });

    setRectangleDrawingState({
      isDrawing: true,
      startPoint: { x: pointer.x, y: pointer.y },
      drawingRect: rect,
      drawingText: text,
      isValidSize: false
    });

    canvas.add(rect);
    canvas.add(text);
    canvas.renderAll();
  }, [canvas, drawingMode, collisionDrawingMode, drawingAreaData, drawingCollisionAreaData]);

  /**
   * Update rectangle as mouse moves
   */
  const handleDrawingMove = useCallback((pointer: fabric.Point) => {
    if (!canvas || !rectangleDrawingState.isDrawing || !rectangleDrawingState.startPoint || !rectangleDrawingState.drawingRect) {
      return;
    }

    const { startPoint, drawingRect, drawingText } = rectangleDrawingState;

    const width = Math.abs(pointer.x - startPoint.x);
    const height = Math.abs(pointer.y - startPoint.y);
    const left = Math.min(pointer.x, startPoint.x);
    const top = Math.min(pointer.y, startPoint.y);

    // Check if size meets minimum requirements
    const meetsMinSize = width >= minAreaSize && height >= minAreaSize;

    // Update rectangle appearance based on size validation and drawing type
    let strokeColor: string;
    if (collisionDrawingMode) {
      strokeColor = meetsMinSize ? '#ef4444' : '#ff4d4f';
    } else {
      strokeColor = meetsMinSize ? (drawingAreaData?.color || '#4A90E2') : '#ff4d4f';
    }
    const fillOpacity = meetsMinSize ? 0.3 : 0.1;

    drawingRect.set({
      left,
      top,
      width,
      height,
      stroke: strokeColor,
      fillOpacity
    });

    // Update text position and visibility
    if (drawingText) {
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      drawingText.set({
        left: centerX,
        top: centerY,
        visible: meetsMinSize && width > 60 && height > 30 // Show text only if area is large enough
      });
    }

    setRectangleDrawingState(prev => ({
      ...prev,
      isValidSize: meetsMinSize
    }));

    canvas.renderAll();
  }, [canvas, rectangleDrawingState, drawingAreaData, collisionDrawingMode, minAreaSize]);

  /**
   * Complete rectangle drawing
   */
  const handleDrawingEnd = useCallback(() => {
    if (!canvas || !rectangleDrawingState.isDrawing || !rectangleDrawingState.startPoint || !rectangleDrawingState.drawingRect) {
      return;
    }

    const { drawingRect, drawingText } = rectangleDrawingState;

    let bounds = {
      x: Math.round(drawingRect.left || 0),
      y: Math.round(drawingRect.top || 0),
      width: Math.round(drawingRect.width || 0),
      height: Math.round(drawingRect.height || 0)
    };

    // Clean up preview elements
    canvas.remove(drawingRect);
    if (drawingText) {
      canvas.remove(drawingText);
    }

    // Reset drawing state
    setRectangleDrawingState({
      isDrawing: false,
      startPoint: null,
      drawingRect: null,
      drawingText: null,
      isValidSize: false
    });

    // Enforce minimum size constraints
    if (bounds.width < minAreaSize || bounds.height < minAreaSize) {
      // Auto-expand to minimum size if close enough (within 20px)
      if (bounds.width > minAreaSize - 20 && bounds.height > minAreaSize - 20) {
        if (bounds.width < minAreaSize) {
          const expansion = minAreaSize - bounds.width;
          bounds.width = minAreaSize;
          bounds.x = Math.max(0, bounds.x - expansion / 2);
        }
        if (bounds.height < minAreaSize) {
          const expansion = minAreaSize - bounds.height;
          bounds.height = minAreaSize;
          bounds.y = Math.max(0, bounds.y - expansion / 2);
        }
      } else {
        // Show validation message for areas that are too small
        logger.warn(`Area too small: ${bounds.width}×${bounds.height}px. Minimum size is ${minAreaSize}×${minAreaSize}px`);
        canvas.renderAll();
        return;
      }
    }

    // Create the area if it meets size requirements
    if (collisionDrawingMode && onCollisionAreaDrawn) {
      onCollisionAreaDrawn(bounds);
    } else if (onAreaDrawn) {
      onAreaDrawn(bounds);
    }

    // Force immediate re-render of areas after creation
    if (onForceRender) {
      setTimeout(() => {
        onForceRender();
      }, 100);
    }

    canvas.renderAll();
  }, [canvas, rectangleDrawingState, onAreaDrawn, onCollisionAreaDrawn, collisionDrawingMode, minAreaSize, onForceRender]);

  return {
    rectangleDrawingState,
    handleDrawingStart,
    handleDrawingMove,
    handleDrawingEnd
  };
}

