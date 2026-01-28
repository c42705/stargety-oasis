/**
 * Konva Map Editor - Performance Benchmark Component
 * 
 * Tests editor performance with varying numbers of shapes (100, 500, 1000+).
 * Measures FPS, render time, and interaction responsiveness.
 */

import React, { useState, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { Card, Space, Button, Typography, Row, Col, Statistic, Alert, Progress } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { Viewport, GridConfig, Shape } from '../types';
import { useKonvaZoom } from '../hooks/useKonvaZoom';
import { useKonvaGrid } from '../hooks/useKonvaGrid';
import { useKonvaSelection } from '../hooks/useKonvaSelection';
import { useKonvaTransform } from '../hooks/useKonvaTransform';
import { useKonvaPerformance } from '../hooks/useKonvaPerformance';
import { useKonvaLayers } from '../hooks/useKonvaLayers';
import { TransformableRect, TransformablePolygon, TransformerComponent } from './TransformableShape';
import { createRectangleShape, createPolygonShape } from '../utils/shapeFactories';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS, CANVAS } from '../constants/konvaConstants';

const { Title, Text } = Typography;

/**
 * Benchmark results
 */
interface BenchmarkResults {
  shapeCount: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgRenderTime: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  timestamp: number;
}

export const KonvaPerformanceBenchmark: React.FC = () => {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [gridConfig] = useState<GridConfig>(GRID_DEFAULTS);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResults[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  const { handleWheel } = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
  });

  const { gridLines, shouldRenderGrid } = useKonvaGrid({
    config: gridConfig,
    canvasWidth: CANVAS.DEFAULT_WIDTH,
    canvasHeight: CANVAS.DEFAULT_HEIGHT,
    viewport,
  });

  const selection = useKonvaSelection({
    enabled: true,
    shapes,
    selectedIds,
    onSelectionChange: setSelectedIds,
  });

  const transform = useKonvaTransform({
    selectedIds,
    shapes,
    onShapeUpdate: (id, updates) => {
      setShapes((prev) =>
        prev.map((shape) =>
          shape.id === id ? { ...shape, ...updates } : shape
        )
      );
    },
  });

  const performance = useKonvaPerformance({
    shapes,
    enabled: true,
  });

  const { layerRefs } = useKonvaLayers();

  // ==========================================================================
  // SHAPE GENERATION
  // ==========================================================================

  const generateShapes = useCallback((count: number) => {
    setIsGenerating(true);
    const newShapes: Shape[] = [];
    const canvasWidth = CANVAS.DEFAULT_WIDTH;
    const canvasHeight = CANVAS.DEFAULT_HEIGHT;

    for (let i = 0; i < count; i++) {
      const isPolygon = Math.random() > 0.5;
      const category = Math.random() > 0.5 ? 'collision' : 'interactive';

      if (isPolygon) {
        // Generate random polygon
        const centerX = Math.random() * (canvasWidth - 200) + 100;
        const centerY = Math.random() * (canvasHeight - 200) + 100;
        const vertexCount = Math.floor(Math.random() * 5) + 3; // 3-7 vertices
        const radius = Math.random() * 40 + 30; // 30-70 radius

        const vertices = [];
        for (let j = 0; j < vertexCount; j++) {
          const angle = (j / vertexCount) * Math.PI * 2;
          vertices.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
          });
        }

        newShapes.push(createPolygonShape({ vertices, category }));
      } else {
        // Generate random rectangle
        const x = Math.random() * (canvasWidth - 200) + 50;
        const y = Math.random() * (canvasHeight - 200) + 50;
        const width = Math.random() * 100 + 50; // 50-150
        const height = Math.random() * 100 + 50; // 50-150

        newShapes.push(createRectangleShape({ x, y, width, height, category }));
      }
    }

    setShapes(newShapes);
    setIsGenerating(false);

    // Record benchmark after a delay to let FPS stabilize
    setTimeout(() => {
      recordBenchmark(count);
    }, 2000);
  }, [recordBenchmark]);

  const recordBenchmark = useCallback((shapeCount: number) => {
    const fps = performance.metrics.fps;
    let status: BenchmarkResults['status'] = 'excellent';
    
    if (fps < 30) status = 'poor';
    else if (fps < 45) status = 'fair';
    else if (fps < 55) status = 'good';

    const result: BenchmarkResults = {
      shapeCount,
      avgFps: fps,
      minFps: fps,
      maxFps: fps,
      avgRenderTime: performance.metrics.renderTime,
      status,
      timestamp: Date.now(),
    };

    setBenchmarkResults((prev) => [...prev, result]);
  }, [performance.metrics]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const getStatusIcon = (status: BenchmarkResults['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'good': return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
      case 'fair': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'poor': return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
    }
  };

  const getStatusColor = (status: BenchmarkResults['status']) => {
    switch (status) {
      case 'excellent': return '#52c41a';
      case 'good': return '#1890ff';
      case 'fair': return '#faad14';
      case 'poor': return '#f5222d';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>
        <ThunderboltOutlined /> Performance Benchmark
      </Title>
      
      <Alert
        message="Performance Testing"
        description="This component tests editor performance with varying numbers of shapes. Generate shapes and observe FPS, render time, and interaction responsiveness."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {/* Performance Warnings */}
      {performance.warnings.map((warning, i) => (
        <Alert
          key={i}
          message={warning.message}
          type={warning.severity === 'high' ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: '16px' }}
        />
      ))}
      
      <Row gutter={16}>
        {/* Canvas */}
        <Col span={16}>
          <Card title={`Canvas (${shapes.length} shapes)`} style={{ marginBottom: '16px' }}>
            <div style={{ border: '1px solid #d9d9d9', overflow: 'hidden' }}>
              <Stage
                width={800}
                height={600}
                scaleX={viewport.zoom}
                scaleY={viewport.zoom}
                x={viewport.pan.x}
                y={viewport.pan.y}
                onWheel={handleWheel}
                onClick={selection.handleStageClick}
                onMouseDown={selection.handleMouseDown}
                onMouseMove={selection.handleMouseMove}
                onMouseUp={selection.handleMouseUp}
              >
                {/* Grid Layer */}
                <Layer ref={layerRefs.gridLayer}>
                  {shouldRenderGrid && gridLines.map((line, i) => (
                    <Line
                      key={i}
                      points={line.points}
                      stroke={line.stroke}
                      strokeWidth={line.strokeWidth}
                      opacity={line.opacity}
                      listening={false}
                    />
                  ))}
                </Layer>

                {/* Shapes Layer */}
                <Layer ref={layerRefs.shapesLayer}>
                  {shapes.map((shape) => {
                    const isSelected = selection.isSelected(shape.id);
                    
                    if (shape.geometry.type === 'rectangle') {
                      return (
                        <TransformableRect
                          key={shape.id}
                          shape={shape}
                          isSelected={isSelected}
                          onSelect={() => selection.selectShape(shape.id)}
                          onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                          onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                        />
                      );
                    } else if (shape.geometry.type === 'polygon') {
                      return (
                        <TransformablePolygon
                          key={shape.id}
                          shape={shape}
                          isSelected={isSelected}
                          onSelect={() => selection.selectShape(shape.id)}
                          onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                          onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                        />
                      );
                    }
                    return null;
                  })}
                  
                  <TransformerComponent selectedShapeIds={selectedIds} />
                </Layer>
              </Stage>
            </div>
          </Card>
        </Col>

        {/* Controls */}
        <Col span={8}>
          {/* Current Performance */}
          <Card title="Current Performance" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic title="FPS" value={performance.metrics.fps} suffix="fps" />
              <Statistic title="Shapes" value={shapes.length} />
              <Progress
                percent={Math.min((performance.metrics.fps / 60) * 100, 100)}
                status={performance.isPerformanceGood ? 'success' : 'exception'}
                strokeColor={getStatusColor(
                  performance.metrics.fps >= 55 ? 'excellent' :
                  performance.metrics.fps >= 45 ? 'good' :
                  performance.metrics.fps >= 30 ? 'fair' : 'poor'
                )}
              />
            </Space>
          </Card>

          {/* Generate Shapes */}
          <Card title="Generate Test Shapes" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button onClick={() => generateShapes(100)} loading={isGenerating} block>
                Generate 100 Shapes
              </Button>
              <Button onClick={() => generateShapes(500)} loading={isGenerating} block>
                Generate 500 Shapes
              </Button>
              <Button onClick={() => generateShapes(1000)} loading={isGenerating} block>
                Generate 1000 Shapes
              </Button>
              <Button onClick={() => setShapes([])} danger block>
                Clear All Shapes
              </Button>
            </Space>
          </Card>

          {/* Benchmark Results */}
          <Card title="Benchmark Results" size="small">
            <Space direction="vertical" style={{ width: '100%', fontSize: '12px' }}>
              {benchmarkResults.length === 0 && (
                <Text type="secondary">No benchmarks recorded yet</Text>
              )}
              {benchmarkResults.map((result, i) => (
                <div key={i} style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div>
                    {getStatusIcon(result.status)}
                    {' '}
                    <Text strong>{result.shapeCount} shapes</Text>
                  </div>
                  <div>FPS: {result.avgFps}</div>
                  <div>Status: {result.status}</div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

