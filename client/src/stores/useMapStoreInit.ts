/**
 * Map Store Initialization Hook
 * 
 * This hook handles the initialization of the map store and ensures that
 * map data is loaded when the application starts. It replaces the complex
 * initialization logic from the SharedMapSystem.
 */

import { useEffect, useRef } from 'react';
import { useMapStore } from './useMapStore';

interface UseMapStoreInitOptions {
  autoLoad?: boolean;
  source?: 'editor' | 'world' | 'test';
}

/**
 * Initialize the map store and load data
 */
export const useMapStoreInit = (options: UseMapStoreInitOptions = {}) => {
  const { autoLoad = true, source = 'editor' } = options;
  const { loadMap, mapData, isLoading, error } = useMapStore();
  const initializationRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current || !autoLoad) {
      return;
    }

    initializationRef.current = true;

    const initializeStore = async () => {
      try {
        console.log(`🚀 INITIALIZING MAP STORE FOR: ${source}`);
        await loadMap();
        console.log(`✅ MAP STORE INITIALIZED FOR: ${source}`);
      } catch (error) {
        console.error(`❌ FAILED TO INITIALIZE MAP STORE FOR: ${source}`, error);
      }
    };

    initializeStore();
  }, [autoLoad, source, loadMap]);

  return {
    mapData,
    isLoading,
    error,
    isInitialized: !!mapData && !isLoading
  };
};

/**
 * Hook for components that need to ensure the store is initialized
 * before rendering content
 */
export const useEnsureMapStoreInit = () => {
  const { mapData, isLoading, loadMap } = useMapStore();
  const hasTriedInit = useRef(false);

  useEffect(() => {
    if (!mapData && !isLoading && !hasTriedInit.current) {
      hasTriedInit.current = true;
      console.log('🔄 ENSURING MAP STORE IS INITIALIZED');
      loadMap();
    }
  }, [mapData, isLoading, loadMap]);

  return {
    isReady: !!mapData && !isLoading,
    isLoading,
    mapData
  };
};
