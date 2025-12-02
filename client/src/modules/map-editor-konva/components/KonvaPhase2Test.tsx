/**
 * Konva Map Editor - Phase 2 Test Component
 * 
 * Comprehensive test and demonstration of Phase 2 core canvas features:
 * - Zoom (in/out, wheel, percentage)
 * - Pan (middle mouse, pan tool)
 * - Grid (configurable spacing, opacity, pattern, visibility)
 * - Background image (loading, display, scaling)
 * - Viewport state synchronization
 * - Layer caching
 */

import React, { useState, useCallback } from 'react';
import { Stage, Layer, Line, Image, Rect, Circle, Text as KonvaText } from 'react-konva';
import { Card, Space, Button, Slider, Switch, InputNumber, Typography, Row, Col, Upload, message } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  DragOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { Viewport, GridConfig } from '../types';
import { useKonvaZoom } from '../hooks/useKonvaZoom';
import { useKonvaPan } from '../hooks/useKonvaPan';
import { useKonvaGrid } from '../hooks/useKonvaGrid';
import { useKonvaBackground } from '../hooks/useKonvaBackground';
import { useKonvaLayers } from '../hooks/useKonvaLayers';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS, CANVAS } from '../constants/konvaConstants';

const { Title, Text } = Typography;

export const KonvaPhase2Test: React.FC = () => {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [gridConfig, setGridConfig] = useState<GridConfig>(GRID_DEFAULTS);
  const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(undefined);
  const [panToolEnabled, setPanToolEnabled] = useState(false);

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  // Zoom hook
  const {
    zoomIn,
    zoomOut,
    zoomTo,
    resetZoom,
    handleWheel,
    zoomPercentage,
    isAtMin,
    isAtMax,
  } = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
  });

  // Pan hook
  const {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetPan,
  } = useKonvaPan({
    viewport,
    onViewportChange: setViewport,
    enabled: panToolEnabled,
  });

  // Grid hook
  const {
    gridLines,
    shouldRenderGrid,
    snapToGrid,
  } = useKonvaGrid({
    config: gridConfig,
    canvasWidth: CANVAS.DEFAULT_WIDTH,
    canvasHeight: CANVAS.DEFAULT_HEIGHT,
    viewport,
  });

  // Background hook
  const {
    image: backgroundImage,
    isLoading: backgroundLoading,
    error: backgroundError,
    reload: reloadBackground,
  } = useKonvaBackground({
    imageUrl: backgroundUrl,
    viewport,
  });

  // Layer management hook
  const { layerRefs, refreshAllLayers } = useKonvaLayers();

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleBackgroundUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setBackgroundUrl(result);
      }
    };
    reader.readAsDataURL(file);
    return false; // Prevent automatic upload
  }, []);

  const handleGridSpacingChange = useCallback((value: number | null) => {
    if (value) {
      setGridConfig((prev) => ({ ...prev, spacing: value }));
    }
  }, []);

  const handleGridOpacityChange = useCallback((value: number) => {
    setGridConfig((prev) => ({ ...prev, opacity: value }));
  }, []);

  const handleGridVisibilityChange = useCallback((checked: boolean) => {
    setGridConfig((prev) => ({ ...prev, enabled: checked }));
  }, []);

  const handleZoomPercentageChange = useCallback((value: number | null) => {
    if (value) {
      zoomTo(value / 100);
    }
  }, [zoomTo]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Phase 2: Core Canvas Features Test</Title>
      
      <Row gutter={16}>
        {/* Canvas */}
        <Col span={16}>
          <Card title="Canvas" style={{ marginBottom: '16px' }}>
            <div style={{ border: '1px solid #d9d9d9', overflow: 'hidden' }}>
              <Stage
                width={800}
                height={600}
                scaleX={viewport.zoom}
                scaleY={viewport.zoom}
                x={viewport.pan.x}
                y={viewport.pan.y}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ cursor: isPanning ? 'grabbing' : panToolEnabled ? 'grab' : 'default' }}
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

                {/* Background Layer */}
                <Layer ref={layerRefs.backgroundLayer}>
                  {backgroundImage && (
                    <Image
                      image={backgroundImage}
                      x={0}
                      y={0}
                      listening={false}
                    />
                  )}
                </Layer>

                {/* Shapes Layer - Demo shapes */}
                <Layer ref={layerRefs.shapesLayer}>
                  <Rect
                    x={100}
                    y={100}
                    width={200}
                    height={150}
                    fill="rgba(255, 0, 0, 0.3)"
                    stroke="red"
                    strokeWidth={2}
                  />
                  <Circle
                    x={500}
                    y={300}
                    radius={80}
                    fill="rgba(0, 0, 255, 0.3)"
                    stroke="blue"
                    strokeWidth={2}
                  />
                  <KonvaText
                    x={300}
                    y={400}
                    text="Phase 2 Test"
                    fontSize={24}
                    fill="black"
                  />
                </Layer>

                {/* UI Layer - Viewport info */}
                <Layer ref={layerRefs.uiLayer}>
                  <Rect
                    x={10}
                    y={10}
                    width={200}
                    height={80}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="#d9d9d9"
                    strokeWidth={1}
                  />
                  <KonvaText
                    x={20}
                    y={20}
                    text={`Zoom: ${zoomPercentage}%`}
                    fontSize={14}
                    fill="black"
                  />
                  <KonvaText
                    x={20}
                    y={40}
                    text={`Pan: (${Math.round(viewport.pan.x)}, ${Math.round(viewport.pan.y)})`}
                    fontSize={14}
                    fill="black"
                  />
                  <KonvaText
                    x={20}
                    y={60}
                    text={`Panning: ${isPanning ? 'Yes' : 'No'}`}
                    fontSize={14}
                    fill="black"
                  />
                </Layer>
              </Stage>
            </div>
          </Card>
        </Col>

        {/* Controls */}
        <Col span={8}>
          {/* Zoom Controls */}
          <Card title="Zoom Controls" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Button
                  icon={<ZoomInOutlined />}
                  onClick={zoomIn}
                  disabled={isAtMax}
                >
                  Zoom In
                </Button>
                <Button
                  icon={<ZoomOutOutlined />}
                  onClick={zoomOut}
                  disabled={isAtMin}
                >
                  Zoom Out
                </Button>
                <Button onClick={resetZoom}>Reset</Button>
              </Space>
              <div>
                <Text>Zoom: </Text>
                <InputNumber
                  min={30}
                  max={500}
                  value={zoomPercentage}
                  onChange={handleZoomPercentageChange}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value?.replace('%', '') as any}
                  style={{ width: '100px' }}
                />
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Use mouse wheel to zoom at cursor position
              </Text>
            </Space>
          </Card>

          {/* Pan Controls */}
          <Card title="Pan Controls" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Switch
                  checked={panToolEnabled}
                  onChange={setPanToolEnabled}
                  checkedChildren={<DragOutlined />}
                  unCheckedChildren={<DragOutlined />}
                />
                <Text style={{ marginLeft: '8px' }}>Pan Tool</Text>
              </div>
              <Button onClick={resetPan} block>Reset Pan</Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Middle mouse button always pans. Enable pan tool for left click panning.
              </Text>
            </Space>
          </Card>

          {/* Grid Controls */}
          <Card title="Grid Controls" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Switch
                  checked={gridConfig.visible}
                  onChange={handleGridVisibilityChange}
                />
                <Text style={{ marginLeft: '8px' }}>Show Grid</Text>
              </div>
              <div>
                <Text>Spacing: </Text>
                <InputNumber
                  min={10}
                  max={200}
                  value={gridConfig.spacing}
                  onChange={handleGridSpacingChange}
                  style={{ width: '100px' }}
                />
              </div>
              <div>
                <Text>Opacity: </Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={gridConfig.opacity}
                  onChange={handleGridOpacityChange}
                  style={{ width: '150px', display: 'inline-block', marginLeft: '8px' }}
                />
              </div>
            </Space>
          </Card>

          {/* Background Controls */}
          <Card title="Background Controls" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                beforeUpload={handleBackgroundUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} block>
                  Upload Background
                </Button>
              </Upload>
              {backgroundUrl && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={reloadBackground}
                  loading={backgroundLoading}
                  block
                >
                  Reload Background
                </Button>
              )}
              {backgroundError && (
                <Text type="danger" style={{ fontSize: '12px' }}>
                  {backgroundError}
                </Text>
              )}
              {backgroundImage && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {backgroundImage.width} x {backgroundImage.height}
                </Text>
              )}
            </Space>
          </Card>

          {/* Layer Cache Controls */}
          <Card title="Layer Cache" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button onClick={refreshAllLayers} block>
                Refresh All Layers
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Grid and background layers use caching for performance
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

