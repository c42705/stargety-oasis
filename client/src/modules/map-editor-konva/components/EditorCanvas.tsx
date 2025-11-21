/**
 * EditorCanvas Component
 *
 * Renders the main Konva Stage with all layers:
 * - Background layer (map image)
 * - Grid layer
 * - Shapes layer (interactive areas, collision areas, assets)
 * - Selection layer (transformer, selection rect, vertex editor)
 * - UI layer
 *
 * Also renders overlay indicators for preview mode and drawing modes.
 */

import React, { RefObject } from 'react';
import { Stage, Layer, Line, Image as KonvaImage } from 'react-konva';
import { Eye, Square, Shield } from 'lucide-react';
import type { EditorTool } from '../types/konva.types';
import type { Shape, Viewport, GridConfig } from '../types';
import type {
  UseKonvaBackgroundReturn,
  UseKonvaGridReturn,
  UseKonvaZoomReturn,
  UseKonvaSelectionReturn,
  UseKonvaTransformReturn,
  UseKonvaPolygonDrawingReturn,
  UseKonvaRectDrawingReturn,
  UseKonvaVertexEditReturn,
  LayerRefs,
} from '../types/hooks.types';
import { PolygonDrawingPreview } from './PolygonDrawingPreview';
import { RectangleDrawingPreview } from './RectangleDrawingPreview';
import { TransformablePolygon, TransformableRect, TransformableImage, TransformerComponent } from './TransformableShape';
import { AnimatedGifImage } from './AnimatedGifImage';
import { SelectionRect } from './SelectionRect';
import { PolygonEditor } from './PolygonEditor';
import { logger } from '../../../shared/logger';

interface EditorCanvasProps {
  // Refs
  mainRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<any>;
  layerRefs: LayerRefs;

  // Viewport
  viewport: Viewport;
  viewportWidth: number;
  viewportHeight: number;
  cursorStyle: string;
  gridConfig: GridConfig;

  // State
  currentTool: EditorTool;
  shapes: Shape[];
  selectedIds: string[];
  drawingMode: boolean;
  collisionDrawingMode: boolean;

  // Hooks
  background: UseKonvaBackgroundReturn;
  grid: UseKonvaGridReturn;
  zoom: UseKonvaZoomReturn;
  selection: UseKonvaSelectionReturn;
  transform: UseKonvaTransformReturn;
  polygonDrawing: UseKonvaPolygonDrawingReturn;
  rectDrawing: UseKonvaRectDrawingReturn;
  collisionRectDrawing: UseKonvaRectDrawingReturn;
  vertexEdit: UseKonvaVertexEditReturn;

  // Event handlers
  onStageClick: (e: any) => void;
  onStageMouseDown: (e: any) => void;
  onStageMouseMove: (e: any) => void;
  onStageMouseUp: (e: any) => void;
  onStageDoubleClick: (e: any) => void;

