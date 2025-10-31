/**
 * Konva Map Editor POC - Shape Selection Hook
 * Handles shape selection with click
 */

import { useCallback } from 'react';

interface UseKonvaSelectionProps {
  enabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const useKonvaSelection = ({
  enabled,
  selectedIds,
  onSelectionChange,
}: UseKonvaSelectionProps) => {
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

  const isSelected = useCallback(
    (shapeId: string) => {
      return selectedIds.includes(shapeId);
    },
    [selectedIds]
  );

  return {
    handleShapeClick,
    handleStageClick,
    isSelected,
  };
};

