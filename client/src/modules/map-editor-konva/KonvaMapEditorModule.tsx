/**
 * Konva Map Editor Module
 * 
 * Main wrapper component for the Konva-based map editor.
 * Integrates all Konva hooks with existing UI components (Toolbar, StatusBar, LayersPanel, Tabs).
 * 
 * This component mirrors the structure of MapEditorModule.tsx but uses Konva instead of Fabric.js.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Layer, Line, Image as KonvaImage } from 'react-konva';
import { logger } from '../../shared/logger';
import { Eye, Square, Shield } from 'lucide-react';
import { useMapData, InteractiveArea } from '../../shared/MapDataContext';
import { useMapStore } from '../../stores/useMapStore';
import { useMapStoreInit } from '../../stores/useMapStoreInit';
import { useWorldDimensions } from '../../shared/useWorldDimensions';
import { AreaFormModal } from '../../components/AreaFormModal';
import { CollisionAreaFormModal } from '../../components/CollisionAreaFormModal';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { EditorToolbar } from '../map-editor/components/EditorToolbar';
import { EditorStatusBar } from '../map-editor/components/EditorStatusBar';
import { AreasTab } from '../map-editor/components/tabs/AreasTab';
import { TerrainTab } from '../map-editor/components/tabs/TerrainTab';
import { AssetsTab } from '../map-editor/components/tabs/AssetsTab';
import { CollisionTab } from '../map-editor/components/tabs/CollisionTab';
import { SettingsTab } from '../map-editor/components/tabs/SettingsTab';

// Import CSS
import '../map-editor/MapEditorModule.css';

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

// Import Konva components
import { PolygonDrawingPreview } from './components/PolygonDrawingPreview';
import { RectangleDrawingPreview } from './components/RectangleDrawingPreview';
import { TransformablePolygon, TransformableRect, TransformerComponent } from './components/TransformableShape';

// Import types
import type { Shape, EditorState, Viewport, GridConfig } from './types';
import type { EditorTool as KonvaEditorTool } from './types';
import type { EditorTool as FabricEditorTool } from '../map-editor/types/editor.types';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS } from './constants/konvaConstants';

// Import utilities
import { mapDataToShapes, shapesToMapData } from './utils/mapDataAdapter';

// Import shared types
import type { TabId } from '../map-editor/types/editor.types';
import { EDITOR_TABS } from '../map-editor/constants/editorConstants';

import '../map-editor/MapEditorModule.css';

// ============================================================================
// TYPE ADAPTERS
// ============================================================================

/**
 * Convert Fabric.js EditorTool to Konva EditorTool
 */
function fabricToKonvaTool(tool: FabricEditorTool): KonvaEditorTool {
  switch (tool) {
    case 'draw-polygon':
      return 'polygon';
    default:
      return tool as KonvaEditorTool;
  }
}

/**
 * Convert Konva EditorTool to Fabric.js EditorTool
 */
