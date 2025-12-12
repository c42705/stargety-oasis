/**
 * Hook for managing animated GIF settings and performance
 *
 * Provides global controls for animated GIF playback, performance monitoring,
 * and automatic optimization based on the number of active GIFs.
 *
 * REFACTORED (2025-12-11): Now uses SettingsApiService for persistence.
 * Settings are stored as part of editorPrefs in PostgreSQL.
 * localStorage is used only as a session cache.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '../../../shared/logger';
import { SettingsApiService } from '../../../services/api/SettingsApiService';

export interface AnimatedGifSettings {
  /** Enable/disable all GIF animations globally */
  enabled: boolean;
  /** Default playback speed (1.0 = normal) */
  defaultSpeed: number;
  /** Maximum number of GIFs before showing performance warning */
  maxGifsWarningThreshold: number;
  /** Maximum number of GIFs allowed on map */
  maxGifsLimit: number;
  /** Auto-pause GIFs when too many are active */
  autoPauseOnOverload: boolean;
}

export interface AnimatedGifStats {
  /** Total number of GIF shapes on the map */
  totalGifs: number;
  /** Number of currently playing GIFs */
  playingGifs: number;
  /** Whether performance warning should be shown */
  showWarning: boolean;
  /** Whether limit has been reached */
  limitReached: boolean;
}

interface UseAnimatedGifSettingsParams {
  /** Initial settings */
  initialSettings?: Partial<AnimatedGifSettings>;
  /** Callback when settings change */
  onSettingsChange?: (settings: AnimatedGifSettings) => void;
}

interface UseAnimatedGifSettingsReturn {
  /** Current settings */
  settings: AnimatedGifSettings;
  /** Current statistics */
  stats: AnimatedGifStats;
  /** Update settings */
  updateSettings: (updates: Partial<AnimatedGifSettings>) => void;
  /** Toggle global animation enable/disable */
  toggleEnabled: () => void;
  /** Update GIF count */
  updateGifCount: (total: number, playing: number) => void;
  /** Check if a new GIF can be added */
  canAddGif: () => boolean;
  /** Reset to defaults */
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: AnimatedGifSettings = {
  enabled: true,
  defaultSpeed: 1.0,
  maxGifsWarningThreshold: 5,
  maxGifsLimit: 10,
  autoPauseOnOverload: true,
};

const STORAGE_KEY = 'konva-map-editor-gif-settings';

/**
 * Load settings from localStorage (session cache only)
 */
function loadSettingsFromCache(): AnimatedGifSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    logger.error('ANIMATED_GIF_SETTINGS_CACHE_LOAD_ERROR', { error });
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage (session cache)
 */
function saveSettingsToCache(settings: AnimatedGifSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error('ANIMATED_GIF_SETTINGS_CACHE_SAVE_ERROR', { error });
  }
}

/**
 * Hook for managing animated GIF settings
 */
