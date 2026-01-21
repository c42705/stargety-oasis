/**
 * Accessibility Utilities for Chat System
 * Provides ARIA attributes, keyboard navigation, and screen reader support
 */

import { RefObject } from 'react';

/**
 * ARIA role constants
 */
export const ARIA_ROLES = {
  ALERT: 'alert',
  APPLICATION: 'application',
  ARTICLE: 'article',
  BUTTON: 'button',
  COMBOBOX: 'combobox',
  DIALOG: 'dialog',
  FEED: 'feed',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  GROUP: 'group',
  IMG: 'img',
  LIST: 'list',
  LISTBOX: 'listbox',
  LISTITEM: 'listitem',
  LOG: 'log',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  NAVIGATION: 'navigation',
  OPTION: 'option',
  PANEL: 'panel',
  PROGRESSBAR: 'progressbar',
  REGION: 'region',
  SCROLLBAR: 'scrollbar',
  SEARCH: 'search',
  SEPARATOR: 'separator',
  SPINBUTTON: 'spinbutton',
  STATUS: 'status',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  TEXTBOX: 'textbox',
  TIMER: 'timer',
  TOOLBAR: 'toolbar',
  TOOLTIP: 'tooltip',
} as const;

/**
 * ARIA property constants
 */
export const ARIA_PROPERTIES = {
  ACTIVEDESCENDANT: 'aria-activedescendant',
  ATOMIC: 'aria-atomic',
  AUTOCOMPLETE: 'aria-autocomplete',
  BUSY: 'aria-busy',
  CHECKED: 'aria-checked',
  COLCOUNT: 'aria-colcount',
  COLINDEX: 'aria-colindex',
  COLSPAN: 'aria-colspan',
  CONTROLS: 'aria-controls',
  CURRENT: 'aria-current',
  DESCRIBEDBY: 'aria-describedby',
  DETAILS: 'aria-details',
  DISABLED: 'aria-disabled',
  DROPEFFECT: 'aria-dropeffect',
  ERRORMESSAGE: 'aria-errormessage',
  EXPANDED: 'aria-expanded',
  FLOWTO: 'aria-flowto',
  GRABBED: 'aria-grabbed',
  HASPOPUP: 'aria-haspopup',
  HIDDEN: 'aria-hidden',
  INVALID: 'aria-invalid',
  KEYSHORTCUTS: 'aria-keyshortcuts',
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  LEVEL: 'aria-level',
  LIVE: 'aria-live',
  MODAL: 'aria-modal',
  MULTILINE: 'aria-multiline',
  MULTISELECTABLE: 'aria-multiselectable',
  ORIENTATION: 'aria-orientation',
  OWNS: 'aria-owns',
  PLACEHOLDER: 'aria-placeholder',
  POSINSET: 'aria-posinset',
  PRESSED: 'aria-pressed',
  READONLY: 'aria-readonly',
  RELEVANT: 'aria-relevant',
  REQUIRED: 'aria-required',
  ROLEDESCRIPTION: 'aria-roledescription',
  ROWCOUNT: 'aria-rowcount',
  ROWINDEX: 'aria-rowindex',
  ROWSPAN: 'aria-rowspan',
  SELECTED: 'aria-selected',
  SETSIZE: 'aria-setsize',
  SORT: 'aria-sort',
  VALUEMAX: 'aria-valuemax',
  VALUEMIN: 'aria-valuemin',
  VALUENOW: 'aria-valuenow',
  VALUETEXT: 'aria-valuetext',
} as const;

/**
 * ARIA state constants
 */
export const ARIA_STATES = {
  CHECKED: { true: 'true', false: 'false', mixed: 'mixed' },
  DISABLED: { true: 'true', false: 'false' },
  EXPANDED: { true: 'true', false: 'false' },
  GRABBED: { true: 'true', false: 'false' },
  HIDDEN: { true: 'true', false: 'false' },
  INVALID: { true: 'true', false: 'false', grammar: 'grammar', spelling: 'spelling' },
  PRESSED: { true: 'true', false: 'false', mixed: 'mixed' },
  READONLY: { true: 'true', false: 'false' },
  REQUIRED: { true: 'true', false: 'false' },
  SELECTED: { true: 'true', false: 'false' },
} as const;

