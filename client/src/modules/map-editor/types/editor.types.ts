export interface MapEditorModuleProps {
  className?: string;
}

export interface GridConfig {
  spacing: number;
  opacity: number;
  pattern: 'pattern-8px' | 'pattern-16px' | 'pattern-32px' | 'pattern-64px' | 'pattern-128px';
  visible: boolean;
  snapToGrid: boolean;
}

export interface GridPattern {
  id: string;
  name: string;
  size: number;
  imagePath: string;
  thumbnail: string;
}

export interface EditorState {
  tool: EditorTool;
  zoom: number; // Zoom percentage (100 = 1.0x)
  mousePosition: { x: number; y: number };
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  isPanning: boolean;
}

export type EditorTool = 'select' | 'pan' | 'draw-collision' | 'erase-collision';

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

export type TabId = 'areas' | 'terrain' | 'assets' | 'layers' | 'collision' | 'settings';

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

export type BrushShape = 'square' | 'circle';

export interface ImpassableArea {
  id: string;
  name: string;
  type: 'impassable-paint';
  cells: string[]; // Each cell is "gx_gy" format
  color?: string;
  border?: string;
  brushShape?: BrushShape;
  group?: any; // Runtime reference to Fabric.Group (type workaround)
}

export interface ImpassableAreaEditState {
  areas: ImpassableArea[];
  activeAreaId?: string;
  undoStack: ImpassableAreaAction[];
  redoStack: ImpassableAreaAction[];
}

export type ImpassableAreaAction =
  | { type: 'addCell'; areaId: string; cell: string }
  | { type: 'removeCell'; areaId: string; cell: string }
  | { type: 'createArea'; area: ImpassableArea }
  | { type: 'deleteArea'; areaId: string }
  | { type: 'setBrush'; areaId: string; brushShape: BrushShape }
  | { type: 'setColor'; areaId: string; color: string }
  | { type: 'setBorder'; areaId: string; border: string }
  | { type: 'selectArea'; areaId: string };
