/**
 * Konva Map Editor POC - Main Component
 * Minimal implementation for testing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Circle } from 'react-konva';
import { Button, Space, Typography, Card, Divider, Modal, App } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  DragOutlined,
  SelectOutlined,
  BorderOutlined,
  ApartmentOutlined,
  SaveOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { POCViewport, POCGrid, POCTool, POCShape, POCShapeCategory } from './types/konva.types';
import {
  POC_CANVAS,
  POC_VIEWPORT_DEFAULTS,
  POC_GRID_DEFAULTS,
  POC_STYLES,
} from './constants/konvaConstants';
import { useKonvaZoom } from './hooks/useKonvaZoom';
import { useKonvaPan } from './hooks/useKonvaPan';
import { useKonvaRectDrawing } from './hooks/useKonvaRectDrawing';
import { useKonvaSelection } from './hooks/useKonvaSelection';
import { useKonvaPolygonDrawing } from './hooks/useKonvaPolygonDrawing';
import {
  TransformableRect,
  TransformablePolygon,
  TransformerComponent
} from './components/TransformableShape';

const { Title, Text } = Typography;

// TODO: Migrate to database persistence
const STORAGE_KEY = 'konva-poc-shapes';

export const KonvaMapEditorPOC: React.FC = () => {
  // Ant Design App context for modals
  const { modal } = App.useApp();

  // State
  const [viewport, setViewport] = useState<POCViewport>(POC_VIEWPORT_DEFAULTS);
  const [grid] = useState<POCGrid>(POC_GRID_DEFAULTS);
  const [currentTool, setCurrentTool] = useState<POCTool>('select');
  const [shapes, setShapes] = useState<POCShape[]>([]);
  const [currentCategory, setCurrentCategory] = useState<POCShapeCategory>('collision');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Hooks
  const zoom = useKonvaZoom({
    viewport,
    onViewportChange: setViewport,
  });

  const pan = useKonvaPan({
    viewport,
    onViewportChange: setViewport,
    enabled: currentTool === 'pan',
  });

  const rectDrawing = useKonvaRectDrawing({
    enabled: currentTool === 'rect',
    category: currentCategory,
    onShapeCreate: (shape) => {
      setShapes((prev) => [...prev, shape]);
    },
    viewport,
  });

  const selection = useKonvaSelection({
    enabled: currentTool === 'select',
    selectedIds,
    onSelectionChange: setSelectedIds,
    shapes,
  });

  const polygonDrawing = useKonvaPolygonDrawing({
    enabled: currentTool === 'polygon',
    category: currentCategory,
    onShapeCreate: (shape) => {
      setShapes((prev) => [...prev, shape]);
    },
    viewport,
  });

  // Handle shape transformation/drag
  const handleShapeChange = useCallback((shapeId: string, newAttrs: any) => {
    setShapes((prevShapes) =>
      prevShapes.map((shape) => {
        if (shape.id === shapeId) {
          return {
            ...shape,
            geometry: {
              ...shape.geometry,
              ...newAttrs,
            } as POCShape['geometry'],
          };
        }
        return shape;
      })
    );
  }, []);

  // Delete functionality
  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      console.log('Delete triggered but no shapes selected');
      return;
    }

    // Prevent multiple modals from opening
    if (isDeleteModalOpen) {
      console.log('Delete modal already open, ignoring');
      return;
    }

    const count = selectedIds.length;
    const message = count === 1 ? 'Delete shape?' : `Delete ${count} shapes?`;

    console.log('Showing delete confirmation for', count, 'shapes');
    setIsDeleteModalOpen(true);

    // Use modal from App context instead of Modal.confirm
    modal.confirm({
      title: 'Confirm Deletion',
      content: message,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: () => {
        console.log('Deleting shapes:', selectedIds);
        setShapes((prev) => prev.filter((shape) => !selectedIds.includes(shape.id)));
        setSelectedIds([]);
        setIsDeleteModalOpen(false);
      },
      onCancel: () => {
        console.log('Delete cancelled');
        setIsDeleteModalOpen(false);
      },
    });
  }, [selectedIds, isDeleteModalOpen, modal]);

  // Keyboard listener for Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('Key pressed:', e.key, 'Selected shapes:', selectedIds.length);

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent default behavior (e.g., browser back navigation for Backspace)
        e.preventDefault();
        console.log('Delete/Backspace key detected, calling handleDelete');
        handleDelete();
      }
    };

    console.log('Attaching delete keyboard listener');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log('Removing delete keyboard listener');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDelete, selectedIds.length]);

  // Load shapes from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const loadedShapes = JSON.parse(saved) as POCShape[];
        setShapes(loadedShapes);
      }
    } catch (error) {
      console.error('Failed to load shapes from localStorage:', error);
    }
  }, []);

  // Save shapes to localStorage
  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
      Modal.success({
        title: 'Saved',
        content: `${shapes.length} shapes saved to localStorage`,
      });
    } catch (error) {
      console.error('Failed to save shapes to localStorage:', error);
      Modal.error({
        title: 'Save Failed',
        content: 'Failed to save shapes to localStorage',
      });
    }
  }, [shapes]);

  // Load shapes from localStorage
  const handleLoad = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const loadedShapes = JSON.parse(saved) as POCShape[];
        setShapes(loadedShapes);
        setSelectedIds([]);
        Modal.success({
          title: 'Loaded',
          content: `${loadedShapes.length} shapes loaded from localStorage`,
        });
      } else {
        Modal.info({
          title: 'No Data',
          content: 'No saved shapes found in localStorage',
        });
      }
    } catch (error) {
      console.error('Failed to load shapes from localStorage:', error);
      Modal.error({
        title: 'Load Failed',
        content: 'Failed to load shapes from localStorage',
      });
    }
  }, []);

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
          listening={false}
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
          listening={false}
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
          {/* Tool Selection */}
          <Button
            type={currentTool === 'select' ? 'primary' : 'default'}
            icon={<SelectOutlined />}
            onClick={() => setCurrentTool('select')}
          >
            Select
          </Button>
          <Button
            type={currentTool === 'pan' ? 'primary' : 'default'}
            icon={<DragOutlined />}
            onClick={() => setCurrentTool('pan')}
          >
            Pan
          </Button>
          <Button
            type={currentTool === 'rect' ? 'primary' : 'default'}
            icon={<BorderOutlined />}
            onClick={() => setCurrentTool('rect')}
          >
            Rectangle
          </Button>
          <Button
            type={currentTool === 'polygon' ? 'primary' : 'default'}
            icon={<ApartmentOutlined />}
            onClick={() => setCurrentTool('polygon')}
          >
            Polygon
          </Button>

          <Divider type="vertical" />

          {/* Category Selection (for drawing tools) */}
          {(currentTool === 'rect' || currentTool === 'polygon') && (
            <>
              <Button
                type={currentCategory === 'collision' ? 'primary' : 'default'}
                size="small"
                onClick={() => setCurrentCategory('collision')}
              >
                Collision
              </Button>
              <Button
                type={currentCategory === 'interactive' ? 'primary' : 'default'}
                size="small"
                onClick={() => setCurrentCategory('interactive')}
              >
                Interactive
              </Button>
              <Divider type="vertical" />
            </>
          )}

          {/* Zoom Controls */}
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

          <Divider type="vertical" />

          {/* Persistence */}
          <Button icon={<SaveOutlined />} onClick={handleSave} type="primary">
            Save
          </Button>
          <Button icon={<FolderOpenOutlined />} onClick={handleLoad}>
            Load
          </Button>

          <Divider type="vertical" />

          {/* Status */}
          <Text type="secondary">Tool: {currentTool}</Text>
        </Space>

        {/* Canvas */}
        <div style={{ border: '2px solid #ccc' }}>
          <Stage
            width={POC_CANVAS.WIDTH}
            height={POC_CANVAS.HEIGHT}
            scaleX={viewport.zoom}
            scaleY={viewport.zoom}
            x={viewport.pan.x}
            y={viewport.pan.y}
            onWheel={zoom.handleWheel}
            onClick={(e) => {
              selection.handleStageClick(e);
              polygonDrawing.handleClick(e);
            }}
            onDblClick={() => {
              polygonDrawing.handleDoubleClick();
            }}
            onMouseDown={(e) => {
              selection.handleMouseDown(e);
              pan.handleMouseDown(e);
              rectDrawing.handleMouseDown(e);
            }}
            onMouseMove={(e) => {
              selection.handleMouseMove(e);
              pan.handleMouseMove(e);
              rectDrawing.handleMouseMove(e);
              polygonDrawing.handleMouseMove(e);
            }}
            onMouseUp={() => {
              selection.handleMouseUp();
              pan.handleMouseUp();
              rectDrawing.handleMouseUp();
            }}
          >
            {/* Background Layer */}
            <Layer>
              <Rect
                x={0}
                y={0}
                width={POC_CANVAS.WIDTH}
                height={POC_CANVAS.HEIGHT}
                fill={POC_CANVAS.BACKGROUND}
                listening={false}
              />
            </Layer>

            {/* Grid Layer */}
            <Layer>
              {renderGrid()}
            </Layer>

            {/* Shapes Layer */}
            <Layer>
              {/* Render all shapes with transformation support */}
              {shapes.map((shape) => {
                const isSelected = selection.isSelected(shape.id);
                if (shape.geometry.type === 'rect') {
                  return (
                    <TransformableRect
                      key={shape.id}
                      shape={shape}
                      isSelected={isSelected}
                      onSelect={() => selection.handleShapeClick(shape.id, { cancelBubble: true, evt: { ctrlKey: false, metaKey: false } })}
                      onChange={(newAttrs) => handleShapeChange(shape.id, newAttrs)}
                      selectionStroke={shape.style.stroke}
                      selectionStrokeWidth={shape.style.strokeWidth}
                      selectionDash={undefined}
                    />
                  );
                } else if (shape.geometry.type === 'polygon') {
                  return (
                    <TransformablePolygon
                      key={shape.id}
                      shape={shape}
                      isSelected={isSelected}
                      onSelect={() => selection.handleShapeClick(shape.id, { cancelBubble: true, evt: { ctrlKey: false, metaKey: false } })}
                      onChange={(newAttrs) => handleShapeChange(shape.id, newAttrs)}
                      selectionStroke={shape.style.stroke}
                      selectionStrokeWidth={shape.style.strokeWidth}
                      selectionDash={undefined}
                    />
                  );
                }
                return null;
              })}

              {/* Transformer for selected shapes */}
              <TransformerComponent
                selectedShapeIds={selectedIds}
                shapes={shapes}
              />

              {/* Rectangle drawing preview */}
              {rectDrawing.isDrawing && rectDrawing.getPreviewRect() && (() => {
                const preview = rectDrawing.getPreviewRect()!;
                return (
                  <Rect
                    x={preview.x}
                    y={preview.y}
                    width={preview.width}
                    height={preview.height}
                    fill={POC_STYLES[currentCategory].fill}
                    stroke={POC_STYLES[currentCategory].stroke}
                    strokeWidth={2}
                    opacity={0.5}
                    dash={[5, 5]}
                    listening={false}
                  />
                );
              })()}

              {/* Polygon drawing preview */}
              {polygonDrawing.isDrawing && polygonDrawing.getPreviewLines() && (() => {
                const previewPoints = polygonDrawing.getPreviewLines()!;
                const canClose = polygonDrawing.vertices.length >= 3;
                const isOriginHovered = polygonDrawing.isOriginHovered;

                return (
                  <>
                    {/* Preview line */}
                    <Line
                      points={previewPoints}
                      stroke={POC_STYLES[currentCategory].stroke}
                      strokeWidth={2}
                      dash={[5, 5]}
                      opacity={0.7}
                      listening={false}
                    />
                    {/* Vertex markers */}
                    {polygonDrawing.vertices.map((vertex, index) => {
                      const isOrigin = index === 0;
                      const shouldHighlight = isOrigin && canClose && isOriginHovered;

                      return (
                        <Circle
                          key={index}
                          x={vertex.x}
                          y={vertex.y}
                          radius={shouldHighlight ? 6 : 4}
                          fill={shouldHighlight ? '#00aaff' : POC_STYLES[currentCategory].stroke}
                          stroke="#ffffff"
                          strokeWidth={shouldHighlight ? 2 : 1}
                          listening={false}
                        />
                      );
                    })}
                  </>
                );
              })()}

              {/* Selection rectangle preview */}
              {selection.isDrawingSelection && selection.selectionRect && (() => {
                const rect = selection.selectionRect;
                return (
                  <Rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    fill="rgba(0, 162, 255, 0.1)"
                    stroke="#00a2ff"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                );
              })()}
            </Layer>
          </Stage>
        </div>
      </Card>
    </div>
  );
};

