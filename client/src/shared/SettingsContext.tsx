import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeType } from '../theme/theme-system';

export type VideoServiceType = 'ringcentral' | 'jitsi';

export interface AppSettings {
  videoService: VideoServiceType;
  adminMode: boolean;
  theme: ThemeType;
}

interface SettingsContextType {
  settings: AppSettings;
  updateVideoService: (service: VideoServiceType) => void;
  updateTheme: (theme: ThemeType) => void;
  isAdmin: (username: string) => boolean;
  saveSettings: () => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  videoService: 'ringcentral',
  adminMode: false,
  theme: 'dark',
};

const STORAGE_KEY = 'stargetyOasisSettings';

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
        // Set default with admin mode
        setSettings(prev => ({
          ...prev,
          adminMode: isAdmin(currentUser),
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

  // Update video service preference
  const updateVideoService = useCallback((service: VideoServiceType) => {
    setSettings(prev => ({
      ...prev,
      videoService: service,
    }));
  }, []);

  // Update theme preference
  const updateTheme = useCallback((theme: ThemeType) => {
    setSettings(prev => ({
      ...prev,
      theme: theme,
    }));
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    try {
      const settingsToSave = {
        videoService: settings.videoService,
        theme: settings.theme,
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
    updateVideoService,
    updateTheme,
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
