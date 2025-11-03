/**
 * Konva Map Editor - Hook Type Definitions
 * 
 * Type definitions for all custom hooks used in the editor.
 * These types define the interfaces for hook parameters and return values.
 */

import { KonvaEventObject } from 'konva/lib/Node';
import {
  Viewport,
  GridConfig,
  EditorTool,
  EditorState,
  Shape,
  ShapeCategory,
  PolygonDrawingState,
  RectangleDrawingState,
  SelectionState,
  TransformState,
  HistoryState,
  StageRef,
  LayerRef,
} from './konva.types';

// ============================================================================
// ZOOM HOOK
// ============================================================================

/**
 * Parameters for useKonvaZoom hook
 */
export interface UseKonvaZoomParams {
  /** Current viewport state */
  viewport: Viewport;
  /** Callback when viewport changes */
  onViewportChange: (viewport: Viewport) => void;
  /** Optional zoom configuration */
  config?: {
    min?: number;
    max?: number;
    step?: number;
    wheelSensitivity?: number;
  };
  /** Whether zoom is enabled */
  enabled?: boolean;
}

/**
 * Return value from useKonvaZoom hook
 */
export interface UseKonvaZoomReturn {
  /** Handle wheel event for zoom */
  handleWheel: (e: KonvaEventObject<WheelEvent>) => void;
  /** Zoom in programmatically */
  zoomIn: () => void;
  /** Zoom out programmatically */
  zoomOut: () => void;
  /** Set zoom to specific level */
  setZoom: (zoom: number) => void;
  /** Zoom to specific level (alias for setZoom) */
  zoomTo: (zoom: number) => void;
  /** Reset zoom to 100% */
  resetZoom: () => void;
  /** Zoom to fit bounds */
  zoomToFit: (bounds: { x: number; y: number; width: number; height: number }, containerWidth: number, containerHeight: number, padding?: number) => void;
  /** Current zoom level */
  currentZoom: number;
  /** Current zoom level (alias) */
  zoom: number;
  /** Zoom as percentage (0-100) */
  zoomPercentage: number;
  /** Whether at minimum zoom */
  isMinZoom: boolean;
  /** Whether at minimum zoom (alias) */
  isAtMin: boolean;
  /** Whether at maximum zoom */
  isMaxZoom: boolean;
  /** Whether at maximum zoom (alias) */
  isAtMax: boolean;
}

// ============================================================================
// PAN HOOK
// ============================================================================

/**
 * Parameters for useKonvaPan hook
 */
export interface UseKonvaPanParams {
  /** Current viewport state */
  viewport: Viewport;
  /** Callback when viewport changes */
  onViewportChange: (viewport: Viewport) => void;
  /** Whether pan is enabled */
  enabled?: boolean;
  /** Whether to enable middle mouse button panning */
  enableMiddleMousePan?: boolean;
  /** Whether to enable middle button panning (alias) */
  enableMiddleButton?: boolean;
}

/**
 * Return value from useKonvaPan hook
 */
export interface UseKonvaPanReturn {
  /** Handle mouse down for pan start */
  handleMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse move for panning */
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse up for pan end */
  handleMouseUp: () => void;
  /** Handle touch start */
  handleTouchStart: (e: KonvaEventObject<TouchEvent>) => void;
  /** Handle touch move */
  handleTouchMove: (e: KonvaEventObject<TouchEvent>) => void;
  /** Handle touch end */
  handleTouchEnd: () => void;
  /** Whether currently panning */
  isPanning: boolean;
  /** Pan to specific coordinates */
  panTo: (x: number, y: number) => void;
  /** Pan by delta */
  panBy: (dx: number, dy: number) => void;
  /** Reset pan to origin */
  resetPan: () => void;
  /** Center on specific point */
  centerOn: (x: number, y: number, containerWidth: number, containerHeight: number) => void;
}

// ============================================================================
// GRID HOOK
// ============================================================================

/**
 * Parameters for useKonvaGrid hook
 */
