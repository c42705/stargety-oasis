/**
 * Konva Map Editor - Keyboard Shortcuts Hook
 *
 * Centralized keyboard shortcut management for all editor actions.
 */

import { useEffect, useCallback, useRef } from 'react';
import type {
  UseKonvaKeyboardShortcutsParams,
  UseKonvaKeyboardShortcutsReturn,
  KeyboardShortcut
} from '../types';
import { shouldIgnoreKeyboardEvent } from '../../../shared/keyboardFocusUtils';

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
    enabled: enabledParam = true,
    shortcuts: shortcutsParam = [],
  } = params;

  // Use ref to always have access to latest shortcuts without causing re-renders
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcutsParam);
  shortcutsRef.current = shortcutsParam;

  /**
   * Parse key combination string (e.g., 'ctrl+z', 'delete', 'escape')
   */
  const parseKeyCombination = (key: string) => {
    const parts = key.toLowerCase().split('+');
    const modifiers = {
      ctrl: parts.includes('ctrl'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      meta: parts.includes('meta'),
    };
    const mainKey = parts[parts.length - 1];
    return { modifiers, mainKey };
  };

  /**
   * Check if a keyboard event matches a shortcut
   */
  const matchesShortcut = useCallback(
    (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
      // Check if shortcut is enabled
      if (shortcut.enabled === false) return false;

      const { modifiers, mainKey } = parseKeyCombination(shortcut.key);

      // Check key
      if (event.key.toLowerCase() !== mainKey) return false;

      // Check modifiers
      const ctrlMatch = modifiers.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const shiftMatch = modifiers.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = modifiers.alt ? event.altKey : !event.altKey;

      return ctrlMatch && shiftMatch && altMatch;
    },
    []
  );

  /**
   * Handle keyboard events - uses ref to avoid dependency on shortcuts array
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabledParam) return;

      // Ignore keyboard events when typing in input fields or when modal is open
      if (shouldIgnoreKeyboardEvent()) {
        return;
      }

      // Find matching shortcut using ref (always has latest shortcuts)
      const matchingShortcut = shortcutsRef.current.find((shortcut) =>
        matchesShortcut(event, shortcut)
      );

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.handler(event);
      }
    },
    [enabledParam, matchesShortcut]
  );

  /**
   * Register a new shortcut (no-op, shortcuts are passed via props)
   */
  const registerShortcut = useCallback((_shortcut: KeyboardShortcut) => {
    // No-op: shortcuts are managed via props, not internal state
  }, []);

  /**
   * Unregister a shortcut by key (no-op, shortcuts are passed via props)
   */
  const unregisterShortcut = useCallback((_key: string) => {
    // No-op: shortcuts are managed via props, not internal state
  }, []);

  /**
   * Get all registered shortcuts
   */
  const getShortcuts = useCallback(() => {
    return shortcutsRef.current;
  }, []);

  /**
   * Get shortcut description for display
   */
  const getShortcutDisplay = useCallback((shortcut: KeyboardShortcut): string => {
    return shortcut.key.toUpperCase().replace('+', ' + ');
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

    shortcutsRef.current.forEach((shortcut) => {
      // Categorize based on description
      const desc = shortcut.description?.toLowerCase() || '';
      if (desc.includes('undo') || desc.includes('redo')) {
        categories['History'].push(shortcut);
      } else if (desc.includes('select')) {
        categories['Selection'].push(shortcut);
      } else if (desc.includes('tool') || desc.includes('pan') || desc.includes('draw')) {
        categories['Tools'].push(shortcut);
      } else if (desc.includes('zoom') || desc.includes('grid')) {
        categories['View'].push(shortcut);
      } else {
        categories['Other'].push(shortcut);
      }
    });

    return categories;
  }, []);

  // ==========================================================================
  // SETUP EVENT LISTENERS
  // ==========================================================================

  useEffect(() => {
    if (!enabledParam) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabledParam, handleKeyDown]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Methods
    registerShortcut,
    unregisterShortcut,
    getShortcuts,
    getShortcutDisplay,
    getShortcutsByCategory,

    // State
    shortcuts: shortcutsParam,
    enabled: enabledParam,
  };
}

