// useEditorCoreState - Central state orchestration for Konva editor
// Replaces multiple useState calls in KonvaMapEditorModule

import { useState, useRef, useEffect, useMemo } from 'react';
import type { EditorState, Shape, Viewport, GridConfig, EditorTool, InteractiveArea } from '../types';
import type { TabId } from '../types/ui.types';

type ModalState<T> = T | null;

export const useEditorCoreState = () => {
  // Core
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ pan: { x: 0, y: 0 }, zoom: 1 });
  const [gridConfig, setGridConfig] = useState<GridConfig>({ visible: true, spacing: 20, opacity: 0.5, snapToGrid: false, pattern: 'dots', color: '#ddd' });
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  const [activeTab, setActiveTab] = useState<TabId>('properties');

  // Interaction
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<'default' | 'grab' | 'grabbing'>('default');

  // Modals
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<ModalState<any>>(null);
  const [areaToDelete, setAreaToDelete] = useState<InteractiveArea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCollisionAreaModal, setShowCollisionAreaModal] = useState(false);
  const [editingCollisionArea, setEditingCollisionArea] = useState<ModalState<any>>(null);
  const [collisionAreaToDelete, setCollisionAreaToDelete] = useState<any | null>(null);
  const [showCollisionDeleteConfirm, setShowCollisionDeleteConfirm] = useState(false);
  const [showKeyboardDeleteConfirm, setShowKeyboardDeleteConfirm] = useState(false);
  const [shapesToDelete, setShapesToDelete] = useState<string[]>([]);

  // Drawing
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingAreaData, setPendingAreaData] = useState<any>(null);
  const [collisionDrawingMode, setCollisionDrawingMode] = useState(false);
  const [pendingCollisionAreaData, setPendingCollisionAreaData] = useState<any>(null);

  // Refs
  const stageRef = useRef<any>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Viewport dims
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Resize effect
  useEffect(() => {
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry && mainRef.current) {
        setViewportWidth(entry.contentRect.width);
        setViewportHeight(entry.contentRect.height);
      }
    });
    if (mainRef.current) resizeObserver.observe(mainRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const currentEditorState = useMemo<EditorState>(() => ({
    viewport,
    grid: gridConfig,
    shapes,
    selection: { selectedIds, isMultiSelect: false, selectionRect: null },
    tool: { current: currentTool, previous: null, isActive: false },
    history: { past: [], future: [], maxSize: 50 },
    backgroundImage: '',
    backgroundImageDimensions: undefined,
    worldDimensions: { width: 800, height: 600 },
    isPreviewMode: false,
    isDirty: false,
  }), [viewport, gridConfig, shapes, selectedIds, currentTool]);

  return {
    shapes, setShapes,
    selectedIds, setSelectedIds,
    viewport, setViewport,
    gridConfig, setGridConfig,
    currentTool, setCurrentTool,
    activeTab, setActiveTab,
    showAreaModal, setShowAreaModal,
    editingArea, setEditingArea,
    areaToDelete, setAreaToDelete,
    showDeleteConfirm, setShowDeleteConfirm,
    showCollisionAreaModal, setShowCollisionAreaModal,
    editingCollisionArea, setEditingCollisionArea,
    collisionAreaToDelete, setCollisionAreaToDelete,
    showCollisionDeleteConfirm, setShowCollisionDeleteConfirm,
    showKeyboardDeleteConfirm, setShowKeyboardDeleteConfirm,
    shapesToDelete, setShapesToDelete,
    drawingMode, setDrawingMode,
    pendingAreaData, setPendingAreaData,
    collisionDrawingMode, setCollisionDrawingMode,
    pendingCollisionAreaData, setPendingCollisionAreaData,
    isSpacebarPressed, setIsSpacebarPressed,
    cursorStyle, setCursorStyle,
    stageRef,
    mainRef,
    viewportWidth,
    viewportHeight,
    currentEditorState
  };
};
