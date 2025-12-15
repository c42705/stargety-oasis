/**
 * Map Data Service - Centralized data management for the hybrid architecture
 *
 * This service replaces the SharedMapSystem with a cleaner, more focused approach
 * that handles persistence, validation, and background image management without
 * the complexity of the event-driven singleton pattern.
 *
 * Key Features:
 * - PostgreSQL persistence via MapApiService (primary)
 * - localStorage fallback for offline support
 * - Data validation and sanitization
 * - Background image handling
 * - Simple event system for save notifications
 * - No singleton pattern - stateless service functions
 */

import { MapData, InteractiveArea, ImpassableArea, Asset } from '../shared/MapDataContext';
import { MapApiService } from '../services/api/MapApiService';
import { logger } from '../shared/logger';

// Extended map data structure for the new system
export interface ExtendedMapData extends MapData {
  version: number;
  lastModified: Date;
  metadata: {
    name: string;
    description: string;
    tags: string[];
  };
}

// Storage keys for localStorage (maintained for fallback)
const STORAGE_KEYS = {
  MAP_DATA: 'stargety_shared_map_data',
  MAP_BACKUP: 'stargety_map_backup',
  MAP_SETTINGS: 'stargety_map_settings',
  MAP_HISTORY: 'stargety_map_history'
} as const;

// Default room ID for the map
const DEFAULT_ROOM_ID = 'default';

// Event system for save notifications
type MapEventCallback = (data: ExtendedMapData) => void;
const eventListeners: Map<string, MapEventCallback[]> = new Map();

export class MapDataService {
  /**
   * Save map data to PostgreSQL (with localStorage fallback)
   */
  static async saveMapData(data: ExtendedMapData, roomId: string = DEFAULT_ROOM_ID): Promise<void> {
    try {
      // Update metadata
      const dataToSave = {
        ...data,
        lastModified: new Date(),
        version: data.version + 1
      };

      // Try to save to API first
      try {
        // Cast to API-compatible types
        const apiData = {
          worldDimensions: dataToSave.worldDimensions,
          backgroundImage: dataToSave.backgroundImage || null,
          backgroundImageDimensions: dataToSave.backgroundImageDimensions,
          interactiveAreas: dataToSave.interactiveAreas as any,
          impassableAreas: dataToSave.impassableAreas as any,
          assets: dataToSave.assets as any,
          metadata: dataToSave.metadata,
        };

        const result = await MapApiService.saveMap(roomId, apiData as any);

        if (result.success) {
          logger.info('MAP SAVED TO DATABASE', { roomId, version: dataToSave.version });
        } else {
          throw new Error(result.error || 'API save failed');
        }
      } catch (apiError) {
        logger.warn('API SAVE FAILED, FALLING BACK TO LOCALSTORAGE', apiError);
        // Fallback to localStorage
        localStorage.setItem(STORAGE_KEYS.MAP_DATA, JSON.stringify(dataToSave));
        localStorage.setItem(STORAGE_KEYS.MAP_BACKUP, JSON.stringify(dataToSave));
      }

      // Emit save event
      this.emit('map:saved', dataToSave);

    } catch (error) {
      logger.error('FAILED TO SAVE MAP DATA', error);
      throw new Error('Failed to save map data');
    }
  }

