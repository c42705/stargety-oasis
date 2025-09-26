/**
 * Enhanced Fabric.js Canvas for Map Editor
 * 
 * This component provides advanced canvas functionality for the Map Editor,
 * including mouse-based object manipulation, layer management, and real-time
 * synchronization with the shared map system.
 * 
 * TODO: Future Enhancements
 * - Add multi-selection and group operations
 * - Implement snap-to-grid functionality
 * - Add copy/paste operations with clipboard integration
 * - Implement advanced layer blending modes
 * - Add collaborative cursor tracking for multi-user editing
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as fabric from 'fabric';
// import { useSharedMap } from '../../shared/useSharedMap';
import { useSharedMapCompat as useSharedMap } from '../../stores/useSharedMapCompat';
import { SharedMapSystem } from '../../shared/SharedMapSystem';
import { InteractiveArea, ImpassableArea } from '../../shared/MapDataContext';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
/* Remove custom camera logic: Fabric.js viewportTransform will handle pan/zoom */
/* Pan tool logic is now implemented directly—no usePanControls import */
import { BackgroundInfoPanel } from './components/BackgroundInfoPanel';
import { GRID_PATTERNS } from './constants/editorConstants';
import {
  optimizeCanvasRendering,
  CanvasPerformanceMonitor,
  shouldOptimizePerformance
} from './utils/performanceUtils';
import './FabricMapCanvas.css';

interface FabricMapCanvasProps {
  width: number;
  height: number;
  gridVisible: boolean;
  gridSpacing: number;
  gridPattern: string;
  gridOpacity: number;
  onSelectionChanged?: (selectedObjects: fabric.Object[]) => void;
  onObjectModified?: (object: fabric.Object) => void;
  onAreaDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  onCollisionAreaDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  drawingMode?: boolean;
  collisionDrawingMode?: boolean;
  drawingAreaData?: Partial<InteractiveArea>;
  drawingCollisionAreaData?: Partial<ImpassableArea>;
  className?: string;
  // cameraControls removed
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  currentTool?: 'select' | 'pan' | 'draw-collision' | 'erase-collision';
  /** Called whenever zoom changes (e.g. wheel, button, fit) */
  onZoomChange?: (zoom: number) => void;
  backgroundInfoPanelVisible?: boolean;
  onBackgroundInfoPanelClose?: () => void;
}

interface CanvasObject extends fabric.Object {
  mapElementId?: string;
  mapElementType?: 'interactive' | 'collision';
  mapElementData?: InteractiveArea | ImpassableArea;
}



