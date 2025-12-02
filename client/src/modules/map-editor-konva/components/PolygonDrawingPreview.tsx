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
  const style = category === 'collision' ? SHAPE_STYLES.COLLISION_DEFAULT : SHAPE_STYLES.INTERACTIVE_DEFAULT;

  return (
    <>
      {/* Preview lines */}
      {previewLines && previewLines.length > 0 && (
        <Line
          points={previewLines}
          stroke={POLYGON_DRAWING.PREVIEW_LINE_COLOR}
          strokeWidth={POLYGON_DRAWING.PREVIEW_LINE_WIDTH}
          dash={POLYGON_DRAWING.PREVIEW_LINE_DASH}
          opacity={0.7}
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
                ? POLYGON_DRAWING.VERTEX_RADIUS * 1.5
                : POLYGON_DRAWING.VERTEX_RADIUS
            }
            fill={
              isHovered
                ? '#ffff00'
                : isOrigin
                ? POLYGON_DRAWING.ORIGIN_VERTEX_FILL
                : POLYGON_DRAWING.VERTEX_FILL
            }
            stroke={
              isHovered
                ? '#ffaa00'
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

