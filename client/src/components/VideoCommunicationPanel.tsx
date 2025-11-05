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

  // Debug: Log when this panel mounts
  useEffect(() => {
    console.log('🎬 VideoCommunicationPanel MOUNTED');
    return () => {
      console.log('🔴 VideoCommunicationPanel UNMOUNTING');
    };
  }, []);

  // Simplified state: only track current area room
  const [currentAreaRoom, setCurrentAreaRoom] = useState<string | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sticky mode state
  const [stickyMode, setStickyMode] = useState(false);
  const [showStickyModal, setShowStickyModal] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState(false);

  const handleDisconnect = () => {
    console.log('🔌 Manually disconnecting from video call');
    setCurrentAreaRoom(null);
  };

  // Simplified auto-join/leave logic for Jitsi based on area entry/exit
  useEffect(() => {
    if (settings.videoService !== 'jitsi') {
      return; // Only auto-join for Jitsi
    }

    const handleAreaEntered = (data: { areaId: string; areaName: string; roomId: string }) => {
      console.log('🚪 Area entered:', data.areaName, '- Setting up Jitsi room');

      // Clear any pending transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      // Get Jitsi room name from mapping service
      const jitsiRoomName = jitsiRoomMappingService.getJitsiRoomForArea(data.areaId);

      // Debounce: wait 500ms before actually joining
      // This prevents rapid room switches when walking through multiple areas
      transitionTimeoutRef.current = setTimeout(() => {
        console.log('📹 Setting current area room to:', jitsiRoomName);
        setCurrentAreaRoom(jitsiRoomName);
        onRoomChange?.(jitsiRoomName);
      }, 500);
    };

    const handleAreaExited = (data: { areaId: string; areaName: string }) => {
      console.log('🚪 Area exited:', data.areaName);

      // Clear any pending transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      // Debounce: wait 500ms before actually leaving
      // This prevents disconnecting if user quickly re-enters
      transitionTimeoutRef.current = setTimeout(() => {
        // If sticky mode is enabled, ask user before disconnecting
        if (stickyMode && currentAreaRoom) {
          setShowStickyModal(true);
          setPendingDisconnect(true);
        } else {
          console.log('📹 Clearing current area room');
          setCurrentAreaRoom(null);
        }
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
  }, [eventBus, settings.videoService, stickyMode, currentAreaRoom, onRoomChange]);

  // Simplified: Render idle message when not in an area
  const renderIdleState = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '32px',
      textAlign: 'center'
    }}>
      <VideoCameraOutlined style={{ fontSize: '64px', color: 'var(--color-text-tertiary)', marginBottom: '16px' }} />
      <Text strong style={{ fontSize: '16px', marginBottom: '8px' }}>
        Walk into a meeting area to join a video call
      </Text>
      <Text type="secondary" style={{ fontSize: '14px' }}>
        Meeting areas are highlighted on the map
      </Text>
      {settings.videoService === 'jitsi' && (
        <div style={{ marginTop: '24px', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
          <Space size="small">
            <PushpinOutlined style={{ color: stickyMode ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
            <Text style={{ fontSize: '12px' }}>Sticky Mode</Text>
            <Switch
              size="small"
              checked={stickyMode}
              onChange={setStickyMode}
              title="Keep call active after leaving area"
            />
          </Space>
        </div>
      )}
    </div>
  );

  // Simplified: Render Jitsi when in an area
  const renderVideoService = () => {
    if (!user || !currentAreaRoom) return null;

    console.log('📹 Rendering VideoCallModule for room:', currentAreaRoom);

    if (settings.videoService === 'jitsi') {
      return (
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <VideoCallModule
            roomId={currentAreaRoom}
            userName={user.username}
            serverUrl={settings.jitsiServerUrl || 'meet.stargety.com'}
            hideToolbar={true}
          />
        </div>
      );
    } else {
      return (
        <div style={{ height: '100%', width: '100%' }}>
          <RingCentralModule
            className="video-panel-content"
            userName={user.username}
          />
        </div>
      );
    }
  };

  return (
    <>
      <div className={`video-communication-panel ${className}`} style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-primary)'
      }}>
        {/* Simplified UI: Show idle message OR Jitsi iframe */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {currentAreaRoom ? renderVideoService() : renderIdleState()}
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