  // Preview mode
  isPreviewMode: boolean;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  mainRef,
  stageRef,
  layerRefs,
  viewport,
  viewportWidth,
  viewportHeight,
  cursorStyle,
  gridConfig,
  currentTool,
  shapes,
  selectedIds,
  drawingMode,
  collisionDrawingMode,
  background,
  grid,
  zoom,
  selection,
  transform,
  polygonDrawing,
  rectDrawing,
  collisionRectDrawing,
  vertexEdit,
  onStageClick,
  onStageMouseDown,
  onStageMouseMove,
  onStageMouseUp,
  onStageDoubleClick,
  isPreviewMode,
}) => {
  return (
    <main ref={mainRef} className="editor-main" style={{ position: 'relative', cursor: cursorStyle }}>
      {viewportWidth > 0 && viewportHeight > 0 && (
        <Stage
          ref={stageRef}
          width={viewportWidth}
          height={viewportHeight}
          scaleX={viewport.zoom}
          scaleY={viewport.zoom}
          x={viewport.pan.x}
          y={viewport.pan.y}
          onClick={onStageClick}
          onMouseDown={onStageMouseDown}
          onMouseMove={onStageMouseMove}
          onMouseUp={onStageMouseUp}
          onDblClick={onStageDoubleClick}
          onWheel={zoom.handleWheel}
        >
          {/* Background Layer - Render first (bottom) */}
          <Layer ref={layerRefs.backgroundLayer}>
            {background.image && (
              <KonvaImage
                image={background.image}
                x={0}
                y={0}
                width={background.dimensions?.width}
                height={background.dimensions?.height}
                listening={false}
              />
            )}
          </Layer>

          {/* Grid Layer - Render on top of background */}
          <Layer ref={layerRefs.gridLayer}>
            {(() => {
              // Debug logging for grid rendering
              if (grid.shouldRenderGrid && grid.gridLines.length > 0) {
                logger.debug('GRID_RENDERING', {
                  gridLinesCount: grid.gridLines.length,
                  gridConfig: gridConfig,
                  firstLine: grid.gridLines[0],
                  viewport: viewport
                });
              } else if (!grid.shouldRenderGrid) {
                logger.debug('GRID_NOT_RENDERING', {
                  shouldRenderGrid: grid.shouldRenderGrid,
                  gridVisible: gridConfig.visible,
                  zoom: viewport.zoom
                });
              }
              return null;
            })()}
            {grid.shouldRenderGrid && grid.gridLines.map((line, index) => (
              <Line
                key={`grid-line-${index}`}
                points={line.points}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth}
                opacity={line.opacity}
                listening={line.listening}
              />
            ))}
          </Layer>

          {/* Shapes Layer */}
          <Layer ref={layerRefs.shapesLayer}>
            {shapes.map(shape => {
              const geom = shape.geometry;

              // Debug logging for image shapes
              if (geom.type === 'image') {
                console.log('[EditorCanvas] Rendering image shape:', {
                  id: shape.id,
                  fileName: geom.fileName,
                  position: { x: geom.x, y: geom.y },
                  size: { width: geom.width, height: geom.height },
                  isSelected: selectedIds.includes(shape.id)
                });
              }

              if (geom.type === 'polygon') {
                // Polygon geometry
                return (
                  <TransformablePolygon
                    key={shape.id}
                    shape={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={(e) => selection.handleShapeClick(shape.id, e)}
                    onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                    onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                  />
                );
              } else if (geom.type === 'rectangle') {
                // Rectangle geometry
                return (
                  <TransformableRect
                    key={shape.id}
                    shape={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={(e) => selection.handleShapeClick(shape.id, e)}
                    onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                    onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                  />
                );
              } else if (geom.type === 'image') {
                // Image geometry - detect if it's a GIF
                const isGif = geom.imageData?.startsWith('data:image/gif');

                if (isGif) {
                  // Render animated GIF
                  return (
                    <AnimatedGifImage
                      key={shape.id}
                      shape={shape}
                      isSelected={selectedIds.includes(shape.id)}
                      onSelect={() => selection.selectShape(shape.id)}
                      onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                      onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                    />
                  );
                } else {
                  // Render static image
                  return (
                    <TransformableImage
                      key={shape.id}
                      shape={shape}
                      isSelected={selectedIds.includes(shape.id)}
                      onSelect={(e) => selection.handleShapeClick(shape.id, e)}
                      onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                      onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                    />
                  );
                }
              }
              return null;
            })}

            {/* Drawing Previews */}
            {polygonDrawing.isDrawing && (
              <PolygonDrawingPreview
                vertices={polygonDrawing.vertices}
                previewLines={polygonDrawing.previewLines}
                isOriginHovered={polygonDrawing.isOriginHovered}
                category="collision"
              />
            )}
            {rectDrawing.isDrawing && rectDrawing.previewRect && (
              <RectangleDrawingPreview
                rect={rectDrawing.previewRect}
                category="interactive"
              />
            )}
            {collisionRectDrawing.isDrawing && collisionRectDrawing.previewRect && (
              <RectangleDrawingPreview
                rect={collisionRectDrawing.previewRect}
                category="collision"
              />
            )}
          </Layer>

          {/* Selection Layer */}
          <Layer ref={layerRefs.selectionLayer}>
            {/* Show transformer only when not in vertex edit mode */}
            {currentTool !== 'edit-vertex' && (
              <TransformerComponent selectedShapeIds={selectedIds} />
            )}
            {selection.selectionRect && (
              <SelectionRect rect={selection.selectionRect} />
            )}
            {/* Vertex editing UI */}
            {vertexEdit.isEditing && (
              <PolygonEditor
                vertexHandles={vertexEdit.vertexHandles}
                edgeHandles={vertexEdit.edgeHandles}
                draggingVertexIndex={vertexEdit.editState.draggingVertexIndex}
                hoveringHandleIndex={vertexEdit.editState.hoveringHandleIndex}
                onVertexDragStart={vertexEdit.handleVertexDragStart}
                onVertexDragMove={vertexEdit.handleVertexDragMove}
                onVertexDragEnd={vertexEdit.handleVertexDragEnd}
                onEdgeClick={vertexEdit.handleEdgeClick}
                onVertexDelete={vertexEdit.handleVertexDelete}
                onVertexHover={vertexEdit.handleVertexHover}
              />
            )}
          </Layer>

          {/* UI Layer */}
          <Layer ref={layerRefs.uiLayer} />
        </Stage>
      )}

      {/* Preview Mode Overlay */}
      {isPreviewMode && (
        <div className="preview-mode-overlay">
          <Eye size={24} />
          <span>Preview Mode</span>
        </div>
      )}

      {/* Drawing Mode Overlay */}
      {drawingMode && (
        <div className="drawing-mode-overlay">
          <Square size={24} />
          <span>Drawing Interactive Area</span>
        </div>
      )}

      {collisionDrawingMode && (
        <div className="drawing-mode-overlay">
          <Shield size={24} />
          <span>Drawing Collision Area</span>
        </div>
      )}
    </main>
  );
};

