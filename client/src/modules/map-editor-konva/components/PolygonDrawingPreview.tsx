/**
 * Konva Map Editor - Polygon Drawing Preview Component
 * 
 * Renders preview elements for polygon drawing:
 * - Vertices (circles)
 * - Preview lines
 * - Origin hover indicator
 */

import React from 'react';
import { Line, Circle } from 'react-konva';
import type { ShapeCategory } from '../types';
import {
  POLYGON_DRAWING,
  SHAPE_STYLES,
} from '../constants/konvaConstants';

export interface PolygonDrawingPreviewProps {
  /** Array of vertices */
  vertices: Array<{ x: number; y: number }>;
  
  /** Preview lines (flat array of coordinates) */
  previewLines: number[] | null;
  
  /** Whether origin is being hovered */
  isOriginHovered: boolean;
  
  /** Shape category for styling */
  category: ShapeCategory;
}

/**
 * Component for rendering polygon drawing preview
 * 
 * Shows vertices as circles, preview lines, and highlights origin when hovering.
 */
export const PolygonDrawingPreview: React.FC<PolygonDrawingPreviewProps> = ({
  vertices,
  previewLines,
  isOriginHovered,
  category,
}) => {
  // Get style for category
  const style = SHAPE_STYLES[category] || SHAPE_STYLES.collision;

  return (
    <>
      {/* Preview lines */}
      {previewLines && previewLines.length > 0 && (
        <Line
          points={previewLines}
          stroke={POLYGON_DRAWING.PREVIEW_STROKE}
          strokeWidth={POLYGON_DRAWING.PREVIEW_STROKE_WIDTH}
          dash={POLYGON_DRAWING.PREVIEW_DASH}
          opacity={POLYGON_DRAWING.PREVIEW_OPACITY}
          listening={false}
        />
      )}

      {/* Vertex circles */}
      {vertices.map((vertex, index) => {
        const isOrigin = index === 0;
        const isHovered = isOrigin && isOriginHovered;

        return (
          <Circle
            key={index}
            x={vertex.x}
            y={vertex.y}
            radius={
              isHovered
                ? POLYGON_DRAWING.VERTEX_RADIUS_HOVER
                : POLYGON_DRAWING.VERTEX_RADIUS
            }
            fill={
              isHovered
                ? POLYGON_DRAWING.VERTEX_FILL_HOVER
                : isOrigin
                ? POLYGON_DRAWING.VERTEX_FILL_ORIGIN
                : POLYGON_DRAWING.VERTEX_FILL
            }
            stroke={
              isHovered
                ? POLYGON_DRAWING.VERTEX_STROKE_HOVER
                : POLYGON_DRAWING.VERTEX_STROKE
            }
            strokeWidth={POLYGON_DRAWING.VERTEX_STROKE_WIDTH}
            listening={false}
          />
        );
      })}
    </>
  );
};

