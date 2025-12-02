/**
 * Konva Map Editor - SharedMap Integration Adapter
 * 
 * Interfaces and adapter functions for integrating with SharedMap for real-time synchronization.
 * Handles bidirectional updates between Konva editor and SharedMapSystem.
 */

import type { Shape } from '../types';
import type { MapData, InteractiveArea, ImpassableArea } from '../../../shared/MapDataContext';
import { SharedMapSystem, MapEventType } from '../../../shared/SharedMapSystem';
import { shapesToMapData, mapDataToShapes, syncShapesWithMapData } from './mapDataAdapter';

// ============================================================================
// TYPES
// ============================================================================

/**
 * SharedMap event handler function type
 */
export type SharedMapEventHandler = (data: any) => void;

/**
 * SharedMap event subscription
 */
export interface SharedMapSubscription {
  event: MapEventType | string;
  handler: SharedMapEventHandler;
  unsubscribe: () => void;
}

/**
 * SharedMap adapter configuration
 */
export interface SharedMapAdapterConfig {
  /**
   * Enable automatic synchronization
   */
  autoSync?: boolean;

  /**
   * Debounce delay for sync operations (ms)
   */
  syncDebounceMs?: number;

  /**
   * Enable cross-tab synchronization
   */
  enableCrossTabSync?: boolean;

  /**
   * Source identifier for this editor instance
   */
  source?: string;
}

/**
 * SharedMap adapter state
 */
export interface SharedMapAdapterState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: number;
  pendingChanges: number;
}

// ============================================================================
// SHARED MAP ADAPTER CLASS
// ============================================================================

/**
 * Adapter for integrating Konva editor with SharedMapSystem
 */
export class SharedMapAdapter {
  private mapSystem: SharedMapSystem;
  private config: Required<SharedMapAdapterConfig>;
  private subscriptions: SharedMapSubscription[] = [];
  private syncTimeout: NodeJS.Timeout | null = null;
  private state: SharedMapAdapterState = {
    isConnected: false,
    isSyncing: false,
    lastSyncTimestamp: 0,
    pendingChanges: 0,
  };

