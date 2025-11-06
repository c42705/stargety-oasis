/**
 * Character Preview Modal
 * Shows character preview with idle animation before switching
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space, Typography, Descriptions, Tag, Alert, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { CharacterSlot } from './types';
import { SpriteSheetValidator } from './SpriteSheetValidator';

const { Title, Text, Paragraph } = Typography;

export interface CharacterPreviewModalProps {
  /** Character to preview */
  character: CharacterSlot | null;
  
  /** Whether modal is visible */
  visible: boolean;
  
  /** Callback when user confirms switch */
  onConfirm: () => void;
  
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Character Preview Modal Component
 */
export const CharacterPreviewModal: React.FC<CharacterPreviewModalProps> = ({
  character,
  visible,
  onConfirm,
  onCancel
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  /**
   * Validate character sprite sheet
   */
  useEffect(() => {
    if (!character || !visible) {
      setValidationResult(null);
      return;
    }
    
    setIsValidating(true);
    
    // Validate sprite sheet
    const validation = SpriteSheetValidator.validate(character.spriteSheet);
    
    setValidationResult({
      isValid: validation.isValid,
      errors: validation.errors.map(e => e.message),
      warnings: validation.warnings.map(w => w.message)
    });
    
    setIsValidating(false);
  }, [character, visible]);
  
  /**
   * Load sprite sheet image and start animation
   */
  useEffect(() => {
    if (!character || !visible || !canvasRef.current) {
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Load sprite sheet image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      imageRef.current = img;
      setIsAnimating(true);

      // Start animation loop
      let frameIndex = 0;
      // Find idle animation from animations array
      const idleAnimation = character.spriteSheet.animations.find(
        anim => anim.category === 'idle' || anim.name.toLowerCase().includes('idle')
      );
      const frameRate = idleAnimation?.sequence.frameRate || 8;
      const frameIds = idleAnimation?.sequence.frameIds || [];
      const frameDelay = 1000 / frameRate;
      let lastFrameTime = Date.now();

      const animate = () => {
        const now = Date.now();

        if (now - lastFrameTime >= frameDelay) {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Get current frame ID
          const currentFrameId = frameIds[frameIndex % frameIds.length];
          // Find frame definition
          const frameDef = character.spriteSheet.frames.find(f => f.id === currentFrameId);

          if (frameDef) {
            const { sourceRect } = frameDef;

            // Draw frame centered and scaled
            const scale = Math.min(
              canvas.width / sourceRect.width,
              canvas.height / sourceRect.height
            ) * 0.8; // 80% of available space

            const scaledWidth = sourceRect.width * scale;
            const scaledHeight = sourceRect.height * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;

            ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering
            ctx.drawImage(
              img,
              sourceRect.x,
              sourceRect.y,
              sourceRect.width,
              sourceRect.height,
              x,
              y,
              scaledWidth,
              scaledHeight
            );
          }

          frameIndex++;
          lastFrameTime = now;
        }
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animate();
    };
    
    img.onerror = () => {
      setIsAnimating(false);
      console.error('Failed to load sprite sheet image');
    };

    img.src = character.spriteSheet.source.imageData;
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsAnimating(false);
    };
  }, [character, visible]);
  
  if (!character) {
    return null;
  }
  
  /**
   * Get animation list
   */
  const animationList = character.spriteSheet.animations.map(anim => anim.name);
  
  /**
   * Render validation status
   */
  const renderValidationStatus = () => {
    if (isValidating) {
      return <Spin size="small" />;
    }
    
    if (!validationResult) {
      return null;
    }
    
    if (validationResult.isValid) {
      return (
        <Alert
          message="Character Valid"
          description="This character passed all validation checks and is ready to use."
          type="success"
          icon={<CheckCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }
    
    return (
      <Alert
        message="Validation Issues"
        description={
          <div>
            {validationResult.errors.length > 0 && (
              <div>
                <Text strong>Errors:</Text>
                <ul style={{ marginBottom: 8 }}>
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationResult.warnings.length > 0 && (
              <div>
                <Text strong>Warnings:</Text>
                <ul>
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        }
        type={validationResult.errors.length > 0 ? 'error' : 'warning'}
        icon={<CloseCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  };
  
  return (
    <Modal
      title={
        <Space>
          <PlayCircleOutlined />
          Character Preview
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={onConfirm}
          disabled={validationResult ? !validationResult.isValid : true}
        >
          Switch to This Character
        </Button>
      ]}
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Validation Status */}
        {renderValidationStatus()}
        
        {/* Character Info */}
        <div>
          <Title level={4}>{character.name}</Title>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Slot">{character.slotNumber}</Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(character.createdAt).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="Frame Count">
              {character.spriteSheet.frames.length}
            </Descriptions.Item>
            <Descriptions.Item label="Animations">
              {animationList.length}
            </Descriptions.Item>
          </Descriptions>
        </div>
        
        {/* Animation Preview */}
        <div>
          <Title level={5}>Idle Animation Preview</Title>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f0f0f0',
              border: '2px solid #d9d9d9',
              borderRadius: 8,
              padding: 16,
              minHeight: 200
            }}
          >
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              style={{
                imageRendering: 'pixelated',
                border: '1px solid #d9d9d9',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
          {isAnimating && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
              Animation playing...
            </Text>
          )}
        </div>
        
        {/* Available Animations */}
        <div>
          <Title level={5}>Available Animations</Title>
          <Space wrap>
            {animationList.map(animName => (
              <Tag key={animName} color="blue">
                {animName}
              </Tag>
            ))}
          </Space>
        </div>
        
        {/* Sprite Sheet Info */}
        <div>
          <Title level={5}>Sprite Sheet Details</Title>
          <Paragraph type="secondary">
            {character.spriteSheet.description || 'No description available'}
          </Paragraph>
          <Descriptions size="small" bordered>
            <Descriptions.Item label="Version">{character.spriteSheet.version}</Descriptions.Item>
            <Descriptions.Item label="Created By">{character.spriteSheet.createdBy}</Descriptions.Item>
          </Descriptions>
        </div>
      </Space>
    </Modal>
  );
};

