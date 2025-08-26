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
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use shared map system
  const sharedMap = useSharedMap({ source: 'editor', autoSave: true });

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
      const object = e.target;
      if (object) {
        // Snap to grid if enabled
        if (gridVisible && gridSpacing > 0) {
          snapToGrid(object, gridSpacing);
        }
      }
    });

    // Object scaling events
    canvas.on('object:scaling', (e) => {
      const object = e.target;
      if (object) {
        // Maintain aspect ratio for certain objects
        maintainAspectRatio(object);
      }
    });

    // Mouse events for custom interactions
    canvas.on('mouse:down', (e) => {
      // Handle custom mouse interactions
    });

    canvas.on('mouse:up', (e) => {
      // Handle mouse up events
    });

    canvas.on('mouse:move', (e) => {
      // Handle mouse move events for real-time feedback
    });
  }, [gridVisible, gridSpacing, onSelectionChanged, onObjectModified]);

  // Handle object modification and sync with shared map
  const handleObjectModified = useCallback(async (object: CanvasObject) => {
    if (!object.mapElementId || !object.mapElementType) return;

    try {
      const updates = {
        x: Math.round(object.left || 0),
        y: Math.round(object.top || 0),
        width: Math.round((object.width || 0) * (object.scaleX || 1)),
        height: Math.round((object.height || 0) * (object.scaleY || 1))
      };

      if (object.mapElementType === 'interactive') {
        await sharedMap.updateInteractiveArea(object.mapElementId, updates);
      } else if (object.mapElementType === 'collision') {
        await sharedMap.updateCollisionArea(object.mapElementId, updates);
      }
    } catch (error) {
      console.error('Failed to update map element:', error);
    }
  }, [sharedMap]);

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

  // Update canvas size
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({ width, height });
      fabricCanvasRef.current.renderAll();
    }
  }, [width, height]);

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

      // Add text label
      const text = new fabric.Text(area.name, {
        left: area.x + area.width / 2,
        top: area.y + area.height / 2,
        fontSize: 12,
        fill: 'white',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
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
  }, [isInitialized, renderInteractiveAreas, renderCollisionAreas]);

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

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
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
      fabricCanvasRef.current!.remove(obj);
    }
    fabricCanvasRef.current.renderAll();
  }, [sharedMap]);

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
    </div>
  );
};