export function useAnimatedGifSettings(
  params: UseAnimatedGifSettingsParams = {}
): UseAnimatedGifSettingsReturn {
  const { initialSettings, onSettingsChange } = params;
  const hasLoadedFromApi = useRef(false);

  // Load settings from cache initially, then sync from API
  const [settings, setSettings] = useState<AnimatedGifSettings>(() => {
    const loaded = loadSettingsFromCache();
    return initialSettings ? { ...loaded, ...initialSettings } : loaded;
  });

  const [stats, setStats] = useState<AnimatedGifStats>({
    totalGifs: 0,
    playingGifs: 0,
    showWarning: false,
    limitReached: false,
  });

  // Load settings from API on mount (API-first)
  useEffect(() => {
    const loadFromApi = async () => {
      try {
        // Get current user from localStorage (set by AuthContext)
        const authData = localStorage.getItem('auth');
        const userId = authData ? JSON.parse(authData).username : null;

        if (!userId) {
          logger.warn('ANIMATED_GIF_SETTINGS_NO_USER', { message: 'No user ID for API load' });
          return;
        }

        const result = await SettingsApiService.getSettings(userId);
        if (result.success && result.data?.editorPrefs) {
          // Extract GIF settings from editorPrefs (stored as JSON)
          const editorPrefs = result.data.editorPrefs as Record<string, unknown>;
          const gifSettings = editorPrefs.gifSettings as Partial<AnimatedGifSettings> | undefined;

          if (gifSettings) {
            hasLoadedFromApi.current = true;
            const mergedSettings = { ...DEFAULT_SETTINGS, ...gifSettings };
            setSettings(mergedSettings);
            saveSettingsToCache(mergedSettings); // Update cache
            logger.info('ANIMATED_GIF_SETTINGS_LOADED_FROM_API', { gifSettings });
          }
        }
      } catch (error) {
        logger.warn('ANIMATED_GIF_SETTINGS_API_LOAD_FAILED', { error });
        // Keep using cached settings
      }
    };

    loadFromApi();
  }, []);

  // Save settings to API (fire and forget)
  const saveToApiAsync = useCallback(async (newSettings: AnimatedGifSettings) => {
    try {
      const authData = localStorage.getItem('auth');
      const userId = authData ? JSON.parse(authData).username : null;

      if (!userId) return;

      // Get current editor prefs and merge with GIF settings
      const result = await SettingsApiService.getSettings(userId);
      const currentEditorPrefs = (result.success && result.data?.editorPrefs)
        ? result.data.editorPrefs as Record<string, unknown>
        : {};

      await SettingsApiService.updateSettings(userId, {
        editorPrefs: {
          ...currentEditorPrefs,
          gifSettings: newSettings,
        },
      });
      logger.info('ANIMATED_GIF_SETTINGS_SAVED_TO_API');
    } catch (error) {
      logger.warn('ANIMATED_GIF_SETTINGS_API_SAVE_FAILED', { error });
    }
  }, []);

  /**
   * Update settings
   */
  const updateSettings = useCallback(
    (updates: Partial<AnimatedGifSettings>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        saveSettingsToCache(newSettings); // Update cache
        saveToApiAsync(newSettings); // Sync to API
        onSettingsChange?.(newSettings);

        logger.info('ANIMATED_GIF_SETTINGS_UPDATED', {
          updates,
          newSettings
        });

        return newSettings;
      });
    },
    [onSettingsChange, saveToApiAsync]
  );

  /**
   * Toggle global animation enable/disable
   */
  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  /**
   * Update GIF count and calculate stats
   */
  const updateGifCount = useCallback(
    (total: number, playing: number) => {
      const showWarning = total >= settings.maxGifsWarningThreshold;
      const limitReached = total >= settings.maxGifsLimit;

      setStats({
        totalGifs: total,
        playingGifs: playing,
        showWarning,
        limitReached,
      });

      // Log warning if threshold exceeded
      if (showWarning && !limitReached) {
        logger.warn('ANIMATED_GIF_WARNING_THRESHOLD', {
          total,
          threshold: settings.maxGifsWarningThreshold,
        });
      }

      // Log error if limit reached
      if (limitReached) {
        logger.error('ANIMATED_GIF_LIMIT_REACHED', {
          total,
          limit: settings.maxGifsLimit,
        });
      }
    },
    [settings.maxGifsWarningThreshold, settings.maxGifsLimit]
  );

  /**
   * Check if a new GIF can be added
   */
  const canAddGif = useCallback(() => {
    return stats.totalGifs < settings.maxGifsLimit;
  }, [stats.totalGifs, settings.maxGifsLimit]);

  /**
   * Reset to defaults
   */
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettingsToCache(DEFAULT_SETTINGS);
    saveToApiAsync(DEFAULT_SETTINGS);
    onSettingsChange?.(DEFAULT_SETTINGS);

    logger.info('ANIMATED_GIF_SETTINGS_RESET');
  }, [onSettingsChange, saveToApiAsync]);

  return {
    settings,
    stats,
    updateSettings,
    toggleEnabled,
    updateGifCount,
    canAddGif,
    resetToDefaults,
  };
}

