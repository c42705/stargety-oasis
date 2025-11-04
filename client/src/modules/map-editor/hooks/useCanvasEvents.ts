/**
 * Canvas Events Hook
 * 
 * Manages all Fabric.js canvas event listeners including selection, modification,
 * mouse events, pan/zoom, and keyboard events. This is the central event coordination
 * hub for the map editor canvas.
 */

import { useCallback, useRef, MutableRefObject } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { CanvasObject } from '../types/fabricCanvas.types';
import { updatePolygonFromHandles, updateEdgeHandles, PolygonEditHandles } from '../utils/polygonEditUtils';
import { shouldIgnoreKeyboardEvent } from '../../../shared/keyboardFocusUtils';

export interface UseCanvasEventsOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Current tool selected */
  currentTool: 'select' | 'pan' | 'draw-polygon';
  /** Whether drawing mode is active */
  drawingMode: boolean;
  /** Whether collision drawing mode is active */
  collisionDrawingMode: boolean;
  /** Whether polygon edit mode is active */
  isPolygonEditMode: boolean;
  /** Reference to polygon edit handles */
  editHandlesRef: MutableRefObject<PolygonEditHandles>;
  /** Reference to currently dragging polygon ID (for drift prevention) */
  draggingPolygonIdRef: MutableRefObject<string | null>;
  /** Callback when selection changes */
  onSelectionChanged?: (selectedObjects: fabric.Object[]) => void;
  /** Callback when object is modified */
  onObjectModified?: (object: fabric.Object) => void;
  /** Callback to handle object modification (sync to SharedMap) */
  handleObjectModified: (object: CanvasObject) => Promise<void>;
  /** Callback to handle object moving */
  handleObjectMoving: (object: CanvasObject) => void;
  /** Callback to handle object scaling */
  handleObjectScaling: () => void;
  /** Callback to handle area deletion */
  handleDeleteSelectedAreas: (selectedObjects: fabric.Object[]) => void;
  /** Callback when zoom changes */
  onZoomChange?: (zoom: number) => void;
  /** Polygon drawing callbacks */
  addPolygonVertex?: (point: { x: number; y: number }) => void;
  updatePolygonPreview?: (point: { x: number; y: number }) => void;
  completePolygon?: () => void;
  polygonDrawingState?: { isDrawing: boolean; points: any[] };
}

export interface UseCanvasEventsResult {
  /** Setup all canvas event listeners */
  setupCanvasEventListeners: (canvas: fabric.Canvas) => () => void;
}

/**
 * Hook for managing canvas event listeners
 */
