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
import { AreasTab } from './components/tabs/AreasTab';
import { TerrainTab } from './components/tabs/TerrainTab';
import { AssetsTab } from './components/tabs/AssetsTab';
import { CollisionTab } from './components/tabs/CollisionTab';
import { JitsiTab } from './components/tabs/JitsiTab';
import { SettingsTab } from './components/tabs/SettingsTab';
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

// Import Konva components
import { PolygonDrawingPreview } from './components/PolygonDrawingPreview';
import { RectangleDrawingPreview } from './components/RectangleDrawingPreview';
import { TransformablePolygon, TransformableRect, TransformableImage, TransformerComponent } from './components/TransformableShape';
import { KonvaLayersPanel } from './components/KonvaLayersPanel';
import { SelectionRect } from './components/SelectionRect';
import { PolygonEditor } from './components/PolygonEditor';

// Import types
import type { Shape, EditorState, Viewport, GridConfig } from './types';
import type { EditorTool as KonvaEditorTool } from './types';
import type { EditorTool as FabricEditorTool } from './types/editor.types';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS } from './constants/konvaConstants';

// Import utilities
import { mapDataToShapes, shapeToInteractiveArea, shapeToImpassableArea } from './utils/mapDataAdapter';
import { calculateZoomToShape } from './utils/zoomToShape';
import { duplicateShape, groupShapes, ungroupShapes, createImageShape } from './utils/shapeFactories';

