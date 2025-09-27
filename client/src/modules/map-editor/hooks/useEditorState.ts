import { useState, useCallback, useRef } from 'react';
import { EditorState, EditorTool } from '../types/editor.types';
import { DEFAULT_EDITOR_STATE, ZOOM_CONFIG } from '../constants/editorConstants';
import {
  handleToolChange,
  handleUndo,
  handleRedo
} from '../utils/editorHandlers';
import {
  calculateZoomStep,
  getZoomState,
  validateZoomOperation,
  getViewportDimensions,
  calculateFitToScreenZoom,
  applyZoomAndPan,
  createDebouncedZoomHandler
} from '../utils/zoomUtils';
import { createComponentLogger, PerformanceTimer } from '../utils/logging';
import {
  validateCanvasState,
  validateZoomLevel,
  safeExecute,
  ERROR_CODES,
  MapEditorError
} from '../utils/errorHandling';

export const useEditorState = () => {
  const [editorState, setEditorState] = useState<EditorState>(DEFAULT_EDITOR_STATE);

  // Store reference to Fabric.js canvas for zoom operations
  const fabricCanvasRef = useRef<any>(null);

  // Component logger
  const logger = createComponentLogger('useEditorState');

  // Track manual zoom operations to prevent automatic fit-to-screen interference
  const manualZoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced zoom state update handler
  const debouncedZoomUpdate = useRef(
    createDebouncedZoomHandler((zoom: number) => {
      setEditorState(prev => ({
        ...prev,
        zoom: Math.round(zoom * 100)
      }));
    }, 50)
  );

  // Helper function to mark manual zoom operations
  const markManualZoomOperation = useCallback(() => {
    // Clear any existing timeout
    if (manualZoomTimeoutRef.current) {
      clearTimeout(manualZoomTimeoutRef.current);
    }

    // Set a flag to prevent automatic fit-to-screen
    manualZoomTimeoutRef.current = setTimeout(() => {
      manualZoomTimeoutRef.current = null;
    }, ZOOM_CONFIG.MANUAL_ZOOM_TIMEOUT);
  }, []);

  // Check if manual zoom is in progress
  const isManualZoomInProgress = useCallback(() => {
    return manualZoomTimeoutRef.current !== null;
  }, []);

  const onToolChange = useCallback((tool: EditorTool) => {
    console.log('🔧 TOOL: onToolChange called in useEditorState', {
      timestamp: new Date().toISOString(),
      requestedTool: tool,
      currentState: editorState,
      source: 'useEditorState.onToolChange'
    });

    handleToolChange(tool, setEditorState);

    console.log('🔧 TOOL: handleToolChange completed in useEditorState', {
      timestamp: new Date().toISOString(),
      toolAfterChange: tool
    });
  }, [editorState]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    // TODO: Update mouse position in world coordinates when camera controls are implemented
    const newX = e.clientX;
    const newY = e.clientY;

    setEditorState(prev => {
      // Only update if position actually changed to prevent unnecessary re-renders
      if (prev.mousePosition.x === newX && prev.mousePosition.y === newY) {
        return prev;
      }
      return {
        ...prev,
        mousePosition: { x: newX, y: newY }
      };
    });
  }, []);

  const onUndo = useCallback(() => {
    handleUndo();
  }, []);

  const onRedo = useCallback(() => {
    handleRedo();
  }, []);

  // Set fabric canvas reference for zoom operations
  const setFabricCanvas = useCallback((canvas: any) => {
    fabricCanvasRef.current = canvas;
  }, []);

  // Zoom in functionality
  const onZoomIn = useCallback(() => {
    return safeExecute(async () => {
      const timer = new PerformanceTimer('zoom_in', { operation: 'zoom_in' });

      validateCanvasState(fabricCanvasRef.current, 'zoom in');
      const canvas = fabricCanvasRef.current;

      const currentZoom = canvas.getZoom();
      validateZoomLevel(currentZoom, 'zoom in');

      const newZoom = calculateZoomStep(currentZoom, 'in', false);

      // Validate zoom operation
      const validation = validateZoomOperation(canvas, newZoom, 'zoom in');
      if (!validation.isValid) {
        throw new MapEditorError(
          ERROR_CODES.ZOOM_OPERATION_FAILED,
          validation.error || 'Zoom in operation failed',
          'medium',
          { operation: 'zoom_in', zoom: newZoom }
        );
      }

      // Mark this as a manual zoom operation
      markManualZoomOperation();

      // Apply zoom
      canvas.setZoom(newZoom);
      canvas.renderAll();

      // Update state with debouncing
      debouncedZoomUpdate.current(newZoom);

      const zoomState = getZoomState(newZoom);
      logger.info('Zoom in completed', {
        operation: 'zoom_in',
        zoom: newZoom,
        userAction: 'manual_zoom_in'
      }, {
        from: currentZoom,
        to: newZoom,
        percentage: `${zoomState.percentage}%`,
        isExtreme: zoomState.isExtreme
      });

      timer.end();
    }, {
      operation: 'zoom_in',
      component: 'useEditorState'
    });
  }, [markManualZoomOperation, logger]);

  // Zoom out functionality
  const onZoomOut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    const newZoom = calculateZoomStep(currentZoom, 'out', false);

    // Validate zoom operation
    const validation = validateZoomOperation(canvas, newZoom, 'zoom out');
    if (!validation.isValid) {
      console.warn('🔍 ZOOM OUT BLOCKED:', validation.error);
      return;
    }

    // Mark this as a manual zoom operation
    markManualZoomOperation();

    // Apply zoom
    canvas.setZoom(newZoom);
    canvas.renderAll();

    // Update state with debouncing
    debouncedZoomUpdate.current(newZoom);

    const zoomState = getZoomState(newZoom);
    console.log('🔍 MANUAL ZOOM OUT:', {
      from: currentZoom,
      to: newZoom,
      percentage: `${zoomState.percentage}%`,
      isAtMin: zoomState.isAtMin
    });
  }, [markManualZoomOperation]);

  // Reset zoom to 100%
  const onResetZoom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    const resetZoom = 1.0;

    // Validate zoom operation
    const validation = validateZoomOperation(canvas, resetZoom, 'reset zoom');
    if (!validation.isValid) {
      console.warn('🔍 RESET ZOOM BLOCKED:', validation.error);
      return;
    }

    // Mark this as a manual zoom operation
    markManualZoomOperation();

    // Apply zoom
    canvas.setZoom(resetZoom);
    canvas.renderAll();

    // Update state immediately for reset
    setEditorState(prev => ({
      ...prev,
      zoom: 100
    }));

  }, [markManualZoomOperation]);

  // Fit to screen functionality
  const onFitToScreen = useCallback((force: boolean = false) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Skip if manual zoom is in progress (unless forced)
    if (!force && isManualZoomInProgress()) {
      return;
    }

    // Get the actual viewport container (main element)
    const mainContainer = document.querySelector('.editor-main');
    if (!mainContainer) {
      console.warn('🔍 FIT TO SCREEN FAILED: Container not found');
      return;
    }

    try {
      // Get viewport dimensions
      const viewportDims = getViewportDimensions(mainContainer);

      // Get actual world dimensions from canvas
      const worldWidth = canvas.width || 800;
      const worldHeight = canvas.height || 600;

      // Calculate fit zoom
      const fitZoom = calculateFitToScreenZoom(
        worldWidth,
        worldHeight,
        viewportDims.width,
        viewportDims.height
      );

      // Validate zoom operation
      const validation = validateZoomOperation(canvas, fitZoom, 'fit to screen');
      if (!validation.isValid) {
        console.warn('🔍 FIT TO SCREEN BLOCKED:', validation.error);
        return;
      }

      // Apply zoom and center the canvas
      applyZoomAndPan(canvas, fitZoom, worldWidth / 2, worldHeight / 2, viewportDims);

      // Update state
      setEditorState(prev => ({
        ...prev,
        zoom: Math.round(fitZoom * 100)
      }));

      const zoomState = getZoomState(fitZoom);
      // logger.debug('FIT TO SCREEN', {
      //   fitZoom,
      //   worldDimensions: { width: worldWidth, height: worldHeight },
      //   viewportDimensions: viewportDims,
      //   zoomPercentage: `${zoomState.percentage}%`,
      //   forced: force
      // });
    } catch (error) {
      console.error('🔍 FIT TO SCREEN ERROR:', error);
    }
  }, [isManualZoomInProgress]);

  return {
    editorState,
    setEditorState,
    setFabricCanvas,
    onToolChange,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    onMouseMove,
    onUndo,
    onRedo
  };
};
