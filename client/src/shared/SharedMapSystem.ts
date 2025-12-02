/**
 * SharedMapSystem - Unified map data management for WorldModule and Map Editor
 * Features: PostgreSQL persistence, Socket.IO sync, data validation, version control
 */
import { InteractiveArea, ImpassableArea } from './MapDataContext';
import { logger } from './logger';
import { SharedMapData, MapEventType, MapChange, MapEventCallback } from './mapSystem/types';
import { MapPersistenceService } from './mapSystem/MapPersistenceService';
import { MapSocketService } from './mapSystem/MapSocketService';
import { MapHistoryManager } from './mapSystem/MapHistoryManager';
import { MapAreaService } from './mapSystem/MapAreaService';
import { MapDimensionService } from './mapSystem/MapDimensionService';
import { MapEventEmitter } from './mapSystem/MapEventEmitter';

export type { SharedMapData, MapEventType, MapChange, MapLayer, MapElement, MapResource, MapEvent } from './mapSystem/types';

/**
 * SharedMapSystem - Core class for managing shared map data
 */
export class SharedMapSystem {
  private static instance: SharedMapSystem;
  private mapData: SharedMapData | null = null;
  private eventEmitter = new MapEventEmitter();

  // Services
  private persistenceService: MapPersistenceService;
  private socketService: MapSocketService;
  private historyManager: MapHistoryManager;
  private areaService: MapAreaService;
  private dimensionService: MapDimensionService;

  // Save state tracking
  private isSaving = false;
  private hasUnsavedChanges = false;
  private lastSaveTime: Date | null = null;
  private saveError: string | null = null;
  private autoSaveTimeout: NodeJS.Timeout | null = null;
  private autoSaveDelay = 2000;

  private constructor() {
    this.persistenceService = new MapPersistenceService();
    this.socketService = new MapSocketService();
    this.historyManager = new MapHistoryManager();
    this.areaService = new MapAreaService(this.historyManager);
    this.dimensionService = new MapDimensionService(this.historyManager, this.persistenceService);
    this.initializeSocketCallbacks();
  }

  /**
   * Initialize socket callbacks for real-time sync
   */
  private initializeSocketCallbacks(): void {
    this.socketService.setCallbacks({
      onMapUpdated: (data) => {
        this.mapData = data.mapData;
        this.emit('map:changed', { mapData: data.mapData, source: 'socket' });
      },
      onAssetAdded: (data) => {
        this.emit('map:element:added', { element: data.asset, type: 'asset', source: 'socket' });
      },
    });
  }

