/**
 * Konva Map Editor - Transformable Shape Components
 * 
 * Shapes that can be selected, dragged, and resized with Transformer.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Rect, Line, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { Shape } from '../types';
import { SELECTION_STYLE } from '../constants/konvaConstants';

// ==========================================================================
// TRANSFORMABLE RECTANGLE
// ==========================================================================

export interface TransformableRectProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: (e: any) => void;
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
  onSelect: (e: any) => void;
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

// ==========================================================================
// TRANSFORMABLE IMAGE
// ==========================================================================

export interface TransformableImageProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: (e: any) => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (node: any) => void;
}

export const TransformableImage: React.FC<TransformableImageProps> = ({
  shape,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Load image from base64 data - must be before early return
  useEffect(() => {
    if (shape.geometry.type !== 'image') {
      console.warn('[TransformableImage] Shape geometry is not image type:', shape.geometry.type);
      return;
    }

    const geometry = shape.geometry;
    console.log('[TransformableImage] Loading image:', {
      id: shape.id,
      fileName: geometry.fileName,
      position: { x: geometry.x, y: geometry.y },
      size: { width: geometry.width, height: geometry.height },
      imageDataLength: geometry.imageData?.length || 0,
      imageDataPrefix: geometry.imageData?.substring(0, 30) || 'N/A'
    });

    const img = new window.Image();
    img.onload = () => {
      console.log('[TransformableImage] ✅ Image loaded successfully:', {
        id: shape.id,
        fileName: geometry.fileName,
        naturalSize: { width: img.naturalWidth, height: img.naturalHeight }
      });
      setImage(img);
    };
    img.onerror = (error) => {
      console.error('[TransformableImage] ❌ Failed to load image:', {
        id: shape.id,
        fileName: geometry.fileName,
        error
      });
    };
    img.src = geometry.imageData;
  }, [shape.geometry, shape.id]);

  if (shape.geometry.type !== 'image') {
    console.warn('[TransformableImage] Early return: geometry type is not image');
    return null;
  }

  const geometry = shape.geometry;

  if (!image) {
    console.log('[TransformableImage] Rendering placeholder (image not loaded yet):', {
      id: shape.id,
      fileName: geometry.fileName,
      position: { x: geometry.x, y: geometry.y },
      size: { width: geometry.width, height: geometry.height }
    });

    // Show placeholder while loading
    return (
      <Rect
        x={geometry.x}
        y={geometry.y}
        width={geometry.width}
        height={geometry.height}
        fill="#f0f0f0"
        stroke="#d9d9d9"
        strokeWidth={1}
        dash={[5, 5]}
      />
    );
  }

  console.log('[TransformableImage] Rendering image:', {
    id: shape.id,
    fileName: geometry.fileName,
    position: { x: geometry.x, y: geometry.y },
    size: { width: geometry.width, height: geometry.height },
    rotation: geometry.rotation || 0,
    scale: { x: geometry.scaleX || 1, y: geometry.scaleY || 1 },
    opacity: shape.style.opacity,
    isSelected
  });

  return (
    <KonvaImage
      ref={shapeRef}
      id={shape.id}
      name="shape"
      image={image}
      x={geometry.x}
      y={geometry.y}
      width={geometry.width}
      height={geometry.height}
      rotation={geometry.rotation || 0}
      scaleX={geometry.scaleX || 1}
      scaleY={geometry.scaleY || 1}
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
      // Add selection border when selected
      stroke={isSelected ? SELECTION_STYLE.STROKE : undefined}
      strokeWidth={isSelected ? SELECTION_STYLE.STROKE_WIDTH : 0}
    />
  );
};

