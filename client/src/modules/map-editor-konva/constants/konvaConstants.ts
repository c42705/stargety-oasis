/**
 * Konva Map Editor - Constants and Configuration
 * 
 * Production-grade constants for the Konva-based map editor.
 * All configuration values are centralized here for easy maintenance.
 */

import type { Viewport, GridConfig, ShapeStyle, ZoomConfig } from '../types';

// ============================================================================
// CANVAS CONFIGURATION
// ============================================================================

/**
 * Canvas dimensions and appearance
 */
export const CANVAS = {
  /** Default canvas width (will be overridden by container) */
  DEFAULT_WIDTH: 1920,
  /** Default canvas height (will be overridden by container) */
  DEFAULT_HEIGHT: 1080,
  /** Canvas background color */
  BACKGROUND_COLOR: '#1a1a1a',
  /** Minimum canvas dimensions */
  MIN_WIDTH: 400,
  MIN_HEIGHT: 300,
  /** Maximum canvas dimensions */
  MAX_WIDTH: 8000,
  MAX_HEIGHT: 4000,
} as const;

// ============================================================================
// ZOOM CONFIGURATION
// ============================================================================

/**
 * Zoom limits and behavior
 * Supports zoom range from 0.3x to 3.1x+ as per requirements
 */
export const ZOOM: ZoomConfig = {
  /** Minimum zoom level (30%) */
  min: 0.3,
  /** Maximum zoom level (500%) - supports 3.1x+ requirement */
  max: 5.0,
  /** Zoom step for buttons (10%) */
  step: 0.1,
  /** Mouse wheel sensitivity (lower = more sensitive) */
  wheelSensitivity: 0.001,
};

/**
 * Additional zoom configuration
 */
export const ZOOM_CONFIG = {
  /** Extreme maximum for testing (1000%) */
  EXTREME_MAX: 10.0,
  /** Object focus maximum (310%) */
  OBJECT_FOCUS_MAX: 3.1,
  /** Zoom step multiplier for keyboard shortcuts (20%) */
  STEP_MULTIPLIER: 1.2,
  /** Padding for fit-to-screen operations (pixels) */
  FIT_SCREEN_PADDING: 50,
  /** Animation duration for smooth zoom (ms) */
  ANIMATION_DURATION: 300,
} as const;

// ============================================================================
// GRID CONFIGURATION
// ============================================================================

/**
 * Default grid configuration
 */
export const GRID_DEFAULTS: GridConfig = {
  visible: true,
  spacing: 32,
  pattern: 'dots',
  color: '#333333',
  opacity: 0.5,
};

/**
 * Grid configuration options
 */
export const GRID_CONFIG = {
  /** Available grid spacings (pixels) */
  SPACING_OPTIONS: [16, 32, 64, 128] as const,
  /** Minimum grid spacing */
  MIN_SPACING: 8,
  /** Maximum grid spacing */
  MAX_SPACING: 256,
  /** Grid line width for 'lines' pattern */
  LINE_WIDTH: 1,
  /** Grid dot radius for 'dots' pattern */
  DOT_RADIUS: 1.5,
  /** Minimum opacity */
  MIN_OPACITY: 0.1,
  /** Maximum opacity */
  MAX_OPACITY: 1.0,
} as const;

// ============================================================================
// VIEWPORT DEFAULTS
// ============================================================================

/**
 * Default viewport state
 */
export const VIEWPORT_DEFAULTS: Viewport = {
  zoom: 1.0,
  pan: { x: 0, y: 0 },
};

// ============================================================================
// SHAPE STYLES
// ============================================================================

/**
 * Default styles for collision shapes (impassable areas)
 */
export const COLLISION_STYLE: ShapeStyle = {
  fill: 'rgba(239, 68, 68, 0.3)',
  stroke: '#ef4444',
  strokeWidth: 2,
  opacity: 0.7,
};

/**
 * Default styles for interactive shapes
 */
export const INTERACTIVE_STYLE: ShapeStyle = {
  fill: 'rgba(74, 144, 226, 0.3)',
  stroke: '#4A90E2',
  strokeWidth: 2,
  opacity: 0.7,
};

/**
 * Style for selected shapes
 */
export const SELECTION_STYLE = {
  /** Selection stroke color */
  STROKE: '#00aaff',
  /** Selection stroke width */
  STROKE_WIDTH: 3,
  /** Selection fill overlay */
  FILL_OVERLAY: 'rgba(0, 170, 255, 0.1)',
  /** Selection corner size */
  CORNER_SIZE: 8,
  /** Selection corner color */
  CORNER_COLOR: '#00aaff',
  /** Selection corner stroke width */
  CORNER_STROKE_WIDTH: 2,
} as const;

