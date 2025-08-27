import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

// Theme Types and Interfaces
export type ThemeType = 'light' | 'dark' | 'stargety-oasis' | 'ant-default';

export interface ThemeDefinition {
  id: ThemeType;
  name: string;
  description: string;
  preview: {
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
  antdConfig: ThemeConfig;
  cssVariables: Record<string, string>;
}

// CSS Variables Interface
export interface ThemeVariables extends Record<string, string> {
  // Color Palette
  '--color-primary': string;
  '--color-accent': string;
  '--color-accent-hover': string;
  '--color-success': string;
  '--color-warning': string;
  '--color-error': string;
  '--color-info': string;

  // Background Colors
  '--color-bg-primary': string;
  '--color-bg-secondary': string;
  '--color-bg-tertiary': string;
  '--color-bg-elevated': string;
  '--color-bg-overlay': string;

  // Text Colors
  '--color-text-primary': string;
  '--color-text-secondary': string;
  '--color-text-muted': string;
  '--color-text-inverse': string;

  // Border Colors
  '--color-border': string;
  '--color-border-light': string;
  '--color-border-dark': string;

  // Spacing
  '--spacing-xs': string;
  '--spacing-sm': string;
  '--spacing-md': string;
  '--spacing-lg': string;
  '--spacing-xl': string;
  '--spacing-xxl': string;

  // Layout
  '--header-height': string;
  '--sidebar-width': string;
  '--border-radius': string;
  '--border-radius-lg': string;
  '--border-radius-sm': string;

  // Shadows
  '--shadow-sm': string;
  '--shadow-md': string;
  '--shadow-lg': string;
  '--shadow-xl': string;