export const FabricMapCanvas: React.FC<FabricMapCanvasProps> = ({
  width,
  height,
  gridVisible,
  gridSpacing,
  gridPattern,
  gridOpacity,
  onSelectionChanged,
  onObjectModified,
  onAreaDrawn,
  onCollisionAreaDrawn,
  drawingMode = false,
  collisionDrawingMode = false,
  drawingAreaData,
  drawingCollisionAreaData,
  className = '',
  onCanvasReady,
  currentTool = 'select',
  onZoomChange,
  backgroundInfoPanelVisible = false,
  onBackgroundInfoPanelClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingRect, setDrawingRect] = useState<fabric.Rect | null>(null);
  const [drawingText, setDrawingText] = useState<fabric.Text | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isValidSize, setIsValidSize] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [areasToDelete, setAreasToDelete] = useState<{ id: string; name: string }[]>([]);
  const [forceRender, setForceRender] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const performanceMonitorRef = useRef<CanvasPerformanceMonitor | null>(null);

  // Always-fresh ref for tool
  const currentToolRef = useRef(currentTool);
  currentToolRef.current = currentTool;

  // Background info panel state managed by parent component

  // Pan tool is now handled directly in event handlers. usePanControls is no longer used.

  // Log initialization state changes for debugging
  useEffect(() => {
    console.log('🔄 CANVAS INITIALIZATION STATE:', {
      isInitialized,
      isBackgroundReady,
      isElementsReady,
      canvasExists: !!fabricCanvasRef.current
    });
  }, [isInitialized, isBackgroundReady, isElementsReady]);

  // Constants
  const MIN_AREA_SIZE = 90;

  // Utility function to get contrasting text color
  const getContrastColor = (hexColor: string): string => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Auto-save is now controlled entirely by the Zustand store
  const sharedMap = useSharedMap({
    source: 'editor'
    // Note: autoSave parameter removed - controlled by store toggle only
  });

  // Handle object modification and sync with shared map (with debouncing)
  const handleObjectModified = useCallback(async (object: CanvasObject) => {
    if (!object.mapElementId || !object.mapElementType) return;

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates to avoid excessive localStorage writes
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        const updates = {
          x: Math.round(object.left || 0),
          y: Math.round(object.top || 0),
          width: Math.round((object.width || 0) * (object.scaleX || 1)),
          height: Math.round((object.height || 0) * (object.scaleY || 1))
        };

        if (object.mapElementType === 'interactive' && object.mapElementId) {
          await sharedMap.updateInteractiveArea(object.mapElementId, updates);
        } else if (object.mapElementType === 'collision' && object.mapElementId) {
          await sharedMap.updateCollisionArea(object.mapElementId, updates);
        }
      } catch (error) {
        console.error('Failed to update map element:', error);
      }
    }, 300); // 300ms debounce
  }, [sharedMap]);

  // Snap object to grid
  const snapToGrid = useCallback((object: fabric.Object, spacing: number) => {
    const left = Math.round((object.left || 0) / spacing) * spacing;
    const top = Math.round((object.top || 0) / spacing) * spacing;
    object.set({ left, top });
  }, []);

  // Handle real-time object movement (immediate visual feedback only)
  const handleObjectMoving = useCallback((object: CanvasObject) => {
    // Snap to grid if enabled
    if (gridVisible && gridSpacing > 0) {
      snapToGrid(object, gridSpacing);
    }

    // Note: onObjectModified is NOT called here to prevent excessive callbacks during drag
    // The callback will be triggered only when the transformation is complete (object:modified event)
  }, [gridVisible, gridSpacing, snapToGrid]);

  // Handle real-time object scaling (immediate visual feedback only)
  const handleObjectScaling = useCallback((object: CanvasObject) => {
    // Note: Aspect ratio maintenance can be implemented here if needed
    // For now, we just provide visual feedback without triggering callbacks

    // Note: onObjectModified is NOT called here to prevent excessive callbacks during scaling
    // The callback will be triggered only when the transformation is complete (object:modified event)
  }, []);



  // Drawing mode handlers
  const handleDrawingStart = useCallback((pointer: fabric.Point) => {
    if (!fabricCanvasRef.current || (!drawingMode && !collisionDrawingMode)) return;

    const canvas = fabricCanvasRef.current;
    setIsDrawing(true);
    setStartPoint({ x: pointer.x, y: pointer.y });
    setIsValidSize(false);

    // Create preview rectangle with appropriate styling
    let rectColor, rectFill, textLabel;
    if (collisionDrawingMode) {
      rectColor = '#ef4444';
      rectFill = 'rgba(239, 68, 68, 0.3)';
      textLabel = drawingCollisionAreaData?.name || 'Collision Area';
    } else {
      rectColor = drawingAreaData?.color || '#4A90E2';
      rectFill = drawingAreaData?.color || '#4A90E2';
      textLabel = drawingAreaData?.name || 'New Area';
    }

    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: rectFill,
      fillOpacity: 0.3,
      stroke: rectColor,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    });

    // Create preview text label
    const text = new fabric.Text(textLabel, {
      left: pointer.x,
      top: pointer.y,
      fontSize: 14,
      fill: '#333',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      visible: false // Initially hidden until area is large enough
    });

    setDrawingRect(rect);
    setDrawingText(text);
    canvas.add(rect);
    canvas.add(text);
    canvas.renderAll();
  }, [drawingMode, collisionDrawingMode, drawingAreaData, drawingCollisionAreaData]);

  const handleDrawingMove = useCallback((pointer: fabric.Point) => {
    if (!fabricCanvasRef.current || !isDrawing || !startPoint || !drawingRect) return;

    const width = Math.abs(pointer.x - startPoint.x);
    const height = Math.abs(pointer.y - startPoint.y);
    const left = Math.min(pointer.x, startPoint.x);
    const top = Math.min(pointer.y, startPoint.y);

    // Check if size meets minimum requirements
    const meetsMinSize = width >= MIN_AREA_SIZE && height >= MIN_AREA_SIZE;
    setIsValidSize(meetsMinSize);

    // Update rectangle appearance based on size validation and drawing type
    let strokeColor: string;
    if (collisionDrawingMode) {
      strokeColor = meetsMinSize ? '#ef4444' : '#ff4d4f';
    } else {
      strokeColor = meetsMinSize ? (drawingAreaData?.color || '#4A90E2') : '#ff4d4f';
    }
    const fillOpacity = meetsMinSize ? 0.3 : 0.1;

    drawingRect.set({
      left,
      top,
      width,
      height,
      stroke: strokeColor,
      fillOpacity
    });

    // Update text position and visibility
    if (drawingText) {
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      drawingText.set({
        left: centerX,
        top: centerY,
        visible: meetsMinSize && width > 60 && height > 30 // Show text only if area is large enough
      });
    }

    fabricCanvasRef.current.renderAll();
  }, [isDrawing, startPoint, drawingRect, drawingText, drawingAreaData, collisionDrawingMode, MIN_AREA_SIZE]);

  const handleDrawingEnd = useCallback(() => {
    if (!fabricCanvasRef.current || !isDrawing || !startPoint || !drawingRect) return;

    const canvas = fabricCanvasRef.current;
    let bounds = {
      x: Math.round(drawingRect.left || 0),
      y: Math.round(drawingRect.top || 0),
      width: Math.round(drawingRect.width || 0),
      height: Math.round(drawingRect.height || 0)
    };

    // Clean up preview elements
    canvas.remove(drawingRect);
    if (drawingText) {
      canvas.remove(drawingText);
      setDrawingText(null);
    }

    // Reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
    setDrawingRect(null);
    setIsValidSize(false);

    // Enforce minimum size constraints
    if (bounds.width < MIN_AREA_SIZE || bounds.height < MIN_AREA_SIZE) {
      // Auto-expand to minimum size if close enough (within 20px)
      if (bounds.width > MIN_AREA_SIZE - 20 && bounds.height > MIN_AREA_SIZE - 20) {
        if (bounds.width < MIN_AREA_SIZE) {
          const expansion = MIN_AREA_SIZE - bounds.width;
          bounds.width = MIN_AREA_SIZE;
          bounds.x = Math.max(0, bounds.x - expansion / 2);
        }
        if (bounds.height < MIN_AREA_SIZE) {
          const expansion = MIN_AREA_SIZE - bounds.height;
          bounds.height = MIN_AREA_SIZE;
          bounds.y = Math.max(0, bounds.y - expansion / 2);
        }
      } else {
        // Show validation message for areas that are too small
        console.warn(`Area too small: ${bounds.width}×${bounds.height}px. Minimum size is ${MIN_AREA_SIZE}×${MIN_AREA_SIZE}px`);
        canvas.renderAll();
        return;
      }
    }

    // Create the area if it meets size requirements
    if (collisionDrawingMode && onCollisionAreaDrawn) {
      onCollisionAreaDrawn(bounds);
      console.log(`Collision area created successfully (${bounds.width}×${bounds.height}px)`);
    } else if (onAreaDrawn) {
      onAreaDrawn(bounds);
      console.log(`Interactive area created successfully (${bounds.width}×${bounds.height}px)`);
    }

    // Force immediate re-render of areas after creation
    setTimeout(() => {
      setForceRender(prev => prev + 1);
    }, 100);

    canvas.renderAll();
  }, [isDrawing, startPoint, drawingRect, drawingText, onAreaDrawn, onCollisionAreaDrawn, collisionDrawingMode, MIN_AREA_SIZE]);

  // Handle deletion of selected areas
  const handleDeleteSelectedAreas = useCallback((selectedObjects: fabric.Object[]) => {
    if (!fabricCanvasRef.current) return;

    const areas: { id: string; name: string }[] = [];

    // Collect area data to delete
    selectedObjects.forEach(obj => {
      const mapData = (obj as any).mapElementData;
      if (mapData && mapData.id) {
        areas.push({ id: mapData.id, name: mapData.name || 'Unnamed Area' });
      }
    });

    if (areas.length === 0) return;

    // Show confirmation dialog
    setAreasToDelete(areas);
    setShowDeleteDialog(true);
  }, []);

  // Confirm deletion
  const handleConfirmDeletion = useCallback(async () => {
    if (!fabricCanvasRef.current || areasToDelete.length === 0) return;

    const canvas = fabricCanvasRef.current;

    try {
      // Remove from shared map system
      for (const area of areasToDelete) {
        await sharedMap.removeInteractiveArea(area.id);
      }

      // Remove from canvas
      const activeObjects = canvas.getActiveObjects();
      activeObjects.forEach(obj => {
        const mapData = (obj as any).mapElementData;
        if (mapData && areasToDelete.some(area => area.id === mapData.id)) {
          canvas.remove(obj);
        }
      });

      canvas.discardActiveObject();
      canvas.renderAll();

      // Show success message
      const deletedCount = areasToDelete.length;
      console.log(`${deletedCount} area${deletedCount > 1 ? 's' : ''} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete areas:', error);
    } finally {
      setShowDeleteDialog(false);
      setAreasToDelete([]);
    }
  }, [areasToDelete, sharedMap]);

  // Cancel deletion
  const handleCancelDeletion = useCallback(() => {
    setShowDeleteDialog(false);
    setAreasToDelete([]);
  }, []);

  // Initialize Fabric.js canvas - runs only once to prevent recreation
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: 'transparent',
        selection: true,
        preserveObjectStacking: true,
        renderOnAddRemove: true,
        skipTargetFind: false,
        allowTouchScrolling: false,
        imageSmoothingEnabled: false
      });

      // Configure canvas controls
      fabric.Object.prototype.set({
        transparentCorners: false,
        cornerColor: '#4A90E2',
        cornerStyle: 'circle',
        cornerSize: 8,
        borderColor: '#4A90E2',
        borderScaleFactor: 2,
        hasRotatingPoint: true,
        rotatingPointOffset: 30
      });

      fabricCanvasRef.current = canvas;
      // Reset all initialization states when canvas is recreated
      setIsBackgroundReady(false);
      setIsElementsReady(false);
      setIsInitialized(true);

      console.log('🚀 FABRIC CANVAS INITIALIZED:', { width, height });

      // Detect and fix any dimension mismatches
      setTimeout(async () => {
        try {
          const mapSystem = SharedMapSystem.getInstance();
          await mapSystem.detectAndUpdateImageDimensions();
          console.log('✅ DIMENSION DETECTION COMPLETED ON CANVAS INIT');
        } catch (error) {
          console.warn('⚠️ DIMENSION DETECTION FAILED ON CANVAS INIT:', error);
        }
      }, 100);

      // Initialize performance monitoring for high zoom levels
      performanceMonitorRef.current = new CanvasPerformanceMonitor(canvas);

      // Apply initial performance optimizations
      const currentZoom = canvas.getZoom();
      if (shouldOptimizePerformance(currentZoom)) {
        optimizeCanvasRendering(canvas, currentZoom);
        performanceMonitorRef.current.startMonitoring();
        console.log('🚀 Performance optimizations enabled for zoom level:', currentZoom);
      }

      // Notify parent component that canvas is ready
      if (onCanvasReady) {
        onCanvasReady(canvas);
      }

      // Set up event listeners
      setupCanvasEventListeners(canvas);

      return () => {
        // Cleanup performance monitor
        if (performanceMonitorRef.current) {
          performanceMonitorRef.current.stopMonitoring();
          performanceMonitorRef.current = null;
        }

        canvas.dispose();
        fabricCanvasRef.current = null;
        setIsInitialized(false);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - canvas should only be created once

  // Configure canvas for current tool - separate effect for tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas && isInitialized) {
      const isInDrawingMode = drawingMode || collisionDrawingMode;
      const isPanTool = currentTool === 'pan';

      if (isInDrawingMode) {
        canvas.selection = false; // Disable selection during drawing
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
        canvas.moveCursor = 'crosshair';
      } else if (isPanTool) {
        canvas.selection = false; // Disable selection in pan mode
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
        canvas.moveCursor = 'grab';
      } else {
        canvas.selection = true; // Enable selection for other tools
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.moveCursor = 'move';
      }
    }
  }, [drawingMode, collisionDrawingMode, currentTool, isInitialized]);

  // Handle canvas resizing without recreation
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas && isInitialized) {
      // Resize canvas while preserving all objects and references
      canvas.setDimensions({ width, height });
      canvas.renderAll();

      // Force background image update when dimensions change
      console.log('🔄 CANVAS DIMENSIONS CHANGED, WILL TRIGGER BACKGROUND UPDATE');
      // Note: Background update will be triggered by the backgroundImageUrl dependency
    }
  }, [width, height, isInitialized]);

  // Set up canvas event listeners (CLEAN PAN TOOL IMPLEMENTATION)
  const setupCanvasEventListeners = useCallback((canvas: fabric.Canvas) => {
    // Selection events
    canvas.on('selection:created', (e) => {
      const selectedObjects = e.selected || [];
      onSelectionChanged?.(selectedObjects);
    });

    canvas.on('selection:updated', (e) => {
      const selectedObjects = e.selected || [];
      onSelectionChanged?.(selectedObjects);
    });

    canvas.on('selection:cleared', () => {
      onSelectionChanged?.([]);
    });

    // Object modification events
    canvas.on('object:modified', async (e) => {
      const object = e.target as CanvasObject;
      if (object && object.mapElementId && object.mapElementType) {
        await handleObjectModified(object);
      }
      onObjectModified?.(object);
    });

    // Object movement events
    canvas.on('object:moving', (e) => {
      const object = e.target as CanvasObject;
      if (object) {
        handleObjectMoving(object);
      }
    });

    // Object scaling events
    canvas.on('object:scaling', (e) => {
      const object = e.target as CanvasObject;
      if (object) {
        handleObjectScaling(object);
      }
    });

    // --- NATIVE FABRIC.JS PAN/ZOOM IMPLEMENTATION ---
    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let panMoveThrottle = false;
    let lastViewportTransform: number[] = [];

    // PAN TOOL: Mouse drag to pan via viewportTransform
    canvas.on('mouse:down', (e) => {
      const mouseEvent = e.e as MouseEvent;
      const tool = currentToolRef.current;

      // Enable panning if (pan tool + left click) OR (middle mouse, any tool)
      if ((tool === 'pan' && mouseEvent.button === 0) || mouseEvent.button === 1) {
        isDragging = true;
        lastPosX = mouseEvent.clientX;
        lastPosY = mouseEvent.clientY;
        lastViewportTransform = [...(canvas.viewportTransform ?? [1,0,0,1,0,0])];
        canvas.defaultCursor = 'grabbing';
        canvas.selection = false;
        panMoveThrottle = false;
        e.e?.preventDefault();
        e.e?.stopPropagation();
        return;
      }
    });

    canvas.on('mouse:move', (e) => {
      const mouseEvent = e.e as MouseEvent;
      const tool = currentToolRef.current;
      // Allow panning if pan tool is active OR middle mouse is being dragged
      if ((tool === 'pan' && isDragging) || (isDragging && (e.e as MouseEvent).buttons & 4)) {
        if (!panMoveThrottle) {
          panMoveThrottle = true;
          const dx = mouseEvent.clientX - lastPosX;
          const dy = mouseEvent.clientY - lastPosY;
          // Update viewportTransform (translate only)
          const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0];
          vpt[4] = lastViewportTransform[4] + dx;
          vpt[5] = lastViewportTransform[5] + dy;
          canvas.setViewportTransform(vpt);
          setTimeout(() => { panMoveThrottle = false; }, 16);
        }
        e.e?.preventDefault();
        e.e?.stopPropagation();
        return;
      }
    });

    canvas.on('mouse:up', (e) => {
      // End drag pan on mouse up (for either pan tool or middle mouse)
      if (isDragging) {
        isDragging = false;
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
        panMoveThrottle = false;
        e.e?.preventDefault();
        e.e?.stopPropagation();
        return;
      }
    });

    // NATIVE FABRIC.JS ZOOM (mouse wheel)
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.1, Math.min(zoom, 4)); // Clamp zoom between 0.1 and 4

      // Zoom to mouse pointer
      canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);

      // Notify parent of zoom change
      if (typeof onZoomChange === "function") {
        onZoomChange(zoom);
      }

      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Keyboard event handling for deletion
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          e.preventDefault();
          handleDeleteSelectedAreas(activeObjects);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSelectionChanged, onObjectModified, drawingMode, collisionDrawingMode, currentTool, handleObjectModified, handleObjectMoving, handleObjectScaling, handleDeleteSelectedAreas]);



  // Update canvas size
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({ width, height });
      fabricCanvasRef.current.renderAll();
    }
  }, [width, height]);

  // Update canvas selection behavior based on current tool
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      const isInDrawingMode = drawingMode || collisionDrawingMode;
      const isPanTool = currentTool === 'pan';
      const shouldDisableSelection = isInDrawingMode || isPanTool;

      canvas.selection = !shouldDisableSelection;

      if (isInDrawingMode) {
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else if (isPanTool) {
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
      } else {
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.moveCursor = 'move';
      }

      // Disable object selection in drawing mode or pan mode
      canvas.forEachObject((obj) => {
        obj.selectable = !shouldDisableSelection;
        obj.evented = !shouldDisableSelection;
      });

      canvas.renderAll();
    }
  }, [drawingMode, collisionDrawingMode, currentTool]);

  // Handle background image changes - use a stable reference to prevent constant re-renders
  const backgroundImageUrl = useMemo(() => {
    const bgImage = sharedMap.mapData?.backgroundImage;
    console.log('🖼️ BACKGROUND: Background image URL computed', {
      timestamp: new Date().toISOString(),
      hasBackgroundImage: !!bgImage,
      backgroundImageType: bgImage ? (bgImage.startsWith('data:') ? 'data-url' : 'external-url') : 'none',
      backgroundImageLength: bgImage?.length || 0,
      backgroundImagePreview: bgImage ? bgImage.substring(0, 50) + '...' : 'none',
      mapDataExists: !!sharedMap.mapData,
      source: 'FabricMapCanvas.backgroundImageUrl.useMemo'
    });
    return bgImage;
  }, [sharedMap.mapData]);

  // Update background image with cover mode scaling (same as game world)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateBackgroundImage = useCallback(() => {
    console.log('🖼️ BACKGROUND: updateBackgroundImage called', {
      timestamp: new Date().toISOString(),
      hasCanvas: !!fabricCanvasRef.current,
      hasMapData: !!sharedMap.mapData,
      backgroundImageUrl: backgroundImageUrl ? backgroundImageUrl.substring(0, 50) + '...' : 'none',
      source: 'FabricMapCanvas.updateBackgroundImage'
    });

    const canvas = fabricCanvasRef.current;
    if (!canvas || !sharedMap.mapData) {
      console.warn('🖼️ BACKGROUND: Cannot update background - missing canvas or map data', {
        timestamp: new Date().toISOString(),
        hasCanvas: !!canvas,
        hasMapData: !!sharedMap.mapData
      });
      return;
    }

    console.log('🖼️ BACKGROUND: Starting background update process', {
      timestamp: new Date().toISOString(),
      hasBackgroundImage: !!sharedMap.mapData.backgroundImage,
      canvasSize: { width: canvas.width, height: canvas.height },
      canvasObjectCount: canvas.getObjects().length
    });

    // Background info panel status is managed by parent component

    // Remove existing background image
    const existingBackground = canvas.getObjects().find(obj =>
      (obj as any).isBackgroundImage === true || (obj as any).backgroundImageId === 'map-background-image'
    );
    if (existingBackground) {
      console.log('🗑️ BACKGROUND: Removing existing background image', {
        timestamp: new Date().toISOString(),
        existingBackgroundType: existingBackground.type,
        existingBackgroundId: (existingBackground as any).backgroundImageId,
        isBackgroundImage: (existingBackground as any).isBackgroundImage
      });
      canvas.remove(existingBackground);
      // Clear the reference since we're replacing it
      (canvas as any)._backgroundImageRef = null;
    } else {
      console.log('🖼️ BACKGROUND: No existing background image found to remove');
    }

    // Add new background image if available
    if (backgroundImageUrl) {
      console.log('🖼️ BACKGROUND: Starting Fabric.js image loading', {
        timestamp: new Date().toISOString(),
        backgroundImageUrl: backgroundImageUrl.substring(0, 100) + '...',
        backgroundImageLength: backgroundImageUrl.length,
        canvasSize: { width: canvas.width, height: canvas.height }
      });

      // Determine if we need crossOrigin based on URL type
      const isDataUrl = backgroundImageUrl.startsWith('data:');
      const fabricOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as any };

      console.log('🖼️ BACKGROUND: Fabric.js loading configuration', {
        timestamp: new Date().toISOString(),
        isDataUrl,
        fabricOptions,
        willUseCrossOrigin: !isDataUrl
      });

      fabric.Image.fromURL(backgroundImageUrl, fabricOptions).then((img: fabric.Image) => {
        console.log('🖼️ BACKGROUND: Fabric.js image loading completed', {
          timestamp: new Date().toISOString(),
          hasCanvas: !!canvas,
          hasImage: !!img,
          imageType: img?.type,
          imageWidth: img?.width,
          imageHeight: img?.height
        });

        if (!canvas || !img) {
          console.error('❌ BACKGROUND: Failed to create fabric image from background', {
            timestamp: new Date().toISOString(),
            hasCanvas: !!canvas,
            hasImage: !!img,
            backgroundImageUrl: backgroundImageUrl.substring(0, 50) + '...'
          });
          return;
        }

        // Get canvas and image dimensions
        const canvasWidth = canvas.width!;
        const canvasHeight = canvas.height!;
        const imageWidth = img.width!;
        const imageHeight = img.height!;

        console.log('🖼️ BACKGROUND IMAGE DIMENSIONS:', {
          canvas: { width: canvasWidth, height: canvasHeight },
          image: { width: imageWidth, height: imageHeight }
        });

        // For the Map Editor, we want to show the image at its actual size
        // without scaling, so users can see the full detail
        // The canvas should match the image dimensions
        img.set({
          left: 0,
          top: 0,
          scaleX: 1,
          scaleY: 1,
          selectable: false,
          evented: false,
          excludeFromExport: false,
          originX: 'left',
          originY: 'top'
        });

        // Mark as background image for identification - SET IMMEDIATELY
        (img as any).isBackgroundImage = true;
        (img as any).selectable = false;
        (img as any).evented = false;
        (img as any).excludeFromExport = false;
        (img as any).backgroundImageId = 'map-background-image';
        (img as any).mapElementType = 'background';

        // Store background image reference BEFORE adding to canvas
        (canvas as any)._backgroundImageRef = img;

        // Add event listener to maintain properties if they get lost
        img.on('added', () => {
          (img as any).isBackgroundImage = true;
          (img as any).backgroundImageId = 'map-background-image';
          (img as any).mapElementType = 'background';

          // Lock background image by default to prevent accidental modification
          (img as any).locked = true;
          img.selectable = false;
          img.evented = false;
          img.hoverCursor = 'default';
          img.moveCursor = 'default';
        });

        console.log('🖼️ BACKGROUND IMAGE CONFIGURED:', {
          position: { left: 0, top: 0 },
          scale: { x: 1, y: 1 },
          size: { width: imageWidth, height: imageHeight },
          hasBackgroundProperty: (img as any).isBackgroundImage,
          locked: (img as any).locked,
          selectable: img.selectable,
          evented: img.evented
        });

        // Add to canvas and send to back (behind grid and other elements)
        canvas.add(img);
        canvas.sendObjectToBack(img);

        console.log('🖼️ BACKGROUND IMAGE ADDED TO FABRIC CANVAS');

        // Verify the background image was added correctly
        const addedObjects = canvas.getObjects();
        const backgroundCount = addedObjects.filter(obj => (obj as any).isBackgroundImage).length;
        console.log('🔍 IMMEDIATE BACKGROUND VERIFICATION:', {
          totalObjects: addedObjects.length,
          backgroundImages: backgroundCount,
          backgroundImageVisible: backgroundCount > 0,
          imageProperties: {
            isBackgroundImage: (img as any).isBackgroundImage,
            locked: (img as any).locked,
            selectable: img.selectable,
            evented: img.evented
          }
        });

        // Immediate render to ensure visibility
        canvas.renderAll();

        // Force layer order update after a brief delay to ensure background is maintained
        setTimeout(() => {
          const bgImg = canvas.getObjects().find(obj => (obj as any).isBackgroundImage);
          if (bgImg) {
            canvas.sendObjectToBack(bgImg);
            canvas.renderAll();
            console.log('🖼️ BACKGROUND IMAGE LAYER ORDER ENFORCED');

            // Log final state
            const allObjects = canvas.getObjects();
            const bgImages = allObjects.filter(obj => (obj as any).isBackgroundImage);
            console.log('🖼️ FINAL BACKGROUND STATE:', {
              totalObjects: allObjects.length,
              backgroundImages: bgImages.length,
              backgroundImageVisible: bgImages.length > 0,
              backgroundImagePosition: bgImages[0] ? {
                left: bgImages[0].left,
                top: bgImages[0].top,
                width: bgImages[0].width,
                height: bgImages[0].height,
                scaleX: bgImages[0].scaleX,
                scaleY: bgImages[0].scaleY
              } : null
            });

            // Mark background as ready and trigger coordinated layer order update
            setTimeout(() => {
              // Background image fully integrated - marking ready
              setIsBackgroundReady(true);
              updateLayerOrder(true); // Skip background check since we just added it // eslint-disable-line react-hooks/exhaustive-deps
              // Background info panel success handled by parent
            }, 50);
          } else {
            console.warn('⚠️ BACKGROUND IMAGE NOT FOUND DURING LAYER ORDER ENFORCEMENT');
          }
        }, 100);

      }).catch((error: any) => {
        console.error('❌ BACKGROUND: Failed to load background image', {
          timestamp: new Date().toISOString(),
          error: error.message || error,
          errorType: error.constructor?.name,
          backgroundImageUrl: backgroundImageUrl ? backgroundImageUrl.substring(0, 100) + '...' : 'none',
          backgroundImageLength: backgroundImageUrl?.length || 0,
          isDataUrl: backgroundImageUrl?.startsWith('data:') || false,
          fabricOptions,
          canvasSize: { width: canvas.width, height: canvas.height },
          source: 'FabricMapCanvas.updateBackgroundImage.catch'
        });
        // Background info panel error handled by parent
      });
    } else {
      console.log('🖼️ NO BACKGROUND IMAGE, USING TRANSPARENT BACKGROUND');
      // Mark background as ready even when no image (transparent background)
      setIsBackgroundReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundImageUrl, sharedMap.mapData]);

  // Priority background loading - triggers immediately when canvas is ready
  useEffect(() => {
    console.log('🖼️ BACKGROUND: Priority background loading effect triggered', {
      timestamp: new Date().toISOString(),
      hasCanvas: !!fabricCanvasRef.current,
      isInitialized,
      backgroundImageUrl: backgroundImageUrl ? backgroundImageUrl.substring(0, 50) + '...' : 'undefined',
      backgroundImageDefined: backgroundImageUrl !== undefined,
      shouldTriggerUpdate: !!(fabricCanvasRef.current && isInitialized && backgroundImageUrl !== undefined),
      source: 'FabricMapCanvas.priorityBackgroundLoading'
    });

    if (fabricCanvasRef.current && isInitialized && backgroundImageUrl !== undefined) {
      console.log('🚀 BACKGROUND: Priority background loading initiated', {
        timestamp: new Date().toISOString(),
        canvasReady: true,
        initialized: true,
        backgroundImageExists: !!backgroundImageUrl
      });
      updateBackgroundImage();
    } else {
      console.log('🖼️ BACKGROUND: Priority background loading skipped', {
        timestamp: new Date().toISOString(),
        hasCanvas: !!fabricCanvasRef.current,
        isInitialized,
        backgroundImageDefined: backgroundImageUrl !== undefined,
        reason: !fabricCanvasRef.current ? 'no-canvas' :
                !isInitialized ? 'not-initialized' :
                backgroundImageUrl === undefined ? 'no-background-url' : 'unknown'
      });
    }
  }, [isInitialized, backgroundImageUrl, updateBackgroundImage]);

  // Listen for SharedMapSystem events to handle background image updates
  useEffect(() => {
    const handleMapChanged = (event: any) => {
      console.log('🔄 SHARED MAP CHANGED EVENT RECEIVED:', {
        timestamp: new Date().toISOString(),
        hasMapData: !!event.mapData,
        hasBackgroundImage: !!event.mapData?.backgroundImage,
        source: event.source || 'unknown'
      });

      // Force background image update when map data changes
      if (fabricCanvasRef.current && isInitialized && event.mapData?.backgroundImage) {
        console.log('🔄 TRIGGERING BACKGROUND UPDATE FROM MAP CHANGE');
        setTimeout(() => {
          updateBackgroundImage();
        }, 100); // Small delay to ensure state is updated
      }
    };

    const handleDimensionsChanged = (event: any) => {
      console.log('📐 DIMENSIONS CHANGED EVENT RECEIVED:', {
        timestamp: new Date().toISOString(),
        dimensions: event.dimensions,
        previousDimensions: event.previousDimensions,
        source: event.source || 'unknown'
      });

      // Canvas dimensions will be updated via props from MapEditorModule
      // No need to manually resize here as it's handled by the width/height props
    };

    // Get the SharedMapSystem instance directly
    const mapSystem = SharedMapSystem.getInstance();

    // Set up event listeners
    mapSystem.on('map:changed', handleMapChanged);
    mapSystem.on('map:dimensionsChanged', handleDimensionsChanged);

    // Cleanup
    return () => {
      mapSystem.off('map:changed', handleMapChanged);
      mapSystem.off('map:dimensionsChanged', handleDimensionsChanged);
    };
  }, [isInitialized, updateBackgroundImage]);

  // Update layer order to ensure proper stacking: background → grid → interactive elements
  const updateLayerOrder = useCallback((skipBackgroundCheck = false) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Get all objects with multiple detection methods
    const allObjects = canvas.getObjects();

    // Enhanced object detection with detailed logging for background issues
    if (allObjects.length === 0 && !skipBackgroundCheck) {
      console.warn('⚠️ NO OBJECTS FOUND ON CANVAS - POSSIBLE INITIALIZATION ISSUE');
    }

    // Enhanced background image detection with multiple fallback methods
    let backgroundImages = allObjects.filter(obj =>
      (obj as any).isBackgroundImage ||
      (obj as any).backgroundImageId === 'map-background-image' ||
      (obj.type === 'image' && obj.left === 0 && obj.top === 0)
    );

    // Primary fallback: use stored reference
    if (backgroundImages.length === 0 && (canvas as any)._backgroundImageRef) {
      const bgRef = (canvas as any)._backgroundImageRef;

      // Check if reference exists in canvas objects
      const refInCanvas = allObjects.find(obj => obj === bgRef);
      if (refInCanvas) {
        console.log('🔧 BACKGROUND IMAGE FOUND BY REFERENCE - RESTORING PROPERTIES');
        (refInCanvas as any).isBackgroundImage = true;
        (refInCanvas as any).selectable = false;
        (refInCanvas as any).evented = false;
        (refInCanvas as any).backgroundImageId = 'map-background-image';
        backgroundImages.push(refInCanvas);
      } else if (!skipBackgroundCheck) {
        // Reference exists but not in canvas - re-add it
        console.log('🔧 RESTORING COMPLETELY LOST BACKGROUND IMAGE FROM REFERENCE');
        canvas.add(bgRef);
        (bgRef as any).isBackgroundImage = true;
        (bgRef as any).selectable = false;
        (bgRef as any).evented = false;
        (bgRef as any).backgroundImageId = 'map-background-image';
        backgroundImages.push(bgRef);
        canvas.sendObjectToBack(bgRef);
      }
    }

    // Secondary fallback: look for image objects that could be background
    if (backgroundImages.length === 0 && !skipBackgroundCheck) {
      const possibleBg = allObjects.find(obj =>
        obj.type === 'image' &&
        (obj.left === 0 || Math.abs(obj.left || 0) < 10) &&
        (obj.top === 0 || Math.abs(obj.top || 0) < 10)
      );

      if (possibleBg) {
        console.log('🔧 FOUND POTENTIAL BACKGROUND IMAGE BY POSITION - MARKING AS BACKGROUND');
        (possibleBg as any).isBackgroundImage = true;
        (possibleBg as any).selectable = false;
        (possibleBg as any).evented = false;
        (possibleBg as any).backgroundImageId = 'map-background-image';
        // Update the reference
        (canvas as any)._backgroundImageRef = possibleBg;
        backgroundImages.push(possibleBg);
      }
    }

    const gridObjects = allObjects.filter(obj =>
      (obj as any).isGridLine || (obj as any).isGridPattern
    );
    const interactiveElements = allObjects.filter(obj =>
      !((obj as any).isBackgroundImage) &&
      !((obj as any).isGridLine) &&
      !((obj as any).isGridPattern) &&
      (obj as any).backgroundImageId !== 'map-background-image'
    );

    // Only reorder if we have objects to reorder
    if (backgroundImages.length > 0 || gridObjects.length > 0 || interactiveElements.length > 0) {
      // Send background images to the very back
      backgroundImages.forEach(obj => canvas.sendObjectToBack(obj));

      // Bring grid objects above background but below interactive elements
      gridObjects.forEach(obj => canvas.bringObjectForward(obj));

      // Bring interactive elements to the front
      interactiveElements.forEach(obj => canvas.bringObjectToFront(obj));
    }

    console.log('🔄 LAYER ORDER UPDATED:', {
      backgroundImages: backgroundImages.length,
      gridObjects: gridObjects.length,
      interactiveElements: interactiveElements.length,
      totalObjects: allObjects.length,
      skippedBackgroundCheck: skipBackgroundCheck
    });

    // Enhanced debugging for background image issues
    if (backgroundImages.length === 0 && (canvas as any)._backgroundImageRef) {
      console.warn('⚠️ BACKGROUND IMAGE REFERENCE EXISTS BUT NOT FOUND IN CANVAS:', {
        hasReference: !!(canvas as any)._backgroundImageRef,
        totalObjects: allObjects.length,
        skipCheck: skipBackgroundCheck,
        objectTypes: allObjects.map(obj => ({
          type: obj.type,
          isBackground: (obj as any).isBackgroundImage,
          backgroundId: (obj as any).backgroundImageId,
          isGrid: (obj as any).isGridLine || (obj as any).isGridPattern,
          position: { left: obj.left, top: obj.top },
          size: { width: obj.width, height: obj.height }
        }))
      });
    } else if (backgroundImages.length > 0) {
      // Background image successfully maintained
    }
  }, []);

  // Keyboard event handling for delete functionality
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const canvas = fabricCanvasRef.current;
        if (canvas && !drawingMode) {
          const activeObjects = canvas.getActiveObjects();
          if (activeObjects.length > 0) {
            // Show confirmation dialog for deletion
            const areaNames = activeObjects
              .map(obj => (obj as CanvasObject).mapElementData?.name)
              .filter(Boolean)
              .join(', ');

            if (areaNames && window.confirm(`Delete ${activeObjects.length > 1 ? 'areas' : 'area'}: ${areaNames}?`)) {
              // Inline delete functionality to avoid dependency issues
              for (const obj of activeObjects) {
                const canvasObj = obj as CanvasObject;
                if (canvasObj.mapElementId && canvasObj.mapElementType) {
                  try {
                    if (canvasObj.mapElementType === 'interactive') {
                      await sharedMap.removeInteractiveArea(canvasObj.mapElementId);
                    } else if (canvasObj.mapElementType === 'collision') {
                      await sharedMap.removeCollisionArea(canvasObj.mapElementId);
                    }
                  } catch (error) {
                    console.error('Failed to remove map element:', error);
                  }
                }
                canvas.remove(obj);
              }

              canvas.discardActiveObject();
              canvas.renderAll();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingMode, sharedMap]);

  // Render grid using direct SVG file approach
  const renderGrid = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Remove existing grid objects
    const gridObjects = canvas.getObjects().filter(obj => (obj as any).isGridPattern);
    gridObjects.forEach(obj => canvas.remove(obj));

    // If grid is not visible or spacing is invalid, just remove and return
    if (!gridVisible || gridSpacing <= 0) {
      canvas.renderAll();
      return;
    }

    // Find the pattern configuration
    const pattern = GRID_PATTERNS.find(p => p.id === gridPattern);
    if (!pattern) {
      console.warn('Grid pattern not found:', gridPattern);
      return;
    }

    // Grid rendering debug info (only in development)
    // Removed excessive logging for performance

    // Load the SVG file directly and create a tiled pattern
    fabric.FabricImage.fromURL(pattern.imagePath, {
      crossOrigin: 'anonymous'
    }).then((img) => {
      if (!img || !fabricCanvasRef.current) return;

      // Scale the image to match the desired grid spacing
      const scale = gridSpacing / pattern.size;
      img.scale(scale);

      // Create a pattern from the scaled image
      const patternSourceCanvas = new fabric.StaticCanvas();
      patternSourceCanvas.setDimensions({ width: gridSpacing, height: gridSpacing });
      patternSourceCanvas.add(img);

      const fabricPattern = new fabric.Pattern({
        source: patternSourceCanvas.getElement(),
        repeat: 'repeat'
      });

      // Create a rectangle covering the entire canvas with the pattern
      const gridRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: fabricPattern,
        opacity: gridOpacity / 100,
        selectable: false,
        evented: false,
        excludeFromExport: true
      });

      (gridRect as any).isGridPattern = true;
      (gridRect as any).mapElementType = 'grid';

      // Add grid and ensure proper layer order
      fabricCanvasRef.current.add(gridRect);

      // Force layer order update to position grid correctly
      setTimeout(() => {
        if (fabricCanvasRef.current) {
          updateLayerOrder();
        }
      }, 10);

      // Grid rendered successfully
    }).catch((error) => {
      console.error('❌ FAILED TO LOAD GRID PATTERN:', error);
    });
  }, [width, height, gridVisible, gridSpacing, gridPattern, gridOpacity, updateLayerOrder]);

  // Update grid when properties change - wait for background to be ready
  useEffect(() => {
    if (isInitialized && isBackgroundReady) {
      // Grid rendering after background ready
      renderGrid();
    }
  }, [isInitialized, isBackgroundReady, renderGrid]);

  // Re-render grid immediately when grid settings change (for real-time updates)
  useEffect(() => {
    if (isInitialized && fabricCanvasRef.current) {
      // Grid settings changed - re-rendering
      renderGrid();
    }
  }, [gridVisible, gridSpacing, gridPattern, gridOpacity, renderGrid, isInitialized]);

  // Render interactive areas
  const renderInteractiveAreas = useCallback(() => {
    if (!fabricCanvasRef.current || !sharedMap.interactiveAreas) return;

    const canvas = fabricCanvasRef.current;
    
    // Remove existing interactive area objects
    const existingAreas = canvas.getObjects().filter(obj => 
      (obj as CanvasObject).mapElementType === 'interactive'
    );
    existingAreas.forEach(obj => canvas.remove(obj));

    // Add interactive areas
    sharedMap.interactiveAreas.forEach(area => {
      const rect = new fabric.Rect({
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        fill: area.color,
        opacity: 0.7,
        stroke: area.color,
        strokeWidth: 2,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: false
      }) as CanvasObject;

      // Add metadata
      rect.mapElementId = area.id;
      rect.mapElementType = 'interactive';
      rect.mapElementData = area;

      // Add text label with better contrast
      const textColor = getContrastColor(area.color);
      const text = new fabric.Text(area.name, {
        left: area.x + area.width / 2,
        top: area.y + area.height / 2,
        fontSize: Math.min(14, Math.max(10, area.width / 8)),
        fill: textColor,
        backgroundColor: textColor === '#000000' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        padding: 2
      });

      const group = new fabric.Group([rect, text], {
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: false
      }) as CanvasObject;

      group.mapElementId = area.id;
      group.mapElementType = 'interactive';
      group.mapElementData = area;

      canvas.add(group);
    });

    // Note: Layer order will be coordinated after all elements are loaded
    canvas.renderAll();
  }, [sharedMap.interactiveAreas]);

  // Render collision areas
  const renderCollisionAreas = useCallback(() => {
    if (!fabricCanvasRef.current || !sharedMap.collisionAreas) return;

    const canvas = fabricCanvasRef.current;
    
    // Remove existing collision area objects
    const existingAreas = canvas.getObjects().filter(obj => 
      (obj as CanvasObject).mapElementType === 'collision'
    );
    existingAreas.forEach(obj => canvas.remove(obj));

    // Add collision areas
    sharedMap.collisionAreas.forEach(area => {
      const rect = new fabric.Rect({
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        fill: 'rgba(239, 68, 68, 0.3)',
        stroke: '#ef4444',
        strokeWidth: 2,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: true
      }) as CanvasObject;

      rect.mapElementId = area.id;
      rect.mapElementType = 'collision';
      rect.mapElementData = area;

      canvas.add(rect);
    });

    // Note: Layer order will be coordinated after all elements are loaded
    canvas.renderAll();
  }, [sharedMap.collisionAreas]);

  // Update canvas when map data changes - wait for background to be ready
  useEffect(() => {
    if (isInitialized && isBackgroundReady) {
      // Rendering areas after background ready
      renderInteractiveAreas();
      renderCollisionAreas();
      // Mark all elements as ready after areas are rendered
      setIsElementsReady(true);
    }
  }, [isInitialized, isBackgroundReady, renderInteractiveAreas, renderCollisionAreas, forceRender]);

  // Coordinated layer order update after all elements are ready
  useEffect(() => {
    if (isElementsReady && fabricCanvasRef.current) {
      // Final coordinated layer order update
      updateLayerOrder();
    }
  }, [isElementsReady, updateLayerOrder]);

  // Apply camera transformations to canvas
  // Removed cameraControls effect. Zoom/pan is now handled by Fabric.js natively.

  // Update canvas configuration when drawing mode changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      if (drawingMode) {
        canvas.selection = false; // Disable selection during drawing
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
        canvas.moveCursor = 'crosshair';
      } else {
        canvas.selection = true; // Enable selection when not drawing
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.moveCursor = 'move';
      }
      canvas.renderAll();
    }
  }, [drawingMode]);

  // Set up drawing mode event listeners
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Mouse events for drawing mode
    const handleMouseDown = (e: any) => {
      if (drawingMode || collisionDrawingMode) {
        // Prevent default selection behavior during drawing
        e.e?.preventDefault();
        e.e?.stopPropagation();

        // Get pointer coordinates from the event
        const pointer = e.absolutePointer || e.pointer || canvas.getPointer(e.e);
        if (pointer) {
          handleDrawingStart(new fabric.Point(pointer.x, pointer.y));
        }
      }
    };

    const handleMouseUp = () => {
      if ((drawingMode || collisionDrawingMode) && isDrawing) {
        handleDrawingEnd();
      }
    };

    const handleMouseMove = (e: any) => {
      if ((drawingMode || collisionDrawingMode) && isDrawing) {
        // Get pointer coordinates from the event
        const pointer = e.absolutePointer || e.pointer || canvas.getPointer(e.e);
        if (pointer) {
          handleDrawingMove(new fabric.Point(pointer.x, pointer.y));
        }
      }
    };

    // Add event listeners
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:move', handleMouseMove);

    // Cleanup function
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:move', handleMouseMove);
    };
  }, [drawingMode, collisionDrawingMode, isDrawing, handleDrawingStart, handleDrawingMove, handleDrawingEnd]);



  return (
    <div className={`fabric-map-canvas ${className}`}>
      <canvas ref={canvasRef} />
      {sharedMap.error && (
        <div className="canvas-error">
          Error: {sharedMap.error}
        </div>
      )}

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDeletion}
        onConfirm={handleConfirmDeletion}
        title={areasToDelete.length === 1 ? 'Delete Area' : `Delete ${areasToDelete.length} Areas`}
        content={
          <div>
            <div style={{ marginBottom: areasToDelete.length > 1 ? 8 : 0 }}>
              {areasToDelete.length === 1
                ? `Are you sure you want to delete "${areasToDelete[0]?.name}"?`
                : `Are you sure you want to delete the following ${areasToDelete.length} areas?`}
            </div>
            {areasToDelete.length > 1 && (
              <div style={{ maxHeight: 150, overflowY: 'auto', padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                {areasToDelete.map((a, i) => (
                  <div key={i} style={{ padding: '2px 0' }}>• {a.name}</div>
                ))}
              </div>
            )}
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Size validation feedback during drawing */}
      {drawingMode && isDrawing && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            backgroundColor: isValidSize ? '#52c41a' : '#ff4d4f',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {isValidSize
            ? '✓ Area size is valid'
            : `⚠ Minimum size: ${MIN_AREA_SIZE}×${MIN_AREA_SIZE}px`
          }
        </div>
      )}

      {/* Background Information Panel */}
      <BackgroundInfoPanel
        isVisible={backgroundInfoPanelVisible}
        onClose={onBackgroundInfoPanelClose || (() => {})}
        canvasWidth={width}
        canvasHeight={height}
        backgroundLoadingStatus="loaded"
        backgroundVisible={true}
      />
    </div>
  );
};
