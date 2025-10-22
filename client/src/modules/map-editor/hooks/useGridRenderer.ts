/**
 * Grid Renderer Hook
 * 
 * Manages rendering of the grid overlay on the canvas using SVG patterns.
 * Handles grid visibility, spacing, pattern selection, and opacity.
 */

import { useCallback } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { GRID_PATTERNS } from '../constants/editorConstants';

export interface UseGridRendererOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Whether grid is visible */
  gridVisible: boolean;
  /** Grid spacing in pixels */
  gridSpacing: number;
  /** Grid pattern ID */
  gridPattern: string;
  /** Grid opacity (0-100) */
  gridOpacity: number;
  /** Callback to update layer order after grid is rendered */
  onUpdateLayerOrder: () => void;
}

export interface UseGridRendererResult {
  /** Render the grid overlay */
  renderGrid: () => void;
}

/**
 * Hook for managing grid rendering
 */
export function useGridRenderer(options: UseGridRendererOptions): UseGridRendererResult {
  const {
    canvas,
    width,
    height,
    gridVisible,
    gridSpacing,
    gridPattern,
    gridOpacity,
    onUpdateLayerOrder
  } = options;

  /**
   * Render the grid overlay on the canvas
   */
  const renderGrid = useCallback(() => {
    if (!canvas) return;

    // Remove all existing grid objects robustly
    let gridObjectsRemoved = 0;
    canvas.getObjects().forEach(obj => {
      const isGrid =
        (obj as any).isGridPattern ||
        (obj as any).mapElementType === 'grid' ||
        (obj.type === 'rect' &&
          obj.width === width &&
          obj.height === height &&
          obj.selectable === false &&
          obj.evented === false &&
          obj.fill &&
          obj.opacity !== undefined);
      if (isGrid) {
        canvas.remove(obj);
        gridObjectsRemoved++;
      }
    });

    // If grid is not visible or spacing is invalid, just remove and return
    if (!gridVisible || gridSpacing <= 0) {
      canvas.renderAll();
      return;
    }

    // Find the pattern configuration
    const pattern = GRID_PATTERNS.find(p => p.id === gridPattern);
    if (!pattern) {
      logger.warn('Grid pattern not found', gridPattern);
      return;
    }

    // Load the SVG file directly and create a tiled pattern
    fabric.FabricImage.fromURL(pattern.imagePath, {
      crossOrigin: 'anonymous'
    }).then((img) => {
      if (!img || !canvas) return;

      // Scale the image to match the desired grid spacing
      const scale = gridSpacing / pattern.size;
      img.scale(scale);

      // Create a pattern from the scaled image
      const patternSourceCanvas = new fabric.StaticCanvas();
      patternSourceCanvas.setDimensions({ width: gridSpacing, height: gridSpacing });
      patternSourceCanvas.add(img);

      const fabricPattern = new fabric.Pattern({
        source: patternSourceCanvas.getElement(),
        repeat: 'repeat'
      });

      // Create a rectangle covering the entire canvas with the pattern
      const gridRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: fabricPattern,
        opacity: gridOpacity / 100,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        id: "grid",
        name: "Grid Pattern",
        locked: true,
      });

      // Add metadata to identify grid objects
      (gridRect as any).isGridPattern = true;
      (gridRect as any).mapElementType = 'grid';
      (gridRect as any).locked = true;
      (gridRect as any).id = "grid";
      (gridRect as any).name = "Grid Pattern";

      // Add grid to canvas
      canvas.add(gridRect);

      // Force layer order update to position grid correctly
      setTimeout(() => {
        if (canvas) {
          onUpdateLayerOrder();
        }
      }, 10);
    }).catch((error) => {
      logger.error('FAILED TO LOAD GRID PATTERN', error);
    });
  }, [canvas, width, height, gridVisible, gridSpacing, gridPattern, gridOpacity, onUpdateLayerOrder]);

  return {
    renderGrid
  };
}

