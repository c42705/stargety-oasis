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
  /** Reset zoom to 100% */
  resetZoom: () => void;
  /** Current zoom level */
  currentZoom: number;
  /** Whether at minimum zoom */
  isMinZoom: boolean;
  /** Whether at maximum zoom */
  isMaxZoom: boolean;
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
  /** Whether currently panning */
  isPanning: boolean;
  /** Pan to specific coordinates */
  panTo: (x: number, y: number) => void;
  /** Reset pan to origin */
  resetPan: () => void;
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
  /** Canvas dimensions */
  canvasDimensions: {
    width: number;
    height: number;
  };
}

/**
 * Return value from useKonvaGrid hook
 */
export interface UseKonvaGridReturn {
  /** Grid lines/dots to render */
  gridElements: Array<{
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    x?: number;
    y?: number;
    type: 'line' | 'dot';
  }>;
  /** Snap point to grid */
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  /** Whether grid snapping is enabled */
  isSnapEnabled: boolean;
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
  /** Callback when polygon is completed */
  onPolygonComplete: (vertices: Array<{ x: number; y: number }>) => void;
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
  /** Handle click to add vertex */
  handleClick: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle mouse move for preview */
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle escape to cancel */
  handleEscape: () => void;
  /** Cancel current drawing */
  cancel: () => void;
  /** Complete current polygon */
  complete: () => void;
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
  /** Callback when rectangle is completed */
  onRectangleComplete: (bounds: { x: number; y: number; width: number; height: number }) => void;
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
}

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
  /** Current viewport */
  viewport: Viewport;
  /** Callback when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
  /** Whether multi-select is allowed */
  allowMultiSelect?: boolean;
}

/**
 * Return value from useKonvaSelection hook
 */
export interface UseKonvaSelectionReturn {
  /** Current selection state */
  state: SelectionState;
  /** Handle click on shape */
  handleShapeClick: (shapeId: string, e: KonvaEventObject<MouseEvent>) => void;
  /** Handle click on canvas (deselect) */
  handleCanvasClick: (e: KonvaEventObject<MouseEvent>) => void;
  /** Handle drag-to-select */
  handleDragSelect: (e: KonvaEventObject<MouseEvent>) => void;
  /** Select shapes by IDs */
  selectShapes: (ids: string[]) => void;
  /** Deselect all */
  deselectAll: () => void;
  /** Select all */
  selectAll: () => void;
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
  onTransform: (updates: Array<{ id: string; geometry: any }>) => void;
  /** Current viewport */
  viewport: Viewport;
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
  handleTransformEnd: () => void;
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
  /** Current shapes */
  shapes: Shape[];
  /** Current selection */
  selectedIds: string[];
  /** Maximum history size */
  maxSize?: number;
}

/**
 * Return value from useKonvaHistory hook
 */
export interface UseKonvaHistoryReturn {
  /** Current history state */
  state: HistoryState;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Add snapshot to history */
  addSnapshot: (description?: string) => void;
  /** Clear history */
  clearHistory: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
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
 * Layer references
 */
export interface LayerRefs {
  /** Grid layer (bottom) */
  gridLayer: LayerRef;
  /** Background image layer */
  backgroundLayer: LayerRef;
  /** Shapes layer */
  shapesLayer: LayerRef;
  /** Selection/UI layer (top) */
  uiLayer: LayerRef;
}

/**
 * Return value from useKonvaLayers hook
 */
export interface UseKonvaLayersReturn {
  /** Layer references */
  layers: LayerRefs;
  /** Refresh specific layer */
  refreshLayer: (layerName: keyof LayerRefs) => void;
  /** Refresh all layers */
  refreshAll: () => void;
  /** Clear specific layer */
  clearLayer: (layerName: keyof LayerRefs) => void;
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
}

/**
 * Return value from useKonvaBackground hook
 */
export interface UseKonvaBackgroundReturn {
  /** Loaded image element */
  image: HTMLImageElement | null;
  /** Whether image is loading */
  isLoading: boolean;
  /** Load error */
  error: string | null;
  /** Reload image */
  reload: () => void;
}

