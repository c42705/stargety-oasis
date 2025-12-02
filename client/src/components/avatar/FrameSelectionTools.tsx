import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button, Space, Typography, Card, Tooltip, Switch } from 'antd';
import { 
  SelectOutlined, 
  ScissorOutlined, 
  ExpandOutlined, 
  RotateLeftOutlined,
  SwapOutlined,
  UndoOutlined,
  RedoOutlined
} from '@ant-design/icons';
import { Point, Dimensions, Rectangle, FrameDefinition } from './AvatarBuilderTypes';


const { Text } = Typography;

export interface FrameSelectionToolsProps {
  imageData: string;
  imageDimensions: Dimensions;
  frames: FrameDefinition[];
  selectedFrameIds: string[];
  onFrameUpdate: (frameId: string, updates: Partial<FrameDefinition>) => void;
  onFrameCreate: (frame: Omit<FrameDefinition, 'id'>) => void;
  onFrameDelete: (frameId: string) => void;
  onSelectionChange: (frameIds: string[]) => void;
  className?: string;
}

type Tool = 'select' | 'crop' | 'resize' | 'rotate' | 'flip';

interface SelectionState {
  isSelecting: boolean;
  startPoint: Point | null;
  currentRect: Rectangle | null;
  resizeHandle: string | null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
}

/**
 * Advanced frame selection and manipulation tools
 */
