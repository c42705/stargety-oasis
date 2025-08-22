import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type VideoServiceType = 'ringcentral' | 'jitsi';

export interface AppSettings {
  videoService: VideoServiceType;
  adminMode: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  updateVideoService: (service: VideoServiceType) => void;
  isAdmin: (username: string) => boolean;
  saveSettings: () => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  videoService: 'ringcentral',
  adminMode: false,
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
  }, [currentUser]);

  // Check if user is admin
  const isAdmin = useCallback((username: string): boolean => {
    return username.toLowerCase().includes('admin') ||
           username.toLowerCase() === 'administrator' ||
           username.toLowerCase() === 'root';
  }, []);

  // Update video service preference
  const updateVideoService = useCallback((service: VideoServiceType) => {
    setSettings(prev => ({
      ...prev,
      videoService: service,
    }));
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    try {
      const settingsToSave = {
        videoService: settings.videoService,
        // Don't save adminMode as it's calculated based on username
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      console.log('Settings saved successfully');
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
