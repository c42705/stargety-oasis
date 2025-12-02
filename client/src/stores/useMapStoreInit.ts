/**
 * Map Store Initialization Hook
 * 
 * This hook handles the initialization of the map store and ensures that
 * map data is loaded when the application starts. It replaces the complex
 * initialization logic from the SharedMapSystem.
 */

import { useMapInit } from '../redux-compat/useMapInit';

interface UseMapStoreInitOptions {
  autoLoad?: boolean;
  source?: 'editor' | 'world' | 'test';
}



/**
 * Initialize the map store and load data
 */
export const useMapStoreInit = (options: UseMapStoreInitOptions = {}) => {
  const { isReady, isLoading, mapData } = useMapInit();
  return {
    mapData,
    isLoading,
    error: null,
    isInitialized: isReady,
  };
};

/**
 * Hook for components that need to ensure the store is initialized
 * before rendering content
 */
export const useEnsureMapStoreInit = () => {
  const { isReady, isLoading, mapData } = useMapInit();
  return {
    isReady,
    isLoading,
    mapData,
  };
};
