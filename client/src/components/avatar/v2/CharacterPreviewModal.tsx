/**
 * Character Preview Modal
 * Shows character preview with idle animation before switching
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Space, Typography, Descriptions, Tag, Alert, Slider, InputNumber, message } from 'antd';
import { PlayCircleOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { CharacterSlot } from './types';
import { CharacterStorage } from './CharacterStorage';

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

  /** Callback when character is updated (optional) */
  onCharacterUpdate?: (character: CharacterSlot) => void;
}

/**
 * Character Preview Modal Component
 */
export const CharacterPreviewModal: React.FC<CharacterPreviewModalProps> = ({
  character,
  visible,
  onConfirm,
  onCancel,
  onCharacterUpdate
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditingFrameRate, setIsEditingFrameRate] = useState(false);
  const [editedFrameRate, setEditedFrameRate] = useState<number>(8);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAnimationId, setEditingAnimationId] = useState<string | null>(null);
  const [editedAnimationFrameRate, setEditedAnimationFrameRate] = useState<number>(8);
  const [selectedAnimationId, setSelectedAnimationId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  /**
   * Initialize edited framerate and selected animation when character changes
   */
  useEffect(() => {
    if (character) {
      setEditedFrameRate(character.spriteSheet.defaultSettings.frameRate);
      setIsEditingFrameRate(false);

      // Set default selected animation to IDLE
      const idleAnimation = character.spriteSheet.animations.find(
        anim => anim.category === 'idle' || anim.name.toLowerCase().includes('idle')
      );
      setSelectedAnimationId(idleAnimation?.id || character.spriteSheet.animations[0]?.id || null);
    }
  }, [character]);


  
  /**
   * Load sprite sheet image and start animation with real-time framerate updates
   */
  useEffect(() => {
    if (!character || !visible || !canvasRef.current || !selectedAnimationId) {
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
      let lastFrameTime = Date.now();

      const animate = () => {
        // Find the selected animation (may have been updated)
        const selectedAnimation = character.spriteSheet.animations.find(
          anim => anim.id === selectedAnimationId
        );

        if (!selectedAnimation) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        // Use edited framerate if this animation is being edited, otherwise use saved framerate
        const isEditingThisAnim = editingAnimationId === selectedAnimationId;
        const frameRate = isEditingThisAnim ? editedAnimationFrameRate : selectedAnimation.sequence.frameRate;
        const frameIds = selectedAnimation.sequence.frameIds || [];
        const frameDelay = 1000 / frameRate;

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
  }, [character, visible, selectedAnimationId, editingAnimationId, editedAnimationFrameRate]);
  
  /**
   * Save updated framerate (for all animations)
   */
  const handleSaveFrameRate = useCallback(async () => {
    if (!character) return;

    setIsSaving(true);

    try {
      // Update character's sprite sheet with new framerate
      const updatedCharacter: CharacterSlot = {
        ...character,
        spriteSheet: {
          ...character.spriteSheet,
          defaultSettings: {
            ...character.spriteSheet.defaultSettings,
            frameRate: editedFrameRate
          },
          animations: character.spriteSheet.animations.map(anim => ({
            ...anim,
            sequence: {
              ...anim.sequence,
              frameRate: editedFrameRate // Update all animations to use new framerate
            }
          }))
        },
        updatedAt: new Date().toISOString()
      };

      // Save to storage
      const result = CharacterStorage.saveCharacterSlot(character.username, updatedCharacter);

      if (result.success) {
        message.success(`Framerate updated to ${editedFrameRate} FPS!`);
        setIsEditingFrameRate(false);

        // Notify parent to reload the character
        if (onCharacterUpdate) {
          onCharacterUpdate(updatedCharacter);
        }
      } else {
        message.error(result.error || 'Failed to save framerate');
      }
    } catch (error) {
      message.error('Failed to save framerate: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [character, editedFrameRate, onCharacterUpdate]);

  /**
   * Save updated framerate for a specific animation
   */
  const handleSaveAnimationFrameRate = useCallback(async (animationId: string) => {
    if (!character) return;

    setIsSaving(true);

    try {
      // Update only the specific animation's framerate
      const updatedCharacter: CharacterSlot = {
        ...character,
        spriteSheet: {
          ...character.spriteSheet,
          animations: character.spriteSheet.animations.map(anim =>
            anim.id === animationId
              ? {
                  ...anim,
                  sequence: {
                    ...anim.sequence,
                    frameRate: editedAnimationFrameRate
                  }
                }
              : anim
          )
        },
        updatedAt: new Date().toISOString()
      };

      // Save to storage
      const result = CharacterStorage.saveCharacterSlot(character.username, updatedCharacter);

      if (result.success) {
        const animName = character.spriteSheet.animations.find(a => a.id === animationId)?.name || 'Animation';
        message.success(`${animName} framerate updated to ${editedAnimationFrameRate} FPS!`);
        setEditingAnimationId(null);

        // Notify parent to reload the character
        if (onCharacterUpdate) {
          onCharacterUpdate(updatedCharacter);
        }
      } else {
        message.error(result.error || 'Failed to save framerate');
      }
    } catch (error) {
      message.error('Failed to save framerate: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [character, editedAnimationFrameRate, onCharacterUpdate]);

  if (!character) {
    return null;
  }

  /**
   * Get animation list
   */
  const animationList = character.spriteSheet.animations.map(anim => anim.name);
  

  
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
        >
          Switch to This Character
        </Button>
      ]}
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Sprite Sheet Info */}
        <div>
          <Title level={5}>Sprite Sheet Details</Title>
          <Paragraph type="secondary">
            {character.spriteSheet.description || 'No description available'}
          </Paragraph>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Version">{character.spriteSheet.version}</Descriptions.Item>
            <Descriptions.Item label="Created By">{character.spriteSheet.createdBy}</Descriptions.Item>
            {character.spriteSheet.source && (
              <>
                <Descriptions.Item label="Source File">
                  {character.spriteSheet.source.name}
                </Descriptions.Item>
                <Descriptions.Item label="File Size">
                  {(character.spriteSheet.source.fileSize / 1024).toFixed(2)} KB
                </Descriptions.Item>
                <Descriptions.Item label="Dimensions" span={2}>
                  {character.spriteSheet.source.originalDimensions.width} × {character.spriteSheet.source.originalDimensions.height} px
                </Descriptions.Item>
              </>
            )}
            {character.spriteSheet.gridLayout && (
              <>
                <Descriptions.Item label="Grid Layout" span={2}>
                  {character.spriteSheet.gridLayout.columns} × {character.spriteSheet.gridLayout.rows}
                  {' '}({character.spriteSheet.gridLayout.frameWidth} × {character.spriteSheet.gridLayout.frameHeight} px per frame)
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </div>
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
            <Descriptions.Item label="Default Frame Rate">
              <Space>
                <Tag color="blue">{character.spriteSheet.defaultSettings.frameRate} FPS</Tag>
                {!isEditingFrameRate && (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setIsEditingFrameRate(true)}
                  >
                    Edit
                  </Button>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {character.updatedAt ? new Date(character.updatedAt).toLocaleDateString() : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* Framerate Editor */}
        {isEditingFrameRate && (
          <Alert
            message="Edit Animation Framerate"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>
                  Adjust the framerate for all animations. This will update the default framerate
                  and apply it to all animation categories (IDLE, WALK_DOWN, WALK_UP, etc.).
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Slider
                    min={1}
                    max={30}
                    value={editedFrameRate}
                    onChange={(value) => setEditedFrameRate(value || 8)}
                    style={{ flex: 1 }}
                    marks={{
                      1: '1',
                      8: '8',
                      15: '15',
                      24: '24',
                      30: '30'
                    }}
                  />
                  <InputNumber
                    min={1}
                    max={30}
                    value={editedFrameRate}
                    onChange={(value) => setEditedFrameRate(value || 8)}
                    addonAfter="FPS"
                    style={{ width: 100 }}
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveFrameRate}
                    loading={isSaving}
                  >
                    Save Framerate
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditingFrameRate(false);
                      setEditedFrameRate(character.spriteSheet.defaultSettings.frameRate);
                    }}
                  >
                    Cancel
                  </Button>
                </Space>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        {/* Animation Preview */}
        <div>
          <Title level={5}>
            {(() => {
              const selectedAnim = character.spriteSheet.animations.find(a => a.id === selectedAnimationId);
              return selectedAnim ? `${selectedAnim.name} Preview` : 'Animation Preview';
            })()}
          </Title>
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
          {isAnimating && selectedAnimationId && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary">
                {(() => {
                  const selectedAnim = character.spriteSheet.animations.find(a => a.id === selectedAnimationId);
                  const isEditingThisAnim = editingAnimationId === selectedAnimationId;
                  const currentFrameRate = isEditingThisAnim ? editedAnimationFrameRate : selectedAnim?.sequence.frameRate || 8;
                  return `Playing at ${currentFrameRate} FPS${isEditingThisAnim ? ' (preview - not saved)' : ''}`;
                })()}
              </Text>
            </div>
          )}
        </div>
        
        {/* Available Animations */}
        <div>
          <Title level={5}>Available Animations (Click to Preview)</Title>
          <Descriptions size="small" column={1} bordered>
            {character.spriteSheet.animations.map(anim => {
              const isEditingThisAnim = editingAnimationId === anim.id;
              const isSelectedForPreview = selectedAnimationId === anim.id;

              return (
                <Descriptions.Item
                  key={anim.id}
                  label={
                    <Space>
                      <Tag color="blue">{anim.category}</Tag>
                      <Text>{anim.name}</Text>
                      {isSelectedForPreview && <Tag color="green">Previewing</Tag>}
                    </Space>
                  }
                  style={{
                    backgroundColor: isSelectedForPreview ? '#ffffff60' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div
                    onClick={() => {
                      if (!isEditingThisAnim) {
                        setSelectedAnimationId(anim.id);
                      }
                    }}
                    style={{
                      cursor: isEditingThisAnim ? 'default' : 'pointer',
                      width: '100%'
                    }}
                  >
                    {isEditingThisAnim ? (
                      // Edit mode for this animation
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <Text type="secondary">Frames: {anim.sequence.frameIds.length}</Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{anim.sequence.loop ? 'Loop' : 'Once'}</Text>
                          {anim.sequence.pingPong && (
                            <>
                              <Text type="secondary">•</Text>
                              <Tag color="purple">Ping-Pong</Tag>
                            </>
                          )}
                        </Space>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Slider
                            min={1}
                            max={30}
                            value={editedAnimationFrameRate}
                            onChange={(value) => setEditedAnimationFrameRate(value)}
                            style={{ flex: 1, minWidth: 150 }}
                          />
                          <InputNumber
                            min={1}
                            max={30}
                            value={editedAnimationFrameRate}
                            onChange={(value) => setEditedAnimationFrameRate(value || 8)}
                            addonAfter="FPS"
                            size="small"
                            style={{ width: 90 }}
                          />
                          <Button
                            type="primary"
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveAnimationFrameRate(anim.id);
                            }}
                            loading={isSaving}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAnimationId(null);
                              setEditedAnimationFrameRate(anim.sequence.frameRate);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </Space>
                    ) : (
                      // Display mode
                      <Space>
                        <Text type="secondary">Frames: {anim.sequence.frameIds.length}</Text>
                        <Text type="secondary">•</Text>
                        <Text strong>{anim.sequence.frameRate} FPS</Text>
                        <Text type="secondary">•</Text>
                        <Text type="secondary">{anim.sequence.loop ? 'Loop' : 'Once'}</Text>
                        {anim.sequence.pingPong && (
                          <>
                            <Text type="secondary">•</Text>
                            <Tag color="purple">Ping-Pong</Tag>
                          </>
                        )}
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAnimationId(anim.id);
                            setEditedAnimationFrameRate(anim.sequence.frameRate);
                          }}
                        >
                          Edit FPS
                        </Button>
                      </Space>
                    )}
                  </div>
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        </div>
    
      </Space>
    </Modal>
  );
};

