/**
 * useAreaHandlers Hook
 * 
 * Manages event handlers for interactive areas, collision areas, and keyboard delete operations.
 * Includes drawing complete handlers extracted from drawing hook callbacks.
 */

import { useCallback } from 'react';
import type { EditorTool } from '../types/konva.types';
import type { Shape, InteractiveArea, AreaHandlersReturn } from '../types';
import type { UseKonvaHistoryReturn } from '../types/hooks.types';
import { logger } from '../../../shared/logger';

interface UseAreaHandlersParams {
  // State setters
  setCurrentTool: (tool: EditorTool) => void;
  setShowAreaModal: (show: boolean) => void;
  setEditingArea: (area: InteractiveArea | null) => void;
  setAreaToDelete: (area: InteractiveArea | null) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowCollisionAreaModal: (show: boolean) => void;
  setEditingCollisionArea: (area: any | null) => void;
  setCollisionAreaToDelete: (area: any | null) => void;
  setShowCollisionDeleteConfirm: (show: boolean) => void;
  setShowKeyboardDeleteConfirm: (show: boolean) => void;
  setShapesToDelete: (ids: string[]) => void;
  setDrawingMode: (mode: boolean) => void;
  setPendingAreaData: (data: Partial<InteractiveArea> | null) => void;
  setCollisionDrawingMode: (mode: boolean) => void;
  setPendingCollisionAreaData: (data: any | null) => void;
  setShapes: (shapes: Shape[] | ((prev: Shape[]) => Shape[])) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  
  // State values
  editingArea: InteractiveArea | null;
  editingCollisionArea: any | null;
  areaToDelete: InteractiveArea | null;
  collisionAreaToDelete: any | null;
  shapesToDelete: string[];
  
  // MapData context functions
  addInteractiveArea: (area: InteractiveArea) => void;
  updateInteractiveArea: (id: string, updates: Partial<InteractiveArea>) => void;
  removeInteractiveArea: (id: string) => void;
  addCollisionArea: (area: any) => void;
  updateCollisionArea: (id: string, updates: any) => void;
  removeCollisionArea: (id: string) => void;
  
  // Other dependencies
  markDirty: () => void;
  history: UseKonvaHistoryReturn;
}

