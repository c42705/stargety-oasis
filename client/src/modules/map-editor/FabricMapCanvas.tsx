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

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { useSharedMap } from '../../shared/useSharedMap';
import { InteractiveArea, ImpassableArea } from '../../shared/MapDataContext';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import './FabricMapCanvas.css';

interface FabricMapCanvasProps {
  width: number;
  height: number;
  gridVisible: boolean;
  gridSpacing: number;
  gridColor: string;
  gridOpacity: number;
  onSelectionChanged?: (selectedObjects: fabric.Object[]) => void;
  onObjectModified?: (object: fabric.Object) => void;
  onAreaDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  drawingMode?: boolean;
  drawingAreaData?: Partial<InteractiveArea>;
  className?: string;
}

interface CanvasObject extends fabric.Object {
  mapElementId?: string;
  mapElementType?: 'interactive' | 'collision';
  mapElementData?: InteractiveArea | ImpassableArea;
}

export interface FabricMapCanvasRef {
  getCanvas: () => fabric.Canvas | null;
  clearSelection: () => void;
  deleteSelected: () => Promise<void>;
  renderGrid: () => void;
  renderInteractiveAreas: () => void;
  renderCollisionAreas: () => void;
  enterDrawingMode: (areaData: Partial<InteractiveArea>) => void;
  exitDrawingMode: () => void;
}

