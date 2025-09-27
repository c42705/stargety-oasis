/**
 * Shared Map System - Unified map data management for both WorldModule and Map Editor
 * 
 * This system provides a centralized way to manage map data that can be accessed
 * and modified from both the Phaser.js game canvas and the Fabric.js Map Editor.
 * 
 * TODO: Future Migration Plans
 * - Replace localStorage with a proper database solution (PostgreSQL, MongoDB)
 * - Implement real-time synchronization via WebSocket for multi-user editing
 * - Add cloud storage integration for map data backup and sharing
 * - Implement version control for map changes and rollback functionality
 * - Add conflict resolution for concurrent editing scenarios
 */

import { InteractiveArea, ImpassableArea, MapData } from './MapDataContext';
import { worldDimensionsManager } from './WorldDimensionsManager';

// Extended map data structure for shared system
export interface SharedMapData extends MapData {
  version: number;
  lastModified: Date;
  createdBy: string;
  metadata: {
    name: string;
    description: string;
    tags: string[];
    isPublic: boolean;
  };
  layers: MapLayer[];
  assets: MapAsset[];
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'background' | 'interactive' | 'collision' | 'decoration' | 'overlay';
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  elements: MapElement[];
}

export interface MapElement {
  id: string;
  type: 'area' | 'collision' | 'decoration' | 'spawn' | 'trigger';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties: Record<string, any>;
  layerId: string;
}

export interface MapAsset {
  id: string;
  name: string;
  type: 'image' | 'sprite' | 'tileset' | 'audio';
  url: string;
  metadata: {
    width?: number;
    height?: number;
    frameCount?: number;
    duration?: number;
  };
}

// Storage keys for localStorage
const STORAGE_KEYS = {
  MAP_DATA: 'stargety_shared_map_data',
  MAP_BACKUP: 'stargety_map_backup',
  MAP_SETTINGS: 'stargety_map_settings',
  MAP_HISTORY: 'stargety_map_history'
} as const;

// Event types for map system
export type MapEventType =
  | 'map:loaded'
  | 'map:saved'
  | 'map:saving'
  | 'map:save:error'
  | 'map:changed'
  | 'map:element:added'
  | 'map:element:updated'
  | 'map:element:removed'
  | 'map:layer:added'
  | 'map:layer:updated'
  | 'map:layer:removed'
  | 'map:sync:started'
  | 'map:sync:completed'
  | 'map:sync:error'
  | 'map:dimensionsChanged';

export interface MapEvent {
  type: MapEventType;
  data: any;
  timestamp: Date;
  source: 'world' | 'editor';
}

// Map change history for undo/redo functionality
export interface MapChange {
  id: string;
  type: 'add' | 'update' | 'remove';
  elementType: 'area' | 'collision' | 'layer' | 'asset' | 'worldDimensions';
  before: any;
  after: any;
  timestamp: Date;
  userId: string;
}

/**
 * SharedMapSystem - Core class for managing shared map data
 */
export class SharedMapSystem {
  private static instance: SharedMapSystem;
  private mapData: SharedMapData | null = null;
  private eventListeners: Map<MapEventType, Function[]> = new Map();
  private changeHistory: MapChange[] = [];
  private maxHistorySize = 50;

  // Constants for default map creation - Updated to match actual map dimensions
  private static readonly DEFAULT_WORLD_WIDTH = 7603;
  private static readonly DEFAULT_WORLD_HEIGHT = 3679;

  // Maximum world dimensions for performance
  private static readonly MAX_WORLD_WIDTH = 8000;
  private static readonly MAX_WORLD_HEIGHT = 4000;

  // Save state tracking
  private isSaving = false;
  private hasUnsavedChanges = false;
  private lastSaveTime: Date | null = null;
  private saveError: string | null = null;
  private autoSaveTimeout: NodeJS.Timeout | null = null;
  private autoSaveDelay = 2000; // 2 seconds

  private constructor() {
    this.initializeEventListeners();
  }

  public static getInstance(): SharedMapSystem {
    if (!SharedMapSystem.instance) {
      SharedMapSystem.instance = new SharedMapSystem();
    }
    return SharedMapSystem.instance;
  }

