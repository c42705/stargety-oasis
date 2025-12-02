/**
 * Shared Map Compatibility Hook
 * 
 * This hook provides the exact same interface as the legacy useSharedMap but uses Redux
 * underneath. This allows for gradual migration of components without breaking existing functionality.
 * 
 * Usage: Simply replace `import { useSharedMap }` with `import { useSharedMapCompat as useSharedMap }`
 */

import { useEffect, useCallback, useRef } from 'react';
import { useMapStore } from './useMapStore';
import { useMapStoreInit } from './useMapStoreInit';
import { InteractiveArea, ImpassableArea } from '../shared/MapDataContext';
import { useAppSelector } from '../redux/hooks';
import { selectIsInitializing } from '../redux/selectors/mapSelectors';

interface UseSharedMapOptions {
  autoSave?: boolean;
  saveDelay?: number;
  source?: 'world' | 'editor';
}

interface UseSharedMapReturn {
  // Map data
  mapData: any;
  isLoading: boolean;
  error: string | null;
  
  // Interactive areas
  interactiveAreas: InteractiveArea[];
  addInteractiveArea: (area: InteractiveArea) => Promise<void>;
  updateInteractiveArea: (id: string, updates: Partial<InteractiveArea>) => Promise<void>;
  removeInteractiveArea: (id: string) => Promise<void>;
  
  // Collision areas
  collisionAreas: ImpassableArea[];
  addCollisionArea: (area: ImpassableArea) => Promise<void>;
  updateCollisionArea: (id: string, updates: Partial<ImpassableArea>) => Promise<void>;
  removeCollisionArea: (id: string) => Promise<void>;
  
  // Map operations
  saveMap: () => Promise<void>;
  loadMap: () => Promise<void>;
  exportMap: () => string;
  importMap: (jsonData: string) => Promise<void>;
  updateWorldDimensions: (dimensions: { width: number; height: number }) => Promise<void>;
  updateMapData: (updates: any) => Promise<void>;
  
  // Utilities
  getMapStatistics: () => any;
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * Compatibility hook that provides the same interface as useSharedMap
 */
export const useSharedMapCompat = (options: UseSharedMapOptions = {}): UseSharedMapReturn => {
  const {
    saveDelay = 18000,
    source = 'editor'
  } = options;

  // Initialize the store
  useMapStoreInit({ autoLoad: true, source });

  // Get store state and actions
  const {
    mapData,
    isLoading,
    error,
    isDirty,
    autoSaveEnabled,
    autoSaveDelay,
    markDirty,
    saveMap,
    loadMap,
    exportMap,
    importMap,
    addInteractiveArea,
    updateInteractiveArea,
    removeInteractiveArea,
    addCollisionArea,
    updateCollisionArea,
    removeCollisionArea,
    setWorldDimensions,
    clearError,
    getMapStatistics
  } = useMapStore();

  // Redux-derived flags
  const isInitializing = useAppSelector(selectIsInitializing);

  // Auto-save timeout reference
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save functionality
  const scheduleAutoSave = useCallback(() => {
    // Check if auto-save is enabled and not during initialization
    if (!autoSaveEnabled || !isDirty || isInitializing) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Use the delay from store if available, otherwise use options
    const delay = autoSaveDelay || saveDelay;

    // Schedule auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveMap();
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, delay);
  }, [autoSaveEnabled, isDirty, isInitializing, autoSaveDelay, saveDelay, saveMap]);

