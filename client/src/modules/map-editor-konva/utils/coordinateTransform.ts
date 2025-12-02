/**
 * Konva Map Editor - Coordinate Transformation Utilities
 * 
 * Utilities for converting between screen coordinates and world (canvas) coordinates.
 * Essential for accurate drawing and interaction with zoom and pan transformations.
 */

import type { Viewport } from '../types';

// ============================================================================
// BASIC TRANSFORMATIONS
// ============================================================================

/**
 * Convert screen coordinates to world (canvas) coordinates
 * 
 * Screen coordinates are the raw mouse/pointer positions.
 * World coordinates are the actual positions on the canvas accounting for zoom and pan.
 * 
 * @param screenX - X coordinate in screen space
 * @param screenY - Y coordinate in screen space
 * @param viewport - Current viewport state (zoom and pan)
 * @returns World coordinates
 * 
 * @example
 * ```typescript
 * const handleClick = (e: KonvaEventObject) => {
 *   const stage = e.target.getStage();
 *   const pointerPos = stage.getPointerPosition();
 *   const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
 *   // worldPos now contains the actual canvas coordinates
 * };
 * ```
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: (screenX - viewport.pan.x) / viewport.zoom,
    y: (screenY - viewport.pan.y) / viewport.zoom,
  };
}

/**
 * Convert world (canvas) coordinates to screen coordinates
 * 
 * World coordinates are positions on the canvas.
 * Screen coordinates are the actual pixel positions on the screen.
 * 
 * @param worldX - X coordinate in world space
 * @param worldY - Y coordinate in world space
 * @param viewport - Current viewport state (zoom and pan)
 * @returns Screen coordinates
 * 
 * @example
 * ```typescript
 * const screenPos = worldToScreen(shape.x, shape.y, viewport);
 * // screenPos contains the pixel position on screen
 * ```
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: worldX * viewport.zoom + viewport.pan.x,
    y: worldY * viewport.zoom + viewport.pan.y,
  };
}

// ============================================================================
// DISTANCE TRANSFORMATIONS
// ============================================================================

/**
 * Convert screen distance to world distance
 * 
 * Useful for thresholds and measurements that need to be consistent
 * regardless of zoom level.
 * 
 * @param screenDistance - Distance in screen pixels
 * @param viewport - Current viewport state
 * @returns Distance in world units
 * 
 * @example
 * ```typescript
 * // 10 pixels in screen space, regardless of zoom
 * const worldThreshold = screenDistanceToWorld(10, viewport);
 * ```
 */
export function screenDistanceToWorld(
  screenDistance: number,
  viewport: Viewport
): number {
  return screenDistance / viewport.zoom;
}

/**
 * Convert world distance to screen distance
 * 
 * @param worldDistance - Distance in world units
 * @param viewport - Current viewport state
 * @returns Distance in screen pixels
 * 
 * @example
 * ```typescript
 * const screenSize = worldDistanceToScreen(100, viewport);
 * ```
 */
export function worldDistanceToScreen(
  worldDistance: number,
  viewport: Viewport
): number {
  return worldDistance * viewport.zoom;
}

// ============================================================================
// BOUNDS TRANSFORMATIONS
// ============================================================================

/**
 * Convert screen bounds to world bounds
 * 
 * @param screenBounds - Bounds in screen space
 * @param viewport - Current viewport state
 * @returns Bounds in world space
 */
