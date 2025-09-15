import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Slider, Switch, InputNumber, Space, Typography, Card } from 'antd';
import { AppstoreOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Point, Dimensions, Rectangle, GridLayout } from './AvatarBuilderTypes';
import { ZoomControls, useZoomState } from './ZoomControls';

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
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Zoom state management
  const [zoomState, setZoomState] = useZoomState(1, 0.1, 5);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });

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
  const [hoveredFrame, setHoveredFrame] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  // Track container dimensions for zoom calculations
  useEffect(() => {
    const updateContainerDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateContainerDimensions();

    // Use ResizeObserver if available
    if ('ResizeObserver' in window && containerRef.current) {
      const resizeObserver = new ResizeObserver(updateContainerDimensions);
      resizeObserver.observe(containerRef.current);

      return () => resizeObserver.disconnect();
    } else {
      // Fallback to window resize
      window.addEventListener('resize', updateContainerDimensions);
      return () => window.removeEventListener('resize', updateContainerDimensions);
    }
  }, []);

  // Mouse wheel zoom support
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate zoom direction and amount
    const zoomDirection = event.deltaY > 0 ? -1 : 1;
    const zoomFactor = 0.1;
    const newScale = Math.max(
      zoomState.minScale,
      Math.min(zoomState.scale + (zoomDirection * zoomFactor), zoomState.maxScale)
    );

    if (newScale === zoomState.scale) return; // No change needed

    // Calculate new offset to zoom towards mouse position
    const scaleDiff = newScale - zoomState.scale;
    const newOffsetX = zoomState.offsetX - (mouseX * scaleDiff);
    const newOffsetY = zoomState.offsetY - (mouseY * scaleDiff);

    setZoomState({
      ...zoomState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [zoomState, setZoomState]);

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

  // Convert canvas coordinates to image coordinates (accounting for zoom)
  const canvasToImageCoords = useCallback((canvasPoint: Point): Point => {
    // Account for zoom transform: subtract offset and divide by scale
    return {
      x: (canvasPoint.x - zoomState.offsetX) / zoomState.scale,
      y: (canvasPoint.y - zoomState.offsetY) / zoomState.scale
    };
  }, [zoomState]);



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

    // Save context state
    ctx.save();

    // Apply zoom transform
    ctx.translate(zoomState.offsetX, zoomState.offsetY);
    ctx.scale(zoomState.scale, zoomState.scale);

    // Draw background image
    const img = new Image();
    img.onload = () => {
      // Draw image at original size (zoom is applied via transform)
      ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);

      if (!gridState.visible) return;

      // Set grid style
      ctx.strokeStyle = gridState.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = gridState.opacity;

      const totalFrames = gridState.columns * gridState.rows;

      // Draw grid lines and frame highlights
      for (let i = 0; i < totalFrames; i++) {
        const frameRect = getFrameRect(i);

        // Draw frame border (no need to scale - transform is already applied)
        ctx.strokeRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);

        // Highlight selected frames
        if (selectedFrames.includes(i)) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          ctx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
        }

        // Highlight hovered frame
        if (hoveredFrame === i) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
          ctx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
        }

        // Draw frame number
        ctx.fillStyle = gridState.color;
        ctx.font = `${Math.max(10, 12 / zoomState.scale)}px Arial`; // Adjust font size for zoom
        ctx.textAlign = 'center';
        ctx.fillText(
          i.toString(),
          frameRect.x + frameRect.width / 2,
          frameRect.y + frameRect.height / 2
        );
      }

      ctx.globalAlpha = 1;

      // Restore context state
      ctx.restore();
    };

    // Store image reference for zoom calculations
    imageRef.current = img;
    img.src = imageData;
  }, [
    imageData, gridState, selectedFrames, hoveredFrame, zoomState,
    getFrameRect, imageDimensions.width, imageDimensions.height
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

    // Handle panning when dragging with middle mouse or space key
    if (isDragging && dragStart && (event.buttons === 4 || event.ctrlKey)) {
      const deltaX = canvasPos.x - dragStart.x;
      const deltaY = canvasPos.y - dragStart.y;

      setZoomState({
        ...zoomState,
        offsetX: zoomState.offsetX + deltaX,
        offsetY: zoomState.offsetY + deltaY
      });

      setDragStart(canvasPos);
      return;
    }

    const imagePos = canvasToImageCoords(canvasPos);
    const frameIndex = getFrameAtPosition(imagePos);

    setHoveredFrame(frameIndex);
  }, [canvasToImageCoords, getFrameAtPosition, isDragging, dragStart, setZoomState, zoomState]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Check if this is a panning operation (middle mouse or ctrl+click)
    if (event.button === 1 || event.ctrlKey) {
      setIsDragging(true);
      setDragStart(canvasPos);
      canvas.style.cursor = 'grabbing';
      return;
    }

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

    // Reset cursor
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'crosshair';
    }
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
      {/* Zoom Controls */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>Zoom Controls</Text>
          <ZoomControls
            zoomState={zoomState}
            onZoomChange={setZoomState}
            containerWidth={containerDimensions.width}
            containerHeight={containerDimensions.height}
            contentWidth={imageDimensions.width}
            contentHeight={imageDimensions.height}
            size="small"
            showSlider={false}
            showFitButtons={true}
          />
        </div>
      </Card>

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
          onWheel={handleWheel}
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
