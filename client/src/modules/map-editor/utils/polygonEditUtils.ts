/**
 * Polygon Edit Mode Utilities
 * 
 * Provides utilities for editing polygon vertices in the map editor.
 * Supports vertex dragging, insertion, and deletion.
 */

import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';

export interface PolygonEditHandles {
  vertexHandles: fabric.Circle[];
  edgeHandles: fabric.Circle[];
}

/**
 * Create vertex handles for polygon editing
 */
export function createVertexHandles(
  polygon: fabric.Polygon,
  canvas: fabric.Canvas
): fabric.Circle[] {
  const matrix = polygon.calcTransformMatrix();
  const absolutePoints = polygon.points?.map((point) => {
    const transformedPoint = fabric.util.transformPoint(
      { x: point.x, y: point.y },
      matrix
    );
    return {
      x: Math.round(transformedPoint.x),
      y: Math.round(transformedPoint.y)
    };
  }) || [];

  const vertexHandles: fabric.Circle[] = [];
  
  absolutePoints.forEach((point, index) => {
    const handle = new fabric.Circle({
      left: point.x,
      top: point.y,
      radius: 6,
      fill: '#3b82f6',
      stroke: '#fff',
      strokeWidth: 2,
      selectable: true,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      hoverCursor: 'move'
    });
    
    (handle as any).isVertexHandle = true;
    (handle as any).polygonId = (polygon as any).mapElementId;
    (handle as any).vertexIndex = index;
    
    canvas.add(handle);
    vertexHandles.push(handle);
  });

  return vertexHandles;
}

/**
 * Create edge handles for vertex insertion
 */
export function createEdgeHandles(
  polygon: fabric.Polygon,
  canvas: fabric.Canvas
): fabric.Circle[] {
  const matrix = polygon.calcTransformMatrix();
  const absolutePoints = polygon.points?.map((point) => {
    const transformedPoint = fabric.util.transformPoint(
      { x: point.x, y: point.y },
      matrix
    );
    return {
      x: Math.round(transformedPoint.x),
      y: Math.round(transformedPoint.y)
    };
  }) || [];

  const edgeHandles: fabric.Circle[] = [];
  
  for (let i = 0; i < absolutePoints.length; i++) {
    const nextIndex = (i + 1) % absolutePoints.length;
    const midX = (absolutePoints[i].x + absolutePoints[nextIndex].x) / 2;
    const midY = (absolutePoints[i].y + absolutePoints[nextIndex].y) / 2;
    
    const edgeHandle = new fabric.Circle({
      left: midX,
      top: midY,
      radius: 4,
      fill: '#10b981',
      stroke: '#fff',
      strokeWidth: 2,
      selectable: false,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      hoverCursor: 'pointer',
      opacity: 0.7
    });
    
    (edgeHandle as any).isEdgeHandle = true;
    (edgeHandle as any).polygonId = (polygon as any).mapElementId;
    (edgeHandle as any).edgeIndex = i;
    
    canvas.add(edgeHandle);
    edgeHandles.push(edgeHandle);
  }

  return edgeHandles;
}

/**
 * Update polygon points from vertex handle positions
 */
export function updatePolygonFromHandles(
  polygon: fabric.Polygon,
  vertexHandles: fabric.Circle[],
  canvas: fabric.Canvas
): void {
  // Get new absolute points from handle positions
  const newAbsolutePoints = vertexHandles.map(handle => ({
    x: handle.left || 0,
    y: handle.top || 0
  }));

  // Calculate new bounding box
  const xs = newAbsolutePoints.map(p => p.x);
  const ys = newAbsolutePoints.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  // Convert to relative points
  const relativePoints = newAbsolutePoints.map(p => ({
    x: p.x - minX,
    y: p.y - minY
  }));

  // Update polygon
  polygon.set({
    points: relativePoints,
    left: minX,
    top: minY,
    scaleX: 1,
    scaleY: 1,
    angle: 0
  });

  polygon.setCoords();
  canvas.renderAll();

  logger.info('Polygon updated from handles', {
    id: (polygon as any).mapElementId,
    pointsCount: relativePoints.length
  });
}

