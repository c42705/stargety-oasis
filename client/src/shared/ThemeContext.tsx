import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeType, ThemeDefinition, getTheme, getAllThemes, darkTheme } from '../theme/theme-system';

interface ThemeContextType {
  currentTheme: ThemeDefinition;
  themeType: ThemeType;
  availableThemes: ThemeDefinition[];
  setTheme: (themeType: ThemeType) => void;
  applyTheme: (theme: ThemeDefinition) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_STORAGE_KEY = 'stargetyOasisTheme';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeDefinition>(darkTheme);
  const [themeType, setThemeType] = useState<ThemeType>('dark');

  // Apply CSS variables to document root
  const applyCSSVariables = useCallback((theme: ThemeDefinition) => {
    const root = document.documentElement;
    
    // Apply all CSS variables from the theme
    Object.entries(theme.cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Add theme class to body for additional styling
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '') // Remove existing theme classes
      .trim();
    document.body.classList.add(`theme-${theme.id}`);
  }, []);

  // Apply theme function
  const applyTheme = useCallback((theme: ThemeDefinition) => {
    setCurrentTheme(theme);
    setThemeType(theme.id);
    applyCSSVariables(theme);
    
    // Save to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [applyCSSVariables]);

  // Set theme by type
  const setTheme = useCallback((themeType: ThemeType) => {
    const theme = getTheme(themeType);
    if (theme) {
      applyTheme(theme);
    } else {
      console.error(`Theme "${themeType}" not found`);
    }
  }, [applyTheme]);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedThemeType = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType;
      if (savedThemeType) {
        const savedTheme = getTheme(savedThemeType);
        if (savedTheme) {
          setCurrentTheme(savedTheme);
          setThemeType(savedThemeType);
          applyCSSVariables(savedTheme);
        } else {
          // Fallback to dark theme if saved theme is not found
          applyCSSVariables(darkTheme);
        }
      } else {
        // Apply default theme (dark) on first load
        applyCSSVariables(darkTheme);
      }
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error);
      applyCSSVariables(darkTheme);
    }
  }, [applyCSSVariables]);

  // Get all available themes
  const availableThemes = getAllThemes();

  const contextValue: ThemeContextType = {
    currentTheme,
    themeType,
    availableThemes,
    setTheme,
    applyTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for theme-aware components
export const useThemeAware = () => {
  const { currentTheme, themeType } = useTheme();
  
  return {
    theme: currentTheme,
    themeType,
    isDark: themeType === 'dark' || themeType === 'stargety-oasis',
    isLight: themeType === 'light' || themeType === 'ant-default',
    colors: currentTheme.cssVariables,
    antdConfig: currentTheme.antdConfig,
  };
};

// Utility function to get CSS variable value
export const getCSSVariable = (variableName: string): string => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
};

// Utility function to set CSS variable
export const setCSSVariable = (variableName: string, value: string): void => {
  document.documentElement.style.setProperty(variableName, value);
};

// Theme-aware styled component helper
export const createThemeStyles = (
  styleFunction: (theme: ThemeDefinition) => React.CSSProperties
) => {
  return (theme: ThemeDefinition): React.CSSProperties => {
    return styleFunction(theme);
  };
};

export default ThemeProvider;