  /**
   * Load map data from PostgreSQL (with localStorage fallback - editor only)
   * For gameplay: throws if API fails, don't silently fall back to stale localStorage
   */
  static async loadMapData(roomId: string = DEFAULT_ROOM_ID, forGameplay: boolean = true): Promise<ExtendedMapData | null> {
    try {
      // Try to load from API first
      try {
        const result = await MapApiService.loadMap(roomId);

        if (result.success && result.data) {
          logger.info('MAP LOADED FROM DATABASE', { roomId });

          // Convert API response to ExtendedMapData (cast types for compatibility)
          const mapData: ExtendedMapData = {
            interactiveAreas: (result.data.interactiveAreas || []) as InteractiveArea[],
            impassableAreas: (result.data.impassableAreas || []) as ImpassableArea[],
            assets: (result.data.assets || []) as unknown as Asset[],
            worldDimensions: result.data.worldDimensions || { width: 7603, height: 3679 },
            backgroundImage: result.data.backgroundImage || undefined,
            backgroundImageDimensions: result.data.backgroundImageDimensions,
            version: result.data.version || 1,
            lastModified: result.data.updatedAt ? new Date(result.data.updatedAt) : new Date(),
            metadata: result.data.metadata as ExtendedMapData['metadata'] || {
              name: 'Stargety Oasis',
              description: '',
              tags: [],
            },
          };

          return this.validateAndSanitizeMapData(mapData);
        }
      } catch (apiError) {
        logger.warn('API LOAD FAILED', { apiError, forGameplay, roomId });
        
        // For gameplay: fail hard to force default map creation (don't use stale localStorage)
        if (forGameplay) {
          logger.warn('[MapDataService] API load failed during gameplay - will use default map');
          return null; // This will trigger createDefaultMap in the caller
        }
      }

      // For editor mode: fallback to localStorage (allows offline editing)
      if (!forGameplay) {
        const storedData = localStorage.getItem(STORAGE_KEYS.MAP_DATA);

        if (!storedData) {
          return null;
        }

        const parsedData = JSON.parse(storedData);

        // Convert date strings to Date objects
        if (parsedData.lastModified) {
          parsedData.lastModified = new Date(parsedData.lastModified);
        }

        // Validate and sanitize data
        const validatedData = this.validateAndSanitizeMapData(parsedData);

        return validatedData;
      }

      return null;

    } catch (error) {
      logger.error('FAILED TO LOAD MAP DATA', error);
      return null;
    }
  }

  /**
   * Create default map with Zep-style background
   */
  static async createDefaultMap(roomId: string = DEFAULT_ROOM_ID): Promise<ExtendedMapData> {
    const defaultMap: ExtendedMapData = {
      version: 1,
      lastModified: new Date(),
      metadata: {
        name: 'Stargety Oasis',
        description: 'Default Zep-style virtual office space',
        tags: ['default', 'office', 'zep-style']
      },
      worldDimensions: {
        width: 1920,
        height: 1080
      },
      backgroundImage: '/default-background.jpg',
      backgroundImageDimensions: {
        width: 1920,
        height: 1080
      },
      interactiveAreas: [
        {
          id: 'meeting-room-1',
          name: 'Meeting Room',
          x: 1520,
          y: 919,
          width: 120,
          height: 80,
          color: '#4A90E2',
          description: 'Join the weekly team sync',
          actionType: 'jitsi',
          actionConfig: {
            autoJoinOnEntry: true,
            autoLeaveOnExit: true
          }
        },
        {
          id: 'presentation-hall-1',
          name: 'Presentation Hall',
          x: 2000,
          y: 919,
          width: 140,
          height: 100,
          color: '#9B59B6',
          description: 'Watch presentations and demos',
          actionType: 'jitsi',
          actionConfig: {
            autoJoinOnEntry: true,
            autoLeaveOnExit: true
          }
        },
        {
          id: 'coffee-corner-1',
          name: 'Coffee Corner',
          x: 4561,
          y: 2575,
          width: 100,
          height: 80,
          color: '#8B4513',
          description: 'Casual conversations',
          actionType: 'jitsi',
          actionConfig: {
            autoJoinOnEntry: true,
            autoLeaveOnExit: true
          }
        },
        {
          id: 'game-zone-1',
          name: 'Game Zone',
          x: 5500,
          y: 1500,
          width: 120,
          height: 90,
          color: '#E74C3C',
          description: 'Fun and games',
          actionType: 'jitsi',
          actionConfig: {
            autoJoinOnEntry: true,
            autoLeaveOnExit: true
          }
        }
      ],
      impassableAreas: [
        {
          id: 'wall-1',
          name: 'Office Wall',
          x: 2000,
          y: 1500,
          width: 200,
          height: 50
        }
      ],
      assets: [] // Initialize with empty assets array
    };

    // Save the default map
    await this.saveMapData(defaultMap, roomId);

    return defaultMap;
  }

