/**
 * Konva Map Editor - Polygon Editor Component
 * 
 * Renders vertex handles and edge handles for polygon editing.
 * Allows dragging vertices, adding new vertices, and deleting vertices.
 */

import React from 'react';
import { Circle, Group } from 'react-konva';
import type { VertexHandle, EdgeHandle } from '../types/shapes.types';
import { VERTEX_EDITING } from '../constants/konvaConstants';

export interface PolygonEditorProps {
  /** Vertex handles to render */
  vertexHandles: VertexHandle[];
  /** Edge handles to render */
  edgeHandles: EdgeHandle[];
  /** Index of currently dragging vertex */
  draggingVertexIndex: number | null;
  /** Index of currently hovering handle */
  hoveringHandleIndex: number | null;
  /** Callback when vertex drag starts */
  onVertexDragStart: (vertexIndex: number) => void;
  /** Callback when vertex is dragged */
  onVertexDragMove: (vertexIndex: number, x: number, y: number) => void;
  /** Callback when vertex drag ends */
  onVertexDragEnd: (vertexIndex: number, x: number, y: number) => void;
  /** Callback when edge is clicked to add vertex */
  onEdgeClick: (edgeIndex: number) => void;
  /** Callback when vertex is deleted (right-click) */
  onVertexDelete?: (vertexIndex: number) => void;
  /** Callback when vertex is hovered */
  onVertexHover?: (vertexIndex: number | null) => void;
}

/**
 * Component for rendering polygon vertex editing UI
 */
export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  vertexHandles,
  edgeHandles,
  draggingVertexIndex,
  hoveringHandleIndex,
  onVertexDragStart,
  onVertexDragMove,
  onVertexDragEnd,
  onEdgeClick,
  onVertexDelete,
  onVertexHover,
}) => {
  return (
    <Group>
      {/* Edge handles (midpoints for adding vertices) */}
      {edgeHandles.map((handle) => (
        <Circle
          key={`edge-${handle.edgeIndex}`}
          x={handle.x}
          y={handle.y}
          radius={VERTEX_EDITING.EDGE_HANDLE_RADIUS}
          fill={VERTEX_EDITING.EDGE_HANDLE_FILL}
          stroke={VERTEX_EDITING.EDGE_HANDLE_STROKE}
          strokeWidth={1}
          opacity={0.7}
          onClick={() => onEdgeClick(handle.edgeIndex)}
          onTap={() => onEdgeClick(handle.edgeIndex)}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              container.style.cursor = 'copy';
            }
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              container.style.cursor = 'default';
            }
          }}
        />
      ))}

      {/* Vertex handles */}
      {vertexHandles.map((handle) => {
        const isDragging = draggingVertexIndex === handle.index;
        const isHovering = hoveringHandleIndex === handle.index;

        let fillColor: string = VERTEX_EDITING.HANDLE_FILL;
        if (isDragging) {
          fillColor = VERTEX_EDITING.DRAGGING_HANDLE_FILL;
        } else if (isHovering) {
          fillColor = VERTEX_EDITING.HOVER_HANDLE_FILL;
        }

        return (
          <Circle
            key={`vertex-${handle.index}`}
            x={handle.x}
            y={handle.y}
            radius={VERTEX_EDITING.HANDLE_RADIUS}
            fill={fillColor}
            stroke={handle.isOrigin ? '#00ff00' : VERTEX_EDITING.HANDLE_STROKE}
            strokeWidth={VERTEX_EDITING.HANDLE_STROKE_WIDTH}
            draggable
            onDragStart={() => {
              onVertexDragStart(handle.index);
            }}
            onDragMove={(e) => {
              const node = e.target;
              onVertexDragMove(handle.index, node.x(), node.y());
            }}
            onDragEnd={(e) => {
              const node = e.target;
              onVertexDragEnd(handle.index, node.x(), node.y());
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) {
                container.style.cursor = 'move';
              }
              onVertexHover?.(handle.index);
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) {
                container.style.cursor = 'default';
              }
              onVertexHover?.(null);
            }}
            onContextMenu={(e) => {
              e.evt.preventDefault();
              if (onVertexDelete) {
                onVertexDelete(handle.index);
              }
            }}
          />
        );
      })}
    </Group>
  );
};