  /**
   * Set the current room ID
   */
  public setRoomId(roomId: string): void {
    this.socketService.setRoomId(roomId);
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
      logger.error('[SharedMapSystem] Failed to initialize', error);
      this.mapData = await this.persistenceService.createDefaultMap();
    }
  }

  /**
   * Load map data from PostgreSQL
   */
  public async loadMapData(): Promise<SharedMapData> {
    const roomId = this.socketService.getRoomId();
    const result = await this.persistenceService.loadMap(roomId);

    if (result.success && result.data) {
      // Check if map has background image
      if (!result.data.backgroundImage) {
        this.mapData = await this.persistenceService.createDefaultMap();
        return this.mapData;
      }
      this.mapData = result.data;
      return result.data;
    }

    // Create default map if load failed
    this.mapData = await this.persistenceService.createDefaultMap();
    return this.mapData;
  }

  /**
   * Save map data to PostgreSQL
   */
  public async saveMapData(data?: SharedMapData, force = false): Promise<void> {
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
      if (!this.persistenceService.validateMapData(dataToSave)) {
        throw new Error('Invalid map data structure - save aborted');
      }

      // Update metadata
      dataToSave.lastModified = new Date();
      dataToSave.version += 1;

      // Save to PostgreSQL
      const roomId = this.socketService.getRoomId();
      const result = await this.persistenceService.saveMap(roomId, dataToSave);

      if (!result.success) {
        throw new Error(result.error || 'Save failed');
      }

      // Notify other clients via Socket.IO
      this.socketService.emitMapUpdate(dataToSave);

      // Update state
      this.mapData = dataToSave;
      this.hasUnsavedChanges = false;
      this.lastSaveTime = new Date();

      this.emit('map:saved', {
        mapData: dataToSave,
        timestamp: this.lastSaveTime,
        version: dataToSave.version,
      });

      this.emit('map:sync:completed', {
        mapData: dataToSave,
        source: 'save_operation',
      });
    } catch (error) {
      this.saveError = error instanceof Error ? error.message : 'Unknown save error';
      logger.error('[SharedMapSystem] Save failed', error);

      this.emit('map:save:error', {
        error: this.saveError,
        timestamp: new Date(),
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
      autoSaveEnabled: this.autoSaveDelay > 0,
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
    this.historyManager.recordChange(
      MapHistoryManager.createChange('update', 'area', previousData, this.mapData)
    );

    // Mark as changed and schedule auto-save
    this.markAsChanged();
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * CENTRALIZED DIMENSION MANAGEMENT
   * This is the single source of truth for all dimension operations
   */

  /**
   * Get the current effective dimensions
   */
  public getEffectiveDimensions(): { width: number; height: number } {
    return this.dimensionService.getEffectiveDimensions(this.mapData);
  }

  /**
   * Update dimensions from background image (single source of truth)
   */
  public async updateDimensionsFromBackgroundImage(
    imageUrl: string,
    imageDimensions: { width: number; height: number },
    source: 'upload' | 'load' | 'default' = 'load'
  ): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');

    const previousDimensions = this.getEffectiveDimensions();
    const result = this.dimensionService.updateFromBackgroundImage(this.mapData, imageUrl, imageDimensions);

    this.markAsChanged();
    this.emit('map:dimensionsChanged', {
      dimensions: result.dimensions,
      previousDimensions,
      mapData: this.mapData,
      source: `background-${source}`,
    });
    this.emit('map:changed', { mapData: this.mapData, source: `background-${source}` });
  }

  /**
   * Update world dimensions manually (syncs with background dimensions)
   */
  public async updateWorldDimensions(dimensions: { width: number; height: number }, source: 'world' | 'editor' | 'migration' = 'editor'): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');

    const previousDimensions = this.getEffectiveDimensions();
    const result = this.dimensionService.updateWorldDimensions(this.mapData, dimensions, source);

    if (!result.success) throw new Error(result.error);

    this.markAsChanged();
    this.emit('map:changed', {
      mapData: this.mapData,
      source,
      dimensionsChanged: true,
      previousDimensions,
    });
  }

  /**
   * Add interactive area to the map
   */
  public async addInteractiveArea(area: InteractiveArea, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');
    this.areaService.addInteractiveArea(this.mapData, area);
    this.markAsChanged();
    this.emit('map:element:added', { element: area, type: 'interactive', source });
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * Update interactive area
   */
  public async updateInteractiveArea(id: string, updates: Partial<InteractiveArea>, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');
    const result = this.areaService.updateInteractiveArea(this.mapData, id, updates);
    if (!result.success) throw new Error(result.error);
    const updatedArea = this.areaService.getInteractiveArea(this.mapData, id);
    this.markAsChanged();
    this.emit('map:element:updated', { element: updatedArea, type: 'interactive', source });
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * Remove interactive area
   */
  public async removeInteractiveArea(id: string, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');
    const result = this.areaService.removeInteractiveArea(this.mapData, id);
    if (!result.success) throw new Error(result.error);
    this.markAsChanged();
    this.emit('map:element:removed', { element: result.removedArea, type: 'interactive', source });
    this.emit('map:changed', { mapData: this.mapData, source });
  }

  /**
   * Add collision area to the map
   */
  public async addCollisionArea(area: ImpassableArea, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');
    this.areaService.addCollisionArea(this.mapData, area);
    this.markAsChanged();
    this.emit('map:element:added', { element: area, type: 'collision', source });
  }

  /**
   * Update collision area
   */
  public async updateCollisionArea(id: string, updates: Partial<ImpassableArea>, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');
    const result = this.areaService.updateCollisionArea(this.mapData, id, updates);
    if (!result.success) throw new Error(result.error);
    const updatedArea = this.areaService.getCollisionArea(this.mapData, id);
    this.markAsChanged();
    this.emit('map:element:updated', { element: updatedArea, type: 'collision', source });
  }

  /**
   * Remove collision area
   */
  public async removeCollisionArea(id: string, source: 'world' | 'editor' = 'editor'): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');
    const result = this.areaService.removeCollisionArea(this.mapData, id);
    if (!result.success) throw new Error(result.error);
    this.markAsChanged();
    this.emit('map:element:removed', { element: result.removedArea, type: 'collision', source });
  }

  /**
   * Validate and scale background image dimensions for user uploads
   */
  public validateBackgroundImageDimensions(width: number, height: number): { width: number; height: number; scaled: boolean } {
    return this.persistenceService.validateAndScaleDimensions(width, height);
  }

  /**
   * Get maximum allowed world dimensions
   */
  public static getMaxWorldDimensions(): { width: number; height: number } {
    return MapPersistenceService.getMaxDimensions();
  }

  /**
   * Detect and update dimensions from actual loaded image
   */
  public async detectAndUpdateImageDimensions(imageUrl?: string): Promise<void> {
    if (!this.mapData) throw new Error('Map data not initialized');
    const result = await this.dimensionService.detectAndUpdateFromImage(this.mapData, imageUrl);
    if (result.updated) {
      this.markAsChanged();
      this.emit('map:dimensionsChanged', { dimensions: result.dimensions, mapData: this.mapData, source: 'detection' });
    }
  }

  /** Subscribe to an event */
  public on(eventType: MapEventType, callback: MapEventCallback): void {
    this.eventEmitter.on(eventType, callback);
  }

  /** Unsubscribe from an event */
  public off(eventType: MapEventType, callback: MapEventCallback): void {
    this.eventEmitter.off(eventType, callback);
  }

  /** Emit an event */
  public emit(eventType: MapEventType, data: unknown): void {
    this.eventEmitter.emit(eventType, data);
  }

  /**
   * Export map data for backup or sharing
   */
  public exportMapData(): string {
    if (!this.mapData) {
      throw new Error('No map data to export');
    }
    return this.persistenceService.exportMap(this.mapData);
  }

  /**
   * Import map data from exported JSON
   */
  public async importMapData(jsonData: string, source: 'world' | 'editor' = 'editor'): Promise<void> {
    const importedData = this.persistenceService.importMap(jsonData);
    if (!importedData) {
      throw new Error('Invalid map data structure');
    }

    await this.saveMapData(importedData);
    this.emit('map:loaded', { mapData: importedData, source });
  }

  /**
   * Get change history
   */
  public getChangeHistory(): MapChange[] {
    return this.historyManager.getChangeHistory();
  }

  /**
   * Clear change history
   */
  public clearHistory(): void {
    this.historyManager.clearHistory();
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
      assetsCount: this.mapData.assets?.length || 0,
      version: this.mapData.version,
      lastModified: this.mapData.lastModified,
      totalElements: this.mapData.layers.reduce((sum, layer) => sum + layer.elements.length, 0),
    };
  }
}
