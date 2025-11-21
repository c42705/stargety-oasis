/**
 * Konva Map Editor - Layer Management Hook
 * 
 * Manages layer ordering and caching for optimal performance.
 * Layer order: Grid → Background → Shapes → Selection → UI
 */

import { useRef, useCallback } from 'react';
import type Konva from 'konva';
import type { LayerRef } from '../types';
import { LAYER } from '../constants/konvaConstants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Layer references for the editor
 */
export interface LayerRefs {
  gridLayer: LayerRef;
  backgroundLayer: LayerRef;
  shapesLayer: LayerRef;
  selectionLayer: LayerRef;
  uiLayer: LayerRef;
}

/**
 * Layer management return type
 */
export interface UseKonvaLayersReturn {
  /**
   * Layer references
   */
  layerRefs: LayerRefs;

  /**
   * Refresh a specific layer
   */
  refreshLayer: (layerName: keyof LayerRefs) => void;

  /**
   * Refresh all layers
   */
  refreshAllLayers: () => void;

  /**
   * Enable caching for a layer
   */
  enableLayerCache: (layerName: keyof LayerRefs) => void;

  /**
   * Disable caching for a layer
   */
  disableLayerCache: (layerName: keyof LayerRefs) => void;

  /**
   * Clear cache for a layer
   */
  clearLayerCache: (layerName: keyof LayerRefs) => void;

  /**
   * Batch draw all layers
   */
  batchDrawAll: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing Konva layers
 * 
 * Provides layer references and utilities for managing layer rendering,
 * caching, and performance optimization.
 * 
 * @example
 * ```typescript
 * const {
 *   layerRefs,
 *   refreshLayer,
 *   enableLayerCache,
 *   batchDrawAll
 * } = useKonvaLayers();
 * 
 * // Enable caching for static layers
 * useEffect(() => {
 *   enableLayerCache('gridLayer');
 *   enableLayerCache('backgroundLayer');
 * }, []);
 * 
 * // Refresh shapes layer when shapes change
 * useEffect(() => {
 *   refreshLayer('shapesLayer');
 * }, [shapes]);
 * ```
 */
export function useKonvaLayers(): UseKonvaLayersReturn {
  // Layer references
  const layerRefs = useRef<LayerRefs>({
    gridLayer: { current: null },
    backgroundLayer: { current: null },
    shapesLayer: { current: null },
    selectionLayer: { current: null },
    uiLayer: { current: null },
  });

  // ==========================================================================
  // LAYER REFRESH
  // ==========================================================================

  /**
   * Refresh a specific layer
   */
  const refreshLayer = useCallback((layerName: keyof LayerRefs) => {
    const layer = layerRefs.current[layerName].current;
    if (layer) {
      layer.batchDraw();
    }
  }, []);

  /**
   * Refresh all layers
   */
  const refreshAllLayers = useCallback(() => {
    Object.keys(layerRefs.current).forEach((key) => {
      const layerName = key as keyof LayerRefs;
      refreshLayer(layerName);
    });
  }, [refreshLayer]);

  // ==========================================================================
  // LAYER CACHING
  // ==========================================================================

  /**
   * Enable caching for a layer
   */
  const enableLayerCache = useCallback((layerName: keyof LayerRefs) => {
    const layer = layerRefs.current[layerName].current;
    if (layer && LAYER.ENABLE_CACHING) {
      layer.cache();
      layer.batchDraw();
    }
  }, []);

  /**
   * Disable caching for a layer
   */
  const disableLayerCache = useCallback((layerName: keyof LayerRefs) => {
    const layer = layerRefs.current[layerName].current;
    if (layer) {
      layer.clearCache();
      layer.batchDraw();
    }
  }, []);

  /**
   * Clear cache for a layer
   */
  const clearLayerCache = useCallback((layerName: keyof LayerRefs) => {
    const layer = layerRefs.current[layerName].current;
    if (layer) {
      layer.clearCache();
      if (LAYER.ENABLE_CACHING) {
        layer.cache();
      }
      layer.batchDraw();
    }
  }, []);

  // ==========================================================================
  // BATCH DRAWING
  // ==========================================================================

  /**
   * Batch draw all layers
   */
  const batchDrawAll = useCallback(() => {
    Object.values(layerRefs.current).forEach((layerRef) => {
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
    });
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    layerRefs: layerRefs.current,
    refreshLayer,
    refreshAllLayers,
    enableLayerCache,
    disableLayerCache,
    clearLayerCache,
    batchDrawAll,
  };
}

// ============================================================================
// LAYER ORDER UTILITIES
// ============================================================================

/**
 * Ensure correct layer ordering
 * Grid is rendered on top of background for visibility
 *
 * @param layers - Layer references
 */
export function ensureLayerOrder(layers: LayerRefs): void {
  const layerOrder: Array<keyof LayerRefs> = [
    'backgroundLayer',  // Bottom - background image
    'gridLayer',        // On top of background for visibility
    'shapesLayer',      // Shapes on top of grid
    'selectionLayer',   // Selection indicators
    'uiLayer',          // UI elements on top
  ];

  layerOrder.forEach((layerName, index) => {
    const layer = layers[layerName].current;
    if (layer) {
      layer.zIndex(index);
    }
  });
}

/**
 * Move layer to top
 * 
 * @param layer - Layer to move
 */
export function moveLayerToTop(layer: Konva.Layer): void {
  layer.moveToTop();
}

/**
 * Move layer to bottom
 * 
 * @param layer - Layer to move
 */
export function moveLayerToBottom(layer: Konva.Layer): void {
  layer.moveToBottom();
}

/**
 * Move layer up one level
 * 
 * @param layer - Layer to move
 */
export function moveLayerUp(layer: Konva.Layer): void {
  layer.moveUp();
}

/**
 * Move layer down one level
 * 
 * @param layer - Layer to move
 */
export function moveLayerDown(layer: Konva.Layer): void {
  layer.moveDown();
}

// ============================================================================
// LAYER VISIBILITY UTILITIES
// ============================================================================

/**
 * Show layer
 * 
 * @param layer - Layer to show
 */
export function showLayer(layer: Konva.Layer): void {
  layer.show();
  layer.batchDraw();
}

/**
 * Hide layer
 * 
 * @param layer - Layer to hide
 */
export function hideLayer(layer: Konva.Layer): void {
  layer.hide();
  layer.batchDraw();
}

/**
 * Toggle layer visibility
 * 
 * @param layer - Layer to toggle
 */
export function toggleLayerVisibility(layer: Konva.Layer): void {
  if (layer.visible()) {
    hideLayer(layer);
  } else {
    showLayer(layer);
  }
}

