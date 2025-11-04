import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, Typography, Select, Card, Empty, Spin, Badge, Modal, Switch } from 'antd';
import { VideoCameraOutlined, PhoneOutlined, SettingOutlined, DisconnectOutlined, PushpinOutlined } from '@ant-design/icons';
import { useSettings } from '../shared/SettingsContext';
import { useAuth } from '../shared/AuthContext';
import { useEventBus } from '../shared/EventBusContext';
import { VideoCallModule } from '../modules/video-call/VideoCallModule';
import { RingCentralModule } from '../modules/ringcentral/RingCentralModule';
import { jitsiRoomMappingService } from '../shared/JitsiRoomMappingService';

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

  // Auto-join/leave state
  const [autoJoinEnabled] = useState(true); // Enable auto-join by default
  const [currentAreaRoom, setCurrentAreaRoom] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sticky mode state
  const [stickyMode, setStickyMode] = useState(false);
  const [showStickyModal, setShowStickyModal] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState(false);

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

  // Auto-join/leave logic for Jitsi based on area entry/exit
  useEffect(() => {
    if (!autoJoinEnabled || settings.videoService !== 'jitsi') {
      return; // Only auto-join for Jitsi when enabled
    }

    const handleAreaEntered = (data: { areaId: string; areaName: string; roomId: string }) => {
      console.log('🚪 Area entered:', data.areaName, '- Auto-joining Jitsi room');

      // Clear any pending transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      // Get Jitsi room name from mapping service
      const jitsiRoomName = jitsiRoomMappingService.getJitsiRoomForArea(data.areaId);

      setIsTransitioning(true);
      setCurrentAreaRoom(jitsiRoomName);

      // Debounce: wait 500ms before actually joining
      // This prevents rapid room switches when walking through multiple areas
      transitionTimeoutRef.current = setTimeout(() => {
        setActiveRoom(jitsiRoomName);
        onRoomChange?.(jitsiRoomName);

        if (!isConnected) {
          // Not connected yet, connect to new room
          handleConnect();
        } else if (activeRoom !== jitsiRoomName) {
          // Already connected to different room, switch rooms
          handleDisconnect();
          setTimeout(() => {
            setActiveRoom(jitsiRoomName);
            handleConnect();
          }, 500);
        }

        setIsTransitioning(false);
      }, 500);
    };

    const handleAreaExited = (data: { areaId: string; areaName: string }) => {
      console.log('🚪 Area exited:', data.areaName, '- Auto-leaving Jitsi room');

      // Clear any pending transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      setCurrentAreaRoom(null);
      setIsTransitioning(true);

      // Debounce: wait 500ms before actually leaving
      // This prevents disconnecting if user quickly re-enters
      transitionTimeoutRef.current = setTimeout(() => {
        if (isConnected) {
          // If sticky mode is enabled, ask user before disconnecting
          if (stickyMode) {
            setShowStickyModal(true);
            setPendingDisconnect(true);
          } else {
            handleDisconnect();
          }
        }
        setIsTransitioning(false);
      }, 500);
    };

    const unsubscribeEntered = eventBus.subscribe('area-entered', handleAreaEntered);
    const unsubscribeExited = eventBus.subscribe('area-exited', handleAreaExited);

    return () => {
      unsubscribeEntered();
      unsubscribeExited();

      // Clean up timeout on unmount
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [eventBus, autoJoinEnabled, settings.videoService, isConnected, activeRoom, onRoomChange, handleConnect]);

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
          serverUrl={settings.jitsiServerUrl || 'meet.stargety.com'}
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

        {/* Sticky Mode Toggle (Jitsi only) */}
        {settings.videoService === 'jitsi' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size="small">
              <PushpinOutlined style={{ color: stickyMode ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
              <Text style={{ fontSize: '12px' }}>Sticky Mode</Text>
            </Space>
            <Switch
              size="small"
              checked={stickyMode}
              onChange={setStickyMode}
              title="Keep call active after leaving area"
            />
          </div>
        )}

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
    <>
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

      {/* Sticky Mode Confirmation Modal */}
      <Modal
        title="Continue Call?"
        open={showStickyModal}
        onOk={() => {
          setStickyMode(false);
          setShowStickyModal(false);
          setPendingDisconnect(false);
          handleDisconnect();
        }}
        onCancel={() => {
          setShowStickyModal(false);
          setPendingDisconnect(false);
        }}
        okText="Leave Call"
        cancelText="Stay Connected"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" size="small">
          <Typography.Text>
            You've left the interactive area, but you're still in the video call.
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            Would you like to leave the call or stay connected?
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
            💡 Tip: You can disable "Sticky Mode" to automatically leave calls when exiting areas.
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
};

export default VideoCommunicationPanel;
