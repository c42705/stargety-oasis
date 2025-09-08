/**
 * Map Editor Camera Control Hook
 * 
 * This hook provides camera control functionality for the Map Editor using the
 * shared CameraControlSystem to ensure consistent behavior with WorldModule.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraControlSystem, CameraState, WorldBounds, createCameraControlSystem } from '../../../shared/CameraControlSystem';

export interface MapEditorCameraState {
  zoom: number;
  scrollX: number;
  scrollY: number;
  isPanning: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export interface MapEditorCameraControls {
  cameraState: MapEditorCameraState;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: (viewportWidth: number, viewportHeight: number) => void;
  startPan: (startX: number, startY: number) => void;
  updatePan: (currentX: number, currentY: number) => void;
  endPan: () => void;
  setZoom: (zoom: number) => void;
  setScroll: (scrollX: number, scrollY: number) => void;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  updateWorldBounds: (worldBounds: WorldBounds) => void;
}

interface UseMapEditorCameraProps {
  worldBounds: WorldBounds;
  viewportWidth: number;
  viewportHeight: number;
  initialZoom?: number;
}

export const useMapEditorCamera = ({
  worldBounds,
  viewportWidth,
  viewportHeight,
  initialZoom = 1.0
}: UseMapEditorCameraProps): MapEditorCameraControls => {
  
  // Initialize camera control system
  const cameraSystemRef = useRef<CameraControlSystem>(
    createCameraControlSystem(worldBounds, {
      constraints: {
        minZoom: 0.1,
        maxZoom: 5.0,
        zoomStep: 0.2,
        worldBounds
      }
    })
  );

  // Camera state
  const [cameraState, setCameraState] = useState<MapEditorCameraState>(() => {
    const system = cameraSystemRef.current;
    return {
      zoom: initialZoom,
      scrollX: 0,
      scrollY: 0,
      isPanning: false,
      canZoomIn: system.canZoomIn(initialZoom),
      canZoomOut: system.canZoomOut(initialZoom)
    };
  });

  // Pan state
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    startScrollX: number;
    startScrollY: number;
  } | null>(null);

  // Update camera state and notify listeners
  const updateCameraState = useCallback((updates: Partial<MapEditorCameraState>) => {
    setCameraState(prev => {
      const newState = { ...prev, ...updates };

      // Update zoom capabilities
      const system = cameraSystemRef.current;
      newState.canZoomIn = system.canZoomIn(newState.zoom);
      newState.canZoomOut = system.canZoomOut(newState.zoom);

      return newState;
    });
  }, []);



  // Get current camera state for calculations
  const getCurrentCameraState = useCallback((): CameraState => ({
    zoom: cameraState.zoom,
    scrollX: cameraState.scrollX,
    scrollY: cameraState.scrollY,
    width: viewportWidth,
    height: viewportHeight
  }), [cameraState.zoom, cameraState.scrollX, cameraState.scrollY, viewportWidth, viewportHeight]);

  // Zoom in
  const zoomIn = useCallback(() => {
    const system = cameraSystemRef.current;
    const newZoom = system.calculateZoomIn(cameraState.zoom);
    
    if (newZoom !== cameraState.zoom) {
      // Constrain scroll position after zoom change
      const currentState = getCurrentCameraState();
      currentState.zoom = newZoom;
      const constrainedScroll = system.constrainCameraToWorldBounds(
        cameraState.scrollX,
        cameraState.scrollY,
        currentState
      );
      
      updateCameraState({
        zoom: newZoom,
        scrollX: constrainedScroll.x,
        scrollY: constrainedScroll.y
      });
    }
  }, [cameraState.zoom, cameraState.scrollX, cameraState.scrollY, getCurrentCameraState, updateCameraState]);

  // Zoom out
  const zoomOut = useCallback(() => {
    const system = cameraSystemRef.current;
    const newZoom = system.calculateZoomOut(cameraState.zoom);
    
    if (newZoom !== cameraState.zoom) {
      // Constrain scroll position after zoom change
      const currentState = getCurrentCameraState();
      currentState.zoom = newZoom;
      const constrainedScroll = system.constrainCameraToWorldBounds(
        cameraState.scrollX,
        cameraState.scrollY,
        currentState
      );
      
      updateCameraState({
        zoom: newZoom,
        scrollX: constrainedScroll.x,
        scrollY: constrainedScroll.y
      });
    }
  }, [cameraState.zoom, cameraState.scrollX, cameraState.scrollY, getCurrentCameraState, updateCameraState]);

  // Fit to screen
  const fitToScreen = useCallback((vpWidth: number, vpHeight: number) => {
    const system = cameraSystemRef.current;
    const fitZoom = system.calculateFitToScreenZoom(vpWidth, vpHeight);
    const centerPos = system.calculateFitToScreenCenter(vpWidth, vpHeight, fitZoom);
    
    updateCameraState({
      zoom: fitZoom,
      scrollX: centerPos.x,
      scrollY: centerPos.y
    });
  }, [updateCameraState]);

  // Start panning
  const startPan = useCallback((startX: number, startY: number) => {
    panStateRef.current = {
      startX,
      startY,
      startScrollX: cameraState.scrollX,
      startScrollY: cameraState.scrollY
    };
    
    updateCameraState({ isPanning: true });
  }, [cameraState.scrollX, cameraState.scrollY, updateCameraState]);

  // Update pan
  const updatePan = useCallback((currentX: number, currentY: number) => {
    if (!panStateRef.current) return;
    
    const { startX, startY, startScrollX, startScrollY } = panStateRef.current;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    
    const system = cameraSystemRef.current;
    const constrainedScroll = system.applyPanDelta(
      startScrollX,
      startScrollY,
      deltaX,
      deltaY,
      getCurrentCameraState()
    );
    
    updateCameraState({
      scrollX: constrainedScroll.x,
      scrollY: constrainedScroll.y
    });
  }, [getCurrentCameraState, updateCameraState]);

  // End panning
  const endPan = useCallback(() => {
    panStateRef.current = null;
    updateCameraState({ isPanning: false });
  }, [updateCameraState]);

  // Set zoom directly
  const setZoom = useCallback((zoom: number) => {
    const system = cameraSystemRef.current;
    const constraints = system.getConstraints();
    const clampedZoom = Math.max(constraints.minZoom, Math.min(zoom, constraints.maxZoom));
    
    if (clampedZoom !== cameraState.zoom) {
      const currentState = getCurrentCameraState();
      currentState.zoom = clampedZoom;
      const constrainedScroll = system.constrainCameraToWorldBounds(
        cameraState.scrollX,
        cameraState.scrollY,
        currentState
      );
      
      updateCameraState({
        zoom: clampedZoom,
        scrollX: constrainedScroll.x,
        scrollY: constrainedScroll.y
      });
    }
  }, [cameraState.zoom, cameraState.scrollX, cameraState.scrollY, getCurrentCameraState, updateCameraState]);

  // Set scroll position directly
  const setScroll = useCallback((scrollX: number, scrollY: number) => {
    const system = cameraSystemRef.current;
    const constrainedScroll = system.constrainCameraToWorldBounds(
      scrollX,
      scrollY,
      getCurrentCameraState()
    );
    
    updateCameraState({
      scrollX: constrainedScroll.x,
      scrollY: constrainedScroll.y
    });
  }, [getCurrentCameraState, updateCameraState]);

  // Screen to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const system = cameraSystemRef.current;
    return system.screenToWorld(screenX, screenY, getCurrentCameraState());
  }, [getCurrentCameraState]);

  // World to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const system = cameraSystemRef.current;
    return system.worldToScreen(worldX, worldY, getCurrentCameraState());
  }, [getCurrentCameraState]);

  // Update world bounds
  const updateWorldBounds = useCallback((newWorldBounds: WorldBounds) => {
    const system = cameraSystemRef.current;
    system.updateConstraints({ worldBounds: newWorldBounds });
    
    // Re-constrain current scroll position
    const constrainedScroll = system.constrainCameraToWorldBounds(
      cameraState.scrollX,
      cameraState.scrollY,
      getCurrentCameraState()
    );
    
    updateCameraState({
      scrollX: constrainedScroll.x,
      scrollY: constrainedScroll.y
    });
  }, [cameraState.scrollX, cameraState.scrollY, getCurrentCameraState, updateCameraState]);

  // Update world bounds when they change
  useEffect(() => {
    updateWorldBounds(worldBounds);
  }, [worldBounds, updateWorldBounds]);

  return {
    cameraState,
    zoomIn,
    zoomOut,
    fitToScreen,
    startPan,
    updatePan,
    endPan,
    setZoom,
    setScroll,
    screenToWorld,
    worldToScreen,
    updateWorldBounds
  };
};
