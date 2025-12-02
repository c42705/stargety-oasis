/**
 * Grouping Utilities for Konva Map Editor
 * 
 * Provides functions for creating, managing, and dissolving shape groups.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Shape } from '../types';

/**
 * Create a group from multiple shapes
 * Assigns all shapes the same groupId
 */
export function createShapeGroup(shapes: Shape[], groupId?: string): Shape[] {
  const id = groupId || uuidv4();
  return shapes.map(shape => ({
    ...shape,
    metadata: {
      ...shape.metadata,
      groupId: id,
    },
  }));
}

/**
 * Dissolve a group by removing groupId from all shapes
 */
export function dissolveShapeGroup(shapes: Shape[]): Shape[] {
  return shapes.map(shape => ({
    ...shape,
    metadata: {
      ...shape.metadata,
      groupId: undefined,
    },
  }));
}

/**
 * Get all shapes in a group
 */
export function getShapesInGroup(shapes: Shape[], groupId: string): Shape[] {
  return shapes.filter(s => s.metadata.groupId === groupId);
}

/**
 * Check if shapes can be grouped (same category)
 */
export function canGroupShapes(shapes: Shape[]): boolean {
  if (shapes.length < 2) return false;
  const categories = new Set(shapes.map(s => s.category));
  return categories.size === 1;
}

/**
 * Get group color based on group ID (deterministic)
 */
export function getGroupColor(groupId: string): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Light Blue
  ];
  
  const hash = groupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Calculate bounding box for a group of shapes
 */
export function calculateGroupBounds(shapes: Shape[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach(shape => {
    if (shape.geometry.type === 'rectangle') {
      const { x, y, width, height } = shape.geometry;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    } else if (shape.geometry.type === 'polygon') {
      const { points } = shape.geometry;
      for (let i = 0; i < points.length; i += 2) {
        minX = Math.min(minX, points[i]);
        maxX = Math.max(maxX, points[i]);
        minY = Math.min(minY, points[i + 1]);
        maxY = Math.max(maxY, points[i + 1]);
      }
    } else if (shape.geometry.type === 'image') {
      const { x, y, width, height } = shape.geometry;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }
  });

  return {
    minX: isFinite(minX) ? minX : 0,
    minY: isFinite(minY) ? minY : 0,
    maxX: isFinite(maxX) ? maxX : 0,
    maxY: isFinite(maxY) ? maxY : 0,
    width: isFinite(maxX - minX) ? maxX - minX : 0,
    height: isFinite(maxY - minY) ? maxY - minY : 0,
  };
}

/**
 * Scale shapes in a group while maintaining aspect ratio and relative positions
 */
export function scaleGroupShapes(
  shapes: Shape[],
  scaleX: number,
  scaleY: number,
  lockAspectRatio: boolean = true
): Shape[] {
  if (shapes.length === 0) return shapes;

  // Calculate group bounds
  const bounds = calculateGroupBounds(shapes);
  const groupCenterX = bounds.minX + bounds.width / 2;
  const groupCenterY = bounds.minY + bounds.height / 2;

  // Use uniform scale if aspect ratio is locked
  const finalScaleX = lockAspectRatio ? Math.min(scaleX, scaleY) : scaleX;
  const finalScaleY = lockAspectRatio ? Math.min(scaleX, scaleY) : scaleY;

  return shapes.map(shape => {
    if (shape.geometry.type === 'rectangle') {
      const { x, y, width, height } = shape.geometry;

      // Calculate relative position from group center
      const relX = x - groupCenterX;
      const relY = y - groupCenterY;

      // Scale position and size
      const newX = groupCenterX + relX * finalScaleX;
      const newY = groupCenterY + relY * finalScaleY;
      const newWidth = width * finalScaleX;
      const newHeight = height * finalScaleY;

      return {
        ...shape,
        geometry: {
          ...shape.geometry,
          x: newX,
          y: newY,
          width: Math.max(5, newWidth),
          height: Math.max(5, newHeight),
        },
      };
    }
    // For polygons and images, apply similar scaling logic
    return shape;
  });
}

