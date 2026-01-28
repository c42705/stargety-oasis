/**
 * Unsaved Changes Warning Component
 *
 * This component prevents data loss by warning users about unsaved changes
 * before they navigate away from the Map Editor or close the browser tab.
 *
 * Features:
 * - Browser beforeunload event handling
 * - React Router navigation blocking
 * - Customizable warning messages
 * - Integration with Redux mapSlice save state
 *
 * REFACTORED (2025-12-15): Removed SharedMapSystem dependency.
 * Now uses Redux store for save state.
 */

import React, { useEffect, useCallback } from 'react';
import { useMapStore } from '../stores/useMapStore';

interface UnsavedChangesWarningProps {
  enabled?: boolean;
  customMessage?: string;
  onNavigationAttempt?: () => void;
}

export const UnsavedChangesWarning: React.FC<UnsavedChangesWarningProps> = ({
  enabled = true,
  customMessage = 'You have unsaved changes. Are you sure you want to leave?',
  onNavigationAttempt
}) => {
  const { isDirty } = useMapStore();

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!enabled) return false;
    return isDirty;
  }, [enabled, isDirty]);

  // Handle browser beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        // Modern browsers ignore the custom message and show their own
        event.preventDefault();
        event.returnValue = customMessage;
        onNavigationAttempt?.();
        return customMessage;
      }
    };

    if (enabled) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, customMessage, hasUnsavedChanges, onNavigationAttempt]);

  // Handle React Router navigation (if using React Router)
  useEffect(() => {
    // This would integrate with React Router's useBlocker or similar
    // For now, we'll use a simple approach with the browser's beforeunload
    
    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges()) {
        const confirmLeave = window.confirm(customMessage);
        if (!confirmLeave) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
          onNavigationAttempt?.();
        }
      }
    };

    if (enabled) {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, customMessage, hasUnsavedChanges, onNavigationAttempt]);

  // Handle keyboard shortcuts that might cause navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled || !hasUnsavedChanges()) return;

      // Detect common navigation shortcuts
      const isNavigationShortcut = (
        (event.ctrlKey || event.metaKey) && (
          event.key === 'r' || // Refresh
          event.key === 'w' || // Close tab
          event.key === 'l' || // Address bar
          event.key === 't' || // New tab
          event.key === 'n'    // New window
        )
      ) || (
        event.altKey && (
          event.key === 'F4' || // Alt+F4 (close window)
          event.key === 'ArrowLeft' || // Alt+Left (back)
          event.key === 'ArrowRight'   // Alt+Right (forward)
        )
      );

      if (isNavigationShortcut) {
        const confirmLeave = window.confirm(customMessage);
        if (!confirmLeave) {
          event.preventDefault();
          event.stopPropagation();
          onNavigationAttempt?.();
        }
      }
    };

    if (enabled) {
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, customMessage, hasUnsavedChanges, onNavigationAttempt]);

  // This component doesn't render anything visible
  return null;
};

// Hook for programmatic unsaved changes checking
export const useUnsavedChangesWarning = (enabled = true) => {
  const { isDirty, saveMap } = useMapStore();

  const hasUnsavedChanges = useCallback(() => {
    if (!enabled) return false;
    return isDirty;
  }, [enabled, isDirty]);

  const confirmNavigation = useCallback((message?: string) => {
    if (!hasUnsavedChanges()) return true;

    return window.confirm(
      message || 'You have unsaved changes. Are you sure you want to continue?'
    );
  }, [hasUnsavedChanges]);

  const saveBeforeNavigation = useCallback(async () => {
    if (hasUnsavedChanges()) {
      try {
        await saveMap();
        return true;
      } catch (error) {
        console.error('Failed to save before navigation:', error);
        return false;
      }
    }
    return true;
  }, [hasUnsavedChanges, saveMap]);

  return {
    hasUnsavedChanges,
    confirmNavigation,
    saveBeforeNavigation
  };
};
