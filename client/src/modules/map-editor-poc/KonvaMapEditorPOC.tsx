/**
 * Konva Map Editor POC - Main Component
 * Minimal implementation for testing
 */

import React, { useState } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import { Button, Space, Typography, Card } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { POCViewport, POCGrid } from './types/konva.types';
import {
  POC_CANVAS,
  POC_VIEWPORT_DEFAULTS,
  POC_GRID_DEFAULTS,
} from './constants/konvaConstants';
import { useKonvaZoom } from './hooks/useKonvaZoom';

const { Title, Text } = Typography;

export const KonvaMapEditorPOC: React.FC = () => {
  // State
  const [viewport, setViewport] = useState<POCViewport>(POC_VIEWPORT_DEFAULTS);
  const [grid] = useState<POCGrid>(POC_GRID_DEFAULTS);

  // Hooks
  const zoom = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
  });

  // Render grid lines
  const renderGrid = () => {
    if (!grid.enabled) return null;

    const lines = [];
    const gridSize = grid.size;
    const width = POC_CANVAS.WIDTH;
    const height = POC_CANVAS.HEIGHT;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke={grid.color}
          strokeWidth={1}
          opacity={grid.opacity}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke={grid.color}
          strokeWidth={1}
          opacity={grid.opacity}
        />
      );
    }

    return lines;
  };

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
      <Card>
        <Title level={2}>Konva Map Editor POC - Minimal Test</Title>
        
        {/* Toolbar */}
        <Space style={{ marginBottom: '20px' }}>
          <Button
            icon={<ZoomInOutlined />}
            onClick={zoom.zoomIn}
          >
            Zoom In
          </Button>
          <Button
            icon={<ZoomOutOutlined />}
            onClick={zoom.zoomOut}
          >
            Zoom Out
          </Button>
          <Text>Zoom: {(viewport.zoom * 100).toFixed(0)}%</Text>
        </Space>

        {/* Canvas */}
        <div style={{ border: '2px solid #ccc', display: 'inline-block' }}>
          <Stage
            width={POC_CANVAS.WIDTH}
            height={POC_CANVAS.HEIGHT}
            scaleX={viewport.zoom}
            scaleY={viewport.zoom}
            x={viewport.pan.x}
            y={viewport.pan.y}
            onWheel={zoom.handleWheel}
          >
            {/* Background Layer */}
            <Layer>
              <Rect
                x={0}
                y={0}
                width={POC_CANVAS.WIDTH}
                height={POC_CANVAS.HEIGHT}
                fill={POC_CANVAS.BACKGROUND}
              />
            </Layer>

            {/* Grid Layer */}
            <Layer>
              {renderGrid()}
            </Layer>

            {/* Shapes Layer - Empty for now */}
            <Layer>
              {/* Test rectangle */}
              <Rect
                x={100}
                y={100}
                width={200}
                height={150}
                fill="rgba(255, 0, 0, 0.3)"
                stroke="#ff0000"
                strokeWidth={2}
              />
            </Layer>
          </Stage>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '20px' }}>
          <Title level={4}>Test Instructions:</Title>
          <ul>
            <li>Click "Zoom In" / "Zoom Out" buttons to test zoom</li>
            <li>Use mouse wheel to zoom in/out</li>
            <li>You should see a red test rectangle on the canvas</li>
            <li>Grid should be visible</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

