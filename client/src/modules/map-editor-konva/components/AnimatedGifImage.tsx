/**
 * AnimatedGifImage Component
 * 
 * Renders animated GIF files on the Konva canvas using the gifler library.
 * Supports play/pause, speed control, and performance optimizations.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Image as KonvaImage, Group, Circle, Rect } from 'react-konva';
import Konva from 'konva';
import gifler from 'gifler';
import { logger } from '../../../shared/logger';
import type { Shape, ImageGeometry } from '../types';
import { SELECTION_STYLE } from '../constants/konvaConstants';

interface AnimatedGifImageProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (node: Konva.Image) => void;
}

export const AnimatedGifImage: React.FC<AnimatedGifImageProps> = ({
  shape,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}) => {
  const imageRef = useRef<Konva.Image>(null);
  const groupRef = useRef<Konva.Group>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animatorRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentFrame, setCurrentFrame] = useState(0);

  // Get geometry (ensure it's image type)
  const geometry = shape.geometry.type === 'image' ? (shape.geometry as ImageGeometry) : null;

  /**
   * Initialize GIF animation
   */
  useEffect(() => {
    // Skip if geometry is not valid
    if (!geometry) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    setIsLoading(true);
    setHasError(false);

    logger.info('ANIMATED_GIF_LOADING', {
      id: shape.id,
      fileName: geometry.fileName,
      position: { x: geometry.x, y: geometry.y },
      size: { width: geometry.width, height: geometry.height }
    });

    try {
      // Frame callback - called for each frame
      const onDrawFrame = (ctx: CanvasRenderingContext2D, frame: any) => {
        try {
          // Update canvas size on first frame
          if (canvas.width !== frame.width || canvas.height !== frame.height) {
            canvas.width = frame.width;
            canvas.height = frame.height;
          }

          // Draw current frame
          ctx.drawImage(frame.buffer, 0, 0);

          // Update current frame index from animator's internal _frameIndex
          if (animatorRef.current && typeof animatorRef.current._frameIndex === 'number') {
            setCurrentFrame(animatorRef.current._frameIndex);
          }

          // Refresh Konva layer
          imageRef.current?.getLayer()?.batchDraw();
        } catch (error) {
          logger.error('ANIMATED_GIF_FRAME_ERROR', {
            shapeId: shape.id,
            error
          });
        }
      };

      // Validate imageData before loading
      if (!geometry.imageData) {
        logger.error('ANIMATED_GIF_LOAD_ERROR', {
          shapeId: shape.id,
          fileName: geometry.fileName,
          error: 'imageData is null or undefined'
        });
        setHasError(true);
        setIsLoading(false);
        return;
      }

      // Check if imageData is a valid data URL
      if (typeof geometry.imageData !== 'string') {
        logger.error('ANIMATED_GIF_LOAD_ERROR', {
          shapeId: shape.id,
          fileName: geometry.fileName,
          error: 'imageData is not a string',
          imageDataType: typeof geometry.imageData
        });
        setHasError(true);
        setIsLoading(false);
        return;
      }

      if (!geometry.imageData.startsWith('data:image/gif')) {
        logger.error('ANIMATED_GIF_LOAD_ERROR', {
          shapeId: shape.id,
          fileName: geometry.fileName,
          error: 'imageData is not a GIF data URL',
          imageDataPrefix: geometry.imageData.substring(0, 50)
        });
        setHasError(true);
        setIsLoading(false);
        return;
      }

      logger.info('ANIMATED_GIF_LOADING_START', {
        shapeId: shape.id,
        fileName: geometry.fileName,
        imageDataLength: geometry.imageData.length
      });

      // Start GIF animation
      const giflerInstance = gifler(geometry.imageData);

      giflerInstance.get().then((animator: any) => {
        // Animation ready callback
        animatorRef.current = animator;

        // Get frame count from animator's internal _frames array
        const totalFrames = animator._frames ? animator._frames.length : 0;
        setFrameCount(totalFrames);

        // Start the animation with custom frame callback
        animator.onDrawFrame = onDrawFrame;
        animator.animateInCanvas(canvas, false); // false = don't set canvas dimensions

        setIsLoading(false);

        logger.info('ANIMATED_GIF_LOADED', {
          id: shape.id,
          fileName: geometry.fileName,
          frameCount: totalFrames
        });
      }).catch((error: any) => {
        logger.error('ANIMATED_GIF_ANIMATOR_ERROR', {
          shapeId: shape.id,
          fileName: geometry.fileName,
          error: error.message || error
        });
        setHasError(true);
        setIsLoading(false);
      });

    } catch (error) {
      logger.error('ANIMATED_GIF_LOAD_ERROR', {
        shapeId: shape.id,
        fileName: geometry.fileName,
        error: error instanceof Error ? error.message : error
      });
      setHasError(true);
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (animatorRef.current) {
        animatorRef.current.stop();
      }
    };
  }, [shape.id, geometry]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    if (!animatorRef.current) return;

    if (isPaused) {
      animatorRef.current.start();
      setIsPaused(false);
      logger.info('ANIMATED_GIF_RESUMED', { shapeId: shape.id });
    } else {
      animatorRef.current.stop();
      setIsPaused(true);
      logger.info('ANIMATED_GIF_PAUSED', { shapeId: shape.id });
    }
  }, [isPaused, shape.id]);

  /**
   * Handle click - select shape or toggle play/pause if already selected
   */
  const handleClick = useCallback(() => {
    if (isSelected) {
      // If already selected, toggle play/pause
      togglePlayPause();
    } else {
      // Otherwise, select the shape
      onSelect();
    }
  }, [isSelected, onSelect, togglePlayPause]);

  // Handle invalid geometry
  if (!geometry) {
    logger.error('ANIMATED_GIF_WRONG_GEOMETRY', {
      shapeId: shape.id,
      geometryType: shape.geometry.type
    });
    return null;
  }

  // Show loading placeholder
  if (isLoading) {
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

  // Show error placeholder
  if (hasError) {
    return (
      <Group>
        <Rect
          x={geometry.x}
          y={geometry.y}
          width={geometry.width}
          height={geometry.height}
          fill="#fff1f0"
          stroke="#ff4d4f"
          strokeWidth={2}
        />
      </Group>
    );
  }

  return (
    <Group ref={groupRef}>
      {/* Main GIF Image */}
      {canvasRef.current && (
        <KonvaImage
          ref={imageRef}
          id={shape.id}
          name="shape"
          image={canvasRef.current}
          x={geometry.x}
          y={geometry.y}
          width={geometry.width}
          height={geometry.height}
          rotation={geometry.rotation || 0}
          scaleX={geometry.scaleX || 1}
          scaleY={geometry.scaleY || 1}
          opacity={shape.style.opacity}
          draggable={isSelected}
          onClick={handleClick}
          onTap={handleClick}
          onDragEnd={onDragEnd}
          onTransformEnd={(e) => {
            const node = imageRef.current;
            if (node) {
              onTransformEnd(node);
            }
          }}
          stroke={isSelected ? SELECTION_STYLE.STROKE : undefined}
          strokeWidth={isSelected ? SELECTION_STYLE.STROKE_WIDTH : 0}
        />
      )}

      {/* Animation indicator (small circle in top-right corner) */}
      {!isSelected && (
        <Circle
          x={geometry.x + geometry.width - 8}
          y={geometry.y + 8}
          radius={4}
          fill={isPaused ? '#faad14' : '#52c41a'}
          opacity={0.8}
        />
      )}

      {/* Frame counter (when selected) */}
      {isSelected && frameCount > 0 && (
        <Rect
          x={geometry.x}
          y={geometry.y + geometry.height + 5}
          width={60}
          height={20}
          fill="rgba(0, 0, 0, 0.7)"
          cornerRadius={3}
        />
      )}
    </Group>
  );
};

