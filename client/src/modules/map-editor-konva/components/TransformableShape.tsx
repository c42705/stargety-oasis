/**
 * Konva Map Editor - Transformable Shape Components
 * 
 * Shapes that can be selected, dragged, and resized with Transformer.
 */

import React, { useEffect, useRef } from 'react';
import { Rect, Line, Transformer } from 'react-konva';
import Konva from 'konva';
import type { Shape } from '../types';
import { SELECTION_STYLE } from '../constants/konvaConstants';

// ==========================================================================
// TRANSFORMABLE RECTANGLE
// ==========================================================================

export interface TransformableRectProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (node: any) => void;
}

export const TransformableRect: React.FC<TransformableRectProps> = ({
  shape,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}) => {
  const shapeRef = useRef<Konva.Rect>(null);

  if (shape.geometry.type !== 'rectangle') return null;

  const geometry = shape.geometry;

  return (
    <Rect
      ref={shapeRef}
      id={shape.id}
      name="shape"
      x={geometry.x}
      y={geometry.y}
      width={geometry.width}
      height={geometry.height}
      rotation={geometry.rotation || 0}
      fill={shape.style.fill}
      stroke={isSelected ? SELECTION_STYLE.STROKE : shape.style.stroke}
      strokeWidth={isSelected ? SELECTION_STYLE.STROKE_WIDTH : shape.style.strokeWidth}
      opacity={shape.style.opacity}
      draggable={isSelected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = shapeRef.current;
        if (node) {
          onTransformEnd(node);
        }
      }}
    />
  );
};

// ==========================================================================
// TRANSFORMABLE POLYGON
// ==========================================================================

export interface TransformablePolygonProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (node: any) => void;
}

export const TransformablePolygon: React.FC<TransformablePolygonProps> = ({
  shape,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}) => {
  const shapeRef = useRef<Konva.Line>(null);

  if (shape.geometry.type !== 'polygon') return null;

  const geometry = shape.geometry;

  return (
    <Line
      ref={shapeRef}
      id={shape.id}
      name="shape"
      points={geometry.points}
      x={0}
      y={0}
      rotation={geometry.rotation || 0}
      closed
      fill={shape.style.fill}
      stroke={isSelected ? SELECTION_STYLE.STROKE : shape.style.stroke}
      strokeWidth={isSelected ? SELECTION_STYLE.STROKE_WIDTH : shape.style.strokeWidth}
      opacity={shape.style.opacity}
      draggable={isSelected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = shapeRef.current;
        if (node) {
          onTransformEnd(node);
        }
      }}
    />
  );
};

// ==========================================================================
// TRANSFORMER COMPONENT
// ==========================================================================

export interface TransformerComponentProps {
  selectedShapeIds: string[];
}

export const TransformerComponent: React.FC<TransformerComponentProps> = ({
  selectedShapeIds,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    // Find the selected nodes
    const stage = transformer.getStage();
    if (!stage) return;

    const selectedNodes: Konva.Node[] = [];
    
    selectedShapeIds.forEach((id) => {
      const node = stage.findOne(`#${id}`);
      if (node) {
        selectedNodes.push(node);
      }
    });

    // Attach transformer to selected nodes
    transformer.nodes(selectedNodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedShapeIds]);

  // Only render transformer if there are selected shapes
  if (selectedShapeIds.length === 0) {
    return null;
  }

  return (
    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Limit resize to minimum 5x5 pixels
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
      rotateEnabled={true}
      enabledAnchors={[
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'top-center',
        'middle-right',
        'middle-left',
        'bottom-center',
      ]}
    />
  );
};