export function useCanvasEvents(options: UseCanvasEventsOptions): UseCanvasEventsResult {
  const {
    currentTool,
    drawingMode,
    collisionDrawingMode,
    isPolygonEditMode,
    editHandlesRef,
    draggingPolygonIdRef,
    onSelectionChanged,
    onObjectModified,
    handleObjectModified,
    handleObjectMoving,
    handleObjectScaling,
    handleDeleteSelectedAreas,
    onZoomChange,
    addPolygonVertex,
    updatePolygonPreview,
    completePolygon,
    polygonDrawingState
  } = options;

  // Always-fresh ref for tool
  const currentToolRef = useRef(currentTool);
  currentToolRef.current = currentTool;

  /**
   * Setup all canvas event listeners
   * Returns cleanup function to remove listeners
   */
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
    let dragStartPosition: { left: number; top: number; timestamp: number } | null = null;

    canvas.on('object:modified', async (e) => {
      const object = e.target as CanvasObject;

      // Handle vertex handle modification (drag complete)
      if ((object as any).isVertexHandle && isPolygonEditMode) {
        const polygonId = (object as any).polygonId;
        const polygon = canvas.getObjects().find(obj =>
          (obj as any).mapElementId === polygonId
        ) as fabric.Polygon;

        if (polygon) {
          updatePolygonFromHandles(polygon, editHandlesRef.current.vertexHandles, canvas);
          updateEdgeHandles(editHandlesRef.current.vertexHandles, editHandlesRef.current.edgeHandles);
          canvas.renderAll();
        }
        return;
      }

      if (object && object.mapElementId && object.mapElementType) {
        // Log drag end
        if (dragStartPosition) {
          const delta = {
            x: (object.left || 0) - dragStartPosition.left,
            y: (object.top || 0) - dragStartPosition.top
          };
          logger.info('🔄 DRAG END', {
            id: object.mapElementId,
            position: { left: object.left, top: object.top },
            delta,
            duration: Date.now() - dragStartPosition.timestamp,
            timestamp: new Date().toISOString()
          });
          dragStartPosition = null; // Reset for next drag
        }

        // 🛡️ DRIFT PREVENTION: Unlock polygon after drag completes
        if (object.mapElementType === 'collision' && draggingPolygonIdRef.current === object.mapElementId) {
          logger.info('🔓 UNLOCK POLYGON', {
            id: object.mapElementId,
            reason: 'Drag completed - allowing smart update',
            timestamp: new Date().toISOString()
          });
          draggingPolygonIdRef.current = null;
        }

        await handleObjectModified(object);
      }
      onObjectModified?.(object);
    });

    // Object movement events
    let lastDragLogTime = 0;

    canvas.on('object:moving', (e) => {
      const object = e.target as CanvasObject;
      if (object) {
        // Handle vertex handle dragging in edit mode
        if ((object as any).isVertexHandle && isPolygonEditMode) {
          // Update edge handles when vertex is moved
          updateEdgeHandles(editHandlesRef.current.vertexHandles, editHandlesRef.current.edgeHandles);
          canvas.renderAll();
          return;
        }

        // Log drag start (first movement)
        if (!dragStartPosition && object.mapElementId) {
          dragStartPosition = {
            left: object.left || 0,
            top: object.top || 0,
            timestamp: Date.now()
          };

          // 🛡️ DRIFT PREVENTION: Track which polygon is being dragged
          if (object.mapElementType === 'collision') {
            draggingPolygonIdRef.current = object.mapElementId;
            logger.info('🔒 LOCK POLYGON', {
              id: object.mapElementId,
              reason: 'Drag started - preventing smart update',
              timestamp: new Date().toISOString()
            });
          }

          logger.info('🔄 DRAG START', {
            id: object.mapElementId,
            type: object.type,
            position: { left: object.left, top: object.top },
            scale: { x: object.scaleX, y: object.scaleY },
            angle: object.angle,
            timestamp: new Date().toISOString()
          });
        }

        // Log during drag (throttled to every 100ms)
        const now = Date.now();
        if (object.mapElementId && now - lastDragLogTime > 100) {
          lastDragLogTime = now;
          const delta = dragStartPosition ? {
            x: (object.left || 0) - dragStartPosition.left,
            y: (object.top || 0) - dragStartPosition.top
          } : { x: 0, y: 0 };

          logger.info('🔄 DRAGGING', {
            id: object.mapElementId,
            position: { left: object.left, top: object.top },
            delta,
            timestamp: new Date().toISOString()
          });
        }

        handleObjectMoving(object);
      }
    });

    // Object scaling events
    canvas.on('object:scaling', () => {
      handleObjectScaling();
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

      // Handle polygon drawing tool
      if (tool === 'draw-polygon' && addPolygonVertex) {
        e.e?.preventDefault();
        e.e?.stopPropagation();

        // Get pointer in world coordinates (accounting for zoom/pan)
        const pointer = canvas.getPointer(e.e);
        if (pointer) {
          addPolygonVertex(pointer);
        }
        return;
      }

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

      // Get pointer in world coordinates
      const pointer = canvas.getPointer(e.e);

      // Handle polygon drawing preview
      if (tool === 'draw-polygon' && pointer && polygonDrawingState?.isDrawing && updatePolygonPreview) {
        updatePolygonPreview(pointer);
        return;
      }

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

    // Double-click handler for polygon completion
    canvas.on('mouse:dblclick', (e) => {
      const tool = currentToolRef.current;

      // Handle polygon drawing completion
      if (tool === 'draw-polygon' && polygonDrawingState?.isDrawing && completePolygon) {
        e.e?.preventDefault();
        e.e?.stopPropagation();
        completePolygon();
        return;
      }
    });

    // Keyboard event handling for deletion
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard events when typing in input fields or when modal is open
      if (shouldIgnoreKeyboardEvent()) {
        return;
      }

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
  }, [
    onSelectionChanged,
    onObjectModified,
    drawingMode,
    collisionDrawingMode,
    currentTool,
    handleObjectModified,
    handleObjectMoving,
    handleObjectScaling,
    handleDeleteSelectedAreas,
    isPolygonEditMode,
    editHandlesRef,
    draggingPolygonIdRef,
    onZoomChange
  ]);

  return {
    setupCanvasEventListeners
  };
}

