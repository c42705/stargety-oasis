/**
 * Konva Map Editor - Preview Mode Hook
 * 
 * Handles read-only preview mode for the map editor.
 */

import { useState, useCallback } from 'react';
import type { UseKonvaPreviewModeParams, UseKonvaPreviewModeReturn } from '../types';

/**
 * Hook for preview mode functionality
 * 
 * Provides a read-only preview mode that disables all editing functionality.
 * 
 * @example
 * ```typescript
 * const {
 *   isPreviewMode,
 *   enablePreview,
 *   disablePreview,
 *   togglePreview,
 *   canEdit,
 * } = useKonvaPreviewMode({
 *   initialPreviewMode: false,
 * });
 * ```
 */
export function useKonvaPreviewMode(
  params: UseKonvaPreviewModeParams = {}
): UseKonvaPreviewModeReturn {
  const {
    initialPreviewMode = false,
    onPreviewModeChange,
  } = params;

  // State
  const [isPreviewMode, setIsPreviewMode] = useState(initialPreviewMode);

  /**
   * Enable preview mode
   */
  const enablePreview = useCallback(() => {
    setIsPreviewMode(true);
    onPreviewModeChange?.(true);
  }, [onPreviewModeChange]);

  /**
   * Disable preview mode
   */
  const disablePreview = useCallback(() => {
    setIsPreviewMode(false);
    onPreviewModeChange?.(false);
  }, [onPreviewModeChange]);

  /**
   * Toggle preview mode
   */
  const togglePreview = useCallback(() => {
    setIsPreviewMode((prev) => {
      const newValue = !prev;
      onPreviewModeChange?.(newValue);
      return newValue;
    });
  }, [onPreviewModeChange]);

  /**
   * Check if editing is allowed
   */
  const canEdit = !isPreviewMode;

  /**
   * Check if a specific action is allowed
   */
  const canPerformAction = useCallback(
    (action: 'draw' | 'select' | 'transform' | 'delete' | 'undo' | 'redo'): boolean => {
      return !isPreviewMode;
    },
    [isPreviewMode]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    isPreviewMode,
    canEdit,

    // Actions
    enablePreview,
    disablePreview,
    togglePreview,
    canPerformAction,
  };
}