  /**
   * Validate and sanitize map data
   */
  static validateAndSanitizeMapData(data: any): ExtendedMapData {
    // Ensure required fields exist
    const sanitized: ExtendedMapData = {
      version: data.version || 1,
      lastModified: data.lastModified || new Date(),
      metadata: {
        name: data.metadata?.name || 'Untitled Map',
        description: data.metadata?.description || '',
        tags: Array.isArray(data.metadata?.tags) ? data.metadata.tags : []
      },
      worldDimensions: {
        width: data.worldDimensions?.width || 800,
        height: data.worldDimensions?.height || 600
      },
      backgroundImage: data.backgroundImage || '/default-background.jpg',
      backgroundImageDimensions: data.backgroundImageDimensions || {
        width: data.worldDimensions?.width || 800,
        height: data.worldDimensions?.height || 600
      },
      interactiveAreas: Array.isArray(data.interactiveAreas) ? data.interactiveAreas : [],
      impassableAreas: Array.isArray(data.impassableAreas) ? data.impassableAreas : [],
      assets: Array.isArray(data.assets) ? data.assets : [] // Include assets
    };

    return sanitized;
  }

  /**
   * Reset map to default state
   */
  static async resetToDefault(roomId: string = DEFAULT_ROOM_ID): Promise<ExtendedMapData> {
    // Try to delete from API
    try {
      await MapApiService.deleteMap(roomId);
      logger.info('MAP DELETED FROM DATABASE', { roomId });
    } catch (error) {
      logger.warn('API DELETE FAILED', error);
    }

    // Clear all localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // Create new default map
    return await this.createDefaultMap(roomId);
  }

