/**
 * useRenderPreparation Hook
 * 
 * Prepares data for rendering by converting Konva types to Fabric.js types
 * for legacy components (EditorToolbar, SettingsTab).
 * 
 * This hook handles:
 * - Tool mapping (Konva -> Fabric.js)
 * - EditorState creation for toolbar
 * - GridConfig conversion for settings
 */

import { useMemo } from 'react';
import type { EditorTool as KonvaEditorTool, Viewport, GridConfig as KonvaGridConfig } from '../types';
import type { EditorState, EditorTool as FabricEditorTool, GridConfig as FabricGridConfig } from '../types/editor.types';

interface UseRenderPreparationProps {
  currentTool: KonvaEditorTool;
  isSpacebarPressed: boolean;
  viewport: Viewport;
  gridConfig: KonvaGridConfig;
  canUndo: boolean;
  canRedo: boolean;
}

interface UseRenderPreparationReturn {
  effectiveTool: KonvaEditorTool;
  fabricEditorState: EditorState;
  fabricGridConfig: FabricGridConfig;
  mapKonvaToFabricTool: (tool: KonvaEditorTool) => FabricEditorTool;
}

/**
 * Map Konva tool to Fabric tool for legacy components
 */
const mapKonvaToFabricTool = (tool: KonvaEditorTool): FabricEditorTool => {
  switch (tool) {
    case 'polygon':
      return 'draw-polygon';
    case 'rect':
    case 'edit-vertex':
    case 'delete':
      return 'select'; // Map unsupported tools to select
    default:
      return tool as FabricEditorTool;
  }
};

export const useRenderPreparation = ({
  currentTool,
  isSpacebarPressed,
  viewport,
  gridConfig,
  canUndo,
  canRedo,
}: UseRenderPreparationProps): UseRenderPreparationReturn => {
  // When spacebar is pressed, show 'pan' tool in the status bar
  const effectiveTool = isSpacebarPressed ? 'pan' : currentTool;

  // Create EditorState for toolbar (Fabric.js compatibility layer)
  const fabricEditorState: EditorState = useMemo(() => ({
    tool: mapKonvaToFabricTool(effectiveTool),
    zoom: viewport.zoom * 100, // Convert to percentage
    mousePosition: { x: 0, y: 0 },
    saveStatus: 'saved',
    canUndo,
    canRedo,
    isPanning: currentTool === 'pan',
  }), [effectiveTool, viewport.zoom, canUndo, canRedo, currentTool]);

  // Create GridConfig for toolbar (Fabric.js compatibility layer)
  const fabricGridConfig: FabricGridConfig = useMemo(() => ({
    spacing: gridConfig.spacing,
    opacity: gridConfig.opacity,
    pattern: 'pattern-32px', // Default pattern
    visible: gridConfig.visible,
    snapToGrid: gridConfig.snapToGrid || false,
  }), [gridConfig.spacing, gridConfig.opacity, gridConfig.visible, gridConfig.snapToGrid]);

  return {
    effectiveTool,
    fabricEditorState,
    fabricGridConfig,
    mapKonvaToFabricTool,
  };
};

