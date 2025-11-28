/**
 * Konva Map Editor - Persistence Hook
 *
 * Handles save/load functionality with localStorage and API sync.
 * Editor preferences (grid, viewport, tools) are synced to UserSettings API.
 *
 * @version 2.0.0
 * @date 2025-11-28
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Shape,
  EditorState,
  UseKonvaPersistenceParams,
  UseKonvaPersistenceReturn,
} from '../types';
import { PERSISTENCE } from '../constants/konvaConstants';
import { SettingsApiService, EditorPreferences } from '../../../services/api/SettingsApiService';
import { logger } from '../../../shared/logger';

/**
 * Persisted data structure
 */
interface PersistedData {
  shapes: Shape[];
  selectedIds: string[];
  version: number;
  timestamp: number;
}

/**
 * Hook for state persistence
 * 
 * Provides save/load functionality with localStorage, auto-save, and error recovery.
 * 
 * @example
 * ```typescript
 * const {
 *   save,
 *   load,
 *   canLoad,
 *   isSaving,
 *   lastSaved,
 *   autoSaveEnabled,
 *   setAutoSaveEnabled,
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
    storageKey = PERSISTENCE.STORAGE_KEY,
    autoSaveDelay = PERSISTENCE.AUTO_SAVE_DELAY,
    enabled = true,
  } = params;

  // State
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSaving, setIsSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch (error) {
      logger.warn('FAILED TO SYNC EDITOR PREFS TO API', { error });
    }
  }, [currentState]);

  /**
   * Save current state to localStorage (with API sync for preferences)
   *
   * Image assets stored as base64 can quickly consume localStorage space (typically 5-10MB limit).
   * Editor preferences are also synced to the API for cross-device persistence.
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    setIsSaving(true);
    setError(null);

    try {
      const data: PersistedData = {
        shapes: currentState.shapes,
        selectedIds: currentState.selection?.selectedIds || [],
        version: PERSISTENCE.VERSION,
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(data);

      // Check storage quota
      const estimatedSize = new Blob([serialized]).size;
      if (estimatedSize > PERSISTENCE.MAX_SIZE) {
        throw new Error(
          `Data size (${estimatedSize} bytes) exceeds maximum (${PERSISTENCE.MAX_SIZE} bytes). Consider reducing the number of image assets or their sizes.`
        );
      }

      // Save to localStorage (fast, for content)
      localStorage.setItem(storageKey, serialized);

      // Sync preferences to API (fire and forget, for cross-device sync)
      syncPrefsToApiAsync();

      setLastSaved(Date.now());
      setIsSaving(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      setIsSaving(false);
      logger.error('SAVE FAILED', { error: err });
      return false;
    }
  }, [enabled, currentState, storageKey, syncPrefsToApiAsync]);

  // ==========================================================================
  // LOAD FUNCTIONALITY
  // ==========================================================================

  /**
   * Check if saved data exists
   */
  const canLoad = useCallback((): boolean => {
    if (!enabled) return false;

    try {
      const saved = localStorage.getItem(storageKey);
      return !!saved;
    } catch {
      return false;
    }
  }, [enabled, storageKey]);

  /**
   * Load state from localStorage
   */
  const load = useCallback((): EditorState | null => {
    if (!enabled) return null;

    setIsLoading(true);
    setError(null);

    try {
      const saved = localStorage.getItem(storageKey);

      if (!saved) {
        throw new Error('No saved data found');
      }

      const data: PersistedData = JSON.parse(saved);

      // Validate data structure
      if (!data.shapes || !Array.isArray(data.shapes)) {
        throw new Error('Invalid data structure');
      }

      // Version check
      if (data.version !== PERSISTENCE.VERSION) {
        console.warn(
          `Data version mismatch: saved=${data.version}, current=${PERSISTENCE.VERSION}`
        );
        // TODO: Implement migration logic if needed
      }

      // Create a partial EditorState with the loaded data
      const loadedState = {
        ...currentState,
        shapes: data.shapes,
        selection: {
          ...currentState.selection,
          selectedIds: data.selectedIds || [],
        },
      };

      // Restore state
      onStateRestore(loadedState);

      setIsLoading(false);
      return loadedState;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Load failed:', err);
      return null;
    }
  }, [enabled, storageKey, onStateRestore, currentState]);

  /**
   * Clear saved data
   */
  const clear = useCallback(() => {
    if (!enabled) return;

    try {
      localStorage.removeItem(storageKey);
      setLastSaved(null);
      setError(null);
    } catch (err) {
      console.error('Clear failed:', err);
    }
  }, [enabled, storageKey]);

  // ==========================================================================
  // AUTO-SAVE
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

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [enabled, autoSaveEnabled, autoSaveDelay, currentState, save]);

  // ==========================================================================
  // AUTO-LOAD ON MOUNT
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    // Auto-load on mount if data exists
    if (canLoad()) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

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