export function useAreaHandlers(params: UseAreaHandlersParams): AreaHandlersReturn {
  const {
    setCurrentTool,
    setShowAreaModal,
    setEditingArea,
    setAreaToDelete,
    setShowDeleteConfirm,
    setShowCollisionAreaModal,
    setEditingCollisionArea,
    setCollisionAreaToDelete,
    setShowCollisionDeleteConfirm,
    setShowKeyboardDeleteConfirm,
    setShapesToDelete,
    setDrawingMode,
    setPendingAreaData,
    setCollisionDrawingMode,
    setPendingCollisionAreaData,
    setShapes,
    setSelectedIds,
    editingArea,
    editingCollisionArea,
    areaToDelete,
    collisionAreaToDelete,
    shapesToDelete,
    addInteractiveArea,
    updateInteractiveArea,
    removeInteractiveArea,
    addCollisionArea,
    updateCollisionArea,
    removeCollisionArea,
    markDirty,
    history,
  } = params;

  // ===== INTERACTIVE AREA HANDLERS =====
  const handleCreateArea = useCallback(() => {
    setEditingArea(null);
    setShowAreaModal(true);
  }, [setEditingArea, setShowAreaModal]);

  const handleEditArea = useCallback((area: InteractiveArea) => {
    setEditingArea(area);
    setShowAreaModal(true);
  }, [setEditingArea, setShowAreaModal]);

  const handleDeleteArea = useCallback((area: InteractiveArea) => {
    setAreaToDelete(area);
    setShowDeleteConfirm(true);
  }, [setAreaToDelete, setShowDeleteConfirm]);

  const handleConfirmDeleteArea = useCallback(() => {
    if (areaToDelete) {
      removeInteractiveArea(areaToDelete.id);
      markDirty();
      setAreaToDelete(null);
      setShowDeleteConfirm(false);
    }
  }, [areaToDelete, removeInteractiveArea, markDirty, setAreaToDelete, setShowDeleteConfirm]);

  const handleAreaFormSubmit = useCallback((data: Partial<InteractiveArea>) => {
    if (editingArea) {
      // Update existing area
      logger.info('AREA_UPDATE_START', { areaId: editingArea.id, data });
      updateInteractiveArea(editingArea.id, data);
      markDirty();
      setShowAreaModal(false);
      setEditingArea(null);
      logger.info('AREA_UPDATE_COMPLETE', { areaId: editingArea.id });
    } else {
      // For new areas, save the data and enter drawing mode
      logger.info('AREA_CREATE_START', { data });
      setPendingAreaData(data);
      setShowAreaModal(false);
      setDrawingMode(true);
      setCurrentTool('rect');
      logger.info('AREA_CREATE_DRAWING_MODE_ENABLED', {
        pendingData: data,
        drawingMode: true,
        currentTool: 'rect'
      });
    }
  }, [editingArea, updateInteractiveArea, markDirty, setShowAreaModal, setEditingArea, setPendingAreaData, setDrawingMode, setCurrentTool]);

  const handleAreaFormCancel = useCallback(() => {
    setShowAreaModal(false);
    setEditingArea(null);
  }, [setShowAreaModal, setEditingArea]);

  const handleAreaDrawingComplete = useCallback((shape: Shape) => {
    // This will be called from the main component when rect drawing completes
    logger.info('AREA_DRAWING_COMPLETE', { shapeId: shape.id });
  }, []);

  // ===== COLLISION AREA HANDLERS =====
  const handleCreateCollisionArea = useCallback(() => {
    setEditingCollisionArea(null);
    setShowCollisionAreaModal(true);
  }, [setEditingCollisionArea, setShowCollisionAreaModal]);

  const handleEditCollisionArea = useCallback((area: any) => {
    setEditingCollisionArea(area);
    setShowCollisionAreaModal(true);
  }, [setEditingCollisionArea, setShowCollisionAreaModal]);

  const handleDeleteCollisionArea = useCallback((area: any) => {
    setCollisionAreaToDelete(area);
    setShowCollisionDeleteConfirm(true);
  }, [setCollisionAreaToDelete, setShowCollisionDeleteConfirm]);

  const handleConfirmDeleteCollisionArea = useCallback(() => {
    if (collisionAreaToDelete) {
      removeCollisionArea(collisionAreaToDelete.id);
      markDirty();
      setCollisionAreaToDelete(null);
      setShowCollisionDeleteConfirm(false);
    }
  }, [collisionAreaToDelete, removeCollisionArea, markDirty, setCollisionAreaToDelete, setShowCollisionDeleteConfirm]);

  const handleCollisionAreaFormSubmit = useCallback((data: any) => {
    logger.info('COLLISION_AREA_FORM_SUBMITTED', { data });

    if (editingCollisionArea) {
      // Update existing collision area
      logger.info('COLLISION_AREA_UPDATE', { areaId: editingCollisionArea.id });
      updateCollisionArea(editingCollisionArea.id, data);
      markDirty();
      setShowCollisionAreaModal(false);
      setEditingCollisionArea(null);
    } else {
      // For new collision areas, save the data and enter drawing mode
      logger.info('COLLISION_AREA_CREATE_DRAWING_MODE', { drawingMode: data.drawingMode });
      setPendingCollisionAreaData(data);
      setShowCollisionAreaModal(false);
      setCollisionDrawingMode(true);
      // Set tool based on drawing mode from the form
      if (data.drawingMode === 'rectangle') {
        logger.info('COLLISION_AREA_TOOL_RECT');
        setCurrentTool('rect');
      } else {
        logger.info('COLLISION_AREA_TOOL_POLYGON');
        setCurrentTool('polygon');
      }
    }
  }, [editingCollisionArea, updateCollisionArea, markDirty, setShowCollisionAreaModal, setEditingCollisionArea, setPendingCollisionAreaData, setCollisionDrawingMode, setCurrentTool]);

  const handleCollisionAreaFormCancel = useCallback(() => {
    setShowCollisionAreaModal(false);
    setEditingCollisionArea(null);
  }, [setShowCollisionAreaModal, setEditingCollisionArea]);

  const handleCollisionAreaDrawingComplete = useCallback((shape: Shape) => {
    // This will be called from the main component when polygon/rect drawing completes
    logger.info('COLLISION_AREA_DRAWING_COMPLETE', { shapeId: shape.id });
  }, []);

  // ===== KEYBOARD DELETE HANDLERS =====
  const handleKeyboardDelete = useCallback((event: KeyboardEvent) => {
    // This is called from keyboard shortcuts hook
    // The actual logic is in the keyboard shortcuts hook
    logger.info('KEYBOARD_DELETE_TRIGGERED', { key: event.key });
  }, []);

  const handleConfirmKeyboardDelete = useCallback(() => {
    if (shapesToDelete.length > 0) {
      // Delete the shapes
      setShapes(prev => prev.filter(s => !shapesToDelete.includes(s.id)));
      setSelectedIds([]);
      markDirty();
      history.pushState('Delete shapes');

      // Log deletion
      logger.info('SHAPES_DELETED_VIA_KEYBOARD', {
        count: shapesToDelete.length,
        ids: shapesToDelete
      });

      // Reset state
      setShapesToDelete([]);
      setShowKeyboardDeleteConfirm(false);
    }
  }, [shapesToDelete, setShapes, setSelectedIds, markDirty, history, setShapesToDelete, setShowKeyboardDeleteConfirm]);

  const handleCancelKeyboardDelete = useCallback(() => {
    setShowKeyboardDeleteConfirm(false);
    setShapesToDelete([]);
  }, [setShowKeyboardDeleteConfirm, setShapesToDelete]);

  return {
    interactive: {
      handleCreateArea,
      handleEditArea,
      handleDeleteArea,
      handleConfirmDeleteArea,
      handleAreaFormSubmit,
      handleAreaFormCancel,
      handleAreaDrawingComplete,
    },
    collision: {
      handleCreateCollisionArea,
      handleEditCollisionArea,
      handleDeleteCollisionArea,
      handleConfirmDeleteCollisionArea,
      handleCollisionAreaFormSubmit,
      handleCollisionAreaFormCancel,
      handleCollisionAreaDrawingComplete,
    },
    handleKeyboardDelete,
    handleConfirmKeyboardDelete,
    handleCancelKeyboardDelete,
  };
}

