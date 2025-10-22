/**
 * Type definitions for FabricMapCanvas component
 * 
 * This file contains all TypeScript interfaces and types used by the
 * FabricMapCanvas component and its related hooks/utilities.
 */

import * as fabric from 'fabric';
import { InteractiveArea, ImpassableArea } from '../../../shared/MapDataContext';

/**
 * Props for the FabricMapCanvas component
 */
export interface FabricMapCanvasProps {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Whether the grid overlay is visible */
  gridVisible: boolean;
  /** Grid spacing in pixels */
  gridSpacing: number;
  /** Grid pattern type (e.g., 'dots', 'lines') */
  gridPattern: string;
  /** Grid opacity (0-1) */
  gridOpacity: number;
  /** Callback when selection changes */
  onSelectionChanged?: (selectedObjects: fabric.Object[]) => void;
  /** Callback when an object is modified */
  onObjectModified?: (object: fabric.Object) => void;
  /** Callback when an interactive area is drawn */
  onAreaDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  /** Callback when a collision area is drawn */
  onCollisionAreaDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  /** Whether drawing mode is active for interactive areas */
  drawingMode?: boolean;
  /** Whether drawing mode is active for collision areas */
  collisionDrawingMode?: boolean;
  /** Data for the area being drawn (interactive) */
  drawingAreaData?: Partial<InteractiveArea>;
  /** Data for the area being drawn (collision) */
  drawingCollisionAreaData?: Partial<ImpassableArea>;
  /** Additional CSS class name */
  className?: string;
  /** Callback when canvas is ready */
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  /** Current tool selected in the editor */
  currentTool?: 'select' | 'pan' | 'draw-polygon';
  /** Callback when zoom level changes */
  onZoomChange?: (zoom: number) => void;
  /** Whether the background info panel is visible */
  backgroundInfoPanelVisible?: boolean;
  /** Callback when background info panel is closed */
  onBackgroundInfoPanelClose?: () => void;
}

/**
 * Extended Fabric.js Object with map element metadata
 */
export interface CanvasObject extends fabric.Object {
  /** Unique identifier for the map element */
  mapElementId?: string;
  /** Type of map element */
  mapElementType?: 'interactive' | 'collision';
  /** Associated map data */
  mapElementData?: InteractiveArea | ImpassableArea;
}

/**
 * State for polygon drawing mode
 */
export interface PolygonDrawingState {
  /** Whether polygon drawing is in progress */
  isDrawing: boolean;
  /** Array of points in the polygon */
  points: { x: number; y: number }[];
  /** Visual vertex circles on the canvas */
  vertexCircles: fabric.Circle[];
}

/**
 * State for rectangle drawing mode
 */
export interface RectangleDrawingState {
  /** Whether rectangle drawing is in progress */
  isDrawing: boolean;
  /** Starting point of the rectangle */
  startPoint: { x: number; y: number } | null;
  /** The rectangle being drawn */
  drawingRect: fabric.Rect | null;
  /** Text label for the rectangle */
  drawingText: fabric.Text | null;
  /** Whether the rectangle has valid size */
  isValidSize: boolean;
}

/**
 * Area deletion state
 */
export interface AreaDeletionState {
  /** Whether the delete confirmation dialog is shown */
  showDeleteDialog: boolean;
  /** Areas pending deletion */
  areasToDelete: { id: string; name: string }[];
}