  /**
   * Export map data as JSON string
   */
  static exportMapData(data: ExtendedMapData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import map data from JSON string
   */
  static async importMapData(jsonData: string, roomId: string = DEFAULT_ROOM_ID): Promise<ExtendedMapData> {
    try {
      const parsedData = JSON.parse(jsonData);
      const validatedData = this.validateAndSanitizeMapData(parsedData);

      await this.saveMapData(validatedData, roomId);
      return validatedData;
    } catch (error) {
      logger.error('FAILED TO IMPORT MAP DATA', error);
      throw new Error('Invalid map data format');
    }
  }

  /**
   * Simple event system for notifications
   */
  static on(event: string, callback: MapEventCallback): void {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, []);
    }
    eventListeners.get(event)!.push(callback);
  }

  static off(event: string, callback: MapEventCallback): void {
    const listeners = eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  static emit(event: string, data: ExtendedMapData): void {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Handle background image upload and conversion
   */
  static async handleBackgroundImageUpload(
    file: File,
    options: {
      optimize?: boolean;
      quality?: number;
      autoResize?: boolean;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<{
    url: string;
    dimensions: { width: number; height: number };
    optimized: boolean;
    aspectRatio: number;
  }> {
    const {
      optimize = true,
      quality = 0.9,
      autoResize = false,
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          let canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          let finalWidth = img.width;
          let finalHeight = img.height;
          let optimized = false;

          // Auto-resize if requested and image is too large
          if (autoResize && (img.width > maxWidth || img.height > maxHeight)) {
            const aspectRatio = img.width / img.height;
            
            if (img.width > img.height) {
              // Landscape
              finalWidth = maxWidth;
              finalHeight = Math.round(maxWidth / aspectRatio);
            } else {
              // Portrait
              finalHeight = maxHeight;
              finalWidth = Math.round(maxHeight * aspectRatio);
            }
            
            canvas.width = finalWidth;
            canvas.height = finalHeight;
            
            // Use high-quality interpolation for resizing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
            optimized = true;
          } else {
            // Use original dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
          }

          // Convert to data URL with specified quality
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          // Clean up canvas (just let it be garbage collected)

          resolve({
            url: dataUrl,
            dimensions: { width: finalWidth, height: finalHeight },
            optimized,
            aspectRatio: finalWidth / finalHeight
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = event.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Update world dimensions to match background image dimensions
   */
  static async updateWorldDimensionsToBackground(
    currentMapData: ExtendedMapData,
    newBackgroundDimensions: { width: number; height: number }
  ): Promise<ExtendedMapData> {
    const updatedMapData = {
      ...currentMapData,
      worldDimensions: newBackgroundDimensions,
      backgroundImageDimensions: newBackgroundDimensions,
      lastModified: new Date(),
      version: currentMapData.version + 1
    };

    // Scale existing interactive areas proportionally
    const oldWidth = currentMapData.worldDimensions.width;
    const oldHeight = currentMapData.worldDimensions.height;
    const newWidth = newBackgroundDimensions.width;
    const newHeight = newBackgroundDimensions.height;

    const widthScale = newWidth / oldWidth;
    const heightScale = newHeight / oldHeight;

    updatedMapData.interactiveAreas = currentMapData.interactiveAreas.map(area => ({
      ...area,
      x: Math.round(area.x * widthScale),
      y: Math.round(area.y * heightScale),
      width: Math.round(area.width * widthScale),
      height: Math.round(area.height * heightScale)
    }));

    // Scale existing impassable areas
    updatedMapData.impassableAreas = currentMapData.impassableAreas.map(area => ({
      ...area,
      x: Math.round(area.x * widthScale),
      y: Math.round(area.y * heightScale),
      width: Math.round(area.width * widthScale),
      height: Math.round(area.height * heightScale)
    }));

    // Scale existing assets
    updatedMapData.assets = (currentMapData.assets || []).map(asset => ({
      ...asset,
      x: Math.round(asset.x * widthScale),
      y: Math.round(asset.y * heightScale),
      width: Math.round(asset.width * widthScale),
      height: Math.round(asset.height * widthScale)
    }));

    return updatedMapData;
  }

  /**
   * Validate background image URL
   */
  static async validateBackgroundImage(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error('Failed to load background image'));
      };

      img.src = url;
    });
  }

  /**
   * Get backup data (from localStorage - API has versioned history)
   */
  static async getBackupData(): Promise<ExtendedMapData | null> {
    try {
      const backupData = localStorage.getItem(STORAGE_KEYS.MAP_BACKUP);
      if (!backupData) return null;

      const parsedData = JSON.parse(backupData);
      if (parsedData.lastModified) {
        parsedData.lastModified = new Date(parsedData.lastModified);
      }

      return this.validateAndSanitizeMapData(parsedData);
    } catch (error) {
      logger.error('FAILED TO GET BACKUP DATA', error);
      return null;
    }
  }

  /**
   * Restore from backup
   */
  static async restoreFromBackup(roomId: string = DEFAULT_ROOM_ID): Promise<ExtendedMapData | null> {
    try {
      const backupData = await this.getBackupData();
      if (!backupData) {
        throw new Error('No backup data available');
      }

      await this.saveMapData(backupData, roomId);
      return backupData;
    } catch (error) {
      logger.error('FAILED TO RESTORE FROM BACKUP', error);
      throw error;
    }
  }

  /**
   * Get map statistics
   */
  static getMapStatistics(data: ExtendedMapData) {
    return {
      version: data.version,
      lastModified: data.lastModified,
      interactiveAreasCount: data.interactiveAreas.length,
      collisionAreasCount: data.impassableAreas.length,
      assetsCount: data.assets?.length || 0,
      hasBackgroundImage: !!data.backgroundImage,
      worldSize: `${data.worldDimensions.width} × ${data.worldDimensions.height}`,
      dataSize: JSON.stringify(data).length
    };
  }

  /**
   * Clear all stored data
   */
  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}