// Import shared types
import type { TabId } from './types/editor.types';
import { EDITOR_TABS } from './constants/editorConstants';

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
    markDirty,
    // saveMap is used by SaveStatusIndicator component
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    saveMap
  } = useMapStore();

  // ===== STATE =====
  const [activeTab, setActiveTab] = useState<TabId>('areas');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [gridConfig, setGridConfig] = useState<GridConfig>(GRID_DEFAULTS);
  const [currentTool, setCurrentTool] = useState<KonvaEditorTool>('select');
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>('default');
  
  // Modal state
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<InteractiveArea | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<InteractiveArea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showCollisionAreaModal, setShowCollisionAreaModal] = useState(false);
  const [editingCollisionArea, setEditingCollisionArea] = useState<any | null>(null);
  const [collisionAreaToDelete, setCollisionAreaToDelete] = useState<any | null>(null);
  const [showCollisionDeleteConfirm, setShowCollisionDeleteConfirm] = useState(false);

  // Keyboard delete confirmation state
  const [showKeyboardDeleteConfirm, setShowKeyboardDeleteConfirm] = useState(false);
  const [shapesToDelete, setShapesToDelete] = useState<string[]>([]);
  
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

        console.log('[KonvaMapEditor] Adding collision area:', newCollisionArea);
        addCollisionArea(newCollisionArea);
        setPendingCollisionAreaData(null);
        markDirty();

        console.log('[KonvaMapEditor] Collision area added, shapes will be synced via useEffect');
      } else {
        console.log('[KonvaMapEditor] No pending collision area data, polygon not saved');
      }

      history.pushState('Draw polygon');
      setCurrentTool('select');
      setCollisionDrawingMode(false);
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
        const newCollisionArea = {
          id: shape.id,
          name: pendingCollisionAreaData.name || 'New Collision Area',
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

  // Handle confirmed keyboard delete
  const handleConfirmKeyboardDelete = useCallback(() => {
    if (shapesToDelete.length > 0) {
      // Delete the shapes
      setShapes(prev => prev.filter(s => !shapesToDelete.includes(s.id)));
      setSelectedIds([]);
      markDirty();
      history.pushState('Delete shapes');

      // Log deletion
      logger.info('SHAPES DELETED VIA KEYBOARD', {
        count: shapesToDelete.length,
        ids: shapesToDelete
      });

      // Reset state
      setShapesToDelete([]);
      setShowKeyboardDeleteConfirm(false);
    }
  }, [shapesToDelete, setShapes, setSelectedIds, markDirty, history]);

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

  const handleToggleSnapToGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  }, []);

  // ===== UNIFIED EVENT HANDLERS =====
  // Route events to the appropriate hook based on current tool

  const handleStageClick = useCallback((e: any) => {
    if (currentTool === 'select') {
      selection.handleStageClick(e);
    } else if (currentTool === 'polygon') {
      polygonDrawing.handleClick(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool]);

  const handleStageMouseDown = useCallback((e: any) => {
    if (currentTool === 'select') {
      selection.handleMouseDown(e);
    } else if (currentTool === 'pan') {
      pan.handleMouseDown(e);
    } else if (currentTool === 'rect') {
      // Handle both interactive and collision rectangle drawing
      if (collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle') {
        collisionRectDrawing.handleMouseDown(e);
      } else {
        rectDrawing.handleMouseDown(e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool, collisionDrawingMode, pendingCollisionAreaData]);

  const handleStageMouseMove = useCallback((e: any) => {
    if (currentTool === 'select') {
      selection.handleMouseMove(e);
    } else if (currentTool === 'pan') {
      pan.handleMouseMove(e);
    } else if (currentTool === 'polygon') {
      polygonDrawing.handleMouseMove(e);
    } else if (currentTool === 'rect') {
      // Handle both interactive and collision rectangle drawing
      if (collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle') {
        collisionRectDrawing.handleMouseMove(e);
      } else {
        rectDrawing.handleMouseMove(e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool, collisionDrawingMode, pendingCollisionAreaData]);

  const handleStageMouseUp = useCallback(() => {
    if (currentTool === 'select') {
      selection.handleMouseUp();
    } else if (currentTool === 'pan') {
      pan.handleMouseUp();
    } else if (currentTool === 'rect') {
      // Handle both interactive and collision rectangle drawing
      if (collisionDrawingMode && pendingCollisionAreaData?.drawingMode === 'rectangle') {
        collisionRectDrawing.handleMouseUp();
      } else {
        rectDrawing.handleMouseUp();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool, collisionDrawingMode, pendingCollisionAreaData]);

  const handleStageDoubleClick = useCallback(() => {
    if (currentTool === 'polygon') {
      polygonDrawing.handleDoubleClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool]);

  const handleUndo = useCallback(() => {
    history.undo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRedo = useCallback(() => {
    history.redo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    console.log('[KonvaMapEditor] Collision area form submitted:', data);

    if (editingCollisionArea) {
      // Update existing collision area
      console.log('[KonvaMapEditor] Updating existing collision area:', editingCollisionArea.id);
      updateCollisionArea(editingCollisionArea.id, data);
      markDirty();
      setShowCollisionAreaModal(false);
      setEditingCollisionArea(null);
    } else {
      // For new collision areas, save the data and enter drawing mode
      console.log('[KonvaMapEditor] Setting pending collision area data and entering drawing mode');
      console.log('[KonvaMapEditor] Drawing mode:', data.drawingMode);
      setPendingCollisionAreaData(data);
      setShowCollisionAreaModal(false);
      setCollisionDrawingMode(true);
      // Set tool based on drawing mode from the form
      if (data.drawingMode === 'rectangle') {
        console.log('[KonvaMapEditor] Setting tool to rect');
        setCurrentTool('rect');
      } else {
        console.log('[KonvaMapEditor] Setting tool to polygon');
        setCurrentTool('polygon');
      }
    }
  }, [editingCollisionArea, updateCollisionArea, markDirty]);

  // ===== LAYERS PANEL HANDLERS =====

  const handleShapeSelect = useCallback((shapeId: string) => {
    setSelectedIds([shapeId]);
    setCurrentTool('select');
  }, []);

  const handleShapeVisibilityToggle = useCallback((shapeId: string) => {
    setShapes(prev => prev.map(s =>
      s.id === shapeId ? { ...s, visible: !s.visible } : s
    ));
    history.pushState('Toggle shape visibility');
  }, [history]);

  const handleShapeDelete = useCallback((shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    if (shape.category === 'interactive') {
      const area = areas.find(a => a.id === shapeId);
      if (area) {
        setAreaToDelete(area);
        setShowDeleteConfirm(true);
      }
    } else if (shape.category === 'collision') {
      const area = impassableAreas.find(a => a.id === shapeId);
      if (area) {
        setCollisionAreaToDelete(area);
        setShowCollisionDeleteConfirm(true);
      }
    } else if (shape.category === 'asset') {
      // Delete asset shapes directly without confirmation
      setShapes(prev => prev.filter(s => s.id !== shapeId));
      setSelectedIds(prev => prev.filter(id => id !== shapeId));
      markDirty();
      history.pushState('Delete asset');
      logger.info('ASSET DELETED', { id: shapeId, name: shape.name });
    }
  }, [shapes, areas, impassableAreas, setShapes, setSelectedIds, markDirty, history]);

  const handleZoomToShape = useCallback((shape: Shape) => {
    if (!mainRef.current) return;

    const newViewport = calculateZoomToShape(
      shape,
      mainRef.current.offsetWidth,
      mainRef.current.offsetHeight,
      0.2 // 20% padding
    );

    setViewport(newViewport);
  }, []);

  // ===== RENDER =====

  // Create EditorState for toolbar
  const fabricEditorState: import('./types/editor.types').EditorState = {
    tool: konvaToFabricTool(currentTool),
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
          onToggleSnapToGrid={handleToggleSnapToGrid}
          onUndo={handleUndo}
          onRedo={handleRedo}
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
          onShapeSelect={handleShapeSelect}
          onShapeVisibilityToggle={handleShapeVisibilityToggle}
          onShapeDelete={handleShapeDelete}
          onZoomToShape={handleZoomToShape}
          onEditInteractiveArea={(areaId) => {
            const area = areas.find(a => a.id === areaId);
            if (area) {
              setEditingArea(area);
              setShowAreaModal(true);
            }
          }}
          onEditCollisionArea={(areaId) => {
            const area = impassableAreas.find(a => a.id === areaId);
            if (area) {
              setEditingCollisionArea(area);
              setShowCollisionAreaModal(true);
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
                  // Image geometry
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
                  {tab.icon}
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
              {activeTab === 'assets' && (
                <AssetsTab
                  onPlaceAsset={(fileData, fileName, width, height) => {
                    console.log('[KonvaMapEditor] onPlaceAsset called:', {
                      fileName,
                      dimensions: { width, height },
                      imageDataLength: fileData?.length || 0,
                      imageDataPrefix: fileData?.substring(0, 30) || 'N/A',
                      viewport: {
                        pan: viewport.pan,
                        zoom: viewport.zoom,
                        viewportSize: { width: viewportWidth, height: viewportHeight }
                      }
                    });

                    // Calculate center of viewport
                    const centerX = -viewport.pan.x + (viewportWidth / 2) / viewport.zoom;
                    const centerY = -viewport.pan.y + (viewportHeight / 2) / viewport.zoom;

                    console.log('[KonvaMapEditor] Calculated position:', {
                      centerX,
                      centerY,
                      finalX: centerX - width / 2,
                      finalY: centerY - height / 2
                    });

                    // Create image shape at viewport center
                    const imageShape = createImageShape({
                      x: centerX - width / 2,
                      y: centerY - height / 2,
                      width,
                      height,
                      imageData: fileData,
                      fileName,
                    });

                    console.log('[KonvaMapEditor] Created image shape:', {
                      id: imageShape.id,
                      category: imageShape.category,
                      geometry: imageShape.geometry,
                      style: imageShape.style,
                      metadata: imageShape.metadata
                    });

                    // Add shape to map
                    setShapes(prev => {
                      const newShapes = [...prev, imageShape];
                      console.log('[KonvaMapEditor] Updated shapes array:', {
                        previousCount: prev.length,
                        newCount: newShapes.length,
                        imageShapes: newShapes.filter(s => s.geometry.type === 'image').length
                      });
                      return newShapes;
                    });

                    // Select the new shape
                    selection.selectShape(imageShape.id);
                    console.log('[KonvaMapEditor] Selected shape:', imageShape.id);

                    // Mark as dirty
                    markDirty();

                    logger.info('ASSET PLACED ON MAP', {
                      id: imageShape.id,
                      fileName,
                      position: { x: imageShape.geometry.x, y: imageShape.geometry.y },
                      dimensions: { width, height }
                    });
                  }}
                />
              )}
              {activeTab === 'collision' && (
                <CollisionTab
                  impassableAreas={impassableAreas}
                  onCreateNewCollisionArea={handleCreateCollisionArea}
                  onEditCollisionArea={handleEditCollisionArea}
                  onDeleteCollisionArea={handleDeleteCollisionArea}
                />
              )}
              {activeTab === 'jitsi' && <JitsiTab />}
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

      <ConfirmationDialog
        isOpen={showKeyboardDeleteConfirm}
        title="Delete Selected Shapes"
        message={`Are you sure you want to delete ${shapesToDelete.length} selected shape${shapesToDelete.length > 1 ? 's' : ''}?`}
        confirmText="Delete"
        type="danger"
        onConfirm={handleConfirmKeyboardDelete}
        onClose={() => {
          setShowKeyboardDeleteConfirm(false);
          setShapesToDelete([]);
        }}
      />
    </div>
  );
};

