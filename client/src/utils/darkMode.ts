/**
 * Dark Mode Support Utilities for Chat System
 * Provides theme-aware styling and dark mode detection
 */

import { theme } from 'antd';

/**
 * Dark mode detection and management
 */
export const darkMode = {
  /**
   * Check if dark mode is currently active
   */
  isDarkMode: (): boolean => {
    // Check Ant Design theme
    const { token } = theme.useToken();
    return token.colorBgBase === '#000000' || token.colorBgBase === '#141414';
  },
  
  /**
   * Get the current theme mode
   */
  getThemeMode: (): 'light' | 'dark' => {
    return darkMode.isDarkMode() ? 'dark' : 'light';
  },
  
  /**
   * Get theme-aware color
   */
  getThemeColor: (lightColor: string, darkColor: string): string => {
    return darkMode.isDarkMode() ? darkColor : lightColor;
  },
  
  /**
   * Get theme-aware background color
   */
  getBackgroundColor: (lightColor: string = '#ffffff', darkColor: string = '#141414'): string => {
    return darkMode.getThemeColor(lightColor, darkColor);
  },
  
  /**
   * Get theme-aware text color
   */
  getTextColor: (lightColor: string = '#000000', darkColor: string = '#ffffff'): string => {
    return darkMode.getThemeColor(lightColor, darkColor);
  },
  
  /**
   * Get theme-aware border color
   */
  getBorderColor: (lightColor: string = '#d9d9d9', darkColor: string = '#424242'): string => {
    return darkMode.getThemeColor(lightColor, darkColor);
  },
  
  /**
   * Get theme-aware shadow
   */
  getShadow: (lightShadow: string, darkShadow: string): string => {
    return darkMode.getThemeColor(lightShadow, darkShadow);
  },
};

/**
 * Chat-specific theme utilities
 */
export const chatTheme = {
  /**
   * Get message bubble background color
   */
  getMessageBubbleColor: (isOwnMessage: boolean): string => {
    if (darkMode.isDarkMode()) {
      return isOwnMessage ? '#177ddc' : '#262626';
    }
    return isOwnMessage ? '#1890ff' : '#f5f5f5';
  },
  
  /**
   * Get message text color
   */
  getMessageTextColor: (isOwnMessage: boolean): string => {
    if (darkMode.isDarkMode()) {
      return isOwnMessage ? '#ffffff' : '#ffffff';
    }
    return isOwnMessage ? '#ffffff' : '#000000';
  },
  
  /**
   * Get message timestamp color
   */
  getTimestampColor: (): string => {
    return darkMode.getThemeColor('#8c8c8c', '#8c8c8c');
  },
  
  /**
   * Get reaction button background color
   */
  getReactionButtonColor: (hasReacted: boolean): string => {
    if (darkMode.isDarkMode()) {
      return hasReacted ? '#177ddc' : '#262626';
    }
    return hasReacted ? '#1890ff' : '#f5f5f5';
  },
  
  /**
   * Get reaction button text color
   */
  getReactionButtonTextColor: (hasReacted: boolean): string => {
    if (darkMode.isDarkMode()) {
      return hasReacted ? '#ffffff' : '#ffffff';
    }
    return hasReacted ? '#ffffff' : '#000000';
  },
  
  /**
   * Get attachment card background color
   */
  getAttachmentCardColor: (): string => {
    return darkMode.getThemeColor('#fafafa', '#1f1f1f');
  },
  
  /**
   * Get thread background color
   */
  getThreadBackgroundColor: (): string => {
    return darkMode.getThemeColor('#fafafa', '#1f1f1f');
  },
  
  /**
   * Get search result highlight color
   */
  getSearchHighlightColor: (): string => {
    return darkMode.getThemeColor('#fffb8f', '#594214');
  },
  
  /**
   * Get typing indicator color
   */
  getTypingIndicatorColor: (): string => {
    return darkMode.getThemeColor('#8c8c8c', '#8c8c8c');
  },
  
  /**
   * Get unread message indicator color
   */
  getUnreadIndicatorColor: (): string => {
    return darkMode.getThemeColor('#ff4d4f', '#ff4d4f');
  },
  
  /**
   * Get online status color
   */
  getOnlineStatusColor: (): string => {
    return darkMode.getThemeColor('#52c41a', '#52c41a');
  },
  
  /**
   * Get offline status color
   */
  getOfflineStatusColor: (): string => {
    return darkMode.getThemeColor('#8c8c8c', '#8c8c8c');
  },
  
  /**
   * Get chat room active background color
   */
  getChatRoomActiveColor: (): string => {
    return darkMode.getThemeColor('#e6f7ff', '#111d2c');
  },
  
  /**
   * Get chat room hover background color
   */
  getChatRoomHoverColor: (): string => {
    return darkMode.getThemeColor('#f5f5f5', '#262626');
  },
};

