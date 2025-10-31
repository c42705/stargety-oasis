/**
 * Konva Map Editor POC - Transformable Shape Components
 * Shapes that can be selected, dragged, resized, and rotated
 */

import React, { useEffect, useRef } from 'react';
import { Rect, Line, Transformer } from 'react-konva';
import { POCShape } from '../types/konva.types';
import Konva from 'konva';

interface TransformableShapeProps {
  shape: POCShape;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: Partial<POCShape['geometry']>) => void;
  selectionStroke: string;
  selectionStrokeWidth: number;
  selectionDash: number[];
}

export const TransformableRect: React.FC<TransformableShapeProps> = ({
  shape,
  isSelected,
  onSelect,
  onChange,
  selectionStroke,
  selectionStrokeWidth,
  selectionDash,
}) => {
  const shapeRef = useRef<Konva.Rect>(null);

  if (shape.geometry.type !== 'rect') return null;

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
      scaleX={geometry.scaleX || 1}
      scaleY={geometry.scaleY || 1}
      fill={shape.style.fill}
      stroke={isSelected ? selectionStroke : shape.style.stroke}
      strokeWidth={isSelected ? selectionStrokeWidth : shape.style.strokeWidth}
      dash={isSelected ? selectionDash : undefined}
      opacity={shape.style.opacity}
      draggable={isSelected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={(e) => {
        const node = shapeRef.current;
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale to 1 and adjust width/height instead
        node.scaleX(1);
        node.scaleY(1);

        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
};

export const TransformablePolygon: React.FC<TransformableShapeProps> = ({
  shape,
  isSelected,
  onSelect,
  onChange,
  selectionStroke,
  selectionStrokeWidth,
  selectionDash,
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
      x={geometry.x || 0}
      y={geometry.y || 0}
      rotation={geometry.rotation || 0}
      scaleX={geometry.scaleX || 1}
      scaleY={geometry.scaleY || 1}
      closed
      fill={shape.style.fill}
      stroke={isSelected ? selectionStroke : shape.style.stroke}
      strokeWidth={isSelected ? selectionStrokeWidth : shape.style.strokeWidth}
      dash={isSelected ? selectionDash : undefined}
      opacity={shape.style.opacity}
      draggable={isSelected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={(e) => {
        const node = shapeRef.current;
        if (!node) return;

        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        });
      }}
    />
  );
};

interface TransformerComponentProps {
  selectedShapeIds: string[];
  shapes: POCShape[];
  onTransformEnd?: () => void;
}

export const TransformerComponent: React.FC<TransformerComponentProps> = ({
  selectedShapeIds,
  shapes,
  onTransformEnd,
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
      onTransformEnd={onTransformEnd}
    />
  );
};

