/**
 * Konva Map Editor - Persistence Hook
 *
 * Handles save/load functionality with PostgreSQL via Redux store.
 * Editor preferences (grid, viewport, tools) are synced to UserSettings API.
 *
 * REFACTORED: Now uses Redux store (useMapStore) for map data persistence
 * instead of localStorage. PostgreSQL is the primary source of truth.
 *
 * @version 3.0.0
 * @date 2025-12-11
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  EditorState,
  UseKonvaPersistenceParams,
  UseKonvaPersistenceReturn,
} from '../types';
import { PERSISTENCE } from '../constants/konvaConstants';
import { SettingsApiService, EditorPreferences } from '../../../services/api/SettingsApiService';
import { logger } from '../../../shared/logger';
import { useMapStore } from '../../../stores/useMapStore';
import { mapDataToShapes, shapesToMapData } from '../utils/mapDataAdapter';

/**
 * Hook for state persistence
 *
 * Provides save/load functionality with PostgreSQL (via Redux store) and API sync.
 * Map data (shapes) are persisted to PostgreSQL through the Redux store.
 * Editor preferences are synced to the UserSettings API.
 *
 * @example
 * ```typescript
 * const {
 *   save,
 *   load,
 *   hasSavedState,
 *   lastSaveTime,
 * } = useKonvaPersistence({
 *   currentState: { shapes, selectedIds },
 *   onStateRestore: (state) => {
 *     setShapes(state.shapes);
 *     setSelectedIds(state.selectedIds);
 *   },
 *   storageKey: 'konva-editor-state',
 * });
 * ```
 */
export function useKonvaPersistence(
  params: UseKonvaPersistenceParams
): UseKonvaPersistenceReturn {
  const {
    currentState,
    onStateRestore,
    autoSaveDelay = PERSISTENCE.AUTO_SAVE_DELAY,
    enabled = true,
  } = params;

  // Redux store for map data persistence (PostgreSQL)
  const {
    mapData,
    saveMap,
    isDirty,
    setInteractiveAreas,
    setCollisionAreas,
    setAssets,
    markDirty,
  } = useMapStore();

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track if initial load has been done
  const initialLoadDoneRef = useRef(false);

  // ==========================================================================
  // SAVE FUNCTIONALITY
  // ==========================================================================

  /**
   * Sync editor preferences to API (async, fire and forget)
   * Only syncs lightweight preferences, not shapes/content
   */
  const syncPrefsToApiAsync = useCallback(async () => {
    try {
      // Extract editor preferences from current state
      const editorPrefs: EditorPreferences = {
        gridSize: currentState.grid?.spacing || 32,
        gridVisible: currentState.grid?.visible ?? true,
        snapToGrid: currentState.grid?.spacing ? true : false,
        zoomLevel: currentState.viewport?.zoom || 1,
        panPosition: currentState.viewport?.pan || { x: 0, y: 0 },
        selectedTool: currentState.tool?.current || 'select',
      };

      // Get userId from localStorage (or use 'anonymous' as fallback)
      const userId = localStorage.getItem('stargety_current_user') || 'anonymous';

      await SettingsApiService.updateSettings(userId, { editorPrefs });
      logger.debug('EDITOR PREFS SYNCED TO API', { userId });
    } catch (err) {
      logger.warn('FAILED TO SYNC EDITOR PREFS TO API', { error: err });
    }
  }, [currentState]);

  /**
   * Sync shapes to Redux store (which persists to PostgreSQL)
   */
  const syncShapesToStore = useCallback(() => {
    if (!currentState.shapes || currentState.shapes.length === 0) {
      return;
    }

    try {
      // Convert Konva shapes to map data format
      const { interactiveAreas, impassableAreas, assets } = shapesToMapData(currentState.shapes);

      // Update Redux store (this marks the store as dirty)
      setInteractiveAreas(interactiveAreas);
      setCollisionAreas(impassableAreas);
      setAssets(assets);
      markDirty();

      logger.debug('SHAPES SYNCED TO REDUX STORE', {
        interactiveCount: interactiveAreas.length,
        collisionCount: impassableAreas.length,
        assetCount: assets.length,
      });
    } catch (err) {
      logger.error('FAILED TO SYNC SHAPES TO STORE', { error: err });
    }
  }, [currentState.shapes, setInteractiveAreas, setCollisionAreas, setAssets, markDirty]);

  /**
   * Save current state to PostgreSQL (via Redux store)
   *
   * Map data is saved through the Redux store which persists to PostgreSQL.
   * Editor preferences are synced to the UserSettings API.
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    setIsSaving(true);
    setError(null);

    try {
      // First sync shapes to Redux store
      syncShapesToStore();

      // Save to PostgreSQL via Redux store
      await saveMap();

      // Sync preferences to API (fire and forget, for cross-device sync)
      syncPrefsToApiAsync();

      setLastSaved(Date.now());
      setIsSaving(false);
      logger.info('MAP SAVED TO POSTGRESQL');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      setIsSaving(false);
      logger.error('SAVE FAILED', { error: err });
      return false;
    }
  }, [enabled, syncShapesToStore, saveMap, syncPrefsToApiAsync]);

  // ==========================================================================
  // LOAD FUNCTIONALITY
  // ==========================================================================

  /**
   * Check if map data exists in the store
   */
  const canLoad = useCallback((): boolean => {
    if (!enabled) return false;
    return !!mapData;
  }, [enabled, mapData]);

  /**
   * Load state from Redux store (which loads from PostgreSQL)
   */
  const load = useCallback((): EditorState | null => {
    if (!enabled || !mapData) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Convert map data to Konva shapes
      const shapes = mapDataToShapes(
        mapData.interactiveAreas || [],
        mapData.impassableAreas || [],
        mapData.assets || []
      );

      // Create a partial EditorState with the loaded data
      const loadedState: EditorState = {
        ...currentState,
        shapes,
        selection: {
          ...currentState.selection,
          selectedIds: [],
        },
      };

      // Restore state
      onStateRestore(loadedState);

      setIsLoading(false);
      logger.info('MAP LOADED FROM POSTGRESQL', { shapeCount: shapes.length });
      return loadedState;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load';
      setError(errorMessage);
      setIsLoading(false);
      logger.error('LOAD FAILED', { error: err });
      return null;
    }
  }, [enabled, mapData, onStateRestore, currentState]);

  /**
   * Clear is now a no-op since we don't use localStorage for map data
   * Map data can only be reset through the Redux store's resetMap action
   */
  const clear = useCallback(() => {
    logger.debug('CLEAR CALLED - no-op for PostgreSQL persistence');
  }, []);

  // ==========================================================================
  // AUTO-SAVE (syncs to Redux store, which auto-saves to PostgreSQL)
  // ==========================================================================

  useEffect(() => {
    if (!enabled || !autoSaveEnabled) {
      // Clear timer if auto-save is disabled
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer - sync shapes to store (store handles auto-save to PostgreSQL)
    autoSaveTimerRef.current = setTimeout(() => {
      syncShapesToStore();
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [enabled, autoSaveEnabled, autoSaveDelay, currentState, syncShapesToStore]);

  // ==========================================================================
  // AUTO-LOAD ON MOUNT (from Redux store / PostgreSQL)
  // ==========================================================================

  useEffect(() => {
    if (!enabled || initialLoadDoneRef.current) return;

    // Auto-load on mount if data exists in store
    if (canLoad()) {
      load();
      initialLoadDoneRef.current = true;
    }
  }, [enabled, canLoad, load, mapData]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Actions
    save,
    load,
    clear,

    // State
    hasSavedState: canLoad(),
    lastSaveTime: lastSaved,
  };
}

