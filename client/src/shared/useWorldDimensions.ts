/**
 * useWorldDimensions - React hook for world dimension management
 * 
 * This hook provides direct access to the WorldDimensionsManager without
 * event-driven complexity. It eliminates infinite loops and provides
 * predictable state management for React components.
 * 
 * Key Features:
 * - Direct state access without event loops
 * - Automatic subscription management
 * - Optimized re-renders with shallow comparison
 * - TypeScript support with full type safety
 * - Error handling and validation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WorldDimensionsManager,
  worldDimensionsManager,
  WorldDimensionsState,
  Dimensions,
  DimensionValidationResult,
  DimensionUpdateOptions,
  DIMENSION_LIMITS,
} from './WorldDimensionsManager';

// Hook return type
export interface UseWorldDimensionsReturn {
  // State
  worldDimensions: Dimensions;
  effectiveDimensions: Dimensions;
  canvasDimensions: Dimensions;
  backgroundImageDimensions?: Dimensions;
  lastUpdated: Date;
  source: string;
  
  // Actions
  updateDimensions: (dimensions: Dimensions, options?: DimensionUpdateOptions) => DimensionValidationResult;
  updateBackgroundDimensions: (dimensions: Dimensions, options?: DimensionUpdateOptions) => DimensionValidationResult;
  validateDimensions: (dimensions: Dimensions) => DimensionValidationResult;
  resetToDefault: () => DimensionValidationResult;
  
  // Utilities
  isValidDimensions: (dimensions: Dimensions) => boolean;
  getPresets: () => Record<string, Dimensions>;
  getLimits: () => typeof DIMENSION_LIMITS;
  
  // State helpers
  isLoading: boolean;
  hasChanges: boolean;
}

// Options for the hook
export interface UseWorldDimensionsOptions {
  // Subscribe to specific dimension changes only
  subscribeToWorld?: boolean;
  subscribeToEffective?: boolean;
  subscribeToCanvas?: boolean;
  subscribeToBackground?: boolean;
  
  // Performance options
  enableShallowComparison?: boolean;
  debounceMs?: number;
  
  // Debugging
  enableLogging?: boolean;
}

/**
 * Custom hook for world dimensions management
 */
