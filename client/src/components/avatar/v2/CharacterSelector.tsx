import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Typography, Badge, Modal, message, Spin, Popconfirm, Row, Col } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { CharacterStorage } from './CharacterStorage';
import { AvatarBuilderIntegration } from './AvatarBuilderIntegration';
import { CharacterPreviewModal } from './CharacterPreviewModal';
import {
  CharacterSlot,
  EmptyCharacterSlot,
  CharacterSlotSummary,
  CharacterSelectorProps,
  isEmptySlot,
  AVATAR_SYSTEM_CONSTANTS
} from './types';

const { Title, Text } = Typography;

/**
 * Character Slot Card Component
 * Displays a single character slot with thumbnail and actions
 */
interface CharacterSlotCardProps {
  slot: CharacterSlotSummary;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreate: () => void;
  disabled?: boolean;
}

const CharacterSlotCard: React.FC<CharacterSlotCardProps> = ({
  slot,
  onSwitch,
  onEdit,
  onDelete,
  onCreate,
  disabled
}) => {
  const isEmpty = slot.isEmpty;
  const isActive = slot.isActive;

  const handleCardClick = () => {
    if (disabled) return;
    if (isEmpty) {
      onCreate();
    } else if (!isActive) {
      onSwitch();
    }
  };

  return (
    <Badge.Ribbon
      text={isActive ? 'Active' : ''}
      color="green"
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <Card
        hoverable={!isEmpty}
        size="small"
        style={{
          height: '100%',
          borderColor: isActive ? 'var(--color-primary)' : undefined,
          borderWidth: isActive ? 2 : 1,
          backgroundColor: isEmpty ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
          cursor: isEmpty ? 'pointer' : 'pointer',
          opacity: disabled ? 0.6 : 1
        }}
        onClick={handleCardClick}
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
            {isEmpty ? (
              <PlusOutlined style={{ fontSize: 32, color: 'var(--color-text-secondary)' }} />
            ) : slot.thumbnailUrl ? (
              <img
                src={slot.thumbnailUrl}
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
            <Text strong={!isEmpty} type={isEmpty ? 'secondary' : undefined}>
              {isEmpty ? 'Empty Slot' : slot.name}
            </Text>

            {!isEmpty && (
              <Space size="small">
                {isActive && (
                  <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  disabled={disabled}
                />
                <Popconfirm
                  title="Delete character?"
                  description={`Are you sure you want to delete "${slot.name}"?`}
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    onDelete();
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
                    disabled={disabled}
                  />
                </Popconfirm>
              </Space>
            )}
          </div>

          {/* Metadata */}
          {!isEmpty && slot.lastUsed && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Last used: {new Date(slot.lastUsed).toLocaleDateString()}
            </Text>
          )}
        </Space>
      </Card>
    </Badge.Ribbon>
  );
};

/**
 * Character Selector Component
 * Main component for managing character slots
 */
export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  username,
  onCharacterSwitch,
  onCharacterEdit,
  onCharacterDelete,
  onCharacterCreate,
  className,
  disabled = false
}) => {
  const [slots, setSlots] = useState<CharacterSlotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [existingCharacter, setExistingCharacter] = useState<CharacterSlot | EmptyCharacterSlot | undefined>();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCharacter, setPreviewCharacter] = useState<CharacterSlot | null>(null);

  /**
   * Load character slots (async - API first, localStorage fallback)
   */
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      // Try async API-first loading
      const result = await CharacterStorage.listCharacterSlotsAsync(username);

      if (result.success && result.data) {
        setSlots(result.data);
      } else {
        message.error(result.error || 'Failed to load character slots');
      }
    } catch (error) {
      // Fallback to sync localStorage
      const result = CharacterStorage.listCharacterSlots(username);
      if (result.success && result.data) {
        setSlots(result.data);
      } else {
        message.error(result.error || 'Failed to load character slots');
      }
    }
    setLoading(false);
  }, [username]);

  // Load slots on mount
  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  /**
   * Handle character switch - show preview first (async - API first)
   */
  const handleSwitch = useCallback(async (slotNumber: number) => {
    try {
      // Try async API-first loading
      const result = await CharacterStorage.loadCharacterSlotAsync(username, slotNumber);

      if (result.success && result.data && !isEmptySlot(result.data)) {
        setPreviewCharacter(result.data);
        setIsPreviewOpen(true);
      } else {
        message.error(result.error || 'Failed to load character for preview');
      }
    } catch (error) {
      // Fallback to sync localStorage
      const result = CharacterStorage.loadCharacterSlot(username, slotNumber);
      if (result.success && result.data && !isEmptySlot(result.data)) {
        setPreviewCharacter(result.data);
        setIsPreviewOpen(true);
      } else {
        message.error(result.error || 'Failed to load character for preview');
      }
    }
  }, [username]);

  /**
   * Confirm character switch after preview
   */
  const handleConfirmSwitch = useCallback(() => {
    console.log('[CharacterSelector] 🔵 handleConfirmSwitch called');

    if (!previewCharacter) {
      console.log('[CharacterSelector] ❌ No preview character');
      return;
    }

    console.log('[CharacterSelector] Preview character:', {
      name: previewCharacter.name,
      slotNumber: previewCharacter.slotNumber,
      username: previewCharacter.username
    });

    const result = CharacterStorage.setActiveCharacter(username, previewCharacter.slotNumber);
    console.log('[CharacterSelector] setActiveCharacter result:', result);

    if (result.success) {
      message.success(`Switched to ${previewCharacter.name}`);
      setIsPreviewOpen(false);
      setPreviewCharacter(null);
      loadSlots(); // Reload to update active indicator

      console.log('[CharacterSelector] 🔵 About to call onCharacterSwitch callback');
      if (onCharacterSwitch) {
        console.log('[CharacterSelector] ✅ Calling onCharacterSwitch with slot:', previewCharacter.slotNumber);
        onCharacterSwitch(previewCharacter.slotNumber);
      } else {
        console.warn('[CharacterSelector] ⚠️ onCharacterSwitch callback is undefined!');
      }
    } else {
      console.error('[CharacterSelector] ❌ Failed to set active character:', result.error);
      message.error(result.error || 'Failed to switch character');
    }
  }, [username, previewCharacter, loadSlots, onCharacterSwitch]);

  /**
   * Cancel character switch preview
   */
  const handleCancelPreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewCharacter(null);
  }, []);

  /**
   * Handle character update from preview modal
   */
  const handleCharacterUpdate = useCallback((updatedCharacter: CharacterSlot) => {
    // Update the preview character state with the new data
    setPreviewCharacter(updatedCharacter);
    // Reload slots to update the card display
    loadSlots();
  }, [loadSlots]);

  /**
   * Handle create character
   */
  const handleCreate = useCallback((slotNumber: number) => {
    setSelectedSlot(slotNumber);
    setExistingCharacter(undefined);
    setIsBuilderOpen(true);
    
    if (onCharacterCreate) {
      onCharacterCreate(slotNumber);
    }
  }, [onCharacterCreate]);

  /**
   * Handle edit character
   */
  const handleEdit = useCallback((slotNumber: number) => {
    const result = CharacterStorage.loadCharacterSlot(username, slotNumber);
    
    if (result.success && result.data) {
      setSelectedSlot(slotNumber);
      setExistingCharacter(result.data);
      setIsBuilderOpen(true);
      
      if (onCharacterEdit) {
        onCharacterEdit(slotNumber);
      }
    } else {
      message.error(result.error || 'Failed to load character for editing');
    }
  }, [username, onCharacterEdit]);

  /**
   * Handle delete character
   */
  const handleDelete = useCallback((slotNumber: number, characterName: string) => {
    Modal.confirm({
      title: 'Delete Character',
      content: `Are you sure you want to delete "${characterName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        const result = CharacterStorage.deleteCharacterSlot(username, slotNumber);
        
        if (result.success) {
          message.success(`Character "${characterName}" deleted`);
          loadSlots(); // Reload slots
          
          if (onCharacterDelete) {
            onCharacterDelete(slotNumber);
          }
        } else {
          message.error(result.error || 'Failed to delete character');
        }
      }
    });
  }, [username, loadSlots, onCharacterDelete]);

  /**
   * Handle Avatar Builder save
   */
  const handleBuilderSave = useCallback((character: CharacterSlot) => {
    console.log('[CharacterSelector] Character saved:', character);
    setIsBuilderOpen(false);
    setSelectedSlot(null);
    setExistingCharacter(undefined);
    loadSlots(); // Reload slots to show new/updated character

    // Notify that character was switched (since we auto-set it as active)
    console.log('[CharacterSelector] Calling onCharacterSwitch with slot:', character.slotNumber);
    if (onCharacterSwitch) {
      onCharacterSwitch(character.slotNumber);
    } else {
      console.warn('[CharacterSelector] onCharacterSwitch callback is not defined!');
    }
  }, [loadSlots, onCharacterSwitch]);

  /**
   * Handle Avatar Builder cancel
   */
  const handleBuilderCancel = useCallback(() => {
    setIsBuilderOpen(false);
    setSelectedSlot(null);
    setExistingCharacter(undefined);
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading characters...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Title level={4}>Character Slots</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Manage your character slots. You can have up to {AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS} characters.
      </Text>

      {/* Character Slots Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {slots.map(slot => (
          <Col key={slot.slotNumber} xs={24} sm={12} md={8}>
            <CharacterSlotCard
              slot={slot}
              onSwitch={() => handleSwitch(slot.slotNumber)}
              onEdit={() => handleEdit(slot.slotNumber)}
              onDelete={() => handleDelete(slot.slotNumber, slot.name)}
              onCreate={() => handleCreate(slot.slotNumber)}
              disabled={disabled}
            />
          </Col>
        ))}
      </Row>

      {/* Avatar Builder Integration */}
      {isBuilderOpen && selectedSlot !== null && (
        <AvatarBuilderIntegration
          username={username}
          slotNumber={selectedSlot}
          existingCharacter={existingCharacter}
          onSave={handleBuilderSave}
          onCancel={handleBuilderCancel}
          isOpen={isBuilderOpen}
        />
      )}

      {/* Character Preview Modal */}
      <CharacterPreviewModal
        character={previewCharacter}
        visible={isPreviewOpen}
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelPreview}
        onCharacterUpdate={handleCharacterUpdate}
      />
    </div>
  );
};

export default CharacterSelector;

