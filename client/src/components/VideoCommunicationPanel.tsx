import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, Typography, Select, Card, Empty, Spin, Badge } from 'antd';
import { VideoCameraOutlined, PhoneOutlined, SettingOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useSettings } from '../shared/SettingsContext';
import { useAuth } from '../shared/AuthContext';
import { useEventBus } from '../shared/EventBusContext';
import { VideoCallModule } from '../modules/video-call/VideoCallModule';
import { RingCentralModule } from '../modules/ringcentral/RingCentralModule';

const { Text } = Typography;
const { Option } = Select;

interface VideoCommunicationPanelProps {
  className?: string;
  currentRoom?: string;
  onRoomChange?: (roomId: string) => void;
}

/**
 * Video Communication Panel Component
 * Persistent video communication interface for the top-right panel
 */
export const VideoCommunicationPanel: React.FC<VideoCommunicationPanelProps> = ({
  className = '',
  currentRoom,
  onRoomChange
}) => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const eventBus = useEventBus();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string>(currentRoom || 'general');
  const [availableRooms] = useState([
    { id: 'general', name: 'General Meeting', description: 'Main meeting room' },
    { id: 'team-alpha', name: 'Team Alpha', description: 'Alpha team workspace' },
    { id: 'team-beta', name: 'Team Beta', description: 'Beta team workspace' },
    { id: 'conference', name: 'Conference Room', description: 'Large conference room' },
    { id: 'private', name: 'Private Room', description: 'Private meeting space' }
  ]);

  useEffect(() => {
    if (currentRoom && currentRoom !== activeRoom) {
      setActiveRoom(currentRoom);
    }
  }, [currentRoom, activeRoom]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsConnected(true);
      onRoomChange?.(activeRoom);
    } catch (error) {
      console.error('Failed to connect to video service:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [activeRoom, onRoomChange]);

  // Listen for area selection events from the world
  useEffect(() => {
    const handleAreaSelected = (data: { areaId: string; areaName: string; roomId: string }) => {
      setActiveRoom(data.roomId);
      onRoomChange?.(data.roomId);

      // Auto-connect to the selected area
      if (!isConnected && !isConnecting) {
        handleConnect();
      }
    };

    const unsubscribe = eventBus.subscribe('area-selected', handleAreaSelected);

    return unsubscribe;
  }, [eventBus, isConnected, isConnecting, onRoomChange, activeRoom, handleConnect]);

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsConnecting(false);
  };

  const handleRoomChange = (roomId: string) => {
    setActiveRoom(roomId);
    if (isConnected) {
      // If already connected, reconnect to new room
      handleDisconnect();
      setTimeout(() => {
        setActiveRoom(roomId);
        handleConnect();
      }, 500);
    }
  };

  const renderVideoService = () => {
    if (!user || !isConnected) return null;

    const videoRoomId = activeRoom;

    if (settings.videoService === 'jitsi') {
      return (
        <VideoCallModule
          className="video-panel-content"
          roomId={videoRoomId}
          userName={user.username}
        />
      );
    } else {
      return (
        <RingCentralModule
          className="video-panel-content"
          userName={user.username}
        />
      );
    }
  };

  const renderConnectionControls = () => (
    <Card size="small" style={{ margin: '8px', backgroundColor: 'var(--color-bg-secondary)' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: '14px' }}>Video Service</Text>
          <Badge 
            status={isConnected ? 'success' : 'default'} 
            text={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
            Service: {settings.videoService === 'jitsi' ? 'Jitsi Meet' : 'RingCentral'}
          </Text>
          <Select
            value={activeRoom}
            onChange={handleRoomChange}
            style={{ width: '100%' }}
            size="small"
            disabled={isConnecting}
          >
            {availableRooms.map(room => (
              <Option key={room.id} value={room.id}>
                <div>
                  <div style={{ fontWeight: 500 }}>{room.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {room.description}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!isConnected ? (
            <Button
              type="primary"
              icon={settings.videoService === 'jitsi' ? <VideoCameraOutlined /> : <PhoneOutlined />}
              onClick={handleConnect}
              loading={isConnecting}
              size="small"
              style={{ flex: 1 }}
            >
              {isConnecting ? 'Connecting...' : 'Join Meeting'}
            </Button>
          ) : (
            <Button
              danger
              icon={<DisconnectOutlined />}
              onClick={handleDisconnect}
              size="small"
              style={{ flex: 1 }}
            >
              Leave Meeting
            </Button>
          )}
          
          <Button
            icon={<SettingOutlined />}
            size="small"
            title="Video Settings"
            onClick={() => {
              // TODO: Open video settings
            }}
          />
        </div>
      </Space>
    </Card>
  );

  const renderEmptyState = () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      padding: '20px'
    }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size="small">
            <Text type="secondary">No active video session</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Select a room and click "Join Meeting" to start
            </Text>
          </Space>
        }
      />
    </div>
  );

  const renderConnectingState = () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      padding: '20px'
    }}>
      <Spin size="large" />
      <Text style={{ marginTop: 16, textAlign: 'center' }}>
        Connecting to {availableRooms.find(r => r.id === activeRoom)?.name}...
      </Text>
      <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', marginTop: 8 }}>
        Using {settings.videoService === 'jitsi' ? 'Jitsi Meet' : 'RingCentral'}
      </Text>
    </div>
  );

  return (
    <div className={`video-communication-panel ${className}`} style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg-primary)'
    }}>
      {/* Connection Controls */}
      {renderConnectionControls()}

      {/* Video Content Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {isConnecting && renderConnectingState()}
        {!isConnecting && !isConnected && renderEmptyState()}
        {!isConnecting && isConnected && (
          <div style={{ height: '100%', width: '100%' }}>
            {renderVideoService()}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCommunicationPanel;
