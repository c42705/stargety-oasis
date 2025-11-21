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
import { useEditorState } from './hooks/useEditorState';
import { useToolbarHandlers } from './hooks/useToolbarHandlers';
import { useAreaHandlers } from './hooks/useAreaHandlers';
import { useLayersHandlers } from './hooks/useLayersHandlers';
import { useStageEventHandlers } from './hooks/useStageEventHandlers';

// Import Konva components
import { KonvaLayersPanel } from './components/KonvaLayersPanel';
import { TransformablePolygon, TransformableRect, TransformableImage, TransformerComponent } from './components/TransformableShape';
import { AnimatedGifImage } from './components/AnimatedGifImage';
import { PolygonDrawingPreview } from './components/PolygonDrawingPreview';
import { RectangleDrawingPreview } from './components/RectangleDrawingPreview';
import { SelectionRect } from './components/SelectionRect';
import { PolygonEditor } from './components/PolygonEditor';

// Import refactored components
import { EditorCanvas } from './components/EditorCanvas';
import { EditorSidebar } from './components/EditorSidebar';
import { EditorModals } from './components/EditorModals';

// Import types
import type { Shape, EditorState, Viewport, GridConfig } from './types';
import type { EditorTool as KonvaEditorTool } from './types';
import type { EditorTool as FabricEditorTool } from './types/editor.types';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS } from './constants/konvaConstants';

// Import utilities
import { mapDataToShapes, shapeToInteractiveArea, shapeToImpassableArea } from './utils/mapDataAdapter';
import { calculateZoomToShape } from './utils/zoomToShape';
import { duplicateShape, groupShapes, ungroupShapes, createImageShape } from './utils/shapeFactories';
import { screenToWorld } from './utils/coordinateTransform';

