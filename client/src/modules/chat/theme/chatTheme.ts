/**
 * Chat Theme Configuration
 * 
 * Provides theme configurations for chat components
 * Supports light and dark modes with Ant Design theming
 */

import { ThemeConfig } from 'antd';

// Light mode theme
export const chatLightTheme: ThemeConfig = {
  token: {
    // Colors
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Background colors
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f0f2f5',
    colorBgSpotlight: '#ffffff',
    
    // Text colors
    colorText: '#000000d9',
    colorTextSecondary: '#00000073',
    colorTextTertiary: '#00000040',
    colorTextQuaternary: '#00000026',
    
    // Border colors
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // Message colors
    colorBgTextHover: '#f5f5f5',
    colorBgTextActive: '#e6f7ff',
    
    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    borderRadius: 8,
  },
  components: {
    // Message component theme
    Message: {
      colorBgContainer: '#ffffff',
      colorBorder: '#e8e8e8',
      borderRadiusLG: 12,
    },
  },
};

// Dark mode theme
export const chatDarkTheme: ThemeConfig = {
  token: {
    // Colors
    colorPrimary: '#177ddc',
    colorSuccess: '#49aa19',
    colorWarning: '#d89614',
    colorError: '#d32029',
    colorInfo: '#177ddc',
    
    // Background colors
    colorBgContainer: '#141414',
    colorBgElevated: '#1f1f1f',
    colorBgLayout: '#000000',
    colorBgSpotlight: '#262626',
    
    // Text colors
    colorText: '#ffffffd9',
    colorTextSecondary: '#ffffff73',
    colorTextTertiary: '#ffffff40',
    colorTextQuaternary: '#ffffff26',
    
    // Border colors
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
    
    // Message colors
    colorBgTextHover: '#262626',
    colorBgTextActive: '#111b26',
    
    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    borderRadius: 8,
  },
  components: {
    // Message component theme
    Message: {
      colorBgContainer: '#1f1f1f',
      colorBorder: '#303030',
      borderRadiusLG: 12,
    },
  },
};

// Message-specific colors
export const messageColors = {
  light: {
    own: {
      background: '#e6f7ff',
      border: '#91d5ff',
      text: '#000000d9',
    },
    other: {
      background: '#ffffff',
      border: '#e8e8e8',
      text: '#000000d9',
    },
    system: {
      background: '#f5f5f5',
      border: '#d9d9d9',
      text: '#00000073',
    },
    edited: {
      background: '#fff7e6',
      border: '#ffd591',
      text: '#000000d9',
    },
  },
  dark: {
    own: {
      background: '#111b26',
      border: '#177ddc',
      text: '#ffffffd9',
    },
    other: {
      background: '#1f1f1f',
      border: '#303030',
      text: '#ffffffd9',
    },
    system: {
      background: '#262626',
      border: '#434343',
      text: '#ffffff73',
    },
    edited: {
      background: '#2b2111',
      border: '#d89614',
      text: '#ffffffd9',
    },
  },
};

// Reaction colors
export const reactionColors = {
  light: {
    background: '#f5f5f5',
    backgroundHover: '#e6f7ff',
    border: '#d9d9d9',
    text: '#000000d9',
  },
  dark: {
    background: '#262626',
    backgroundHover: '#111b26',
    border: '#434343',
    text: '#ffffffd9',
  },
};

// Typing indicator colors
export const typingIndicatorColors = {
  light: {
    dot: '#1890ff',
    background: '#f5f5f5',
  },
  dark: {
    dot: '#177ddc',
    background: '#262626',
  },
};

// File upload colors
export const fileUploadColors = {
  light: {
    background: '#fafafa',
    border: '#d9d9d9',
    borderHover: '#40a9ff',
    success: '#52c41a',
    error: '#ff4d4f',
    progress: '#1890ff',
  },
  dark: {
    background: '#1f1f1f',
    border: '#434343',
    borderHover: '#177ddc',
    success: '#49aa19',
    error: '#d32029',
    progress: '#177ddc',
  },
};

// Search colors
export const searchColors = {
  light: {
    background: '#ffffff',
    border: '#d9d9d9',
    borderFocus: '#1890ff',
    highlight: 'rgba(24, 144, 255, 0.2)',
    text: '#000000d9',
  },
  dark: {
    background: '#1f1f1f',
    border: '#434343',
    borderFocus: '#177ddc',
    highlight: 'rgba(23, 125, 220, 0.3)',
    text: '#ffffffd9',
  },
};

// Thread colors
export const threadColors = {
  light: {
    background: '#fafafa',
    border: '#e8e8e8',
    header: '#f5f5f5',
    text: '#000000d9',
    textSecondary: '#00000073',
  },
  dark: {
    background: '#1f1f1f',
    border: '#303030',
    header: '#262626',
    text: '#ffffffd9',
    textSecondary: '#ffffff73',
  },
};

// Get theme based on mode
export const getChatTheme = (isDarkMode: boolean): ThemeConfig => {
  return isDarkMode ? chatDarkTheme : chatLightTheme;
};

// Get message colors based on mode and message type
export const getMessageColors = (
  isDarkMode: boolean,
  isOwn: boolean,
  isSystem: boolean,
  isEdited: boolean
) => {
  const mode = isDarkMode ? 'dark' : 'light';
  
  if (isSystem) return messageColors[mode].system;
  if (isEdited) return messageColors[mode].edited;
  if (isOwn) return messageColors[mode].own;
  return messageColors[mode].other;
};

// Get reaction colors based on mode
export const getReactionColors = (isDarkMode: boolean) => {
  return isDarkMode ? reactionColors.dark : reactionColors.light;
};

// Get typing indicator colors based on mode
export const getTypingIndicatorColors = (isDarkMode: boolean) => {
  return isDarkMode ? typingIndicatorColors.dark : typingIndicatorColors.light;
};

// Get file upload colors based on mode
export const getFileUploadColors = (isDarkMode: boolean) => {
  return isDarkMode ? fileUploadColors.dark : fileUploadColors.light;
};

// Get search colors based on mode
export const getSearchColors = (isDarkMode: boolean) => {
  return isDarkMode ? searchColors.dark : searchColors.light;
};

// Get thread colors based on mode
export const getThreadColors = (isDarkMode: boolean) => {
  return isDarkMode ? threadColors.dark : threadColors.light;
};
