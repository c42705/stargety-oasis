import React from 'react';
import {
  Grid,
  Palette,
  Settings,
  Shield,
  TreePine,
  Video
} from 'lucide-react';
import { EditorTab, GridConfig, EditorState, GridPattern } from '../types/editor.types';

export const EDITOR_TABS: EditorTab[] = [
  { id: 'areas', label: 'Interactive Areas', icon: React.createElement(Grid, { size: 16 }) },
  { id: 'terrain', label: 'Terrain', icon: React.createElement(TreePine, { size: 16 }) },
  { id: 'assets', label: 'Assets', icon: React.createElement(Palette, { size: 16 }) },
  { id: 'collision', label: 'Collision', icon: React.createElement(Shield, { size: 16 }) },
  { id: 'jitsi', label: 'Jitsi Rooms', icon: React.createElement(Video, { size: 16 }) },
  { id: 'settings', label: 'Settings', icon: React.createElement(Settings, { size: 16 }) }
];

export const GRID_PATTERNS: GridPattern[] = [
  {
    id: 'pattern-8px',
    name: '8px Grid',
    size: 8,
    imagePath: '/assets/grid-patterns/grid-pattern-8px.svg',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0gOCAwIEwgMCAwIDAgOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGE1NTY4IiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMyIvPjwvc3ZnPg=='
  },
  {
    id: 'pattern-16px',
    name: '16px Grid',
    size: 16,
    imagePath: '/assets/grid-patterns/grid-pattern-16px.svg',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTSAxNiAwIEwgMCAwIDAgMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRhNTU2OCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4='
  },
  {
    id: 'pattern-32px',
    name: '32px Grid',
    size: 32,
    imagePath: '/assets/grid-patterns/grid-pattern-32px.svg',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTSAzMiAwIEwgMCAwIDAgMzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRhNTU2OCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4='
  },
  {
    id: 'pattern-64px',
    name: '64px Grid',
    size: 64,
    imagePath: '/assets/grid-patterns/grid-pattern-64px.svg',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTSA2NCAwIEwgMCAwIDAgNjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRhNTU2OCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4='
  },
  {
    id: 'pattern-128px',
    name: '128px Grid',
    size: 128,
    imagePath: '/assets/grid-patterns/grid-pattern-128px.svg',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNIDEyOCAwIEwgMCAwIDAgMTI4IiBmaWxsPSJub25lIiBzdHJva2U9IiM0YTU1NjgiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+'
  }
];

export const DEFAULT_GRID_CONFIG: GridConfig = {
  spacing: 32,
  opacity: 75,
  pattern: 'pattern-32px',
  visible: true,
  snapToGrid: false
};

export const DEFAULT_EDITOR_STATE: EditorState = {
  tool: 'select',
  zoom: 100,
  mousePosition: { x: 0, y: 0 },
  saveStatus: 'saved',
  canUndo: false,
  canRedo: false,
  isPanning: false
};

export const ZOOM_LIMITS = {
  MIN: 10,        // 0.1x minimum zoom
  MAX: 500,       // 5.0x maximum zoom (supports 3.1x+ requirement)
  STEP: 20,       // 20% zoom steps
  EXTREME_MAX: 1000, // 10.0x for extreme zoom testing
  OBJECT_FOCUS_MAX: 310 // 3.1x for object focus operations
} as const;

export const ZOOM_CONFIG = {
  // Convert percentage to decimal
  MIN_DECIMAL: ZOOM_LIMITS.MIN / 100,           // 0.1
  MAX_DECIMAL: ZOOM_LIMITS.MAX / 100,           // 5.0
  EXTREME_MAX_DECIMAL: ZOOM_LIMITS.EXTREME_MAX / 100, // 10.0
  OBJECT_FOCUS_MAX_DECIMAL: ZOOM_LIMITS.OBJECT_FOCUS_MAX / 100, // 3.1
  STEP_MULTIPLIER: 1.2,                        // 20% zoom step multiplier
  FIT_SCREEN_PADDING: 50,                      // Padding for fit-to-screen operations
  MANUAL_ZOOM_TIMEOUT: 500                     // Timeout for manual zoom operations
} as const;

export const KEYBOARD_SHORTCUTS = {
  TOGGLE_GRID: ['g', 'G'] as readonly string[],
  UNDO: ['ctrl+z', 'cmd+z'] as readonly string[],
  REDO: ['ctrl+y', 'cmd+y'] as readonly string[],
  SELECT_TOOL: ['s', 'S'] as readonly string[],
  MOVE_TOOL: ['m', 'M'] as readonly string[],
  RESIZE_TOOL: ['r', 'R'] as readonly string[],
  DELETE_TOOL: ['d', 'D'] as readonly string[],
  PAN_TOOL: ['p', 'P'] as readonly string[],
  RESET_ZOOM: ['0'] as readonly string[]
} as const;

