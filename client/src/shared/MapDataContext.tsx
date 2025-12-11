import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useMapStore } from '../stores/useMapStore';
import { useMapStoreInit } from '../stores/useMapStoreInit';

// ============================================================================
// INTERACTIVE AREA ACTION TYPES
// ============================================================================

/** Action types that an Interactive Area can trigger */
export type InteractiveAreaActionType =
  | 'none'      // No action - just visual/informational
  | 'alert'     // Show notification/message
  | 'url'       // Open URL (new tab or embedded)
  | 'modal'     // Show custom modal content
  | 'jitsi';    // Join Jitsi video conference

/** Configuration for alert action */
export interface AlertActionConfig {
  message: string;
  alertType: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // milliseconds, 0 = persistent
}

/** Configuration for URL action */
export interface UrlActionConfig {
  url: string;
  openMode: 'newTab' | 'embedded' | 'sameTab';
  embedWidth?: number;
  embedHeight?: number;
}

/** Configuration for modal action */
export interface ModalActionConfig {
  title: string;
  content: string; // Plain text or markdown
  showOnEntry: boolean;
  showOnClick: boolean;
}

/** Configuration for Jitsi action - room name is auto-derived from area name */
export interface JitsiActionConfig {
  autoJoinOnEntry: boolean; // Auto-join when entering area
  autoLeaveOnExit: boolean; // Auto-leave when exiting area
}

/** Union type for all action configs */
export type InteractiveAreaActionConfig =
  | AlertActionConfig
  | UrlActionConfig
  | ModalActionConfig
  | JitsiActionConfig
  | null;

// ============================================================================
// JITSI ROOM NAME UTILITIES
// ============================================================================

/**
 * Sanitize a string to be a valid Jitsi room name
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Prefix with 'stargety-' namespace
 */
