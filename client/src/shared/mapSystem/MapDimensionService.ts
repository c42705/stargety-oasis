/**
 * Map Dimension Service
 *
 * Handles dimension validation, detection, and synchronization with WorldDimensionsManager.
 */

import { worldDimensionsManager } from '../WorldDimensionsManager';
import { logger } from '../logger';
import { SharedMapData, MapChange } from './types';
import { MapHistoryManager } from './MapHistoryManager';
import { MapPersistenceService } from './MapPersistenceService';

export interface DimensionUpdateResult {
  success: boolean;
  dimensions: { width: number; height: number };
  error?: string;
}

/**
 * MapDimensionService - Handles dimension operations
 */
export class MapDimensionService {
  private historyManager: MapHistoryManager;
  private persistenceService: MapPersistenceService;

  constructor(historyManager: MapHistoryManager, persistenceService: MapPersistenceService) {
    this.historyManager = historyManager;
    this.persistenceService = persistenceService;
  }

  /**
   * Get effective dimensions from map data
   */
  getEffectiveDimensions(mapData: SharedMapData | null): { width: number; height: number } {
    const wdmDimensions = worldDimensionsManager.getEffectiveDimensions();
    if (wdmDimensions.width > 0 && wdmDimensions.height > 0) {
      return { ...wdmDimensions };
    }

    if (mapData) {
      if (mapData.backgroundImageDimensions) {
        return { ...mapData.backgroundImageDimensions };
      }
      if (mapData.worldDimensions) {
        return { ...mapData.worldDimensions };
      }
    }

    return { width: 7603, height: 3679 };
  }

  /**
   * Update dimensions from background image
   */
  updateFromBackgroundImage(
    mapData: SharedMapData,
    imageUrl: string,
    imageDimensions: { width: number; height: number }
  ): DimensionUpdateResult {
    const validatedDimensions = this.persistenceService.validateAndScaleDimensions(
      imageDimensions.width,
      imageDimensions.height
    );

    const previousDimensions = this.getEffectiveDimensions(mapData);

    try {
      const backgroundUpdateResult = worldDimensionsManager.updateBackgroundDimensions(validatedDimensions, {
        source: 'background',
        skipPersistence: true,
      });

      if (!backgroundUpdateResult.isValid) {
        return { success: false, dimensions: validatedDimensions, error: backgroundUpdateResult.errors.join(', ') };
      }

      mapData.backgroundImage = imageUrl;
      mapData.backgroundImageDimensions = backgroundUpdateResult.dimensions;
      mapData.worldDimensions = backgroundUpdateResult.dimensions;

      this.historyManager.recordChange(
        MapHistoryManager.createChange('update', 'worldDimensions', { worldDimensions: previousDimensions }, { worldDimensions: validatedDimensions })
      );

      return { success: true, dimensions: backgroundUpdateResult.dimensions };
    } catch (error) {
      logger.error('[MapDimensionService] Failed to sync background with WorldDimensionsManager', error);
      mapData.backgroundImage = imageUrl;
      mapData.backgroundImageDimensions = validatedDimensions;
      mapData.worldDimensions = validatedDimensions;

      this.historyManager.recordChange(
        MapHistoryManager.createChange('update', 'worldDimensions', { worldDimensions: previousDimensions }, { worldDimensions: validatedDimensions })
      );

      return { success: true, dimensions: validatedDimensions };
    }
  }

  /**
   * Update world dimensions manually
   */
  updateWorldDimensions(
    mapData: SharedMapData,
    dimensions: { width: number; height: number },
    source: 'world' | 'editor' | 'migration' = 'editor'
  ): DimensionUpdateResult {
    const maxDimensions = MapPersistenceService.getMaxDimensions();

    if (dimensions.width <= 0 || dimensions.height <= 0) {
      return { success: false, dimensions, error: 'World dimensions must be positive numbers' };
    }

    if (dimensions.width > maxDimensions.width || dimensions.height > maxDimensions.height) {
      return { success: false, dimensions, error: `World dimensions exceed maximum (${maxDimensions.width}×${maxDimensions.height})` };
    }

    if (dimensions.width < 400 || dimensions.height < 300) {
      return { success: false, dimensions, error: 'World dimensions are below minimum (400×300)' };
    }

    const previousDimensions = this.getEffectiveDimensions(mapData);

    try {
      const updateResult = worldDimensionsManager.updateDimensions(dimensions, {
        source: source === 'world' ? 'world' : 'editor',
        syncBackground: true,
        skipPersistence: true,
      });

      if (!updateResult.isValid) {
        return { success: false, dimensions, error: updateResult.errors.join(', ') };
      }

      mapData.worldDimensions = updateResult.dimensions;
      mapData.backgroundImageDimensions = updateResult.dimensions;

      this.historyManager.recordChange(
        MapHistoryManager.createChange('update', 'worldDimensions', { worldDimensions: previousDimensions }, { worldDimensions: dimensions })
      );

      return { success: true, dimensions: updateResult.dimensions };
    } catch (error) {
      logger.error('[MapDimensionService] Failed to sync with WorldDimensionsManager', error);
      mapData.worldDimensions = dimensions;
      mapData.backgroundImageDimensions = dimensions;

      this.historyManager.recordChange(
        MapHistoryManager.createChange('update', 'worldDimensions', { worldDimensions: previousDimensions }, { worldDimensions: dimensions })
      );

      return { success: true, dimensions };
    }
  }

  /**
   * Detect and update dimensions from actual loaded image
   */
  async detectAndUpdateFromImage(
    mapData: SharedMapData,
    imageUrl?: string
  ): Promise<{ updated: boolean; dimensions: { width: number; height: number } }> {
    const targetImageUrl = imageUrl || mapData.backgroundImage;
    if (!targetImageUrl) {
      return { updated: false, dimensions: this.getEffectiveDimensions(mapData) };
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const actualDimensions = { width: img.width, height: img.height };
        const storedDimensions = this.getEffectiveDimensions(mapData);

        if (actualDimensions.width !== storedDimensions.width || actualDimensions.height !== storedDimensions.height) {
          this.updateFromBackgroundImage(mapData, targetImageUrl, actualDimensions);
          resolve({ updated: true, dimensions: actualDimensions });
        } else {
          resolve({ updated: false, dimensions: storedDimensions });
        }
      };

      img.onerror = (error) => {
        reject(new Error(`Failed to load image for dimension detection: ${targetImageUrl}`));
      };

      img.src = targetImageUrl;
    });
  }
}

