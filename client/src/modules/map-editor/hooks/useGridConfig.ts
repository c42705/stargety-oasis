import { useState, useCallback, useMemo } from 'react';
import { GridConfig } from '../types/editor.types';
import { DEFAULT_GRID_CONFIG } from '../constants/editorConstants';
import { getOptimalGridSpacing, requiresPerformanceOptimization } from '../utils/zoomUtils';

export const useGridConfig = (currentZoom: number = 1.0) => {
  const [gridConfig, setGridConfig] = useState<GridConfig>(DEFAULT_GRID_CONFIG);

  // Performance-optimized grid configuration based on zoom level
  const optimizedGridConfig = useMemo(() => {
    const baseConfig = { ...gridConfig };

    // Optimize grid for high zoom levels
    if (requiresPerformanceOptimization(currentZoom)) {
      return {
        ...baseConfig,
        spacing: getOptimalGridSpacing(currentZoom, baseConfig.spacing),
        opacity: Math.max(baseConfig.opacity * 0.7, 10), // Reduce opacity at high zoom
        visible: baseConfig.visible && currentZoom < 5.0 // Hide grid at extreme zoom
      };
    }

    return baseConfig;
  }, [gridConfig, currentZoom]);

  const toggleGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, visible: !prev.visible }));
  }, []);

  const updateGridSpacing = useCallback((spacing: number) => {
    setGridConfig(prev => ({ ...prev, spacing }));
  }, []);

  const updateGridOpacity = useCallback((opacity: number) => {
    setGridConfig(prev => ({ ...prev, opacity }));
  }, []);

  const updateGridPattern = useCallback((pattern: GridConfig['pattern']) => {
    setGridConfig(prev => ({ ...prev, pattern }));
  }, []);

  const updateSnapToGrid = useCallback((snapToGrid: boolean) => {
    setGridConfig(prev => ({ ...prev, snapToGrid }));
  }, []);

  // Performance-aware grid visibility check
  const isGridOptimal = useCallback((zoom: number) => {
    return !requiresPerformanceOptimization(zoom) || zoom < 5.0;
  }, []);

  return {
    gridConfig: optimizedGridConfig,
    baseGridConfig: gridConfig,
    setGridConfig,
    toggleGrid,
    updateGridSpacing,
    updateGridOpacity,
    updateGridPattern,
    updateSnapToGrid,
    isGridOptimal
  };
};
