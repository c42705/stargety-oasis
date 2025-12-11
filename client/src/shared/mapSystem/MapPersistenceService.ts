/**
 * Map Persistence Service
 *
 * Handles PostgreSQL persistence via MapApiService.
 * Manages loading, saving, validation, and default map creation.
 */

import { InteractiveArea, ImpassableArea, Asset } from '../MapDataContext';
import { MapApiService } from '../../services/api/MapApiService';
import { worldDimensionsManager } from '../WorldDimensionsManager';
import { logger } from '../logger';
import { SharedMapData, MapEventType } from './types';

// Maximum world dimensions for performance
const MAX_WORLD_WIDTH = 8000;
const MAX_WORLD_HEIGHT = 4000;

// Default dimensions matching actual map
const DEFAULT_DIMENSIONS = { width: 7603, height: 3679 };

export interface SaveResult {
  success: boolean;
  version?: number;
  error?: string;
}

export interface LoadResult {
  success: boolean;
  data?: SharedMapData;
  error?: string;
}

/**
 * MapPersistenceService - Handles all map data persistence operations
 */
export class MapPersistenceService {
  /**
   * Get maximum allowed world dimensions
   */
  static getMaxDimensions(): { width: number; height: number } {
    return { width: MAX_WORLD_WIDTH, height: MAX_WORLD_HEIGHT };
  }

  /**
   * Get default dimensions
   */
  static getDefaultDimensions(): { width: number; height: number } {
    return { ...DEFAULT_DIMENSIONS };
  }

  /**
   * Load map data from PostgreSQL
   */
  async loadMap(roomId: string): Promise<LoadResult> {
    try {
      const result = await MapApiService.loadMap(roomId);

      if (result.success && result.data) {
        logger.info('[MapPersistence] Map loaded from database', { roomId });

        const apiMetadata = result.data.metadata || {};
        const mapData: SharedMapData = {
          interactiveAreas: (result.data.interactiveAreas || []) as InteractiveArea[],
          impassableAreas: (result.data.impassableAreas || []) as ImpassableArea[],
          assets: (result.data.assets || []) as unknown as Asset[],
          worldDimensions: result.data.worldDimensions || DEFAULT_DIMENSIONS,
          backgroundImage: result.data.backgroundImage || undefined,
          backgroundImageDimensions: result.data.backgroundImageDimensions,
          version: result.data.version || 1,
          lastModified: result.data.updatedAt ? new Date(result.data.updatedAt) : new Date(),
          createdBy: 'system',
          metadata: {
            name: apiMetadata.name || 'Stargety Oasis',
            description: apiMetadata.description || '',
            tags: apiMetadata.tags || [],
            isPublic: false,
          },
          layers: [],
          resources: [],
        };

        // Fix polygon bounding boxes
        const fixedData = this.fixPolygonBoundingBoxes(mapData);

        // Convert date strings to Date objects
        if (typeof fixedData.lastModified === 'string') {
          fixedData.lastModified = new Date(fixedData.lastModified);
        }

        return { success: true, data: fixedData };
      }

      return { success: false, error: 'No data returned from API' };
    } catch (error) {
      logger.error('[MapPersistence] Failed to load map', error);
      return { success: false, error: error instanceof Error ? error.message : 'Load failed' };
    }
  }

  /**
   * Save map data to PostgreSQL
   */
  async saveMap(roomId: string, data: SharedMapData): Promise<SaveResult> {
    try {
      // Validate data before saving
      if (!this.validateMapData(data)) {
        return { success: false, error: 'Invalid map data structure' };
      }

      const apiData = {
        worldDimensions: data.worldDimensions,
        backgroundImage: data.backgroundImage || null,
        backgroundImageDimensions: data.backgroundImageDimensions,
        interactiveAreas: data.interactiveAreas as unknown as import('../../services/api/MapApiService').InteractiveArea[],
        impassableAreas: data.impassableAreas as unknown as import('../../services/api/MapApiService').ImpassableArea[],
        assets: data.assets as unknown as import('../../services/api/MapApiService').MapAsset[],
        metadata: data.metadata,
      };

      const result = await MapApiService.saveMap(roomId, apiData as Parameters<typeof MapApiService.saveMap>[1]);

      if (result.success) {
        logger.info('[MapPersistence] Map saved to database', { roomId, version: data.version });
        return { success: true, version: data.version };
      }

      return { success: false, error: result.error || 'API save failed' };
    } catch (error) {
      logger.error('[MapPersistence] Failed to save map', error);
      return { success: false, error: error instanceof Error ? error.message : 'Save failed' };
    }
  }

