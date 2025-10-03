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

import { logger } from '../../shared/logger';
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
  currentTool?: 'select' | 'pan' | 'draw-polygon';
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
  onBackgroundInfoPanelClose,
}) => {
  // ...existing hooks and state...
  // Impassable areas state (polygons only - paint functionality removed)
  const [impassableAreas, setImpassableAreas] = useState<ImpassableArea[]>([]);

  // Polygon drawing state
  const [polygonDrawingState, setPolygonDrawingState] = useState<{
    isDrawing: boolean;
    points: { x: number; y: number }[];
    vertexCircles: fabric.Circle[];
  }>({
    isDrawing: false,
    points: [],
    vertexCircles: []
  });

  // Use refs for preview elements to avoid stale closures and re-render issues
  const polygonPreviewLineRef = useRef<fabric.Line | null>(null);
  const polygonPreviewPolygonRef = useRef<fabric.Polygon | null>(null);

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

  // Paint functionality removed - only polygon collision areas are supported

  // Always-fresh ref for tool
  const currentToolRef = useRef(currentTool);
  currentToolRef.current = currentTool;

  // Background info panel state managed by parent component

  // Pan tool is now handled directly in event handlers. usePanControls is no longer used.

  // Log initialization state changes for debugging
  useEffect(() => {
    // Removed: Non-critical canvas initialization debug log for maintainability.
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

    // Immediately update sharedMap (no debounce)
    try {
      // Check if this is a polygon collision area
      const mapData = object.mapElementData as any;
      const isPolygon = mapData?.type === 'impassable-polygon';

      if (isPolygon && object.type === 'polygon') {
        // For polygons, extract the ABSOLUTE transformed points
        const polygon = object as fabric.Polygon;

        // DEBUG: Log polygon state before transformation
        logger.info('🔍 POLYGON MODIFY START', {
          id: object.mapElementId,
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY,
          angle: polygon.angle,
          pointsCount: polygon.points?.length,
          firstPoint: polygon.points?.[0]
        });

        // Get the transformation matrix to convert local points to world coordinates
        const matrix = polygon.calcTransformMatrix();

        // DEBUG: Log transformation matrix
        logger.info('🔍 TRANSFORMATION MATRIX', {
          id: object.mapElementId,
          matrix: [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]]
        });

        // Transform each point using the matrix
        const points = polygon.points?.map((point, index) => {
          // Apply transformation matrix to get absolute coordinates
          const transformedPoint = fabric.util.transformPoint(
            { x: point.x, y: point.y },
            matrix
          );

          // DEBUG: Log first and last point transformation
          if (index === 0 || index === polygon.points!.length - 1) {
            logger.info('🔍 POINT TRANSFORMATION', {
              id: object.mapElementId,
              index,
              original: { x: point.x, y: point.y },
              transformed: { x: transformedPoint.x, y: transformedPoint.y },
              rounded: { x: Math.round(transformedPoint.x), y: Math.round(transformedPoint.y) }
            });
          }

          return {
            x: Math.round(transformedPoint.x),
            y: Math.round(transformedPoint.y)
          };
        }) || [];

        const updates: Partial<ImpassableArea> = {
          type: 'impassable-polygon',
          points,
          x: 0, // Compatibility fields
          y: 0,
          width: 0,
          height: 0
        };

        if (object.mapElementType === 'collision' && object.mapElementId) {
          // DEBUG: Log before update
          logger.info('🔍 UPDATING COLLISION AREA', {
            id: object.mapElementId,
            pointsCount: points.length,
            firstPoint: points[0],
            lastPoint: points[points.length - 1]
          });

          await sharedMap.updateCollisionArea(object.mapElementId, updates);

          // Update the mapElementData to reflect new points
          // Create a new object instead of mutating (mapElementData may be immutable)
          if (object.mapElementData && 'type' in object.mapElementData) {
            const areaData = object.mapElementData as any;
            object.mapElementData = {
              ...areaData,
              points
            } as any;
          }

          logger.info('✅ Polygon updated', { id: object.mapElementId, pointCount: points.length });
        }
      } else {
        // For rectangles and other shapes, use standard x/y/width/height
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
      }
    } catch (error) {
      logger.error('Failed to update map element', error);
    }
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
        logger.warn(`Area too small: ${bounds.width}×${bounds.height}px. Minimum size is ${MIN_AREA_SIZE}×${MIN_AREA_SIZE}px`);
        canvas.renderAll();
        return;
      }
    }

    // Create the area if it meets size requirements
    if (collisionDrawingMode && onCollisionAreaDrawn) {
      onCollisionAreaDrawn(bounds);
      // Removed: Non-critical collision area creation log for maintainability.
    } else if (onAreaDrawn) {
      onAreaDrawn(bounds);
      // Removed: Non-critical area creation log for maintainability.
    }

    // Force immediate re-render of areas after creation
    setTimeout(() => {
      setForceRender(prev => prev + 1);
    }, 100);

    canvas.renderAll();
  }, [isDrawing, startPoint, drawingRect, drawingText, onAreaDrawn, onCollisionAreaDrawn, collisionDrawingMode, MIN_AREA_SIZE]);

  // Polygon drawing handlers
  const snapPointToGrid = useCallback((point: { x: number; y: number }): { x: number; y: number } => {
    if (!gridVisible || gridSpacing <= 0) {
      return point;
    }
    return {
      x: Math.round(point.x / gridSpacing) * gridSpacing,
      y: Math.round(point.y / gridSpacing) * gridSpacing
    };
  }, [gridVisible, gridSpacing]);

  const addPolygonVertex = useCallback((point: { x: number; y: number }) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    // Snap to grid if enabled
    const snappedPoint = snapPointToGrid(point);

    // Add vertex circle
    const circle = new fabric.Circle({
      left: snappedPoint.x - 4,
      top: snappedPoint.y - 4,
      radius: 4,
      fill: '#ef4444',
      stroke: '#fff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center'
    });
    canvas.add(circle);

    setPolygonDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      points: [...prev.points, snappedPoint],
      vertexCircles: [...prev.vertexCircles, circle]
    }));

    canvas.renderAll();
  }, [fabricCanvasRef, snapPointToGrid]);

  const updatePolygonPreview = useCallback((mousePoint: { x: number; y: number }) => {
    if (!fabricCanvasRef.current || polygonDrawingState.points.length === 0) return;
    const canvas = fabricCanvasRef.current;

    // Remove old preview line using ref
    if (polygonPreviewLineRef.current) {
      canvas.remove(polygonPreviewLineRef.current);
      polygonPreviewLineRef.current = null;
    }

    // Remove old preview polygon using ref
    if (polygonPreviewPolygonRef.current) {
      canvas.remove(polygonPreviewPolygonRef.current);
      polygonPreviewPolygonRef.current = null;
    }

    const lastPoint = polygonDrawingState.points[polygonDrawingState.points.length - 1];
    const snappedMouse = snapPointToGrid(mousePoint);

    // Create preview line from last point to mouse
    const previewLine = new fabric.Line(
      [lastPoint.x, lastPoint.y, snappedMouse.x, snappedMouse.y],
      {
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      }
    );
    canvas.add(previewLine);
    polygonPreviewLineRef.current = previewLine;

    // If we have at least 2 points, show preview polygon
    if (polygonDrawingState.points.length >= 2) {
      const previewPoints = [...polygonDrawingState.points, snappedMouse];
      const previewPolygon = new fabric.Polygon(previewPoints, {
        fill: 'rgba(239, 68, 68, 0.3)',
        stroke: '#ef4444',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        opacity: 0.5
      });
      canvas.add(previewPolygon);
      polygonPreviewPolygonRef.current = previewPolygon;
    }

    canvas.renderAll();
  }, [fabricCanvasRef, polygonDrawingState.points, snapPointToGrid]);

  const completePolygon = useCallback(() => {
    if (!fabricCanvasRef.current || polygonDrawingState.points.length < 3) {
      logger.warn('Polygon must have at least 3 points');
      return;
    }

    const canvas = fabricCanvasRef.current;

    // Clean up preview elements using refs
    if (polygonPreviewLineRef.current) {
      canvas.remove(polygonPreviewLineRef.current);
      polygonPreviewLineRef.current = null;
    }
    if (polygonPreviewPolygonRef.current) {
      canvas.remove(polygonPreviewPolygonRef.current);
      polygonPreviewPolygonRef.current = null;
    }
    polygonDrawingState.vertexCircles.forEach(circle => canvas.remove(circle));

    // Create final polygon (selectable when select tool is active)
    // Points are in absolute world coordinates, but Fabric.js will automatically
    // convert them to relative coordinates and set left/top based on bounding box
    const polygon = new fabric.Polygon(polygonDrawingState.points, {
      fill: 'rgba(239, 68, 68, 0.3)',
      stroke: '#ef4444',
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockRotation: true,
      objectCaching: false // Disable caching for better transformation handling
    });

    // Generate unique ID for the polygon
    const polygonId = `impassable-polygon-${Date.now()}`;
    const polygonName = `Impassable Polygon ${impassableAreas.filter(a => a.type === 'impassable-polygon').length + 1}`;

    // Calculate bounding box for logging
    const xs = polygonDrawingState.points.map(p => p.x);
    const ys = polygonDrawingState.points.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const boundingBox = {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    // 🆕 [Polygon Save] Log polygon creation with full data structure
    logger.info('🆕 [Polygon Save] POLYGON CREATED IN EDITOR', {
      timestamp: new Date().toISOString(),
      id: polygonId,
      name: polygonName,
      type: 'impassable-polygon',
      pointsCount: polygonDrawingState.points.length,
      allPoints: polygonDrawingState.points,
      boundingBox,
      fabricPosition: {
        left: polygon.left,
        top: polygon.top,
        width: polygon.width,
        height: polygon.height
      },
      color: '#ef4444'
    });

    // Store polygon data with proper bounding box
    const polygonData: ImpassableArea = {
      id: polygonId,
      name: polygonName,
      type: 'impassable-polygon',
      points: polygonDrawingState.points,
      color: '#ef4444',
      // Use calculated bounding box for collision detection
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    // Add metadata to fabric object
    (polygon as any).mapElementId = polygonId;
    (polygon as any).mapElementType = 'collision';
    (polygon as any).mapElementData = polygonData;

    canvas.add(polygon);
    canvas.renderAll();

    // Add to impassable areas state
    setImpassableAreas(prev => [...prev, polygonData]);

    // Persist to shared map with real bounding box
    sharedMap.addCollisionArea({
      id: polygonId,
      name: polygonName,
      type: 'impassable-polygon',
      points: polygonDrawingState.points,
      color: '#ef4444',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    });

    // Reset polygon drawing state
    setPolygonDrawingState({
      isDrawing: false,
      points: [],
      vertexCircles: []
    });

    logger.info('Polygon collision area created', { id: polygonId, points: polygonDrawingState.points.length });
  }, [fabricCanvasRef, polygonDrawingState, impassableAreas, sharedMap]);

  const cancelPolygonDrawing = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    // Clean up all preview elements using refs
    if (polygonPreviewLineRef.current) {
      canvas.remove(polygonPreviewLineRef.current);
      polygonPreviewLineRef.current = null;
    }
    if (polygonPreviewPolygonRef.current) {
      canvas.remove(polygonPreviewPolygonRef.current);
      polygonPreviewPolygonRef.current = null;
    }
    polygonDrawingState.vertexCircles.forEach(circle => canvas.remove(circle));

    // Reset state
    setPolygonDrawingState({
      isDrawing: false,
      points: [],
      vertexCircles: []
    });

    canvas.renderAll();
  }, [fabricCanvasRef, polygonDrawingState]);

  // Reset polygon drawing when switching away from polygon tool
  useEffect(() => {
    if (currentTool !== 'draw-polygon' && polygonDrawingState.isDrawing) {
      cancelPolygonDrawing();
    }
  }, [currentTool, polygonDrawingState.isDrawing, cancelPolygonDrawing]);

  // Handle Escape key to cancel polygon drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentTool === 'draw-polygon' && polygonDrawingState.isDrawing) {
        e.preventDefault();
        cancelPolygonDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTool, polygonDrawingState.isDrawing, cancelPolygonDrawing]);

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
      // Removed: Non-critical area deletion log for maintainability.
    } catch (error) {
      logger.error('Failed to delete areas', error);
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

      // Removed: Non-critical canvas initialization log for maintainability.

      // Detect and fix any dimension mismatches
      setTimeout(async () => {
        try {
          const mapSystem = SharedMapSystem.getInstance();
          await mapSystem.detectAndUpdateImageDimensions();
          // Removed: Non-critical dimension detection completion log.
        } catch (error) {
          logger.warn('DIMENSION DETECTION FAILED ON CANVAS INIT', error);
        }
      }, 100);

      // Initialize performance monitoring for high zoom levels
      performanceMonitorRef.current = new CanvasPerformanceMonitor(canvas);

      // Apply initial performance optimizations
      const currentZoom = canvas.getZoom();
      if (shouldOptimizePerformance(currentZoom)) {
        optimizeCanvasRendering(canvas, currentZoom);
        performanceMonitorRef.current.startMonitoring();
        // Removed: Non-critical performance optimization log.
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
      // Removed: Non-critical canvas dimension change log.
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
    let dragStartPosition: { left: number; top: number; timestamp: number } | null = null;
    let lastDragLogTime = 0;

    canvas.on('object:moving', (e) => {
      const object = e.target as CanvasObject;
      if (object) {
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
      // Only enable selection marquee for the select tool
      const isSelectTool = currentTool === 'select';
      canvas.selection = isSelectTool;

      if (drawingMode || collisionDrawingMode || currentTool === 'draw-polygon') {
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else if (currentTool === 'pan') {
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
      } else {
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.moveCursor = 'move';
      }

      // Disable object selection for all except select tool
      canvas.forEachObject((obj) => {
        // Always lock grid and background image objects
        const isGrid = (obj as any).isGridPattern || (obj as any).mapElementType === 'grid';
        const isBg = (obj as any).isBackgroundImage || (obj as any).backgroundImageId === 'map-background-image' || (obj as any).mapElementType === 'background';
        if (isGrid || isBg) {
          obj.selectable = false;
          obj.evented = false;
          (obj as any).locked = true;
        } else {
          obj.selectable = isSelectTool;
          obj.evented = isSelectTool;
        }
      });

      canvas.renderAll();
    }
  }, [drawingMode, collisionDrawingMode, currentTool]);

  // Handle background image changes - use a stable reference to prevent constant re-renders
  const backgroundImageUrl = useMemo(() => {
    const bgImage = sharedMap.mapData?.backgroundImage;
    // Removed: Non-critical background image URL debug log.
    return bgImage;
  }, [sharedMap.mapData]);

  // Update background image with cover mode scaling (same as game world)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateBackgroundImage = useCallback(() => {
    // Removed: Non-critical update background image debug log.

    const canvas = fabricCanvasRef.current;
    if (!canvas || !sharedMap.mapData) {
      logger.warn('BACKGROUND: Cannot update background - missing canvas or map data', {
        hasCanvas: !!canvas,
        hasMapData: !!sharedMap.mapData
      });
      return;
    }

    // Removed: Non-critical starting background update process debug log.

    // Background info panel status is managed by parent component

    // Remove existing background image
    const existingBackground = canvas.getObjects().find(obj =>
      (obj as any).isBackgroundImage === true || (obj as any).backgroundImageId === 'map-background-image'
    );
    if (existingBackground) {
      // Removed: Non-critical removing existing background image log.
      canvas.remove(existingBackground);
      // Clear the reference since we're replacing it
      (canvas as any)._backgroundImageRef = null;
    } else {
      // Removed: Non-critical no existing background image log.
    }

    // Add new background image if available
    if (backgroundImageUrl) {
      // Removed: Non-critical starting Fabric.js image loading log.

      // Determine if we need crossOrigin based on URL type
      const isDataUrl = backgroundImageUrl.startsWith('data:');
      const fabricOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as any };

      // Removed: Non-critical Fabric.js loading configuration log.

      fabric.Image.fromURL(backgroundImageUrl, fabricOptions).then((img: fabric.Image) => {
        // Removed: Non-critical Fabric.js image loading completed log.

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

        // Removed: Non-critical background image dimensions log.

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

        // Removed: Non-critical background image configured log.

        // Add to canvas and send to back (behind grid and other elements)
        canvas.add(img);
        canvas.sendObjectToBack(img);

        // Removed: Non-critical background image added log.

        // Verify the background image was added correctly
        const addedObjects = canvas.getObjects();
        const backgroundCount = addedObjects.filter(obj => (obj as any).isBackgroundImage).length;
        // Removed: Non-critical background verification log.

        // Immediate render to ensure visibility
        canvas.renderAll();

        // Force layer order update after a brief delay to ensure background is maintained
        setTimeout(() => {
          const bgImg = canvas.getObjects().find(obj => (obj as any).isBackgroundImage);
          if (bgImg) {
            canvas.sendObjectToBack(bgImg);
            canvas.renderAll();
            // Removed: Non-critical background image layer order enforced log.

            // Log final state
            const allObjects = canvas.getObjects();
            const bgImages = allObjects.filter(obj => (obj as any).isBackgroundImage);
            // Removed: Non-critical final background state log.

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
        logger.error('Failed to load background image', {
          error: error.message || error,
          errorType: error.constructor?.name,
          backgroundImageUrl: backgroundImageUrl ? backgroundImageUrl.substring(0, 100) + '...' : 'none',
          backgroundImageLength: backgroundImageUrl?.length || 0,
          isDataUrl: backgroundImageUrl?.startsWith('data:') || false,
          fabricOptions,
          canvasSize: { width: canvas.width, height: canvas.height }
        });
        // Background info panel error handled by parent
      });
    } else {
      // Removed: Non-critical no background image log.
      // Mark background as ready even when no image (transparent background)
      setIsBackgroundReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundImageUrl, sharedMap.mapData]);

  // Priority background loading - triggers immediately when canvas is ready
  useEffect(() => {
    // Removed: Non-critical priority background loading effect log.

    if (fabricCanvasRef.current && isInitialized && backgroundImageUrl !== undefined) {
      // Removed: Non-critical priority background loading initiated log.
      updateBackgroundImage();
    } else {
      // Removed: Non-critical priority background loading skipped log.
    }
  }, [isInitialized, backgroundImageUrl, updateBackgroundImage]);

  // Listen for SharedMapSystem events to handle background image updates
  useEffect(() => {
    const handleMapChanged = (event: any) => {
      // Removed: Non-critical shared map changed event log.

      // Force background image update when map data changes
      if (fabricCanvasRef.current && isInitialized && event.mapData?.backgroundImage) {
        // Removed: Non-critical triggering background update from map change log.
        setTimeout(() => {
          updateBackgroundImage();
        }, 100); // Small delay to ensure state is updated
      }
    };

    const handleDimensionsChanged = (event: any) => {
      // Removed: Non-critical dimensions changed event log.

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
      logger.warn('NO OBJECTS FOUND ON CANVAS - POSSIBLE INITIALIZATION ISSUE');
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
        (refInCanvas as any).isBackgroundImage = true;
        (refInCanvas as any).selectable = false;
        (refInCanvas as any).evented = false;
        (refInCanvas as any).backgroundImageId = 'map-background-image';
        backgroundImages.push(refInCanvas);
      } else if (!skipBackgroundCheck) {
        // Reference exists but not in canvas - re-add it
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
        // Removed: Non-critical found potential background image by position log.
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

    // Removed: Non-critical layer order updated log.

    // Enhanced debugging for background image issues
    if (backgroundImages.length === 0 && (canvas as any)._backgroundImageRef) {
      logger.warn('BACKGROUND IMAGE REFERENCE EXISTS BUT NOT FOUND IN CANVAS', {
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

    // Remove all existing grid objects robustly (triple check: by property, by type, by unique signature)
    let gridObjectsRemoved = 0;
    canvas.getObjects().forEach(obj => {
      const isGrid =
        (obj as any).isGridPattern ||
        (obj as any).mapElementType === 'grid' ||
        (obj.type === 'rect' && obj.width === width && obj.height === height && obj.selectable === false && obj.evented === false && obj.fill && obj.opacity !== undefined);
      if (isGrid) {
        canvas.remove(obj);
        gridObjectsRemoved++;
      }
    });
    // Removed: Non-critical grid removal debug log.

    // If grid is not visible or spacing is invalid, just remove and return
    if (!gridVisible || gridSpacing <= 0) {
      canvas.renderAll();
      return;
    }

    // Find the pattern configuration
    const pattern = GRID_PATTERNS.find(p => p.id === gridPattern);
    if (!pattern) {
      logger.warn('Grid pattern not found', gridPattern);
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
        excludeFromExport: true,
        id: "grid",
        name: "Grid Pattern",
        locked: true,
      });

      (gridRect as any).isGridPattern = true;
      (gridRect as any).mapElementType = 'grid';
      (gridRect as any).locked = true;
      (gridRect as any).id = "grid";
      (gridRect as any).name = "Grid Pattern";

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
      logger.error('FAILED TO LOAD GRID PATTERN', error);
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

  // Track currently dragging polygon to prevent drift
  const draggingPolygonIdRef = useRef<string | null>(null);

  // Helper function to check if polygon points have changed
  const polygonPointsChanged = (existingPolygon: fabric.Polygon, newPoints: { x: number; y: number }[]): boolean => {
    // Calculate the CURRENT absolute points from the Fabric polygon's transformation
    // This is the source of truth, not the stale mapElementData
    const matrix = existingPolygon.calcTransformMatrix();
    const currentAbsolutePoints = existingPolygon.points?.map((point) => {
      const transformedPoint = fabric.util.transformPoint(
        { x: point.x, y: point.y },
        matrix
      );
      return {
        x: Math.round(transformedPoint.x),
        y: Math.round(transformedPoint.y)
      };
    }) || [];

    if (currentAbsolutePoints.length !== newPoints.length) return true;

    // Check if any point coordinates differ
    for (let i = 0; i < currentAbsolutePoints.length; i++) {
      if (Math.abs(currentAbsolutePoints[i].x - newPoints[i].x) > 0.01 ||
          Math.abs(currentAbsolutePoints[i].y - newPoints[i].y) > 0.01) {
        return true;
      }
    }

    return false;
  };

  // Render collision areas
  const renderCollisionAreas = useCallback(() => {
    if (!fabricCanvasRef.current || !sharedMap.collisionAreas) return;

    // DEBUG: Log render start
    logger.info('🎨 RENDER COLLISION AREAS START', {
      areasCount: sharedMap.collisionAreas.length,
      polygonAreas: sharedMap.collisionAreas.filter((a: any) => a.type === 'impassable-polygon').length,
      draggingPolygonId: draggingPolygonIdRef.current
    });

    const canvas = fabricCanvasRef.current;

    // Get existing collision area objects
    const existingAreas = canvas.getObjects().filter(obj =>
      (obj as CanvasObject).mapElementType === 'collision'
    );

    // Create a map of existing objects by ID for efficient lookup
    const existingAreasMap = new Map<string, fabric.Object>();
    existingAreas.forEach(obj => {
      const id = (obj as CanvasObject).mapElementId;
      if (id) {
        existingAreasMap.set(id, obj);
      }
    });

    // Track which IDs we've processed
    const processedIds = new Set<string>();

    // Process collision areas - update existing or create new
    sharedMap.collisionAreas.forEach(area => {
      processedIds.add(area.id);

      // Check if this area already exists on canvas
      const existingObj = existingAreasMap.get(area.id);

      // DEBUG: Log area processing
      if ('type' in area && (area as any).type === 'impassable-polygon') {
        logger.info('🎨 PROCESSING POLYGON AREA', {
          id: area.id,
          name: area.name,
          hasExisting: !!existingObj,
          hasPoints: !!(area as any).points,
          pointsCount: (area as any).points?.length
        });
      }

      // For polygons, update points if object exists
      if (existingObj && 'type' in area && (area as any).type === 'impassable-polygon' && (area as any).points) {
        const polygon = existingObj as fabric.Polygon;
        const absolutePoints = (area as any).points;

        // 🛡️ DRIFT PREVENTION: Skip smart update if this polygon is currently being dragged
        if (draggingPolygonIdRef.current === area.id) {
          logger.info('⏭️ SKIP SMART UPDATE', {
            id: area.id,
            reason: 'Currently being dragged',
            timestamp: new Date().toISOString()
          });
          return; // Don't update the polygon that's being dragged
        }

        // 🛡️ DIRTY CHECKING: Skip update if points haven't changed
        const pointsChanged = polygonPointsChanged(polygon, absolutePoints);
        if (!pointsChanged) {
          logger.info('⏭️ SKIP SMART UPDATE', {
            id: area.id,
            reason: 'Points unchanged (calculated from current Fabric transformation)',
            timestamp: new Date().toISOString()
          });
          return; // Don't update if data is identical
        } else {
          // Calculate current absolute points for logging
          const matrix = polygon.calcTransformMatrix();
          const currentAbsolutePoints = polygon.points?.map((point) => {
            const transformedPoint = fabric.util.transformPoint(
              { x: point.x, y: point.y },
              matrix
            );
            return {
              x: Math.round(transformedPoint.x),
              y: Math.round(transformedPoint.y)
            };
          }) || [];

          logger.warn('🔄 POINTS CHANGED DETECTED', {
            id: area.id,
            currentPointsCount: currentAbsolutePoints.length,
            storagePointsCount: absolutePoints.length,
            currentFirstPoint: currentAbsolutePoints[0],
            storageFirstPoint: absolutePoints[0],
            currentLastPoint: currentAbsolutePoints[currentAbsolutePoints.length - 1],
            storageLastPoint: absolutePoints[absolutePoints.length - 1],
            reason: 'Current Fabric transformation differs from storage',
            timestamp: new Date().toISOString()
          });
        }

        // Capture position BEFORE smart update for flash/jump detection
        const positionBefore = {
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY,
          angle: polygon.angle
        };
        const timestampBefore = Date.now();

        // ⚡ FLASH DETECTION - Log position before smart update
        logger.info('⚡ BEFORE SMART UPDATE', {
          id: area.id,
          position: positionBefore,
          timestamp: new Date().toISOString()
        });

        // DEBUG: Log smart update start
        logger.info('🔄 SMART UPDATE START', {
          id: area.id,
          existingLeft: polygon.left,
          existingTop: polygon.top,
          absolutePointsCount: absolutePoints.length,
          firstAbsolutePoint: absolutePoints[0]
        });

        // Convert absolute points to relative points
        const minX = Math.min(...absolutePoints.map((p: any) => p.x));
        const minY = Math.min(...absolutePoints.map((p: any) => p.y));
        const relativePoints = absolutePoints.map((p: any) => ({
          x: p.x - minX,
          y: p.y - minY
        }));

        // DEBUG: Log coordinate conversion
        logger.info('🔄 COORDINATE CONVERSION', {
          id: area.id,
          minX,
          minY,
          firstRelativePoint: relativePoints[0],
          lastRelativePoint: relativePoints[relativePoints.length - 1]
        });

        // Update polygon with relative points and correct position
        polygon.set({
          points: relativePoints,
          left: minX,
          top: minY,
          scaleX: 1,
          scaleY: 1,
          angle: 0
        });

        const timestampAfterSet = Date.now();

        // ⚡ FLASH DETECTION - Log position after polygon.set()
        logger.info('⚡ AFTER SET', {
          id: area.id,
          position: { left: polygon.left, top: polygon.top, scaleX: polygon.scaleX, scaleY: polygon.scaleY },
          duration: timestampAfterSet - timestampBefore,
          timestamp: new Date().toISOString()
        });

        // DEBUG: Log after set
        logger.info('🔄 AFTER SET', {
          id: area.id,
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY
        });

        polygon.setCoords(); // Recalculate bounding box

        const timestampAfterSetCoords = Date.now();

        // ⚡ FLASH DETECTION - Log position after polygon.setCoords()
        logger.info('⚡ AFTER SETCOORDS', {
          id: area.id,
          position: { left: polygon.left, top: polygon.top },
          duration: timestampAfterSetCoords - timestampAfterSet,
          timestamp: new Date().toISOString()
        });

        // DEBUG: Log after setCoords
        logger.info('🔄 AFTER SETCOORDS', {
          id: area.id,
          left: polygon.left,
          top: polygon.top,
          aCoords: polygon.aCoords ? {
            tl: polygon.aCoords.tl,
            br: polygon.aCoords.br
          } : null
        });

        // ⚠️ POSITION JUMP DETECTION - Check if position changed unexpectedly
        const positionAfter = {
          left: polygon.left,
          top: polygon.top,
          scaleX: polygon.scaleX,
          scaleY: polygon.scaleY,
          angle: polygon.angle
        };

        const positionDiff = {
          left: (positionAfter.left || 0) - (positionBefore.left || 0),
          top: (positionAfter.top || 0) - (positionBefore.top || 0),
          scaleX: (positionAfter.scaleX || 1) - (positionBefore.scaleX || 1),
          scaleY: (positionAfter.scaleY || 1) - (positionBefore.scaleY || 1),
          angle: (positionAfter.angle || 0) - (positionBefore.angle || 0)
        };

        // Log if position changed (jump detected)
        if (Math.abs(positionDiff.left) > 0.1 || Math.abs(positionDiff.top) > 0.1) {
          logger.warn('⚠️ POSITION JUMP DETECTED', {
            id: area.id,
            before: positionBefore,
            after: positionAfter,
            diff: positionDiff,
            source: 'smart-update',
            timestamp: new Date().toISOString()
          });

          // Also log to console with expanded values for easy reading
          console.warn(`⚠️ POSITION JUMP DETECTED - Polygon: ${area.id}`);
          console.warn(`  BEFORE: left=${positionBefore.left}, top=${positionBefore.top}`);
          console.warn(`  AFTER:  left=${positionAfter.left}, top=${positionAfter.top}`);
          console.warn(`  DRIFT:  Δleft=${positionDiff.left.toFixed(2)}, Δtop=${positionDiff.top.toFixed(2)}`);
          console.warn(`  This polygon was NOT the one being dragged - it jumped during smart update!`);
        }

        (polygon as any).mapElementData = area; // Update metadata
        canvas.renderAll();

        logger.info('✅ SMART UPDATE COMPLETE', { id: area.id });
        return; // Skip recreation
      }

      // If object exists and is not a polygon, or if it's a different type, remove it
      if (existingObj) {
        canvas.remove(existingObj);
      }

      // Check if this is a polygon collision area
      if ('type' in area && (area as any).type === 'impassable-polygon' && (area as any).points) {
        // Polygon collision area - points are in absolute world coordinates
        // We need to convert them to relative coordinates for Fabric.js
        const polygonArea = area as any;
        const absolutePoints = polygonArea.points;

        // 🔃 [Polygon Load] Log polygon loaded from storage and being reconstructed in editor
        logger.info('🔃 [Polygon Load] RECONSTRUCTING IN EDITOR', {
          timestamp: new Date().toISOString(),
          id: area.id,
          name: area.name,
          type: polygonArea.type,
          pointsCount: absolutePoints.length,
          allPoints: absolutePoints,
          boundingBox: {
            x: polygonArea.x,
            y: polygonArea.y,
            width: polygonArea.width,
            height: polygonArea.height
          },
          color: polygonArea.color
        });

        // Calculate bounding box of absolute points
        const minX = Math.min(...absolutePoints.map((p: any) => p.x));
        const minY = Math.min(...absolutePoints.map((p: any) => p.y));

        // Convert absolute points to relative points (relative to top-left of bounding box)
        const relativePoints = absolutePoints.map((p: any) => ({
          x: p.x - minX,
          y: p.y - minY
        }));

        const polygon = new fabric.Polygon(relativePoints, {
          fill: 'rgba(239, 68, 68, 0.3)',
          stroke: '#ef4444',
          strokeWidth: 2,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          left: minX, // Position at the bounding box location
          top: minY,
          objectCaching: false // Disable caching for better transformation handling
        }) as CanvasObject;

        polygon.mapElementId = area.id;
        polygon.mapElementType = 'collision';
        polygon.mapElementData = area;

        canvas.add(polygon);

        // 🔃 [Polygon Load] Log polygon fully reconstructed and rendered on canvas
        logger.info('🔃 [Polygon Load] FULLY RECONSTRUCTED ON CANVAS', {
          timestamp: new Date().toISOString(),
          id: area.id,
          name: area.name,
          fabricObject: {
            left: polygon.left,
            top: polygon.top,
            width: polygon.width,
            height: polygon.height,
            pointsCount: (polygon as any).points?.length || 0
          },
          originalData: {
            pointsCount: absolutePoints.length,
            allPoints: absolutePoints,
            boundingBox: {
              x: polygonArea.x,
              y: polygonArea.y,
              width: polygonArea.width,
              height: polygonArea.height
            }
          },
          dataIntegrityCheck: {
            pointsCountMatch: ((polygon as any).points?.length || 0) === absolutePoints.length,
            positionMatch: polygon.left === minX && polygon.top === minY
          }
        });
      } else {
        // Regular collision area
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
      }
    });

    // Remove objects that no longer exist in the data
    existingAreasMap.forEach((obj, id) => {
      if (!processedIds.has(id)) {
        canvas.remove(obj);
      }
    });

    // Note: Layer order will be coordinated after all elements are loaded
    canvas.renderAll();
  }, [sharedMap.collisionAreas, gridSpacing]);

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
      if (drawingMode || currentTool === 'draw-polygon') {
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
  }, [drawingMode, currentTool]);

  // --- NEW: Effect to update impassable paint blocks when gridSpacing changes ---
  // This ensures all existing impassable painted rects match the selected grid size
  // (Moved to top-level, not nested in any other hooks)
  // Paint grid spacing update removed - only polygon collision areas are supported

  // Mouse event handlers for polygon drawing and rectangular area drawing
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Mouse events for polygon drawing and rectangular area drawing
    const handleMouseDown = (e: any) => {
      // Handle polygon drawing tool
      if (currentTool === 'draw-polygon') {
        e.e?.preventDefault();
        e.e?.stopPropagation();

        // Get pointer in world coordinates (accounting for zoom/pan)
        // DO NOT pass 'true' as second parameter - we want viewport transform applied
        const pointer = fabricCanvasRef.current?.getPointer(e.e);
        if (pointer) {
          addPolygonVertex(pointer);
        }
        return;
      }

      // Handle rectangular area drawing (interactive/collision)
      if (drawingMode || collisionDrawingMode) {
        e.e?.preventDefault();
        e.e?.stopPropagation();

        const pointer = e.absolutePointer || e.pointer || canvas.getPointer(e.e);
        if (pointer) {
          handleDrawingStart(new fabric.Point(pointer.x, pointer.y));
        }
      }
    };

    const handleMouseUp = () => {
      // Handle rectangular area drawing completion
      if ((drawingMode || collisionDrawingMode) && isDrawing) {
        handleDrawingEnd();
      }
    };

    const handleMouseMove = (e: any) => {
      // Use proper pointer to account for zoom/pan
      const pointer = fabricCanvasRef.current?.getPointer(e.e);

      // Handle polygon drawing preview
      if (currentTool === 'draw-polygon' && pointer && polygonDrawingState.isDrawing) {
        updatePolygonPreview(pointer);
        return;
      }

      // Handle rectangular area drawing
      if ((drawingMode || collisionDrawingMode) && isDrawing) {
        if (pointer) {
          handleDrawingMove(new fabric.Point(pointer.x, pointer.y));
        }
      }
    };

    // Paint functions removed - only polygon collision areas are supported

    // Handle double-click for polygon completion
    const handleDoubleClick = (e: any) => {
      if (currentTool === 'draw-polygon' && polygonDrawingState.isDrawing) {
        e.e?.preventDefault();
        e.e?.stopPropagation();
        completePolygon();
      }
    };

    // Add event listeners
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:dblclick', handleDoubleClick);

    // Cleanup function
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:dblclick', handleDoubleClick);
    };
  }, [
    drawingMode,
    collisionDrawingMode,
    isDrawing,
    handleDrawingStart,
    handleDrawingMove,
    handleDrawingEnd,
    currentTool,
    gridSpacing,
    sharedMap,
    polygonDrawingState,
    addPolygonVertex,
    updatePolygonPreview,
    completePolygon,
  ]);



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
