/**
 * Shape to Map Data Sync Utility
 * 
 * Centralizes the logic for syncing shape updates back to the map data store.
 * Eliminates duplicate code in transform and vertex edit handlers.
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

import type { Shape } from '../types';
import { shapeToInteractiveArea, shapeToImpassableArea, shapeToAsset } from './mapDataAdapter';

interface MapDataActions {
  updateInteractiveArea: (id: string, area: any) => void;
  updateCollisionArea: (id: string, area: any) => void;
  updateAsset: (id: string, asset: any) => void;
  markDirty: () => void;
}

/**
 * Sync a shape update to the appropriate map data store
 * 
 * @param shape - The updated shape
 * @param actions - Map data store actions
 */
export function syncShapeToMapData(shape: Shape, actions: MapDataActions): void {
  const { updateInteractiveArea, updateCollisionArea, updateAsset, markDirty } = actions;

  switch (shape.category) {
    case 'interactive': {
      const interactiveArea = shapeToInteractiveArea(shape);
      updateInteractiveArea(shape.id, interactiveArea);
      markDirty();
      break;
    }
    case 'collision': {
      const collisionArea = shapeToImpassableArea(shape);
      updateCollisionArea(shape.id, collisionArea);
      markDirty();
      break;
    }
    case 'asset': {
      const asset = shapeToAsset(shape);
      updateAsset(shape.id, asset);
      markDirty();
      break;
    }
  }
}

/**
 * Create a shape update handler with automatic map data sync
 * 
 * @param shapes - Current shapes array
 * @param setShapes - Shape state setter
 * @param actions - Map data store actions
 * @param history - History hook for undo/redo
 * @param historyLabel - Label for the history entry
 * @returns Handler function for shape updates
 */
export function createShapeUpdateHandler(
  shapes: Shape[],
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>,
  actions: MapDataActions,
  history: { pushState: (label: string) => void },
  historyLabel: string
): (id: string, updates: Partial<Shape>) => void {
  return (id: string, updates: Partial<Shape>) => {
    // Update local shapes state
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

    // Find the updated shape and sync to map data store
    const existingShape = shapes.find((s) => s.id === id);
    if (existingShape) {
      const mergedShape = { ...existingShape, ...updates };
      syncShapeToMapData(mergedShape, actions);
    }

    history.pushState(historyLabel);
  };
}