  /**
   * Validate map data structure
   */
  validateMapData(data: unknown): data is SharedMapData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      Array.isArray(d.interactiveAreas) &&
      Array.isArray(d.impassableAreas) &&
      d.worldDimensions !== null &&
      typeof d.worldDimensions === 'object' &&
      typeof (d.worldDimensions as Record<string, unknown>).width === 'number' &&
      typeof (d.worldDimensions as Record<string, unknown>).height === 'number' &&
      typeof d.version === 'number'
    );
  }

  /**
   * Fix invalid polygon bounding boxes
   */
  private fixPolygonBoundingBoxes(data: SharedMapData): SharedMapData {
    let fixedCount = 0;

    if (data.impassableAreas) {
      data.impassableAreas = data.impassableAreas.map((area: ImpassableArea & { type?: string; points?: Array<{ x: number; y: number }> }) => {
        if (area.type === 'impassable-polygon' && area.points && area.points.length > 0) {
          if (!area.width || !area.height || area.width === 0 || area.height === 0) {
            const xs = area.points.map((p) => p.x);
            const ys = area.points.map((p) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);

            fixedCount++;
            return { ...area, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          }
        }
        return area;
      });
    }

    if (fixedCount > 0) {
      logger.info('[MapPersistence] Fixed polygon bounding boxes', { count: fixedCount });
    }

    return data;
  }

  /**
   * Validate and scale image dimensions to fit within maximum limits
   */
  validateAndScaleDimensions(width: number, height: number): { width: number; height: number; scaled: boolean } {
    if (width <= MAX_WORLD_WIDTH && height <= MAX_WORLD_HEIGHT) {
      return { width, height, scaled: false };
    }

    const scaleX = MAX_WORLD_WIDTH / width;
    const scaleY = MAX_WORLD_HEIGHT / height;
    const scale = Math.min(scaleX, scaleY);

    return {
      width: Math.floor(width * scale),
      height: Math.floor(height * scale),
      scaled: true,
    };
  }

  /**
   * Get maximum allowed world dimensions
   */
  getMaxDimensions(): { width: number; height: number } {
    return { width: MAX_WORLD_WIDTH, height: MAX_WORLD_HEIGHT };
  }

  /**
   * Load default background image and get its dimensions
   */
  async loadDefaultBackgroundImage(): Promise<{ imageUrl: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          imageUrl: '/default-background.jpg',
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to load default background image'));
      };
      img.src = '/default-background.jpg';
    });
  }

  /**
   * Create default map data
   */
  async createDefaultMap(): Promise<SharedMapData> {
    let backgroundImage: string | undefined;
    let effectiveDimensions = DEFAULT_DIMENSIONS;

    try {
      const imageData = await this.loadDefaultBackgroundImage();
      backgroundImage = imageData.imageUrl;
      const validated = this.validateAndScaleDimensions(imageData.width, imageData.height);
      effectiveDimensions = { width: validated.width, height: validated.height };
    } catch (error) {
      logger.warn('[MapPersistence] Failed to load default background', error);
    }

    return {
      // Start with empty areas - user creates from scratch
      interactiveAreas: [],
      impassableAreas: [
        {
          id: 'wall-default',
          x: Math.floor(effectiveDimensions.width * 0.3),
          y: Math.floor(effectiveDimensions.height * 0.15),
          width: 80,
          height: 20,
          name: 'Wall Section',
        },
      ],
      worldDimensions: effectiveDimensions,
      backgroundImage,
      backgroundImageDimensions: effectiveDimensions,
      version: 1,
      lastModified: new Date(),
      createdBy: 'system',
      metadata: {
        name: 'Stargety Oasis',
        description: 'Default virtual office space',
        tags: ['default', 'office'],
        isPublic: true,
      },
      layers: [
        { id: 'background-layer', name: 'Background', type: 'background', visible: true, locked: false, opacity: 1, zIndex: 0, elements: [] },
        { id: 'interactive-layer', name: 'Interactive Areas', type: 'interactive', visible: true, locked: false, opacity: 1, zIndex: 1, elements: [] },
        { id: 'collision-layer', name: 'Collision Areas', type: 'collision', visible: true, locked: false, opacity: 0.7, zIndex: 2, elements: [] },
      ],
      resources: [],
    };
  }

  /**
   * Export map data as JSON string
   */
  exportMap(data: SharedMapData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import map data from JSON string
   */
  importMap(jsonData: string): SharedMapData | null {
    try {
      const imported = JSON.parse(jsonData);
      if (!this.validateMapData(imported)) {
        return null;
      }
      imported.lastModified = new Date(imported.lastModified);
      return imported;
    } catch {
      return null;
    }
  }
}

