/**
 * Area Deletion Hook
 * 
 * Manages the workflow for deleting interactive and collision areas,
 * including confirmation dialog state and deletion execution.
 */

import { useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { AreaDeletionState } from '../types/fabricCanvas.types';

export interface UseAreaDeletionOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Callback to remove interactive area from shared map */
  onRemoveInteractiveArea: (id: string) => Promise<void>;
}

export interface UseAreaDeletionResult {
  /** Current area deletion state */
  areaDeletionState: AreaDeletionState;
  /** Initiate deletion for selected areas */
  handleDeleteSelectedAreas: (selectedObjects: fabric.Object[]) => void;
  /** Confirm and execute deletion */
  handleConfirmDeletion: () => Promise<void>;
  /** Cancel deletion */
  handleCancelDeletion: () => void;
}

/**
 * Hook for managing area deletion workflow
 */
export function useAreaDeletion(options: UseAreaDeletionOptions): UseAreaDeletionResult {
  const { canvas, onRemoveInteractiveArea } = options;

  // Area deletion state
  const [areaDeletionState, setAreaDeletionState] = useState<AreaDeletionState>({
    showDeleteDialog: false,
    areasToDelete: []
  });

  /**
   * Initiate deletion for selected areas
   * Shows confirmation dialog with list of areas to delete
   */
  const handleDeleteSelectedAreas = useCallback((selectedObjects: fabric.Object[]) => {
    if (!canvas) return;

    const areas: { id: string; name: string }[] = [];

    // Collect area data to delete
    selectedObjects.forEach(obj => {
      const mapData = (obj as any).mapElementData;
      if (mapData && mapData.id) {
        areas.push({ id: mapData.id, name: mapData.name || 'Unnamed Area' });
      }
    });

    if (areas.length === 0) return;

    // Show confirmation dialog
    setAreaDeletionState({
      showDeleteDialog: true,
      areasToDelete: areas
    });
  }, [canvas]);

  /**
   * Confirm and execute deletion
   * Removes areas from shared map and canvas
   */
  const handleConfirmDeletion = useCallback(async () => {
    if (!canvas || areaDeletionState.areasToDelete.length === 0) return;

    try {
      // Remove from shared map system
      for (const area of areaDeletionState.areasToDelete) {
        await onRemoveInteractiveArea(area.id);
      }

      // Remove from canvas
      const activeObjects = canvas.getActiveObjects();
      activeObjects.forEach(obj => {
        const mapData = (obj as any).mapElementData;
        if (mapData && areaDeletionState.areasToDelete.some(area => area.id === mapData.id)) {
          canvas.remove(obj);
        }
      });

      canvas.discardActiveObject();
      canvas.renderAll();
    } catch (error) {
      logger.error('Failed to delete areas', error);
    } finally {
      setAreaDeletionState({
        showDeleteDialog: false,
        areasToDelete: []
      });
    }
  }, [canvas, areaDeletionState.areasToDelete, onRemoveInteractiveArea]);

  /**
   * Cancel deletion
   * Closes dialog without deleting areas
   */
  const handleCancelDeletion = useCallback(() => {
    setAreaDeletionState({
      showDeleteDialog: false,
      areasToDelete: []
    });
  }, []);

  return {
    areaDeletionState,
    handleDeleteSelectedAreas,
    handleConfirmDeletion,
    handleCancelDeletion
  };
}

