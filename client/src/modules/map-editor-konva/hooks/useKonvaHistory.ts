/**
 * Konva Map Editor - History Hook
 * 
 * Handles undo/redo functionality with state snapshot management.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Shape,
  UseKonvaHistoryParams,
  UseKonvaHistoryReturn,
  EditorState,
} from '../types';
import { HISTORY } from '../constants/konvaConstants';

/**
 * History entry containing a state snapshot
 */
interface HistoryEntry {
  state: EditorState;
  timestamp: number;
  description?: string;
}

/**
 * Hook for undo/redo functionality
 * 
 * Uses state snapshot approach to maintain history of editor states.
 * Supports undo (Ctrl+Z) and redo (Ctrl+Y/Ctrl+Shift+Z).
 * 
 * @example
 * ```typescript
 * const {
 *   canUndo,
 *   canRedo,
 *   undo,
 *   redo,
 *   pushState,
 *   clearHistory,
 *   historySize,
 * } = useKonvaHistory({
 *   currentState: { shapes, selectedIds },
 *   onStateRestore: (state) => {
 *     setShapes(state.shapes);
 *     setSelectedIds(state.selectedIds);
 *   },
 * });
 * ```
 */
export function useKonvaHistory(
  params: UseKonvaHistoryParams
): UseKonvaHistoryReturn {
  const {
    currentState,
    onStateRestore,
    maxHistorySize = HISTORY.MAX_SIZE,
    enabled = true,
  } = params;

  // History stacks
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  // Track if we're currently restoring state (to prevent infinite loops)
  const isRestoringRef = useRef(false);

  // Track last pushed state to prevent duplicate entries
  const lastPushedStateRef = useRef<string | null>(null);

  // ==========================================================================
  // STATE SERIALIZATION
  // ==========================================================================

  /**
   * Serialize state to JSON string for comparison
   */
  const serializeState = useCallback((state: EditorState): string => {
    return JSON.stringify(state);
  }, []);

  /**
   * Check if two states are equal
   */
  const statesEqual = useCallback(
    (state1: EditorState, state2: EditorState): boolean => {
      return serializeState(state1) === serializeState(state2);
    },
    [serializeState]
  );

  // ==========================================================================
  // HISTORY MANAGEMENT
  // ==========================================================================

  /**
   * Push current state to history
   */
  const pushState = useCallback(
    (description?: string) => {
      if (!enabled || isRestoringRef.current) return;

      // Serialize current state
      const serialized = serializeState(currentState);

      // Don't push if state hasn't changed
      if (serialized === lastPushedStateRef.current) {
        return;
      }

      // Create history entry
      const entry: HistoryEntry = {
        state: JSON.parse(serialized), // Deep clone
        timestamp: Date.now(),
        description,
      };

      setPast((prev) => {
        const newPast = [...prev, entry];

        // Limit history size
        if (newPast.length > maxHistorySize) {
          return newPast.slice(newPast.length - maxHistorySize);
        }

        return newPast;
      });

      // Clear future when new state is pushed
      setFuture([]);

      // Update last pushed state
      lastPushedStateRef.current = serialized;
    },
    [enabled, currentState, maxHistorySize, serializeState]
  );

  /**
   * Undo - restore previous state
   */
  const undo = useCallback(() => {
    if (!enabled || past.length === 0) return;

    isRestoringRef.current = true;

    // Get previous state
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    // Save current state to future
    const currentEntry: HistoryEntry = {
      state: JSON.parse(serializeState(currentState)),
      timestamp: Date.now(),
    };

    setPast(newPast);
    setFuture((prev) => [...prev, currentEntry]);

    // Restore previous state
    onStateRestore(previous.state);

    // Update last pushed state
    lastPushedStateRef.current = serializeState(previous.state);

    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, [enabled, past, currentState, onStateRestore, serializeState]);

  /**
   * Redo - restore next state
   */
  const redo = useCallback(() => {
    if (!enabled || future.length === 0) return;

    isRestoringRef.current = true;

    // Get next state
    const next = future[future.length - 1];
    const newFuture = future.slice(0, -1);

    // Save current state to past
    const currentEntry: HistoryEntry = {
      state: JSON.parse(serializeState(currentState)),
      timestamp: Date.now(),
    };

    setFuture(newFuture);
    setPast((prev) => [...prev, currentEntry]);

    // Restore next state
    onStateRestore(next.state);

    // Update last pushed state
    lastPushedStateRef.current = serializeState(next.state);

    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, [enabled, future, currentState, onStateRestore, serializeState]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
    lastPushedStateRef.current = null;
  }, []);

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Y / Cmd+Shift+Z on Mac)
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, undo, redo]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    canUndo: past.length > 0,
    canRedo: future.length > 0,

    // Actions
    undo,
    redo,
    pushState,
    clearHistory,

    // Utilities
    serializeState,
  };
}

