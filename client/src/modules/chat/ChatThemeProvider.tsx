/**
 * Chat Theme Provider
 * Provides theme context for chat components with dark mode support
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme, ThemeConfig } from 'antd';

export type ChatThemeMode = 'light' | 'dark' | 'auto';

export interface ChatTheme {
  mode: ChatThemeMode;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

interface ChatThemeContextType {
  theme: ChatTheme;
  toggleTheme: () => void;
  setThemeMode: (mode: ChatThemeMode) => void;
  isDark: boolean;
}

const ChatThemeContext = createContext<ChatThemeContextType | undefined>(undefined);

// Light theme colors
const lightColors = {
  primary: '#1890ff',
  secondary: '#722ed1',
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#000000d9',
  textSecondary: '#00000073',
  border: '#d9d9d9',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',
};

// Dark theme colors
const darkColors = {
  primary: '#177ddc',
  secondary: '#9254de',
  background: '#141414',
  surface: '#1f1f1f',
  text: '#ffffffd9',
  textSecondary: '#ffffff73',
  border: '#424242',
  success: '#49aa19',
  warning: '#d89614',
  error: '#d9363e',
  info: '#177ddc',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const createChatTheme = (mode: ChatThemeMode, isDark: boolean): ChatTheme => {
  const colors = isDark ? darkColors : lightColors;

  return {
    mode,
    colors,
    spacing,
    borderRadius,
    shadows,
  };
};

const createAntdTheme = (isDark: boolean): ThemeConfig => {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? darkColors.primary : lightColors.primary,
      colorSuccess: isDark ? darkColors.success : lightColors.success,
      colorWarning: isDark ? darkColors.warning : lightColors.warning,
      colorError: isDark ? darkColors.error : lightColors.error,
      colorInfo: isDark ? darkColors.info : lightColors.info,
      borderRadius: borderRadius.md,
    },
    components: {
      Message: {
        contentBg: isDark ? darkColors.surface : lightColors.surface,
        colorText: isDark ? darkColors.text : lightColors.text,
      },
      Input: {
        colorBgContainer: isDark ? darkColors.surface : lightColors.background,
        colorBorder: isDark ? darkColors.border : lightColors.border,
        colorText: isDark ? darkColors.text : lightColors.text,
      },
      Button: {
        colorPrimary: isDark ? darkColors.primary : lightColors.primary,
        colorPrimaryHover: isDark ? '#40a9ff' : '#40a9ff',
      },
      Card: {
        colorBgContainer: isDark ? darkColors.surface : lightColors.background,
        colorBorder: isDark ? darkColors.border : lightColors.border,
      },
      List: {
        colorText: isDark ? darkColors.text : lightColors.text,
        colorTextDescription: isDark ? darkColors.textSecondary : lightColors.textSecondary,
      },
      Modal: {
        contentBg: isDark ? darkColors.surface : lightColors.background,
      },
      Dropdown: {
        colorBgElevated: isDark ? darkColors.surface : lightColors.background,
      },
      Menu: {
        colorBgContainer: isDark ? darkColors.surface : lightColors.background,
        colorText: isDark ? darkColors.text : lightColors.text,
      },
      Tooltip: {
        colorBgSpotlight: isDark ? darkColors.surface : lightColors.background,
        colorText: isDark ? darkColors.text : lightColors.text,
      },
      Popover: {
        colorBgElevated: isDark ? darkColors.surface : lightColors.background,
      },
      Drawer: {
        colorBgElevated: isDark ? darkColors.surface : lightColors.background,
      },
    },
  };
};

interface ChatThemeProviderProps {
  children: ReactNode;
  defaultMode?: ChatThemeMode;
}

export const ChatThemeProvider: React.FC<ChatThemeProviderProps> = ({
  children,
  defaultMode = 'auto',
}) => {
  // Get user settings from localStorage (Redux settings slice not available)
  const getSavedTheme = (): ChatThemeMode | null => {
    try {
      const saved = localStorage.getItem('stargetyOasisSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.theme as ChatThemeMode;
      }
    } catch {
      // Fallback to default if localStorage read fails
    }
    return null;
  };

  const savedThemeMode = getSavedTheme();

  const [themeMode, setThemeModeState] = useState<ChatThemeMode>(
    savedThemeMode || defaultMode
  );

  // Detect system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Determine if dark mode should be active
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemPrefersDark);

  // Create theme object
  const chatTheme = createChatTheme(themeMode, isDark);
  const antdThemeConfig = createAntdTheme(isDark);

  // Toggle theme
  const toggleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  };

  // Set specific theme mode
  const setThemeMode = (mode: ChatThemeMode) => {
    setThemeModeState(mode);
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const contextValue: ChatThemeContextType = {
    theme: chatTheme,
    toggleTheme,
    setThemeMode,
    isDark,
  };

  return (
    <ChatThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={antdThemeConfig}>
        {children}
      </ConfigProvider>
    </ChatThemeContext.Provider>
  );
};

/**
 * Hook to use chat theme
 */
export const useChatTheme = (): ChatThemeContextType => {
  const context = useContext(ChatThemeContext);
  if (!context) {
    throw new Error('useChatTheme must be used within ChatThemeProvider');
  }
  return context;
};

/**
 * Hook to get theme colors
 */
export const useChatThemeColors = () => {
  const { theme } = useChatTheme();
  return theme.colors;
};

/**
 * Hook to get theme spacing
 */
export const useChatThemeSpacing = () => {
  const { theme } = useChatTheme();
  return theme.spacing;
};

/**
 * Hook to get theme border radius
 */
export const useChatThemeBorderRadius = () => {
  const { theme } = useChatTheme();
  return theme.borderRadius;
};

/**
 * Hook to get theme shadows
 */
export const useChatThemeShadows = () => {
  const { theme } = useChatTheme();
  return theme.shadows;
};

/**
 * Hook to check if dark mode is active
 */
export const useIsDarkMode = (): boolean => {
  const { isDark } = useChatTheme();
  return isDark;
};
