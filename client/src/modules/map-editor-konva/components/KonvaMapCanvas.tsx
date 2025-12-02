/**
 * Konva Map Editor - Main Canvas Component
 * 
 * Main component for the Konva-based map editor.
 * Provides Stage/Layer structure with proper sizing and container handling.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import type { StageRef, LayerRef, Viewport, GridConfig } from '../types';
import { CANVAS, VIEWPORT_DEFAULTS, GRID_DEFAULTS } from '../constants/konvaConstants';

// ============================================================================
// TYPES
// ============================================================================

export interface KonvaMapCanvasProps {
  /**
   * Canvas width (defaults to container width)
   */
  width?: number;

  /**
   * Canvas height (defaults to container height)
   */
  height?: number;

  /**
   * Current viewport state
   */
  viewport?: Viewport;

  /**
   * Grid configuration
   */
  gridConfig?: GridConfig;

  /**
   * Callback when canvas is ready
   */
  onCanvasReady?: (stage: Konva.Stage) => void;

  /**
   * Callback when container is resized
   */
  onResize?: (width: number, height: number) => void;

  /**
   * Children to render in the canvas
   */
  children?: React.ReactNode;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Main Konva Map Canvas Component
 * 
 * Provides the Stage and Layer structure for the map editor.
 * Handles container sizing, viewport transformations, and layer management.
 * 
 * @example
 * ```tsx
 * <KonvaMapCanvas
 *   viewport={viewport}
 *   gridConfig={gridConfig}
 *   onCanvasReady={(stage) => console.log('Canvas ready', stage)}
 * >
 *   <GridLayer />
 *   <ShapesLayer shapes={shapes} />
 * </KonvaMapCanvas>
 * ```
 */
export const KonvaMapCanvas: React.FC<KonvaMapCanvasProps> = ({
  width: propWidth,
  height: propHeight,
  viewport = VIEWPORT_DEFAULTS,
  gridConfig = GRID_DEFAULTS,
  onCanvasReady,
  onResize,
  children,
  className = '',
  style = {},
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // State
  const [dimensions, setDimensions] = useState({
    width: propWidth || CANVAS.DEFAULT_WIDTH,
    height: propHeight || CANVAS.DEFAULT_HEIGHT,
  });

  // ==========================================================================
  // CONTAINER SIZING
  // ==========================================================================

  /**
   * Update dimensions based on container size
   */
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const newWidth = propWidth || container.clientWidth || CANVAS.DEFAULT_WIDTH;
    const newHeight = propHeight || container.clientHeight || CANVAS.DEFAULT_HEIGHT;

    setDimensions({ width: newWidth, height: newHeight });
    onResize?.(newWidth, newHeight);
  }, [propWidth, propHeight, onResize]);

  /**
   * Set up resize observer for container
   */
  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  /**
   * Update dimensions when props change
   */
  useEffect(() => {
    if (propWidth !== undefined || propHeight !== undefined) {
      setDimensions({
        width: propWidth || dimensions.width,
        height: propHeight || dimensions.height,
      });
    }
  }, [propWidth, propHeight]);

  // ==========================================================================
  // CANVAS INITIALIZATION
  // ==========================================================================

  /**
   * Initialize canvas and notify parent
   */
  useEffect(() => {
    if (stageRef.current) {
      onCanvasReady?.(stageRef.current);
    }
  }, [onCanvasReady]);

  // ==========================================================================
  // VIEWPORT TRANSFORMATION
  // ==========================================================================

  /**
   * Apply viewport transformation to stage
   */
  useEffect(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;

    // Apply scale (zoom)
    stage.scale({ x: viewport.zoom, y: viewport.zoom });

    // Apply position (pan)
    stage.position({ x: viewport.pan.x, y: viewport.pan.y });

    // Render changes
    stage.batchDraw();
  }, [viewport]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      ref={containerRef}
      className={`konva-map-canvas-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: CANVAS.BACKGROUND_COLOR,
        ...style,
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          backgroundColor: CANVAS.BACKGROUND_COLOR,
        }}
      >
        {/* Main content layer */}
        <Layer>
          {children}
        </Layer>
      </Stage>
    </div>
  );
};

// ============================================================================
// DISPLAY NAME
// ============================================================================

KonvaMapCanvas.displayName = 'KonvaMapCanvas';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default KonvaMapCanvas;

