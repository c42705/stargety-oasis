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
  const style = category === 'collision' ? SHAPE_STYLES.COLLISION_DEFAULT : SHAPE_STYLES.INTERACTIVE_DEFAULT;

  const isValid = rect.width >= RECTANGLE_DRAWING.MIN_WIDTH && rect.height >= RECTANGLE_DRAWING.MIN_HEIGHT;

  return (
    <Rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={style.fill}
      stroke={isValid ? RECTANGLE_DRAWING.VALID_STROKE : RECTANGLE_DRAWING.INVALID_STROKE}
      strokeWidth={RECTANGLE_DRAWING.PREVIEW_STROKE_WIDTH}
      dash={[5, 5]}
      opacity={RECTANGLE_DRAWING.PREVIEW_FILL_OPACITY}
      listening={false}
    />
  );
};

