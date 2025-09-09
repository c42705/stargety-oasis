export interface MapEditorModuleProps {
  className?: string;
}

export interface GridConfig {
  spacing: number;
  opacity: number;
  color: string;
  visible: boolean;
  snapToGrid: boolean;
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

export type TabId = 'areas' | 'terrain' | 'assets' | 'settings' | 'collision';

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
