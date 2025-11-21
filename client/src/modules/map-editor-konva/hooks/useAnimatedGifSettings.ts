/**
 * Hook for managing animated GIF settings and performance
 * 
 * Provides global controls for animated GIF playback, performance monitoring,
 * and automatic optimization based on the number of active GIFs.
 */

import { useState, useCallback, useEffect } from 'react';
import { logger } from '../../../shared/logger';

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
 * Load settings from localStorage
 */
function loadSettings(): AnimatedGifSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    logger.error('ANIMATED_GIF_SETTINGS_LOAD_ERROR', { error });
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: AnimatedGifSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error('ANIMATED_GIF_SETTINGS_SAVE_ERROR', { error });
  }
}

/**
 * Hook for managing animated GIF settings
 */
export function useAnimatedGifSettings(
  params: UseAnimatedGifSettingsParams = {}
): UseAnimatedGifSettingsReturn {
  const { initialSettings, onSettingsChange } = params;

  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState<AnimatedGifSettings>(() => {
    const loaded = loadSettings();
    return initialSettings ? { ...loaded, ...initialSettings } : loaded;
  });

  const [stats, setStats] = useState<AnimatedGifStats>({
    totalGifs: 0,
    playingGifs: 0,
    showWarning: false,
    limitReached: false,
  });

  /**
   * Update settings
   */
  const updateSettings = useCallback(
    (updates: Partial<AnimatedGifSettings>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        saveSettings(newSettings);
        onSettingsChange?.(newSettings);
        
        logger.info('ANIMATED_GIF_SETTINGS_UPDATED', { 
          updates,
          newSettings 
        });
        
        return newSettings;
      });
    },
    [onSettingsChange]
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
    saveSettings(DEFAULT_SETTINGS);
    onSettingsChange?.(DEFAULT_SETTINGS);
    
    logger.info('ANIMATED_GIF_SETTINGS_RESET');
  }, [onSettingsChange]);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

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

