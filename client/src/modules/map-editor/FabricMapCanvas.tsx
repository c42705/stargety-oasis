/**
 * Enhanced Fabric.js Canvas for Map Editor
 * 
 * Refactored component using custom hooks for better code organization and maintainability.
 * All complex logic has been extracted into focused, reusable hooks.
 * 
 * Architecture:
 * - Core Drawing: usePolygonDrawing, useRectangleDrawing, useAreaDeletion
 * - Object Management: useObjectHandlers, useCanvasEvents
 * - Rendering: useGridRenderer, useCollisionRenderer, useInteractiveRenderer, useBackgroundImage, useLayerOrder
 */

import React, { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { useSharedMapCompat as useSharedMap } from '../../stores/useSharedMapCompat';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { BackgroundInfoPanel } from './components/BackgroundInfoPanel';
import { PolygonEditHandles } from './utils/polygonEditUtils';
import { usePolygonEditMode } from './hooks/usePolygonEditMode';

// Import all custom hooks
import { usePolygonDrawing } from './hooks/usePolygonDrawing';
import { useRectangleDrawing } from './hooks/useRectangleDrawing';
import { useAreaDeletion } from './hooks/useAreaDeletion';
import { useObjectHandlers } from './hooks/useObjectHandlers';
import { useCanvasEvents } from './hooks/useCanvasEvents';
import { useGridRenderer } from './hooks/useGridRenderer';
import { useCollisionRenderer } from './hooks/useCollisionRenderer';
import { useInteractiveRenderer } from './hooks/useInteractiveRenderer';
import { useBackgroundImage } from './hooks/useBackgroundImage';
import { useLayerOrder } from './hooks/useLayerOrder';

// Import utilities
import { initializeFabricCanvas } from './utils/canvasInitialization';

// Import types
import { FabricMapCanvasProps, CanvasObject } from './types/fabricCanvas.types';

import './FabricMapCanvas.css';

export const FabricMapCanvas: React.FC<FabricMapCanvasProps> = ({
  width,
  height,
  gridVisible,
  gridSpacing,
  gridPattern,
  gridOpacity,
  onSelectionChanged,
  onObjectModified,
  onAreaDrawn,
  onCollisionAreaDrawn,
  drawingMode = false,
  collisionDrawingMode = false,
  drawingAreaData,
  drawingCollisionAreaData,
  className = '',
  onCanvasReady,
  currentTool = 'select',
  onZoomChange,
  backgroundInfoPanelVisible = false,
  onBackgroundInfoPanelClose,
}) => {
  // ===== REFS AND STATE =====
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const editHandlesRef = useRef<PolygonEditHandles>({ vertexHandles: [], edgeHandles: [] });
  const draggingPolygonIdRef = useRef<string | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);
  const [forceRender, setForceRender] = useState(0);

  // Get shared map data
  const sharedMap = useSharedMap();

  // ===== POLYGON EDIT MODE =====
  const polygonEditMode = usePolygonEditMode();

  // ===== LAYER ORDER HOOK =====
  const { updateLayerOrder } = useLayerOrder({
    canvasRef: fabricCanvasRef
  });

  // ===== BACKGROUND IMAGE HOOK =====
  const { backgroundImageUrl, updateBackgroundImage } = useBackgroundImage({
    canvasRef: fabricCanvasRef,
    mapData: sharedMap.mapData,
    isInitialized,
    updateLayerOrder,
    setIsBackgroundReady
  });

  // ===== OBJECT HANDLERS HOOK =====
  const { handleObjectModified, handleObjectMoving, handleObjectScaling } = useObjectHandlers({
    gridVisible,
    gridSpacing,
    onUpdateInteractiveArea: sharedMap.updateInteractiveArea,
    onUpdateCollisionArea: sharedMap.updateCollisionArea
  });

  // ===== AREA DELETION HOOK =====
  const {
    areaDeletionState,
    handleDeleteSelectedAreas,
    handleConfirmDeletion,
    handleCancelDeletion
  } = useAreaDeletion({
    canvas: fabricCanvasRef.current,
    onRemoveInteractiveArea: sharedMap.removeInteractiveArea
  });

  // ===== POLYGON DRAWING HOOK =====
  const {
    polygonDrawingState,
    addPolygonVertex,
    updatePolygonPreview,
    completePolygon,
    cancelPolygonDrawing,
    snapPointToGrid
  } = usePolygonDrawing({
    canvas: fabricCanvasRef.current,
    gridVisible,
    gridSpacing,
    impassableAreas: sharedMap.collisionAreas,
    onAddCollisionArea: sharedMap.addCollisionArea,
    onUpdateImpassableAreas: () => {}, // Not needed in this context
    pendingCollisionAreaData: drawingCollisionAreaData
  });

  // ===== RECTANGLE DRAWING HOOK =====
  const {
    rectangleDrawingState,
    handleDrawingStart,
    handleDrawingMove,
    handleDrawingEnd
  } = useRectangleDrawing({
    canvas: fabricCanvasRef.current,
    drawingMode,
    collisionDrawingMode,
    drawingAreaData,
    drawingCollisionAreaData,
    minAreaSize: 90,
    onAreaDrawn,
    onCollisionAreaDrawn,
    onForceRender: () => setForceRender(prev => prev + 1)
  });

  // ===== GRID RENDERER HOOK =====
  const { renderGrid } = useGridRenderer({
    canvas: fabricCanvasRef.current,
    width,
    height,
    gridVisible,
    gridSpacing,
    gridPattern,
    gridOpacity,
    onUpdateLayerOrder: updateLayerOrder
  });

  // ===== COLLISION RENDERER HOOK =====
  const { renderCollisionAreas } = useCollisionRenderer({
    canvas: fabricCanvasRef.current,
    collisionAreas: sharedMap.collisionAreas,
    gridSpacing,
    draggingPolygonIdRef
  });

  // ===== INTERACTIVE RENDERER HOOK =====
  const { renderInteractiveAreas } = useInteractiveRenderer({
    canvas: fabricCanvasRef.current,
    interactiveAreas: sharedMap.interactiveAreas
  });

  // ===== CANVAS EVENTS HOOK =====
  const { setupCanvasEventListeners } = useCanvasEvents({
    canvas: fabricCanvasRef.current,
    currentTool,
    drawingMode,
    collisionDrawingMode,
    isPolygonEditMode: polygonEditMode.editState.isEditing,
    editHandlesRef,
    draggingPolygonIdRef,
    onSelectionChanged,
    onObjectModified,
    handleObjectModified,
    handleObjectMoving,
    handleObjectScaling,
    handleDeleteSelectedAreas,
    onZoomChange,
    addPolygonVertex,
    updatePolygonPreview,
    completePolygon,
    polygonDrawingState
  });

  // ===== CANVAS INITIALIZATION =====
  useEffect(() => {
    if (!canvasRef.current) return;

    const { canvas, cleanup } = initializeFabricCanvas(canvasRef.current, {
      width,
      height,
      onCanvasReady
    });

    fabricCanvasRef.current = canvas;
    setIsBackgroundReady(false);
    setIsElementsReady(false);
    setIsInitialized(true);

    // Setup event listeners
    const cleanupEvents = setupCanvasEventListeners(canvas);

    return () => {
      cleanupEvents();
      cleanup();
      fabricCanvasRef.current = null;
      setIsInitialized(false);
    };
  }, []); // Only run once on mount

  // ===== CANVAS SIZE UPDATE =====
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({ width, height });
      fabricCanvasRef.current.renderAll();
    }
  }, [width, height]);

  // ===== CANVAS SELECTION BEHAVIOR =====
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      const isSelectTool = currentTool === 'select';
      canvas.selection = isSelectTool;

      if (drawingMode || collisionDrawingMode || currentTool === 'draw-polygon') {
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else if (currentTool === 'pan') {
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
      } else {
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.moveCursor = 'move';
      }

      // Disable object selection for all except select tool
      canvas.forEachObject((obj) => {
        const isGrid = (obj as any).isGridPattern || (obj as any).mapElementType === 'grid';
        const isBg = (obj as any).isBackgroundImage || (obj as any).backgroundImageId === 'map-background-image' || (obj as any).mapElementType === 'background';
        if (isGrid || isBg) {
          obj.selectable = false;
          obj.evented = false;
          (obj as any).locked = true;
        } else {
          obj.selectable = isSelectTool;
          obj.evented = isSelectTool;
        }
      });

      canvas.renderAll();
    }
  }, [drawingMode, collisionDrawingMode, currentTool]);

  // ===== GRID RENDERING =====
  useEffect(() => {
    if (isInitialized && isBackgroundReady) {
      renderGrid();
    }
  }, [isInitialized, isBackgroundReady, renderGrid]);

  // ===== AREA RENDERING =====
  useEffect(() => {
    if (isInitialized && isBackgroundReady) {
      renderInteractiveAreas();
      renderCollisionAreas();
      setIsElementsReady(true);
    }
  }, [isInitialized, isBackgroundReady, renderInteractiveAreas, renderCollisionAreas, forceRender]);

  // ===== LAYER ORDER UPDATE =====
  useEffect(() => {
    if (isElementsReady && fabricCanvasRef.current) {
      updateLayerOrder();
    }
  }, [isElementsReady, updateLayerOrder]);

  // ===== DRAWING MODE CONFIGURATION =====
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      if (drawingMode || currentTool === 'draw-polygon') {
        canvas.selection = false;
      }
    }
  }, [drawingMode, currentTool]);

  // ===== RENDER =====
  return (
    <div className={`fabric-map-canvas-container ${className}`} style={{ position: 'relative', width, height }}>
      <canvas ref={canvasRef} />

      {/* Background Info Panel */}
      {backgroundInfoPanelVisible && onBackgroundInfoPanelClose && (
        <BackgroundInfoPanel
          isVisible={backgroundInfoPanelVisible}
          onClose={onBackgroundInfoPanelClose}
          canvasWidth={width}
          canvasHeight={height}
          backgroundLoadingStatus={backgroundImageUrl ? 'loaded' : 'none'}
          backgroundVisible={!!backgroundImageUrl}
        />
      )}

      {/* Area Deletion Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={areaDeletionState.showDeleteDialog}
        onClose={handleCancelDeletion}
        onConfirm={handleConfirmDeletion}
        title="Delete Areas"
        message={`Are you sure you want to delete ${areaDeletionState.areasToDelete.length} area(s)?`}
        type="danger"
        showUndoWarning={true}
      />
    </div>
  );
};

