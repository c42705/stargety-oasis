import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ThemeType } from '../theme/theme-system';
import { SettingsApiService } from '../services/api/SettingsApiService';
import { logger } from './logger';

export interface AppSettings {
  adminMode: boolean;
  theme: ThemeType;
  jitsiServerUrl?: string; // Optional custom Jitsi server URL
}

interface SettingsContextType {
  settings: AppSettings;
  updateTheme: (theme: ThemeType) => void;
  updateJitsiServerUrl: (url: string) => void;
  isAdmin: (username: string) => boolean;
  saveSettings: () => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  adminMode: false,
  theme: 'light',
};

const STORAGE_KEY = 'stargetyOasisSettings';
const THEME_STORAGE_KEY = 'stargetyOasisTheme'; // ThemeContext's storage key

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
  currentUser: string;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children, currentUser }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedFromApi = useRef(false);

  // Check if user is admin
  const isAdmin = useCallback((username: string): boolean => {
    return username.toLowerCase().includes('admin') ||
           username.toLowerCase() === 'administrator' ||
           username.toLowerCase() === 'root';
  }, []);

  // Load settings from API first, fallback to localStorage
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);

      // Try API first
      try {
        const result = await SettingsApiService.getSettings(currentUser);
        if (result.success && result.data) {
          hasLoadedFromApi.current = true;
          setSettings({
            theme: (result.data.theme || 'dark') as ThemeType,
            jitsiServerUrl: result.data.jitsiServerUrl,
            adminMode: isAdmin(currentUser),
          });
          logger.info('SETTINGS LOADED FROM API', { userId: currentUser });
          setIsLoading(false);
          return;
        }
      } catch (error) {
        logger.warn('API SETTINGS LOAD FAILED, USING LOCALSTORAGE', { error });
      }

      // Fallback to localStorage
      try {
        const savedSettings = localStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({
            ...prev,
            ...parsed,
            adminMode: isAdmin(currentUser),
          }));
        } else {
          // If no saved settings, try to get theme from ThemeContext's localStorage
          let initialTheme: ThemeType = 'dark';
          try {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme) {
              initialTheme = savedTheme as ThemeType;
            }
          } catch (e) {
            logger.warn('FAILED TO LOAD THEME FROM THEMECONTEXT STORAGE', { error: e });
          }

          setSettings(prev => ({
            ...prev,
            adminMode: isAdmin(currentUser),
            theme: initialTheme,
          }));
        }
      } catch (error) {
        logger.error('FAILED TO LOAD SETTINGS FROM LOCALSTORAGE', { error });
        setSettings(prev => ({
          ...prev,
          adminMode: isAdmin(currentUser),
        }));
      }

      setIsLoading(false);
    };

    loadSettings();
  }, [currentUser, isAdmin]);

  // Async helper to save to API (fire and forget)
  const saveToApiAsync = useCallback(async (settingsData: { theme: ThemeType; jitsiServerUrl?: string }) => {
    try {
      // Map client theme types to API-compatible types
      // API accepts 'light' | 'dark' | 'system', but client has more themes
      const apiTheme = (settingsData.theme === 'light' || settingsData.theme === 'dark')
        ? settingsData.theme
        : 'dark'; // Default to dark for custom themes

      await SettingsApiService.updateSettings(currentUser, {
        theme: apiTheme,
        jitsiServerUrl: settingsData.jitsiServerUrl,
      });
      logger.info('SETTINGS SAVED TO API', { userId: currentUser });
    } catch (error) {
      logger.warn('API SETTINGS SAVE FAILED', { error });
    }
  }, [currentUser]);

  // Update theme preference
  const updateTheme = useCallback((theme: ThemeType) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        theme: theme,
      };
      // Auto-save settings when theme changes
      setTimeout(() => {
        try {
          const settingsToSave = {
            theme: newSettings.theme,
            jitsiServerUrl: newSettings.jitsiServerUrl,
          };
          // Save to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
          // Sync to API (fire and forget)
          saveToApiAsync(settingsToSave);
        } catch (error) {
          logger.error('FAILED TO AUTO-SAVE THEME SETTINGS', { error });
        }
      }, 0);
      return newSettings;
    });
  }, [saveToApiAsync]);

  // Update Jitsi server URL
  const updateJitsiServerUrl = useCallback((url: string) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        jitsiServerUrl: url,
      };
      // Auto-save when Jitsi URL changes
      setTimeout(() => {
        try {
          const settingsToSave = {
            theme: newSettings.theme,
            jitsiServerUrl: newSettings.jitsiServerUrl,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
          saveToApiAsync(settingsToSave);
        } catch (error) {
          logger.error('FAILED TO AUTO-SAVE JITSI SETTINGS', { error });
        }
      }, 0);
      return newSettings;
    });
  }, [saveToApiAsync]);

  // Save settings to localStorage and API
  const saveSettings = useCallback(() => {
    try {
      const settingsToSave = {
        theme: settings.theme,
        jitsiServerUrl: settings.jitsiServerUrl,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      saveToApiAsync(settingsToSave);
    } catch (error) {
      logger.error('FAILED TO SAVE SETTINGS', { error });
    }
  }, [settings, saveToApiAsync]);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    const resetSettingsData = {
      ...defaultSettings,
      adminMode: isAdmin(currentUser),
    };
    setSettings(resetSettingsData);
    localStorage.removeItem(STORAGE_KEY);
    // Sync reset to API
    saveToApiAsync({ theme: defaultSettings.theme, jitsiServerUrl: undefined });
  }, [currentUser, isAdmin, saveToApiAsync]);

  const contextValue: SettingsContextType = {
    settings,
    updateTheme,
    updateJitsiServerUrl,
    isAdmin,
    saveSettings,
    resetSettings,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
