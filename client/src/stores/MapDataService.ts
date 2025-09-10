/**
 * Map Data Service - Centralized data management for the hybrid architecture
 * 
 * This service replaces the SharedMapSystem with a cleaner, more focused approach
 * that handles persistence, validation, and background image management without
 * the complexity of the event-driven singleton pattern.
 * 
 * Key Features:
 * - localStorage persistence with backward compatibility
 * - Data validation and sanitization
 * - Background image handling
 * - Simple event system for save notifications
 * - No singleton pattern - stateless service functions
 */

import { InteractiveArea, ImpassableArea, MapData } from '../shared/MapDataContext';

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

// Storage keys for localStorage (maintaining compatibility)
const STORAGE_KEYS = {
  MAP_DATA: 'stargety_shared_map_data',
  MAP_BACKUP: 'stargety_map_backup',
  MAP_SETTINGS: 'stargety_map_settings',
  MAP_HISTORY: 'stargety_map_history'
} as const;

// Event system for save notifications
type MapEventCallback = (data: ExtendedMapData) => void;
const eventListeners: Map<string, MapEventCallback[]> = new Map();

export class MapDataService {
  /**
   * Save map data to localStorage
   */
  static async saveMapData(data: ExtendedMapData): Promise<void> {
    try {
      console.log('💾 SAVING MAP DATA:', {
        version: data.version,
        areas: data.interactiveAreas.length,
        collisions: data.impassableAreas.length,
        hasBackground: !!data.backgroundImage
      });

      // Update metadata
      const dataToSave = {
        ...data,
        lastModified: new Date(),
        version: data.version + 1
      };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.MAP_DATA, JSON.stringify(dataToSave));
      
      // Create backup
      localStorage.setItem(STORAGE_KEYS.MAP_BACKUP, JSON.stringify(dataToSave));

      console.log('✅ MAP DATA SAVED SUCCESSFULLY');

      // Emit save event
      this.emit('map:saved', dataToSave);

    } catch (error) {
      console.error('❌ FAILED TO SAVE MAP DATA:', error);
      throw new Error('Failed to save map data');
    }
  }

  /**
   * Load map data from localStorage
   */
  static async loadMapData(): Promise<ExtendedMapData | null> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.MAP_DATA);
      
      if (!storedData) {
        console.log('📁 NO EXISTING MAP DATA FOUND');
        return null;
      }

      const parsedData = JSON.parse(storedData);
      
      // Convert date strings to Date objects
      if (parsedData.lastModified) {
        parsedData.lastModified = new Date(parsedData.lastModified);
      }

      // Validate and sanitize data
      const validatedData = this.validateAndSanitizeMapData(parsedData);

      console.log('📁 LOADED MAP DATA:', {
        version: validatedData.version,
        areas: validatedData.interactiveAreas.length,
        collisions: validatedData.impassableAreas.length,
        hasBackground: !!validatedData.backgroundImage,
        lastModified: validatedData.lastModified
      });

      return validatedData;

    } catch (error) {
      console.error('❌ FAILED TO LOAD MAP DATA:', error);
      return null;
    }
  }

  /**
   * Create default map with Zep-style background
   */
  static async createDefaultMap(): Promise<ExtendedMapData> {
    console.log('🆕 CREATING DEFAULT MAP');

    const defaultMap: ExtendedMapData = {
      version: 1,
      lastModified: new Date(),
      metadata: {
        name: 'Stargety Oasis',
        description: 'Default Zep-style virtual office space',
        tags: ['default', 'office', 'zep-style']
      },
      worldDimensions: {
        width: 7603,
        height: 3679
      },
      backgroundImage: '/default-background.jpg',
      backgroundImageDimensions: {
        width: 7603,
        height: 3679
      },
      interactiveAreas: [
        {
          id: 'meeting-room-1',
          name: 'Meeting Room',
          type: 'meeting-room',
          x: 1520,
          y: 919,
          width: 120,
          height: 80,
          color: '#4A90E2',
          description: 'Join the weekly team sync'
        },
        {
          id: 'coffee-corner-1',
          name: 'Coffee Corner',
          type: 'coffee-corner',
          x: 4561,
          y: 2575,
          width: 100,
          height: 80,
          color: '#8B4513',
          description: 'Casual conversations'
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
      ]
    };

    // Save the default map
    await this.saveMapData(defaultMap);

    console.log('✅ DEFAULT MAP CREATED');
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
        width: data.worldDimensions?.width || 7603,
        height: data.worldDimensions?.height || 3679
      },
      backgroundImage: data.backgroundImage || '/default-background.jpg',
      backgroundImageDimensions: data.backgroundImageDimensions || {
        width: 7603,
        height: 3679
      },
      interactiveAreas: Array.isArray(data.interactiveAreas) ? data.interactiveAreas : [],
      impassableAreas: Array.isArray(data.impassableAreas) ? data.impassableAreas : []
    };

    return sanitized;
  }

  /**
   * Reset map to default state
   */
  static async resetToDefault(): Promise<ExtendedMapData> {
    console.log('🔄 RESETTING MAP TO DEFAULT');

    // Clear all storage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // Create new default map
    return await this.createDefaultMap();
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
  static async importMapData(jsonData: string): Promise<ExtendedMapData> {
    try {
      const parsedData = JSON.parse(jsonData);
      const validatedData = this.validateAndSanitizeMapData(parsedData);
      
      await this.saveMapData(validatedData);
      return validatedData;
    } catch (error) {
      console.error('❌ FAILED TO IMPORT MAP DATA:', error);
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
  static async handleBackgroundImageUpload(file: File): Promise<{ url: string; dimensions: { width: number; height: number } }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Set canvas dimensions to image dimensions
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image to canvas
          ctx.drawImage(img, 0, 0);

          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

          console.log('🖼️ BACKGROUND IMAGE PROCESSED:', {
            originalSize: file.size,
            dimensions: { width: img.width, height: img.height },
            dataUrlSize: dataUrl.length
          });

          resolve({
            url: dataUrl,
            dimensions: { width: img.width, height: img.height }
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
   * Get backup data
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
      console.error('❌ FAILED TO GET BACKUP DATA:', error);
      return null;
    }
  }

  /**
   * Restore from backup
   */
  static async restoreFromBackup(): Promise<ExtendedMapData | null> {
    try {
      const backupData = await this.getBackupData();
      if (!backupData) {
        throw new Error('No backup data available');
      }

      await this.saveMapData(backupData);
      console.log('✅ RESTORED FROM BACKUP');
      return backupData;
    } catch (error) {
      console.error('❌ FAILED TO RESTORE FROM BACKUP:', error);
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
    console.log('🗑️ ALL MAP DATA CLEARED');
  }
}
