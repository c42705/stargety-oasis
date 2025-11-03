/**
 * Konva Map Editor - Selection Rectangle Component
 * 
 * Renders the drag-to-select rectangle.
 */

import React from 'react';
import { Rect } from 'react-konva';
import { SELECTION } from '../constants/konvaConstants';

export interface SelectionRectProps {
  /** Selection rectangle geometry */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Component for rendering selection rectangle
 * 
 * Shows a dashed rectangle during drag-to-select.
 */
export const SelectionRect: React.FC<SelectionRectProps> = ({ rect }) => {
  if (!rect) return null;

  // Normalize rectangle (handle negative width/height)
  const x = rect.width >= 0 ? rect.x : rect.x + rect.width;
  const y = rect.height >= 0 ? rect.y : rect.y + rect.height;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={SELECTION.RECT_FILL}
      stroke={SELECTION.RECT_STROKE}
      strokeWidth={SELECTION.RECT_STROKE_WIDTH}
      dash={SELECTION.RECT_DASH}
      listening={false}
    />
  );
};

