/**
 * Interactive Renderer Hook
 * 
 * Manages rendering of interactive areas on the canvas. Interactive areas are
 * displayed as colored rectangles with text labels.
 */

import { useCallback } from 'react';
import * as fabric from 'fabric';
import { InteractiveArea } from '../../../shared/MapDataContext';
import { CanvasObject } from '../types/fabricCanvas.types';
import { getContrastColor } from '../utils/colorUtils';

export interface UseInteractiveRendererOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Interactive areas from SharedMap */
  interactiveAreas: InteractiveArea[];
}

export interface UseInteractiveRendererResult {
  /** Render interactive areas on the canvas */
  renderInteractiveAreas: () => void;
}

/**
 * Hook for managing interactive area rendering
 */
export function useInteractiveRenderer(options: UseInteractiveRendererOptions): UseInteractiveRendererResult {
  const { canvas, interactiveAreas } = options;

  /**
   * Render interactive areas on the canvas
   * Removes existing areas and creates new ones from SharedMap data
   */
  const renderInteractiveAreas = useCallback(() => {
    if (!canvas || !interactiveAreas) return;

    // Remove existing interactive area objects
    const existingAreas = canvas.getObjects().filter(obj =>
      (obj as CanvasObject).mapElementType === 'interactive'
    );
    existingAreas.forEach(obj => canvas.remove(obj));

    // Add interactive areas
    interactiveAreas.forEach(area => {
      const rect = new fabric.Rect({
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        fill: area.color,
        opacity: 0.7,
        stroke: area.color,
        strokeWidth: 2,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: false
      }) as CanvasObject;

      // Add metadata
      rect.mapElementId = area.id;
      rect.mapElementType = 'interactive';
      rect.mapElementData = area;

      // Add text label with better contrast
      const textColor = getContrastColor(area.color);
      const text = new fabric.Text(area.name, {
        left: area.x + area.width / 2,
        top: area.y + area.height / 2,
        fontSize: Math.min(14, Math.max(10, area.width / 8)),
        fill: textColor,
        backgroundColor: textColor === '#000000' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        padding: 2
      });

      const group = new fabric.Group([rect, text], {
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: false
      }) as CanvasObject;

      group.mapElementId = area.id;
      group.mapElementType = 'interactive';
      group.mapElementData = area;

      canvas.add(group);
    });

    // Note: Layer order will be coordinated after all elements are loaded
    canvas.renderAll();
  }, [canvas, interactiveAreas]);

  return {
    renderInteractiveAreas
  };
}