/**
 * Remove all edit handles from canvas
 */
export function removeEditHandles(
  handles: PolygonEditHandles,
  canvas: fabric.Canvas
): void {
  [...handles.vertexHandles, ...handles.edgeHandles].forEach(handle => {
    canvas.remove(handle);
  });
}

/**
 * Insert a new vertex at an edge handle position
 */
export function insertVertex(
  polygon: fabric.Polygon,
  edgeIndex: number,
  position: { x: number; y: number },
  canvas: fabric.Canvas
): void {
  const matrix = polygon.calcTransformMatrix();
  const absolutePoints = polygon.points?.map((point) => {
    const transformedPoint = fabric.util.transformPoint(
      { x: point.x, y: point.y },
      matrix
    );
    return {
      x: Math.round(transformedPoint.x),
      y: Math.round(transformedPoint.y)
    };
  }) || [];

  // Insert new point after the edge index
  absolutePoints.splice(edgeIndex + 1, 0, position);

  // Calculate new bounding box
  const xs = absolutePoints.map(p => p.x);
  const ys = absolutePoints.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  // Convert to relative points
  const relativePoints = absolutePoints.map(p => ({
    x: p.x - minX,
    y: p.y - minY
  }));

  // Update polygon
  polygon.set({
    points: relativePoints,
    left: minX,
    top: minY,
    scaleX: 1,
    scaleY: 1,
    angle: 0
  });

  polygon.setCoords();
  canvas.renderAll();

  logger.info('Vertex inserted', {
    id: (polygon as any).mapElementId,
    edgeIndex,
    newPointsCount: relativePoints.length
  });
}

/**
 * Delete a vertex from the polygon
 */
export function deleteVertex(
  polygon: fabric.Polygon,
  vertexIndex: number,
  canvas: fabric.Canvas
): boolean {
  const matrix = polygon.calcTransformMatrix();
  const absolutePoints = polygon.points?.map((point) => {
    const transformedPoint = fabric.util.transformPoint(
      { x: point.x, y: point.y },
      matrix
    );
    return {
      x: Math.round(transformedPoint.x),
      y: Math.round(transformedPoint.y)
    };
  }) || [];

  // Don't allow deletion if polygon would have less than 3 points
  if (absolutePoints.length <= 3) {
    logger.warn('Cannot delete vertex - polygon must have at least 3 points');
    return false;
  }

  // Remove the vertex
  absolutePoints.splice(vertexIndex, 1);

  // Calculate new bounding box
  const xs = absolutePoints.map(p => p.x);
  const ys = absolutePoints.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  // Convert to relative points
  const relativePoints = absolutePoints.map(p => ({
    x: p.x - minX,
    y: p.y - minY
  }));

  // Update polygon
  polygon.set({
    points: relativePoints,
    left: minX,
    top: minY,
    scaleX: 1,
    scaleY: 1,
    angle: 0
  });

  polygon.setCoords();
  canvas.renderAll();

  logger.info('Vertex deleted', {
    id: (polygon as any).mapElementId,
    vertexIndex,
    newPointsCount: relativePoints.length
  });

  return true;
}

/**
 * Update edge handle positions based on current vertex positions
 */
export function updateEdgeHandles(
  vertexHandles: fabric.Circle[],
  edgeHandles: fabric.Circle[]
): void {
  for (let i = 0; i < edgeHandles.length; i++) {
    const nextIndex = (i + 1) % vertexHandles.length;
    const midX = ((vertexHandles[i].left || 0) + (vertexHandles[nextIndex].left || 0)) / 2;
    const midY = ((vertexHandles[i].top || 0) + (vertexHandles[nextIndex].top || 0)) / 2;
    
    edgeHandles[i].set({
      left: midX,
      top: midY
    });
  }
}

