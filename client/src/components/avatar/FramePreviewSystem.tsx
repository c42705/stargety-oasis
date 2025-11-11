import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Space, Typography, Button, Slider, Select, Badge, Tooltip, Row, Col } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StepForwardOutlined, 
  StepBackwardOutlined,
  ReloadOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { FrameDefinition, AnimationMapping } from './AvatarBuilderTypes';

const { Text } = Typography;
const { Option } = Select;

export interface FramePreviewSystemProps {
  frames: FrameDefinition[];
  selectedFrameIds: string[];
  animations: AnimationMapping[];
  imageData: string;
  onFrameSelect: (frameId: string) => void;
  onFrameRateChange?: (frameRate: number) => void; // Callback for framerate changes
  initialFrameRate?: number; // Initial framerate value
  className?: string;
}

interface PreviewState {
  isPlaying: boolean;
  currentFrameIndex: number;
  frameRate: number;
  selectedAnimation: string | null;
  loop: boolean;
  direction: 'forward' | 'backward' | 'pingpong';
}

/**
 * Real-time frame preview system with validation indicators
 */
export const FramePreviewSystem: React.FC<FramePreviewSystemProps> = ({
  frames,
  selectedFrameIds,
  animations,
  imageData,
  onFrameSelect,
  onFrameRateChange,
  initialFrameRate = 8,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const [previewState, setPreviewState] = useState<PreviewState>({
    isPlaying: false,
    currentFrameIndex: 0,
    frameRate: initialFrameRate, // Use initial framerate from props
    selectedAnimation: null,
    loop: true,
    direction: 'forward'
  });

  const [frameValidation, setFrameValidation] = useState<Map<string, {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }>>(new Map());

  // Get current frame sequence
  const getCurrentFrameSequence = useCallback((): FrameDefinition[] => {
    if (previewState.selectedAnimation) {
      const animation = animations.find(a => a.id === previewState.selectedAnimation);
      if (animation) {
        return animation.sequence.frameIds
          .map(id => frames.find(f => f.id === id))
          .filter(Boolean) as FrameDefinition[];
      }
    }
    
    // If no animation selected, use selected frames or all frames
    if (selectedFrameIds.length > 0) {
      return selectedFrameIds
        .map(id => frames.find(f => f.id === id))
        .filter(Boolean) as FrameDefinition[];
    }
    
    return frames;
  }, [previewState.selectedAnimation, animations, selectedFrameIds, frames]);

  // Validate frames
  const validateFrames = useCallback(() => {
    const validation = new Map();
    
    frames.forEach(frame => {
      const warnings: string[] = [];
      const errors: string[] = [];
      
      // Check frame dimensions
      if (frame.sourceRect.width < 16 || frame.sourceRect.height < 16) {
        warnings.push('Frame is very small (< 16px)');
      }
      
      if (frame.sourceRect.width > 512 || frame.sourceRect.height > 512) {
        warnings.push('Frame is very large (> 512px)');
      }
      
      // Check if frame is outside image bounds
      if (frame.sourceRect.x < 0 || frame.sourceRect.y < 0) {
        errors.push('Frame position is negative');
      }
      
      // Check for empty metadata
      if (frame.metadata.isEmpty) {
        warnings.push('Frame appears to be empty');
      }
      
      // Check animation assignment
      const hasAnimation = animations.some(anim => 
        anim.sequence.frameIds.includes(frame.id)
      );
      
      if (!hasAnimation) {
        warnings.push('Frame not assigned to any animation');
      }
      
      validation.set(frame.id, {
        isValid: errors.length === 0,
        warnings,
        errors
      });
    });
    
    setFrameValidation(validation);
  }, [frames, animations]);

  // Draw current frame
  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameSequence = getCurrentFrameSequence();
    if (frameSequence.length === 0) return;

    const currentFrame = frameSequence[previewState.currentFrameIndex % frameSequence.length];
    if (!currentFrame) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Load and draw source image
    const img = new Image();
    img.onload = () => {
      const { sourceRect } = currentFrame;
      
      // Calculate scale to fit canvas
      const scale = Math.min(
        canvas.width / sourceRect.width,
        canvas.height / sourceRect.height,
        1
      );
      
      const drawWidth = sourceRect.width * scale;
      const drawHeight = sourceRect.height * scale;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;

      // Apply transformations
      ctx.save();
      ctx.translate(drawX + drawWidth / 2, drawY + drawHeight / 2);
      
      if (currentFrame.transform.rotation !== 0) {
        ctx.rotate((currentFrame.transform.rotation * Math.PI) / 180);
      }
      
      ctx.scale(
        currentFrame.transform.scaleX * (currentFrame.transform.flipX ? -1 : 1),
        currentFrame.transform.scaleY * (currentFrame.transform.flipY ? -1 : 1)
      );

      // Draw frame
      ctx.drawImage(
        img,
        sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
      );
      
      ctx.restore();

      // Draw frame info
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, 30);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(
        `Frame ${previewState.currentFrameIndex + 1}/${frameSequence.length} - ${currentFrame.name || currentFrame.id}`,
        10, 20
      );

      // Draw validation indicator
      const validation = frameValidation.get(currentFrame.id);
      if (validation) {
        const indicatorX = canvas.width - 30;
        const indicatorY = 10;
        
        if (!validation.isValid) {
          ctx.fillStyle = '#ff4d4f';
          ctx.fillRect(indicatorX, indicatorY, 20, 10);
          ctx.fillStyle = 'white';
          ctx.fillText('!', indicatorX + 8, indicatorY + 8);
        } else if (validation.warnings.length > 0) {
          ctx.fillStyle = '#faad14';
          ctx.fillRect(indicatorX, indicatorY, 20, 10);
          ctx.fillStyle = 'white';
          ctx.fillText('⚠', indicatorX + 6, indicatorY + 8);
        } else {
          ctx.fillStyle = '#52c41a';
          ctx.fillRect(indicatorX, indicatorY, 20, 10);
          ctx.fillStyle = 'white';
          ctx.fillText('✓', indicatorX + 6, indicatorY + 8);
        }
      }
    };
    img.src = imageData;
  }, [getCurrentFrameSequence, previewState.currentFrameIndex, frameValidation, imageData]);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!previewState.isPlaying) return;

    const frameSequence = getCurrentFrameSequence();
    if (frameSequence.length === 0) return;

    const frameDuration = 1000 / previewState.frameRate;
    
    if (timestamp - lastFrameTimeRef.current >= frameDuration) {
      setPreviewState(prev => {
        let nextIndex = prev.currentFrameIndex;
        
        if (prev.direction === 'forward') {
          nextIndex = (nextIndex + 1) % frameSequence.length;
        } else if (prev.direction === 'backward') {
          nextIndex = nextIndex === 0 ? frameSequence.length - 1 : nextIndex - 1;
        } else if (prev.direction === 'pingpong') {
          // Implement ping-pong logic
          const isForward = Math.floor(nextIndex / frameSequence.length) % 2 === 0;
          if (isForward) {
            nextIndex = nextIndex + 1;
            if (nextIndex >= frameSequence.length) {
              nextIndex = frameSequence.length - 2;
            }
          } else {
            nextIndex = nextIndex - 1;
            if (nextIndex < 0) {
              nextIndex = 1;
            }
          }
        }
        
        if (!prev.loop && nextIndex === 0 && prev.currentFrameIndex === frameSequence.length - 1) {
          return { ...prev, isPlaying: false };
        }
        
        return { ...prev, currentFrameIndex: nextIndex };
      });
      
      lastFrameTimeRef.current = timestamp;
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [previewState.isPlaying, previewState.frameRate, getCurrentFrameSequence]);

  // Control functions
  const play = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    setPreviewState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentFrameIndex: 0 
    }));
  }, []);

  const nextFrame = useCallback(() => {
    const frameSequence = getCurrentFrameSequence();
    setPreviewState(prev => ({
      ...prev,
      currentFrameIndex: (prev.currentFrameIndex + 1) % frameSequence.length
    }));
  }, [getCurrentFrameSequence]);

  const previousFrame = useCallback(() => {
    const frameSequence = getCurrentFrameSequence();
    setPreviewState(prev => ({
      ...prev,
      currentFrameIndex: prev.currentFrameIndex === 0 
        ? frameSequence.length - 1 
        : prev.currentFrameIndex - 1
    }));
  }, [getCurrentFrameSequence]);

  // Effects
  useEffect(() => {
    if (previewState.isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [previewState.isPlaying, animate]);

  useEffect(() => {
    drawCurrentFrame();
  }, [drawCurrentFrame]);

  useEffect(() => {
    validateFrames();
  }, [validateFrames]);

  // Get current frame for details
  const frameSequence = getCurrentFrameSequence();
  const currentFrame = frameSequence[previewState.currentFrameIndex % frameSequence.length];
  const currentValidation = currentFrame ? frameValidation.get(currentFrame.id) : null;

  return (
    <div className={`frame-preview-system ${className}`}>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="Frame Preview" size="small">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                style={{ 
                  border: '1px solid #d9d9d9',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4
                }}
              />
            </div>

            {/* Playback Controls */}
            <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
              <Button.Group>
                <Button
                  icon={<StepBackwardOutlined />}
                  onClick={previousFrame}
                  disabled={frameSequence.length === 0}
                />
                <Button
                  icon={previewState.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={previewState.isPlaying ? pause : play}
                  disabled={frameSequence.length === 0}
                  type="primary"
                />
                <Button
                  icon={<StepForwardOutlined />}
                  onClick={nextFrame}
                  disabled={frameSequence.length === 0}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={stop}
                  disabled={frameSequence.length === 0}
                />
              </Button.Group>
            </Space>

            {/* Frame Rate Control */}
            <div style={{ marginTop: 16 }}>
              <Text>Frame Rate: {previewState.frameRate} FPS</Text>
              <Slider
                min={1}
                max={30}
                value={previewState.frameRate}
                onChange={(value) => {
                  setPreviewState(prev => ({ ...prev, frameRate: value }));
                  onFrameRateChange?.(value); // Notify parent of framerate change
                }}
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                This framerate will be used for all walk animations in-game
              </Text>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* Animation Selection */}
            <Card title="Animation" size="small">
              <Select
                placeholder="Select animation to preview"
                value={previewState.selectedAnimation}
                onChange={(value) => setPreviewState(prev => ({ 
                  ...prev, 
                  selectedAnimation: value,
                  currentFrameIndex: 0
                }))}
                style={{ width: '100%' }}
                allowClear
              >
                {animations.map(animation => (
                  <Option key={animation.id} value={animation.id}>
                    {animation.name} ({animation.sequence.frameIds.length} frames)
                  </Option>
                ))}
              </Select>
            </Card>

            {/* Frame Details */}
            {currentFrame && (
              <Card title="Frame Details" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Name:</Text> {currentFrame.name || 'Unnamed'}
                  </div>
                  <div>
                    <Text strong>Size:</Text> {currentFrame.sourceRect.width}×{currentFrame.sourceRect.height}
                  </div>
                  <div>
                    <Text strong>Position:</Text> ({currentFrame.sourceRect.x}, {currentFrame.sourceRect.y})
                  </div>
                  
                  {/* Validation Status */}
                  {currentValidation && (
                    <div>
                      <Text strong>Status:</Text>{' '}
                      {!currentValidation.isValid ? (
                        <Badge status="error" text="Invalid" />
                      ) : currentValidation.warnings.length > 0 ? (
                        <Badge status="warning" text="Warnings" />
                      ) : (
                        <Badge status="success" text="Valid" />
                      )}
                    </div>
                  )}

                  {/* Validation Messages */}
                  {currentValidation && (currentValidation.errors.length > 0 || currentValidation.warnings.length > 0) && (
                    <div>
                      {currentValidation.errors.map((error, index) => (
                        <div key={`error-${index}`} style={{ color: '#ff4d4f', fontSize: '12px' }}>
                          <WarningOutlined /> {error}
                        </div>
                      ))}
                      {currentValidation.warnings.map((warning, index) => (
                        <div key={`warning-${index}`} style={{ color: '#faad14', fontSize: '12px' }}>
                          <EyeOutlined /> {warning}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    size="small"
                    onClick={() => onFrameSelect(currentFrame.id)}
                    style={{ width: '100%' }}
                  >
                    Select This Frame
                  </Button>
                </Space>
              </Card>
            )}

            {/* Frame List */}
            <Card title={`Frames (${frameSequence.length})`} size="small">
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {frameSequence.map((frame, index) => {
                  const validation = frameValidation.get(frame.id);
                  const isActive = index === previewState.currentFrameIndex;
                  
                  return (
                    <div
                      key={frame.id}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: isActive ? '#e6f7ff' : 'transparent',
                        border: isActive ? '1px solid #1890ff' : '1px solid transparent',
                        borderRadius: 4,
                        marginBottom: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => setPreviewState(prev => ({ ...prev, currentFrameIndex: index }))}
                    >
                      <Text style={{ fontSize: '12px' }}>
                        {index + 1}. {frame.name || frame.id.slice(0, 8)}
                      </Text>
                      
                      {validation && (
                        <Tooltip title={
                          validation.errors.length > 0 
                            ? validation.errors.join(', ')
                            : validation.warnings.join(', ')
                        }>
                          {!validation.isValid ? (
                            <WarningOutlined style={{ color: '#ff4d4f' }} />
                          ) : validation.warnings.length > 0 ? (
                            <EyeOutlined style={{ color: '#faad14' }} />
                          ) : (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          )}
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};
