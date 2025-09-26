/**
 * Shared Pan Controls Hook
 * 
 * This hook provides unified pan functionality that reuses the existing pan logic
 * from the worldmap component. It supports multiple activation methods:
 * 1. Space key + drag (primary method, same as worldmap)
 * 2. Middle mouse button + drag
 * 3. Pan tool mode via toolbar button
 * 
 * The hook integrates with the existing MapEditorCameraControls to ensure
 * consistent behavior and reuse of the shared camera control system.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapEditorCameraControls } from './useMapEditorCamera';

export type PanMethod = 'none' | 'space-drag' | 'middle-mouse' | 'tool-mode';

export interface PanControlsConfig {
  cameraControls: MapEditorCameraControls | undefined;
  canvasElement: HTMLElement | null;
  currentTool: string;
  onPanStateChange?: (isPanning: boolean, method: PanMethod) => void;
}

export interface PanControlsState {
  isPanning: boolean;
  panMethod: PanMethod;
  isSpaceKeyDown: boolean;
  canPanWithSpace: boolean;
  canPanWithMiddleMouse: boolean;
  canPanWithTool: boolean;
}

export interface PanControlsActions {
  shouldStartPan: (event: MouseEvent) => PanMethod;
  shouldContinuePan: (event: MouseEvent) => boolean;
  shouldEndPan: (event: MouseEvent) => boolean;
  updateCursor: () => void;
}

export interface UsePanControlsReturn {
  state: PanControlsState;
  actions: PanControlsActions;
  startPan: (method: PanMethod, startX: number, startY: number) => void;
  endPan: () => void;
  updatePan: (currentX: number, currentY: number) => void;
}

export const usePanControls = ({
  cameraControls,
  canvasElement,
  currentTool,
  onPanStateChange
}: PanControlsConfig): UsePanControlsReturn => {
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panMethod, setPanMethod] = useState<PanMethod>('none');
  const [isSpaceKeyDown, setIsSpaceKeyDown] = useState(false);
  
  // Track pan state for cleanup
  const panStateRef = useRef<{
    method: PanMethod;
    startX: number;
    startY: number;
  } | null>(null);

  // Derived state
  const canPanWithSpace = isSpaceKeyDown && currentTool !== 'pan';
  const canPanWithMiddleMouse = currentTool !== 'pan';
  const canPanWithTool = currentTool === 'pan';

  // Update cursor based on current state
  const updateCursor = useCallback(() => {
    if (!canvasElement) {
      console.log('🎯 PAN CURSOR: No canvas element available');
      return;
    }

    let newCursor = 'default';

    if (isPanning) {
      newCursor = 'grabbing';
    } else if (canPanWithSpace || canPanWithTool) {
      newCursor = 'grab';
    } else {
      // Reset to default cursor for other tools
      newCursor = currentTool === 'select' ? 'default' :
                  currentTool === 'move' ? 'move' :
                  currentTool === 'resize' ? 'nw-resize' :
                  currentTool === 'delete' ? 'crosshair' :
                  'default';
    }

    console.log('🎯 PAN CURSOR: Setting cursor', {
      currentTool,
      isPanning,
      canPanWithSpace,
      canPanWithTool,
      newCursor,
      elementType: canvasElement.tagName
    });

    canvasElement.style.cursor = newCursor;
  }, [canvasElement, isPanning, canPanWithSpace, canPanWithTool, currentTool]);

  // Update cursor when canvas element becomes available
  useEffect(() => {
    if (canvasElement) {
      updateCursor();
    }
  }, [canvasElement, updateCursor]);

  // Update cursor when relevant state changes
  useEffect(() => {
    updateCursor();
  }, [updateCursor]);

  // Determine if panning should start based on mouse event
  const shouldStartPan = useCallback((event: MouseEvent): PanMethod => {
    // Don't start panning if already panning
    if (isPanning) return 'none';

    // Check for Space + left mouse button
    if (isSpaceKeyDown && event.button === 0) {
      return 'space-drag';
    }

    // Check for middle mouse button
    if (event.button === 1 && canPanWithMiddleMouse) {
      return 'middle-mouse';
    }

    // Check for pan tool mode with left mouse button
    if (currentTool === 'pan' && event.button === 0) {
      return 'tool-mode';
    }

    return 'none';
  }, [isPanning, isSpaceKeyDown, canPanWithMiddleMouse, currentTool]);

  // Check if panning should continue
  const shouldContinuePan = useCallback((event: MouseEvent): boolean => {
    if (!isPanning || !panStateRef.current) return false;

    const method = panStateRef.current.method;

    // For space-drag, continue only if space is still down
    if (method === 'space-drag') {
      return isSpaceKeyDown;
    }

    // For middle-mouse, continue while middle button is down
    if (method === 'middle-mouse') {
      return (event.buttons & 4) !== 0; // Middle mouse button bit
    }

    // For tool-mode, continue while left button is down
    if (method === 'tool-mode') {
      return (event.buttons & 1) !== 0; // Left mouse button bit
    }

    return false;
  }, [isPanning, isSpaceKeyDown]);

  // Check if panning should end
  const shouldEndPan = useCallback((event: MouseEvent): boolean => {
    if (!isPanning || !panStateRef.current) return false;

    const method = panStateRef.current.method;

    // End panning when mouse button is released
    if (method === 'space-drag' && event.button === 0) return true;
    if (method === 'middle-mouse' && event.button === 1) return true;
    if (method === 'tool-mode' && event.button === 0) return true;

    return false;
  }, [isPanning]);

  // Start panning
  const startPan = useCallback((method: PanMethod, startX: number, startY: number) => {
    if (!cameraControls) return;

    panStateRef.current = { method, startX, startY };
    setIsPanning(true);
    setPanMethod(method);
    
    cameraControls.startPan(startX, startY);
    onPanStateChange?.(true, method);
    updateCursor();
  }, [cameraControls, onPanStateChange, updateCursor]);

  // End panning
  const endPan = useCallback(() => {
    if (!cameraControls || !isPanning) return;

    panStateRef.current = null;
    setIsPanning(false);
    setPanMethod('none');
    
    cameraControls.endPan();
    onPanStateChange?.(false, 'none');
    updateCursor();
  }, [cameraControls, isPanning, onPanStateChange, updateCursor]);

  // Update pan position
  const updatePan = useCallback((currentX: number, currentY: number) => {
    if (!cameraControls || !isPanning) return;
    
    cameraControls.updatePan(currentX, currentY);
  }, [cameraControls, isPanning]);

  // Expose internal methods for canvas integration
  const actions: PanControlsActions = {
    shouldStartPan,
    shouldContinuePan,
    shouldEndPan,
    updateCursor
  };

  // Expose state
  const state: PanControlsState = {
    isPanning,
    panMethod,
    isSpaceKeyDown,
    canPanWithSpace,
    canPanWithMiddleMouse,
    canPanWithTool
  };

  // Space key tracking - moved to end to avoid dependency issues
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpaceKeyDown(true);
        updateCursor();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceKeyDown(false);
        // If we were panning with space, end the pan
        if (panStateRef.current?.method === 'space-drag') {
          endPan();
        }
        updateCursor();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [endPan, updateCursor]);

  // Return the complete interface
  // Memoize the return value to stabilize references (especially actions)
  return useMemo(() => ({
    state,
    actions,
    startPan,
    endPan,
    updatePan
  }), [
    state,
    actions,
    startPan,
    endPan,
    updatePan
  ]);
};
