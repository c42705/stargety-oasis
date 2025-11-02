/**
 * Konva Map Canvas - Basic Rendering Test
 * 
 * Simple test component to verify that the basic Konva canvas renders correctly
 * with proper dimensions and layer structure.
 * 
 * This file can be deleted after Phase 1 testing is complete.
 */

import React, { useState } from 'react';
import { Rect, Circle, Line, Text } from 'react-konva';
import { Button, Space, Typography, Card } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { KonvaMapCanvas } from './KonvaMapCanvas';
import type { Viewport } from '../types';
import { VIEWPORT_DEFAULTS } from '../constants/konvaConstants';

const { Title, Paragraph } = Typography;

/**
 * Test component for KonvaMapCanvas
 */
export const KonvaMapCanvasTest: React.FC = () => {
  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [canvasReady, setCanvasReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleZoomIn = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom + 0.1, 3.0),
    }));
  };

  const handleZoomOut = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom - 0.1, 0.3),
    }));
  };

  const handleReset = () => {
    setViewport(VIEWPORT_DEFAULTS);
  };

  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Card style={{ marginBottom: '20px' }}>
        <Title level={3}>Konva Map Canvas - Basic Rendering Test</Title>
        <Paragraph>
          This is a basic test to verify that the Konva canvas renders correctly with proper
          dimensions and layer structure.
        </Paragraph>

        <Space>
          <Button icon={<ZoomInOutlined />} onClick={handleZoomIn}>
            Zoom In
          </Button>
          <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut}>
            Zoom Out
          </Button>
          <Button onClick={handleReset}>Reset</Button>
        </Space>

        <div style={{ marginTop: '10px' }}>
          <Paragraph>
            <strong>Status:</strong> {canvasReady ? '✅ Canvas Ready' : '⏳ Initializing...'}
          </Paragraph>
          <Paragraph>
            <strong>Dimensions:</strong> {dimensions.width} x {dimensions.height}
          </Paragraph>
          <Paragraph>
            <strong>Zoom:</strong> {(viewport.zoom * 100).toFixed(0)}%
          </Paragraph>
          <Paragraph>
            <strong>Pan:</strong> ({viewport.pan.x.toFixed(0)}, {viewport.pan.y.toFixed(0)})
          </Paragraph>
        </div>
      </Card>

      <div style={{ flex: 1, border: '2px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden' }}>
        <KonvaMapCanvas
          viewport={viewport}
          onCanvasReady={(stage) => {
            console.log('Canvas ready:', stage);
            setCanvasReady(true);
          }}
          onResize={(width, height) => {
            console.log('Canvas resized:', width, height);
            setDimensions({ width, height });
          }}
        >
          {/* Test shapes */}
          
          {/* Grid background */}
          <Rect
            x={0}
            y={0}
            width={2000}
            height={2000}
            fill="#f0f0f0"
          />

          {/* Grid lines */}
          {Array.from({ length: 20 }).map((_, i) => (
            <React.Fragment key={`grid-${i}`}>
              <Line
                points={[i * 100, 0, i * 100, 2000]}
                stroke="#e0e0e0"
                strokeWidth={1}
              />
              <Line
                points={[0, i * 100, 2000, i * 100]}
                stroke="#e0e0e0"
                strokeWidth={1}
              />
            </React.Fragment>
          ))}

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

          {/* Test circle */}
          <Circle
            x={400}
            y={200}
            radius={50}
            fill="rgba(0, 255, 0, 0.3)"
            stroke="#00ff00"
            strokeWidth={2}
          />

          {/* Test polygon */}
          <Line
            points={[600, 100, 700, 100, 750, 200, 650, 250, 550, 200]}
            closed
            fill="rgba(0, 0, 255, 0.3)"
            stroke="#0000ff"
            strokeWidth={2}
          />

          {/* Test text */}
          <Text
            x={100}
            y={50}
            text="Konva Map Canvas Test"
            fontSize={24}
            fill="#000000"
          />

          {/* Origin marker */}
          <Circle
            x={0}
            y={0}
            radius={5}
            fill="#ff0000"
          />
          <Text
            x={10}
            y={-5}
            text="(0, 0)"
            fontSize={12}
            fill="#ff0000"
          />
        </KonvaMapCanvas>
      </div>
    </div>
  );
};

export default KonvaMapCanvasTest;

