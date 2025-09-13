import { useState, useCallback } from 'react';
import { GridConfig } from '../types/editor.types';
import { DEFAULT_GRID_CONFIG } from '../constants/editorConstants';

export const useGridConfig = () => {
  const [gridConfig, setGridConfig] = useState<GridConfig>(DEFAULT_GRID_CONFIG);

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

  return {
    gridConfig,
    setGridConfig,
    toggleGrid,
    updateGridSpacing,
    updateGridOpacity,
    updateGridPattern,
    updateSnapToGrid
  };
};