export const FabricMapCanvas: React.FC<FabricMapCanvasProps> = ({
  width,
  height,
  gridVisible,
  gridSpacing,
  gridColor,
  gridOpacity,
  onSelectionChanged,
  onObjectModified,
  onAreaDrawn,
  drawingMode = false,
  drawingAreaData,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingRect, setDrawingRect] = useState<fabric.Rect | null>(null);
  const [drawingText, setDrawingText] = useState<fabric.Text | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isValidSize, setIsValidSize] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [areasToDelete, setAreasToDelete] = useState<{ id: string; name: string }[]>([]);
  const [forceRender, setForceRender] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Use shared map system
  const sharedMap = useSharedMap({ source: 'editor', autoSave: true });

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

  // Handle real-time object movement (immediate visual feedback)
  const handleObjectMoving = useCallback((object: CanvasObject) => {
    // Snap to grid if enabled
    if (gridVisible && gridSpacing > 0) {
      snapToGrid(object, gridSpacing);
    }

    // Trigger immediate update for real-time feedback (without persistence)
    onObjectModified?.(object);
  }, [gridVisible, gridSpacing, onObjectModified]);

  // Handle real-time object scaling (immediate visual feedback)
  const handleObjectScaling = useCallback((object: CanvasObject) => {
    // Maintain aspect ratio for certain objects if needed
    maintainAspectRatio(object);

    // Trigger immediate update for real-time feedback (without persistence)
    onObjectModified?.(object);
  }, [onObjectModified]);

  // Snap object to grid
  const snapToGrid = useCallback((object: fabric.Object, spacing: number) => {
    const left = Math.round((object.left || 0) / spacing) * spacing;
    const top = Math.round((object.top || 0) / spacing) * spacing;
    object.set({ left, top });
  }, []);

  // Maintain aspect ratio for specific objects
  const maintainAspectRatio = useCallback((object: fabric.Object) => {
    // Implementation for maintaining aspect ratio
    // This can be customized based on object type
  }, []);

  // Drawing mode handlers
  const handleDrawingStart = useCallback((pointer: fabric.Point) => {
    if (!fabricCanvasRef.current || !drawingMode) return;

    const canvas = fabricCanvasRef.current;
    setIsDrawing(true);
    setStartPoint({ x: pointer.x, y: pointer.y });
    setIsValidSize(false);

    // Create preview rectangle
    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: drawingAreaData?.color || '#4A90E2',
      fillOpacity: 0.3,
      stroke: drawingAreaData?.color || '#4A90E2',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    });

    // Create preview text label
    const text = new fabric.Text(drawingAreaData?.name || 'New Area', {
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
  }, [drawingMode, drawingAreaData]);

  const handleDrawingMove = useCallback((pointer: fabric.Point) => {
    if (!fabricCanvasRef.current || !isDrawing || !startPoint || !drawingRect) return;

    const width = Math.abs(pointer.x - startPoint.x);
    const height = Math.abs(pointer.y - startPoint.y);
    const left = Math.min(pointer.x, startPoint.x);
    const top = Math.min(pointer.y, startPoint.y);

    // Check if size meets minimum requirements
    const meetsMinSize = width >= MIN_AREA_SIZE && height >= MIN_AREA_SIZE;
    setIsValidSize(meetsMinSize);

    // Update rectangle appearance based on size validation
    const strokeColor = meetsMinSize ? (drawingAreaData?.color || '#4A90E2') : '#ff4d4f';
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
  }, [isDrawing, startPoint, drawingRect, drawingText, drawingAreaData, MIN_AREA_SIZE]);

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
    if (onAreaDrawn) {
      onAreaDrawn(bounds);
      console.log(`Area created successfully (${bounds.width}×${bounds.height}px)`);

      // Force immediate re-render of areas after creation
      setTimeout(() => {
        setForceRender(prev => prev + 1);
      }, 100);
    }

    canvas.renderAll();
  }, [isDrawing, startPoint, drawingRect, drawingText, onAreaDrawn, MIN_AREA_SIZE]);

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

  // Initialize Fabric.js canvas
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
      setIsInitialized(true);

      // Configure canvas for drawing mode
      const updateCanvasForDrawingMode = () => {
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
      };

      updateCanvasForDrawingMode();

      // Set up event listeners
      setupCanvasEventListeners(canvas);

      return () => {
        canvas.dispose();
        fabricCanvasRef.current = null;
        setIsInitialized(false);
      };
    }
  }, [width, height]);

  // Set up canvas event listeners
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

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gridVisible, gridSpacing, onSelectionChanged, onObjectModified, drawingMode, isDrawing, startPoint, drawingRect, onAreaDrawn, drawingAreaData]);



  // Update canvas size
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({ width, height });
      fabricCanvasRef.current.renderAll();
    }
  }, [width, height]);

  // Update canvas selection behavior based on drawing mode
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      canvas.selection = !drawingMode;
      canvas.defaultCursor = drawingMode ? 'crosshair' : 'default';
      canvas.hoverCursor = drawingMode ? 'crosshair' : 'move';

      // Disable object selection in drawing mode
      canvas.forEachObject((obj) => {
        obj.selectable = !drawingMode;
        obj.evented = !drawingMode;
      });

      canvas.renderAll();
    }
  }, [drawingMode]);

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

  // Render grid
  const renderGrid = useCallback(() => {
    if (!fabricCanvasRef.current || !gridVisible) return;

    const canvas = fabricCanvasRef.current;
    
    // Remove existing grid lines
    const gridObjects = canvas.getObjects().filter(obj => (obj as any).isGridLine);
    gridObjects.forEach(obj => canvas.remove(obj));

    if (gridSpacing <= 0) return;

    // Create vertical lines
    for (let x = 0; x <= width; x += gridSpacing) {
      const line = new fabric.Line([x, 0, x, height], {
        stroke: gridColor,
        strokeWidth: 1,
        opacity: gridOpacity / 100,
        selectable: false,
        evented: false,
        excludeFromExport: true
      });
      (line as any).isGridLine = true;
      canvas.add(line);
    }

    // Create horizontal lines
    for (let y = 0; y <= height; y += gridSpacing) {
      const line = new fabric.Line([0, y, width, y], {
        stroke: gridColor,
        strokeWidth: 1,
        opacity: gridOpacity / 100,
        selectable: false,
        evented: false,
        excludeFromExport: true
      });
      (line as any).isGridLine = true;
      canvas.add(line);
    }

    canvas.renderAll();
  }, [width, height, gridVisible, gridSpacing, gridColor, gridOpacity]);

  // Update grid when properties change
  useEffect(() => {
    if (isInitialized) {
      renderGrid();
    }
  }, [isInitialized, renderGrid]);

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

    canvas.renderAll();
  }, [sharedMap.collisionAreas]);

  // Update canvas when map data changes
  useEffect(() => {
    if (isInitialized) {
      renderInteractiveAreas();
      renderCollisionAreas();
    }
  }, [isInitialized, renderInteractiveAreas, renderCollisionAreas, forceRender]);

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
      if (drawingMode) {
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
      if (drawingMode && isDrawing) {
        handleDrawingEnd();
      }
    };

    const handleMouseMove = (e: any) => {
      if (drawingMode && isDrawing) {
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
  }, [drawingMode, isDrawing, handleDrawingStart, handleDrawingMove, handleDrawingEnd]);

  // Public methods for external control
  const getCanvas = useCallback(() => fabricCanvasRef.current, []);
  
  const clearSelection = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  const deleteSelected = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObjects = canvas.getActiveObjects();

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
  }, [sharedMap]);

  // Public methods for drawing mode
  const enterDrawingMode = useCallback((areaData: Partial<InteractiveArea>) => {
    // This will be handled by the parent component through props
    console.log('Enter drawing mode with area data:', areaData);
  }, []);

  const exitDrawingMode = useCallback(() => {
    // Clean up any drawing state
    if (drawingRect && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(drawingRect);
      fabricCanvasRef.current.renderAll();
    }
    setIsDrawing(false);
    setStartPoint(null);
    setDrawingRect(null);
  }, [drawingRect]);

  // Public methods available via props callbacks
  // TODO: Implement ref-based API when needed

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
    </div>
  );
};
