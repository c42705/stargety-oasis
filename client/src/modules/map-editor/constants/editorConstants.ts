import React from 'react';
import {
  Grid,
  Layers,
  Palette,
  Settings,
  Shield
} from 'lucide-react';
import { EditorTab, GridConfig, EditorState } from '../types/editor.types';

export const EDITOR_TABS: EditorTab[] = [
  { id: 'areas', label: 'Interactive Areas', icon: React.createElement(Grid, { size: 16 }) },
  { id: 'terrain', label: 'Terrain', icon: React.createElement(Layers, { size: 16 }) },
  { id: 'assets', label: 'Assets', icon: React.createElement(Palette, { size: 16 }) },
  { id: 'collision', label: 'Collision', icon: React.createElement(Shield, { size: 16 }) },
  { id: 'settings', label: 'Settings', icon: React.createElement(Settings, { size: 16 }) }
];

export const DEFAULT_GRID_CONFIG: GridConfig = {
  spacing: 20,
  opacity: 25,
  color: '#4a5568',
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
  MIN: 10,
  MAX: 500,
  STEP: 20
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