  constructor(config: SharedMapAdapterConfig = {}) {
    this.mapSystem = SharedMapSystem.getInstance();
    this.config = {
      autoSync: config.autoSync ?? true,
      syncDebounceMs: config.syncDebounceMs ?? 100,
      enableCrossTabSync: config.enableCrossTabSync ?? true,
      source: config.source ?? 'konva-editor',
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the adapter and connect to SharedMapSystem
   */
  async initialize(): Promise<void> {
    await this.mapSystem.initialize();
    this.state.isConnected = true;
  }

  /**
   * Disconnect from SharedMapSystem and cleanup
   */
  disconnect(): void {
    this.unsubscribeAll();
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    this.state.isConnected = false;
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Get current adapter state
   */
  getState(): Readonly<SharedMapAdapterState> {
    return { ...this.state };
  }

  /**
   * Check if adapter is connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  // ==========================================================================
  // DATA SYNCHRONIZATION
  // ==========================================================================

  /**
   * Load shapes from SharedMapSystem
   */
  async loadShapes(): Promise<Shape[]> {
    const mapData = this.mapSystem.getMapData();
    if (!mapData) {
      return [];
    }

    return mapDataToShapes(mapData.interactiveAreas, mapData.impassableAreas);
  }

  /**
   * Save shapes to SharedMapSystem
   */
  async saveShapes(shapes: Shape[]): Promise<void> {
    const { interactiveAreas, impassableAreas } = shapesToMapData(shapes);

    // Get current map data
    const currentMapData = this.mapSystem.getMapData();
    if (!currentMapData) {
      throw new Error('Map data not initialized');
    }

    // Update map data with new areas
    const updatedMapData: MapData = {
      ...currentMapData,
      interactiveAreas,
      impassableAreas,
    };

    // Save to SharedMapSystem
    await this.mapSystem.updateMapData(updatedMapData);
    this.state.lastSyncTimestamp = Date.now();
  }

  /**
   * Sync shapes with debouncing
   */
  syncShapesDebounced(shapes: Shape[]): void {
    if (!this.config.autoSync) {
      return;
    }

    this.state.pendingChanges++;

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.saveShapes(shapes)
        .then(() => {
          this.state.pendingChanges = 0;
          this.state.isSyncing = false;
        })
        .catch((error) => {
          console.error('Failed to sync shapes:', error);
          this.state.isSyncing = false;
        });
    }, this.config.syncDebounceMs);

    this.state.isSyncing = true;
  }

  /**
   * Force immediate synchronization
   */
  async forceSyncShapes(shapes: Shape[]): Promise<void> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    this.state.isSyncing = true;
    try {
      await this.saveShapes(shapes);
      this.state.pendingChanges = 0;
    } finally {
      this.state.isSyncing = false;
    }
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  /**
   * Subscribe to SharedMap events
   */
  subscribe(event: MapEventType | string, handler: SharedMapEventHandler): SharedMapSubscription {
    this.mapSystem.on(event as MapEventType, handler);

    const subscription: SharedMapSubscription = {
      event,
      handler,
      unsubscribe: () => {
        this.mapSystem.off(event as MapEventType, handler);
        const index = this.subscriptions.indexOf(subscription);
        if (index > -1) {
          this.subscriptions.splice(index, 1);
        }
      },
    };

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Unsubscribe from all events
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((sub) => {
      this.mapSystem.off(sub.event as MapEventType, sub.handler);
    });
    this.subscriptions = [];
  }

  /**
   * Emit event to SharedMapSystem
   */
  emit(event: MapEventType | string, data: any): void {
    this.mapSystem.emit(event as MapEventType, {
      ...data,
      source: this.config.source,
      timestamp: Date.now(),
    });
  }

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  /**
   * Get current map data from SharedMapSystem
   */
  getMapData(): MapData | null {
    return this.mapSystem.getMapData();
  }

  /**
   * Update specific interactive area
   */
  async updateInteractiveArea(area: InteractiveArea): Promise<void> {
    const mapData = this.mapSystem.getMapData();
    if (!mapData) {
      throw new Error('Map data not initialized');
    }

    const updatedAreas = mapData.interactiveAreas.map((a) =>
      a.id === area.id ? area : a
    );

    await this.mapSystem.updateMapData({
      ...mapData,
      interactiveAreas: updatedAreas,
    });
  }

  /**
   * Update specific impassable area
   */
  async updateImpassableArea(area: ImpassableArea): Promise<void> {
    const mapData = this.mapSystem.getMapData();
    if (!mapData) {
      throw new Error('Map data not initialized');
    }

    const updatedAreas = mapData.impassableAreas.map((a) =>
      a.id === area.id ? area : a
    );

    await this.mapSystem.updateMapData({
      ...mapData,
      impassableAreas: updatedAreas,
    });
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new SharedMap adapter instance
 */
export function createSharedMapAdapter(config?: SharedMapAdapterConfig): SharedMapAdapter {
  return new SharedMapAdapter(config);
}

// ============================================================================
// REACT HOOK HELPER
// ============================================================================

/**
 * Setup SharedMap event listeners for React components
 * 
 * @param adapter - SharedMap adapter instance
 * @param handlers - Event handlers
 * @returns Cleanup function
 */
export function setupSharedMapListeners(
  adapter: SharedMapAdapter,
  handlers: {
    onMapChanged?: (data: any) => void;
    onElementAdded?: (data: any) => void;
    onElementUpdated?: (data: any) => void;
    onElementRemoved?: (data: any) => void;
    onMapSaved?: (data: any) => void;
    onSyncError?: (data: any) => void;
  }
): () => void {
  const subscriptions: SharedMapSubscription[] = [];

  if (handlers.onMapChanged) {
    subscriptions.push(adapter.subscribe('map:changed', handlers.onMapChanged));
  }
  if (handlers.onElementAdded) {
    subscriptions.push(adapter.subscribe('map:element:added', handlers.onElementAdded));
  }
  if (handlers.onElementUpdated) {
    subscriptions.push(adapter.subscribe('map:element:updated', handlers.onElementUpdated));
  }
  if (handlers.onElementRemoved) {
    subscriptions.push(adapter.subscribe('map:element:removed', handlers.onElementRemoved));
  }
  if (handlers.onMapSaved) {
    subscriptions.push(adapter.subscribe('map:saved', handlers.onMapSaved));
  }
  if (handlers.onSyncError) {
    subscriptions.push(adapter.subscribe('map:sync:error', handlers.onSyncError));
  }

  // Return cleanup function
  return () => {
    subscriptions.forEach((sub) => sub.unsubscribe());
  };
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert SharedMap data to Konva shapes
 * @param sharedMap - SharedMap instance or map data
 * @returns Array of Konva shapes
 */
export function sharedMapToKonvaShapes(sharedMap: any): Shape[] {
  // If sharedMap is a SharedMapSystem instance, get the map data
  const mapData = sharedMap?.getMapData ? sharedMap.getMapData() : sharedMap;

  if (!mapData) {
    return [];
  }

  // Use the mapDataAdapter to convert (including assets)
  return mapDataToShapes(
    mapData.interactiveAreas || [],
    mapData.impassableAreas || [],
    mapData.assets || []
  );
}

/**
 * Convert Konva shapes to SharedMap format
 * @param shapes - Array of Konva shapes
 * @param worldDimensions - Optional world dimensions (defaults to 800x600)
 * @returns Map data compatible with SharedMap
 */
export function konvaShapesToSharedMap(
  shapes: Shape[],
  worldDimensions: { width: number; height: number } = { width: 800, height: 600 }
): MapData {
  // Use the mapDataAdapter to convert (including assets)
  const { interactiveAreas, impassableAreas, assets } = shapesToMapData(shapes);

  return {
    interactiveAreas,
    impassableAreas,
    assets,
    worldDimensions,
  };
}

