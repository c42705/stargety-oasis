/**
 * Konva Map Editor - Phase 3 Test Component
 * 
 * Comprehensive test and demonstration of Phase 3 drawing tools:
 * - Polygon drawing with vertices and preview
 * - Rectangle drawing with preview
 * - Grid snapping
 * - Drawing validation
 * - Keyboard shortcuts
 */

import React, { useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { Card, Space, Button, Switch, Radio, Typography, Row, Col, Alert, Tag } from 'antd';
import {
  BorderOutlined,
  ApartmentOutlined,
  DeleteOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { Viewport, GridConfig, Shape, ShapeCategory, EditorTool } from '../types';
import { useKonvaZoom } from '../hooks/useKonvaZoom';
import { useKonvaPan } from '../hooks/useKonvaPan';
import { useKonvaGrid } from '../hooks/useKonvaGrid';
import { useKonvaPolygonDrawing } from '../hooks/useKonvaPolygonDrawing';
import { useKonvaRectDrawing } from '../hooks/useKonvaRectDrawing';
import { useKonvaLayers } from '../hooks/useKonvaLayers';
import { PolygonDrawingPreview } from './PolygonDrawingPreview';
import { RectangleDrawingPreview } from './RectangleDrawingPreview';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS, CANVAS } from '../constants/konvaConstants';

const { Title, Text } = Typography;

export const KonvaPhase3Test: React.FC = () => {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [gridConfig, setGridConfig] = useState<GridConfig>({ ...GRID_DEFAULTS, snapToGrid: true });
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  const [currentCategory, setCurrentCategory] = useState<ShapeCategory>('collision');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  // Zoom hook
  const { zoomIn, zoomOut, handleWheel, zoomPercentage } = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
  });

  // Pan hook
  const { handleMouseDown: handlePanMouseDown, handleMouseMove: handlePanMouseMove, handleMouseUp: handlePanMouseUp } = useKonvaPan({
    viewport,
    onViewportChange: setViewport,
    enabled: currentTool === 'pan',
  });

  // Grid hook
  const { gridLines, shouldRenderGrid, snapToGrid } = useKonvaGrid({
    config: gridConfig,
    canvasWidth: CANVAS.WIDTH,
    canvasHeight: CANVAS.HEIGHT,
    viewport,
  });

  // Polygon drawing hook
  const polygonDrawing = useKonvaPolygonDrawing({
    enabled: currentTool === 'polygon',
    category: currentCategory,
    viewport,
    gridConfig,
    snapToGrid,
    onShapeCreate: (shape) => {
      setShapes((prev) => [...prev, shape]);
      setValidationErrors([]);
    },
    onValidationError: (errors) => setValidationErrors(errors),
  });

  // Rectangle drawing hook
  const rectDrawing = useKonvaRectDrawing({
    enabled: currentTool === 'rectangle',
    category: currentCategory,
    viewport,
    gridConfig,
    snapToGrid,
    onShapeCreate: (shape) => {
      setShapes((prev) => [...prev, shape]);
      setValidationErrors([]);
    },
    onValidationError: (errors) => setValidationErrors(errors),
  });

  // Layer management
  const { layerRefs } = useKonvaLayers();

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleCanvasClick = useCallback(
    (e: any) => {
      if (currentTool === 'polygon') {
        polygonDrawing.handleClick(e);
      }
    },
    [currentTool, polygonDrawing]
  );

  const handleCanvasMouseMove = useCallback(
    (e: any) => {
      if (currentTool === 'polygon') {
        polygonDrawing.handleMouseMove(e);
      } else if (currentTool === 'rectangle') {
        rectDrawing.handleMouseMove(e);
      } else if (currentTool === 'pan') {
        handlePanMouseMove(e);
      }
    },
    [currentTool, polygonDrawing, rectDrawing, handlePanMouseMove]
  );

  const handleCanvasMouseDown = useCallback(
    (e: any) => {
      if (currentTool === 'rectangle') {
        rectDrawing.handleMouseDown(e);
      } else if (currentTool === 'pan') {
        handlePanMouseDown(e);
      }
    },
    [currentTool, rectDrawing, handlePanMouseDown]
  );

  const handleCanvasMouseUp = useCallback(
    (e: any) => {
      if (currentTool === 'rectangle') {
        rectDrawing.handleMouseUp();
      } else if (currentTool === 'pan') {
        handlePanMouseUp();
      }
    },
    [currentTool, rectDrawing, handlePanMouseUp]
  );

  const handleClearShapes = useCallback(() => {
    setShapes([]);
    setValidationErrors([]);
  }, []);

  const handleCancelDrawing = useCallback(() => {
    if (currentTool === 'polygon') {
      polygonDrawing.cancelDrawing();
    } else if (currentTool === 'rectangle') {
      rectDrawing.cancelDrawing();
    }
    setValidationErrors([]);
  }, [currentTool, polygonDrawing, rectDrawing]);

  // ==========================================================================
  // RENDER SHAPES
  // ==========================================================================

  const renderShapes = () => {
    return shapes.map((shape) => {
      if (shape.geometry.type === 'polygon') {
        return (
          <Line
            key={shape.id}
            points={shape.geometry.points}
            closed
            fill={shape.style.fill}
            stroke={shape.style.stroke}
            strokeWidth={shape.style.strokeWidth}
            opacity={shape.style.opacity}
          />
        );
      } else if (shape.geometry.type === 'rectangle') {
        return (
          <Rect
            key={shape.id}
            x={shape.geometry.x}
            y={shape.geometry.y}
            width={shape.geometry.width}
            height={shape.geometry.height}
            fill={shape.style.fill}
            stroke={shape.style.stroke}
            strokeWidth={shape.style.strokeWidth}
            opacity={shape.style.opacity}
          />
        );
      }
      return null;
    });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Phase 3: Drawing Tools Test</Title>
      
      <Row gutter={16}>
        {/* Canvas */}
        <Col span={16}>
          <Card title="Canvas" style={{ marginBottom: '16px' }}>
            {validationErrors.length > 0 && (
              <Alert
                message="Validation Errors"
                description={validationErrors.join(', ')}
                type="error"
                closable
                onClose={() => setValidationErrors([])}
                style={{ marginBottom: '16px' }}
              />
            )}
            
            <div style={{ border: '1px solid #d9d9d9', overflow: 'hidden' }}>
              <Stage
                width={800}
                height={600}
                scaleX={viewport.zoom}
                scaleY={viewport.zoom}
                x={viewport.pan.x}
                y={viewport.pan.y}
                onWheel={handleWheel}
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onDblClick={polygonDrawing.handleDoubleClick}
              >
                {/* Grid Layer */}
                <Layer ref={layerRefs.gridLayer.ref}>
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
                <Layer ref={layerRefs.shapesLayer.ref}>
                  {renderShapes()}
                </Layer>

                {/* Drawing Preview Layer */}
                <Layer ref={layerRefs.uiLayer.ref}>
                  {/* Polygon preview */}
                  {currentTool === 'polygon' && polygonDrawing.isDrawing && (
                    <PolygonDrawingPreview
                      vertices={polygonDrawing.vertices}
                      previewLines={polygonDrawing.previewLines}
                      isOriginHovered={polygonDrawing.isOriginHovered}
                      category={currentCategory}
                    />
                  )}

                  {/* Rectangle preview */}
                  {currentTool === 'rectangle' && rectDrawing.isDrawing && (
                    <RectangleDrawingPreview
                      rect={rectDrawing.previewRect}
                      category={currentCategory}
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          </Card>
        </Col>

        {/* Controls */}
        <Col span={8}>
          {/* Tool Selection */}
          <Card title="Tools" size="small" style={{ marginBottom: '16px' }}>
            <Radio.Group value={currentTool} onChange={(e) => setCurrentTool(e.target.value)} style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="select">Select</Radio>
                <Radio value="polygon"><ApartmentOutlined /> Polygon</Radio>
                <Radio value="rectangle"><BorderOutlined /> Rectangle</Radio>
                <Radio value="pan">Pan</Radio>
              </Space>
            </Radio.Group>
          </Card>

          {/* Category Selection */}
          <Card title="Category" size="small" style={{ marginBottom: '16px' }}>
            <Radio.Group value={currentCategory} onChange={(e) => setCurrentCategory(e.target.value)}>
              <Space direction="vertical">
                <Radio value="collision">Collision</Radio>
                <Radio value="interactive">Interactive</Radio>
              </Space>
            </Radio.Group>
          </Card>

          {/* Grid Controls */}
          <Card title="Grid" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Switch
                  checked={gridConfig.enabled}
                  onChange={(checked) => setGridConfig((prev) => ({ ...prev, enabled: checked }))}
                />
                <Text style={{ marginLeft: '8px' }}>Show Grid</Text>
              </div>
              <div>
                <Switch
                  checked={gridConfig.snapToGrid}
                  onChange={(checked) => setGridConfig((prev) => ({ ...prev, snapToGrid: checked }))}
                />
                <Text style={{ marginLeft: '8px' }}>Snap to Grid</Text>
              </div>
            </Space>
          </Card>

          {/* Drawing Info */}
          <Card title="Drawing Info" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Shapes: </Text>
                <Tag color="blue">{shapes.length}</Tag>
              </div>
              {currentTool === 'polygon' && polygonDrawing.isDrawing && (
                <>
                  <div>
                    <Text strong>Vertices: </Text>
                    <Tag color="green">{polygonDrawing.vertexCount}</Tag>
                  </div>
                  <div>
                    <Text strong>Can Complete: </Text>
                    <Tag color={polygonDrawing.canComplete ? 'success' : 'default'}>
                      {polygonDrawing.canComplete ? 'Yes' : 'No'}
                    </Tag>
                  </div>
                </>
              )}
            </Space>
          </Card>

          {/* Actions */}
          <Card title="Actions" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button onClick={handleCancelDrawing} icon={<UndoOutlined />} block>
                Cancel Drawing (Esc)
              </Button>
              <Button onClick={handleClearShapes} icon={<DeleteOutlined />} danger block>
                Clear All Shapes
              </Button>
              <Button onClick={zoomIn} block>Zoom In</Button>
              <Button onClick={zoomOut} block>Zoom Out</Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Zoom: {zoomPercentage}%
              </Text>
            </Space>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card title="Shortcuts" size="small" style={{ marginTop: '16px' }}>
            <Space direction="vertical" style={{ fontSize: '12px' }}>
              <Text>Enter - Complete polygon</Text>
              <Text>Escape - Cancel drawing</Text>
              <Text>Backspace - Remove last vertex</Text>
              <Text>Double-click - Complete polygon</Text>
              <Text>Click origin - Close polygon</Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

