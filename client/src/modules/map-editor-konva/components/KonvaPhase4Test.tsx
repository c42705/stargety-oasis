/**
 * Konva Map Editor - Phase 4 Test Component
 * 
 * Comprehensive test of Phase 4 selection and manipulation features:
 * - Shape selection (single, multi, drag-to-select)
 * - Drag to move
 * - Resize with Transformer
 * - Delete and duplicate
 * - Keyboard shortcuts
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { Card, Space, Button, Typography, Row, Col, Tag, Alert } from 'antd';
import {
  DeleteOutlined,
  CopyOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import type { Viewport, GridConfig, Shape } from '../types';
import { useKonvaZoom } from '../hooks/useKonvaZoom';
import { useKonvaPan } from '../hooks/useKonvaPan';
import { useKonvaGrid } from '../hooks/useKonvaGrid';
import { useKonvaSelection } from '../hooks/useKonvaSelection';
import { useKonvaTransform } from '../hooks/useKonvaTransform';
import { useKonvaLayers } from '../hooks/useKonvaLayers';
import { TransformableRect, TransformablePolygon, TransformerComponent } from './TransformableShape';
import { SelectionRect } from './SelectionRect';
import { duplicateShape } from '../utils/shapeFactories';
import { VIEWPORT_DEFAULTS, GRID_DEFAULTS, CANVAS } from '../constants/konvaConstants';
import { shouldIgnoreKeyboardEvent } from '../../../shared/keyboardFocusUtils';

const { Title, Text } = Typography;

export const KonvaPhase4Test: React.FC = () => {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_DEFAULTS);
  const [gridConfig] = useState<GridConfig>(GRID_DEFAULTS);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  // Zoom hook
  const { zoomIn, zoomOut, handleWheel, zoomPercentage } = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
  });

  // Pan hook (disabled for now, using select tool)
  useKonvaPan({
    viewport,
    onViewportChange: setViewport,
    enabled: false,
  });

  // Grid hook
  const { gridLines, shouldRenderGrid } = useKonvaGrid({
    config: gridConfig,
    canvasWidth: CANVAS.DEFAULT_WIDTH,
    canvasHeight: CANVAS.DEFAULT_HEIGHT,
    viewport,
  });

  // Selection hook (controlled by local selectedIds state)
  const selection = useKonvaSelection({
    enabled: true,
    shapes,
    selectedIds,
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
    },
  });

  // Layer management
  const { layerRefs } = useKonvaLayers();

  // ==========================================================================
  // SHAPE MANAGEMENT
  // ==========================================================================

  const handleDeleteSelected = useCallback(() => {
    setShapes((prev) => prev.filter((shape) => !selection.selectedIds.includes(shape.id)));
    selection.clearSelection();
  }, [selection]);

  const handleDuplicateSelected = useCallback(() => {
    const newShapes: Shape[] = [];
    selection.selectedIds.forEach((id) => {
      const shape = shapes.find((s) => s.id === id);
      if (shape) {
        newShapes.push(duplicateShape(shape, { x: 20, y: 20 }));
      }
    });
    setShapes((prev) => [...prev, ...newShapes]);
  }, [selection.selectedIds, shapes]);

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard events when typing in input fields or when modal is open
      if (shouldIgnoreKeyboardEvent()) {
        return;
      }

      // Delete
      if (e.key === 'Delete' && selection.hasSelection) {
        e.preventDefault();
        handleDeleteSelected();
      }
      // Duplicate (Ctrl+D)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selection.hasSelection) {
        e.preventDefault();
        handleDuplicateSelected();
      }
      // Select All (Ctrl+A)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selection.selectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, handleDeleteSelected, handleDuplicateSelected]);

  // ==========================================================================
  // DEMO SHAPES
  // ==========================================================================

  useEffect(() => {
    // Create some demo shapes
    const demoShapes: Shape[] = [
      {
        id: 'rect-1',
        category: 'collision',
        geometry: {
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 150,
          height: 100,
        },
        style: {
          fill: 'rgba(255, 0, 0, 0.3)',
          stroke: '#ff0000',
          strokeWidth: 2,
          opacity: 0.7,
        },
        metadata: {
          name: 'Rectangle 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: 'poly-1',
        category: 'interactive',
        geometry: {
          type: 'polygon',
          points: [400, 150, 500, 150, 550, 250, 450, 300, 350, 250],
        },
        style: {
          fill: 'rgba(0, 255, 0, 0.3)',
          stroke: '#00ff00',
          strokeWidth: 2,
          opacity: 0.7,
        },
        metadata: {
          name: 'Polygon 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];
    setShapes(demoShapes);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Phase 4: Selection & Manipulation Test</Title>
      
      <Row gutter={16}>
        {/* Canvas */}
        <Col span={16}>
          <Card title="Canvas" style={{ marginBottom: '16px' }}>
            <Alert
              message="Selection & Manipulation"
              description="Click to select, Ctrl+Click for multi-select, drag empty area to select multiple. Drag shapes to move, use handles to resize."
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
                  
                  {/* Transformer */}
                  <TransformerComponent selectedShapeIds={selection.selectedIds} />
                </Layer>

                {/* Selection Layer */}
                <Layer ref={layerRefs.uiLayer}>
                  <SelectionRect rect={selection.selectionRect} />
                </Layer>
              </Stage>
            </div>
          </Card>
        </Col>

        {/* Controls */}
        <Col span={8}>
          {/* Selection Info */}
          <Card title="Selection" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Selected: </Text>
                <Tag color="blue">{selection.selectedCount}</Tag>
              </div>
              <div>
                <Text strong>Total Shapes: </Text>
                <Tag color="green">{shapes.length}</Tag>
              </div>
              <Button onClick={selection.selectAll} icon={<SelectOutlined />} block>
                Select All (Ctrl+A)
              </Button>
              <Button onClick={selection.clearSelection} block>
                Clear Selection
              </Button>
            </Space>
          </Card>

          {/* Actions */}
          <Card title="Actions" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                onClick={handleDuplicateSelected}
                icon={<CopyOutlined />}
                disabled={!selection.hasSelection}
                block
              >
                Duplicate (Ctrl+D)
              </Button>
              <Button
                onClick={handleDeleteSelected}
                icon={<DeleteOutlined />}
                danger
                disabled={!selection.hasSelection}
                block
              >
                Delete (Del)
              </Button>
            </Space>
          </Card>

          {/* Zoom Controls */}
          <Card title="Zoom" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button onClick={zoomIn} block>Zoom In</Button>
              <Button onClick={zoomOut} block>Zoom Out</Button>
              <Text type="secondary">Zoom: {zoomPercentage}%</Text>
            </Space>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card title="Shortcuts" size="small">
            <Space direction="vertical" style={{ fontSize: '12px' }}>
              <Text>Click - Select shape</Text>
              <Text>Ctrl+Click - Multi-select</Text>
              <Text>Drag empty - Select rectangle</Text>
              <Text>Drag shape - Move</Text>
              <Text>Drag handles - Resize</Text>
              <Text>Delete - Delete selected</Text>
              <Text>Ctrl+D - Duplicate</Text>
              <Text>Ctrl+A - Select all</Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

