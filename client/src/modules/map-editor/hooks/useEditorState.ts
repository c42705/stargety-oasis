import { useState, useCallback, useRef } from 'react';
import { EditorState, EditorTool } from '../types/editor.types';
import { DEFAULT_EDITOR_STATE } from '../constants/editorConstants';
import {
  handleToolChange,
  handleUndo,
  handleRedo
} from '../utils/editorHandlers';

export const useEditorState = () => {
  const [editorState, setEditorState] = useState<EditorState>(DEFAULT_EDITOR_STATE);

  // Store reference to Fabric.js canvas for zoom operations
  const fabricCanvasRef = useRef<any>(null);



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
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const currentZoom = canvas.getZoom();
      const newZoom = Math.min(currentZoom * 1.2, 5.0); // Max zoom 5x
      canvas.setZoom(newZoom);
      canvas.renderAll();

      setEditorState(prev => ({
        ...prev,
        zoom: Math.round(newZoom * 100)
      }));

      console.log('🔍 ZOOM IN:', { from: currentZoom, to: newZoom });
    }
  }, []);

  // Zoom out functionality
  const onZoomOut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const currentZoom = canvas.getZoom();
      const newZoom = Math.max(currentZoom / 1.2, 0.1); // Min zoom 0.1x
      canvas.setZoom(newZoom);
      canvas.renderAll();

      setEditorState(prev => ({
        ...prev,
        zoom: Math.round(newZoom * 100)
      }));

      console.log('🔍 ZOOM OUT:', { from: currentZoom, to: newZoom });
    }
  }, []);

  // Reset zoom to 100%
  const onResetZoom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const currentZoom = canvas.getZoom();
      canvas.setZoom(1.0);
      canvas.renderAll();

      setEditorState(prev => ({
        ...prev,
        zoom: 100
      }));

      console.log('🔍 RESET ZOOM:', { from: currentZoom, to: 1.0 });
    }
  }, []);

  // Fit to screen functionality
  const onFitToScreen = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      // Get the actual viewport container (main element)
      const mainContainer = document.querySelector('.editor-main');
      if (mainContainer) {
        const containerWidth = mainContainer.clientWidth;
        const containerHeight = mainContainer.clientHeight;

        // Calculate zoom to fit the world in the viewport
        const worldWidth = 7603; // Current world width
        const worldHeight = 3679; // Current world height

        const zoomX = containerWidth / worldWidth;
        const zoomY = containerHeight / worldHeight;
        const fitZoom = Math.min(zoomX, zoomY); // Allow zooming out as much as needed

        canvas.setZoom(fitZoom);
        canvas.renderAll();

        setEditorState(prev => ({
          ...prev,
          zoom: Math.round(fitZoom * 100)
        }));

        console.log('🔍 FIT TO SCREEN:', { fitZoom, containerWidth, containerHeight, worldWidth, worldHeight });
      }
    }
  }, []);

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
