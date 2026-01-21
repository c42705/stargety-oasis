import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Layout,
  Button,
  Space,
  Avatar,
  Typography,
  Badge,
  Card,
  Tabs,
  Popover,
  Dropdown,
  message as antMessage,
  Modal,
  Spin,
  Empty,
  Select,
  Divider,
  Switch,
  Row,
  Col,
  Menu
} from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  ClearOutlined,
  FolderOpenOutlined,
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  MessageOutlined,
  SmileOutlined,
  HistoryOutlined,
  StarOutlined,
  VideoCameraOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { ChatModuleEnhanced } from '../modules/chat/ChatModuleEnhanced';
import { Message, ChatRoom, User } from '../types/chat';
import { useTheme } from '../shared/ThemeContext';

const { Header, Content, Footer } = Layout;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface PersistentChatPanelEnhancedProps {
  className?: string;
  defaultRoomId?: string;
  currentUser?: User;
  visible?: boolean;
  onClose?: () => void;
  onRoomSelect?: (roomId: string) => void;
  onVideoCall?: (roomId: string) => void;
  onNotification?: (message: string) => void;
  position?: 'left' | 'right' | 'bottom';
  width?: number | string;
  height?: number | string;
  showRoomList?: boolean;
  showSearch?: boolean;
  showVideoCall?: boolean;
  showNotifications?: boolean;
  maxMessages?: number;
  autoScroll?: boolean;
}

interface Notification {
  id: string;
  type: 'message' | 'mention' | 'reaction' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  roomId?: string;
  messageId?: string;
}

interface ChatSettings {
  notifications: {
    message: boolean;
    mention: boolean;
    reaction: boolean;
    sound: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    compact: boolean;
  };
  behavior: {
    autoScroll: boolean;
    typingIndicators: boolean;
    messagePreview: boolean;
    filePreview: boolean;
  };
}

