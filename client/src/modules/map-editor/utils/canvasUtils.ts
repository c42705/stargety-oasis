import * as fabric from 'fabric';
import { GridConfig } from '../types/editor.types';
import { InteractiveArea } from '../../../shared/MapDataContext';

export interface WorldDimensions {
  width: number;
  height: number;
}

/**
 * Initialize a new Fabric.js canvas with the given dimensions
 */
export const initializeFabricCanvas = (
  canvasElement: HTMLCanvasElement,
  dimensions: WorldDimensions
): fabric.Canvas => {
  return new fabric.Canvas(canvasElement, {
    width: dimensions.width,
    height: dimensions.height,
    backgroundColor: 'transparent'
  });
};

/**
 * Add grid pattern to the canvas
 */
export const addGridToCanvas = (
  canvas: fabric.Canvas,
  dimensions: WorldDimensions,
  gridConfig: GridConfig
): void => {
  const { width, height } = dimensions;
  const spacing = gridConfig.spacing;

  // Create vertical lines
  for (let x = 0; x <= width; x += spacing) {
    const line = new fabric.Line([x, 0, x, height], {
      stroke: '#4a5568', // Default grid color
      strokeWidth: 1,
      opacity: gridConfig.opacity / 100,
      selectable: false,
      evented: false
    });
    canvas.add(line);
  }

  // Create horizontal lines
  for (let y = 0; y <= height; y += spacing) {
    const line = new fabric.Line([0, y, width, y], {
      stroke: '#4a5568', // Default grid color
      strokeWidth: 1,
      opacity: gridConfig.opacity / 100,
      selectable: false,
      evented: false
    });
    canvas.add(line);
  }
};

/**
 * Add an interactive area to the canvas
 */
export const addInteractiveAreaToCanvas = (
  canvas: fabric.Canvas,
  area: InteractiveArea
): fabric.Group => {
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
    hasBorders: true
  });

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
    hasBorders: true
  });

  group.set('areaData', area);
  canvas.add(group);
  
  return group;
};

/**
 * Add an impassable area to the canvas
 */
export const addImpassableAreaToCanvas = (
  canvas: fabric.Canvas,
  area: any
): fabric.Rect => {
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
    hasBorders: true
  });

  rect.set('collisionData', area);
  canvas.add(rect);
  
  return rect;
};

/**
 * Clear and reinitialize canvas with current data
 */
export const updateCanvasObjects = (
  canvas: fabric.Canvas,
  dimensions: WorldDimensions,
  gridConfig: GridConfig,
  interactiveAreas: InteractiveArea[],
  impassableAreas: any[]
): void => {
  canvas.clear();

  // Add grid pattern if visible
  if (gridConfig.visible) {
    addGridToCanvas(canvas, dimensions, gridConfig);
  }

  // Add interactive areas
  interactiveAreas.forEach(area => {
    addInteractiveAreaToCanvas(canvas, area);
  });

  // Add impassable areas
  impassableAreas.forEach(area => {
    addImpassableAreaToCanvas(canvas, area);
  });

  canvas.renderAll();
};