function konvaToFabricTool(tool: KonvaEditorTool): FabricEditorTool {
  switch (tool) {
    case 'polygon':
      return 'draw-polygon';
    case 'rect':
    case 'edit-vertex':
    case 'delete':
      return 'select'; // Map unsupported tools to select
    default:
      return tool as FabricEditorTool;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface KonvaMapEditorModuleProps {
  className?: string;
}

export const KonvaMapEditorModule: React.FC<KonvaMapEditorModuleProps> = ({
  className = ''
}) => {
  const { mapData } = useMapData();
  
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
    markDirty
  } = useMapStore();

  // ===== STATE =====
  const [activeTab, setActiveTab] = useState<TabId>('areas');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [gridConfig, setGridConfig] = useState<GridConfig>(GRID_DEFAULTS);
  const [currentTool, setCurrentTool] = useState<KonvaEditorTool>('select');
  
  // Modal state
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<InteractiveArea | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<InteractiveArea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [showCollisionAreaModal, setShowCollisionAreaModal] = useState(false);
  const [editingCollisionArea, setEditingCollisionArea] = useState<any | null>(null);
  const [collisionAreaToDelete, setCollisionAreaToDelete] = useState<any | null>(null);
  const [showCollisionDeleteConfirm, setShowCollisionDeleteConfirm] = useState(false);
  
  // Drawing mode state
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingAreaData, setPendingAreaData] = useState<Partial<InteractiveArea> | null>(null);
  const [collisionDrawingMode, setCollisionDrawingMode] = useState(false);
  const [pendingCollisionAreaData, setPendingCollisionAreaData] = useState<any | null>(null);

  // Refs
  const stageRef = useRef<any>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

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

  // Setup viewport measurement effect
  useEffect(() => {
    function updateSize() {
      if (mainRef.current) {
        const width = mainRef.current.offsetWidth;
        const height = mainRef.current.offsetHeight;
        logger.info('Konva viewport dimensions updated', { width, height });
        setViewportWidth(width);
        setViewportHeight(height);
      } else {
        logger.warn('mainRef.current is null in updateSize');
      }
    }

    // Try immediate update
    updateSize();

    // Also try after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(updateSize, 100);

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeoutId);
    };
  }, []);

  // ===== KONVA HOOKS =====

  // Layer management
  const { layerRefs, refreshAllLayers } = useKonvaLayers();

  // Zoom controls
  const zoom = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
    enabled: true,
  });

  // Pan controls
  const pan = useKonvaPan({
    viewport,
    onViewportChange: setViewport,
    enabled: currentTool === 'pan',
  });

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

  // Polygon drawing
  const polygonDrawing = useKonvaPolygonDrawing({
    viewport,
    gridConfig,
    category: 'collision',
    enabled: currentTool === 'polygon' || collisionDrawingMode,
    onShapeCreate: (shape: Shape) => {
      // If we have pending collision area data, create the collision area
      if (pendingCollisionAreaData && shape.geometry.type === 'polygon') {
        const polygon = shape.geometry;
        const newCollisionArea = {
          id: shape.id,
          name: pendingCollisionAreaData.name || 'New Collision Area',
          type: 'impassable-polygon',
          color: pendingCollisionAreaData.color || '#ff0000',
          points: polygon.points.reduce((acc: any[], val: number, idx: number) => {
            if (idx % 2 === 0) {
              acc.push({ x: val, y: polygon.points[idx + 1] });
            }
            return acc;
          }, []),
        };
        addCollisionArea(newCollisionArea);
        setPendingCollisionAreaData(null);
        markDirty();
      }

      history.pushState('Draw polygon');
      setCurrentTool('select');
      setCollisionDrawingMode(false);
    },
    minVertices: 3,
  });

  // Rectangle drawing
  const rectDrawing = useKonvaRectDrawing({
    viewport,
    gridConfig,
    category: 'interactive',
    enabled: currentTool === 'rect' || drawingMode,
    onShapeCreate: (shape: Shape) => {
      // If we have pending area data, create the interactive area
      if (pendingAreaData && shape.geometry.type === 'rectangle') {
        const rect = shape.geometry;
        const newArea: InteractiveArea = {
          id: shape.id,
          name: pendingAreaData.name || 'New Area',
          description: pendingAreaData.description || '',
          type: pendingAreaData.type || 'custom',
          color: pendingAreaData.color || '#4A90E2',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
        addInteractiveArea(newArea);
        setPendingAreaData(null);
        markDirty();
      }

      history.pushState('Draw rectangle');
      setDrawingMode(false);
      setCurrentTool('select');
    },
    minSize: 10,
  });

  // Selection
  const selection = useKonvaSelection({
    shapes,
    onSelectionChange: setSelectedIds,
    enabled: currentTool === 'select' && !previewMode.isPreviewMode,
    viewport,
  });

  // Transformation
  const transform = useKonvaTransform({
    shapes,
    selectedIds,
    onShapeUpdate: (id: string, updates: Partial<Shape>) => {
      setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      history.pushState('Transform shape');
    },
    enabled: !previewMode.isPreviewMode,
  });

  // Persistence
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

  // Keyboard shortcuts
  const shortcuts = useKonvaKeyboardShortcuts({
    enabled: true,
    shortcuts: [
      {
        key: 'ctrl+z',
        description: 'Undo',
        handler: () => history.undo(),
      },
      {
        key: 'ctrl+y',
        description: 'Redo',
        handler: () => history.redo(),
      },
      {
        key: 'Delete',
        description: 'Delete selected shapes',
        handler: () => {
          setShapes(prev => prev.filter(s => !selectedIds.includes(s.id)));
          setSelectedIds([]);
          history.pushState('Delete shapes');
        },
      },
      {
        key: 'g',
        description: 'Toggle grid',
        handler: () => setGridConfig(prev => ({ ...prev, visible: !prev.visible })),
      },
    ],
  });

  // ===== SYNC SHAPES WITH MAP DATA =====
  useEffect(() => {
    // Convert MapData to Konva shapes
    const konvaShapes = mapDataToShapes(
      mapData.interactiveAreas || [],
      mapData.impassableAreas || []
    );
    setShapes(konvaShapes);
  }, [mapData.interactiveAreas, mapData.impassableAreas]);

  // ===== TOOLBAR HANDLERS =====
  const handleToolChange = useCallback((tool: FabricEditorTool) => {
    setCurrentTool(fabricToKonvaTool(tool));
  }, []);

  const handleZoomIn = useCallback(() => {
    zoom.zoomIn();
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    zoom.zoomOut();
  }, [zoom]);

  const handleZoomReset = useCallback(() => {
    zoom.resetZoom();
  }, [zoom]);

  const handleFitToScreen = useCallback(() => {
    // Calculate bounds of all shapes
    if (shapes.length === 0) {
      zoom.resetZoom();
      return;
    }

    const bounds = shapes.reduce((acc, shape) => {
      const geom = shape.geometry as any;
      if (geom.vertices) {
        // Polygon geometry
        geom.vertices.forEach((v: any) => {
          acc.minX = Math.min(acc.minX, v.x);
          acc.minY = Math.min(acc.minY, v.y);
          acc.maxX = Math.max(acc.maxX, v.x);
          acc.maxY = Math.max(acc.maxY, v.y);
        });
      } else if (geom.x !== undefined && geom.y !== undefined && geom.width !== undefined && geom.height !== undefined) {
        // Rectangle geometry
        acc.minX = Math.min(acc.minX, geom.x);
        acc.minY = Math.min(acc.minY, geom.y);
        acc.maxX = Math.max(acc.maxX, geom.x + geom.width);
        acc.maxY = Math.max(acc.maxY, geom.y + geom.height);
      }
      return acc;
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    zoom.zoomToFit(
      {
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      },
      viewportWidth,
      viewportHeight,
      50 // padding
    );
  }, [zoom, shapes, viewportWidth, viewportHeight]);

  const handleToggleGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, visible: !prev.visible }));
  }, []);

  // ===== UNIFIED EVENT HANDLERS =====
  // Route events to the appropriate hook based on current tool

  const handleStageClick = useCallback((e: any) => {
    if (currentTool === 'select') {
      selection.handleStageClick(e);
    } else if (currentTool === 'polygon') {
      polygonDrawing.handleClick(e);
    }
  }, [currentTool, selection, polygonDrawing]);

  const handleStageMouseDown = useCallback((e: any) => {
    if (currentTool === 'select') {
      selection.handleMouseDown(e);
    } else if (currentTool === 'pan') {
      pan.handleMouseDown(e);
    } else if (currentTool === 'rect') {
      rectDrawing.handleMouseDown(e);
    }
  }, [currentTool, selection, pan, rectDrawing]);

  const handleStageMouseMove = useCallback((e: any) => {
    if (currentTool === 'select') {
      selection.handleMouseMove(e);
    } else if (currentTool === 'pan') {
      pan.handleMouseMove(e);
    } else if (currentTool === 'polygon') {
      polygonDrawing.handleMouseMove(e);
    } else if (currentTool === 'rect') {
      rectDrawing.handleMouseMove(e);
    }
  }, [currentTool, selection, pan, polygonDrawing, rectDrawing]);

  const handleStageMouseUp = useCallback(() => {
    if (currentTool === 'select') {
      selection.handleMouseUp();
    } else if (currentTool === 'pan') {
      pan.handleMouseUp();
    } else if (currentTool === 'rect') {
      rectDrawing.handleMouseUp();
    }
  }, [currentTool, selection, pan, rectDrawing]);

  const handleStageDoubleClick = useCallback(() => {
    if (currentTool === 'polygon') {
      polygonDrawing.handleDoubleClick();
    }
  }, [currentTool, polygonDrawing]);

  const handleUndo = useCallback(() => {
    history.undo();
  }, [history]);

  const handleRedo = useCallback(() => {
    history.redo();
  }, [history]);

  const handleSave = useCallback(() => {
    persistence.save();
    logger.info('Map editor state saved');
  }, [persistence]);

  const handleLoad = useCallback(() => {
    persistence.load();
    logger.info('Map editor state loaded');
  }, [persistence]);

  // ===== AREA HANDLERS =====
  const handleCreateArea = useCallback(() => {
    setEditingArea(null);
    setShowAreaModal(true);
  }, []);

  const handleEditArea = useCallback((area: InteractiveArea) => {
    setEditingArea(area);
    setShowAreaModal(true);
  }, []);

  const handleDeleteArea = useCallback((area: InteractiveArea) => {
    setAreaToDelete(area);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDeleteArea = useCallback(() => {
    if (areaToDelete) {
      removeInteractiveArea(areaToDelete.id);
      markDirty();
      setAreaToDelete(null);
      setShowDeleteConfirm(false);
    }
  }, [areaToDelete, removeInteractiveArea, markDirty]);

  const handleAreaFormSubmit = useCallback((data: Partial<InteractiveArea>) => {
    if (editingArea) {
      // Update existing area
      updateInteractiveArea(editingArea.id, data);
      markDirty();
      setShowAreaModal(false);
      setEditingArea(null);
    } else {
      // For new areas, save the data and enter drawing mode
      setPendingAreaData(data);
      setShowAreaModal(false);
      setDrawingMode(true);
      setCurrentTool('rect');
    }
  }, [editingArea, updateInteractiveArea, markDirty]);

  // ===== COLLISION AREA HANDLERS =====
  const handleCreateCollisionArea = useCallback(() => {
    setEditingCollisionArea(null);
    setShowCollisionAreaModal(true);
  }, []);

  const handleEditCollisionArea = useCallback((area: any) => {
    setEditingCollisionArea(area);
    setShowCollisionAreaModal(true);
  }, []);

  const handleDeleteCollisionArea = useCallback((area: any) => {
    setCollisionAreaToDelete(area);
    setShowCollisionDeleteConfirm(true);
  }, []);

  const handleConfirmDeleteCollisionArea = useCallback(() => {
    if (collisionAreaToDelete) {
      removeCollisionArea(collisionAreaToDelete.id);
      markDirty();
      setCollisionAreaToDelete(null);
      setShowCollisionDeleteConfirm(false);
    }
  }, [collisionAreaToDelete, removeCollisionArea, markDirty]);

  const handleCollisionAreaFormSubmit = useCallback((data: any) => {
    if (editingCollisionArea) {
      // Update existing collision area
      updateCollisionArea(editingCollisionArea.id, data);
      markDirty();
      setShowCollisionAreaModal(false);
      setEditingCollisionArea(null);
    } else {
      // For new collision areas, save the data and enter drawing mode
      setPendingCollisionAreaData(data);
      setShowCollisionAreaModal(false);
      setCollisionDrawingMode(true);
      setCurrentTool('polygon');
    }
  }, [editingCollisionArea, updateCollisionArea, markDirty]);

  // ===== RENDER =====

  // Create Fabric.js-compatible EditorState for toolbar
  const fabricEditorState: import('../map-editor/types/editor.types').EditorState = {
    tool: konvaToFabricTool(currentTool),
    zoom: viewport.zoom * 100, // Convert to percentage
    mousePosition: { x: 0, y: 0 },
    saveStatus: 'saved',
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    isPanning: currentTool === 'pan',
  };

  // Create Fabric.js-compatible GridConfig for toolbar
  const fabricGridConfig: import('../map-editor/types/editor.types').GridConfig = {
    spacing: gridConfig.spacing,
    opacity: gridConfig.opacity,
    pattern: 'pattern-32px', // Default pattern
    visible: gridConfig.visible,
    snapToGrid: false, // TODO: Add snap to grid support
  };

  return (
    <div className={`map-editor-module ${className}`}>
      {/* Toolbar */}
      <header className="editor-header">
        <EditorToolbar
          editorState={fabricEditorState}
          gridConfig={fabricGridConfig}
          previewMode={previewMode.isPreviewMode}
          zoom={viewport.zoom}
          onToolChange={handleToolChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          onResetZoom={handleZoomReset}
          onToggleGrid={handleToggleGrid}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onTogglePreview={previewMode.togglePreview}
        />
      </header>

      {/* Main Layout */}
      <div className="editor-layout">
        {/* TODO: Add LayersPanel here when Konva version is implemented */}

        {/* Canvas Container */}
        <main ref={mainRef} className="editor-main" style={{ position: 'relative' }}>
          {viewportWidth > 0 && viewportHeight > 0 && (
            <Stage
              ref={stageRef}
              width={viewportWidth}
              height={viewportHeight}
              scaleX={viewport.zoom}
              scaleY={viewport.zoom}
              x={viewport.pan.x}
              y={viewport.pan.y}
              onClick={handleStageClick}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              onDblClick={handleStageDoubleClick}
              onWheel={zoom.handleWheel}
            >
            {/* Grid Layer */}
            <Layer ref={layerRefs.gridLayer}>
              {grid.shouldRenderGrid && grid.gridLines.map((line, index) => (
                <Line
                  key={`grid-line-${index}`}
                  points={line.points}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  opacity={line.opacity}
                  listening={line.listening}
                />
              ))}
            </Layer>

            {/* Background Layer */}
            <Layer ref={layerRefs.backgroundLayer}>
              {background.image && (
                <KonvaImage
                  image={background.image}
                  x={0}
                  y={0}
                  width={background.dimensions?.width}
                  height={background.dimensions?.height}
                  listening={false}
                />
              )}
            </Layer>

            {/* Shapes Layer */}
            <Layer ref={layerRefs.shapesLayer}>
              {shapes.map(shape => {
                const geom = shape.geometry as any;
                if (geom.vertices) {
                  // Polygon geometry
                  return (
                    <TransformablePolygon
                      key={shape.id}
                      shape={shape}
                      isSelected={selectedIds.includes(shape.id)}
                      onSelect={() => selection.selectShape(shape.id)}
                      onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                      onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                    />
                  );
                } else if (geom.x !== undefined && geom.y !== undefined && geom.width !== undefined && geom.height !== undefined) {
                  // Rectangle geometry
                  return (
                    <TransformableRect
                      key={shape.id}
                      shape={shape}
                      isSelected={selectedIds.includes(shape.id)}
                      onSelect={() => selection.selectShape(shape.id)}
                      onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                      onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                    />
                  );
                }
                return null;
              })}

              {/* Drawing Previews */}
              {polygonDrawing.isDrawing && (
                <PolygonDrawingPreview
                  vertices={polygonDrawing.vertices}
                  previewLines={polygonDrawing.previewLines}
                  isOriginHovered={polygonDrawing.isOriginHovered}
                  category="collision"
                />
              )}
              {rectDrawing.isDrawing && rectDrawing.previewRect && (
                <RectangleDrawingPreview
                  rect={rectDrawing.previewRect}
                  category="interactive"
                />
              )}
            </Layer>

            {/* Selection Layer */}
            <Layer ref={layerRefs.selectionLayer}>
              <TransformerComponent selectedShapeIds={selectedIds} />
            </Layer>

            {/* UI Layer */}
            <Layer ref={layerRefs.uiLayer} />
          </Stage>
        )}

          {/* Preview Mode Overlay */}
          {previewMode.isPreviewMode && (
            <div className="preview-mode-overlay">
              <Eye size={24} />
              <span>Preview Mode</span>
            </div>
          )}

          {/* Drawing Mode Overlay */}
          {drawingMode && (
            <div className="drawing-mode-overlay">
              <Square size={24} />
              <span>Drawing Interactive Area</span>
            </div>
          )}

          {collisionDrawingMode && (
            <div className="drawing-mode-overlay">
              <Shield size={24} />
              <span>Drawing Collision Area</span>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="editor-sidebar">
          <div className="editor-panel-tabs">
            {EDITOR_TABS.map(tab => (
              <button
                key={tab.id}
                className={`editor-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <span className="tab-icon">
                  {tab.icon === 'eye' && <Eye size={18} />}
                  {tab.icon === 'square' && <Square size={18} />}
                  {tab.icon === 'shield' && <Shield size={18} />}
                  {tab.icon === 'image' && <Square size={18} />}
                  {tab.icon === 'settings' && <Square size={18} />}
                </span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-content">
            <div className="tab-content-container">
              {activeTab === 'areas' && (
                <AreasTab
                  areas={areas}
                  onCreateNewArea={handleCreateArea}
                  onEditArea={handleEditArea}
                  onDeleteArea={handleDeleteArea}
                />
              )}
              {activeTab === 'terrain' && <TerrainTab />}
              {activeTab === 'assets' && <AssetsTab />}
              {activeTab === 'collision' && (
                <CollisionTab
                  impassableAreas={impassableAreas}
                  onCreateNewCollisionArea={handleCreateCollisionArea}
                  onEditCollisionArea={handleEditCollisionArea}
                  onDeleteCollisionArea={handleDeleteCollisionArea}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsTab
                  gridConfig={fabricGridConfig}
                  onGridConfigChange={(newConfig) => {
                    // Convert Fabric.js GridConfig back to Konva GridConfig
                    setGridConfig({
                      visible: newConfig.visible ?? gridConfig.visible,
                      spacing: newConfig.spacing ?? gridConfig.spacing,
                      pattern: gridConfig.pattern, // Keep current pattern
                      color: gridConfig.color,
                      opacity: newConfig.opacity ?? gridConfig.opacity,
                    });
                  }}
                  previewMode={previewMode.isPreviewMode}
                  onPreviewModeChange={previewMode.togglePreview}
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Status Bar */}
      <EditorStatusBar
        editorState={fabricEditorState}
        areasCount={areas.length}
        collisionAreasCount={impassableAreas.length}
      />

      {/* Modals */}
      <AreaFormModal
        isOpen={showAreaModal}
        editingArea={editingArea}
        onSave={handleAreaFormSubmit}
        onClose={() => {
          setShowAreaModal(false);
          setEditingArea(null);
        }}
      />

      <CollisionAreaFormModal
        isOpen={showCollisionAreaModal}
        editingArea={editingCollisionArea}
        onSave={handleCollisionAreaFormSubmit}
        onClose={() => {
          setShowCollisionAreaModal(false);
          setEditingCollisionArea(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Interactive Area"
        message={`Are you sure you want to delete "${areaToDelete?.name}"?`}
        onConfirm={handleConfirmDeleteArea}
        onClose={() => {
          setShowDeleteConfirm(false);
          setAreaToDelete(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showCollisionDeleteConfirm}
        title="Delete Collision Area"
        message={`Are you sure you want to delete this collision area?`}
        onConfirm={handleConfirmDeleteCollisionArea}
        onClose={() => {
          setShowCollisionDeleteConfirm(false);
          setCollisionAreaToDelete(null);
        }}
      />
    </div>
  );
};