export interface UseKonvaGridParams {
  /** Grid configuration */
  config: GridConfig;
  /** Viewport for scaling */
  viewport: Viewport;
  /** Canvas width */
  canvasWidth?: number;
  /** Canvas height */
  canvasHeight?: number;
  /** Canvas dimensions (alternative) */
  canvasDimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Return value from useKonvaGrid hook
 */
export interface UseKonvaGridReturn {
  /** Grid lines to render */
  gridLines: Array<{
    points: number[];
    stroke: string;
    strokeWidth: number;
    opacity: number;
    listening: boolean;
  }>;
  /** Whether grid should be rendered */
  shouldRenderGrid: boolean;
  /** Current grid configuration */
  gridConfig: GridConfig;
  /** Effective spacing after zoom adjustments */
  effectiveSpacing: number;
  /** Effective opacity after zoom adjustments */
  effectiveOpacity: number;
  /** Snap point to grid */
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  /** Snap multiple points to grid */
  snapPointsToGrid: (points: Array<{ x: number; y: number }>) => Array<{ x: number; y: number }>;
}

// ============================================================================
// POLYGON DRAWING HOOK
// ============================================================================

/**
 * Parameters for useKonvaPolygonDrawing hook
 */
export interface UseKonvaPolygonDrawingParams {
  /** Whether polygon drawing is enabled */
  enabled: boolean;
  /** Current viewport */
  viewport: Viewport;
  /** Shape category for new polygons */
  category: ShapeCategory;
  /** Grid configuration */
  gridConfig?: GridConfig;
  /** Callback when polygon is completed */
  onPolygonComplete?: (vertices: Array<{ x: number; y: number }>) => void;
  /** Callback when shape is created */
  onShapeCreate?: (shape: Shape) => void;
  /** Callback when validation error occurs */
  onValidationError?: (errors: string[]) => void;
  /** Optional grid snapping function */
  snapToGrid?: (x: number, y: number) => { x: number; y: number };
  /** Minimum vertices required */
  minVertices?: number;
  /** Close distance threshold (pixels) */
  closeThreshold?: number;
}

/**
 * Return value from useKonvaPolygonDrawing hook
 */
export interface UseKonvaPolygonDrawingReturn {
  /** Current drawing state */
  state: PolygonDrawingState;
  /** Whether currently drawing */
  isDrawing: boolean;
  /** Current vertices */
  vertices: Array<{ x: number; y: number }>;
  /** Preview point */
  previewPoint: { x: number; y: number } | null;
  /** Whether origin is hovered */
  isOriginHovered: boolean;
  /** Vertex count */
  vertexCount: number;
  /** Whether can complete */
  canComplete: boolean;
  /** Preview lines */
  previewLines: number[] | null;
  /** Handle click to add vertex */
  handleClick: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse move for preview */
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle double click to complete */
  handleDoubleClick: () => void;
  /** Handle escape to cancel */
  handleEscape: () => void;
  /** Cancel current drawing */
  cancel: () => void;
  /** Remove last vertex */
  removeLastVertex: () => void;
}

// ============================================================================
// RECTANGLE DRAWING HOOK
// ============================================================================

/**
 * Parameters for useKonvaRectangleDrawing hook
 */
export interface UseKonvaRectangleDrawingParams {
  /** Whether rectangle drawing is enabled */
  enabled: boolean;
  /** Current viewport */
  viewport: Viewport;
  /** Shape category for new rectangles */
  category: ShapeCategory;
  /** Grid configuration for snapping */
  gridConfig?: GridConfig;
  /** Callback when rectangle is completed */
  onRectangleComplete?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  /** Callback when shape is created */
  onShapeCreate?: (shape: Shape) => void;
  /** Callback when validation fails */
  onValidationError?: (errors: string[]) => void;
  /** Optional grid snapping function */
  snapToGrid?: (x: number, y: number) => { x: number; y: number };
  /** Minimum size in pixels */
  minSize?: number;
}

/**
 * Return value from useKonvaRectangleDrawing hook
 */
export interface UseKonvaRectangleDrawingReturn {
  /** Current drawing state */
  state: RectangleDrawingState;
  /** Handle mouse down to start drawing */
  handleMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse move for preview */
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse up to complete */
  handleMouseUp: () => void;
  /** Cancel current drawing */
  cancel: () => void;
  /** Whether currently drawing */
  isDrawing: boolean;
  /** Preview rectangle bounds */
  previewRect: { x: number; y: number; width: number; height: number } | null;
  /** Cancel drawing (alias) */
  cancelDrawing: () => void;
}

// Type aliases for backward compatibility
export type UseKonvaRectDrawingParams = UseKonvaRectangleDrawingParams;
export type UseKonvaRectDrawingReturn = UseKonvaRectangleDrawingReturn;

// ============================================================================
// SELECTION HOOK
// ============================================================================

/**
 * Parameters for useKonvaSelection hook
 */
export interface UseKonvaSelectionParams {
  /** Whether selection is enabled */
  enabled: boolean;
  /** All shapes in the editor */
  shapes: Shape[];
  /** Current viewport (optional) */
  viewport?: Viewport;
  /** Callback when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
  /** Initial selection */
  initialSelection?: string[];
  /** Whether multi-select is allowed */
  allowMultiSelect?: boolean;
}

/**
 * Return value from useKonvaSelection hook
 */
export interface UseKonvaSelectionReturn {
  /** Selected shape IDs */
  selectedIds: string[];
  /** Selection rectangle */
  selectionRect: { x: number; y: number; width: number; height: number } | null;
  /** Whether drawing selection rectangle */
  isDrawingSelection: boolean;
  /** Check if shape is selected */
  isSelected: (shapeId: string) => boolean;
  /** Number of selected shapes */
  selectedCount: number;
  /** Whether has selection */
  hasSelection: boolean;
  /** Handle click on shape */
  handleShapeClick: (shapeId: string, e: KonvaEventObject<MouseEvent>) => void;
  /** Handle stage click */
  handleStageClick: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse down for drag select */
  handleMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse move for drag select */
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse up for drag select */
  handleMouseUp: () => void;
  /** Select all */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Select single shape */
  selectShape: (id: string) => void;
  /** Toggle shape selection */
  toggleShape: (shapeId: string) => void;
}

// ============================================================================
// TRANSFORM HOOK
// ============================================================================

/**
 * Parameters for useKonvaTransform hook
 */
export interface UseKonvaTransformParams {
  /** Selected shape IDs */
  selectedIds: string[];
  /** All shapes */
  shapes: Shape[];
  /** Callback when shapes are transformed */
  onTransform?: (updates: Array<{ id: string; geometry: any }>) => void;
  /** Callback when shape is updated */
  onShapeUpdate?: (id: string, updates: any) => void;
  /** Current viewport */
  viewport?: Viewport;
  /** Whether transform is enabled */
  enabled?: boolean;
}

/**
 * Return value from useKonvaTransform hook
 */
export interface UseKonvaTransformReturn {
  /** Current transform state */
  state: TransformState;
  /** Handle transform start */
  handleTransformStart: () => void;
  /** Handle transform */
  handleTransform: (e: KonvaEventObject<Event>) => void;
  /** Handle transform end */
  handleTransformEnd: (shapeId: string, node: any) => void;
  /** Handle drag end */
  handleDragEnd: (shapeId: string, e: any) => void;
  /** Whether can transform */
  canTransform: boolean;
  /** Cancel transform */
  cancelTransform: () => void;
}

// ============================================================================
// HISTORY HOOK
// ============================================================================

/**
 * Parameters for useKonvaHistory hook
 */
export interface UseKonvaHistoryParams {
  /** Current editor state */
  currentState: EditorState;
  /** Callback when state should be restored */
  onStateRestore: (state: EditorState) => void;
  /** Maximum history size */
  maxHistorySize?: number;
  /** Whether history is enabled */
  enabled?: boolean;
}

/**
 * Return value from useKonvaHistory hook
 */
export interface UseKonvaHistoryReturn {
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Push current state to history */
  pushState: (description?: string) => void;
  /** Clear history */
  clearHistory: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Serialize state to string */
  serializeState: (state: EditorState) => string;
}

// ============================================================================
// LAYERS HOOK
// ============================================================================

/**
 * Parameters for useKonvaLayers hook
 */
export interface UseKonvaLayersParams {
  /** Stage reference */
  stageRef: StageRef;
  /** Whether to enable layer caching */
  enableCaching?: boolean;
}

/**
 * Layer references using React refs
 */
export interface LayerRefs {
  /** Grid layer (bottom) */
  gridLayer: LayerRef;
  /** Background image layer */
  backgroundLayer: LayerRef;
  /** Shapes layer */
  shapesLayer: LayerRef;
  /** Selection layer */
  selectionLayer: LayerRef;
  /** UI layer (top) */
  uiLayer: LayerRef;
}

/**
 * Return value from useKonvaLayers hook
 */
export interface UseKonvaLayersReturn {
  /** Layer references */
  layerRefs: LayerRefs;
  /** Refresh specific layer */
  refreshLayer: (layerName: keyof LayerRefs) => void;
  /** Refresh all layers */
  refreshAllLayers: () => void;
  /** Enable layer caching */
  enableLayerCache: (layerName: keyof LayerRefs) => void;
  /** Disable layer caching */
  disableLayerCache: (layerName: keyof LayerRefs) => void;
  /** Clear layer cache */
  clearLayerCache: (layerName: keyof LayerRefs) => void;
  /** Batch draw all layers */
  batchDrawAll: () => void;
}

// ============================================================================
// KEYBOARD SHORTCUTS HOOK
// ============================================================================

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key combination (e.g., 'ctrl+z', 'delete', 'escape') */
  key: string;
  /** Callback when shortcut is triggered */
  handler: (e: KeyboardEvent) => void;
  /** Description for help menu */
  description?: string;
  /** Whether shortcut is enabled */
  enabled?: boolean;
}

