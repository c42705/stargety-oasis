/**
 * Konva Map Editor - Selection Hook
 * 
 * Handles shape selection with single-click, Ctrl+click multi-select,
 * and drag-to-select rectangle.
 */

import { useState, useCallback } from 'react';
import type {
  Viewport,
  Shape,
  UseKonvaSelectionParams,
  UseKonvaSelectionReturn,
} from '../types';
import { SELECTION } from '../constants/konvaConstants';

/**
 * Selection rectangle state
 */
interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Selection start position
 */
interface SelectionStart {
  x: number;
  y: number;
}

/**
 * Hook for shape selection functionality
 * 
 * Provides single-click selection, Ctrl+click multi-select, and drag-to-select rectangle.
 * 
 * @example
 * ```typescript
 * const {
 *   selectedIds,
 *   selectionRect,
 *   handleShapeClick,
 *   handleStageClick,
 *   handleMouseDown,
 *   handleMouseMove,
 *   handleMouseUp,
 *   isSelected,
 *   selectAll,
 *   clearSelection,
 * } = useKonvaSelection({
 *   enabled: currentTool === 'select',
 *   shapes,
 *   onSelectionChange: (ids) => setSelectedIds(ids),
 * });
 * ```
 */
export function useKonvaSelection(
  params: UseKonvaSelectionParams
): UseKonvaSelectionReturn {
  const {
    enabled = false,
    shapes,
    onSelectionChange,
    initialSelection = [],
  } = params;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionStart, setSelectionStart] = useState<SelectionStart | null>(null);

  // ==========================================================================
  // SELECTION UTILITIES
  // ==========================================================================

  /**
   * Update selection and notify parent
   */
  const updateSelection = useCallback(
    (ids: string[]) => {
      setSelectedIds(ids);
      onSelectionChange?.(ids);
    },
    [onSelectionChange]
  );

  /**
   * Check if a shape is selected
   */
  const isSelected = useCallback(
    (shapeId: string): boolean => {
      return selectedIds.includes(shapeId);
    },
    [selectedIds]
  );

  /**
   * Select all shapes
   */
  const selectAll = useCallback(() => {
    const allIds = shapes.map((shape) => shape.id);
    updateSelection(allIds);
  }, [shapes, updateSelection]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    updateSelection([]);
  }, [updateSelection]);

  /**
   * Select single shape
   */
  const selectShape = useCallback(
    (shapeId: string) => {
      updateSelection([shapeId]);
    },
    [updateSelection]
  );

  /**
   * Toggle shape selection (for Ctrl+click)
   */
  const toggleShape = useCallback(
    (shapeId: string) => {
      if (selectedIds.includes(shapeId)) {
        updateSelection(selectedIds.filter((id) => id !== shapeId));
      } else {
        updateSelection([...selectedIds, shapeId]);
      }
    },
    [selectedIds, updateSelection]
  );

  // ==========================================================================
  // SHAPE CLICK HANDLER
  // ==========================================================================

  /**
   * Handle shape click - single select or multi-select with Ctrl
   */
  const handleShapeClick = useCallback(
    (shapeId: string, e: any) => {
      if (!enabled) return;

      e.cancelBubble = true; // Prevent stage click

      const ctrlPressed = e.evt.ctrlKey || e.evt.metaKey;

      if (ctrlPressed) {
        // Toggle selection
        toggleShape(shapeId);
      } else {
        // Single selection
        selectShape(shapeId);
      }
    },
    [enabled, toggleShape, selectShape]
  );

  // ==========================================================================
  // STAGE CLICK HANDLER
  // ==========================================================================

  /**
   * Handle stage click - clear selection if clicking on empty area
   */
  const handleStageClick = useCallback(
    (e: any) => {
      if (!enabled) return;

      // Only deselect if clicking on the stage itself (not a shape)
      if (e.target === e.target.getStage()) {
        clearSelection();
      }
    },
    [enabled, clearSelection]
  );

  // ==========================================================================
  // DRAG-TO-SELECT HANDLERS
  // ==========================================================================

  /**
   * Handle mouse down - start selection rectangle
   */
  const handleMouseDown = useCallback(
    (e: any) => {
      if (!enabled) return;

      // Only start selection rectangle if clicking on stage (not on a shape)
      const clickedOnEmpty = e.target === e.target.getStage();
      if (!clickedOnEmpty) return;

      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();

      if (!pointerPosition) return;

      // Convert screen coordinates to world coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const pos = transform.point(pointerPosition);

      // Store the starting position
      setSelectionStart({
        x: pos.x,
        y: pos.y,
      });
    },
    [enabled]
  );

  /**
   * Handle mouse move - update selection rectangle
   */
  const handleMouseMove = useCallback(
    (e: any) => {
      if (!enabled) return;

      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();

      if (!pointerPosition) return;

      // Convert screen coordinates to world coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const pos = transform.point(pointerPosition);

      // If we have a selection start but haven't started drawing yet
      if (selectionStart && !isDrawingSelection) {
        // Check if we've moved more than threshold from the start position
        const dx = Math.abs(pos.x - selectionStart.x);
        const dy = Math.abs(pos.y - selectionStart.y);

        if (dx > SELECTION.MIN_DRAG_DISTANCE || dy > SELECTION.MIN_DRAG_DISTANCE) {
          // Start drawing the selection rectangle
          setIsDrawingSelection(true);
          setSelectionRect({
            x: selectionStart.x,
            y: selectionStart.y,
            width: pos.x - selectionStart.x,
            height: pos.y - selectionStart.y,
          });
        }
      } else if (isDrawingSelection && selectionRect) {
        // Continue drawing the selection rectangle
        setSelectionRect({
          x: selectionRect.x,
          y: selectionRect.y,
          width: pos.x - selectionRect.x,
          height: pos.y - selectionRect.y,
        });
      }
    },
    [enabled, isDrawingSelection, selectionRect, selectionStart]
  );

  /**
   * Handle mouse up - complete selection rectangle
   */
  const handleMouseUp = useCallback(() => {
    if (!enabled) return;

    // Clear the selection start
    setSelectionStart(null);

    // If we were drawing a selection rectangle, process it
    if (isDrawingSelection && selectionRect) {
      setIsDrawingSelection(false);

      // Calculate normalized selection rectangle (handle negative width/height)
      const box = {
        x: selectionRect.width >= 0 ? selectionRect.x : selectionRect.x + selectionRect.width,
        y: selectionRect.height >= 0 ? selectionRect.y : selectionRect.y + selectionRect.height,
        width: Math.abs(selectionRect.width),
        height: Math.abs(selectionRect.height),
      };

      // Find shapes that intersect with the selection rectangle
      const selected: string[] = [];

      shapes.forEach((shape) => {
        let intersects = false;

        if (shape.geometry.type === 'rectangle') {
          const rect = shape.geometry;
          // Check if rectangles intersect
          intersects = !(
            rect.x + rect.width < box.x ||
            rect.x > box.x + box.width ||
            rect.y + rect.height < box.y ||
            rect.y > box.y + box.height
          );
        } else if (shape.geometry.type === 'polygon') {
          const poly = shape.geometry;
          
          // Check if any point of the polygon is inside the selection box
          for (let i = 0; i < poly.points.length; i += 2) {
            const px = poly.points[i];
            const py = poly.points[i + 1];

            if (
              px >= box.x &&
              px <= box.x + box.width &&
              py >= box.y &&
              py <= box.y + box.height
            ) {
              intersects = true;
              break;
            }
          }
        }

        if (intersects) {
          selected.push(shape.id);
        }
      });

      updateSelection(selected);
      setSelectionRect(null);
    }
  }, [enabled, isDrawingSelection, selectionRect, shapes, updateSelection]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    selectedIds,
    selectionRect,
    isDrawingSelection,

    // Selection queries
    isSelected,
    selectedCount: selectedIds.length,
    hasSelection: selectedIds.length > 0,

    // Event handlers
    handleShapeClick,
    handleStageClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    // Actions
    selectAll,
    clearSelection,
    selectShape,
    toggleShape,
  };
}

