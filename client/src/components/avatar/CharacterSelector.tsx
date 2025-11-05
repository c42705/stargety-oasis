/**
 * Character Selector Component
 * Allows users to view, select, create, and manage multiple character slots
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Modal, Input, message, Space, Typography, Badge, Popconfirm } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  UserOutlined 
} from '@ant-design/icons';
import {
  getAllSlotMetadata,
  getActiveSlot,
  switchToCharacterSlot,
  createNewCharacter,
  deleteCharacterSlot,
  loadCharacterSlot
} from './avatarSlotStorage';
import { CharacterSlotMetadata, DEFAULT_AVATAR_CONFIG, MAX_CHARACTER_SLOTS } from './avatarTypes';
import { composeAvatarDataUrl } from './composeAvatar';

const { Text } = Typography;

interface CharacterSelectorProps {
  username: string;
  onCharacterSwitch?: (slotNumber: number) => void;
  onCharacterEdit?: (slotNumber: number) => void;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  username,
  onCharacterSwitch,
  onCharacterEdit
}) => {
  const [slots, setSlots] = useState<CharacterSlotMetadata[]>([]);
  const [activeSlot, setActiveSlotState] = useState<number>(1);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [slotPreviews, setSlotPreviews] = useState<Map<number, string>>(new Map());

  // Load slots and active slot
  useEffect(() => {
    loadSlots();
  }, [username]);

  const loadSlots = () => {
    const metadata = getAllSlotMetadata(username);
    setSlots(metadata);
    setActiveSlotState(getActiveSlot(username));
    
    // Generate previews for non-empty slots
    metadata.forEach(async (slot) => {
      if (!slot.isEmpty) {
        const characterSlot = loadCharacterSlot(username, slot.slotNumber);
        if (characterSlot) {
          const previewUrl = await composeAvatarDataUrl(characterSlot.config);
          if (previewUrl) {
            setSlotPreviews(prev => new Map(prev).set(slot.slotNumber, previewUrl));
          }
        }
      }
    });
  };

  const handleSlotClick = (slotNumber: number, isEmpty: boolean) => {
    if (isEmpty) {
      // Open create modal for empty slot
      setCreateModalVisible(true);
    } else if (slotNumber !== activeSlot) {
      // Switch to this character
      const config = switchToCharacterSlot(username, slotNumber);
      if (config) {
        setActiveSlotState(slotNumber);
        message.success(`Switched to character slot ${slotNumber}`);
        onCharacterSwitch?.(slotNumber);
        
        // Trigger avatar update event for game
        window.dispatchEvent(new CustomEvent('avatarConfigUpdated', {
          detail: { username, config }
        }));
      }
    }
  };

  const handleCreateCharacter = () => {
    if (!newCharacterName.trim()) {
      message.error('Please enter a character name');
      return;
    }

    const slotNumber = createNewCharacter(username, newCharacterName.trim(), DEFAULT_AVATAR_CONFIG);
    
    if (slotNumber) {
      message.success(`Created character "${newCharacterName}" in slot ${slotNumber}`);
      setCreateModalVisible(false);
      setNewCharacterName('');
      loadSlots();
      
      // Optionally switch to the new character
      handleSlotClick(slotNumber, false);
    } else {
      message.error('Failed to create character. All slots may be full.');
    }
  };

  const handleDeleteCharacter = (slotNumber: number, slotName: string) => {
    if (deleteCharacterSlot(username, slotNumber)) {
      message.success(`Deleted character "${slotName}"`);
      loadSlots();
    } else {
      message.error('Failed to delete character');
    }
  };

  const handleEditCharacter = (slotNumber: number) => {
    onCharacterEdit?.(slotNumber);
  };

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>Character Slots ({slots.filter(s => !s.isEmpty).length}/{MAX_CHARACTER_SLOTS})</Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setCreateModalVisible(true)}
            disabled={slots.filter(s => !s.isEmpty).length >= MAX_CHARACTER_SLOTS}
          >
            New Character
          </Button>
        </div>

        <Row gutter={[12, 12]}>
          {slots.map((slot) => (
            <Col key={slot.slotNumber} xs={24} sm={12} md={8}>
              <Badge.Ribbon
                text={slot.slotNumber === activeSlot ? 'Active' : ''}
                color="green"
                style={{ display: slot.slotNumber === activeSlot ? 'block' : 'none' }}
              >
                <Card
                  hoverable={!slot.isEmpty}
                  size="small"
                  style={{
                    height: '100%',
                    borderColor: slot.slotNumber === activeSlot ? 'var(--color-primary)' : undefined,
                    borderWidth: slot.slotNumber === activeSlot ? 2 : 1,
                    backgroundColor: slot.isEmpty ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                    cursor: slot.isEmpty ? 'pointer' : 'pointer'
                  }}
                  onClick={() => handleSlotClick(slot.slotNumber, slot.isEmpty)}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {/* Preview */}
                    <div
                      style={{
                        width: '100%',
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}
                    >
                      {slot.isEmpty ? (
                        <PlusOutlined style={{ fontSize: 32, color: 'var(--color-text-secondary)' }} />
                      ) : slotPreviews.has(slot.slotNumber) ? (
                        <img
                          src={slotPreviews.get(slot.slotNumber)}
                          alt={slot.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            imageRendering: 'pixelated'
                          }}
                        />
                      ) : (
                        <UserOutlined style={{ fontSize: 32, color: 'var(--color-text-secondary)' }} />
                      )}
                    </div>

                    {/* Name and Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong={!slot.isEmpty} type={slot.isEmpty ? 'secondary' : undefined}>
                        {slot.isEmpty ? 'Empty Slot' : slot.name}
                      </Text>
                      
                      {!slot.isEmpty && (
                        <Space size="small">
                          {slot.slotNumber === activeSlot && (
                            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
                          )}
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCharacter(slot.slotNumber);
                            }}
                          />
                          <Popconfirm
                            title="Delete character?"
                            description={`Are you sure you want to delete "${slot.name}"?`}
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              handleDeleteCharacter(slot.slotNumber, slot.name);
                            }}
                            onCancel={(e) => e?.stopPropagation()}
                            okText="Delete"
                            cancelText="Cancel"
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                        </Space>
                      )}
                    </div>

                    {/* Metadata */}
                    {!slot.isEmpty && slot.updatedAt && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Updated: {new Date(slot.updatedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </Space>
                </Card>
              </Badge.Ribbon>
            </Col>
          ))}
        </Row>
      </Space>

      {/* Create Character Modal */}
      <Modal
        title="Create New Character"
        open={createModalVisible}
        onOk={handleCreateCharacter}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewCharacterName('');
        }}
        okText="Create"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>Enter a name for your new character:</Text>
          <Input
            placeholder="Character name"
            value={newCharacterName}
            onChange={(e) => setNewCharacterName(e.target.value)}
            onPressEnter={handleCreateCharacter}
            maxLength={30}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            You can customize your character's appearance after creation.
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

