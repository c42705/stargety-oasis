/**
 * Konva Map Editor - Phase 5 Test Component
 * 
 * Comprehensive test of Phase 5 state management and persistence features:
 * - Undo/redo functionality
 * - State persistence (save/load)
 * - Auto-save
 * - History management
 */

import React, { useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import { Card, Space, Button, Typography, Row, Col, Tag, Alert, Switch, Statistic } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { Viewport, GridConfig, Shape, EditorState } from '../types';
import { useKonvaZoom } from '../hooks/useKonvaZoom';
import { useKonvaGrid } from '../hooks/useKonvaGrid';
import { useKonvaSelection } from '../hooks/useKonvaSelection';
import { useKonvaTransform } from '../hooks/useKonvaTransform';
import { useKonvaHistory } from '../hooks/useKonvaHistory';
import { useKonvaPersistence } from '../hooks/useKonvaPersistence';
import { useKonvaLayers } from '../hooks/useKonvaLayers';
import { TransformableRect, TransformablePolygon, TransformerComponent } from './TransformableShape';
import { SelectionRect } from './SelectionRect';
import { createRectangleShape, createPolygonShape } from '../utils/shapeFactories';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS, CANVAS } from '../constants/konvaConstants';

const { Title, Text } = Typography;

export const KonvaPhase5Test: React.FC = () => {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [gridConfig] = useState<GridConfig>(GRID_DEFAULTS);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Current editor state for history
  const currentState: EditorState = {
    shapes,
    selectedIds,
  };

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  // Zoom hook
  const { zoomIn, zoomOut, handleWheel, zoomPercentage } = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
  });

  // Grid hook
  const { gridLines, shouldRenderGrid } = useKonvaGrid({
    config: gridConfig,
    canvasWidth: CANVAS.DEFAULT_WIDTH,
    canvasHeight: CANVAS.DEFAULT_HEIGHT,
    viewport,
  });

  // Selection hook
  const selection = useKonvaSelection({
    enabled: true,
    shapes,
    onSelectionChange: setSelectedIds,
  });

  // Transform hook
  const transform = useKonvaTransform({
    selectedIds,
    shapes,
    onShapeUpdate: (id, updates) => {
      setShapes((prev) =>
        prev.map((shape) =>
          shape.id === id ? { ...shape, ...updates } : shape
        )
      );
      // Push to history after transform
      setTimeout(() => history.pushState('Transform shape'), 0);
    },
  });

  // History hook
  const history = useKonvaHistory({
    currentState,
    onStateRestore: (state) => {
      setShapes(state.shapes);
      setSelectedIds(state.selectedIds);
    },
  });

  // Persistence hook
  const persistence = useKonvaPersistence({
    currentState,
    onStateRestore: (state) => {
      setShapes(state.shapes);
      setSelectedIds(state.selectedIds);
    },
  });

  // Layer management
  const { layerRefs } = useKonvaLayers();

  // ==========================================================================
  // SHAPE MANAGEMENT
  // ==========================================================================

  const handleAddRectangle = useCallback(() => {
    const newShape = createRectangleShape({
      x: 100 + shapes.length * 20,
      y: 100 + shapes.length * 20,
      width: 150,
      height: 100,
      category: 'collision',
    });
    setShapes((prev) => [...prev, newShape]);
    history.pushState('Add rectangle');
  }, [shapes.length, history]);

  const handleAddPolygon = useCallback(() => {
    const offset = shapes.length * 20;
    const newShape = createPolygonShape({
      vertices: [
        { x: 400 + offset, y: 150 + offset },
        { x: 500 + offset, y: 150 + offset },
        { x: 550 + offset, y: 250 + offset },
        { x: 450 + offset, y: 300 + offset },
        { x: 350 + offset, y: 250 + offset },
      ],
      category: 'interactive',
    });
    setShapes((prev) => [...prev, newShape]);
    history.pushState('Add polygon');
  }, [shapes.length, history]);

  const handleDeleteSelected = useCallback(() => {
    setShapes((prev) => prev.filter((shape) => !selectedIds.includes(shape.id)));
    setSelectedIds([]);
    history.pushState('Delete shapes');
  }, [selectedIds, history]);

  const handleClearAll = useCallback(() => {
    setShapes([]);
    setSelectedIds([]);
    history.pushState('Clear all');
  }, [history]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Phase 5: State Management & Persistence Test</Title>
      
      <Row gutter={16}>
        {/* Canvas */}
        <Col span={16}>
          <Card title="Canvas" style={{ marginBottom: '16px' }}>
            <Alert
              message="State Management & Persistence"
              description="Add shapes, modify them, then test undo/redo and save/load functionality."
              type="info"
              style={{ marginBottom: '16px' }}
            />
            
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
                  {shapes.map((shape) => {
                    const isSelected = selection.isSelected(shape.id);
                    
                    if (shape.geometry.type === 'rectangle') {
                      return (
                        <TransformableRect
                          key={shape.id}
                          shape={shape}
                          isSelected={isSelected}
                          onSelect={() => selection.handleShapeClick(shape.id, { evt: { ctrlKey: false, metaKey: false }, cancelBubble: false })}
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
                          onSelect={() => selection.handleShapeClick(shape.id, { evt: { ctrlKey: false, metaKey: false }, cancelBubble: false })}
                          onDragEnd={(e) => transform.handleDragEnd(shape.id, e)}
                          onTransformEnd={(node) => transform.handleTransformEnd(shape.id, node)}
                        />
                      );
                    }
                    return null;
                  })}
                  
                  {/* Transformer */}
                  <TransformerComponent selectedShapeIds={selectedIds} />
                </Layer>

                {/* Selection Layer */}
                <Layer ref={layerRefs.selectionLayer.ref}>
                  <SelectionRect rect={selection.selectionRect} />
                </Layer>
              </Stage>
            </div>
          </Card>
        </Col>

        {/* Controls */}
        <Col span={8}>
          {/* History Controls */}
          <Card title="History (Undo/Redo)" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic title="Past" value={history.historySize} />
                </Col>
                <Col span={12}>
                  <Statistic title="Future" value={history.futureSize} />
                </Col>
              </Row>
              <Button
                onClick={history.undo}
                icon={<UndoOutlined />}
                disabled={!history.canUndo}
                block
              >
                Undo (Ctrl+Z)
              </Button>
              <Button
                onClick={history.redo}
                icon={<RedoOutlined />}
                disabled={!history.canRedo}
                block
              >
                Redo (Ctrl+Y)
              </Button>
              <Button onClick={history.clearHistory} block>
                Clear History
              </Button>
            </Space>
          </Card>

          {/* Persistence Controls */}
          <Card title="Persistence (Save/Load)" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Auto-Save: </Text>
                <Switch
                  checked={persistence.autoSaveEnabled}
                  onChange={persistence.setAutoSaveEnabled}
                />
              </div>
              {persistence.lastSaved && (
                <Text type="secondary">
                  Last saved: {new Date(persistence.lastSaved).toLocaleTimeString()}
                </Text>
              )}
              <Button
                onClick={persistence.save}
                icon={<SaveOutlined />}
                loading={persistence.isSaving}
                block
              >
                Save
              </Button>
              <Button
                onClick={persistence.load}
                icon={<FolderOpenOutlined />}
                loading={persistence.isLoading}
                disabled={!persistence.canLoad}
                block
              >
                Load
              </Button>
              <Button onClick={persistence.clear} block>
                Clear Saved Data
              </Button>
              {persistence.error && (
                <Alert message={persistence.error} type="error" showIcon />
              )}
            </Space>
          </Card>

          {/* Shape Management */}
          <Card title="Shapes" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Total: </Text>
                <Tag color="blue">{shapes.length}</Tag>
              </div>
              <Button onClick={handleAddRectangle} block>
                Add Rectangle
              </Button>
              <Button onClick={handleAddPolygon} block>
                Add Polygon
              </Button>
              <Button
                onClick={handleDeleteSelected}
                icon={<DeleteOutlined />}
                danger
                disabled={selectedIds.length === 0}
                block
              >
                Delete Selected
              </Button>
              <Button onClick={handleClearAll} icon={<ClearOutlined />} block>
                Clear All
              </Button>
            </Space>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card title="Shortcuts" size="small">
            <Space direction="vertical" style={{ fontSize: '12px' }}>
              <Text>Ctrl+Z - Undo</Text>
              <Text>Ctrl+Y - Redo</Text>
              <Text>Ctrl+Shift+Z - Redo</Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

