import React, { useState } from 'react';
import { Button, Card, Space, Typography, Tooltip } from 'antd';
import { BuildOutlined, UserOutlined, ToolOutlined } from '@ant-design/icons';
import { AvatarBuilderModal } from './AvatarBuilderModal';
import { AvatarBuilderStorage } from './AvatarBuilderStorage';
import { SpriteSheetDefinition } from './AvatarBuilderTypes';

const { Title, Text } = Typography;

export interface AvatarBuilderLauncherProps {
  username?: string;
  onAvatarCreated?: (definition: SpriteSheetDefinition) => void;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
  type?: 'button' | 'card';
}

/**
 * Standalone launcher component for the Avatar Builder
 * Can be used anywhere in the app to open the Avatar Builder
 */
export const AvatarBuilderLauncher: React.FC<AvatarBuilderLauncherProps> = ({
  username = 'player',
  onAvatarCreated,
  style,
  size = 'middle',
  type = 'button'
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSave = (definition: SpriteSheetDefinition) => {
    console.log('Avatar Builder - Character saved:', definition);
    onAvatarCreated?.(definition);
    setModalVisible(false);
  };

  const handleOpen = () => {
    setModalVisible(true);
  };

  // Check if user has existing avatar
  const hasExistingAvatar = AvatarBuilderStorage.loadCharacterDefinition(username).success;

  if (type === 'card') {
    return (
      <>
        <Card
          style={{ 
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s',
            ...style
          }}
          hoverable
          onClick={handleOpen}
          cover={
            <div style={{ padding: '40px 20px 20px', backgroundColor: '#f8f9fa' }}>
              <BuildOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </div>
          }
        >
          <Card.Meta
            title="Avatar Builder"
            description={
              <Space direction="vertical" size="small">
                <Text>Create custom characters with professional tools</Text>
                {hasExistingAvatar && (
                  <Text type="success">
                    <UserOutlined /> You have a saved avatar
                  </Text>
                )}
              </Space>
            }
          />
        </Card>

        <AvatarBuilderModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          username={username}
          onSave={handleSave}
        />
      </>
    );
  }

  return (
    <>
      <Tooltip title="Create custom characters with sprite sheets">
        <Button
          type="primary"
          icon={<BuildOutlined />}
          size={size}
          onClick={handleOpen}
          style={style}
        >
          {hasExistingAvatar ? 'Edit Avatar' : 'Create Avatar'}
        </Button>
      </Tooltip>

      <AvatarBuilderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        username={username}
        onSave={handleSave}
      />
    </>
  );
};

/**
 * Quick access button for the Avatar Builder
 */
export const QuickAvatarBuilder: React.FC<{ username?: string }> = ({ username = 'player' }) => {
  return (
    <AvatarBuilderLauncher
      username={username}
      size="large"
      onAvatarCreated={(definition) => {
        console.log('New avatar created:', definition.name);
      }}
    />
  );
};

/**
 * Avatar Builder card for dashboard or main menu
 */
export const AvatarBuilderCard: React.FC<{ username?: string }> = ({ username = 'player' }) => {
  return (
    <AvatarBuilderLauncher
      username={username}
      type="card"
      style={{ width: 300 }}
      onAvatarCreated={(definition) => {
        console.log('New avatar created:', definition.name);
      }}
    />
  );
};

/**
 * Avatar Builder menu item
 */
export const AvatarBuilderMenuItem: React.FC<{ 
  username?: string;
  onClick?: () => void;
}> = ({ username = 'player', onClick }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleClick = () => {
    setModalVisible(true);
    onClick?.();
  };

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <BuildOutlined style={{ fontSize: 16, color: '#1890ff' }} />
        <Space direction="vertical" size={0}>
          <Text strong>Avatar Builder</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Create custom characters
          </Text>
        </Space>
      </div>

      <AvatarBuilderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        username={username}
        onSave={(definition) => {
          console.log('Avatar created from menu:', definition.name);
          setModalVisible(false);
        }}
      />
    </>
  );
};

export default AvatarBuilderLauncher;
