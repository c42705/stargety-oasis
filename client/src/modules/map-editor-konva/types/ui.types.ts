/**
 * UI Types for Map Editor Components
 *
 * These types are used by UI components (toolbar, status bar, settings)
 * and represent simplified state for display purposes.
 *
 * Note: These are separate from the internal Konva editor types in konva.types.ts
 */

export interface MapEditorModuleProps {
  className?: string;
}

/**
 * Grid configuration for UI components
 * Used by SettingsTab and EditorToolbar
 */
export interface GridConfig {
  spacing: number;
  opacity: number; // 0-100 percentage
  pattern: 'pattern-8px' | 'pattern-16px' | 'pattern-32px' | 'pattern-64px' | 'pattern-128px';
  visible: boolean;
  snapToGrid: boolean;
}

/**
 * Grid pattern definition for UI selection
 */
export interface GridPattern {
  id: string;
  name: string;
  size: number;
  imagePath: string;
  thumbnail: string;
}

/**
 * Toolbar state for EditorToolbar and EditorStatusBar
 * Simplified state representation for UI display
 */
export interface ToolbarState {
  tool: ToolbarTool;
  zoom: number; // Zoom percentage (100 = 1.0x)
  mousePosition: { x: number; y: number };
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  isPanning: boolean;
}

/**
 * Tools available in the toolbar
 */
export type ToolbarTool = 'select' | 'pan' | 'draw-polygon';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

export interface ZoomState {
  current: number;
  percentage: number;
  isAtMin: boolean;
  isAtMax: boolean;
  isExtreme: boolean;
  requiresOptimization: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  objectCount: number;
  zoom: number;
  isOptimized: boolean;
  renderTime: number;
}

export type TabId = 'properties' | 'assets' | 'settings';

export interface EditorTab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

export interface AreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ImpassableArea interface removed - now using the unified interface from MapDataContext.tsx

