import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Slider, Switch, InputNumber, Space, Typography, Card } from 'antd';
import { AppstoreOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Point, Dimensions, Rectangle, GridLayout } from './AvatarBuilderTypes';

const { Text } = Typography;

export interface GridOverlayProps {
  imageData: string;
  imageDimensions: Dimensions;
  onGridChange: (layout: GridLayout) => void;
  onFrameSelect: (frameIndex: number, frameRect: Rectangle) => void;
  selectedFrames: number[];
  initialGrid?: GridLayout;
  className?: string;
}

interface GridState {
  columns: number;
  rows: number;
  spacing: Point;
  margin: Point;
  visible: boolean;
  snapToGrid: boolean;
  opacity: number;
  color: string;
}

/**
 * Interactive grid overlay component for sprite sheet frame selection
 */
export const GridOverlayComponent: React.FC<GridOverlayProps> = ({
  imageData,
  imageDimensions,
  onGridChange,
  onFrameSelect,
  selectedFrames = [],
  initialGrid,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gridState, setGridState] = useState<GridState>({
    columns: initialGrid?.columns || 3,
    rows: initialGrid?.rows || 3,
    spacing: initialGrid?.spacing || { x: 0, y: 0 },
    margin: initialGrid?.margin || { x: 0, y: 0 },
    visible: true,
    snapToGrid: true,
    opacity: 0.7,
    color: '#00ff00'
  });

  const [canvasSize, setCanvasSize] = useState<Dimensions>({ width: 400, height: 400 });
  const [scale, setScale] = useState(1);
  const [hoveredFrame, setHoveredFrame] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  // Calculate frame dimensions based on current grid
  const calculateFrameDimensions = useCallback(() => {
    const availableWidth = imageDimensions.width - (gridState.margin.x * 2) - (gridState.spacing.x * (gridState.columns - 1));
    const availableHeight = imageDimensions.height - (gridState.margin.y * 2) - (gridState.spacing.y * (gridState.rows - 1));
    
    return {
      frameWidth: Math.floor(availableWidth / gridState.columns),
      frameHeight: Math.floor(availableHeight / gridState.rows)
    };
  }, [gridState, imageDimensions]);

  // Calculate frame position for given index
  const getFrameRect = useCallback((frameIndex: number): Rectangle => {
    const { frameWidth, frameHeight } = calculateFrameDimensions();
    const col = frameIndex % gridState.columns;
    const row = Math.floor(frameIndex / gridState.columns);
    
    return {
      x: gridState.margin.x + col * (frameWidth + gridState.spacing.x),
      y: gridState.margin.y + row * (frameHeight + gridState.spacing.y),
      width: frameWidth,
      height: frameHeight
    };
  }, [gridState, calculateFrameDimensions]);

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = useCallback((canvasPoint: Point): Point => {
    return {
      x: canvasPoint.x / scale,
      y: canvasPoint.y / scale
    };
  }, [scale]);

  // Convert image coordinates to canvas coordinates
  const imageToCanvasCoords = useCallback((imagePoint: Point): Point => {
    return {
      x: imagePoint.x * scale,
      y: imagePoint.y * scale
    };
  }, [scale]);

  // Find frame at given image coordinates
  const getFrameAtPosition = useCallback((imagePos: Point): number | null => {
    const totalFrames = gridState.columns * gridState.rows;
    
    for (let i = 0; i < totalFrames; i++) {
      const frameRect = getFrameRect(i);
      if (imagePos.x >= frameRect.x && imagePos.x < frameRect.x + frameRect.width &&
          imagePos.y >= frameRect.y && imagePos.y < frameRect.y + frameRect.height) {
        return i;
      }
    }
    
    return null;
  }, [gridState, getFrameRect]);

  // Draw the grid overlay
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    const img = new Image();
    img.onload = () => {
      // Draw scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (!gridState.visible) return;

      // Set grid style
      ctx.strokeStyle = gridState.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = gridState.opacity;

      const { frameWidth, frameHeight } = calculateFrameDimensions();
      const totalFrames = gridState.columns * gridState.rows;

      // Draw grid lines and frame highlights
      for (let i = 0; i < totalFrames; i++) {
        const frameRect = getFrameRect(i);
        const canvasRect = {
          x: frameRect.x * scale,
          y: frameRect.y * scale,
          width: frameRect.width * scale,
          height: frameRect.height * scale
        };

        // Draw frame border
        ctx.strokeRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);

        // Highlight selected frames
        if (selectedFrames.includes(i)) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          ctx.fillRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);
        }

        // Highlight hovered frame
        if (hoveredFrame === i) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
          ctx.fillRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);
        }

        // Draw frame number
        ctx.fillStyle = gridState.color;
        ctx.font = `${Math.max(10, 12 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
          i.toString(),
          canvasRect.x + canvasRect.width / 2,
          canvasRect.y + canvasRect.height / 2
        );
      }

      ctx.globalAlpha = 1;
    };
    img.src = imageData;
  }, [
    imageData, gridState, scale, selectedFrames, hoveredFrame,
    calculateFrameDimensions, getFrameRect
  ]);

  // Handle canvas resize
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 40; // Account for padding
    const maxHeight = 600; // Maximum height

    // Calculate scale to fit image in container
    const scaleX = maxWidth / imageDimensions.width;
    const scaleY = maxHeight / imageDimensions.height;
    const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up

    const newCanvasSize = {
      width: imageDimensions.width * newScale,
      height: imageDimensions.height * newScale
    };

    setScale(newScale);
    setCanvasSize(newCanvasSize);
  }, [imageDimensions]);

  // Mouse event handlers
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const imagePos = canvasToImageCoords(canvasPos);
    const frameIndex = getFrameAtPosition(imagePos);
    
    setHoveredFrame(frameIndex);

    if (isDragging && dragStart) {
      // Handle drag selection (future feature)
      // For now, just update hover
    }
  }, [canvasToImageCoords, getFrameAtPosition, isDragging, dragStart]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const imagePos = canvasToImageCoords(canvasPos);
    const frameIndex = getFrameAtPosition(imagePos);

    if (frameIndex !== null) {
      const frameRect = getFrameRect(frameIndex);
      onFrameSelect(frameIndex, frameRect);
    }

    setIsDragging(true);
    setDragStart(canvasPos);
  }, [canvasToImageCoords, getFrameAtPosition, getFrameRect, onFrameSelect]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredFrame(null);
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Update grid layout when state changes
  useEffect(() => {
    const { frameWidth, frameHeight } = calculateFrameDimensions();
    const layout: GridLayout = {
      columns: gridState.columns,
      rows: gridState.rows,
      frameWidth,
      frameHeight,
      spacing: gridState.spacing,
      margin: gridState.margin
    };
    onGridChange(layout);
  }, [gridState, calculateFrameDimensions, onGridChange]);

  // Redraw when dependencies change
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // Handle window resize
  useEffect(() => {
    updateCanvasSize();
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // Update canvas size when calculated
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      drawGrid();
    }
  }, [canvasSize, drawGrid]);

  return (
    <div className={`grid-overlay-component ${className}`} ref={containerRef}>
      {/* Grid Controls */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <Text strong>
              <AppstoreOutlined /> Grid Settings
            </Text>
            <Switch
              checked={gridState.visible}
              onChange={(visible) => setGridState(prev => ({ ...prev, visible }))}
              checkedChildren={<EyeOutlined />}
              unCheckedChildren={<EyeInvisibleOutlined />}
            />
          </Space>

          <Space wrap>
            <Space>
              <Text>Columns:</Text>
              <InputNumber
                min={1}
                max={20}
                value={gridState.columns}
                onChange={(value) => setGridState(prev => ({ ...prev, columns: value || 1 }))}
                size="small"
                style={{ width: 60 }}
              />
            </Space>

            <Space>
              <Text>Rows:</Text>
              <InputNumber
                min={1}
                max={20}
                value={gridState.rows}
                onChange={(value) => setGridState(prev => ({ ...prev, rows: value || 1 }))}
                size="small"
                style={{ width: 60 }}
              />
            </Space>

            <Space>
              <Text>Opacity:</Text>
              <Slider
                min={0.1}
                max={1}
                step={0.1}
                value={gridState.opacity}
                onChange={(value) => setGridState(prev => ({ ...prev, opacity: value }))}
                style={{ width: 100 }}
              />
            </Space>
          </Space>

          <Space wrap>
            <Space>
              <Text>Spacing X:</Text>
              <InputNumber
                min={0}
                max={50}
                value={gridState.spacing.x}
                onChange={(value) => setGridState(prev => ({ 
                  ...prev, 
                  spacing: { ...prev.spacing, x: value || 0 }
                }))}
                size="small"
                style={{ width: 60 }}
              />
            </Space>

            <Space>
              <Text>Spacing Y:</Text>
              <InputNumber
                min={0}
                max={50}
                value={gridState.spacing.y}
                onChange={(value) => setGridState(prev => ({ 
                  ...prev, 
                  spacing: { ...prev.spacing, y: value || 0 }
                }))}
                size="small"
                style={{ width: 60 }}
              />
            </Space>

            <Space>
              <Text>Margin X:</Text>
              <InputNumber
                min={0}
                max={100}
                value={gridState.margin.x}
                onChange={(value) => setGridState(prev => ({ 
                  ...prev, 
                  margin: { ...prev.margin, x: value || 0 }
                }))}
                size="small"
                style={{ width: 60 }}
              />
            </Space>

            <Space>
              <Text>Margin Y:</Text>
              <InputNumber
                min={0}
                max={100}
                value={gridState.margin.y}
                onChange={(value) => setGridState(prev => ({ 
                  ...prev, 
                  margin: { ...prev.margin, y: value || 0 }
                }))}
                size="small"
                style={{ width: 60 }}
              />
            </Space>
          </Space>
        </Space>
      </Card>

      {/* Canvas Container */}
      <div 
        style={{ 
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          padding: 8,
          backgroundColor: '#fafafa',
          textAlign: 'center',
          overflow: 'auto',
          maxHeight: 650
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ 
            cursor: 'crosshair',
            border: '1px solid #ccc',
            backgroundColor: 'white'
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Frame Info */}
        {hoveredFrame !== null && (
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
            Frame {hoveredFrame} | 
            {(() => {
              const rect = getFrameRect(hoveredFrame);
              return ` Position: (${rect.x}, ${rect.y}) | Size: ${rect.width}×${rect.height}`;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
