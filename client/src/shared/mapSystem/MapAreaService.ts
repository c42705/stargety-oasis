/**
 * Map Area Service
 *
 * Handles CRUD operations for interactive and collision areas.
 */

import { InteractiveArea, ImpassableArea } from '../MapDataContext';
import { SharedMapData, MapChange } from './types';
import { MapHistoryManager } from './MapHistoryManager';

export interface AreaOperationResult {
  success: boolean;
  error?: string;
}

/**
 * MapAreaService - Handles area CRUD operations
 */
export class MapAreaService {
  private historyManager: MapHistoryManager;

  constructor(historyManager: MapHistoryManager) {
    this.historyManager = historyManager;
  }

  /**
   * Add interactive area to map data
   */
  addInteractiveArea(mapData: SharedMapData, area: InteractiveArea): AreaOperationResult {
    mapData.interactiveAreas.push(area);
    this.historyManager.recordChange(MapHistoryManager.createChange('add', 'area', null, area));
    return { success: true };
  }

  /**
   * Update interactive area
   */
  updateInteractiveArea(
    mapData: SharedMapData,
    id: string,
    updates: Partial<InteractiveArea>
  ): AreaOperationResult {
    const areaIndex = mapData.interactiveAreas.findIndex((area) => area.id === id);
    if (areaIndex === -1) {
      return { success: false, error: `Interactive area with id ${id} not found` };
    }

    const previousArea = { ...mapData.interactiveAreas[areaIndex] };
    mapData.interactiveAreas[areaIndex] = { ...previousArea, ...updates };

    this.historyManager.recordChange(
      MapHistoryManager.createChange('update', 'area', previousArea, mapData.interactiveAreas[areaIndex])
    );
    return { success: true };
  }

  /**
   * Remove interactive area
   */
  removeInteractiveArea(mapData: SharedMapData, id: string): { success: boolean; removedArea?: InteractiveArea; error?: string } {
    const areaIndex = mapData.interactiveAreas.findIndex((area) => area.id === id);
    if (areaIndex === -1) {
      return { success: false, error: `Interactive area with id ${id} not found` };
    }

    const removedArea = mapData.interactiveAreas[areaIndex];
    mapData.interactiveAreas.splice(areaIndex, 1);

    this.historyManager.recordChange(MapHistoryManager.createChange('remove', 'area', removedArea, null));
    return { success: true, removedArea };
  }

  /**
   * Add collision area to map data
   */
  addCollisionArea(mapData: SharedMapData, area: ImpassableArea): AreaOperationResult {
    mapData.impassableAreas.push(area);
    this.historyManager.recordChange(MapHistoryManager.createChange('add', 'collision', null, area));
    return { success: true };
  }

  /**
   * Update collision area
   */
  updateCollisionArea(
    mapData: SharedMapData,
    id: string,
    updates: Partial<ImpassableArea>
  ): AreaOperationResult {
    const areaIndex = mapData.impassableAreas.findIndex((area) => area.id === id);
    if (areaIndex === -1) {
      return { success: false, error: `Collision area with id ${id} not found` };
    }

    const previousArea = { ...mapData.impassableAreas[areaIndex] };
    mapData.impassableAreas[areaIndex] = { ...previousArea, ...updates };

    this.historyManager.recordChange(
      MapHistoryManager.createChange('update', 'collision', previousArea, mapData.impassableAreas[areaIndex])
    );
    return { success: true };
  }

  /**
   * Remove collision area
   */
  removeCollisionArea(mapData: SharedMapData, id: string): { success: boolean; removedArea?: ImpassableArea; error?: string } {
    const areaIndex = mapData.impassableAreas.findIndex((area) => area.id === id);
    if (areaIndex === -1) {
      return { success: false, error: `Collision area with id ${id} not found` };
    }

    const removedArea = mapData.impassableAreas[areaIndex];
    mapData.impassableAreas.splice(areaIndex, 1);

    this.historyManager.recordChange(MapHistoryManager.createChange('remove', 'collision', removedArea, null));
    return { success: true, removedArea };
  }

  /**
   * Get updated area after update operation
   */
  getInteractiveArea(mapData: SharedMapData, id: string): InteractiveArea | undefined {
    return mapData.interactiveAreas.find((area) => area.id === id);
  }

  /**
   * Get collision area by id
   */
  getCollisionArea(mapData: SharedMapData, id: string): ImpassableArea | undefined {
    return mapData.impassableAreas.find((area) => area.id === id);
  }
}