/**
 * Style for shape hover state
 */
export const HOVER_STYLE = {
  /** Hover stroke color */
  STROKE: '#ffffff',
  /** Hover stroke width */
  STROKE_WIDTH: 2,
  /** Hover opacity multiplier */
  OPACITY_MULTIPLIER: 1.2,
} as const;

// ============================================================================
// POLYGON DRAWING
// ============================================================================

/**
 * Polygon drawing configuration
 */
export const POLYGON_DRAWING = {
  /** Minimum vertices required */
  MIN_VERTICES: 3,
  /** Maximum vertices allowed */
  MAX_VERTICES: 100,
  /** Minimum polygon area (square pixels) */
  MIN_AREA: 100,
  /** Close threshold - distance to origin to close polygon (pixels) */
  CLOSE_THRESHOLD: 15,
  /** Vertex circle radius */
  VERTEX_RADIUS: 6,
  /** Vertex fill color */
  VERTEX_FILL: '#ffffff',
  /** Vertex stroke color */
  VERTEX_STROKE: '#0000ff',
  /** Vertex stroke width */
  VERTEX_STROKE_WIDTH: 2,
  /** Origin vertex fill (first point) */
  ORIGIN_VERTEX_FILL: '#00ff00',
  /** Origin vertex stroke */
  ORIGIN_VERTEX_STROKE: '#00aa00',
  /** Preview line color */
  PREVIEW_LINE_COLOR: '#888888',
  /** Preview line width */
  PREVIEW_LINE_WIDTH: 1,
  /** Preview line dash pattern */
  PREVIEW_LINE_DASH: [5, 5] as [number, number],
} as const;

// ============================================================================
// RECTANGLE DRAWING
// ============================================================================

/**
 * Rectangle drawing configuration
 */
export const RECTANGLE_DRAWING = {
  /** Minimum width (pixels) */
  MIN_WIDTH: 10,
  /** Minimum height (pixels) */
  MIN_HEIGHT: 10,
  /** Minimum area (square pixels) */
  MIN_AREA: 100,
  /** Preview stroke color when valid */
  VALID_STROKE: '#00ff00',
  /** Preview stroke color when invalid */
  INVALID_STROKE: '#ff0000',
  /** Preview stroke width */
  PREVIEW_STROKE_WIDTH: 2,
  /** Preview fill opacity */
  PREVIEW_FILL_OPACITY: 0.2,
} as const;

// ============================================================================
// POLYGON VERTEX EDITING
// ============================================================================

/**
 * Polygon vertex editing configuration
 */
export const VERTEX_EDITING = {
  /** Vertex handle radius */
  HANDLE_RADIUS: 6,
  /** Vertex handle fill */
  HANDLE_FILL: '#ffffff',
  /** Vertex handle stroke */
  HANDLE_STROKE: '#0000ff',
  /** Vertex handle stroke width */
  HANDLE_STROKE_WIDTH: 2,
  /** Edge midpoint handle radius */
  EDGE_HANDLE_RADIUS: 5,
  /** Edge midpoint handle fill */
  EDGE_HANDLE_FILL: '#cccccc',
  /** Edge midpoint handle stroke */
  EDGE_HANDLE_STROKE: '#888888',
  /** Hover handle fill */
  HOVER_HANDLE_FILL: '#ffff00',
  /** Dragging handle fill */
  DRAGGING_HANDLE_FILL: '#ff00ff',
  /** Minimum distance between vertices (pixels) */
  MIN_VERTEX_DISTANCE: 5,
} as const;

// ============================================================================
// SELECTION
// ============================================================================

/**
 * Selection configuration
 */
export const SELECTION = {
  /** Selection rectangle stroke color */
  RECT_STROKE: '#00aaff',
  /** Selection rectangle stroke width */
  RECT_STROKE_WIDTH: 1,
  /** Selection rectangle fill */
  RECT_FILL: 'rgba(0, 170, 255, 0.1)',
  /** Selection rectangle dash pattern */
  RECT_DASH: [5, 5] as [number, number],
  /** Minimum drag distance to start selection rectangle (pixels) */
  MIN_DRAG_DISTANCE: 5,
} as const;

// ============================================================================
// HISTORY (UNDO/REDO)
// ============================================================================

/**
 * History configuration
 */
export const HISTORY = {
  /** Maximum number of undo states */
  MAX_SIZE: 50,
  /** Debounce time for auto-snapshot (ms) */
  AUTO_SNAPSHOT_DEBOUNCE: 500,
} as const;

// ============================================================================
// LAYER CONFIGURATION
// ============================================================================

/**
 * Layer names and z-index order
 */
