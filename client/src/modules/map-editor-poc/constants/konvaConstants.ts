/**
 * Konva Map Editor POC - Constants
 * Minimal constants for Week 1 POC
 */

import { POCViewport, POCGrid, POCShapeStyle } from '../types/konva.types';

// Canvas dimensions
export const POC_CANVAS = {
  WIDTH: 800,
  HEIGHT: 600,
  BACKGROUND: '#1a1a1a',
} as const;

// Zoom configuration
export const POC_ZOOM = {
  MIN: 0.1,
  MAX: 5.0,
  STEP: 0.1,
  WHEEL_SENSITIVITY: 0.001,
} as const;

// Grid defaults
export const POC_GRID_DEFAULTS: POCGrid = {
  enabled: true,
  size: 32,
  color: '#333333',
  opacity: 0.5,
};

// Viewport defaults
export const POC_VIEWPORT_DEFAULTS: POCViewport = {
  zoom: 1.0,
  pan: { x: 0, y: 0 },
};

// Shape styles
export const POC_STYLES: Record<string, POCShapeStyle> = {
  collision: {
    fill: 'rgba(255, 0, 0, 0.3)',
    stroke: '#ff0000',
    strokeWidth: 2,
    opacity: 0.7,
  },
  interactive: {
    fill: 'rgba(0, 255, 0, 0.3)',
    stroke: '#00ff00',
    strokeWidth: 2,
    opacity: 0.7,
  },
};

// Selection style
export const POC_SELECTION_STYLE = {
  stroke: '#00aaff',
  strokeWidth: 3,
  dash: [5, 5],
} as const;

