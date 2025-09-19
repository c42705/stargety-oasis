import { EditorState, EditorTool, AreaBounds } from '../types/editor.types';
import { ZOOM_LIMITS } from '../constants/editorConstants';
import { InteractiveArea, ImpassableArea } from '../../../shared/MapDataContext';

/**
 * Handle tool change in editor
 */
export const handleToolChange = (
  tool: EditorTool,
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>
): void => {
  console.log('🔧 TOOL: Tool change initiated', {
    timestamp: new Date().toISOString(),
    newTool: tool,
    source: 'editorHandlers.handleToolChange'
  });

  setEditorState(prev => {
    console.log('🔧 TOOL: State transition', {
      timestamp: new Date().toISOString(),
      previousTool: prev.tool,
      newTool: tool,
      previousState: {
        zoom: prev.zoom,
        canUndo: prev.canUndo,
        canRedo: prev.canRedo
      }
    });

    return { ...prev, tool };
  });

  console.log('🔧 TOOL: Tool change completed', {
    timestamp: new Date().toISOString(),
    activeTool: tool
  });
};

/**
 * Handle zoom in action
 */
export const handleZoomIn = (
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>
): void => {
  setEditorState(prev => ({
    ...prev,
    zoom: Math.min(prev.zoom + ZOOM_LIMITS.STEP, ZOOM_LIMITS.MAX)
  }));
};

/**
 * Handle zoom out action
 */
export const handleZoomOut = (
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>
): void => {
  setEditorState(prev => ({
    ...prev,
    zoom: Math.max(prev.zoom - ZOOM_LIMITS.STEP, ZOOM_LIMITS.MIN)
  }));
};

/**
 * Handle fit to screen action
 */
export const handleFitToScreen = (
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>
): void => {
  setEditorState(prev => ({ ...prev, zoom: 100 }));
};

/**
 * Handle mouse move for position tracking
 */
export const handleMouseMove = (
  e: React.MouseEvent,
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>
): void => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);
  setEditorState(prev => ({ ...prev, mousePosition: { x, y } }));
};

/**
 * Handle undo action (placeholder for future implementation)
 */
export const handleUndo = (): void => {
  // TODO: Implement undo functionality
  console.log('Undo action');
};

/**
 * Handle redo action (placeholder for future implementation)
 */
export const handleRedo = (): void => {
  // TODO: Implement redo functionality
  console.log('Redo action');
};

/**
 * Create area save handler
 */
export const createAreaSaveHandler = (
  editingArea: InteractiveArea | null,
  sharedMap: any,
  setShowAreaModal: React.Dispatch<React.SetStateAction<boolean>>,
  setEditingArea: React.Dispatch<React.SetStateAction<InteractiveArea | null>>,
  setPendingAreaData: React.Dispatch<React.SetStateAction<Partial<InteractiveArea> | null>>,
  setDrawingMode: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return async (areaData: Partial<InteractiveArea>) => {
    try {
      if (editingArea) {
        // Update existing area
        await sharedMap.updateInteractiveArea(editingArea.id, areaData);
        setShowAreaModal(false);
        setEditingArea(null);
      } else {
        // For new areas, enter drawing mode
        setPendingAreaData(areaData);
        setDrawingMode(true);
        setShowAreaModal(false);
      }
    } catch (error) {
      console.error('Failed to save area:', error);
      // TODO: Show error message to user
    }
  };
};

/**
 * Create area deletion confirmation handler
 */
export const createAreaDeleteHandler = (
  areaToDelete: InteractiveArea | null,
  sharedMap: any,
  setAreaToDelete: React.Dispatch<React.SetStateAction<InteractiveArea | null>>
) => {
  return async () => {
    if (areaToDelete) {
      try {
        await sharedMap.removeInteractiveArea(areaToDelete.id);
        setAreaToDelete(null);
      } catch (error) {
        console.error('Failed to delete area:', error);
        // TODO: Show error message to user
      }
    }
  };
};

/**
 * Create area drawn handler
 */
export const createAreaDrawnHandler = (
  pendingAreaData: Partial<InteractiveArea> | null,
  sharedMap: any,
  setDrawingMode: React.Dispatch<React.SetStateAction<boolean>>,
  setPendingAreaData: React.Dispatch<React.SetStateAction<Partial<InteractiveArea> | null>>,
  onAreaCreated?: () => void
) => {
  return async (bounds: AreaBounds) => {
    if (!pendingAreaData) return;

    try {
      // Create new area with drawn bounds
      const newArea: InteractiveArea = {
        id: `area_${Date.now()}`,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        ...pendingAreaData
      } as InteractiveArea;

      await sharedMap.addInteractiveArea(newArea);

      // Exit drawing mode
      setDrawingMode(false);
      setPendingAreaData(null);

      // Trigger immediate re-render callback
      if (onAreaCreated) {
        onAreaCreated();
      }
    } catch (error) {
      console.error('Failed to create area:', error);
      // TODO: Show error message to user
    }
  };
};

/**
 * Create collision area save handler
 */
export const createCollisionAreaSaveHandler = (
  editingArea: ImpassableArea | null,
  sharedMap: any,
  setShowAreaModal: React.Dispatch<React.SetStateAction<boolean>>,
  setEditingArea: React.Dispatch<React.SetStateAction<ImpassableArea | null>>,
  setPendingAreaData: React.Dispatch<React.SetStateAction<Partial<ImpassableArea> | null>>,
  setDrawingMode: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return async (areaData: Partial<ImpassableArea>) => {
    try {
      if (editingArea) {
        // Update existing collision area
        await sharedMap.updateCollisionArea(editingArea.id, areaData);
        setShowAreaModal(false);
        setEditingArea(null);
      } else {
        // For new collision areas, enter drawing mode
        setPendingAreaData(areaData);
        setDrawingMode(true);
        setShowAreaModal(false);
      }
    } catch (error) {
      console.error('Failed to save collision area:', error);
      // TODO: Show error message to user
    }
  };
};

/**
 * Create collision area deletion confirmation handler
 */
export const createCollisionAreaDeleteHandler = (
  areaToDelete: ImpassableArea | null,
  sharedMap: any,
  setAreaToDelete: React.Dispatch<React.SetStateAction<ImpassableArea | null>>
) => {
  return async () => {
    if (areaToDelete) {
      try {
        await sharedMap.removeCollisionArea(areaToDelete.id);
        setAreaToDelete(null);
      } catch (error) {
        console.error('Failed to delete collision area:', error);
        // TODO: Show error message to user
      }
    }
  };
};

/**
 * Create collision area drawn handler
 */
export const createCollisionAreaDrawnHandler = (
  pendingAreaData: Partial<ImpassableArea> | null,
  sharedMap: any,
  setDrawingMode: React.Dispatch<React.SetStateAction<boolean>>,
  setPendingAreaData: React.Dispatch<React.SetStateAction<Partial<ImpassableArea> | null>>,
  onAreaCreated?: () => void
) => {
  return async (bounds: AreaBounds) => {
    if (!pendingAreaData) return;

    try {
      // Create new collision area with drawn bounds
      const newArea: ImpassableArea = {
        id: `collision_${Date.now()}`,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        ...pendingAreaData
      };

      await sharedMap.addCollisionArea(newArea);

      // Exit drawing mode
      setDrawingMode(false);
      setPendingAreaData(null);

      // Trigger immediate re-render callback
      if (onAreaCreated) {
        onAreaCreated();
      }
    } catch (error) {
      console.error('Failed to create collision area:', error);
      // TODO: Show error message to user
    }
  };
};
