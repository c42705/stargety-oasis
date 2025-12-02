/**
 * Konva Map Editor - Validation Utilities
 * 
 * Validation functions for shapes, coordinates, and editor constraints.
 * Provides comprehensive validation with detailed error messages.
 */

import type {
  Shape,
  ShapeGeometry,
  PolygonGeometry,
  RectangleGeometry,
  ShapeValidationResult,
  PolygonValidationOptions,
  RectangleValidationOptions,
} from '../types';
import { isPolygonGeometry, isRectangleGeometry } from '../types';
import { VALIDATION, POLYGON_DRAWING, RECTANGLE_DRAWING } from '../constants/konvaConstants';

// ============================================================================
// COORDINATE VALIDATION
// ============================================================================

/**
 * Validate a single coordinate value
 */
export function isValidCoordinate(value: number): boolean {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    isFinite(value) &&
    value >= VALIDATION.MIN_COORDINATE &&
    value <= VALIDATION.MAX_COORDINATE
  );
}

/**
 * Validate a point (x, y coordinates)
 */
export function isValidPoint(point: { x: number; y: number }): boolean {
  return isValidCoordinate(point.x) && isValidCoordinate(point.y);
}

/**
 * Validate an array of points
 */
export function areValidPoints(points: Array<{ x: number; y: number }>): boolean {
  return points.length > 0 && points.every(isValidPoint);
}

// ============================================================================
// POLYGON VALIDATION
// ============================================================================

/**
 * Calculate polygon area using shoelace formula
 */
function calculatePolygonArea(points: number[]): number {
  let area = 0;
  const n = points.length / 2;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = points[i * 2];
    const y1 = points[i * 2 + 1];
    const x2 = points[j * 2];
    const y2 = points[j * 2 + 1];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2);
}

/**
 * Check if polygon is self-intersecting
 * Uses line segment intersection algorithm
 */