export function useWorldDimensions(options: UseWorldDimensionsOptions = {}): UseWorldDimensionsReturn {
  const {
    subscribeToWorld = true,
    subscribeToEffective = true,
    subscribeToCanvas = true,
    subscribeToBackground = true,
    enableShallowComparison = true,
    debounceMs = 0,
    enableLogging = false,
  } = options;

  // State management
  const [state, setState] = useState<WorldDimensionsState>(() => worldDimensionsManager.getState());
  const [isLoading, setIsLoading] = useState(false);
  const previousStateRef = useRef<WorldDimensionsState>(state);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Shallow comparison helper
  const shouldUpdate = useCallback((newState: WorldDimensionsState, prevState: WorldDimensionsState): boolean => {
    if (!enableShallowComparison) return true;

    // Check only subscribed dimensions
    if (subscribeToWorld && 
        (newState.worldDimensions.width !== prevState.worldDimensions.width ||
         newState.worldDimensions.height !== prevState.worldDimensions.height)) {
      return true;
    }

    if (subscribeToEffective && 
        (newState.effectiveDimensions.width !== prevState.effectiveDimensions.width ||
         newState.effectiveDimensions.height !== prevState.effectiveDimensions.height)) {
      return true;
    }

    if (subscribeToCanvas && 
        (newState.canvasDimensions.width !== prevState.canvasDimensions.width ||
         newState.canvasDimensions.height !== prevState.canvasDimensions.height)) {
      return true;
    }

    if (subscribeToBackground && 
        newState.backgroundImageDimensions !== prevState.backgroundImageDimensions) {
      return true;
    }

    // Check other state changes
    if (newState.lastUpdated !== prevState.lastUpdated || newState.source !== prevState.source) {
      return true;
    }

    return false;
  }, [subscribeToWorld, subscribeToEffective, subscribeToCanvas, subscribeToBackground, enableShallowComparison]);

  // Subscription callback with debouncing and shallow comparison
  const handleStateChange = useCallback((newState: WorldDimensionsState) => {
    if (enableLogging) {
      console.log('🔄 useWorldDimensions: State change received', {
        newState,
        previousState: previousStateRef.current,
      });
    }

    // Check if update is needed
    if (!shouldUpdate(newState, previousStateRef.current)) {
      if (enableLogging) {
        console.log('🔄 useWorldDimensions: Update skipped (no relevant changes)');
      }
      return;
    }

    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Apply debouncing if specified
    if (debounceMs > 0) {
      debounceTimeoutRef.current = setTimeout(() => {
        setState(newState);
        previousStateRef.current = newState;
        setHasChanges(true);
        
        if (enableLogging) {
          console.log('🔄 useWorldDimensions: State updated (debounced)', newState);
        }
      }, debounceMs);
    } else {
      setState(newState);
      previousStateRef.current = newState;
      setHasChanges(true);
      
      if (enableLogging) {
        console.log('🔄 useWorldDimensions: State updated (immediate)', newState);
      }
    }
  }, [shouldUpdate, debounceMs, enableLogging]);

  // Subscribe to dimension changes
  useEffect(() => {
    if (enableLogging) {
      console.log('🔄 useWorldDimensions: Setting up subscription');
    }

    const unsubscribe = worldDimensionsManager.subscribe(handleStateChange);

    // Cleanup function
    return () => {
      if (enableLogging) {
        console.log('🔄 useWorldDimensions: Cleaning up subscription');
      }
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [handleStateChange, enableLogging]);

  // Action wrappers with loading state
  const updateDimensions = useCallback((
    dimensions: Dimensions,
    options?: DimensionUpdateOptions
  ): DimensionValidationResult => {
    setIsLoading(true);
    try {
      const result = worldDimensionsManager.updateDimensions(dimensions, options);
      if (result.isValid) {
        setHasChanges(false); // Changes are now saved
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBackgroundDimensions = useCallback((
    dimensions: Dimensions,
    options?: DimensionUpdateOptions
  ): DimensionValidationResult => {
    setIsLoading(true);
    try {
      const result = worldDimensionsManager.updateBackgroundDimensions(dimensions, options);
      if (result.isValid) {
        setHasChanges(false);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateDimensions = useCallback((dimensions: Dimensions): DimensionValidationResult => {
    return worldDimensionsManager.validateDimensions(dimensions);
  }, []);

  const resetToDefault = useCallback((): DimensionValidationResult => {
    setIsLoading(true);
    try {
      const result = worldDimensionsManager.resetToDefault();
      if (result.isValid) {
        setHasChanges(false);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Utility functions
  const isValidDimensions = useCallback((dimensions: Dimensions): boolean => {
    return worldDimensionsManager.validateDimensions(dimensions).isValid;
  }, []);

  const getPresets = useCallback(() => {
    return WorldDimensionsManager.getPresets();
  }, []);

  const getLimits = useCallback(() => {
    return WorldDimensionsManager.getLimits();
  }, []);

  return {
    // State
    worldDimensions: state.worldDimensions,
    effectiveDimensions: state.effectiveDimensions,
    canvasDimensions: state.canvasDimensions,
    backgroundImageDimensions: state.backgroundImageDimensions,
    lastUpdated: state.lastUpdated,
    source: state.source,
    
    // Actions
    updateDimensions,
    updateBackgroundDimensions,
    validateDimensions,
    resetToDefault,
    
    // Utilities
    isValidDimensions,
    getPresets,
    getLimits,
    
    // State helpers
    isLoading,
    hasChanges,
  };
}

/**
 * Hook for read-only access to world dimensions (no update methods)
 * Useful for components that only need to read dimensions
 */
export function useWorldDimensionsReadOnly(options: UseWorldDimensionsOptions = {}) {
  const {
    worldDimensions,
    effectiveDimensions,
    canvasDimensions,
    backgroundImageDimensions,
    lastUpdated,
    source,
    validateDimensions,
    isValidDimensions,
    getPresets,
    getLimits,
    isLoading,
    hasChanges,
  } = useWorldDimensions(options);

  return {
    worldDimensions,
    effectiveDimensions,
    canvasDimensions,
    backgroundImageDimensions,
    lastUpdated,
    source,
    validateDimensions,
    isValidDimensions,
    getPresets,
    getLimits,
    isLoading,
    hasChanges,
  };
}

/**
 * Hook for specific dimension type access
 */
export function useSpecificDimensions(type: 'world' | 'effective' | 'canvas' = 'effective') {
  const { worldDimensions, effectiveDimensions, canvasDimensions } = useWorldDimensionsReadOnly({
    subscribeToWorld: type === 'world',
    subscribeToEffective: type === 'effective',
    subscribeToCanvas: type === 'canvas',
    subscribeToBackground: false,
  });

  switch (type) {
    case 'world':
      return worldDimensions;
    case 'effective':
      return effectiveDimensions;
    case 'canvas':
      return canvasDimensions;
    default:
      return effectiveDimensions;
  }
}
