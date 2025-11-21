/**
 * Zoom to Shape Utility
 *
 * Calculates viewport zoom and pan to fit a shape in the viewport with padding.
 */

import type { Shape, Viewport, RectangleGeometry, PolygonGeometry, ImageGeometry } from '../types';

interface ShapeBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculate bounding box for a shape
 */
export function getShapeBounds(shape: Shape): ShapeBounds {
  const geom = shape.geometry;

  if (geom.type === 'rectangle') {
    const rectGeom = geom as RectangleGeometry;
    return {
      left: rectGeom.x,
      top: rectGeom.y,
      width: rectGeom.width,
      height: rectGeom.height
    };
  } else if (geom.type === 'polygon') {
    const polyGeom = geom as PolygonGeometry;
    const points = polyGeom.points;

    if (points.length < 2) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }

    // Calculate bounding box from polygon points
    let minX = points[0];
    let minY = points[1];
    let maxX = points[0];
    let maxY = points[1];

    for (let i = 2; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  } else if (geom.type === 'image') {
    const imageGeom = geom as ImageGeometry;
    return {
      left: imageGeom.x,
      top: imageGeom.y,
      width: imageGeom.width,
      height: imageGeom.height
    };
  }

  return { left: 0, top: 0, width: 0, height: 0 };
}

/**
 * Calculate viewport to zoom and center on a shape with padding
 * 
 * @param shape - The shape to zoom to
 * @param viewportWidth - Width of the viewport
 * @param viewportHeight - Height of the viewport
 * @param paddingPercent - Padding around the shape as a percentage (default: 0.2 for 20%)
 * @returns New viewport with zoom and pan adjusted to fit the shape
 */
export function calculateZoomToShape(
  shape: Shape,
  viewportWidth: number,
  viewportHeight: number,
  paddingPercent: number = 0.2
): Viewport {
  const bounds = getShapeBounds(shape);

  // Calculate margins (20% padding = 10% on each side)
  const margin = viewportWidth * (paddingPercent / 2);
  const verticalMargin = viewportHeight * (paddingPercent / 2);

  // Calculate zoom to fit
  const zoomX = (viewportWidth - margin * 2) / bounds.width;
  const zoomY = (viewportHeight - verticalMargin * 2) / bounds.height;
  let fitZoom = Math.min(zoomX, zoomY);

  // Clamp zoom between 0.1 and 3
  fitZoom = Math.max(0.1, Math.min(fitZoom, 3));

  // Calculate pan to center the shape
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;

  const panX = viewportWidth / 2 - centerX * fitZoom;
  const panY = viewportHeight / 2 - centerY * fitZoom;

  return {
    zoom: fitZoom,
    pan: {
      x: panX,
      y: panY
    }
  };
}

