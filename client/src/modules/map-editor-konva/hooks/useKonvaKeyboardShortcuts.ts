/**
 * Konva Map Editor - Keyboard Shortcuts Hook
 * 
 * Centralized keyboard shortcut management for all editor actions.
 */

import { useEffect, useCallback, useState } from 'react';
import type {
  UseKonvaKeyboardShortcutsParams,
  UseKonvaKeyboardShortcutsReturn,
  KeyboardShortcut
} from '../types';

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

  const [registeredShortcuts, setRegisteredShortcuts] = useState<KeyboardShortcut[]>(shortcutsParam);

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
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabledParam) return;

      // Find matching shortcut
      const matchingShortcut = registeredShortcuts.find((shortcut) =>
        matchesShortcut(event, shortcut)
      );

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.handler(event);
      }
    },
    [enabledParam, registeredShortcuts, matchesShortcut]
  );

  /**
   * Register a new shortcut
   */
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setRegisteredShortcuts((prev) => [...prev, shortcut]);
  }, []);

  /**
   * Unregister a shortcut by key
   */
  const unregisterShortcut = useCallback((key: string) => {
    setRegisteredShortcuts((prev) => prev.filter((s) => s.key !== key));
  }, []);

  /**
   * Get all registered shortcuts
   */
  const getShortcuts = useCallback(() => {
    return registeredShortcuts;
  }, [registeredShortcuts]);

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

    registeredShortcuts.forEach((shortcut) => {
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
  }, [registeredShortcuts]);

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
    shortcuts: registeredShortcuts,
    enabled: enabledParam,
  };
}

