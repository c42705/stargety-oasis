import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeType } from '../theme/theme-system';

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

  // Check if user is admin
  const isAdmin = useCallback((username: string): boolean => {
    return username.toLowerCase().includes('admin') ||
           username.toLowerCase() === 'administrator' ||
           username.toLowerCase() === 'root';
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          adminMode: isAdmin(currentUser), // Always recalculate admin mode
        }));
      } else {
        // If no saved settings, try to get theme from ThemeContext's localStorage
        // This ensures theme persistence when SettingsContext hasn't saved yet
        let initialTheme: ThemeType = 'dark';
        try {
          const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
          if (savedTheme) {
            initialTheme = savedTheme as ThemeType;
          }
        } catch (e) {
          console.warn('Failed to load theme from ThemeContext storage:', e);
        }

        // Set default with admin mode and theme from ThemeContext
        setSettings(prev => ({
          ...prev,
          adminMode: isAdmin(currentUser),
          theme: initialTheme,
        }));
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      setSettings(prev => ({
        ...prev,
        adminMode: isAdmin(currentUser),
      }));
    }
  }, [currentUser, isAdmin]);

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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
        } catch (error) {
          console.error('Failed to auto-save theme settings:', error);
        }
      }, 0);
      return newSettings;
    });
  }, []);

  // Update Jitsi server URL
  const updateJitsiServerUrl = useCallback((url: string) => {
    setSettings(prev => ({
      ...prev,
      jitsiServerUrl: url,
    }));
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    try {
      const settingsToSave = {
        theme: settings.theme,
        jitsiServerUrl: settings.jitsiServerUrl,
        // Don't save adminMode as it's calculated based on username
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    const resetSettings = {
      ...defaultSettings,
      adminMode: isAdmin(currentUser),
    };
    setSettings(resetSettings);
    localStorage.removeItem(STORAGE_KEY);
  }, [currentUser, isAdmin]);

  const contextValue: SettingsContextType = {
    settings,
    updateTheme,
    updateJitsiServerUrl,
    isAdmin,
    saveSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