export function sanitizeJitsiRoomName(areaName: string): string {
  return `stargety-${areaName}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get the Jitsi room name for an Interactive Area
 * Derives the room name from the area's name property
 */
export function getJitsiRoomNameForArea(area: InteractiveArea): string {
  return sanitizeJitsiRoomName(area.name);
}

// ============================================================================
// SHARED INTERFACES FOR MAP DATA
// ============================================================================

export interface InteractiveArea {
  id: string;
  name: string;
  type: 'meeting-room' | 'presentation-hall' | 'coffee-corner' | 'game-zone' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  description: string;

  // Action configuration - what happens when player enters/interacts with this area
  actionType: InteractiveAreaActionType;
  actionConfig: InteractiveAreaActionConfig;
}

export interface ImpassableArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;

  // Extended properties for polygon support
  type?: 'rectangle' | 'impassable-polygon';
  points?: { x: number; y: number }[];
  color?: string;
}

/**
 * Asset interface for image assets placed on the map
 * Represents decorative or functional images (sprites, objects, etc.)
 */
export interface Asset {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string; // Base64 encoded image data
  fileName?: string;
  rotation?: number; // Rotation in degrees
  scaleX?: number; // Horizontal scale (default: 1)
  scaleY?: number; // Vertical scale (default: 1)
}

export interface MapData {
  interactiveAreas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
  assets?: Asset[];
  worldDimensions: {
    width: number;
    height: number;
  };
  backgroundImage?: string;
  backgroundImageDimensions?: {
    width: number;
    height: number;
  };
}

interface MapDataContextType {
  mapData: MapData;
  isLoading: boolean;
  error: string | null;
  updateInteractiveAreas: (areas: InteractiveArea[]) => void;
  updateImpassableAreas: (areas: ImpassableArea[]) => void;
  addInteractiveArea: (area: InteractiveArea) => void;
  removeInteractiveArea: (id: string) => void;
  addImpassableArea: (area: ImpassableArea) => void;
  removeImpassableArea: (id: string) => void;
  updateInteractiveArea: (id: string, updates: Partial<InteractiveArea>) => void;
  updateImpassableArea: (id: string, updates: Partial<ImpassableArea>) => void;
  updateAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined);

// Default Jitsi action config for convenience
const defaultJitsiConfig: JitsiActionConfig = {
  autoJoinOnEntry: true,
  autoLeaveOnExit: true,
};

// Default map data - starts empty, user creates areas from scratch
const defaultMapData: MapData = {
  interactiveAreas: [],
  impassableAreas: [
    {
      id: 'wall-1',
      x: 200,
      y: 100,
      width: 80,
      height: 20,
      name: 'Wall Section'
    },
    {
      id: 'barrier-1',
      x: 400,
      y: 200,
      width: 60,
      height: 60,
      name: 'Barrier'
    }
  ],
  worldDimensions: {
    width: 800,
    height: 600
  },
  backgroundImage: undefined,
  backgroundImageDimensions: undefined
};

export const MapDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize the map store
  useMapStoreInit({ autoLoad: true, source: 'editor' });

  // Get map store state and actions
  const {
    mapData: storeMapData,
    isLoading: storeIsLoading,
    error: storeError,
    addInteractiveArea: storeAddInteractiveArea,
    updateInteractiveArea: storeUpdateInteractiveArea,
    removeInteractiveArea: storeRemoveInteractiveArea,
    addCollisionArea: storeAddCollisionArea,
    updateCollisionArea: storeUpdateCollisionArea,
    removeCollisionArea: storeRemoveCollisionArea,
    addAsset: storeAddAsset,
    updateAsset: storeUpdateAsset,
    removeAsset: storeRemoveAsset,
    setAssets: storeSetAssets,
    markDirty
  } = useMapStore();

  const [mapData, setMapData] = useState<MapData>(defaultMapData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync loading state with store
  useEffect(() => {
    setIsLoading(storeIsLoading ?? false);
    setError(storeError ?? null);
  }, [storeIsLoading, storeError]);

  // Sync with map store
  useEffect(() => {
    if (storeMapData) {
      setMapData({
        interactiveAreas: storeMapData.interactiveAreas || [],
        impassableAreas: storeMapData.impassableAreas || [],
        assets: storeMapData.assets || [],
        worldDimensions: storeMapData.worldDimensions || { width: 800, height: 600 },
        backgroundImage: storeMapData.backgroundImage,
        backgroundImageDimensions: storeMapData.backgroundImageDimensions
      });
    }
  }, [storeMapData]);

  // Wrapper functions that use the map store
  const updateInteractiveAreas = useCallback(async (areas: InteractiveArea[]) => {
    // For bulk updates, we'll need to handle this differently
    // For now, update local state and TODO: implement bulk update in store
    setMapData(prev => ({ ...prev, interactiveAreas: areas }));
  }, []);

  const updateImpassableAreas = useCallback(async (areas: ImpassableArea[]) => {
    // For bulk updates, we'll need to handle this differently
    // For now, update local state and TODO: implement bulk update in store
    setMapData(prev => ({ ...prev, impassableAreas: areas }));
  }, []);

  const addInteractiveArea = useCallback(async (area: InteractiveArea) => {
    try {
      storeAddInteractiveArea(area);
      markDirty();
    } catch (error) {
      console.error('Failed to add interactive area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        interactiveAreas: [...prev.interactiveAreas, area]
      }));
    }
  }, [storeAddInteractiveArea, markDirty]);

  const removeInteractiveArea = useCallback(async (id: string) => {
    try {
      storeRemoveInteractiveArea(id);
      markDirty();
    } catch (error) {
      console.error('Failed to remove interactive area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        interactiveAreas: prev.interactiveAreas.filter(area => area.id !== id)
      }));
    }
  }, [storeRemoveInteractiveArea, markDirty]);

  const addImpassableArea = useCallback(async (area: ImpassableArea) => {
    try {
      storeAddCollisionArea(area);
      markDirty();
    } catch (error) {
      console.error('Failed to add collision area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        impassableAreas: [...prev.impassableAreas, area]
      }));
    }
  }, [storeAddCollisionArea, markDirty]);

  const removeImpassableArea = useCallback(async (id: string) => {
    try {
      storeRemoveCollisionArea(id);
      markDirty();
    } catch (error) {
      console.error('Failed to remove collision area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        impassableAreas: prev.impassableAreas.filter(area => area.id !== id)
      }));
    }
  }, [storeRemoveCollisionArea, markDirty]);

  const updateInteractiveArea = useCallback(async (id: string, updates: Partial<InteractiveArea>) => {
    try {
      storeUpdateInteractiveArea(id, updates);
      markDirty();
    } catch (error) {
      console.error('Failed to update interactive area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        interactiveAreas: prev.interactiveAreas.map(area =>
          area.id === id ? { ...area, ...updates } : area
        )
      }));
    }
  }, [storeUpdateInteractiveArea, markDirty]);

  const updateImpassableArea = useCallback(async (id: string, updates: Partial<ImpassableArea>) => {
    try {
      storeUpdateCollisionArea(id, updates);
      markDirty();
    } catch (error) {
      console.error('Failed to update collision area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        impassableAreas: prev.impassableAreas.map(area =>
          area.id === id ? { ...area, ...updates } : area
        )
      }));
    }
  }, [storeUpdateCollisionArea, markDirty]);

  // Asset management functions
  const updateAssets = useCallback(async (assets: Asset[]) => {
    try {
      storeSetAssets(assets);
      markDirty();
    } catch (error) {
      console.error('Failed to update assets:', error);
      setMapData(prev => ({ ...prev, assets }));
    }
  }, [storeSetAssets, markDirty]);

  const addAsset = useCallback(async (asset: Asset) => {
    try {
      storeAddAsset(asset);
      markDirty();
    } catch (error) {
      console.error('Failed to add asset:', error);
      setMapData(prev => ({
        ...prev,
        assets: [...(prev.assets || []), asset]
      }));
    }
  }, [storeAddAsset, markDirty]);

  const removeAsset = useCallback(async (id: string) => {
    try {
      storeRemoveAsset(id);
      markDirty();
    } catch (error) {
      console.error('Failed to remove asset:', error);
      setMapData(prev => ({
        ...prev,
        assets: (prev.assets || []).filter(asset => asset.id !== id)
      }));
    }
  }, [storeRemoveAsset, markDirty]);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    try {
      storeUpdateAsset(id, updates);
      markDirty();
    } catch (error) {
      console.error('Failed to update asset:', error);
      setMapData(prev => ({
        ...prev,
        assets: (prev.assets || []).map(asset =>
          asset.id === id ? { ...asset, ...updates } : asset
        )
      }));
    }
  }, [storeUpdateAsset, markDirty]);

  const value: MapDataContextType = {
    mapData,
    isLoading,
    error,
    updateInteractiveAreas,
    updateImpassableAreas,
    addInteractiveArea,
    removeInteractiveArea,
    addImpassableArea,
    removeImpassableArea,
    updateInteractiveArea,
    updateImpassableArea,
    updateAssets,
    addAsset,
    removeAsset,
    updateAsset
  };

  return (
    <MapDataContext.Provider value={value}>
      {children}
    </MapDataContext.Provider>
  );
};

export const useMapData = (): MapDataContextType => {
  const context = useContext(MapDataContext);
  if (context === undefined) {
    throw new Error('useMapData must be used within a MapDataProvider');
  }
  return context;
};