export const PersistentChatPanelEnhanced: React.FC<PersistentChatPanelEnhancedProps> = ({
  className = '',
  defaultRoomId = 'general',
  currentUser = { id: 'user1', username: 'Alice', avatar: '', online: true },
  visible = true,
  onClose,
  onRoomSelect,
  onVideoCall,
  onNotification,
  position = 'right',
  width = 400,
  height = '80vh',
  showRoomList = true,
  showSearch = true,
  showVideoCall = true,
  showNotifications = true,
  maxMessages = 100,
  autoScroll = true
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('chat');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    notifications: {
      message: true,
      mention: true,
      reaction: true,
      sound: true
    },
    appearance: {
      theme: 'light',
      fontSize: 'medium',
      compact: false
    },
    behavior: {
      autoScroll: true,
      typingIndicators: true,
      messagePreview: true,
      filePreview: true
    }
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate mock notifications
  const generateMockNotifications = (): Notification[] => [
    {
      id: '1',
      type: 'message',
      title: 'New message',
      message: 'Bob sent you a message in Development',
      timestamp: new Date(Date.now() - 300000),
      read: false,
      roomId: 'development'
    },
    {
      id: '2',
      type: 'mention',
      title: 'You were mentioned',
      message: 'Alice mentioned you in a message',
      timestamp: new Date(Date.now() - 600000),
      read: false,
      roomId: 'general'
    },
    {
      id: '3',
      type: 'reaction',
      title: 'New reaction',
      message: 'Eve reacted to your message with 👍',
      timestamp: new Date(Date.now() - 900000),
      read: true,
      roomId: 'design'
    }
  ];

  // Initialize notifications
  useEffect(() => {
    setNotifications(generateMockNotifications());
    updateUnreadCount();
  }, []);

  // Update unread count
  const updateUnreadCount = useCallback(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    );
    updateUnreadCount();
    
    if (notification.roomId) {
      onRoomSelect?.(notification.roomId);
      setActiveTab('chat');
    }
  }, [onRoomSelect, updateUnreadCount]);

  // Mark all notifications as read
  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    updateUnreadCount();
    antMessage.success('All notifications marked as read');
  }, [updateUnreadCount]);

  // Clear all notifications
  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    antMessage.success('All notifications cleared');
  }, []);

  // Handle video call
  const handleVideoCall = useCallback((roomId: string) => {
    onVideoCall?.(roomId);
    antMessage.info(`Starting video call for room: ${roomId}`);
  }, [onVideoCall]);

  // Handle settings change
  const handleSettingsChange = useCallback((newSettings: Partial<ChatSettings>) => {
    setChatSettings(prev => ({ ...prev, ...newSettings }));
    antMessage.success('Settings updated successfully');
  }, []);

  // Handle minimize/maximize
  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  const handleMaximize = useCallback(() => {
    setIsMaximized(!isMaximized);
  }, [isMaximized]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsMinimized(true);
    onClose?.();
  }, [onClose]);

  // Get notification icon based on type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <MessageOutlined style={{ color: '#1890ff' }} />;
      case 'mention':
        return <BellOutlined style={{ color: '#fa8c16' }} />;
      case 'reaction':
        return <SmileOutlined style={{ color: '#52c41a' }} />;
      case 'system':
        return <SettingOutlined style={{ color: '#722ed1' }} />;
      default:
        return <BellOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return '#1890ff';
      case 'mention':
        return '#fa8c16';
      case 'reaction':
        return '#52c41a';
      case 'system':
        return '#722ed1';
      default:
        return '#8c8c8c';
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Panel styles based on position
  const getPanelStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      transition: 'all 0.3s ease',
      display: visible && !isMinimized ? 'flex' : 'none'
    };

    switch (position) {
      case 'left':
        return {
          ...baseStyles,
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          height,
          width
        };
      case 'right':
        return {
          ...baseStyles,
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          height,
          width
        };
      case 'bottom':
        return {
          ...baseStyles,
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          height,
          width: '80vw',
          maxWidth: '600px'
        };
      default:
        return baseStyles;
    }
  };

  // Header actions menu items
  const headerActionsMenuItems = [
    { key: 'notifications', icon: <BellOutlined />, label: 'Notifications' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
    { key: 'history', icon: <HistoryOutlined />, label: 'Chat History' },
    { key: 'starred', icon: <StarOutlined />, label: 'Starred Messages' },
    { type: 'divider' as const },
    { key: 'minimize', icon: <ClearOutlined />, label: isMinimized ? 'Restore' : 'Minimize' },
    { key: 'maximize', icon: <FolderOpenOutlined />, label: isMaximized ? 'Restore' : 'Maximize' },
    { key: 'close', icon: <ClearOutlined />, label: 'Close', danger: true },
  ];

  if (!visible && !isMinimized) return null;

  return (
    <div className={`persistent-chat-panel-enhanced ${className}`} style={getPanelStyles()}>
      {/* Header */}
      <Header style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'move'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge count={unreadCount} size="small">
            <MessageOutlined style={{ fontSize: '16px', color: 'var(--color-accent)' }} />
          </Badge>
          <Title level={5} style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-primary)' }}>
            Chat
          </Title>
        </div>

        <Space>
          {showVideoCall && (
            <Button
              type="text"
              size="small"
              icon={<VideoCameraOutlined />}
              onClick={() => handleVideoCall(defaultRoomId)}
              style={{ color: 'var(--color-text-secondary)' }}
              title="Start Video Call"
            />
          )}
          
          <Dropdown menu={{ items: headerActionsMenuItems }} trigger={['click']}>
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              style={{ color: 'var(--color-text-secondary)' }}
            />
          </Dropdown>
        </Space>
      </Header>

      {/* Content */}
      <Content style={{
        flex: 1,
        overflow: 'hidden',
        display: isMinimized ? 'none' : 'flex',
        flexDirection: 'column'
      }}>
        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
        >
          <TabPane tab="Chat" key="chat">
            <ChatModuleEnhanced
              defaultRoomId={defaultRoomId}
              currentUser={currentUser}
              showRoomList={showRoomList}
              showSearch={showSearch}
            />
          </TabPane>

          <TabPane
            tab={
              <Badge count={notifications.filter(n => !n.read).length} dot>
                <span>Notifications</span>
              </Badge>
            }
            key="notifications"
          >
            <Space direction="vertical" style={{ width: '100%', padding: '16px' }} size="middle">
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
                  Notifications
                </Title>
                <Space>
                  <Button
                    type="text"
                    size="small"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all as read
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    onClick={handleClearNotifications}
                    disabled={notifications.length === 0}
                  >
                    Clear all
                  </Button>
                </Space>
              </Space>

              {notifications.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Text type="secondary">
                      No notifications yet
                    </Text>
                  }
                />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      size="small"
                      hoverable
                      onClick={() => handleNotificationClick(notification)}
                      styles={{
                        body: { padding: '12px' }
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={0}>
                        <Space size="small">
                          {getNotificationIcon(notification.type)}
                          <Text
                            strong
                            style={{ fontSize: '12px' }}
                          >
                            {notification.title}
                          </Text>
                          <Text
                            type="secondary"
                            style={{ fontSize: '10px' }}
                          >
                            {formatTimeAgo(notification.timestamp)}
                          </Text>
                          {!notification.read && (
                            <Badge
                              color={getNotificationColor(notification.type)}
                              style={{ width: '8px', height: '8px' }}
                            />
                          )}
                        </Space>

                        <Text style={{ fontSize: '12px' }}>
                          {notification.message}
                        </Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Space>
          </TabPane>
        </Tabs>
      </Content>

      {/* Footer */}
      <Footer style={{
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space size="small">
          <Avatar
            size="small"
            icon={<UserOutlined />}
          >
            {currentUser.username.charAt(0).toUpperCase()}
          </Avatar>
          <Text style={{ fontSize: '12px' }}>
            {currentUser.username}
          </Text>
        </Space>

        <Space>
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setShowSettingsModal(true)}
          />
          <Button
            type="text"
            size="small"
            icon={isMinimized ? <FolderOpenOutlined /> : <ClearOutlined />}
            onClick={handleMinimize}
          />
        </Space>
      </Footer>

      {/* Settings Modal */}
      <Modal
        title="Chat Settings"
        open={showSettingsModal}
        onCancel={() => setShowSettingsModal(false)}
        footer={null}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Notifications Section */}
          <div>
            <Title level={5} style={{ marginBottom: '16px' }}>
              Notifications
            </Title>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {Object.entries(chatSettings.notifications).map(([key, value]) => (
                <Row key={key} justify="space-between" align="middle">
                  <Col>
                    <Text>
                      {key.charAt(0).toUpperCase() + key.slice(1)} notifications
                    </Text>
                  </Col>
                  <Col>
                    <Switch
                      checked={value}
                      onChange={() => handleSettingsChange({
                        notifications: { ...chatSettings.notifications, [key]: !value }
                      })}
                    />
                  </Col>
                </Row>
              ))}
            </Space>
          </div>

          <Divider />

          {/* Appearance Section */}
          <div>
            <Title level={5} style={{ marginBottom: '16px' }}>
              Appearance
            </Title>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row justify="space-between" align="middle">
                <Col>
                  <Text>Theme</Text>
                </Col>
                <Col>
                  <Select
                    value={chatSettings.appearance.theme}
                    onChange={(value) => handleSettingsChange({
                      appearance: { ...chatSettings.appearance, theme: value }
                    })}
                    style={{ width: 120 }}
                    options={[
                      { label: 'Light', value: 'light' },
                      { label: 'Dark', value: 'dark' },
                      { label: 'Auto', value: 'auto' }
                    ]}
                  />
                </Col>
              </Row>

              <Row justify="space-between" align="middle">
                <Col>
                  <Text>Font Size</Text>
                </Col>
                <Col>
                  <Select
                    value={chatSettings.appearance.fontSize}
                    onChange={(value) => handleSettingsChange({
                      appearance: { ...chatSettings.appearance, fontSize: value }
                    })}
                    style={{ width: 120 }}
                    options={[
                      { label: 'Small', value: 'small' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'Large', value: 'large' }
                    ]}
                  />
                </Col>
              </Row>
            </Space>
          </div>

          <Divider />

          {/* Behavior Section */}
          <div>
            <Title level={5} style={{ marginBottom: '16px' }}>
              Behavior
            </Title>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {Object.entries(chatSettings.behavior).map(([key, value]) => (
                <Row key={key} justify="space-between" align="middle">
                  <Col>
                    <Text>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </Col>
                  <Col>
                    <Switch
                      checked={value}
                      onChange={() => handleSettingsChange({
                        behavior: { ...chatSettings.behavior, [key]: !value }
                      })}
                    />
                  </Col>
                </Row>
              ))}
            </Space>
          </div>
        </Space>
      </Modal>
    </div>
  );
};