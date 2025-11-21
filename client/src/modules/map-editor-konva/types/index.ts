/**
 * Konva Map Editor - Type Definitions Index
 * 
 * Central export point for all type definitions.
 * Import types from this file for consistency.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type {
  // Viewport & Camera
  Viewport,
  ZoomConfig,
  
  // Grid
  GridConfig,
  
  // Tools
  EditorTool,
  ToolState,
  
  // Shapes - Geometry
  BaseGeometry,
  RectangleGeometry,
  PolygonGeometry,
  ImageGeometry,
  ShapeGeometry,
  
  // Shapes - Style
  ShapeStyle,
  
  // Shapes - Categories
  ShapeCategory,
  
  // Shapes - Main
  Shape,
  ShapeMetadata,
  
  // Selection
  SelectionState,
  SelectionRect,
  
  // History
  HistoryState,
  EditorSnapshot,
  
  // Editor State
  EditorState,
  
  // Drawing State
  PolygonDrawingState,
  RectangleDrawingState,
  
  // Transformation
  TransformState,
  
  // Events
  EditorEventType,
  EditorEvent,
  
  // Konva References
  StageRef,
  LayerRef,
  KonvaEventObject,
} from './konva.types';

// ============================================================================
// SHAPE TYPES
// ============================================================================

export type {
  // Shape Creation
  CreateShapeParams,
  CreatePolygonParams,
  CreateRectangleParams,
  CreateImageParams,
  
  // Shape Updates
  UpdateShapeParams,
  MoveShapeParams,
  ResizeShapeParams,
  RotateShapeParams,
  
  // Polygon Vertex Editing
  VertexHandle,
  EdgeHandle,
  PolygonEditState,
  
  // Shape Validation
  ShapeValidationResult,
  PolygonValidationOptions,
  RectangleValidationOptions,
  
  // Shape Conversion
  ShapeToInteractiveAreaParams,
  ShapeToImpassableAreaParams,
  InteractiveAreaToShapeParams,
  ImpassableAreaToShapeParams,
  
  // Shape Queries
  ShapeQuery,
  ShapeQueryResult,
  
  // Shape Bounds
  ShapeBounds,
  
  // Shape Operations
  ShapeOperationResult,
  BatchShapeOperation,
  BatchOperationResult,
  
  // Shape Serialization
  SerializedShape,
  SerializationOptions,
} from './shapes.types';

// Export type guards
export {
  isPolygonGeometry,
  isRectangleGeometry,
  isImageGeometry,
  isCollisionShape,
  isInteractiveShape,
  isAssetShape,
} from './shapes.types';

// ============================================================================
// HOOK TYPES
// ============================================================================

export type {
  // Zoom Hook
  UseKonvaZoomParams,
  UseKonvaZoomReturn,
  
  // Pan Hook
  UseKonvaPanParams,
  UseKonvaPanReturn,
  
  // Grid Hook
  UseKonvaGridParams,
  UseKonvaGridReturn,
  
  // Polygon Drawing Hook
  UseKonvaPolygonDrawingParams,
  UseKonvaPolygonDrawingReturn,
  
  // Rectangle Drawing Hook
  UseKonvaRectangleDrawingParams,
  UseKonvaRectangleDrawingReturn,
  
  // Selection Hook
  UseKonvaSelectionParams,
  UseKonvaSelectionReturn,
  
  // Transform Hook
  UseKonvaTransformParams,
  UseKonvaTransformReturn,
  
  // History Hook
  UseKonvaHistoryParams,
  UseKonvaHistoryReturn,
  
  // Layers Hook
  UseKonvaLayersParams,
  UseKonvaLayersReturn,
  LayerRefs,
  
  // Keyboard Shortcuts Hook
  KeyboardShortcut,
  UseKonvaKeyboardShortcutsParams,
  UseKonvaKeyboardShortcutsReturn,
  
  // Background Image Hook
  UseKonvaBackgroundParams,
  UseKonvaBackgroundReturn,

  // Performance Hook
  UseKonvaPerformanceParams,
  UseKonvaPerformanceReturn,

  // Persistence Hook
  UseKonvaPersistenceParams,
  UseKonvaPersistenceReturn,

  // Preview Mode Hook
  UseKonvaPreviewModeParams,
  UseKonvaPreviewModeReturn,

  // SharedMap Hook
  UseKonvaSharedMapParams,
  UseKonvaSharedMapReturn,

  // Rectangle Drawing Hook (aliases)
  UseKonvaRectDrawingParams,
  UseKonvaRectDrawingReturn,

  // Accessibility Hook
  UseKonvaAccessibilityParams,
  UseKonvaAccessibilityReturn,

  // Vertex Edit Hook
  UseKonvaVertexEditParams,
  UseKonvaVertexEditReturn,
} from './hooks.types';

// ============================================================================
// HANDLER TYPES (for refactored hooks)
// ============================================================================

export type {
  // Editor State Hook
  EditorStateReturn,

  // Toolbar Handlers Hook
  ToolbarHandlersReturn,

  // Area Handlers Hook
  InteractiveAreaHandlers,
  CollisionAreaHandlers,
  AreaHandlersReturn,

  // Layers Handlers Hook
  LayersHandlersReturn,

  // Stage Event Handlers Hook
  StageEventHandlersReturn,
} from './handlers.types';

// ============================================================================
// RE-EXPORTS FROM EXTERNAL LIBRARIES
// ============================================================================

// Re-export commonly used types from MapDataContext for convenience
export type {
  InteractiveArea,
  ImpassableArea,
  MapData,
} from '../../../shared/MapDataContext';

// Re-export types from editor.types.ts
export type {
  TabId,
  EditorTab,
  MapEditorModuleProps,
} from './editor.types';