  // Transitions
  '--transition-fast': string;
  '--transition-normal': string;
  '--transition-slow': string;
}

// Base theme variables that are common across all themes
const baseVariables: Partial<ThemeVariables> = {
  '--spacing-xs': '4px',
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-lg': '32px',
  '--spacing-xl': '48px',
  '--spacing-xxl': '64px',
  '--header-height': '50px',
  '--sidebar-width': '480px',
  '--border-radius': '6px',
  '--border-radius-lg': '8px',
  '--border-radius-sm': '4px',
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '--transition-fast': 'all 0.1s ease',
  '--transition-normal': 'all 0.2s ease',
  '--transition-slow': 'all 0.3s ease',
};

// Light Theme Configuration
export const lightTheme: ThemeDefinition = {
  id: 'light',
  name: 'Light Theme',
  description: 'Clean, bright interface with light backgrounds',
  preview: {
    primary: '#1890ff',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#000000',
  },
  antdConfig: {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1890ff',
      colorBgBase: '#ffffff',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorBgLayout: '#f5f5f5',
      colorText: '#000000d9',
      colorTextSecondary: '#00000073',
      colorTextTertiary: '#00000040',
      colorBorder: '#d9d9d9',
      colorBorderSecondary: '#f0f0f0',
      borderRadius: 6,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    components: {
      Layout: {
        headerBg: '#ffffff',
        siderBg: '#ffffff',
        bodyBg: '#f5f5f5',
      },
      Card: {
        colorBgContainer: '#ffffff',
        borderRadius: 8,
      },
    },
  },
  cssVariables: {
    ...baseVariables,
    '--color-primary': '#1890ff',
    '--color-accent': '#1890ff',
    '--color-accent-hover': '#40a9ff',
    '--color-success': '#52c41a',
    '--color-warning': '#faad14',
    '--color-error': '#ff4d4f',
    '--color-info': '#1890ff',
    '--color-bg-primary': '#ffffff',
    '--color-bg-secondary': '#fafafa',
    '--color-bg-tertiary': '#f5f5f5',
    '--color-bg-elevated': '#ffffff',
    '--color-bg-overlay': 'rgba(0, 0, 0, 0.45)',
    '--color-text-primary': '#000000d9',
    '--color-text-secondary': '#00000073',
    '--color-text-muted': '#00000040',
    '--color-text-inverse': '#ffffff',
    '--color-border': '#d9d9d9',
    '--color-border-light': '#f0f0f0',
    '--color-border-dark': '#bfbfbf',
  } as ThemeVariables,
};

// Dark Theme Configuration (current theme)
export const darkTheme: ThemeDefinition = {
  id: 'dark',
  name: 'Dark Theme',
  description: 'Current dark theme with blue accents',
  preview: {
    primary: '#4299e1',
    background: '#1a1d29',
    surface: '#252a3a',
    text: '#ffffff',
  },
  antdConfig: {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#4299e1',
      colorPrimaryHover: '#3182ce',
      colorSuccess: '#4caf50',
      colorWarning: '#ff9800',
      colorError: '#f44336',
      colorInfo: '#4299e1',
      colorBgBase: '#1a1d29',
      colorBgContainer: '#252a3a',
      colorBgElevated: '#2d3748',
      colorBgLayout: '#1a1d29',
      colorText: '#ffffff',
      colorTextSecondary: '#a0aec0',
      colorTextTertiary: '#718096',
      colorBorder: '#4a5568',
      colorBorderSecondary: '#2d3748',
      borderRadius: 6,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    components: {
      Layout: {
        headerBg: '#252a3a',
        siderBg: '#252a3a',
        bodyBg: '#1a1d29',
      },
      Card: {
        colorBgContainer: '#252a3a',
        borderRadius: 8,
      },
    },
  },
  cssVariables: {
    ...baseVariables,
    '--color-primary': '#4299e1',
    '--color-accent': '#4299e1',
    '--color-accent-hover': '#3182ce',
    '--color-success': '#4caf50',
    '--color-warning': '#ff9800',
    '--color-error': '#f44336',
    '--color-info': '#4299e1',
    '--color-bg-primary': '#1a1d29',
    '--color-bg-secondary': '#252a3a',
    '--color-bg-tertiary': '#2d3748',
    '--color-bg-elevated': '#2d3748',
    '--color-bg-overlay': 'rgba(0, 0, 0, 0.75)',
    '--color-text-primary': '#ffffff',
    '--color-text-secondary': '#a0aec0',
    '--color-text-muted': '#718096',
    '--color-text-inverse': '#000000',
    '--color-border': '#4a5568',
    '--color-border-light': '#2d3748',
    '--color-border-dark': '#718096',
  } as ThemeVariables,
};

// Stargety Oasis Custom Theme Configuration
export const stargetyOasisTheme: ThemeDefinition = {
  id: 'stargety-oasis',
  name: 'Stargety Oasis',
  description: 'Branded theme with custom colors and gradients',
  preview: {
    primary: '#667eea',
    background: '#0f0f23',
    surface: '#1a1a3a',
    text: '#e2e8f0',
  },
  antdConfig: {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#667eea',
      colorPrimaryHover: '#5a67d8',
      colorSuccess: '#48bb78',
      colorWarning: '#ed8936',
      colorError: '#f56565',
      colorInfo: '#667eea',
      colorBgBase: '#0f0f23',
      colorBgContainer: '#1a1a3a',
      colorBgElevated: '#2d2d5a',
      colorBgLayout: '#0f0f23',
      colorText: '#e2e8f0',
      colorTextSecondary: '#a0aec0',
      colorTextTertiary: '#718096',
      colorBorder: '#4a5568',
      colorBorderSecondary: '#2d3748',
      borderRadius: 8,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    components: {
      Layout: {
        headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        siderBg: '#1a1a3a',
        bodyBg: '#0f0f23',
      },
      Card: {
        colorBgContainer: '#1a1a3a',
        borderRadius: 12,
      },
      Button: {
        borderRadius: 8,
        colorPrimary: '#667eea',
        colorPrimaryHover: '#5a67d8',
      },
    },
  },
  cssVariables: {
    ...baseVariables,
    '--color-primary': '#667eea',
    '--color-accent': '#667eea',
    '--color-accent-hover': '#5a67d8',
    '--color-success': '#48bb78',
    '--color-warning': '#ed8936',
    '--color-error': '#f56565',
    '--color-info': '#667eea',
    '--color-bg-primary': '#0f0f23',
    '--color-bg-secondary': '#1a1a3a',
    '--color-bg-tertiary': '#2d2d5a',
    '--color-bg-elevated': '#2d2d5a',
    '--color-bg-overlay': 'rgba(15, 15, 35, 0.85)',
    '--color-text-primary': '#e2e8f0',
    '--color-text-secondary': '#a0aec0',
    '--color-text-muted': '#718096',
    '--color-text-inverse': '#0f0f23',
    '--color-border': '#4a5568',
    '--color-border-light': '#2d3748',
    '--color-border-dark': '#718096',
    '--border-radius': '8px',
    '--border-radius-lg': '12px',
    '--border-radius-sm': '6px',
  } as ThemeVariables,
};

// Ant Design Default Theme Configuration
export const antDefaultTheme: ThemeDefinition = {
  id: 'ant-default',
  name: 'Ant Design Default',
  description: 'Pure Ant Design theme without custom overrides',
  preview: {
    primary: '#1677ff',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
  },
  antdConfig: {
    algorithm: theme.defaultAlgorithm,
    // Minimal token overrides to maintain Ant Design defaults
    token: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  },
  cssVariables: {
    ...baseVariables,
    '--color-primary': '#1677ff',
    '--color-accent': '#1677ff',
    '--color-accent-hover': '#4096ff',
    '--color-success': '#52c41a',
    '--color-warning': '#faad14',
    '--color-error': '#ff4d4f',
    '--color-info': '#1677ff',
    '--color-bg-primary': '#ffffff',
    '--color-bg-secondary': '#fafafa',
    '--color-bg-tertiary': '#f5f5f5',
    '--color-bg-elevated': '#ffffff',
    '--color-bg-overlay': 'rgba(0, 0, 0, 0.45)',
    '--color-text-primary': '#000000d9',
    '--color-text-secondary': '#00000073',
    '--color-text-muted': '#00000040',
    '--color-text-inverse': '#ffffff',
    '--color-border': '#d9d9d9',
    '--color-border-light': '#f0f0f0',
    '--color-border-dark': '#bfbfbf',
  } as ThemeVariables,
};

// Theme Registry
export const themeRegistry = new Map<ThemeType, ThemeDefinition>([
  ['light', lightTheme],
  ['dark', darkTheme],
  ['stargety-oasis', stargetyOasisTheme],
  ['ant-default', antDefaultTheme],
]);

// Theme Management Functions
export const registerTheme = (theme: ThemeDefinition): void => {
  themeRegistry.set(theme.id, theme);
};

export const getTheme = (themeId: ThemeType): ThemeDefinition | undefined => {
  return themeRegistry.get(themeId);
};

export const getAllThemes = (): ThemeDefinition[] => {
  return Array.from(themeRegistry.values());
};

export const getThemeNames = (): { value: ThemeType; label: string }[] => {
  return Array.from(themeRegistry.values()).map(theme => ({
    value: theme.id,
    label: theme.name,
  }));
};
