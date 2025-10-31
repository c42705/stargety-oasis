/**
 * Konva Map Editor POC - Shape Selection Hook
 * Handles shape selection with click and drag-to-select
 */

import { useState, useCallback } from 'react';
import { POCShape } from '../types/konva.types';

interface UseKonvaSelectionProps {
  enabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  shapes: POCShape[];
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionStart {
  x: number;
  y: number;
}

export const useKonvaSelection = ({
  enabled,
  selectedIds,
  onSelectionChange,
  shapes,
}: UseKonvaSelectionProps) => {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionStart, setSelectionStart] = useState<SelectionStart | null>(null);

  const handleShapeClick = useCallback(
    (shapeId: string, e: any) => {
      if (!enabled) return;

      e.cancelBubble = true; // Prevent stage click

      const ctrlPressed = e.evt.ctrlKey || e.evt.metaKey;

      if (ctrlPressed) {
        // Toggle selection
        if (selectedIds.includes(shapeId)) {
          onSelectionChange(selectedIds.filter((id) => id !== shapeId));
        } else {
          onSelectionChange([...selectedIds, shapeId]);
        }
      } else {
        // Single selection
        onSelectionChange([shapeId]);
      }
    },
    [enabled, selectedIds, onSelectionChange]
  );

  const handleStageClick = useCallback(
    (e: any) => {
      if (!enabled) return;

      // Only deselect if clicking on the stage itself (not a shape)
      if (e.target === e.target.getStage()) {
        onSelectionChange([]);
      }
    },
    [enabled, onSelectionChange]
  );

  const handleMouseDown = useCallback(
    (e: any) => {
      if (!enabled) return;

      // Only start selection rectangle if clicking on stage (not on a shape)
      const clickedOnEmpty = e.target === e.target.getStage();
      if (!clickedOnEmpty) return;

      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();

      if (!pointerPosition) return;

      // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
      const transform = stage.getAbsoluteTransform().copy().invert();
      const pos = transform.point(pointerPosition);

      // Store the starting position, but don't start drawing yet
      // We'll only start drawing if the mouse moves more than a threshold
      setSelectionStart({
        x: pos.x,
        y: pos.y,
      });
    },
    [enabled]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!enabled) return;

      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();

      if (!pointerPosition) return;

      // Convert screen coordinates to canvas coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const pos = transform.point(pointerPosition);

      // If we have a selection start but haven't started drawing yet
      if (selectionStart && !isDrawingSelection) {
        // Check if we've moved more than 5px from the start position
        const dx = Math.abs(pos.x - selectionStart.x);
        const dy = Math.abs(pos.y - selectionStart.y);

        if (dx > 5 || dy > 5) {
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

  const handleMouseUp = useCallback(
    () => {
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

          if (shape.geometry.type === 'rect') {
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
            const x = poly.x || 0;
            const y = poly.y || 0;

            // Check if any point of the polygon is inside the selection box
            for (let i = 0; i < poly.points.length; i += 2) {
              const px = poly.points[i] + x;
              const py = poly.points[i + 1] + y;

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

        onSelectionChange(selected);
        setSelectionRect(null);
      }
    },
    [enabled, isDrawingSelection, selectionRect, selectionStart, shapes, onSelectionChange]
  );

  const isSelected = useCallback(
    (shapeId: string) => {
      return selectedIds.includes(shapeId);
    },
    [selectedIds]
  );

  return {
    handleShapeClick,
    handleStageClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isSelected,
    selectionRect,
    isDrawingSelection,
  };
};

