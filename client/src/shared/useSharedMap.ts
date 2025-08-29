/**
 * React Hook for Shared Map System Integration
 * 
 * This hook provides a React-friendly interface to the SharedMapSystem,
 * handling state management and automatic re-rendering when map data changes.
 * 
 * TODO: Future Enhancements
 * - Add optimistic updates for better UX during network operations
 * - Implement conflict resolution UI for concurrent editing
 * - Add real-time collaboration features with operational transforms
 * - Integrate with user authentication for permission-based editing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SharedMapSystem, SharedMapData, MapEvent, MapEventType } from './SharedMapSystem';
import { InteractiveArea, ImpassableArea } from './MapDataContext';

export interface UseSharedMapOptions {
  autoSave?: boolean;
  saveDelay?: number;
  source?: 'world' | 'editor';
}

export interface UseSharedMapReturn {
  // Map data
  mapData: SharedMapData | null;
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
  
  // Utilities
  getMapStatistics: () => any;
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for shared map system integration
 */
export const useSharedMap = (options: UseSharedMapOptions = {}): UseSharedMapReturn => {
  const {
    autoSave = true,
    saveDelay = 18000,
    source = 'editor'
  } = options;

  // State
  const [mapData, setMapData] = useState<SharedMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mapSystemRef = useRef<SharedMapSystem | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize map system
  useEffect(() => {
    const initializeMapSystem = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        mapSystemRef.current = SharedMapSystem.getInstance();
        await mapSystemRef.current.initialize();
        
        const currentMapData = mapSystemRef.current.getMapData();
        setMapData(currentMapData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize map system');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMapSystem();
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!mapSystemRef.current) return;

    const handleMapChanged = (event: any) => {
      // Force new references so React detects changes even when arrays are mutated in place
      const md = event.mapData;
      const cloned = md ? { ...md, interactiveAreas: [...(md.interactiveAreas || [])], impassableAreas: [...(md.impassableAreas || [])] } : md;
      setMapData(cloned);
    };

    const handleMapLoaded = (event: any) => {
      const md = event.mapData;
      const cloned = md ? { ...md, interactiveAreas: [...(md.interactiveAreas || [])], impassableAreas: [...(md.impassableAreas || [])] } : md;
      setMapData(cloned);
    };

    const handleMapSaved = (event: any) => {
      // Map saved successfully
      console.log('Map saved:', event.mapData.version);
    };

    // Subscribe to events
    mapSystemRef.current.on('map:changed', handleMapChanged);
    mapSystemRef.current.on('map:loaded', handleMapLoaded);
    mapSystemRef.current.on('map:saved', handleMapSaved);

    // Cleanup
    return () => {
      if (mapSystemRef.current) {
        mapSystemRef.current.off('map:changed', handleMapChanged);
        mapSystemRef.current.off('map:loaded', handleMapLoaded);
        mapSystemRef.current.off('map:saved', handleMapSaved);
      }
    };
  }, []);

  // Auto-save functionality
  const scheduleAutoSave = useCallback(() => {
    if (!autoSave || !mapSystemRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await mapSystemRef.current!.saveMapData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auto-save failed');
      }
    }, saveDelay);
  }, [autoSave, saveDelay]);

  // Interactive area operations
  const addInteractiveArea = useCallback(async (area: InteractiveArea) => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.addInteractiveArea(area, source);
      scheduleAutoSave();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add interactive area';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [source, scheduleAutoSave]);

  const updateInteractiveArea = useCallback(async (id: string, updates: Partial<InteractiveArea>) => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.updateInteractiveArea(id, updates, source);
      scheduleAutoSave();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update interactive area';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [source, scheduleAutoSave]);

  const removeInteractiveArea = useCallback(async (id: string) => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.removeInteractiveArea(id, source);
      scheduleAutoSave();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove interactive area';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [source, scheduleAutoSave]);

  // Collision area operations
  const addCollisionArea = useCallback(async (area: ImpassableArea) => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.addCollisionArea(area, source);
      scheduleAutoSave();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add collision area';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [source, scheduleAutoSave]);

  const updateCollisionArea = useCallback(async (id: string, updates: Partial<ImpassableArea>) => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.updateCollisionArea(id, updates, source);
      scheduleAutoSave();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update collision area';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [source, scheduleAutoSave]);

  const removeCollisionArea = useCallback(async (id: string) => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.removeCollisionArea(id, source);
      scheduleAutoSave();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove collision area';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [source, scheduleAutoSave]);

  // Map operations
  const saveMap = useCallback(async () => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.saveMapData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save map';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const loadMap = useCallback(async () => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      const loadedData = await mapSystemRef.current.loadMapData();
      setMapData(loadedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load map';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportMap = useCallback(() => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      return mapSystemRef.current.exportMapData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export map';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const importMap = useCallback(async (jsonData: string) => {
    if (!mapSystemRef.current) {
      throw new Error('Map system not initialized');
    }

    try {
      setError(null);
      await mapSystemRef.current.importMapData(jsonData, source);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import map';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [source]);

  const getMapStatistics = useCallback(() => {
    if (!mapSystemRef.current) {
      return null;
    }
    return mapSystemRef.current.getMapStatistics();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadMap();
  }, [loadMap]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Map data
    mapData,
    isLoading,
    error,
    
    // Interactive areas
    interactiveAreas: mapData?.interactiveAreas || [],
    addInteractiveArea,
    updateInteractiveArea,
    removeInteractiveArea,
    
    // Collision areas
    collisionAreas: mapData?.impassableAreas || [],
    addCollisionArea,
    updateCollisionArea,
    removeCollisionArea,
    
    // Map operations
    saveMap,
    loadMap,
    exportMap,
    importMap,
    
    // Utilities
    getMapStatistics,
    clearError,
    refresh
  };
};
