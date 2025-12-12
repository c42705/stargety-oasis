/**
 * Type definitions for handler hooks
 * All types use Konva types exclusively (no Fabric.js)
 */

import type { RefObject } from 'react';
import type { EditorTool } from './konva.types';
import type { GridConfig, Viewport, Shape, InteractiveArea, TabId } from './index';

// ============================================================================
// Editor State Hook Return Type
// ============================================================================

export interface EditorStateReturn {
  // Tab state
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  
  // Shape state
  shapes: Shape[];
  setShapes: (shapes: Shape[] | ((prev: Shape[]) => Shape[])) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  
  // Viewport state
  viewport: Viewport;
  setViewport: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  viewportWidth: number;
  viewportHeight: number;
  
  // Grid state
  gridConfig: GridConfig;
  setGridConfig: (config: GridConfig | ((prev: GridConfig) => GridConfig)) => void;
  
  // Tool state (Konva types only)
  currentTool: EditorTool;
  setCurrentTool: (tool: EditorTool) => void;
  
  // Interaction state
  isSpacebarPressed: boolean;
  setIsSpacebarPressed: (pressed: boolean) => void;
  cursorStyle: string;
  setCursorStyle: (style: string) => void;
  
  // Modal state - Interactive Areas
  showAreaModal: boolean;
  setShowAreaModal: (show: boolean) => void;
  editingArea: InteractiveArea | null;
  setEditingArea: (area: InteractiveArea | null) => void;
  areaToDelete: InteractiveArea | null;
  setAreaToDelete: (area: InteractiveArea | null) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  
  // Modal state - Collision Areas
  showCollisionAreaModal: boolean;
  setShowCollisionAreaModal: (show: boolean) => void;
  editingCollisionArea: any | null;
  setEditingCollisionArea: (area: any | null) => void;
  collisionAreaToDelete: any | null;
  setCollisionAreaToDelete: (area: any | null) => void;
  showCollisionDeleteConfirm: boolean;
  setShowCollisionDeleteConfirm: (show: boolean) => void;
  
  // Keyboard delete confirmation state
  showKeyboardDeleteConfirm: boolean;
  setShowKeyboardDeleteConfirm: (show: boolean) => void;
  shapesToDelete: string[];
  setShapesToDelete: (ids: string[]) => void;
  
  // Drawing mode state
  drawingMode: boolean;
  setDrawingMode: (mode: boolean) => void;
  pendingAreaData: Partial<InteractiveArea> | null;
  setPendingAreaData: (data: Partial<InteractiveArea> | null) => void;
  collisionDrawingMode: boolean;
  setCollisionDrawingMode: (mode: boolean) => void;
  pendingCollisionAreaData: any | null;
  setPendingCollisionAreaData: (data: any | null) => void;
  
  // Refs
  stageRef: RefObject<any>;
  mainRef: RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Toolbar Handlers Hook Return Type
// ============================================================================

export interface ToolbarHandlersReturn {
  handleToolChange: (tool: EditorTool) => void; // Uses Konva EditorTool directly
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleFitToScreen: () => void;
  handleToggleGrid: () => void;
  handleToggleSnapToGrid: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

// ============================================================================
// Area Handlers Hook Return Type
// ============================================================================

export interface InteractiveAreaHandlers {
  handleCreateArea: () => void;
  handleEditArea: (area: InteractiveArea) => void;
  handleDeleteArea: (area: InteractiveArea) => void;
  handleConfirmDeleteArea: () => void;
  handleAreaFormSubmit: (data: Partial<InteractiveArea>) => void;
  handleAreaFormCancel: () => void;
  handleAreaDrawingComplete: (shape: Shape) => void;
  handleUpdateArea: (areaId: string, updates: Partial<InteractiveArea>) => void;
}

export interface CollisionAreaHandlers {
  handleCreateCollisionArea: () => void;
  handleEditCollisionArea: (area: any) => void;
  handleDeleteCollisionArea: (area: any) => void;
  handleConfirmDeleteCollisionArea: () => void;
  handleCollisionAreaFormSubmit: (data: any) => void;
  handleCollisionAreaFormCancel: () => void;
  handleCollisionAreaDrawingComplete: (shape: Shape) => void;
}

export interface AreaHandlersReturn {
  interactive: InteractiveAreaHandlers;
  collision: CollisionAreaHandlers;
  handleKeyboardDelete: (event: KeyboardEvent) => void;
  handleConfirmKeyboardDelete: () => void;
  handleCancelKeyboardDelete: () => void;
}

// ============================================================================
// Layers Handlers Hook Return Type
// ============================================================================

export interface LayersHandlersReturn {
  handleShapeSelect: (shapeId: string) => void;
  handleShapeVisibilityToggle: (shapeId: string) => void;
  handleShapeDelete: (shapeId: string) => void;
  handleZoomToShape: (shapeId: string) => void;
}

// ============================================================================
// Stage Event Handlers Hook Return Type
// ============================================================================

export interface StageEventHandlersReturn {
  handleStageClick: (e: any) => void;
  handleStageMouseDown: (e: any) => void;
  handleStageMouseMove: (e: any) => void;
  handleStageMouseUp: (e: any) => void;
  handleStageDoubleClick: (e: any) => void;
}

