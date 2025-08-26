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
  | 'map:sync:error';

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
  elementType: 'area' | 'collision' | 'layer' | 'asset';
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
        // Convert date strings back to Date objects
        parsedData.lastModified = new Date(parsedData.lastModified);
        this.mapData = parsedData;
        return parsedData;
      } else {
        return await this.createDefaultMap();
      }
    } catch (error) {
      console.error('Failed to load map data:', error);
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
      console.log('Save already in progress, skipping...');
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

      // Save to localStorage with error handling
      try {
        localStorage.setItem(STORAGE_KEYS.MAP_DATA, JSON.stringify(dataToSave));
      } catch (storageError) {
        if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
          throw new Error('Storage quota exceeded - unable to save map data');
        }
        throw storageError;
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
          console.log('Auto-save completed successfully');
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
   * Record change for undo/redo functionality
   */
  private recordChange(change: MapChange): void {
    this.changeHistory.push(change);

    // Limit history size
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }

    // TODO: Persist change history to database for multi-session undo/redo
    localStorage.setItem(STORAGE_KEYS.MAP_HISTORY, JSON.stringify(this.changeHistory));
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
   * Create default map data
   */
  private async createDefaultMap(): Promise<SharedMapData> {
    const defaultMap: SharedMapData = {
      interactiveAreas: [
        {
          id: 'meeting-room-default',
          name: 'Meeting Room',
          type: 'meeting-room',
          x: 150,
          y: 150,
          width: 120,
          height: 80,
          color: '#4A90E2',
          description: 'Join the weekly team sync',
          maxParticipants: 10
        },
        {
          id: 'coffee-corner-default',
          name: 'Coffee Corner',
          type: 'coffee-corner',
          x: 300,
          y: 350,
          width: 100,
          height: 80,
          color: '#D2691E',
          description: 'Casual conversations',
          maxParticipants: 6
        }
      ],
      impassableAreas: [
        {
          id: 'wall-default',
          x: 200,
          y: 100,
          width: 80,
          height: 20,
          name: 'Wall Section'
        }
      ],
      worldDimensions: {
        width: 800,
        height: 600
      },
      version: 1,
      lastModified: new Date(),
      createdBy: 'system',
      metadata: {
        name: 'Default Map',
        description: 'Default virtual world map',
        tags: ['default', 'starter'],
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
