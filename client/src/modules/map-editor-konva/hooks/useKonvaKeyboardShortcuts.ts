/**
 * Konva Map Editor - Keyboard Shortcuts Hook
 * 
 * Centralized keyboard shortcut management for all editor actions.
 */

import { useEffect, useCallback } from 'react';
import type { UseKonvaKeyboardShortcutsParams, UseKonvaKeyboardShortcutsReturn } from '../types';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
}

/**
 * Hook for centralized keyboard shortcut management
 * 
 * Provides a unified system for managing all keyboard shortcuts in the editor.
 * 
 * @example
 * ```typescript
 * const shortcuts = useKonvaKeyboardShortcuts({
 *   enabled: true,
 *   shortcuts: [
 *     { key: 'z', ctrl: true, description: 'Undo', action: undo },
 *     { key: 'y', ctrl: true, description: 'Redo', action: redo },
 *     { key: 'Delete', description: 'Delete', action: deleteSelected },
 *   ],
 * });
 * ```
 */
export function useKonvaKeyboardShortcuts(
  params: UseKonvaKeyboardShortcutsParams
): UseKonvaKeyboardShortcutsReturn {
  const {
    enabled = true,
    shortcuts = [],
  } = params;

  /**
   * Check if a keyboard event matches a shortcut
   */
  const matchesShortcut = useCallback(
    (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
      // Check if shortcut is enabled
      if (shortcut.enabled === false) return false;

      // Check key
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;

      // Check modifiers
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      return ctrlMatch && shiftMatch && altMatch;
    },
    []
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((shortcut) =>
        matchesShortcut(event, shortcut)
      );

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    },
    [enabled, shortcuts, matchesShortcut]
  );

  /**
   * Get shortcut description for display
   */
  const getShortcutDisplay = useCallback((shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());

    return parts.join('+');
  }, []);

  /**
   * Get all shortcuts grouped by category
   */
  const getShortcutsByCategory = useCallback(() => {
    const categories: Record<string, KeyboardShortcut[]> = {
      'History': [],
      'Selection': [],
      'Tools': [],
      'View': [],
      'Other': [],
    };

    shortcuts.forEach((shortcut) => {
      // Categorize based on description
      if (shortcut.description.toLowerCase().includes('undo') || 
          shortcut.description.toLowerCase().includes('redo')) {
        categories['History'].push(shortcut);
      } else if (shortcut.description.toLowerCase().includes('select')) {
        categories['Selection'].push(shortcut);
      } else if (shortcut.description.toLowerCase().includes('tool') ||
                 shortcut.description.toLowerCase().includes('pan') ||
                 shortcut.description.toLowerCase().includes('draw')) {
        categories['Tools'].push(shortcut);
      } else if (shortcut.description.toLowerCase().includes('zoom') ||
                 shortcut.description.toLowerCase().includes('grid')) {
        categories['View'].push(shortcut);
      } else {
        categories['Other'].push(shortcut);
      }
    });

    return categories;
  }, [shortcuts]);

  // ==========================================================================
  // SETUP EVENT LISTENERS
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Utilities
    getShortcutDisplay,
    getShortcutsByCategory,

    // State
    shortcuts,
    enabled,
  };
}