  // Trigger auto-save when data becomes dirty
  useEffect(() => {
    if (isDirty) {
      scheduleAutoSave();
    }
  }, [isDirty, scheduleAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Async wrapper functions to match the original interface
  const handleAddInteractiveArea = useCallback(async (area: InteractiveArea) => {
    addInteractiveArea(area);
    markDirty();
  }, [addInteractiveArea, markDirty]);

  const handleUpdateInteractiveArea = useCallback(async (id: string, updates: Partial<InteractiveArea>) => {
    updateInteractiveArea(id, updates);
    markDirty();
  }, [updateInteractiveArea, markDirty]);

  const handleRemoveInteractiveArea = useCallback(async (id: string) => {
    removeInteractiveArea(id);
    markDirty();
  }, [removeInteractiveArea, markDirty]);

  const handleAddCollisionArea = useCallback(async (area: ImpassableArea) => {
    // Diagnostic log: impassable polygon persisted to store
    const { logger } = require('../shared/logger');
    logger.info('🛑 [useSharedMapCompat] addCollisionArea called', { area });
    addCollisionArea(area);
    markDirty();
  }, [addCollisionArea, markDirty]);

  const handleUpdateCollisionArea = useCallback(async (id: string, updates: Partial<ImpassableArea>) => {
    updateCollisionArea(id, updates);
    markDirty();
  }, [updateCollisionArea, markDirty]);

  const handleRemoveCollisionArea = useCallback(async (id: string) => {
    removeCollisionArea(id);
    markDirty();
  }, [removeCollisionArea, markDirty]);

  const handleUpdateWorldDimensions = useCallback(async (dimensions: { width: number; height: number }) => {
    setWorldDimensions(dimensions);
    markDirty();
  }, [setWorldDimensions, markDirty]);

  const handleUpdateMapData = useCallback(async (updates: any) => {
    // Handle partial updates for compatibility
    if (updates.interactiveAreas) {
      // Replace all interactive areas
      // Note: This is a simplified implementation
      // In a real scenario, we might need more sophisticated merging
    }
    if (updates.impassableAreas) {
      // Replace all collision areas
    }
    if (updates.backgroundImage) {
      // Update background image
    }
    if (updates.worldDimensions) {
      setWorldDimensions(updates.worldDimensions);
    }
    // Mark as dirty if any updates were made
    if (Object.keys(updates).length > 0) {
      markDirty();
    }
  }, [setWorldDimensions, markDirty]);

  const handleRefresh = useCallback(async () => {
    await loadMap();
  }, [loadMap]);

  const handleGetMapStatistics = useCallback(() => {
    return getMapStatistics();
  }, [getMapStatistics]);

  // Ensure saveMap matches Promise<void> signature
  const saveMapCompat = useCallback(async () => {
    await saveMap();
  }, [saveMap]);
  const loadMapCompat = useCallback(async () => {
    await loadMap();
  }, [loadMap]);
  const importMapCompat = useCallback(async (jsonData: string) => {
    await importMap(jsonData);
  }, [importMap]);

  return {
    // Map data
    mapData,
    isLoading,
    error,
    
    // Interactive areas
    interactiveAreas: mapData?.interactiveAreas || [],
    addInteractiveArea: handleAddInteractiveArea,
    updateInteractiveArea: handleUpdateInteractiveArea,
    removeInteractiveArea: handleRemoveInteractiveArea,
    
    // Collision areas
    collisionAreas: mapData?.impassableAreas || [],
    addCollisionArea: handleAddCollisionArea,
    updateCollisionArea: handleUpdateCollisionArea,
    removeCollisionArea: handleRemoveCollisionArea,
    
    // Map operations
    saveMap: saveMapCompat,
    loadMap: loadMapCompat,
    exportMap,
    importMap: importMapCompat,
    updateWorldDimensions: handleUpdateWorldDimensions,
    updateMapData: handleUpdateMapData,
    
    // Utilities
    getMapStatistics: handleGetMapStatistics,
    clearError,
    refresh: handleRefresh
  };
};

/**
 * Hook specifically for the Map Editor with enhanced functionality
 */
export const useMapEditorStore = () => {
  // Auto-save is now controlled by the Redux store configuration
  const compatHook = useSharedMapCompat({ source: 'editor' });
  const { isDirty, markDirty, markClean } = useMapStore();

  return {
    ...compatHook,
    isDirty,
    markDirty,
    markClean,
    // Additional editor-specific functionality can be added here
  };
};

/**
 * Hook specifically for the World Map with read-only access
 */
export const useWorldMapStore = () => {
  const compatHook = useSharedMapCompat({ source: 'world', autoSave: false });

  return {
    ...compatHook,
    // World map typically only needs read access
    // Remove write operations for safety
    addInteractiveArea: undefined,
    updateInteractiveArea: undefined,
    removeInteractiveArea: undefined,
    addCollisionArea: undefined,
    updateCollisionArea: undefined,
    removeCollisionArea: undefined,
    updateWorldDimensions: undefined,
    updateMapData: undefined,
  };
};
