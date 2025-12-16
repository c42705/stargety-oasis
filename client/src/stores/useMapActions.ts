/**
 * Map Actions Hooks - Convenience hooks for map operations
 * 
 * These hooks provide a clean interface for components to interact with the map store
 * without needing to access the store directly. They maintain the same API as the
 * previous useSharedMap hook for backward compatibility.
 */

import { useCallback } from 'react';
import { useMapStore } from './useMapStore';
import { InteractiveArea, ImpassableArea } from '../shared/MapDataContext';

/**
 * Hook for map loading and saving operations
 */
export const useMapOperations = () => {
  const {
    loadMap,
    saveMap,
    resetMap,
    importMap,
    exportMap,
    isLoading,
    error,
    clearError
  } = useMapStore();

  const handleSaveMap = useCallback(async () => {
    try {
      await saveMap();
    } catch (error) {
      console.error('Save operation failed:', error);
      throw error;
    }
  }, [saveMap]);

  const handleLoadMap = useCallback(async () => {
    try {
      await loadMap();
    } catch (error) {
      console.error('Load operation failed:', error);
      throw error;
    }
  }, [loadMap]);

  const handleResetMap = useCallback(async () => {
    try {
      await resetMap();
    } catch (error) {
      console.error('Reset operation failed:', error);
      throw error;
    }
  }, [resetMap]);

  const handleImportMap = useCallback(async (jsonData: string) => {
    try {
      await importMap(jsonData);
    } catch (error) {
      console.error('Import operation failed:', error);
      throw error;
    }
  }, [importMap]);

  const handleExportMap = useCallback(() => {
    try {
      return exportMap();
    } catch (error) {
      console.error('Export operation failed:', error);
      throw error;
    }
  }, [exportMap]);

  return {
    saveMap: handleSaveMap,
    loadMap: handleLoadMap,
    resetMap: handleResetMap,
    importMap: handleImportMap,
    exportMap: handleExportMap,
    isLoading,
    error,
    clearError
  };
};

/**
 * Hook for interactive area operations
 */
export const useInteractiveAreaActions = () => {
  const {
    addInteractiveArea,
    updateInteractiveArea,
    removeInteractiveArea,
    setInteractiveAreas
  } = useMapStore();

  const handleAddArea = useCallback((area: InteractiveArea) => {
    
    addInteractiveArea(area);
  }, [addInteractiveArea]);

  const handleUpdateArea = useCallback((id: string, updates: Partial<InteractiveArea>) => {
    
    updateInteractiveArea(id, updates);
  }, [updateInteractiveArea]);

  const handleRemoveArea = useCallback((id: string) => {
    
    removeInteractiveArea(id);
  }, [removeInteractiveArea]);

  const handleSetAreas = useCallback((areas: InteractiveArea[]) => {
    
    setInteractiveAreas(areas);
  }, [setInteractiveAreas]);

  return {
    addInteractiveArea: handleAddArea,
    updateInteractiveArea: handleUpdateArea,
    removeInteractiveArea: handleRemoveArea,
    setInteractiveAreas: handleSetAreas
  };
};

/**
 * Hook for collision area operations
 */
export const useCollisionAreaActions = () => {
  const {
    addCollisionArea,
    updateCollisionArea,
    removeCollisionArea,
    setCollisionAreas
  } = useMapStore();

  const handleAddCollision = useCallback((area: ImpassableArea) => {
    
    addCollisionArea(area);
  }, [addCollisionArea]);

  const handleUpdateCollision = useCallback((id: string, updates: Partial<ImpassableArea>) => {
    
    updateCollisionArea(id, updates);
  }, [updateCollisionArea]);

  const handleRemoveCollision = useCallback((id: string) => {
    
    removeCollisionArea(id);
  }, [removeCollisionArea]);

  const handleSetCollisions = useCallback((areas: ImpassableArea[]) => {
    
    setCollisionAreas(areas);
  }, [setCollisionAreas]);

  return {
    addCollisionArea: handleAddCollision,
    updateCollisionArea: handleUpdateCollision,
    removeCollisionArea: handleRemoveCollision,
    setCollisionAreas: handleSetCollisions
  };
};

/**
 * Hook for background and world dimension operations
 */
export const useMapConfiguration = () => {
  const {
    setBackgroundImage,
    setWorldDimensions,
    mapData
  } = useMapStore();

  const handleSetBackground = useCallback((url: string, dimensions?: { width: number; height: number }) => {
    
    setBackgroundImage(url, dimensions);
  }, [setBackgroundImage]);

  const handleSetDimensions = useCallback((dimensions: { width: number; height: number }) => {
    
    setWorldDimensions(dimensions);
  }, [setWorldDimensions]);

  return {
    setBackgroundImage: handleSetBackground,
    setWorldDimensions: handleSetDimensions,
    backgroundImage: mapData?.backgroundImage,
    backgroundImageDimensions: mapData?.backgroundImageDimensions,
    worldDimensions: mapData?.worldDimensions
  };
};

/**
 * Hook for map statistics and metadata
 */
export const useMapMetadata = () => {
  const { mapData, getMapStatistics, lastSaved, isDirty } = useMapStore();

  const statistics = getMapStatistics();

  return {
    mapData,
    statistics,
    lastSaved,
    isDirty,
    metadata: mapData?.metadata,
    version: mapData?.version
  };
};

/**
 * Auto-save hook that can be used to automatically save changes
 */
export const useAutoSave = (enabled: boolean = true, delay: number = 5000) => {
  const { isDirty, saveMap } = useMapStore();

  // TODO: Implement debounced auto-save logic
  // This would use useEffect with a timer to automatically save when isDirty is true
  
  return {
    isDirty,
    saveMap,
    autoSaveEnabled: enabled
  };
};