export function screenBoundsToWorld(
  screenBounds: { x: number; y: number; width: number; height: number },
  viewport: Viewport
): { x: number; y: number; width: number; height: number } {
  const topLeft = screenToWorld(screenBounds.x, screenBounds.y, viewport);
  const bottomRight = screenToWorld(
    screenBounds.x + screenBounds.width,
    screenBounds.y + screenBounds.height,
    viewport
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

/**
 * Convert world bounds to screen bounds
 * 
 * @param worldBounds - Bounds in world space
 * @param viewport - Current viewport state
 * @returns Bounds in screen space
 */
export function worldBoundsToScreen(
  worldBounds: { x: number; y: number; width: number; height: number },
  viewport: Viewport
): { x: number; y: number; width: number; height: number } {
  const topLeft = worldToScreen(worldBounds.x, worldBounds.y, viewport);
  const bottomRight = worldToScreen(
    worldBounds.x + worldBounds.width,
    worldBounds.y + worldBounds.height,
    viewport
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

// ============================================================================
// POINT ARRAY TRANSFORMATIONS
// ============================================================================

/**
 * Convert array of screen points to world points
 * 
 * @param screenPoints - Array of points in screen space
 * @param viewport - Current viewport state
 * @returns Array of points in world space
 * 
 * @example
 * ```typescript
 * const worldVertices = screenPointsToWorld(
 *   [{ x: 100, y: 100 }, { x: 200, y: 200 }],
 *   viewport
 * );
 * ```
 */
export function screenPointsToWorld(
  screenPoints: Array<{ x: number; y: number }>,
  viewport: Viewport
): Array<{ x: number; y: number }> {
  return screenPoints.map((point) => screenToWorld(point.x, point.y, viewport));
}

/**
 * Convert array of world points to screen points
 * 
 * @param worldPoints - Array of points in world space
 * @param viewport - Current viewport state
 * @returns Array of points in screen space
 */
export function worldPointsToScreen(
  worldPoints: Array<{ x: number; y: number }>,
  viewport: Viewport
): Array<{ x: number; y: number }> {
  return worldPoints.map((point) => worldToScreen(point.x, point.y, viewport));
}

/**
 * Convert flat array of screen coordinates to world coordinates
 * 
 * Useful for Konva polygon points format: [x1, y1, x2, y2, ...]
 * 
 * @param screenPoints - Flat array of coordinates [x1, y1, x2, y2, ...]
 * @param viewport - Current viewport state
 * @returns Flat array of world coordinates
 * 
 * @example
 * ```typescript
 * const worldPoints = screenPointsFlatToWorld([100, 100, 200, 200], viewport);
 * // Returns [worldX1, worldY1, worldX2, worldY2]
 * ```
 */
export function screenPointsFlatToWorld(
  screenPoints: number[],
  viewport: Viewport
): number[] {
  const result: number[] = [];
  for (let i = 0; i < screenPoints.length; i += 2) {
    const world = screenToWorld(screenPoints[i], screenPoints[i + 1], viewport);
    result.push(world.x, world.y);
  }
  return result;
}

/**
 * Convert flat array of world coordinates to screen coordinates
 * 
 * @param worldPoints - Flat array of coordinates [x1, y1, x2, y2, ...]
 * @param viewport - Current viewport state
 * @returns Flat array of screen coordinates
 */
export function worldPointsFlatToScreen(
  worldPoints: number[],
  viewport: Viewport
): number[] {
  const result: number[] = [];
  for (let i = 0; i < worldPoints.length; i += 2) {
    const screen = worldToScreen(worldPoints[i], worldPoints[i + 1], viewport);
    result.push(screen.x, screen.y);
  }
  return result;
}

// ============================================================================
// ZOOM UTILITIES
// ============================================================================

/**
 * Calculate new viewport for zooming to a specific point
 * 
 * This ensures the point under the cursor stays in the same position
 * when zooming in or out.
 * 
 * @param point - Point to zoom to (in screen coordinates)
 * @param newZoom - New zoom level
 * @param currentViewport - Current viewport state
 * @returns New viewport with updated zoom and pan
 * 
 * @example
 * ```typescript
 * const newViewport = zoomToPoint(
 *   { x: mouseX, y: mouseY },
 *   viewport.zoom * 1.2,
 *   viewport
 * );
 * setViewport(newViewport);
 * ```
 */
export function zoomToPoint(
  point: { x: number; y: number },
  newZoom: number,
  currentViewport: Viewport
): Viewport {
  // Calculate the point in world coordinates before zoom
  const worldPoint = {
    x: (point.x - currentViewport.pan.x) / currentViewport.zoom,
    y: (point.y - currentViewport.pan.y) / currentViewport.zoom,
  };

  // Calculate new pan to keep the world point under the cursor
  const newPan = {
    x: point.x - worldPoint.x * newZoom,
    y: point.y - worldPoint.y * newZoom,
  };

  return {
    zoom: newZoom,
    pan: newPan,
  };
}

/**
 * Calculate viewport to fit bounds in view
 * 
 * @param bounds - Bounds to fit (in world coordinates)
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @param padding - Padding around bounds (in pixels)
 * @returns Viewport that fits the bounds
 * 
 * @example
 * ```typescript
 * const viewport = fitBoundsInView(
 *   { x: 0, y: 0, width: 800, height: 600 },
 *   1920,
 *   1080,
 *   50
 * );
 * ```
 */
export function fitBoundsInView(
  bounds: { x: number; y: number; width: number; height: number },
  containerWidth: number,
  containerHeight: number,
  padding: number = 50
): Viewport {
  // Calculate zoom to fit bounds with padding
  const zoomX = (containerWidth - padding * 2) / bounds.width;
  const zoomY = (containerHeight - padding * 2) / bounds.height;
  const zoom = Math.min(zoomX, zoomY);

  // Calculate pan to center bounds
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  const pan = {
    x: containerWidth / 2 - centerX * zoom,
    y: containerHeight / 2 - centerY * zoom,
  };

  return { zoom, pan };
}