/**
 * Theme-aware CSS variables generator
 */
export const generateThemeCSSVariables = (): string => {
  const isDark = darkMode.isDarkMode();
  
  return `
    :root {
      --chat-message-bubble-own: ${chatTheme.getMessageBubbleColor(true)};
      --chat-message-bubble-other: ${chatTheme.getMessageBubbleColor(false)};
      --chat-message-text-own: ${chatTheme.getMessageTextColor(true)};
      --chat-message-text-other: ${chatTheme.getMessageTextColor(false)};
      --chat-timestamp: ${chatTheme.getTimestampColor()};
      --chat-reaction-button: ${chatTheme.getReactionButtonColor(false)};
      --chat-reaction-button-active: ${chatTheme.getReactionButtonColor(true)};
      --chat-reaction-button-text: ${chatTheme.getReactionButtonTextColor(false)};
      --chat-reaction-button-text-active: ${chatTheme.getReactionButtonTextColor(true)};
      --chat-attachment-card: ${chatTheme.getAttachmentCardColor()};
      --chat-thread-background: ${chatTheme.getThreadBackgroundColor()};
      --chat-search-highlight: ${chatTheme.getSearchHighlightColor()};
      --chat-typing-indicator: ${chatTheme.getTypingIndicatorColor()};
      --chat-unread-indicator: ${chatTheme.getUnreadIndicatorColor()};
      --chat-online-status: ${chatTheme.getOnlineStatusColor()};
      --chat-offline-status: ${chatTheme.getOfflineStatusColor()};
      --chat-room-active: ${chatTheme.getChatRoomActiveColor()};
      --chat-room-hover: ${chatTheme.getChatRoomHoverColor()};
    }
  `;
};

/**
 * Apply theme-aware styles to an element
 */
export const applyThemeStyles = (element: HTMLElement, styles: Record<string, string>): void => {
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value);
  });
};

/**
 * Get theme-aware message styles
 */
export const getMessageStyles = (isOwnMessage: boolean): React.CSSProperties => {
  return {
    backgroundColor: chatTheme.getMessageBubbleColor(isOwnMessage),
    color: chatTheme.getMessageTextColor(isOwnMessage),
  };
};

/**
 * Get theme-aware reaction button styles
 */
export const getReactionButtonStyles = (hasReacted: boolean): React.CSSProperties => {
  return {
    backgroundColor: chatTheme.getReactionButtonColor(hasReacted),
    color: chatTheme.getReactionButtonTextColor(hasReacted),
  };
};

/**
 * Get theme-aware attachment card styles
 */
export const getAttachmentCardStyles = (): React.CSSProperties => {
  return {
    backgroundColor: chatTheme.getAttachmentCardColor(),
  };
};

/**
 * Get theme-aware thread styles
 */
export const getThreadStyles = (): React.CSSProperties => {
  return {
    backgroundColor: chatTheme.getThreadBackgroundColor(),
  };
};

/**
 * Get theme-aware search highlight styles
 */
export const getSearchHighlightStyles = (): React.CSSProperties => {
  return {
    backgroundColor: chatTheme.getSearchHighlightColor(),
  };
};

/**
 * Listen for theme changes
 */
export const onThemeChange = (callback: (isDark: boolean) => void): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // Return cleanup function
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
};

/**
 * Get system theme preference
 */
export const getSystemThemePreference = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Force dark mode (for testing)
 */
export const forceDarkMode = (force: boolean): void => {
  if (force) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
};

/**
 * Check if dark mode is forced
 */
export const isDarkModeForced = (): boolean => {
  return document.documentElement.getAttribute('data-theme') === 'dark';
};