/**
 * Live region priorities
 */
export const LIVE_REGION_PRIORITY = {
  OFF: 'off',
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
} as const;

/**
 * Generate ARIA attributes for a message
 */
export const getMessageAriaProps = (message: {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
  isEdited?: boolean;
  hasReactions?: boolean;
  hasAttachments?: boolean;
  isThread?: boolean;
  replyCount?: number;
}) => {
  const baseProps = {
    role: ARIA_ROLES.ARTICLE,
    id: `message-${message.id}`,
    'aria-label': `Message from ${message.authorName} at ${new Date(message.timestamp).toLocaleTimeString()}`,
  };
  
  const additionalProps: Record<string, string> = {};
  
  if (message.isEdited) {
    additionalProps['aria-label'] += ', edited';
  }
  
  if (message.hasReactions) {
    additionalProps['aria-label'] += ', has reactions';
  }
  
  if (message.hasAttachments) {
    additionalProps['aria-label'] += ', has attachments';
  }
  
  if (message.isThread) {
    additionalProps['aria-label'] += `, ${message.replyCount} replies`;
    additionalProps['aria-expanded'] = 'false';
  }
  
  return { ...baseProps, ...additionalProps };
};

/**
 * Generate ARIA attributes for a reaction button
 */
export const getReactionButtonAriaProps = (emoji: string, count: number, hasReacted: boolean) => ({
  role: ARIA_ROLES.BUTTON,
  'aria-label': `${emoji} reaction, ${count} ${count === 1 ? 'person' : 'people'} reacted${hasReacted ? ', you reacted' : ''}`,
  'aria-pressed': hasReacted ? 'true' : 'false',
});

/**
 * Generate ARIA attributes for a file attachment
 */
export const getFileAttachmentAriaProps = (file: {
  filename: string;
  mimetype: string;
  size: number;
}) => ({
  role: ARIA_ROLES.IMG,
  'aria-label': `File attachment: ${file.filename}, ${formatFileSize(file.size)}, ${file.mimetype}`,
});

/**
 * Generate ARIA attributes for a thread view
 */
export const getThreadViewAriaProps = (isOpen: boolean, replyCount: number) => ({
  role: ARIA_ROLES.REGION,
  'aria-label': `Thread with ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`,
  'aria-expanded': isOpen ? 'true' : 'false',
});

/**
 * Generate ARIA attributes for a search box
 */
export const getSearchBoxAriaProps = (hasResults: boolean, resultCount: number) => ({
  role: ARIA_ROLES.SEARCH,
  'aria-label': 'Search messages',
  'aria-haspopup': hasResults ? 'listbox' : undefined,
  'aria-expanded': hasResults ? 'true' : 'false',
  'aria-controls': hasResults ? 'search-results' : undefined,
  'aria-owns': hasResults ? 'search-results' : undefined,
  'aria-activedescendant': hasResults ? 'search-result-0' : undefined,
});

/**
 * Generate ARIA attributes for a typing indicator
 */
export const getTypingIndicatorAriaProps = (userNames: string[]) => ({
  role: ARIA_ROLES.STATUS,
  'aria-live': LIVE_REGION_PRIORITY.POLITE,
  'aria-atomic': 'true',
  'aria-label': `${userNames.join(', ')} ${userNames.length === 1 ? 'is' : 'are'} typing`,
});

/**
 * Generate ARIA attributes for a room list
 */
export const getRoomListAriaProps = (roomCount: number) => ({
  role: ARIA_ROLES.LIST,
  'aria-label': `Chat rooms, ${roomCount} available`,
});

/**
 * Generate ARIA attributes for a room item
 */
export const getRoomItemAriaProps = (roomName: string, isActive: boolean, unreadCount: number) => ({
  role: ARIA_ROLES.LISTITEM,
  'aria-label': `${roomName}${unreadCount > 0 ? `, ${unreadCount} unread messages` : ''}${isActive ? ', active' : ''}`,
  'aria-selected': isActive ? 'true' : 'false',
  'aria-current': isActive ? 'true' : undefined,
});

/**
 * Generate ARIA attributes for a file upload progress bar
 */
