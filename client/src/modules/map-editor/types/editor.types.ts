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
  tool: 'select' | 'move' | 'resize' | 'delete' | 'pan' | 'draw-collision' | 'erase-collision';
  zoom: number;
  mousePosition: { x: number; y: number };
  saveStatus: 'saved' | 'unsaved' | 'saving';
  canUndo: boolean;
  canRedo: boolean;
  isPanning: boolean;
}

export type EditorTool = EditorState['tool'];

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