function isPolygonSelfIntersecting(points: number[]): boolean {
  const n = points.length / 2;
  if (n < 4) return false; // Need at least 4 vertices to self-intersect

  // Check each edge against all non-adjacent edges
  for (let i = 0; i < n; i++) {
    const i1 = i;
    const i2 = (i + 1) % n;

    for (let j = i + 2; j < n; j++) {
      // Skip adjacent edges
      if (j === i || j === (i + 1) % n || (i === 0 && j === n - 1)) continue;

      const j1 = j;
      const j2 = (j + 1) % n;

      if (doLineSegmentsIntersect(
        points[i1 * 2], points[i1 * 2 + 1],
        points[i2 * 2], points[i2 * 2 + 1],
        points[j1 * 2], points[j1 * 2 + 1],
        points[j2 * 2], points[j2 * 2 + 1]
      )) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 */
function doLineSegmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false; // Parallel lines

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Validate polygon geometry
 */
export function validatePolygon(
  geometry: PolygonGeometry,
  options: PolygonValidationOptions = {}
): ShapeValidationResult {
  const {
    minVertices = POLYGON_DRAWING.MIN_VERTICES,
    minArea = VALIDATION.MIN_SHAPE_AREA,
    checkSelfIntersection = VALIDATION.CHECK_SELF_INTERSECTION,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check points array
  if (!geometry.points || !Array.isArray(geometry.points)) {
    errors.push('Polygon must have a points array');
    return { isValid: false, errors, warnings };
  }

  // Check points array length
  if (geometry.points.length % 2 !== 0) {
    errors.push('Polygon points array must have even length (pairs of x,y coordinates)');
  }

  const vertexCount = geometry.points.length / 2;

  // Check minimum vertices
  if (vertexCount < minVertices) {
    errors.push(`Polygon must have at least ${minVertices} vertices (has ${vertexCount})`);
  }

  // Check maximum vertices
  if (vertexCount > POLYGON_DRAWING.MAX_VERTICES) {
    errors.push(`Polygon cannot have more than ${POLYGON_DRAWING.MAX_VERTICES} vertices (has ${vertexCount})`);
  }

  // Validate coordinates
  for (let i = 0; i < geometry.points.length; i += 2) {
    if (!isValidCoordinate(geometry.points[i]) || !isValidCoordinate(geometry.points[i + 1])) {
      errors.push(`Invalid coordinate at vertex ${i / 2}: (${geometry.points[i]}, ${geometry.points[i + 1]})`);
    }
  }

  // If we have errors so far, return early
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Check area
  const area = calculatePolygonArea(geometry.points);
  if (area < minArea) {
    errors.push(`Polygon area (${area.toFixed(2)}) is below minimum (${minArea})`);
  }

  if (area > VALIDATION.MAX_SHAPE_AREA) {
    warnings.push(`Polygon area (${area.toFixed(2)}) is very large`);
  }

  // Check self-intersection
  if (checkSelfIntersection && isPolygonSelfIntersecting(geometry.points)) {
    errors.push('Polygon is self-intersecting');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// RECTANGLE VALIDATION
// ============================================================================

/**
 * Validate rectangle geometry
 */
export function validateRectangle(
  geometry: RectangleGeometry,
  options: RectangleValidationOptions = {}
): ShapeValidationResult {
  const {
    minWidth = RECTANGLE_DRAWING.MIN_WIDTH,
    minHeight = RECTANGLE_DRAWING.MIN_HEIGHT,
    maxWidth = VALIDATION.MAX_COORDINATE,
    maxHeight = VALIDATION.MAX_COORDINATE,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate position
  if (!isValidCoordinate(geometry.x)) {
    errors.push(`Invalid x coordinate: ${geometry.x}`);
  }
  if (!isValidCoordinate(geometry.y)) {
    errors.push(`Invalid y coordinate: ${geometry.y}`);
  }

  // Validate dimensions
  if (typeof geometry.width !== 'number' || geometry.width <= 0) {
    errors.push(`Invalid width: ${geometry.width}`);
  } else if (geometry.width < minWidth) {
    errors.push(`Width (${geometry.width}) is below minimum (${minWidth})`);
  } else if (geometry.width > maxWidth) {
    errors.push(`Width (${geometry.width}) exceeds maximum (${maxWidth})`);
  }

  if (typeof geometry.height !== 'number' || geometry.height <= 0) {
    errors.push(`Invalid height: ${geometry.height}`);
  } else if (geometry.height < minHeight) {
    errors.push(`Height (${geometry.height}) is below minimum (${minHeight})`);
  } else if (geometry.height > maxHeight) {
    errors.push(`Height (${geometry.height}) exceeds maximum (${maxHeight})`);
  }

  // Check area
  if (errors.length === 0) {
    const area = geometry.width * geometry.height;
    if (area < VALIDATION.MIN_SHAPE_AREA) {
      errors.push(`Rectangle area (${area}) is below minimum (${VALIDATION.MIN_SHAPE_AREA})`);
    }
    if (area > VALIDATION.MAX_SHAPE_AREA) {
      warnings.push(`Rectangle area (${area}) is very large`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// SHAPE VALIDATION
// ============================================================================

/**
 * Validate any shape geometry
 */
export function validateGeometry(geometry: ShapeGeometry): ShapeValidationResult {
  if (isPolygonGeometry(geometry)) {
    return validatePolygon(geometry);
  } else if (isRectangleGeometry(geometry)) {
    return validateRectangle(geometry);
  } else {
    return {
      isValid: false,
      errors: [`Unknown geometry type: ${(geometry as any).type}`],
      warnings: [],
    };
  }
}

/**
 * Validate a complete shape
 */
export function validateShape(shape: Shape): ShapeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate ID
  if (!shape.id || typeof shape.id !== 'string') {
    errors.push('Shape must have a valid ID');
  }

  // Validate category
  if (shape.category !== 'collision' && shape.category !== 'interactive') {
    errors.push(`Invalid category: ${shape.category}`);
  }

  // Validate geometry
  const geometryValidation = validateGeometry(shape.geometry);
  errors.push(...geometryValidation.errors);
  warnings.push(...geometryValidation.warnings);

  // Validate style
  if (!shape.style) {
    errors.push('Shape must have a style');
  } else {
    if (typeof shape.style.opacity !== 'number' || shape.style.opacity < 0 || shape.style.opacity > 1) {
      errors.push(`Invalid opacity: ${shape.style.opacity}`);
    }
    if (typeof shape.style.strokeWidth !== 'number' || shape.style.strokeWidth < 0) {
      errors.push(`Invalid stroke width: ${shape.style.strokeWidth}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an array of shapes
 */
export function validateShapes(shapes: Shape[]): ShapeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  shapes.forEach((shape, index) => {
    const result = validateShape(shape);
    if (!result.isValid) {
      errors.push(`Shape ${index} (${shape.id}): ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      warnings.push(`Shape ${index} (${shape.id}): ${result.warnings.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// BOUNDS VALIDATION
// ============================================================================

/**
 * Check if a point is within bounds
 */
export function isPointInBounds(
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Check if bounds are valid
 */
export function areValidBounds(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): boolean {
  return (
    isValidCoordinate(bounds.x) &&
    isValidCoordinate(bounds.y) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