/**
 * Parameters for useKonvaKeyboardShortcuts hook
 */
export interface UseKonvaKeyboardShortcutsParams {
  /** Shortcut definitions */
  shortcuts: KeyboardShortcut[];
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Return value from useKonvaKeyboardShortcuts hook
 */
export interface UseKonvaKeyboardShortcutsReturn {
  /** Register a new shortcut */
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  /** Unregister a shortcut */
  unregisterShortcut: (key: string) => void;
  /** Get all registered shortcuts */
  getShortcuts: () => KeyboardShortcut[];
  /** Get shortcut display string */
  getShortcutDisplay: (shortcut: KeyboardShortcut) => string;
  /** Get shortcuts by category */
  getShortcutsByCategory: () => Record<string, KeyboardShortcut[]>;
  /** All shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Whether shortcuts are enabled */
  enabled: boolean;
}

// ============================================================================
// BACKGROUND IMAGE HOOK
// ============================================================================

/**
 * Parameters for useKonvaBackground hook
 */
export interface UseKonvaBackgroundParams {
  /** Background image URL */
  imageUrl?: string;
  /** Image dimensions */
  imageDimensions?: {
    width: number;
    height: number;
  };
  /** Current viewport */
  viewport: Viewport;
  /** Callback when image loads */
  onLoad?: (image: HTMLImageElement) => void;
  /** Callback when image fails to load */
  onError?: (error: Error) => void;
}

/**
 * Return value from useKonvaBackground hook
 */
export interface UseKonvaBackgroundReturn {
  /** Loaded image element */
  image: HTMLImageElement | null;
  /** Image dimensions */
  dimensions: { width: number; height: number } | null;
  /** Image aspect ratio */
  aspectRatio: number | null;
  /** Whether image is loading */
  isLoading: boolean;
  /** Load error */
  error: string | null;
  /** Reload image */
  reload: () => void;
  /** Clear image */
  clear: () => void;
}

// ============================================================================
// PERFORMANCE HOOK
// ============================================================================

/**
 * Parameters for useKonvaPerformance hook
 */
export interface UseKonvaPerformanceParams {
  /** Whether performance monitoring is enabled */
  enabled?: boolean;
  /** Shapes to monitor */
  shapes?: Shape[];
  /** FPS warning threshold */
  fpsWarningThreshold?: number;
  /** Shape count warning threshold */
  shapeCountWarningThreshold?: number;
}

/**
 * Return value from useKonvaPerformance hook
 */
export interface UseKonvaPerformanceReturn {
  /** Current FPS */
  fps: number;
  /** Average FPS */
  avgFps: number;
  /** Frame time in ms */
  frameTime: number;
  /** Performance warnings */
  warnings: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  /** Performance metrics */
  metrics: {
    fps: number;
    avgFps: number;
    frameTime: number;
    shapeCount: number;
    renderTime: number;
  };
  /** Whether performance is good */
  isPerformanceGood: boolean;
  /** Start monitoring */
  startMonitoring: () => void;
  /** Stop monitoring */
  stopMonitoring: () => void;
  /** Reset metrics */
  reset: () => void;
}

// ============================================================================
// PERSISTENCE HOOK
// ============================================================================

/**
 * Parameters for useKonvaPersistence hook
 */
export interface UseKonvaPersistenceParams {
  /** Storage key */
  storageKey: string;
  /** Current editor state */
  currentState: EditorState;
  /** Callback when state should be restored */
  onStateRestore: (state: EditorState) => void;
  /** Whether persistence is enabled */
  enabled?: boolean;
  /** Auto-save delay in ms */
  autoSaveDelay?: number;
}

/**
 * Return value from useKonvaPersistence hook
 */
export interface UseKonvaPersistenceReturn {
  /** Save current state */
  save: () => void;
  /** Load saved state */
  load: () => EditorState | null;
  /** Clear saved state */
  clear: () => void;
  /** Whether has saved state */
  hasSavedState: boolean;
  /** Last save timestamp */
  lastSaveTime: number | null;
}

// ============================================================================
// PREVIEW MODE HOOK
// ============================================================================

/**
 * Parameters for useKonvaPreviewMode hook
 */
export interface UseKonvaPreviewModeParams {
  /** Initial preview mode state */
  initialPreviewMode?: boolean;
  /** Callback when preview mode changes */
  onPreviewModeChange?: (isPreview: boolean) => void;
}

/**
 * Return value from useKonvaPreviewMode hook
 */
export interface UseKonvaPreviewModeReturn {
  /** Whether in preview mode */
  isPreviewMode: boolean;
  /** Whether can edit (inverse of preview mode) */
  canEdit: boolean;
  /** Enable preview mode */
  enablePreview: () => void;
  /** Disable preview mode */
  disablePreview: () => void;
  /** Toggle preview mode */
  togglePreview: () => void;
}

// ============================================================================
// SHARED MAP HOOK
// ============================================================================

/**
 * Parameters for useKonvaSharedMap hook
 */
export interface UseKonvaSharedMapParams {
  /** Current shapes */
  shapes: Shape[];
  /** SharedMap system instance */
  sharedMapSystem?: any; // TODO: Type this properly when SharedMap is available
  /** Callback when shapes are updated from SharedMap */
  onShapesUpdate: (shapes: Shape[]) => void;
  /** Whether auto-sync is enabled */
  autoSync?: boolean;
  /** Whether sync is enabled */
  enabled?: boolean;
}

/**
 * Return value from useKonvaSharedMap hook
 */
export interface UseKonvaSharedMapReturn {
  /** Sync shapes to SharedMap */
  syncToSharedMap: () => void;
  /** Load shapes from SharedMap */
  loadFromSharedMap: () => void;
  /** Whether synced */
  isSynced: boolean;
  /** Last sync timestamp */
  lastSyncTime: number | null;
}

// ============================================================================
// ACCESSIBILITY HOOK
// ============================================================================

/**
 * Parameters for useKonvaAccessibility hook
 */
export interface UseKonvaAccessibilityParams {
  /** All shapes */
  shapes: Shape[];
  /** Selected shape IDs */
  selectedIds: string[];
  /** Whether accessibility features are enabled */
  enabled?: boolean;
}

/**
 * Return type for useKonvaAccessibility hook
 */
export interface UseKonvaAccessibilityReturn {
  /** Get ARIA label for a shape */
  getShapeAriaLabel: (shape: Shape) => string;
  /** Get ARIA label for the canvas */
  getCanvasAriaLabel: () => string;
  /** Get description for a shape */
  getShapeDescription: (shape: Shape) => string;
  /** Get keyboard instructions */
  getKeyboardInstructions: () => string;
  /** Announce an action to screen readers */
  announceAction: (message: string) => void;
  /** Whether accessibility features are enabled */
  enabled: boolean;
}