  /**
   * Initialize the map system and load existing data
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadMapData();
      this.emit('map:loaded', { mapData: this.mapData });
    } catch (error) {
      console.error('Failed to initialize SharedMapSystem:', error);
      await this.createDefaultMap();
    }
  }

  /**
   * Load map data from localStorage
   * TODO: Replace with database query when migrating to server-side storage
   */
  public async loadMapData(): Promise<SharedMapData> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.MAP_DATA);
      if (storedData) {
        const parsedData = JSON.parse(storedData);

        // Check if this is an old map without background image
        if (!parsedData.backgroundImage) {
          return await this.createDefaultMap();
        }

        // Convert date strings back to Date objects
        parsedData.lastModified = new Date(parsedData.lastModified);
        this.mapData = parsedData;
        return parsedData;
      } else {
        return await this.createDefaultMap();
      }
    } catch (error) {
      console.error('❌ FAILED TO LOAD MAP DATA, CREATING DEFAULT:', error);
      return await this.createDefaultMap();
    }
  }

  /**
   * Save map data to localStorage with enhanced state tracking
   * TODO: Replace with database save operation when migrating to server-side storage
   */
  public async saveMapData(data?: SharedMapData, force = false): Promise<void> {
    // Prevent concurrent saves
    if (this.isSaving && !force) {
      return;
    }

    try {
      this.isSaving = true;
      this.saveError = null;
      this.emit('map:saving', { timestamp: new Date() });

      const dataToSave = data || this.mapData;
      if (!dataToSave) {
        throw new Error('No map data to save');
      }

      // Validate data before saving
      if (!this.validateMapData(dataToSave)) {
        throw new Error('Invalid map data structure - save aborted');
      }

      // Update metadata
      dataToSave.lastModified = new Date();
      dataToSave.version += 1;

      // Save to localStorage with error handling and cleanup
      try {
        localStorage.setItem(STORAGE_KEYS.MAP_DATA, JSON.stringify(dataToSave));
      } catch (storageError) {
        if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
          console.warn('⚠️ STORAGE QUOTA EXCEEDED DURING MAP SAVE, ATTEMPTING CLEANUP');
          this.cleanupStorage();

          // Try saving again after cleanup
          try {
            localStorage.setItem(STORAGE_KEYS.MAP_DATA, JSON.stringify(dataToSave));
          } catch (retryError) {
            throw new Error('Storage quota exceeded - unable to save map data even after cleanup. Please use smaller background images or clear browser data.');
          }
        } else {
          throw storageError;
        }
      }

      // Create backup
      this.createBackup(dataToSave);

      // Update state
      this.mapData = dataToSave;
      this.hasUnsavedChanges = false;
      this.lastSaveTime = new Date();

      // Emit success event
      this.emit('map:saved', {
        mapData: dataToSave,
        timestamp: this.lastSaveTime,
        version: dataToSave.version
      });

      // Trigger synchronization across all connected interfaces
      this.emit('map:sync:completed', {
        mapData: dataToSave,
        source: 'save_operation'
      });

    } catch (error) {
      this.saveError = error instanceof Error ? error.message : 'Unknown save error';
      console.error('Failed to save map data:', error);

      this.emit('map:save:error', {
        error: this.saveError,
        timestamp: new Date()
      });

      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Get current map data
   */
  public getMapData(): SharedMapData | null {
    return this.mapData;
  }

  /**
   * Get save state information
   */
  public getSaveState() {
    return {
      isSaving: this.isSaving,
      hasUnsavedChanges: this.hasUnsavedChanges,
      lastSaveTime: this.lastSaveTime,
      saveError: this.saveError,
      autoSaveEnabled: this.autoSaveDelay > 0
    };
  }

  /**
   * Configure auto-save settings
   */
  public configureAutoSave(enabled: boolean, delayMs = 2000) {
    this.autoSaveDelay = enabled ? delayMs : 0;
    if (!enabled && this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
  }

  /**
   * Schedule auto-save after changes
   */
  private scheduleAutoSave() {
    if (this.autoSaveDelay <= 0) return;

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Schedule new auto-save
    this.autoSaveTimeout = setTimeout(async () => {
      if (this.hasUnsavedChanges && !this.isSaving) {
        try {
          await this.saveMapData();
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, this.autoSaveDelay);
  }

  /**
   * Mark data as changed and schedule auto-save
   */
  private markAsChanged() {
    this.hasUnsavedChanges = true;
    this.saveError = null;
    this.scheduleAutoSave();
  }

  /**
   * Update map data and trigger synchronization
   */
  public async updateMapData(updates: Partial<SharedMapData>, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    const previousData = { ...this.mapData };
    this.mapData = { ...this.mapData, ...updates };

    // Record change for history
    this.recordChange({
      id: `change_${Date.now()}`,
      type: 'update',
      elementType: 'area', // This would be determined based on the update
      before: previousData,
      after: this.mapData,
      timestamp: new Date(),
      userId: 'current_user' // TODO: Get from auth context
    });

    // Mark as changed and schedule auto-save
    this.markAsChanged();
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * CENTRALIZED DIMENSION MANAGEMENT
   * This is the single source of truth for all dimension operations
   */

  /**
   * Get the current effective dimensions from WorldDimensionsManager (authoritative source)
   * UPDATED: Now delegates to WorldDimensionsManager for consistency
   */
  public getEffectiveDimensions(): { width: number; height: number } {
    try {
      // Use WorldDimensionsManager as the authoritative source
      return worldDimensionsManager.getEffectiveDimensions();
    } catch (error) {
      console.warn('⚠️ SharedMapSystem: Failed to get dimensions from WorldDimensionsManager, using fallback', error);

      // Fallback to local map data if WorldDimensionsManager fails
      if (!this.mapData) {
        return { width: 7603, height: 3679 }; // Updated to match actual map dimensions
      }

      // Priority: backgroundImageDimensions > worldDimensions > fallback
      if (this.mapData.backgroundImageDimensions) {
        return { ...this.mapData.backgroundImageDimensions };
      }

      if (this.mapData.worldDimensions) {
        return { ...this.mapData.worldDimensions };
      }

      return { width: 7603, height: 3679 }; // Updated to match actual map dimensions
    }
  }

  /**
   * Update dimensions from background image (single source of truth)
   */
  public async updateDimensionsFromBackgroundImage(
    imageUrl: string,
    imageDimensions: { width: number; height: number },
    source: 'upload' | 'load' | 'default' = 'load'
  ): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    // Validate dimensions
    const validatedDimensions = this.validateAndScaleImageDimensions(imageDimensions.width, imageDimensions.height);

    const previousDimensions = this.getEffectiveDimensions();

    // UPDATED: Sync background dimensions with WorldDimensionsManager
    try {
      const backgroundUpdateResult = worldDimensionsManager.updateBackgroundDimensions(validatedDimensions, {
        source: 'background',
        skipPersistence: true // We handle persistence here
      });

      if (!backgroundUpdateResult.isValid) {
        throw new Error('WorldDimensionsManager background validation failed: ' + backgroundUpdateResult.errors.join(', '));
      }

      // Update local map data with validated dimensions
      this.mapData.backgroundImage = imageUrl;
      this.mapData.backgroundImageDimensions = backgroundUpdateResult.dimensions;
      this.mapData.worldDimensions = backgroundUpdateResult.dimensions; // Keep in sync

    } catch (error) {
      console.error('❌ SharedMapSystem: Failed to sync background with WorldDimensionsManager', error);

      // Fallback to direct update
      this.mapData.backgroundImage = imageUrl;
      this.mapData.backgroundImageDimensions = validatedDimensions;
      this.mapData.worldDimensions = validatedDimensions;

    }

    // Record change for history
    this.recordChange({
      id: `change_${Date.now()}`,
      type: 'update',
      elementType: 'worldDimensions',
      before: {
        worldDimensions: previousDimensions,
        backgroundImageDimensions: this.mapData.backgroundImageDimensions
      },
      after: {
        worldDimensions: validatedDimensions,
        backgroundImageDimensions: validatedDimensions
      },
      timestamp: new Date(),
      userId: 'current_user'
    });

    // Mark as changed and schedule auto-save
    this.markAsChanged();

    // Emit unified dimension change event
    this.emit('map:dimensionsChanged', {
      dimensions: validatedDimensions,
      previousDimensions,
      mapData: this.mapData,
      source: `background-${source}`
    });

    // Also emit general map changed event
    this.emit('map:changed', { mapData: this.mapData, source: `background-${source}` });
  }

  /**
   * Update world dimensions manually (legacy support, syncs with background dimensions)
   */
  public async updateWorldDimensions(dimensions: { width: number; height: number }, source: 'world' | 'editor' | 'migration' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    // Validate dimensions
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      throw new Error('World dimensions must be positive numbers');
    }

    if (dimensions.width > SharedMapSystem.MAX_WORLD_WIDTH || dimensions.height > SharedMapSystem.MAX_WORLD_HEIGHT) {
      throw new Error(`World dimensions exceed maximum allowed size (${SharedMapSystem.MAX_WORLD_WIDTH}×${SharedMapSystem.MAX_WORLD_HEIGHT})`);
    }

    if (dimensions.width < 400 || dimensions.height < 300) {
      throw new Error('World dimensions are below minimum required size (400×300)');
    }

    const previousDimensions = this.getEffectiveDimensions();

    // UPDATED: Sync with WorldDimensionsManager first (authoritative source)
    try {
      const updateResult = worldDimensionsManager.updateDimensions(dimensions, {
        source: source === 'world' ? 'world' : 'editor',
        syncBackground: true,
        skipPersistence: true // We handle persistence here
      });

      if (!updateResult.isValid) {
        throw new Error('WorldDimensionsManager validation failed: ' + updateResult.errors.join(', '));
      }

      // Use validated dimensions from WorldDimensionsManager
      const validatedDimensions = updateResult.dimensions;

      // Update local map data with validated dimensions
      this.mapData.worldDimensions = validatedDimensions;
      this.mapData.backgroundImageDimensions = validatedDimensions;

    } catch (error) {
      console.error('❌ SharedMapSystem: Failed to sync with WorldDimensionsManager', error);

      // Fallback to direct update (backward compatibility)
      this.mapData.worldDimensions = dimensions;
      this.mapData.backgroundImageDimensions = dimensions;

    }

    // Record change for history
    this.recordChange({
      id: `change_${Date.now()}`,
      type: 'update',
      elementType: 'worldDimensions',
      before: { worldDimensions: previousDimensions },
      after: { worldDimensions: dimensions },
      timestamp: new Date(),
      userId: 'current_user'
    });

    // Mark as changed and schedule auto-save
    this.markAsChanged();

    // REDUCED EVENT EMISSIONS: Only emit for backward compatibility
    // WorldDimensionsManager handles the primary dimension updates

    // Emit general map changed event (reduced from two events to one)
    this.emit('map:changed', {
      mapData: this.mapData,
      source,
      dimensionsChanged: true,
      previousDimensions
    });
  }

  /**
   * Add interactive area to the map
   */
  public async addInteractiveArea(area: InteractiveArea, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    this.mapData.interactiveAreas.push(area);
    
    this.recordChange({
      id: `add_area_${Date.now()}`,
      type: 'add',
      elementType: 'area',
      before: null,
      after: area,
      timestamp: new Date(),
      userId: 'current_user'
    });

    this.markAsChanged();
    this.emit('map:element:added', { element: area, type: 'interactive', source });
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * Update interactive area
   */
  public async updateInteractiveArea(id: string, updates: Partial<InteractiveArea>, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    const areaIndex = this.mapData.interactiveAreas.findIndex(area => area.id === id);
    if (areaIndex === -1) {
      throw new Error(`Interactive area with id ${id} not found`);
    }

    const previousArea = { ...this.mapData.interactiveAreas[areaIndex] };
    this.mapData.interactiveAreas[areaIndex] = { ...previousArea, ...updates };

    this.recordChange({
      id: `update_area_${Date.now()}`,
      type: 'update',
      elementType: 'area',
      before: previousArea,
      after: this.mapData.interactiveAreas[areaIndex],
      timestamp: new Date(),
      userId: 'current_user'
    });

    this.markAsChanged();
    this.emit('map:element:updated', {
      element: this.mapData.interactiveAreas[areaIndex],
      type: 'interactive',
      source
    });
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * Remove interactive area
   */
  public async removeInteractiveArea(id: string, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    const areaIndex = this.mapData.interactiveAreas.findIndex(area => area.id === id);
    if (areaIndex === -1) {
      throw new Error(`Interactive area with id ${id} not found`);
    }

    const removedArea = this.mapData.interactiveAreas[areaIndex];
    this.mapData.interactiveAreas.splice(areaIndex, 1);

    this.recordChange({
      id: `remove_area_${Date.now()}`,
      type: 'remove',
      elementType: 'area',
      before: removedArea,
      after: null,
      timestamp: new Date(),
      userId: 'current_user'
    });

    this.markAsChanged();
    this.emit('map:element:removed', { element: removedArea, type: 'interactive', source });
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * Add collision area to the map
   */
  public async addCollisionArea(area: ImpassableArea, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    this.mapData.impassableAreas.push(area);
    
    this.recordChange({
      id: `add_collision_${Date.now()}`,
      type: 'add',
      elementType: 'collision',
      before: null,
      after: area,
      timestamp: new Date(),
      userId: 'current_user'
    });

    this.markAsChanged();
    this.emit('map:element:added', { element: area, type: 'collision', source });
  }

  /**
   * Update collision area
   */
  public async updateCollisionArea(id: string, updates: Partial<ImpassableArea>, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    const areaIndex = this.mapData.impassableAreas.findIndex(area => area.id === id);
    if (areaIndex === -1) {
      throw new Error(`Collision area with id ${id} not found`);
    }

    const previousArea = { ...this.mapData.impassableAreas[areaIndex] };
    this.mapData.impassableAreas[areaIndex] = { ...previousArea, ...updates };

    this.recordChange({
      id: `update_collision_${Date.now()}`,
      type: 'update',
      elementType: 'collision',
      before: previousArea,
      after: this.mapData.impassableAreas[areaIndex],
      timestamp: new Date(),
      userId: 'current_user'
    });

    this.markAsChanged();
    this.emit('map:element:updated', {
      element: this.mapData.impassableAreas[areaIndex],
      type: 'collision',
      source
    });
  }

  /**
   * Remove collision area
   */
  public async removeCollisionArea(id: string, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    const areaIndex = this.mapData.impassableAreas.findIndex(area => area.id === id);
    if (areaIndex === -1) {
      throw new Error(`Collision area with id ${id} not found`);
    }

    const removedArea = this.mapData.impassableAreas[areaIndex];
    this.mapData.impassableAreas.splice(areaIndex, 1);

    this.recordChange({
      id: `remove_collision_${Date.now()}`,
      type: 'remove',
      elementType: 'collision',
      before: removedArea,
      after: null,
      timestamp: new Date(),
      userId: 'current_user'
    });

    this.markAsChanged();
    this.emit('map:element:removed', { element: removedArea, type: 'collision', source });
  }

  /**
   * Validate and scale background image dimensions for user uploads
   */
  public validateBackgroundImageDimensions(width: number, height: number): { width: number; height: number; scaled: boolean } {
    return this.validateAndScaleImageDimensions(width, height);
  }

  /**
   * Get maximum allowed world dimensions
   */
  public static getMaxWorldDimensions(): { width: number; height: number } {
    return {
      width: SharedMapSystem.MAX_WORLD_WIDTH,
      height: SharedMapSystem.MAX_WORLD_HEIGHT
    };
  }

  /**
   * Detect and update dimensions from actual loaded image
   * This fixes mismatches between stored and actual dimensions
   */
  public async detectAndUpdateImageDimensions(imageUrl?: string): Promise<void> {
    if (!this.mapData) {
      throw new Error('Map data not initialized');
    }

    const targetImageUrl = imageUrl || this.mapData.backgroundImage;
    if (!targetImageUrl) {
      console.warn('🔍 DIMENSION DETECTION: No background image to detect dimensions from');
      return;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = async () => {
        const actualDimensions = { width: img.width, height: img.height };
        const storedDimensions = this.getEffectiveDimensions();


        // If there's a mismatch, update to actual dimensions
        if (actualDimensions.width !== storedDimensions.width || actualDimensions.height !== storedDimensions.height) {
          await this.updateDimensionsFromBackgroundImage(targetImageUrl, actualDimensions, 'load');
        }

        resolve();
      };

      img.onerror = (error) => {
        console.error('❌ DIMENSION DETECTION FAILED:', error);
        reject(new Error(`Failed to load image for dimension detection: ${targetImageUrl}`));
      };

      img.src = targetImageUrl;
    });
  }

  /**
   * Event system for map synchronization
   */
  public on(eventType: MapEventType, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  public off(eventType: MapEventType, callback: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public emit(eventType: MapEventType, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in map event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Export map data for backup or sharing
   * TODO: Add cloud storage integration for sharing maps between users
   */
  public exportMapData(): string {
    if (!this.mapData) {
      throw new Error('No map data to export');
    }
    return JSON.stringify(this.mapData, null, 2);
  }

  /**
   * Import map data from exported JSON
   * TODO: Add validation and conflict resolution for imported maps
   */
  public async importMapData(jsonData: string, source: 'world' | 'editor' = 'editor'): Promise<void> {
    try {
      const importedData: SharedMapData = JSON.parse(jsonData);

      // Validate imported data structure
      if (!this.validateMapData(importedData)) {
        throw new Error('Invalid map data structure');
      }

      // Convert date strings to Date objects
      importedData.lastModified = new Date(importedData.lastModified);

      await this.saveMapData(importedData);
      this.emit('map:loaded', { mapData: importedData, source });
    } catch (error) {
      console.error('Failed to import map data:', error);
      throw error;
    }
  }

  /**
   * Create backup of current map data
   * TODO: Implement automatic backup scheduling and cloud backup
   */
  private createBackup(data: SharedMapData): void {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        data: data
      };
      localStorage.setItem(STORAGE_KEYS.MAP_BACKUP, JSON.stringify(backupData));
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(): Promise<void> {
    try {
      const backupData = localStorage.getItem(STORAGE_KEYS.MAP_BACKUP);
      if (!backupData) {
        throw new Error('No backup data found');
      }

      const backup = JSON.parse(backupData);
      await this.saveMapData(backup.data);
      this.emit('map:loaded', { mapData: backup.data, source: 'backup' });
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Clean up localStorage when quota is exceeded
   */
  private cleanupStorage(): void {
    try {

      // Clear old history entries more aggressively
      this.changeHistory = this.changeHistory.slice(-5); // Keep only last 5 changes

      // Clear other potential large items
      const keysToCheck = [STORAGE_KEYS.MAP_DATA, STORAGE_KEYS.MAP_BACKUP];
      keysToCheck.forEach(key => {
        const item = localStorage.getItem(key);
        if (item && item.length > 1000000) { // If item is larger than 1MB
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
      console.error('❌ FAILED TO CLEANUP STORAGE:', error);
    }
  }

  /**
   * Record change for undo/redo functionality
   */
  private recordChange(change: MapChange): void {
    this.changeHistory.push(change);

    // Limit history size
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }

    // Save to localStorage with quota handling
    try {
      localStorage.setItem(STORAGE_KEYS.MAP_HISTORY, JSON.stringify(this.changeHistory));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('⚠️ STORAGE QUOTA EXCEEDED, ATTEMPTING CLEANUP');
        this.cleanupStorage();

        // Try saving again after cleanup
        try {
          localStorage.setItem(STORAGE_KEYS.MAP_HISTORY, JSON.stringify(this.changeHistory));
        } catch (retryError) {
          console.error('❌ FAILED TO SAVE HISTORY EVEN AFTER CLEANUP:', retryError);
          // Clear history entirely as last resort
          this.changeHistory = [];
          localStorage.removeItem(STORAGE_KEYS.MAP_HISTORY);
        }
      } else {
        console.error('❌ FAILED TO SAVE MAP HISTORY:', error);
      }
    }
  }

  /**
   * Get change history
   */
  public getChangeHistory(): MapChange[] {
    return [...this.changeHistory];
  }

  /**
   * Clear change history
   */
  public clearHistory(): void {
    this.changeHistory = [];
    localStorage.removeItem(STORAGE_KEYS.MAP_HISTORY);
  }

  /**
   * Validate map data structure
   */
  private validateMapData(data: any): data is SharedMapData {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.interactiveAreas) &&
      Array.isArray(data.impassableAreas) &&
      data.worldDimensions &&
      typeof data.worldDimensions.width === 'number' &&
      typeof data.worldDimensions.height === 'number' &&
      typeof data.version === 'number'
    );
  }

  /**
   * Validate and scale image dimensions to fit within maximum limits
   */
  private validateAndScaleImageDimensions(width: number, height: number): { width: number; height: number; scaled: boolean } {
    const maxWidth = SharedMapSystem.MAX_WORLD_WIDTH;
    const maxHeight = SharedMapSystem.MAX_WORLD_HEIGHT;

    // Check if dimensions exceed limits
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height, scaled: false };
    }


    // Calculate scale factor to fit within limits while maintaining aspect ratio
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = Math.floor(width * scale);
    const scaledHeight = Math.floor(height * scale);


    return { width: scaledWidth, height: scaledHeight, scaled: true };
  }

  /**
   * Load default background image and get its actual dimensions
   */
  private async loadDefaultBackgroundImage(): Promise<{ imageUrl: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {

        // Return actual dimensions without validation/scaling for default image
        // The centralized dimension system will handle validation
        resolve({
          imageUrl: '/default-background.jpg',
          width: img.width,
          height: img.height
        });
      };

      img.onerror = () => {
        console.error('❌ FAILED TO LOAD DEFAULT BACKGROUND IMAGE');
        reject(new Error('Failed to load default background image'));
      };

      // Use the static resource URL for loading
      img.src = '/default-background.jpg';
    });
  }

  /**
   * Create default map data using centralized dimension management
   */
  private async createDefaultMap(): Promise<SharedMapData> {

    // Load default background image and get actual dimensions
    let backgroundImage: string | undefined;
    let effectiveDimensions = { width: 7603, height: 3679 }; // Updated to match actual map dimensions

    try {
      const imageData = await this.loadDefaultBackgroundImage();
      backgroundImage = imageData.imageUrl;

      // Validate and scale dimensions using centralized logic
      const validatedDimensions = this.validateAndScaleImageDimensions(imageData.width, imageData.height);
      effectiveDimensions = validatedDimensions;

    } catch (error) {
      console.warn('⚠️ FAILED TO LOAD DEFAULT BACKGROUND, USING FALLBACK DIMENSIONS:', error);
      // Continue with fallback dimensions
    }

    const defaultMap: SharedMapData = {
      interactiveAreas: [
        {
          id: 'meeting-room-default',
          name: 'Meeting Room',
          type: 'meeting-room',
          x: Math.floor(effectiveDimensions.width * 0.2), // 20% from left
          y: Math.floor(effectiveDimensions.height * 0.25), // 25% from top
          width: 120,
          height: 80,
          color: '#4A90E2',
          description: 'Join the weekly team sync'
        },
        {
          id: 'coffee-corner-default',
          name: 'Coffee Corner',
          type: 'coffee-corner',
          x: Math.floor(effectiveDimensions.width * 0.6), // 60% from left
          y: Math.floor(effectiveDimensions.height * 0.7), // 70% from top
          width: 100,
          height: 80,
          color: '#D2691E',
          description: 'Casual conversations'
        }
      ],
      impassableAreas: [
        {
          id: 'wall-default',
          x: Math.floor(effectiveDimensions.width * 0.3), // 30% from left
          y: Math.floor(effectiveDimensions.height * 0.15), // 15% from top
          width: 80,
          height: 20,
          name: 'Wall Section'
        }
      ],
      worldDimensions: effectiveDimensions,
      backgroundImage: backgroundImage,
      backgroundImageDimensions: effectiveDimensions, // Keep in sync
      version: 1,
      lastModified: new Date(),
      createdBy: 'system',
      metadata: {
        name: 'Stargety Oasis',
        description: 'Default Zep-style virtual office space',
        tags: ['default', 'office', 'zep-style'],
        isPublic: true
      },
      layers: [
        {
          id: 'background-layer',
          name: 'Background',
          type: 'background',
          visible: true,
          locked: false,
          opacity: 1,
          zIndex: 0,
          elements: []
        },
        {
          id: 'interactive-layer',
          name: 'Interactive Areas',
          type: 'interactive',
          visible: true,
          locked: false,
          opacity: 1,
          zIndex: 1,
          elements: []
        },
        {
          id: 'collision-layer',
          name: 'Collision Areas',
          type: 'collision',
          visible: true,
          locked: false,
          opacity: 0.7,
          zIndex: 2,
          elements: []
        }
      ],
      assets: []
    };

    await this.saveMapData(defaultMap);
    return defaultMap;
  }

  /**
   * Initialize event listeners for cross-tab communication
   * TODO: Replace with WebSocket communication when migrating to server-side
   */
  private initializeEventListeners(): void {
    // Listen for localStorage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEYS.MAP_DATA && event.newValue) {
        try {
          const newData = JSON.parse(event.newValue);
          newData.lastModified = new Date(newData.lastModified);
          this.mapData = newData;
          this.emit('map:changed', { mapData: newData, source: 'external' });
        } catch (error) {
          console.error('Failed to parse map data from storage event:', error);
        }
      }
    });
  }

  /**
   * Get map statistics
   */
  public getMapStatistics() {
    if (!this.mapData) {
      return null;
    }

    return {
      interactiveAreasCount: this.mapData.interactiveAreas.length,
      collisionAreasCount: this.mapData.impassableAreas.length,
      layersCount: this.mapData.layers.length,
      assetsCount: this.mapData.assets.length,
      version: this.mapData.version,
      lastModified: this.mapData.lastModified,
      totalElements: this.mapData.layers.reduce((sum, layer) => sum + layer.elements.length, 0)
    };
  }
}
