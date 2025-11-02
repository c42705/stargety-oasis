/**
 * Konva Map Editor - Rectangle Drawing Preview Component
 * 
 * Renders preview rectangle during drawing.
 */

import React from 'react';
import { Rect } from 'react-konva';
import type { ShapeCategory } from '../types';
import {
  RECTANGLE_DRAWING,
  SHAPE_STYLES,
} from '../constants/konvaConstants';

export interface RectangleDrawingPreviewProps {
  /** Preview rectangle geometry */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  
  /** Shape category for styling */
  category: ShapeCategory;
}

/**
 * Component for rendering rectangle drawing preview
 * 
 * Shows a dashed rectangle preview during drawing.
 */
export const RectangleDrawingPreview: React.FC<RectangleDrawingPreviewProps> = ({
  rect,
  category,
}) => {
  if (!rect) return null;

  // Get style for category
  const style = SHAPE_STYLES[category] || SHAPE_STYLES.collision;

  return (
    <Rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={RECTANGLE_DRAWING.PREVIEW_FILL}
      stroke={RECTANGLE_DRAWING.PREVIEW_STROKE}
      strokeWidth={RECTANGLE_DRAWING.PREVIEW_STROKE_WIDTH}
      dash={RECTANGLE_DRAWING.PREVIEW_DASH}
      opacity={RECTANGLE_DRAWING.PREVIEW_OPACITY}
      listening={false}
    />
  );
};