export const getProgressBarAriaProps = (progress: number, label: string) => ({
  role: ARIA_ROLES.PROGRESSBAR,
  'aria-valuenow': progress.toString(),
  'aria-valuemin': '0',
  'aria-valuemax': '100',
  'aria-valuetext': `${progress}% complete`,
  'aria-label': label,
});

/**
 * Generate ARIA attributes for a notification
 */
export const getNotificationAriaProps = (type: 'success' | 'error' | 'warning' | 'info', message: string) => ({
  role: ARIA_ROLES.ALERT,
  'aria-live': type === 'error' ? LIVE_REGION_PRIORITY.ASSERTIVE : LIVE_REGION_PRIORITY.POLITE,
  'aria-atomic': 'true',
  'aria-label': `${type}: ${message}`,
});

/**
 * Keyboard navigation utilities
 */
export const keyboardNavigation = {
  /**
   * Handle keyboard navigation for a list
   */
  handleListNavigation: (
    event: KeyboardEvent,
    currentIndex: number,
    itemCount: number,
    onSelect: (index: number) => void
  ) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, itemCount - 1);
        onSelect(nextIndex);
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        onSelect(prevIndex);
        break;
      case 'Home':
        event.preventDefault();
        onSelect(0);
        break;
      case 'End':
        event.preventDefault();
        onSelect(itemCount - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(currentIndex);
        break;
    }
  },
  
  /**
   * Handle keyboard navigation for a grid
   */
  handleGridNavigation: (
    event: KeyboardEvent,
    currentIndex: number,
    columnCount: number,
    itemCount: number,
    onSelect: (index: number) => void
  ) => {
    const currentRow = Math.floor(currentIndex / columnCount);
    const currentCol = currentIndex % columnCount;
    
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        const nextCol = Math.min(currentCol + 1, columnCount - 1);
        onSelect(currentRow * columnCount + nextCol);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        const prevCol = Math.max(currentCol - 1, 0);
        onSelect(currentRow * columnCount + prevCol);
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextRow = Math.min(currentRow + 1, Math.floor((itemCount - 1) / columnCount));
        const nextRowCol = Math.min(currentCol, (itemCount - 1) % columnCount);
        onSelect(nextRow * columnCount + nextRowCol);
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevRow = Math.max(currentRow - 1, 0);
        const prevRowCol = Math.min(currentCol, (itemCount - 1) % columnCount);
        onSelect(prevRow * columnCount + prevRowCol);
        break;
      case 'Home':
        event.preventDefault();
        onSelect(0);
        break;
      case 'End':
        event.preventDefault();
        onSelect(itemCount - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(currentIndex);
        break;
    }
  },
  
  /**
   * Handle keyboard navigation for tabs
   */
  handleTabNavigation: (
    event: KeyboardEvent,
    currentIndex: number,
    tabCount: number,
    onSelect: (index: number) => void
  ) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % tabCount;
        onSelect(nextIndex);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + tabCount) % tabCount;
        onSelect(prevIndex);
        break;
      case 'Home':
        event.preventDefault();
        onSelect(0);
        break;
      case 'End':
        event.preventDefault();
        onSelect(tabCount - 1);
        break;
    }
  },
  
  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts: (
    event: KeyboardEvent,
    shortcuts: Record<string, () => void>
  ) => {
    const key = event.key.toLowerCase();
    const modifierKey = event.ctrlKey || event.metaKey;
    
    if (modifierKey) {
      const shortcut = `${event.ctrlKey ? 'ctrl+' : 'meta+'}${key}`;
      if (shortcuts[shortcut]) {
        event.preventDefault();
        shortcuts[shortcut]();
      }
    } else if (shortcuts[key]) {
      event.preventDefault();
      shortcuts[key]();
    }
  },
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Trap focus within a container
   */
  trapFocus: (containerRef: RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return () => {};
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleKeyDown = (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === 'Tab') {
        if (keyboardEvent.shiftKey) {
          if (document.activeElement === firstElement) {
            keyboardEvent.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            keyboardEvent.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },
  
  /**
   * Restore focus to previous element
   */
  restoreFocus: (previousElement: HTMLElement | null) => {
    if (previousElement) {
      previousElement.focus();
    }
  },
  
  /**
   * Move focus to next element
   */
  moveFocusNext: (containerRef: RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    
    const focusableElements = Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  },
  
  /**
   * Move focus to previous element
   */
  moveFocusPrevious: (containerRef: RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    
    const focusableElements = Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
    focusableElements[prevIndex]?.focus();
  },
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Announce a message to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },
  
  /**
   * Create a visually hidden element for screen readers
   */
  createHiddenText: (text: string) => {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  },
};

/**
 * High contrast mode utilities
 */
export const highContrast = {
  /**
   * Check if high contrast mode is enabled
   */
  isEnabled: (): boolean => {
    return window.matchMedia('(prefers-contrast: more)').matches;
  },
  
  /**
   * Get high contrast colors
   */
  getColors: () => {
    const isHighContrast = highContrast.isEnabled();
    return {
      text: isHighContrast ? '#000000' : undefined,
      background: isHighContrast ? '#FFFFFF' : undefined,
      border: isHighContrast ? '#000000' : undefined,
      focus: isHighContrast ? '#000000' : undefined,
    };
  },
};

/**
 * Reduced motion utilities
 */
export const reducedMotion = {
  /**
   * Check if reduced motion is preferred
   */
  isPreferred: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  /**
   * Get animation duration based on reduced motion preference
   */
  getDuration: (normalDuration: number): number => {
    return reducedMotion.isPreferred() ? 0 : normalDuration;
  },
};

/**
 * Color contrast utilities
 */
export const colorContrast = {
  /**
   * Calculate luminance of a color
   */
  getLuminance: (hex: string): number => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map((value) => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },
  
  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio: (color1: string, color2: string): number => {
    const luminance1 = colorContrast.getLuminance(color1);
    const luminance2 = colorContrast.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
  
  /**
   * Check if contrast meets WCAG AA standard
   */
  meetsWCAG_AA: (color1: string, color2: string, largeText: boolean = false): boolean => {
    const ratio = colorContrast.getContrastRatio(color1, color2);
    return largeText ? ratio >= 3 : ratio >= 4.5;
  },
  
  /**
   * Check if contrast meets WCAG AAA standard
   */
  meetsWCAG_AAA: (color1: string, color2: string, largeText: boolean = false): boolean => {
    const ratio = colorContrast.getContrastRatio(color1, color2);
    return largeText ? ratio >= 4.5 : ratio >= 7;
  },
};

/**
 * Helper function to convert hex to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Accessibility keyboard shortcuts for chat
 */
export const CHAT_KEYBOARD_SHORTCUTS = {
  SEND_MESSAGE: 'Enter',
  NEW_LINE: 'Shift+Enter',
  FOCUS_SEARCH: 'ctrl+/',
  FOCUS_MESSAGE_INPUT: 'ctrl+i',
  ESCAPE: 'Escape',
  NAVIGATE_UP: 'ArrowUp',
  NAVIGATE_DOWN: 'ArrowDown',
  NAVIGATE_LEFT: 'ArrowLeft',
  NAVIGATE_RIGHT: 'ArrowRight',
  SELECT_FIRST: 'Home',
  SELECT_LAST: 'End',
  OPEN_REACTIONS: 'ctrl+r',
  OPEN_THREAD: 'ctrl+t',
  DELETE_MESSAGE: 'ctrl+backspace',
  EDIT_MESSAGE: 'ctrl+e',
} as const;

/**
 * Generate keyboard shortcut help text
 */
export const getKeyboardShortcutHelp = (): Array<{
  shortcut: string;
  description: string;
}> => {
  return [
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.SEND_MESSAGE, description: 'Send message' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.NEW_LINE, description: 'New line' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.FOCUS_SEARCH, description: 'Focus search' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.FOCUS_MESSAGE_INPUT, description: 'Focus message input' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.ESCAPE, description: 'Close modal / cancel' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.NAVIGATE_UP, description: 'Navigate up' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.NAVIGATE_DOWN, description: 'Navigate down' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.SELECT_FIRST, description: 'Select first item' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.SELECT_LAST, description: 'Select last item' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.OPEN_REACTIONS, description: 'Open reactions' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.OPEN_THREAD, description: 'Open thread' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.DELETE_MESSAGE, description: 'Delete message' },
    { shortcut: CHAT_KEYBOARD_SHORTCUTS.EDIT_MESSAGE, description: 'Edit message' },
  ];
};
