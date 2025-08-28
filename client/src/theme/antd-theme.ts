import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

// Stargety Oasis Dark Theme Configuration for Ant Design
export const stargetyOasisTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // Color Palette - matching current CSS variables
    colorPrimary: '#4299e1',           // --color-accent
    colorPrimaryHover: '#3182ce',      // --color-accent-hover
    colorSuccess: '#4caf50',
    colorWarning: '#ff9800',
    colorError: '#f44336',
    colorInfo: '#4299e1',
    
    // Background Colors
    colorBgBase: '#1a1d29',            // --color-bg-primary
    colorBgContainer: '#252a3a',       // --color-bg-secondary
    colorBgElevated: '#2d3748',        // --color-bg-tertiary
    colorBgLayout: '#1a1d29',          // --color-bg-primary
    colorBgSpotlight: '#2d3748',       // --color-bg-tertiary
    
    // Text Colors
    colorText: '#ffffff',              // --color-text-primary
    colorTextSecondary: '#a0aec0',     // --color-text-secondary
    colorTextTertiary: '#718096',      // --color-text-muted
    colorTextQuaternary: '#718096',    // --color-text-muted
    
    // Border Colors
    colorBorder: '#4a5568',            // --color-border
    colorBorderSecondary: '#2d3748',   // --color-border-light
    
    // Component Specific
    colorFillAlter: '#252a3a',         // Alternative fill color
    colorFillContent: '#2d3748',       // Content fill color
    colorFillContentHover: '#4a5568',  // Content fill hover
    colorFillSecondary: '#252a3a',     // Secondary fill
    
    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    
    // Spacing - matching 4px base unit
    padding: 16,                       // --spacing-md
    paddingXS: 4,                      // --spacing-xs
    paddingSM: 8,                      // --spacing-sm
    paddingLG: 32,                     // --spacing-lg
    paddingXL: 48,                     // --spacing-xl
    
    margin: 16,                        // --spacing-md
    marginXS: 4,                       // --spacing-xs
    marginSM: 8,                       // --spacing-sm
    marginLG: 32,                      // --spacing-lg
    marginXL: 48,                      // --spacing-xl
    
    // Border Radius
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    
    // Layout
    sizeStep: 4,                       // Base size unit
    sizeUnit: 4,                       // Size unit
    
    // Control Heights
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
    
    // Line Heights
    lineHeight: 1.5,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.3,
    lineHeightHeading3: 1.4,
    lineHeightHeading4: 1.4,
    lineHeightHeading5: 1.5,
    
    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    
    // Z-Index
    zIndexBase: 0,
    zIndexPopupBase: 1000,
  },
  
  components: {
    // Layout Components
    Layout: {
      headerBg: '#252a3a',             // --color-bg-secondary
      headerHeight: 50,                // --header-height
      headerPadding: '0 24px',
      siderBg: '#252a3a',              // --color-bg-secondary
      bodyBg: '#1a1d29',               // --color-bg-primary
      footerBg: '#252a3a',             // --color-bg-secondary
    },
    
    // Button Components
    Button: {
      colorPrimary: '#4299e1',         // --color-accent
      colorPrimaryHover: '#3182ce',    // --color-accent-hover
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 16,
    },
    
    // Form Components
    Form: {
      labelColor: '#ffffff',           // --color-text-primary
      labelFontSize: 14,
      itemMarginBottom: 20,
    },
    
    Input: {
      colorBgContainer: '#2d3748',     // --color-bg-tertiary
      colorBorder: '#4a5568',          // --color-border
      colorText: '#ffffff',            // --color-text-primary
      colorTextPlaceholder: '#718096', // --color-text-muted
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 12,
    },
    
    // Modal Components
    Modal: {
      contentBg: '#252a3a',            // --color-bg-secondary
      headerBg: '#252a3a',             // --color-bg-secondary
      titleColor: '#ffffff',           // --color-text-primary
      borderRadius: 8,
    },
    
    // Drawer Components
    Drawer: {
      colorBgElevated: '#252a3a',      // --color-bg-secondary
      colorText: '#ffffff',            // --color-text-primary
    },
    
    // Card Components
    Card: {
      colorBgContainer: '#252a3a',     // --color-bg-secondary
      colorBorderSecondary: '#4a5568', // --color-border
      borderRadius: 8,
      paddingLG: 24,
    },
    
    // Table Components
    Table: {
      colorBgContainer: '#252a3a',     // --color-bg-secondary
      colorText: '#ffffff',            // --color-text-primary
      colorTextHeading: '#ffffff',     // --color-text-primary
      borderColor: '#4a5568',          // --color-border
    },
    
    // List Components
    List: {
      colorText: '#ffffff',            // --color-text-primary
      colorTextDescription: '#a0aec0', // --color-text-secondary
    },
    
    // Menu Components
    Menu: {
      colorBgContainer: '#252a3a',     // --color-bg-secondary
      colorText: '#a0aec0',            // --color-text-secondary
      colorItemTextSelected: '#ffffff', // --color-text-primary
      colorItemBgSelected: '#4299e1',  // --color-accent
      colorItemBgHover: '#2d3748',     // --color-bg-tertiary
    },

    // Tabs Components
    Tabs: {
      colorText: '#a0aec0',            // --color-text-secondary
      colorBgTextActive: '#ffffff',    // --color-text-primary
      colorPrimary: '#4299e1',         // --color-accent
      colorBgContainer: '#252a3a',     // --color-bg-secondary
    },
    
    // Alert Components
    Alert: {
      colorText: '#ffffff',            // --color-text-primary
      colorTextHeading: '#ffffff',     // --color-text-primary
      borderRadius: 6,
    },
    
    // Select Components
    Select: {
      colorBgContainer: '#2d3748',     // --color-bg-tertiary
      colorBorder: '#4a5568',          // --color-border
      colorText: '#ffffff',            // --color-text-primary
      colorTextPlaceholder: '#718096', // --color-text-muted
      borderRadius: 6,
      controlHeight: 32,
    },
    
    // Notification Components
    Notification: {
      colorBgElevated: '#252a3a',      // --color-bg-secondary
      colorText: '#ffffff',            // --color-text-primary
      borderRadius: 8,
    },
    
    // Message Components
    Message: {
      colorBgElevated: '#252a3a',      // --color-bg-secondary
      colorText: '#ffffff',            // --color-text-primary
      borderRadius: 6,
    },
  },
};

// Export individual theme tokens for use in custom components
export const themeTokens = {
  colors: {
    primary: '#4299e1',
    primaryHover: '#3182ce',
    bgPrimary: '#1a1d29',
    bgSecondary: '#252a3a',
    bgTertiary: '#2d3748',
    textPrimary: '#ffffff',
    textSecondary: '#a0aec0',
    textMuted: '#718096',
    border: '#4a5568',
    borderLight: '#2d3748',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 32,
    xl: 48,
    xxl: 64,
  },
  layout: {
    sidebarWidth: 480,
    headerHeight: 50,
  },
};

export default stargetyOasisTheme;