// Import shared types
import type { TabId } from './types/editor.types';
import { EDITOR_TABS } from './constants/editorConstants';

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
    markDirty,
    // saveMap is used by SaveStatusIndicator component
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    saveMap
  } = useMapStore();

  // ===== STATE (REFACTORED) =====
  // All state management extracted to useEditorState hook
  const {
    // Tab state
    activeTab,
    setActiveTab,
    // Shape state
    shapes,
    setShapes,
    selectedIds,
    setSelectedIds,
    // Viewport state
    viewport,
    setViewport,
    viewportWidth,
    viewportHeight,
    // Grid state
    gridConfig,
    setGridConfig,
    // Tool state
    currentTool,
    setCurrentTool,
    // Interaction state
    isSpacebarPressed,
    setIsSpacebarPressed,
    cursorStyle,
    setCursorStyle,
    // Modal states
    showAreaModal,
    setShowAreaModal,
    editingArea,
    setEditingArea,
    areaToDelete,
    setAreaToDelete,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showCollisionAreaModal,
    setShowCollisionAreaModal,
    editingCollisionArea,
    setEditingCollisionArea,
    collisionAreaToDelete,
    setCollisionAreaToDelete,
    showCollisionDeleteConfirm,
    setShowCollisionDeleteConfirm,
    showKeyboardDeleteConfirm,
    setShowKeyboardDeleteConfirm,
    shapesToDelete,
    setShapesToDelete,
    // Drawing mode states
    drawingMode,
    setDrawingMode,
    pendingAreaData,
    setPendingAreaData,
    collisionDrawingMode,
    setCollisionDrawingMode,
    pendingCollisionAreaData,
    setPendingCollisionAreaData,
    // Refs
    stageRef,
    mainRef,
  } = useEditorState();

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

  // Polygon drawing
  const polygonDrawing = useKonvaPolygonDrawing({
    viewport,
    gridConfig,
    category: 'collision',
    enabled: currentTool === 'polygon' || collisionDrawingMode,
    snapToGrid: grid.snapToGrid,
    onShapeCreate: (shape: Shape) => {
      console.log('[KonvaMapEditor] Polygon shape created:', shape);
      console.log('[KonvaMapEditor] Current state:', {
        pendingCollisionAreaData,
        collisionDrawingMode,
        currentTool
      });

      // Create collision area for polygon shapes
      if (shape.geometry.type === 'polygon') {
        const polygon = shape.geometry;

        // Convert flat points array to array of point objects
        const points: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < polygon.points.length; i += 2) {
          points.push({
            x: polygon.points[i],
            y: polygon.points[i + 1],
          });
        }

        // Calculate bounding box for AABB collision detection
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        // Auto-generate name if no pending data
        const defaultName = `Collision Layer ${impassableAreas.length + 1}`;

        const newCollisionArea = {
          id: shape.id,
          name: pendingCollisionAreaData?.name || defaultName,
          type: 'impassable-polygon' as const,
          color: pendingCollisionAreaData?.color || '#ff0000',
          points,
          // Bounding box required for AABB collision detection
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };

        logger.info('POLYGON_COLLISION_AREA_CREATED', {
          id: newCollisionArea.id,
          name: newCollisionArea.name,
          type: newCollisionArea.type,
          pointsCount: newCollisionArea.points.length,
          boundingBox: {
            x: newCollisionArea.x,
            y: newCollisionArea.y,
            width: newCollisionArea.width,
            height: newCollisionArea.height
          },
          allPoints: newCollisionArea.points
        });

        addCollisionArea(newCollisionArea);
        setPendingCollisionAreaData(null);
        markDirty();

        logger.info('POLYGON_COLLISION_AREA_ADDED_TO_MAP', { areaId: newCollisionArea.id });

        history.pushState('Draw polygon');
        setCurrentTool('select');
        setCollisionDrawingMode(false);
      }
    },
    minVertices: 3,
  });

  // Rectangle drawing for interactive areas
  const rectDrawing = useKonvaRectDrawing({
    viewport,
    gridConfig,
    category: 'interactive',
    enabled: currentTool === 'rect' || (drawingMode && !collisionDrawingMode),
    snapToGrid: grid.snapToGrid,
    onShapeCreate: (shape: Shape) => {
      logger.info('RECT_DRAWING_SHAPE_CREATED', {
        shapeId: shape.id,
        geometry: shape.geometry,
        hasPendingAreaData: !!pendingAreaData,
        pendingAreaData
      });

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

        logger.info('AREA_CREATING_INTERACTIVE_AREA', { newArea });
        addInteractiveArea(newArea);
        setPendingAreaData(null);
        markDirty();
        logger.info('AREA_CREATED_SUCCESSFULLY', { areaId: newArea.id, areaName: newArea.name });
      } else {
        logger.error('AREA_CREATE_FAILED', {
          reason: !pendingAreaData ? 'No pending area data' : 'Shape geometry is not rectangle',
          shapeGeometryType: shape.geometry.type,
          hasPendingAreaData: !!pendingAreaData
        });
      }

      history.pushState('Draw rectangle');
      setDrawingMode(false);
      setCurrentTool('select');
      logger.info('RECT_DRAWING_COMPLETE', { drawingMode: false, currentTool: 'select' });
    },
    minSize: 10,
  });

  // Rectangle drawing for collision areas
  const collisionRectDrawing = useKonvaRectDrawing({
    viewport,
    gridConfig,
    category: 'collision',
    enabled: collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle',
    snapToGrid: grid.snapToGrid,
    onShapeCreate: (shape: Shape) => {
      // If we have pending collision area data, create the collision area
      if (pendingCollisionAreaData && shape.geometry.type === 'rectangle') {
        const rect = shape.geometry;
        const defaultName = `Collision Layer ${impassableAreas.length + 1}`;
        const newCollisionArea = {
          id: shape.id,
          name: pendingCollisionAreaData.name || defaultName,
          type: 'rectangle',
          color: pendingCollisionAreaData.color || '#ff0000',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
        addCollisionArea(newCollisionArea);
        setPendingCollisionAreaData(null);
        markDirty();
      }

      history.pushState('Draw collision rectangle');
      setCollisionDrawingMode(false);
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

  // Keyboard shortcuts
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          // Show confirmation dialog before deleting
          if (selectedIds.length > 0) {
            setShapesToDelete(selectedIds);
            setShowKeyboardDeleteConfirm(true);
          }
        },
      },
      {
        key: 'Backspace',
        description: 'Delete selected shapes (alternative)',
        handler: () => {
          // Show confirmation dialog before deleting
          if (selectedIds.length > 0) {
            setShapesToDelete(selectedIds);
            setShowKeyboardDeleteConfirm(true);
          }
        },
      },
      {
        key: 'ctrl+d',
        description: 'Duplicate selected shapes',
        handler: () => {
          if (selectedIds.length === 0) return;

          const newShapes: Shape[] = [];
          const newIds: string[] = [];

          selectedIds.forEach((id) => {
            const shape = shapes.find((s) => s.id === id);
            if (shape) {
              const duplicated = duplicateShape(shape, { x: 20, y: 20 });
              newShapes.push(duplicated);
              newIds.push(duplicated.id);

              // Sync to map data store
              if (duplicated.category === 'interactive') {
                const interactiveArea = shapeToInteractiveArea(duplicated);
                addInteractiveArea(interactiveArea);
              } else if (duplicated.category === 'collision') {
                const collisionArea = shapeToImpassableArea(duplicated);
                addCollisionArea(collisionArea);
              }
            }
          });

          setShapes(prev => [...prev, ...newShapes]);
          setSelectedIds(newIds);
          markDirty();
          history.pushState('Duplicate shapes');
        },
      },
      {
        key: 'ctrl+g',
        description: 'Group selected shapes',
        handler: (e) => {
          e?.preventDefault(); // Prevent browser default
          if (selectedIds.length < 2) return; // Need at least 2 shapes to group

          const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
          const grouped = groupShapes(selectedShapes);

          setShapes(prev => prev.map(shape => {
            const groupedShape = grouped.find(g => g.id === shape.id);
            return groupedShape || shape;
          }));

          markDirty();
          history.pushState('Group shapes');
        },
      },
      {
        key: 'ctrl+shift+g',
        description: 'Ungroup selected shapes',
        handler: (e) => {
          e?.preventDefault(); // Prevent browser default
          if (selectedIds.length === 0) return;

          const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
          const ungrouped = ungroupShapes(selectedShapes);

          setShapes(prev => prev.map(shape => {
            const ungroupedShape = ungrouped.find(u => u.id === shape.id);
            return ungroupedShape || shape;
          }));

          markDirty();
          history.pushState('Ungroup shapes');
        },
      },
      {
        key: 'g',
        description: 'Toggle grid',
        handler: () => setGridConfig(prev => ({ ...prev, visible: !prev.visible })),
      },
      {
        key: 'v',
        description: 'Enter vertex edit mode (for selected polygon)',
        handler: () => {
          // Only allow vertex edit if a single polygon is selected
          if (selectedIds.length === 1) {
            const shape = shapes.find(s => s.id === selectedIds[0]);
            if (shape && shape.geometry.type === 'polygon') {
              setCurrentTool('edit-vertex');
            }
          }
        },
      },
      {
        key: 'Escape',
        description: 'Exit vertex edit mode / Clear selection',
        handler: () => {
          if (currentTool === 'edit-vertex') {
            setCurrentTool('select');
          } else {
            setSelectedIds([]);
          }
        },
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
    shapes,
    areas,
    impassableAreas,
    mainRef,
    markDirty,
    history,
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

  // ===== RENDER =====

  // Create EditorState for toolbar (Fabric.js compatibility layer)
  // When spacebar is pressed, show 'pan' tool in the status bar
  const effectiveTool = isSpacebarPressed ? 'pan' : currentTool;

  // Map Konva tool to Fabric tool for legacy components
  const mapKonvaToFabricTool = (tool: typeof currentTool): import('./types/editor.types').EditorTool => {
    switch (tool) {
      case 'polygon':
        return 'draw-polygon';
      case 'rect':
      case 'edit-vertex':
      case 'delete':
        return 'select'; // Map unsupported tools to select
      default:
        return tool as import('./types/editor.types').EditorTool;
    }
  };

  const fabricEditorState: import('./types/editor.types').EditorState = {
    tool: mapKonvaToFabricTool(effectiveTool),
    zoom: viewport.zoom * 100, // Convert to percentage
    mousePosition: { x: 0, y: 0 },
    saveStatus: 'saved',
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    isPanning: currentTool === 'pan',
  };

  // Create GridConfig for toolbar
  const fabricGridConfig: import('./types/editor.types').GridConfig = {
    spacing: gridConfig.spacing,
    opacity: gridConfig.opacity,
    pattern: 'pattern-32px', // Default pattern
    visible: gridConfig.visible,
    snapToGrid: gridConfig.snapToGrid || false,
  };

  // ===== HANDLERS =====

  // Wrapper for tool change to convert Fabric tool to Konva tool
  const handleToolChangeWrapper = useCallback((fabricTool: import('./types/editor.types').EditorTool) => {
    // Map Fabric tool to Konva tool
    const konvaTool: KonvaEditorTool = fabricTool === 'draw-polygon' ? 'polygon' : fabricTool as KonvaEditorTool;
    toolbarHandlers.handleToolChange(konvaTool);
  }, [toolbarHandlers]);

  // Handle asset placement from AssetsTab
  const handlePlaceAsset = useCallback((fileData: string, fileName: string, width: number, height: number) => {
    logger.info('PLACE ASSET CALLED', {
      fileName,
      dimensions: { width, height },
      viewport: {
        pan: viewport.pan,
        zoom: viewport.zoom,
        viewportSize: { width: viewportWidth, height: viewportHeight }
      }
    });

    // Calculate center of viewport in screen coordinates
    const screenCenter = {
      x: viewportWidth / 2,
      y: viewportHeight / 2
    };

    // Convert screen coordinates to world coordinates
    const worldCenter = screenToWorld(screenCenter.x, screenCenter.y, viewport);

    // Create image shape at viewport center
    const imageShape = createImageShape({
      x: worldCenter.x - width / 2,
      y: worldCenter.y - height / 2,
      width,
      height,
      imageData: fileData,
      fileName,
    });

    // Add shape to map
    setShapes(prev => [...prev, imageShape]);

    // Select the new shape
    selection.selectShape(imageShape.id);

    // Zoom to the placed asset
    handleZoomToShape(imageShape);

    // Mark as dirty
    markDirty();

    logger.info('ASSET PLACED ON MAP', {
      id: imageShape.id,
      fileName,
      position: { x: imageShape.geometry.x, y: imageShape.geometry.y },
      dimensions: { width, height }
    });
  }, [viewport, viewportWidth, viewportHeight, setShapes, selection, handleZoomToShape, markDirty]);

  // Handle grid config change from SettingsTab (Fabric.js format)
  const handleGridConfigChange = useCallback((newConfig: Partial<import('./types/editor.types').GridConfig>) => {
    // Convert Fabric.js GridConfig back to Konva GridConfig
    setGridConfig({
      visible: newConfig.visible ?? gridConfig.visible,
      spacing: newConfig.spacing ?? gridConfig.spacing,
      pattern: gridConfig.pattern, // Keep current pattern
      color: gridConfig.color,
      opacity: newConfig.opacity ?? gridConfig.opacity,
    });
  }, [gridConfig, setGridConfig]);

  // ===== RENDER =====

  return (
    <div className={`map-editor-module ${className}`}>
      {/* Toolbar */}
      <header className="editor-header">
        <EditorToolbar
          editorState={fabricEditorState}
          gridConfig={fabricGridConfig}
          previewMode={previewMode.isPreviewMode}
          zoom={Math.round(viewport.zoom * 100)}
          onToolChange={handleToolChangeWrapper}
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
        />

        {/* Canvas Container */}
        <main ref={mainRef} className="editor-main" style={{ position: 'relative', cursor: cursorStyle }}>
          {viewportWidth > 0 && viewportHeight > 0 && (
            <Stage
              ref={stageRef}
              width={viewportWidth}
              height={viewportHeight}
              scaleX={viewport.zoom}
              scaleY={viewport.zoom}
              x={viewport.pan.x}
              y={viewport.pan.y}
              onClick={stageEventHandlers.handleStageClick}
              onMouseDown={stageEventHandlers.handleStageMouseDown}
              onMouseMove={stageEventHandlers.handleStageMouseMove}
              onMouseUp={stageEventHandlers.handleStageMouseUp}
              onDblClick={stageEventHandlers.handleStageDoubleClick}
              onWheel={zoom.handleWheel}
            >
            {/* Background Layer - Render first (bottom) */}
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

            {/* Grid Layer - Render on top of background */}
            <Layer ref={layerRefs.gridLayer}>
              {(() => {
                // Debug logging for grid rendering
                if (grid.shouldRenderGrid && grid.gridLines.length > 0) {
                  logger.debug('GRID_RENDERING', {
                    gridLinesCount: grid.gridLines.length,
                    gridConfig: gridConfig,
                    firstLine: grid.gridLines[0],
                    viewport: viewport
                  });
                } else if (!grid.shouldRenderGrid) {
                  logger.debug('GRID_NOT_RENDERING', {
                    shouldRenderGrid: grid.shouldRenderGrid,
                    gridVisible: gridConfig.visible,
                    zoom: viewport.zoom
                  });
                }
                return null;
              })()}
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

            {/* Shapes Layer */}
            <Layer ref={layerRefs.shapesLayer}>
              {shapes.map(shape => {
                const geom = shape.geometry;

                // Debug logging for image shapes
                if (geom.type === 'image') {
                  console.log('[KonvaMapEditor] Rendering image shape:', {
                    id: shape.id,
                    fileName: geom.fileName,
                    position: { x: geom.x, y: geom.y },
                    size: { width: geom.width, height: geom.height },
                    isSelected: selectedIds.includes(shape.id)
                  });
                }

                if (geom.type === 'polygon') {
                  // Polygon geometry
                  return (
                    <TransformablePolygon
                      key={shape.id}
                      shape={shape}
                      isSelected={selectedIds.includes(shape.id)}
                      onSelect={(e) => selection.handleShapeClick(shape.id, e)}
                      onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                      onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                    />
                  );
                } else if (geom.type === 'rectangle') {
                  // Rectangle geometry
                  return (
                    <TransformableRect
                      key={shape.id}
                      shape={shape}
                      isSelected={selectedIds.includes(shape.id)}
                      onSelect={(e) => selection.handleShapeClick(shape.id, e)}
                      onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                      onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                    />
                  );
                } else if (geom.type === 'image') {
                  // Image geometry - detect if it's a GIF
                  const isGif = geom.imageData?.startsWith('data:image/gif');

                  if (isGif) {
                    // Render animated GIF
                    return (
                      <AnimatedGifImage
                        key={shape.id}
                        shape={shape}
                        isSelected={selectedIds.includes(shape.id)}
                        onSelect={() => selection.selectShape(shape.id)}
                        onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                        onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                      />
                    );
                  } else {
                    // Render static image
                    return (
                      <TransformableImage
                        key={shape.id}
                        shape={shape}
                        isSelected={selectedIds.includes(shape.id)}
                        onSelect={(e) => selection.handleShapeClick(shape.id, e)}
                        onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                        onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                      />
                    );
                  }
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
              {collisionRectDrawing.isDrawing && collisionRectDrawing.previewRect && (
                <RectangleDrawingPreview
                  rect={collisionRectDrawing.previewRect}
                  category="collision"
                />
              )}
            </Layer>

            {/* Selection Layer */}
            <Layer ref={layerRefs.selectionLayer}>
              {/* Show transformer only when not in vertex edit mode */}
              {currentTool !== 'edit-vertex' && (
                <TransformerComponent selectedShapeIds={selectedIds} />
              )}
              {selection.selectionRect && (
                <SelectionRect rect={selection.selectionRect} />
              )}
              {/* Vertex editing UI */}
              {vertexEdit.isEditing && (
                <PolygonEditor
                  vertexHandles={vertexEdit.vertexHandles}
                  edgeHandles={vertexEdit.edgeHandles}
                  draggingVertexIndex={vertexEdit.editState.draggingVertexIndex}
                  hoveringHandleIndex={vertexEdit.editState.hoveringHandleIndex}
                  onVertexDragStart={vertexEdit.handleVertexDragStart}
                  onVertexDragMove={vertexEdit.handleVertexDragMove}
                  onVertexDragEnd={vertexEdit.handleVertexDragEnd}
                  onEdgeClick={vertexEdit.handleEdgeClick}
                  onVertexDelete={vertexEdit.handleVertexDelete}
                  onVertexHover={vertexEdit.handleVertexHover}
                />
              )}
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
        <EditorSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          areas={areas}
          onCreateNewArea={areaHandlers.interactive.handleCreateArea}
          onEditArea={areaHandlers.interactive.handleEditArea}
          onDeleteArea={areaHandlers.interactive.handleDeleteArea}
          onPlaceAsset={handlePlaceAsset}
          impassableAreas={impassableAreas}
          onCreateNewCollisionArea={areaHandlers.collision.handleCreateCollisionArea}
          onEditCollisionArea={areaHandlers.collision.handleEditCollisionArea}
          onDeleteCollisionArea={areaHandlers.collision.handleDeleteCollisionArea}
          gridConfig={fabricGridConfig}
          onGridConfigChange={handleGridConfigChange}
          previewMode={previewMode.isPreviewMode}
          onPreviewModeChange={previewMode.togglePreview}
        />
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
        onSave={areaHandlers.interactive.handleAreaFormSubmit}
        onClose={areaHandlers.interactive.handleAreaFormCancel}
      />

      <CollisionAreaFormModal
        isOpen={showCollisionAreaModal}
        editingArea={editingCollisionArea}
        onSave={areaHandlers.collision.handleCollisionAreaFormSubmit}
        onClose={areaHandlers.collision.handleCollisionAreaFormCancel}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Interactive Area"
        message={`Are you sure you want to delete "${areaToDelete?.name}"?`}
        onConfirm={areaHandlers.interactive.handleConfirmDeleteArea}
        onClose={() => {
          setShowDeleteConfirm(false);
          setAreaToDelete(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showCollisionDeleteConfirm}
        title="Delete Collision Area"
        message={`Are you sure you want to delete this collision area?`}
        onConfirm={areaHandlers.collision.handleConfirmDeleteCollisionArea}
        onClose={() => {
          setShowCollisionDeleteConfirm(false);
          setCollisionAreaToDelete(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showKeyboardDeleteConfirm}
        title="Delete Selected Shapes"
        message={`Are you sure you want to delete ${shapesToDelete.length} selected shape${shapesToDelete.length > 1 ? 's' : ''}?`}
        confirmText="Delete"
        type="danger"
        onConfirm={areaHandlers.handleConfirmKeyboardDelete}
        onClose={areaHandlers.handleCancelKeyboardDelete}
      />
    </div>
  );
};

