/**
 * useChatTheme Hook
 *
 * Provides theme-aware styling for chat components
 * Supports light/dark mode with Ant Design theme integration
 */

import { useContext, useMemo } from 'react';
import { ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';
import type { GlobalToken } from 'antd/es/theme/interface';

export interface ChatThemeColors {
  // Message colors
  messageOwn: string;
  messageOther: string;
  messageSystem: string;
  
  // Background colors
  background: string;
  backgroundHover: string;
  backgroundActive: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Accent colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Reaction colors
  reactionBackground: string;
  reactionHover: string;
  
  // Typing indicator
  typingIndicator: string;
  
  // Search highlight
  searchHighlight: string;
  
  // Thread colors
  threadBackground: string;
  threadBorder: string;
  
  // File upload
  uploadProgress: string;
  uploadSuccess: string;
  uploadError: string;
}

export function useChatTheme(): ChatThemeColors {
  const { token } = theme.useToken();
  const isDark = token?.colorBgLayout === '#141414' ||
                 token?.colorBgLayout === '#000000';

  return useMemo<ChatThemeColors>(() => {
    if (isDark) {
      // Dark theme colors
      return {
        messageOwn: '#177ddc',
        messageOther: '#2a2a2a',
        messageSystem: '#1f1f1f',
        
        background: '#141414',
        backgroundHover: '#1f1f1f',
        backgroundActive: '#262626',
        
        textPrimary: '#ffffff',
        textSecondary: '#a6a6a6',
        textTertiary: '#737373',
        
        border: '#434343',
        borderLight: '#262626',
        
        primary: '#177ddc',
        primaryHover: '#40a9ff',
        primaryActive: '#096dd9',
        
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f',
        info: '#1890ff',
        
        reactionBackground: '#262626',
        reactionHover: '#404040',
        
        typingIndicator: '#a6a6a6',
        
        searchHighlight: 'rgba(250, 173, 20, 0.3)',
        
        threadBackground: '#1f1f1f',
        threadBorder: '#262626',
        
        uploadProgress: '#177ddc',
        uploadSuccess: '#52c41a',
        uploadError: '#ff4d4f',
      };
    } else {
      // Light theme colors
      return {
        messageOwn: '#e6f7ff',
        messageOther: '#f5f5f5',
        messageSystem: '#fafafa',
        
        background: '#ffffff',
        backgroundHover: '#f5f5f5',
        backgroundActive: '#e6f7ff',
        
        textPrimary: '#000000',
        textSecondary: '#595959',
        textTertiary: '#8c8c8c',
        
        border: '#d9d9d9',
        borderLight: '#f0f0f0',
        
        primary: '#1890ff',
        primaryHover: '#40a9ff',
        primaryActive: '#096dd9',
        
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f',
        info: '#1890ff',
        
        reactionBackground: '#f5f5f5',
        reactionHover: '#e6f7ff',
        
        typingIndicator: '#8c8c8c',
        
        searchHighlight: 'rgba(250, 173, 20, 0.2)',
        
        threadBackground: '#fafafa',
        threadBorder: '#f0f0f0',
        
        uploadProgress: '#1890ff',
        uploadSuccess: '#52c41a',
        uploadError: '#ff4d4f',
      };
    }
  }, [isDark]);
}

export function useChatThemeConfig(): ThemeConfig {
  const { token } = theme.useToken();
  const isDark = token?.colorBgLayout === '#141414' ||
                 token?.colorBgLayout === '#000000';

  return useMemo<ThemeConfig>(() => ({
    token: {
      colorPrimary: isDark ? '#177ddc' : '#1890ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1890ff',
      colorBgLayout: isDark ? '#141414' : '#ffffff',
      colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
      colorBorder: isDark ? '#434343' : '#d9d9d9',
      borderRadius: 8,
      fontSize: 14,
    },
    components: {
      Message: {
        borderRadiusLG: 12,
        paddingXS: 8,
        paddingSM: 12,
        paddingMD: 16,
      },
      Input: {
        borderRadius: 8,
        paddingInline: 12,
      },
      Button: {
        borderRadius: 8,
        controlHeight: 36,
      },
    },
  }), [isDark]);
}
