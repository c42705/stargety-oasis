/**
 * useEditorState Hook
 * 
 * Manages all editor state including tabs, shapes, viewport, grid, tools, modals, and drawing modes.
 * Uses Konva types exclusively (no Fabric.js).
 */

import { useState, useRef, useEffect } from 'react';
import type { EditorTool } from '../types/konva.types';
import type { GridConfig, Viewport, Shape, InteractiveArea, TabId, EditorStateReturn } from '../types';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS } from '../constants/konvaConstants';
import { logger } from '../../../shared/logger';

export function useEditorState(): EditorStateReturn {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('properties');
  
  // Shape state
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Viewport state
  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  
  // Grid state
  const [gridConfig, setGridConfig] = useState<GridConfig>(GRID_DEFAULTS);
  
  // Tool state (Konva types only)
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  
  // Interaction state
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>('default');
  
  // Modal state - Interactive Areas
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<InteractiveArea | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<InteractiveArea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Modal state - Collision Areas
  const [showCollisionAreaModal, setShowCollisionAreaModal] = useState(false);
  const [editingCollisionArea, setEditingCollisionArea] = useState<any | null>(null);
  const [collisionAreaToDelete, setCollisionAreaToDelete] = useState<any | null>(null);
  const [showCollisionDeleteConfirm, setShowCollisionDeleteConfirm] = useState(false);
  
  // Keyboard delete confirmation state
  const [showKeyboardDeleteConfirm, setShowKeyboardDeleteConfirm] = useState(false);
  const [shapesToDelete, setShapesToDelete] = useState<string[]>([]);
  
  // Drawing mode state
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingAreaData, setPendingAreaData] = useState<Partial<InteractiveArea> | null>(null);
  const [collisionDrawingMode, setCollisionDrawingMode] = useState(false);
  const [pendingCollisionAreaData, setPendingCollisionAreaData] = useState<any | null>(null);
  
  // Refs
  const stageRef = useRef<any>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  
  // Viewport measurement effect
  useEffect(() => {
    function updateSize() {
      if (mainRef.current) {
        const width = mainRef.current.offsetWidth;
        const height = mainRef.current.offsetHeight;
        logger.info('Konva viewport dimensions updated', { width, height });
        setViewportWidth(width);
        setViewportHeight(height);
      } else {
        logger.warn('mainRef.current is null in updateSize');
      }
    }

    // Try immediate update
    updateSize();

    // Also try after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(updateSize, 100);

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeoutId);
    };
  }, []);
  
  return {
    // Tab state
    activeTab,
    setActiveTab,
    
    // Shape state
    shapes,
    setShapes,
    selectedIds,
    setSelectedIds,
    
    // Viewport state
    viewport,
    setViewport,
    viewportWidth,
    viewportHeight,
    
    // Grid state
    gridConfig,
    setGridConfig,
    
    // Tool state
    currentTool,
    setCurrentTool,
    
    // Interaction state
    isSpacebarPressed,
    setIsSpacebarPressed,
    cursorStyle,
    setCursorStyle,
    
    // Modal state - Interactive Areas
    showAreaModal,
    setShowAreaModal,
    editingArea,
    setEditingArea,
    areaToDelete,
    setAreaToDelete,
    showDeleteConfirm,
    setShowDeleteConfirm,
    
    // Modal state - Collision Areas
    showCollisionAreaModal,
    setShowCollisionAreaModal,
    editingCollisionArea,
    setEditingCollisionArea,
    collisionAreaToDelete,
    setCollisionAreaToDelete,
    showCollisionDeleteConfirm,
    setShowCollisionDeleteConfirm,
    
    // Keyboard delete confirmation state
    showKeyboardDeleteConfirm,
    setShowKeyboardDeleteConfirm,
    shapesToDelete,
    setShapesToDelete,
    
    // Drawing mode state
    drawingMode,
    setDrawingMode,
    pendingAreaData,
    setPendingAreaData,
    collisionDrawingMode,
    setCollisionDrawingMode,
    pendingCollisionAreaData,
    setPendingCollisionAreaData,
    
    // Refs
    stageRef,
    mainRef,
  };
}

