/**
 * Konva Map Editor - Accessibility Hook
 * 
 * Provides accessibility features for the map editor.
 */

import { useEffect, useCallback } from 'react';
import type { Shape, UseKonvaAccessibilityParams, UseKonvaAccessibilityReturn } from '../types';

/**
 * Hook for accessibility features
 * 
 * Provides ARIA labels, keyboard navigation, and screen reader support.
 * 
 * @example
 * ```typescript
 * const {
 *   getShapeAriaLabel,
 *   getCanvasAriaLabel,
 *   announceAction,
 * } = useKonvaAccessibility({
 *   shapes,
 *   selectedIds,
 *   enabled: true,
 * });
 * ```
 */
export function useKonvaAccessibility(
  params: UseKonvaAccessibilityParams
): UseKonvaAccessibilityReturn {
  const {
    shapes,
    selectedIds = [],
    enabled = true,
  } = params;

  /**
   * Get ARIA label for a shape
   */
  const getShapeAriaLabel = useCallback(
    (shape: Shape): string => {
      const type = shape.geometry.type;
      const category = shape.category;
      const name = shape.metadata?.name || `${type} ${shape.id.slice(0, 8)}`;
      const isSelected = selectedIds.includes(shape.id);

      return `${name}, ${category} ${type}${isSelected ? ', selected' : ''}`;
    },
    [selectedIds]
  );

  /**
   * Get ARIA label for the canvas
   */
  const getCanvasAriaLabel = useCallback((): string => {
    const shapeCount = shapes.length;
    const selectedCount = selectedIds.length;

    return `Map editor canvas with ${shapeCount} shapes, ${selectedCount} selected`;
  }, [shapes.length, selectedIds.length]);

  /**
   * Announce an action to screen readers
   */
  const announceAction = useCallback((message: string) => {
    if (!enabled) return;

    // Create a live region for announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [enabled]);

  /**
   * Get keyboard navigation instructions
   */
  const getKeyboardInstructions = useCallback((): string => {
    return [
      'Use arrow keys to navigate shapes',
      'Press Enter to select a shape',
      'Press Delete to remove selected shapes',
      'Press Ctrl+Z to undo',
      'Press Ctrl+Y to redo',
      'Press Ctrl+A to select all',
      'Press Escape to deselect',
    ].join('. ');
  }, []);

  /**
   * Get shape description for screen readers
   */
  const getShapeDescription = useCallback(
    (shape: Shape): string => {
      const type = shape.geometry.type;
      const category = shape.category;

      if (type === 'rectangle') {
        const rect = shape.geometry as any;
        return `Rectangle at position ${Math.round(rect.x)}, ${Math.round(rect.y)}, width ${Math.round(rect.width)}, height ${Math.round(rect.height)}`;
      } else if (type === 'polygon') {
        const poly = shape.geometry as any;
        const vertexCount = poly.points.length / 2;
        return `Polygon with ${vertexCount} vertices`;
      }

      return `${category} ${type}`;
    },
    []
  );

  // ==========================================================================
  // SETUP ACCESSIBILITY ATTRIBUTES
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    // Set up canvas accessibility attributes
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', getCanvasAriaLabel());
      canvas.setAttribute('tabindex', '0');
    }
  }, [enabled, getCanvasAriaLabel]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Utilities
    getShapeAriaLabel,
    getCanvasAriaLabel,
    getShapeDescription,
    getKeyboardInstructions,
    announceAction,

    // State
    enabled,
  };
}

