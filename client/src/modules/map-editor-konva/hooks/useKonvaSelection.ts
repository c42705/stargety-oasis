/**
 * Konva Map Editor - Selection Hook
 * 
 * Handles shape selection with single-click, Ctrl+click multi-select,
 * and drag-to-select rectangle.
 */

import { useState, useCallback, useRef } from 'react';
import type {
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
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
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
    selectedIds,
    onSelectionChange,
  } = params;

  // Note: selectedIds is now controlled by the parent component
  // We use onSelectionChange to update the parent's state
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionStart, setSelectionStart] = useState<SelectionStart | null>(null);
  const [ctrlPressed, setCtrlPressed] = useState(false);

  // Refs to track selection state (for use in event handlers where state is stale)
  const selectionStateRef = useRef({
    isDrawing: false,
    rect: null as SelectionRect | null,
    start: null as SelectionStart | null,
  });

  // ==========================================================================
  // SELECTION UTILITIES
  // ==========================================================================

  /**
   * Expand selection to include all group members
   * If a shape is part of a group, include all shapes in that group
   */
  const expandSelectionWithGroups = useCallback(
    (ids: string[]): string[] => {
      const expanded = new Set<string>();

      ids.forEach(id => {
        const shape = shapes.find(s => s.id === id);
        if (shape?.metadata.groupId) {
          // Add all shapes in this group
          shapes
            .filter(s => s.metadata.groupId === shape.metadata.groupId)
            .forEach(s => expanded.add(s.id));
        } else {
          // Add the shape itself
          expanded.add(id);
        }
      });

      return Array.from(expanded);
    },
    [shapes]
  );

  /**
   * Update selection by notifying parent (controlled component pattern)
   */
  const updateSelection = useCallback(
    (ids: string[]) => {
      onSelectionChange(ids);
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
   * If shape is part of a group, selects all shapes in the group
   */
  const handleShapeClick = useCallback(
    (shapeId: string, e: any) => {
      if (!enabled) return;

      e.cancelBubble = true; // Prevent stage click

      const ctrlPressed = e.evt.ctrlKey || e.evt.metaKey;

      // Find the clicked shape
      const clickedShape = shapes.find(s => s.id === shapeId);
      if (!clickedShape) return;

      // Check if shape is part of a group
      const groupId = clickedShape.metadata.groupId;

      if (groupId) {
        // Select all shapes in the group
        const groupShapeIds = shapes
          .filter(s => s.metadata.groupId === groupId)
          .map(s => s.id);

        if (ctrlPressed) {
          // Toggle group selection
          const allGroupSelected = groupShapeIds.every(id => selectedIds.includes(id));
          if (allGroupSelected) {
            // Deselect all shapes in group
            updateSelection(selectedIds.filter(id => !groupShapeIds.includes(id)));
          } else {
            // Add all shapes in group to selection
            const combined = [...selectedIds, ...groupShapeIds];
            const newSelection = combined.filter((id, index) => combined.indexOf(id) === index);
            updateSelection(newSelection);
          }
        } else {
          // Select only this group
          updateSelection(groupShapeIds);
        }
      } else {
        // Shape is not grouped - normal selection behavior
        if (ctrlPressed) {
          // Toggle selection
          toggleShape(shapeId);
        } else {
          // Single selection
          selectShape(shapeId);
        }
      }
    },
    [enabled, shapes, selectedIds, toggleShape, selectShape, updateSelection]
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

      // Track Ctrl/Cmd key for multi-select
      const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;
      setCtrlPressed(isCtrlPressed);

      // Only start selection rectangle if clicking on stage (not on a shape)
      const clickedOnEmpty = e.target === e.target.getStage();

      if (!clickedOnEmpty) return;

      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();

      if (!pointerPosition) return;

      // Convert screen coordinates to world coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const pos = transform.point(pointerPosition);

      // Store both screen and world coordinates for threshold checking
      const newStart = {
        screenX: pointerPosition.x,
        screenY: pointerPosition.y,
        worldX: pos.x,
        worldY: pos.y,
      };

      setSelectionStart(newStart);

      // Update ref immediately so handleMouseMove can access the latest value
      selectionStateRef.current.start = newStart;
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

      // If we have a selection start but haven't started drawing yet
      // Use ref values instead of state to avoid stale closures
      if (selectionStateRef.current.start && !selectionStateRef.current.isDrawing) {
        const selectionStart = selectionStateRef.current.start;

        // Check if we've moved more than threshold from the start position (in screen pixels)
        const dx = Math.abs(pointerPosition.x - selectionStart.screenX);
        const dy = Math.abs(pointerPosition.y - selectionStart.screenY);

        if (dx > SELECTION.MIN_DRAG_DISTANCE || dy > SELECTION.MIN_DRAG_DISTANCE) {
          // Start drawing the selection rectangle
          // Convert screen coordinates to world coordinates
          const transform = stage.getAbsoluteTransform().copy().invert();
          const pos = transform.point(pointerPosition);

          const newRect = {
            x: selectionStart.worldX,
            y: selectionStart.worldY,
            width: pos.x - selectionStart.worldX,
            height: pos.y - selectionStart.worldY,
          };

          setIsDrawingSelection(true);
          setSelectionRect(newRect);

          // Update ref immediately so handleMouseUp can access the latest value
          selectionStateRef.current.isDrawing = true;
          selectionStateRef.current.rect = newRect;
        }
      } else if (isDrawingSelection && selectionStart) {
        // Continue drawing the selection rectangle
        // Convert screen coordinates to world coordinates
        const transform = stage.getAbsoluteTransform().copy().invert();
        const pos = transform.point(pointerPosition);

        const newRect = {
          x: selectionStart.worldX,
          y: selectionStart.worldY,
          width: pos.x - selectionStart.worldX,
          height: pos.y - selectionStart.worldY,
        };

        setSelectionRect(newRect);

        // Update ref immediately so handleMouseUp can access the latest value
        selectionStateRef.current.rect = newRect;
      }
    },
    [enabled, isDrawingSelection, selectionStart]
  );

  /**
   * Handle mouse up - complete selection rectangle
   */
  const handleMouseUp = useCallback(() => {
    if (!enabled) return;

    // Clear the selection start
    setSelectionStart(null);

    // If we were drawing a selection rectangle, process it
    // Use ref values instead of state to avoid stale closures
    if (selectionStateRef.current.isDrawing && selectionStateRef.current.rect) {
      const selectionRect = selectionStateRef.current.rect;
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
        } else if (shape.geometry.type === 'image') {
          const img = shape.geometry;
          // Check if image rectangle intersects with selection box
          intersects = !(
            img.x + img.width < box.x ||
            img.x > box.x + box.width ||
            img.y + img.height < box.y ||
            img.y > box.y + box.height
          );
        }

        if (intersects) {
          selected.push(shape.id);
        }
      });

      // If Ctrl is pressed, add to existing selection; otherwise replace
      const baseSelection = ctrlPressed ? [...selectedIds, ...selected] : selected;

      // Expand selection to include all group members
      const finalSelection = expandSelectionWithGroups(baseSelection);

      updateSelection(finalSelection);
      setSelectionRect(null);
      setCtrlPressed(false);
    }

    // Clear ref state
    selectionStateRef.current.isDrawing = false;
    selectionStateRef.current.rect = null;
    selectionStateRef.current.start = null;
  }, [enabled, shapes, updateSelection, ctrlPressed, selectedIds, expandSelectionWithGroups]);

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