export const LAYERS = {
  /** Grid layer (bottom) */
  GRID: 'grid',
  /** Background image layer */
  BACKGROUND: 'background',
  /** Shapes layer */
  SHAPES: 'shapes',
  /** Selection and UI layer (top) */
  UI: 'ui',
} as const;

/**
 * Layer z-index values
 */
export const LAYER_Z_INDEX = {
  GRID: 0,
  BACKGROUND: 1,
  SHAPES: 2,
  UI: 3,
} as const;

// ============================================================================
// PERFORMANCE
// ============================================================================

/**
 * Performance optimization settings
 */
export const PERFORMANCE = {
  /** Enable layer caching */
  ENABLE_LAYER_CACHING: true,
  /** Enable hit detection optimization */
  ENABLE_HIT_DETECTION_OPTIMIZATION: true,
  /** Disable hit detection on static layers */
  DISABLE_STATIC_HIT_DETECTION: true,
  /** Batch drawing updates */
  ENABLE_BATCH_DRAWING: true,
  /** Debounce time for canvas updates (ms) */
  CANVAS_UPDATE_DEBOUNCE: 16, // ~60fps
  /** Maximum shapes before performance warning */
  MAX_SHAPES_WARNING: 500,
  /** Maximum shapes before performance degradation */
  MAX_SHAPES_LIMIT: 1000,
} as const;

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Keyboard shortcut keys
 */
export const KEYBOARD_SHORTCUTS = {
  // Tools
  SELECT_TOOL: 's',
  PAN_TOOL: 'p',
  POLYGON_TOOL: 'g',
  
  // Actions
  DELETE: ['Delete', 'Backspace'],
  UNDO: 'z', // with Ctrl/Cmd
  REDO: 'y', // with Ctrl/Cmd or Ctrl+Shift+Z
  DUPLICATE: 'd', // with Ctrl/Cmd
  SELECT_ALL: 'a', // with Ctrl/Cmd
  DESELECT_ALL: 'Escape',
  
  // View
  TOGGLE_GRID: 'g', // without modifiers
  ZOOM_IN: '+',
  ZOOM_OUT: '-',
  RESET_ZOOM: '0',
  FIT_TO_SCREEN: 'f',
  
  // Drawing
  COMPLETE_POLYGON: 'Enter',
  CANCEL_DRAWING: 'Escape',
  REMOVE_LAST_VERTEX: 'Backspace',
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation thresholds
 */
export const VALIDATION = {
  /** Minimum shape area (square pixels) */
  MIN_SHAPE_AREA: 100,
  /** Maximum shape area (square pixels) */
  MAX_SHAPE_AREA: 1000000,
  /** Minimum coordinate value */
  MIN_COORDINATE: -10000,
  /** Maximum coordinate value */
  MAX_COORDINATE: 10000,
  /** Check for self-intersecting polygons */
  CHECK_SELF_INTERSECTION: true,
} as const;

// ============================================================================
// COLORS
// ============================================================================

/**
 * Color palette for different area types
 */
export const COLORS = {
  // Interactive area types
  MEETING_ROOM: '#4A90E2',
  PRESENTATION_HALL: '#9B59B6',
  COFFEE_CORNER: '#D2691E',
  GAME_ZONE: '#E74C3C',
  CUSTOM: '#4A90E2',
  
  // Collision areas
  COLLISION: '#ef4444',
  
  // UI elements
  GRID: '#333333',
  BACKGROUND: '#1a1a1a',
  SELECTION: '#00aaff',
  VERTEX: '#0000ff',
  PREVIEW: '#888888',
} as const;

// ============================================================================
// PERSISTENCE CONFIGURATION
// ============================================================================

/**
 * State persistence configuration
 */
export const PERSISTENCE = {
  /** LocalStorage key for editor state */
  STORAGE_KEY: 'konva-editor-state',
  /** Auto-save delay in milliseconds */
  AUTO_SAVE_DELAY: 2000,
  /** Maximum data size in bytes (5MB) */
  MAX_SIZE: 5 * 1024 * 1024,
  /** Data version for migration */
  VERSION: 1,
} as const;

// ============================================================================
// STORAGE
// ============================================================================

/**
 * LocalStorage keys
 * TODO: Migrate to database persistence
 */
export const STORAGE_KEYS = {
  /** Editor state */
  EDITOR_STATE: 'konva-editor-state',
  /** Viewport preferences */
  VIEWPORT_PREFS: 'konva-viewport-prefs',
  /** Grid preferences */
  GRID_PREFS: 'konva-grid-prefs',
  /** Tool preferences */
  TOOL_PREFS: 'konva-tool-prefs',
  /** History data */
  HISTORY: 'konva-history',
} as const;

