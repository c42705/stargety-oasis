/**
 * Konva Map Editor Module
 * 
 * Main wrapper component for the Konva-based map editor.
 * Integrates all Konva hooks with existing UI components (Toolbar, StatusBar, LayersPanel, Tabs).
 * 
 * This component mirrors the structure of MapEditorModule.tsx but uses Konva instead of Fabric.js.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../shared/logger';
import { useMapData } from '../../shared/MapDataContext';
import { useMapStore } from '../../stores/useMapStore';
import { useMapStoreInit } from '../../stores/useMapStoreInit';
import { useWorldDimensions } from '../../shared/useWorldDimensions';
import { EditorToolbar } from './components/shared/EditorToolbar';
import { EditorStatusBar } from './components/shared/EditorStatusBar';
import { shouldIgnoreKeyboardEvent } from '../../shared/keyboardFocusUtils';

// Import CSS
import './MapEditorModule.css';

// Import Konva hooks
import { useKonvaLayers } from './hooks/useKonvaLayers';
import { useKonvaZoom } from './hooks/useKonvaZoom';
import { useKonvaPan } from './hooks/useKonvaPan';
import { useKonvaGrid } from './hooks/useKonvaGrid';
import { useKonvaBackground } from './hooks/useKonvaBackground';
import { useKonvaPolygonDrawing } from './hooks/useKonvaPolygonDrawing';
import { useKonvaRectDrawing } from './hooks/useKonvaRectDrawing';
import { useKonvaSelection } from './hooks/useKonvaSelection';
import { useKonvaTransform } from './hooks/useKonvaTransform';
import { useKonvaHistory } from './hooks/useKonvaHistory';
import { useKonvaPersistence } from './hooks/useKonvaPersistence';
import { useKonvaPreviewMode } from './hooks/useKonvaPreviewMode';
import { useKonvaKeyboardShortcuts } from './hooks/useKonvaKeyboardShortcuts';
import { useKonvaVertexEdit } from './hooks/useKonvaVertexEdit';

// Import refactored hooks
import { useEditorCoreState } from './hooks/useEditorCoreState';
import { useToolbarHandlers } from './hooks/useToolbarHandlers';
import { useAreaHandlers } from './hooks/useAreaHandlers';
import { useLayersHandlers } from './hooks/useLayersHandlers';
import { useStageEventHandlers } from './hooks/useStageEventHandlers';
import { useShapeCreationHandlers } from './hooks/useShapeCreationHandlers';

// Import config
import { createKeyboardShortcuts } from './config/keyboardShortcutsConfig';

// Import Konva components
import { KonvaLayersPanel } from './components/KonvaLayersPanel';

// Import refactored components
import { EditorCanvas } from './components/EditorCanvas';
import { EditorModals } from './components/EditorModals';
import { EditorSidebar } from './components/EditorSidebar';

// Import types
import type { Shape, EditorState } from './types';
import type { EditorTool as KonvaEditorTool } from './types';

// Import utilities
import { mapDataToShapes, shapeToInteractiveArea, shapeToImpassableArea, shapeToAsset } from './utils/mapDataAdapter';
import { calculateZoomToShape } from './utils/zoomToShape';
import { groupShapes, ungroupShapes } from './utils/shapeFactories';
import { placeAsset } from './utils/editorHelpers';



// ============================================================================
// DEAD CODE REMOVED
// ============================================================================
// Fabric.js type adapters removed - no longer needed as we use Konva exclusively

// ============================================================================
// COMPONENT
// ============================================================================

export interface KonvaMapEditorModuleProps {
  className?: string;
}

export const KonvaMapEditorModule: React.FC<KonvaMapEditorModuleProps> = ({
  className = ''
}) => {
  const { mapData, updateAsset, addAsset, removeAsset } = useMapData();
  
  // Initialize the map store
  useMapStoreInit({ autoLoad: true, source: 'editor' });
  
  // Get map store state and actions
  const {
    addInteractiveArea,
    updateInteractiveArea,
    removeInteractiveArea,
    addCollisionArea,
    updateCollisionArea,
    removeCollisionArea,
    markDirty,
    // saveMap is used by SaveStatusIndicator component
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    saveMap
  } = useMapStore();

  // ===== STATE (REFACTORED) =====
  // All state management extracted to useEditorCoreState hook
  const {
    // Tab state
    activeTab,
    setActiveTab,
    // Shape state
    shapes, setShapes,
    selectedIds, setSelectedIds,
    // Viewport state
    viewport, setViewport,
    viewportWidth,
    viewportHeight,
    // Grid state
    gridConfig, setGridConfig,
    // Tool state
    currentTool, setCurrentTool,
    // Interaction state
    isSpacebarPressed, setIsSpacebarPressed,
    cursorStyle, setCursorStyle,
    // Modal states
    showAreaModal, setShowAreaModal,
    editingArea, setEditingArea,
    areaToDelete, setAreaToDelete,
    showDeleteConfirm, setShowDeleteConfirm,
    showCollisionAreaModal, setShowCollisionAreaModal,
    editingCollisionArea, setEditingCollisionArea,
    collisionAreaToDelete, setCollisionAreaToDelete,
    showCollisionDeleteConfirm, setShowCollisionDeleteConfirm,
    showKeyboardDeleteConfirm, setShowKeyboardDeleteConfirm,
    shapesToDelete, setShapesToDelete,
    // Drawing mode states
    drawingMode, setDrawingMode,
    pendingAreaData, setPendingAreaData,
    collisionDrawingMode, setCollisionDrawingMode,
    pendingCollisionAreaData, setPendingCollisionAreaData,
    // Refs
    stageRef,
    mainRef,
  } = useEditorCoreState();

  // Use shared map data
  const { interactiveAreas: areas, impassableAreas } = mapData;

  // Use WorldDimensionsManager for direct, non-looping dimension access
  const worldDimensions = useWorldDimensions({
    subscribeToEffective: true,
    subscribeToCanvas: true,
    enableShallowComparison: true,
    enableLogging: false
  });

  // Get effective dimensions directly from WorldDimensionsManager
  const effectiveDimensions = worldDimensions.effectiveDimensions;

  // Viewport measurement effect is now handled by useEditorState hook

  // ===== KONVA HOOKS =====

  // Layer management
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { layerRefs, refreshAllLayers } = useKonvaLayers();

  // Zoom controls
  const zoom = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
    enabled: true,
  });

  // Pan controls (enabled for pan tool OR spacebar pressed)
  const pan = useKonvaPan({
    viewport,
    onViewportChange: setViewport,
    enabled: currentTool === 'pan' || isSpacebarPressed,
    enableMiddleButton: true, // Always allow middle mouse button pan
  });

  // Spacebar pan support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore spacebar when typing in input fields or when modal is open
      if (shouldIgnoreKeyboardEvent()) {
        return;
      }

      if (e.code === 'Space' && !isSpacebarPressed && !e.repeat) {
        e.preventDefault();
        setIsSpacebarPressed(true);
        setCursorStyle('grab');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Ignore spacebar when typing in input fields or when modal is open
      if (shouldIgnoreKeyboardEvent()) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacebarPressed(false);
        setCursorStyle('default');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacebarPressed]);

  // Update cursor when panning
  useEffect(() => {
    if (pan.isPanning) {
      setCursorStyle('grabbing');
    } else if (isSpacebarPressed || currentTool === 'pan') {
      setCursorStyle('grab');
    } else {
      setCursorStyle('default');
    }
  }, [pan.isPanning, isSpacebarPressed, currentTool]);

  // Grid
  const grid = useKonvaGrid({
    viewport,
    config: gridConfig,
    canvasWidth: viewportWidth,
    canvasHeight: viewportHeight,
  });

  // Background
  const background = useKonvaBackground({
    viewport,
    imageUrl: mapData.backgroundImage,
  });

  // Preview mode
  const previewMode = useKonvaPreviewMode({
    initialPreviewMode: false,
  });

  // Create current editor state
  const currentEditorState: EditorState = {
    viewport,
    grid: gridConfig,
    shapes,
    selection: {
      selectedIds,
      isMultiSelect: false,
      selectionRect: null,
    },
    tool: {
      current: currentTool,
      previous: null,
      isActive: false,
    },
    history: {
      past: [],
      future: [],
      maxSize: 50,
    },
    backgroundImage: mapData.backgroundImage,
    backgroundImageDimensions: mapData.backgroundImageDimensions,
    worldDimensions: effectiveDimensions || { width: 800, height: 600 },
    isPreviewMode: false,
    isDirty: false,
  };

  // History
  const history = useKonvaHistory({
    currentState: currentEditorState,
    onStateRestore: (state: EditorState) => {
      setShapes(state.shapes);
      setSelectedIds(state.selection.selectedIds);
      setViewport(state.viewport);
      setGridConfig(state.grid);
      setCurrentTool(state.tool.current);
    },
    maxHistorySize: 50,
    enabled: true,
  });

  // Shape creation handlers (extracted for cleaner code)
  const shapeCreationHandlers = useShapeCreationHandlers({
    pendingAreaData,
    pendingCollisionAreaData,
    impassableAreas,
    setPendingAreaData,
    setPendingCollisionAreaData,
    setDrawingMode,
    setCollisionDrawingMode,
    setCurrentTool,
    addInteractiveArea,
    addCollisionArea,
    markDirty,
    history,
  });

  // Polygon drawing
  const polygonDrawing = useKonvaPolygonDrawing({
    viewport,
    gridConfig,
    category: 'collision',
    enabled: currentTool === 'polygon' || collisionDrawingMode,
    snapToGrid: grid.snapToGrid,
    onShapeCreate: shapeCreationHandlers.handlePolygonShapeCreate,
    minVertices: 3,
  });

  // Rectangle drawing for interactive areas
  const rectDrawing = useKonvaRectDrawing({
    viewport,
    gridConfig,
    category: 'interactive',
    enabled: currentTool === 'rect' || (drawingMode && !collisionDrawingMode),
    snapToGrid: grid.snapToGrid,
    onShapeCreate: shapeCreationHandlers.handleRectShapeCreate,
    minSize: 10,
  });

  // Rectangle drawing for collision areas
  const collisionRectDrawing = useKonvaRectDrawing({
    viewport,
    gridConfig,
    category: 'collision',
    enabled: collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle',
    snapToGrid: grid.snapToGrid,
    onShapeCreate: shapeCreationHandlers.handleCollisionRectShapeCreate,
    minSize: 10,
  });

  // Selection change handler with auto-switch to Properties tab
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    // Auto-switch to Properties tab when selecting items (unless in Settings tab)
    if (ids.length > 0 && activeTab !== 'settings') {
      setActiveTab('properties');
    }
  }, [setSelectedIds, activeTab, setActiveTab]);

  // Selection (controlled - selectedIds is managed by useEditorState)
  const selection = useKonvaSelection({
    shapes,
    selectedIds,
    onSelectionChange: handleSelectionChange,
    enabled: currentTool === 'select' && !previewMode.isPreviewMode,
    viewport,
  });

  // Transformation
  const transform = useKonvaTransform({
    shapes,
    selectedIds,
    snapToGrid: grid.snapToGrid,
    onShapeUpdate: (id: string, updates: Partial<Shape>) => {
      // Update local shapes state
      setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

      // Sync changes back to map data store
      const updatedShape = shapes.find(s => s.id === id);
      if (updatedShape) {
        const mergedShape = { ...updatedShape, ...updates };

        if (mergedShape.category === 'interactive') {
          // Update interactive area in store
          const interactiveArea = shapeToInteractiveArea(mergedShape);
          updateInteractiveArea(id, interactiveArea);
          markDirty();
        } else if (mergedShape.category === 'collision') {
          // Update collision area in store
          const collisionArea = shapeToImpassableArea(mergedShape);
          updateCollisionArea(id, collisionArea);
          markDirty();
        } else if (mergedShape.category === 'asset') {
          // Update asset in store
          const asset = shapeToAsset(mergedShape);
          updateAsset(id, asset);
          markDirty();
        }
      }

      history.pushState('Transform shape');
    },
    enabled: !previewMode.isPreviewMode,
  });

  // Vertex editing - get the shape being edited
  const editingShape = selectedIds.length === 1
    ? (shapes.find(s => s.id === selectedIds[0]) || null)
    : null;

  const vertexEdit = useKonvaVertexEdit({
    shape: editingShape,
    enabled: currentTool === 'edit-vertex' && !previewMode.isPreviewMode,
    onShapeUpdate: (id: string, updates: Partial<Shape>) => {
      // Update local shapes state
      setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

      // Sync changes back to map data store
      const updatedShape = shapes.find(s => s.id === id);
      if (updatedShape) {
        const mergedShape = { ...updatedShape, ...updates };

        if (mergedShape.category === 'interactive') {
          // Update interactive area in store
          const interactiveArea = shapeToInteractiveArea(mergedShape);
          updateInteractiveArea(id, interactiveArea);
          markDirty();
        } else if (mergedShape.category === 'collision') {
          // Update collision area in store
          const collisionArea = shapeToImpassableArea(mergedShape);
          updateCollisionArea(id, collisionArea);
          markDirty();
        } else if (mergedShape.category === 'asset') {
          // Update asset in store
          const asset = shapeToAsset(mergedShape);
          updateAsset(id, asset);
          markDirty();
        }
      }

      history.pushState('Edit vertex');
    },
    onCancel: () => {
      setCurrentTool('select');
    },
  });

  // Persistence - auto-save and auto-load are enabled, hook manages state internally
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const persistence = useKonvaPersistence({
    currentState: currentEditorState,
    onStateRestore: (state: EditorState) => {
      setShapes(state.shapes);
      setSelectedIds(state.selection.selectedIds);
      setViewport(state.viewport);
      setGridConfig(state.grid);
      setCurrentTool(state.tool.current);
    },
    storageKey: 'konva-map-editor-state',
    autoSaveDelay: 2000,
    enabled: true,
  });

  // Keyboard shortcuts - configuration extracted to keyboardShortcutsConfig.ts
  const keyboardShortcuts = useMemo(() => createKeyboardShortcuts({
    shapes,
    selectedIds,
    currentTool,
    setShapes,
    setSelectedIds,
    setGridConfig,
    setCurrentTool,
    setShapesToDelete,
    setShowKeyboardDeleteConfirm,
    addInteractiveArea,
    addCollisionArea,
    markDirty,
    history,
  }), [
    shapes, selectedIds, currentTool,
    setShapes, setSelectedIds, setGridConfig, setCurrentTool,
    setShapesToDelete, setShowKeyboardDeleteConfirm,
    addInteractiveArea, addCollisionArea, markDirty, history,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const shortcuts = useKonvaKeyboardShortcuts({
    enabled: true,
    shortcuts: keyboardShortcuts,
  });

  // ===== SYNC SHAPES WITH MAP DATA =====
  useEffect(() => {
    // Convert MapData to Konva shapes (including assets)
    const konvaShapes = mapDataToShapes(
      mapData.interactiveAreas || [],
      mapData.impassableAreas || [],
      mapData.assets || []
    );
    setShapes(konvaShapes);
  }, [mapData.interactiveAreas, mapData.impassableAreas, mapData.assets]);

  // ===== HANDLER HOOKS (REFACTORED) =====

  // Toolbar handlers
  const toolbarHandlers = useToolbarHandlers({
    setCurrentTool,
    setGridConfig,
    viewportWidth,
    viewportHeight,
    shapes,
    background,
    zoom,
    history,
  });

  // Area handlers (interactive & collision areas + keyboard delete)
  const areaHandlers = useAreaHandlers({
    setCurrentTool,
    setShowAreaModal,
    setEditingArea,
    setAreaToDelete,
    setShowDeleteConfirm,
    setShowCollisionAreaModal,
    setEditingCollisionArea,
    setCollisionAreaToDelete,
    setShowCollisionDeleteConfirm,
    setShowKeyboardDeleteConfirm,
    setShapesToDelete,
    setDrawingMode,
    setPendingAreaData,
    setCollisionDrawingMode,
    setPendingCollisionAreaData,
    setShapes,
    setSelectedIds,
    editingArea,
    editingCollisionArea,
    areaToDelete,
    collisionAreaToDelete,
    shapesToDelete,
    addInteractiveArea,
    updateInteractiveArea,
    removeInteractiveArea,
    addCollisionArea,
    updateCollisionArea,
    removeCollisionArea,
    markDirty,
    history,
  });

  // Layers panel handlers
  const layersHandlers = useLayersHandlers({
    setSelectedIds,
    setCurrentTool,
    setShapes,
    setAreaToDelete,
    setShowDeleteConfirm,
    setCollisionAreaToDelete,
    setShowCollisionDeleteConfirm,
    setViewport,
    setActiveTab,
    shapes,
    areas,
    impassableAreas,
    activeTab,
    mainRef,
    markDirty,
    history,
    removeAsset,
  });

  // Stage event handlers
  const stageEventHandlers = useStageEventHandlers({
    currentTool,
    isSpacebarPressed,
    collisionDrawingMode,
    drawingMode,
    pendingCollisionAreaData,
    pendingAreaData,
    pan,
    selection,
    polygonDrawing,
    rectDrawing,
    collisionRectDrawing,
  });

  // All old handler functions removed - now using handler hooks above

  // Helper function for zoom to shape (used by sidebar)
  const handleZoomToShape = useCallback((shape: Shape) => {
    if (!mainRef.current) return;

    const newViewport = calculateZoomToShape(
      shape,
      mainRef.current.offsetWidth,
      mainRef.current.offsetHeight,
      0.2 // 20% padding
    );

    setViewport(newViewport);
  }, [mainRef, setViewport]);

  // Handle grouping selected shapes
  const handleGroupShapes = useCallback((shapeIds: string[]) => {
    const shapesToGroup = shapes.filter(s => shapeIds.includes(s.id));
    if (shapesToGroup.length < 2) return;

    const groupedShapes = groupShapes(shapesToGroup);
    const updatedShapes = shapes.map(s =>
      groupedShapes.find(gs => gs.id === s.id) || s
    );

    setShapes(updatedShapes);
    markDirty();
    history.pushState('Group shapes');
    logger.info(`Grouped ${shapeIds.length} shapes`);
  }, [shapes, setShapes, markDirty, history]);

  // Handle ungrouping selected shapes
  const handleUngroupShapes = useCallback((shapeIds: string[]) => {
    const shapesToUngroup = shapes.filter(s => shapeIds.includes(s.id));
    if (shapesToUngroup.length === 0) return;

    const ungroupedShapes = ungroupShapes(shapesToUngroup);
    const updatedShapes = shapes.map(s =>
      ungroupedShapes.find(us => us.id === s.id) || s
    );

    setShapes(updatedShapes);
    markDirty();
    history.pushState('Ungroup shapes');
    logger.info(`Ungrouped ${shapeIds.length} shapes`);
  }, [shapes, setShapes, markDirty, history]);

  // Handle multi-select from layers panel
  const handleMultiSelect = useCallback((shapeIds: string[]) => {
    setSelectedIds(shapeIds);
    // Auto-switch to Properties tab when selecting items (unless in Settings tab)
    if (shapeIds.length > 0 && activeTab !== 'settings') {
      setActiveTab('properties');
    }
  }, [setSelectedIds, activeTab, setActiveTab]);

  // ===== UI STATE PREPARATION =====

  // Create toolbar state for UI components (EditorToolbar, EditorStatusBar)
  const toolbarState: import('./types/ui.types').ToolbarState = {
    tool: currentTool === 'polygon' ? 'draw-polygon' : currentTool as import('./types/ui.types').ToolbarTool,
    zoom: viewport.zoom * 100, // Convert to percentage
    mousePosition: { x: 0, y: 0 }, // TODO: Track actual mouse position
    saveStatus: 'saved', // TODO: Connect to actual save status
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    isPanning: isSpacebarPressed || currentTool === 'pan',
  };

  // Create UI grid config (convert opacity from 0-1 to 0-100)
  const uiGridConfig: import('./types/ui.types').GridConfig = {
    visible: gridConfig.visible,
    spacing: gridConfig.spacing,
    opacity: Math.round(gridConfig.opacity * 100), // Convert 0-1 to 0-100
    pattern: 'pattern-32px', // Default pattern for UI
    snapToGrid: gridConfig.snapToGrid ?? false,
  };

  // ===== HANDLERS =====

  // Handle tool change from toolbar
  const handleToolChange = useCallback((tool: import('./types/ui.types').ToolbarTool) => {
    // Map toolbar tool to Konva tool
    const konvaTool: KonvaEditorTool = tool === 'draw-polygon' ? 'polygon' : tool as KonvaEditorTool;
    toolbarHandlers.handleToolChange(konvaTool);
  }, [toolbarHandlers]);

  // Handle asset placement from AssetsTab
  const handlePlaceAsset = useCallback((fileData: string, fileName: string, width: number, height: number) => {
    placeAsset({
      fileData,
      fileName,
      width,
      height,
      viewport,
      viewportWidth,
      viewportHeight,
      onShapeCreated: (shape) => {
        // Add to local shapes state
        setShapes(prev => [...prev, shape]);

        // Save to map data store if it's an asset
        if (shape.category === 'asset') {
          const asset = shapeToAsset(shape);
          addAsset(asset);
          markDirty();
        }
      },
      onSelectShape: selection.selectShape,
      onZoomToShape: handleZoomToShape,
      onMarkDirty: markDirty,
    });
  }, [viewport, viewportWidth, viewportHeight, setShapes, selection.selectShape, handleZoomToShape, markDirty, addAsset]);

  // Handle grid config change from SettingsTab
  const handleGridConfigChange = useCallback((newConfig: Partial<import('./types/ui.types').GridConfig>) => {
    // Convert UI grid config (0-100 opacity) to Konva grid config (0-1 opacity)
    const updates: Partial<typeof gridConfig> = {};

    if (newConfig.visible !== undefined) updates.visible = newConfig.visible;
    if (newConfig.spacing !== undefined) updates.spacing = newConfig.spacing;
    if (newConfig.opacity !== undefined) updates.opacity = newConfig.opacity / 100; // Convert 0-100 to 0-1
    if (newConfig.snapToGrid !== undefined) updates.snapToGrid = newConfig.snapToGrid;

    setGridConfig({ ...gridConfig, ...updates });
  }, [gridConfig, setGridConfig]);

  // ===== RENDER =====

  return (
    <div className={`map-editor-module ${className}`}>
      {/* Toolbar */}
      <header className="editor-header">
        <EditorToolbar
          toolbarState={toolbarState}
          gridConfig={uiGridConfig}
          previewMode={previewMode.isPreviewMode}
          zoom={Math.round(viewport.zoom * 100)}
          onToolChange={handleToolChange}
          onZoomIn={toolbarHandlers.handleZoomIn}
          onZoomOut={toolbarHandlers.handleZoomOut}
          onFitToScreen={toolbarHandlers.handleFitToScreen}
          onResetZoom={toolbarHandlers.handleZoomReset}
          onToggleGrid={toolbarHandlers.handleToggleGrid}
          onToggleSnapToGrid={toolbarHandlers.handleToggleSnapToGrid}
          onUndo={toolbarHandlers.handleUndo}
          onRedo={toolbarHandlers.handleRedo}
          onTogglePreview={previewMode.togglePreview}
        />
      </header>

      {/* Main Layout */}
      <div className="editor-layout">
        {/* Layers Panel */}
        <KonvaLayersPanel
          shapes={shapes}
          selectedIds={selectedIds}
          viewport={viewport}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          impassableAreas={impassableAreas}
          onShapeSelect={layersHandlers.handleShapeSelect}
          onShapeVisibilityToggle={layersHandlers.handleShapeVisibilityToggle}
          onShapeDelete={layersHandlers.handleShapeDelete}
          onZoomToShape={handleZoomToShape}
          onEditInteractiveArea={(areaId) => {
            const area = areas.find(a => a.id === areaId);
            if (area) {
              areaHandlers.interactive.handleEditArea(area);
            }
          }}
          onEditCollisionArea={(areaId) => {
            const area = impassableAreas.find(a => a.id === areaId);
            if (area) {
              areaHandlers.collision.handleEditCollisionArea(area);
            }
          }}
          onGroupShapes={handleGroupShapes}
          onUngroupShapes={handleUngroupShapes}
          onMultiSelect={handleMultiSelect}
        />

        {/* Canvas Container */}
        <EditorCanvas
          mainRef={mainRef}
          stageRef={stageRef}
          layerRefs={layerRefs}
          viewport={viewport}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          cursorStyle={cursorStyle}
          gridConfig={gridConfig}
          currentTool={currentTool}
          shapes={shapes}
          selectedIds={selectedIds}
          drawingMode={drawingMode}
          collisionDrawingMode={collisionDrawingMode}
          background={background}
          grid={grid}
          zoom={zoom}
          selection={selection}
          transform={transform}
          polygonDrawing={polygonDrawing}
          rectDrawing={rectDrawing}
          collisionRectDrawing={collisionRectDrawing}
          vertexEdit={vertexEdit}
          onStageClick={stageEventHandlers.handleStageClick}
          onStageMouseDown={stageEventHandlers.handleStageMouseDown}
          onStageMouseMove={stageEventHandlers.handleStageMouseMove}
          onStageMouseUp={stageEventHandlers.handleStageMouseUp}
          onStageDoubleClick={stageEventHandlers.handleStageDoubleClick}
          isPreviewMode={previewMode.isPreviewMode}
        />

        {/* Right Sidebar (Properties/Assets/Settings) */}
        <EditorSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedIds={selectedIds}
          shapes={shapes}
          areas={areas}
          impassableAreas={impassableAreas}
          onEditArea={areaHandlers.interactive.handleEditArea}
          onDeleteArea={areaHandlers.interactive.handleDeleteArea}
          onEditCollisionArea={areaHandlers.collision.handleEditCollisionArea}
          onDeleteCollisionArea={areaHandlers.collision.handleDeleteCollisionArea}
          onUpdateArea={areaHandlers.interactive.handleUpdateArea}
          onPlaceAsset={handlePlaceAsset}
          gridConfig={uiGridConfig}
          onGridConfigChange={handleGridConfigChange}
          previewMode={previewMode.isPreviewMode}
          onPreviewModeChange={previewMode.togglePreview}
        />
      </div>

      {/* Status Bar */}
      <EditorStatusBar
        toolbarState={toolbarState}
        areasCount={areas.length}
        collisionAreasCount={impassableAreas.length}
      />

      {/* Modals */}
      <EditorModals
        showAreaModal={showAreaModal}
        editingArea={editingArea}
        onAreaFormSubmit={areaHandlers.interactive.handleAreaFormSubmit}
        onAreaFormCancel={areaHandlers.interactive.handleAreaFormCancel}
        showCollisionAreaModal={showCollisionAreaModal}
        editingCollisionArea={editingCollisionArea}
        onCollisionAreaFormSubmit={areaHandlers.collision.handleCollisionAreaFormSubmit}
        onCollisionAreaFormCancel={areaHandlers.collision.handleCollisionAreaFormCancel}
        showDeleteConfirm={showDeleteConfirm}
        areaToDelete={areaToDelete}
        onConfirmDeleteArea={areaHandlers.interactive.handleConfirmDeleteArea}
        onCancelDeleteArea={() => {
          setShowDeleteConfirm(false);
          setAreaToDelete(null);
        }}
        showCollisionDeleteConfirm={showCollisionDeleteConfirm}
        collisionAreaToDelete={collisionAreaToDelete}
        onConfirmDeleteCollisionArea={areaHandlers.collision.handleConfirmDeleteCollisionArea}
        onCancelDeleteCollisionArea={() => {
          setShowCollisionDeleteConfirm(false);
          setCollisionAreaToDelete(null);
        }}
        showKeyboardDeleteConfirm={showKeyboardDeleteConfirm}
        shapesToDelete={shapesToDelete}
        onConfirmKeyboardDelete={areaHandlers.handleConfirmKeyboardDelete}
        onCancelKeyboardDelete={areaHandlers.handleCancelKeyboardDelete}
      />
    </div>
  );
};

