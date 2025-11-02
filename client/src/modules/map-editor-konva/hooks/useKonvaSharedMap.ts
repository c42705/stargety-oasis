/**
 * Konva Map Editor - SharedMap Integration Hook
 * 
 * Handles real-time synchronization with SharedMapSystem.
 */

import { useEffect, useCallback, useRef } from 'react';
import type { Shape, UseKonvaSharedMapParams, UseKonvaSharedMapReturn } from '../types';
import { sharedMapToKonvaShapes, konvaShapesToSharedMap } from '../utils/sharedMapAdapter';

/**
 * Hook for SharedMap integration
 * 
 * Provides bidirectional synchronization between Konva editor and SharedMapSystem.
 * Handles incoming updates from other sources and outgoing updates from editor.
 * 
 * @example
 * ```typescript
 * const {
 *   syncToSharedMap,
 *   isConnected,
 *   lastSyncTime,
 * } = useKonvaSharedMap({
 *   shapes,
 *   sharedMapSystem,
 *   onShapesUpdate: setShapes,
 *   enabled: true,
 * });
 * ```
 */
export function useKonvaSharedMap(
  params: UseKonvaSharedMapParams
): UseKonvaSharedMapReturn {
  const {
    shapes,
    sharedMapSystem,
    onShapesUpdate,
    enabled = true,
    autoSync = true,
  } = params;

  // Track if we're currently syncing (to prevent infinite loops)
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);

  // ==========================================================================
  // SYNC TO SHAREDMAP
  // ==========================================================================

  /**
   * Sync current shapes to SharedMap
   */
  const syncToSharedMap = useCallback(
    async (source: 'editor' | 'world' = 'editor') => {
      if (!enabled || !sharedMapSystem || isSyncingRef.current) return;

      isSyncingRef.current = true;

      try {
        // Convert Konva shapes to SharedMap format
        const sharedMapData = konvaShapesToSharedMap(shapes);

        // Update SharedMap
        await sharedMapSystem.updateMapData(sharedMapData, source);

        lastSyncTimeRef.current = Date.now();
      } catch (error) {
        console.error('Failed to sync to SharedMap:', error);
        throw error;
      } finally {
        isSyncingRef.current = false;
      }
    },
    [enabled, shapes, sharedMapSystem]
  );

  // ==========================================================================
  // HANDLE INCOMING UPDATES
  // ==========================================================================

  /**
   * Handle incoming SharedMap updates
   */
  const handleSharedMapUpdate = useCallback(
    (event: any) => {
      if (!enabled || isSyncingRef.current) return;

      // Only process updates from other sources (not our own)
      if (event.source === 'editor') return;

      isSyncingRef.current = true;

      try {
        const mapData = event.data?.mapData;
        if (!mapData) return;

        // Convert SharedMap data to Konva shapes
        const konvaShapes = sharedMapToKonvaShapes(mapData);

        // Update shapes
        onShapesUpdate(konvaShapes);

        lastSyncTimeRef.current = Date.now();
      } catch (error) {
        console.error('Failed to handle SharedMap update:', error);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [enabled, onShapesUpdate]
  );

  // ==========================================================================
  // SETUP EVENT LISTENERS
  // ==========================================================================

  useEffect(() => {
    if (!enabled || !sharedMapSystem) return;

    // Subscribe to SharedMap events
    const unsubscribe = sharedMapSystem.on('map:changed', handleSharedMapUpdate);

    return () => {
      unsubscribe();
    };
  }, [enabled, sharedMapSystem, handleSharedMapUpdate]);

  // ==========================================================================
  // AUTO-SYNC
  // ==========================================================================

  useEffect(() => {
    if (!enabled || !autoSync || !sharedMapSystem) return;

    // Sync on shapes change (debounced)
    const timeoutId = setTimeout(() => {
      syncToSharedMap('editor');
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [enabled, autoSync, shapes, sharedMapSystem, syncToSharedMap]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Actions
    syncToSharedMap,

    // State
    isConnected: !!sharedMapSystem,
    lastSyncTime: lastSyncTimeRef.current,
  };
}