export const FrameSelectionTools: React.FC<FrameSelectionToolsProps> = ({
  imageData,
  imageDimensions,
  frames,
  selectedFrameIds,
  onFrameUpdate,
  onFrameCreate,
  onFrameDelete,
  onSelectionChange,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [canvasSize, setCanvasSize] = useState<Dimensions>({ width: 400, height: 400 });
  const [scale, setScale] = useState(1);
  const [snapToPixels, setSnapToPixels] = useState(true);
  const [showHandles, setShowHandles] = useState(true);
  
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isSelecting: false,
    startPoint: null,
    currentRect: null,
    resizeHandle: null
  });

  const [hoveredFrame, setHoveredFrame] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = useCallback((canvasPoint: Point): Point => {
    const coords = {
      x: canvasPoint.x / scale,
      y: canvasPoint.y / scale
    };
    
    if (snapToPixels) {
      coords.x = Math.round(coords.x);
      coords.y = Math.round(coords.y);
    }
    
    return coords;
  }, [scale, snapToPixels]);



  // Find frame at given position
  const getFrameAtPosition = useCallback((imagePos: Point): string | null => {
    for (const frame of frames) {
      const rect = frame.sourceRect;
      if (imagePos.x >= rect.x && imagePos.x < rect.x + rect.width &&
          imagePos.y >= rect.y && imagePos.y < rect.y + rect.height) {
        return frame.id;
      }
    }
    return null;
  }, [frames]);

  // Get resize handle at position
  const getResizeHandle = useCallback((imagePos: Point, frameRect: Rectangle): string | null => {
    const handleSize = 8 / scale; // Handle size in image coordinates
    const { x, y, width, height } = frameRect;
    
    // Corner handles
    if (Math.abs(imagePos.x - x) <= handleSize && Math.abs(imagePos.y - y) <= handleSize) return 'nw';
    if (Math.abs(imagePos.x - (x + width)) <= handleSize && Math.abs(imagePos.y - y) <= handleSize) return 'ne';
    if (Math.abs(imagePos.x - x) <= handleSize && Math.abs(imagePos.y - (y + height)) <= handleSize) return 'sw';
    if (Math.abs(imagePos.x - (x + width)) <= handleSize && Math.abs(imagePos.y - (y + height)) <= handleSize) return 'se';
    
    // Edge handles
    if (Math.abs(imagePos.x - (x + width / 2)) <= handleSize && Math.abs(imagePos.y - y) <= handleSize) return 'n';
    if (Math.abs(imagePos.x - (x + width / 2)) <= handleSize && Math.abs(imagePos.y - (y + height)) <= handleSize) return 's';
    if (Math.abs(imagePos.x - x) <= handleSize && Math.abs(imagePos.y - (y + height / 2)) <= handleSize) return 'w';
    if (Math.abs(imagePos.x - (x + width)) <= handleSize && Math.abs(imagePos.y - (y + height / 2)) <= handleSize) return 'e';
    
    return null;
  }, [scale]);

  // Draw the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw frames
      frames.forEach(frame => {
        const rect = frame.sourceRect;
        const canvasRect = {
          x: rect.x * scale,
          y: rect.y * scale,
          width: rect.width * scale,
          height: rect.height * scale
        };

        // Frame border
        ctx.strokeStyle = selectedFrameIds.includes(frame.id) ? '#1890ff' : '#d9d9d9';
        ctx.lineWidth = selectedFrameIds.includes(frame.id) ? 2 : 1;
        ctx.strokeRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);

        // Frame highlight
        if (selectedFrameIds.includes(frame.id)) {
          ctx.fillStyle = 'rgba(24, 144, 255, 0.1)';
          ctx.fillRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);
        }

        // Hover highlight
        if (hoveredFrame === frame.id) {
          ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
          ctx.fillRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);
        }

        // Draw resize handles for selected frames
        if (selectedFrameIds.includes(frame.id) && showHandles) {
          const handleSize = 6;
          ctx.fillStyle = '#1890ff';
          
          // Corner handles
          ctx.fillRect(canvasRect.x - handleSize/2, canvasRect.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(canvasRect.x + canvasRect.width - handleSize/2, canvasRect.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(canvasRect.x - handleSize/2, canvasRect.y + canvasRect.height - handleSize/2, handleSize, handleSize);
          ctx.fillRect(canvasRect.x + canvasRect.width - handleSize/2, canvasRect.y + canvasRect.height - handleSize/2, handleSize, handleSize);
          
          // Edge handles
          ctx.fillRect(canvasRect.x + canvasRect.width/2 - handleSize/2, canvasRect.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(canvasRect.x + canvasRect.width/2 - handleSize/2, canvasRect.y + canvasRect.height - handleSize/2, handleSize, handleSize);
          ctx.fillRect(canvasRect.x - handleSize/2, canvasRect.y + canvasRect.height/2 - handleSize/2, handleSize, handleSize);
          ctx.fillRect(canvasRect.x + canvasRect.width - handleSize/2, canvasRect.y + canvasRect.height/2 - handleSize/2, handleSize, handleSize);
        }

        // Frame label
        if (frame.name) {
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText(frame.name, canvasRect.x + 4, canvasRect.y + 16);
        }
      });

      // Draw current selection rectangle
      if (selectionState.currentRect) {
        const rect = selectionState.currentRect;
        const canvasRect = {
          x: rect.x * scale,
          y: rect.y * scale,
          width: rect.width * scale,
          height: rect.height * scale
        };

        ctx.strokeStyle = '#52c41a';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);
        ctx.setLineDash([]);
      }
    };
    img.src = imageData;
  }, [
    imageData, frames, selectedFrameIds, hoveredFrame, showHandles, 
    selectionState.currentRect, scale
  ]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    const imagePos = canvasToImageCoords(canvasPos);

    if (currentTool === 'select') {
      const frameId = getFrameAtPosition(imagePos);
      
      if (frameId) {
        const frame = frames.find(f => f.id === frameId);
        if (frame) {
          const handle = getResizeHandle(imagePos, frame.sourceRect);
          
          if (handle) {
            // Start resize operation
            setSelectionState(prev => ({ ...prev, resizeHandle: handle }));
          } else {
            // Start move operation
            setDragOffset({
              x: imagePos.x - frame.sourceRect.x,
              y: imagePos.y - frame.sourceRect.y
            });
          }
          
          // Select frame
          if (!selectedFrameIds.includes(frameId)) {
            if (event.ctrlKey || event.metaKey) {
              onSelectionChange([...selectedFrameIds, frameId]);
            } else {
              onSelectionChange([frameId]);
            }
          }
        }
      } else {
        // Start new selection
        if (!event.ctrlKey && !event.metaKey) {
          onSelectionChange([]);
        }
        
        setSelectionState({
          isSelecting: true,
          startPoint: imagePos,
          currentRect: { x: imagePos.x, y: imagePos.y, width: 0, height: 0 },
          resizeHandle: null
        });
      }
    }
  }, [
    currentTool, canvasToImageCoords, getFrameAtPosition, getResizeHandle,
    frames, selectedFrameIds, onSelectionChange
  ]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    const imagePos = canvasToImageCoords(canvasPos);

    // Update hover state
    const frameId = getFrameAtPosition(imagePos);
    setHoveredFrame(frameId);

    // Handle active operations
    if (selectionState.isSelecting && selectionState.startPoint) {
      // Update selection rectangle
      const startPoint = selectionState.startPoint;
      const currentRect = {
        x: Math.min(startPoint.x, imagePos.x),
        y: Math.min(startPoint.y, imagePos.y),
        width: Math.abs(imagePos.x - startPoint.x),
        height: Math.abs(imagePos.y - startPoint.y)
      };
      
      setSelectionState(prev => ({ ...prev, currentRect }));
    } else if (selectionState.resizeHandle && selectedFrameIds.length === 1) {
      // Handle resize operation
      const frame = frames.find(f => f.id === selectedFrameIds[0]);
      if (frame) {
        const rect = { ...frame.sourceRect };
        const handle = selectionState.resizeHandle;
        
        // Update rectangle based on handle
        switch (handle) {
          case 'nw':
            rect.width += rect.x - imagePos.x;
            rect.height += rect.y - imagePos.y;
            rect.x = imagePos.x;
            rect.y = imagePos.y;
            break;
          case 'ne':
            rect.width = imagePos.x - rect.x;
            rect.height += rect.y - imagePos.y;
            rect.y = imagePos.y;
            break;
          case 'sw':
            rect.width += rect.x - imagePos.x;
            rect.height = imagePos.y - rect.y;
            rect.x = imagePos.x;
            break;
          case 'se':
            rect.width = imagePos.x - rect.x;
            rect.height = imagePos.y - rect.y;
            break;
          case 'n':
            rect.height += rect.y - imagePos.y;
            rect.y = imagePos.y;
            break;
          case 's':
            rect.height = imagePos.y - rect.y;
            break;
          case 'w':
            rect.width += rect.x - imagePos.x;
            rect.x = imagePos.x;
            break;
          case 'e':
            rect.width = imagePos.x - rect.x;
            break;
        }
        
        // Ensure minimum size
        rect.width = Math.max(rect.width, 16);
        rect.height = Math.max(rect.height, 16);
        
        onFrameUpdate(frame.id, { sourceRect: rect });
      }
    } else if (dragOffset && selectedFrameIds.length === 1) {
      // Handle move operation
      const frame = frames.find(f => f.id === selectedFrameIds[0]);
      if (frame) {
        const newRect = {
          ...frame.sourceRect,
          x: imagePos.x - dragOffset.x,
          y: imagePos.y - dragOffset.y
        };
        
        // Constrain to image bounds
        newRect.x = Math.max(0, Math.min(newRect.x, imageDimensions.width - newRect.width));
        newRect.y = Math.max(0, Math.min(newRect.y, imageDimensions.height - newRect.height));
        
        onFrameUpdate(frame.id, { sourceRect: newRect });
      }
    }

    // Update cursor
    if (frameId && selectedFrameIds.includes(frameId)) {
      const frame = frames.find(f => f.id === frameId);
      if (frame) {
        const handle = getResizeHandle(imagePos, frame.sourceRect);
        if (handle) {
          canvas.style.cursor = `${handle}-resize`;
        } else {
          canvas.style.cursor = 'move';
        }
      }
    } else {
      canvas.style.cursor = currentTool === 'select' ? 'crosshair' : 'default';
    }
  }, [
    canvasToImageCoords, getFrameAtPosition, getResizeHandle, selectionState,
    selectedFrameIds, frames, dragOffset, imageDimensions, onFrameUpdate, currentTool
  ]);

  const handleMouseUp = useCallback(() => {
    if (selectionState.isSelecting && selectionState.currentRect) {
      const rect = selectionState.currentRect;
      
      // Create new frame if rectangle is large enough
      if (rect.width >= 16 && rect.height >= 16) {
        const newFrame: Omit<FrameDefinition, 'id'> = {
          name: `Frame ${frames.length + 1}`,
          sourceRect: rect,
          outputRect: rect,
          transform: {
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            flipX: false,
            flipY: false
          },
          metadata: {
            isEmpty: false,
            hasTransparency: false,
            tags: []
          },
          animationProperties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        onFrameCreate(newFrame);
      }
    }

    // Reset selection state
    setSelectionState({
      isSelecting: false,
      startPoint: null,
      currentRect: null,
      resizeHandle: null
    });
    setDragOffset(null);
  }, [selectionState, frames.length, onFrameCreate]);

  // Tool handlers
  const handleDeleteSelected = useCallback(() => {
    selectedFrameIds.forEach(frameId => {
      onFrameDelete(frameId);
    });
    onSelectionChange([]);
  }, [selectedFrameIds, onFrameDelete, onSelectionChange]);



  // Update canvas size and scale
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 40;
    const maxHeight = 600;

    const scaleX = maxWidth / imageDimensions.width;
    const scaleY = maxHeight / imageDimensions.height;
    const newScale = Math.min(scaleX, scaleY, 1);

    const newCanvasSize = {
      width: imageDimensions.width * newScale,
      height: imageDimensions.height * newScale
    };

    setScale(newScale);
    setCanvasSize(newCanvasSize);
  }, [imageDimensions]);

  // Effects
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    updateCanvasSize();
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      drawCanvas();
    }
  }, [canvasSize, drawCanvas]);

  return (
    <div className={`frame-selection-tools ${className}`} ref={containerRef}>
      {/* Tool Bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button.Group>
            <Tooltip title="Select Tool">
              <Button
                type={currentTool === 'select' ? 'primary' : 'default'}
                icon={<SelectOutlined />}
                onClick={() => setCurrentTool('select')}
              />
            </Tooltip>
            <Tooltip title="Crop Tool">
              <Button
                type={currentTool === 'crop' ? 'primary' : 'default'}
                icon={<ScissorOutlined />}
                onClick={() => setCurrentTool('crop')}
                disabled={selectedFrameIds.length !== 1}
              />
            </Tooltip>
            <Tooltip title="Resize Tool">
              <Button
                type={currentTool === 'resize' ? 'primary' : 'default'}
                icon={<ExpandOutlined />}
                onClick={() => setCurrentTool('resize')}
                disabled={selectedFrameIds.length !== 1}
              />
            </Tooltip>
          </Button.Group>

          <Button.Group>
            <Tooltip title="Rotate Left">
              <Button
                icon={<RotateLeftOutlined />}
                disabled={selectedFrameIds.length === 0}
              />
            </Tooltip>
            <Tooltip title="Flip Horizontal">
              <Button
                icon={<SwapOutlined />}
                disabled={selectedFrameIds.length === 0}
              />
            </Tooltip>
          </Button.Group>

          <Button.Group>
            <Tooltip title="Undo">
              <Button icon={<UndoOutlined />} />
            </Tooltip>
            <Tooltip title="Redo">
              <Button icon={<RedoOutlined />} />
            </Tooltip>
          </Button.Group>

          <Space>
            <Text>Snap to pixels:</Text>
            <Switch
              checked={snapToPixels}
              onChange={setSnapToPixels}
              size="small"
            />
          </Space>

          <Space>
            <Text>Show handles:</Text>
            <Switch
              checked={showHandles}
              onChange={setShowHandles}
              size="small"
            />
          </Space>

          {selectedFrameIds.length > 0 && (
            <Button
              danger
              onClick={handleDeleteSelected}
            >
              Delete Selected ({selectedFrameIds.length})
            </Button>
          )}
        </Space>
      </Card>

      {/* Canvas */}
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
            border: '1px solid #ccc',
            backgroundColor: 'white'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setHoveredFrame(null)}
        />
      </div>
    </div>
  );
};
