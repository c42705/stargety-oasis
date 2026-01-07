import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Space, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Switch, 
  Divider,
  message as antMessage,
  Tabs
} from 'antd';
import { 
  MessageOutlined, 
  UserOutlined, 
  SearchOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  SendOutlined,
  SmileOutlined,
  PaperClipOutlined,
  EllipsisOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  MoreOutlined,
  BellOutlined,
  ClearOutlined,
  HistoryOutlined,
  StarOutlined,
  FolderOpenOutlined,
  PlayCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { ChatModuleEnhanced } from './ChatModuleEnhanced';
import { PersistentChatPanelEnhanced } from '../../components/PersistentChatPanelEnhanced';
import { Message, ChatRoom, User } from '../../types/chat';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface ChatDemoProps {
  className?: string;
}

export const ChatDemo: React.FC<ChatDemoProps> = ({ className = '' }) => {
  // State management
  const [demoMode, setDemoMode] = useState<'standalone' | 'integrated'>('standalone');
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [showPersistentPanel, setShowPersistentPanel] = useState(false);
  const [currentDemo, setCurrentDemo] = useState('overview');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user1',
    username: 'Alice',
    avatar: '',
    online: true
  });

  // Mock data for demonstration
  const mockRooms: ChatRoom[] = [
    {
      id: 'general',
      name: 'General',
      description: 'General discussion for everyone',
      unreadCount: 3,
      isPrivate: false,
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        { id: 'user1', username: 'Alice', avatar: '', online: true },
        { id: 'user2', username: 'Bob', avatar: '', online: true },
        { id: 'user3', username: 'Charlie', avatar: '', online: false }
      ]
    },
    {
      id: 'development',
      name: 'Development',
      description: 'Technical discussions and development updates',
      tags: ['team', 'development'],
      unreadCount: 0,
      isPrivate: false,
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        { id: 'user1', username: 'Alice', avatar: '', online: true },
        { id: 'user4', username: 'David', avatar: '', online: true },
        { id: 'user5', username: 'Eve', avatar: '', online: false }
      ]
    },
    {
      id: 'design',
      name: 'Design Team',
      description: 'Design discussions and feedback',
      tags: ['team', 'design'],
      unreadCount: 7,
      isPrivate: true,
      createdBy: 'user2',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        { id: 'user2', username: 'Bob', avatar: '', online: true },
        { id: 'user6', username: 'Frank', avatar: '', online: true }
      ]
    }
  ];

  // Demo scenarios
  const demoScenarios = [
    {
      id: 'overview',
      title: 'Overview',
      description: 'Complete overview of all chat features and capabilities',
      icon: <MessageOutlined />
    },
    {
      id: 'messaging',
      title: 'Messaging',
      description: 'Core messaging features including sending, editing, and deleting messages',
      icon: <SendOutlined />
    },
    {
      id: 'reactions',
      title: 'Reactions',
      description: 'Emoji reactions and interactive feedback system',
      icon: <SmileOutlined />
    },
    {
      id: 'threading',
      title: 'Threading',
      description: 'Threaded conversations and reply system',
      icon: <TeamOutlined />
    },
    {
      id: 'files',
      title: 'File Attachments',
      description: 'File upload, preview, and sharing capabilities',
      icon: <PaperClipOutlined />
    },
    {
      id: 'search',
      title: 'Search',
      description: 'Advanced message search with filters and results',
      icon: <SearchOutlined />
    },
    {
      id: 'rooms',
      title: 'Room Management',
      description: 'Chat room creation, management, and organization',
      icon: <FolderOpenOutlined />
    },
    {
      id: 'persistent',
      title: 'Persistent Panel',
      description: 'Floating chat panel with notifications and settings',
      icon: <BellOutlined />
    }
  ];

  // Handle demo scenario selection
  const handleDemoSelect = (scenarioId: string) => {
    setCurrentDemo(scenarioId);
    
    // Auto-enable relevant features for each demo
    switch (scenarioId) {
      case 'persistent':
        setShowPersistentPanel(true);
        break;
      case 'overview':
        setShowChatPanel(true);
        setShowPersistentPanel(true);
        break;
      default:
        setShowChatPanel(true);
        break;
    }
    
    antMessage.success(`Demo: ${demoScenarios.find(s => s.id === scenarioId)?.title}`);
  };

  // Handle user switch
  const handleUserSwitch = (userId: string) => {
    const users: Record<string, User> = {
      'user1': { id: 'user1', username: 'Alice', avatar: '', online: true },
      'user2': { id: 'user2', username: 'Bob', avatar: '', online: true },
      'user3': { id: 'user3', username: 'Charlie', avatar: '', online: false },
      'user4': { id: 'user4', username: 'David', avatar: '', online: true },
      'user5': { id: 'user5', username: 'Eve', avatar: '', online: false },
      'user6': { id: 'user6', username: 'Frank', avatar: '', online: true }
    };
    
    setCurrentUser(users[userId]);
    antMessage.success(`Switched to ${users[userId].username}`);
  };

  // Handle video call simulation
  const handleVideoCall = (roomId: string) => {
    antMessage.info(`Simulating video call for room: ${roomId}`);
  };

  // Render demo content based on selected scenario
  const renderDemoContent = () => {
    switch (currentDemo) {
      case 'overview':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>Chat System Overview</Title>
            <Paragraph>
              This enhanced chat system provides a comprehensive messaging experience with advanced features including:
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="Core Features" size="small">
                  <ul>
                    <li>Real-time messaging</li>
                    <li>Message editing and deletion</li>
                    <li>Emoji reactions</li>
                    <li>Threaded conversations</li>
                    <li>File attachments</li>
                    <li>Advanced search</li>
                  </ul>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Advanced Features" size="small">
                  <ul>
                    <li>Room management</li>
                    <li>Notifications system</li>
                    <li>Video call integration</li>
                    <li>User presence indicators</li>
                    <li>Message history</li>
                    <li>Customizable settings</li>
                  </ul>
                </Card>
              </Col>
            </Row>
          </div>
        );

      case 'messaging':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>Messaging Features</Title>
            <Paragraph>
              Experience core messaging functionality including sending, editing, and deleting messages with real-time updates.
            </Paragraph>
            <Card title="Try It Out" size="small">
              <Text type="secondary">
                Send a message in the chat panel to see messaging features in action. You can edit messages by clicking the edit button, 
                delete them with the delete button, and see real-time updates as messages appear.
              </Text>
            </Card>
          </div>
        );

      case 'reactions':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>Reaction System</Title>
            <Paragraph>
              Add emoji reactions to messages to show feedback and engagement. Users can add multiple different reactions to the same message.
            </Paragraph>
            <Card title="How to Use" size="small">
              <ol>
                <li>Click on any message</li>
                <li>Click the reaction button (😊)</li>
                <li>Select an emoji from the picker</li>
                <li>See the reaction appear on the message</li>
                <li>Click the reaction again to remove it</li>
              </ol>
            </Card>
          </div>
        );

      case 'threading':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>Threaded Conversations</Title>
            <Paragraph>
              Organize discussions by replying to specific messages. Each reply creates a thread that can be expanded or collapsed.
            </Paragraph>
            <Card title="Thread Features" size="small">
              <ul>
                <li>Reply to any message to start a thread</li>
                <li>View threaded messages in nested format</li>
                <li>Expand/collapse individual threads</li>
                <li>See thread reply counts</li>
                <li>Navigate between threads easily</li>
              </ul>
            </Card>
          </div>
        );

      case 'files':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>File Attachments</Title>
            <Paragraph>
              Upload and share files directly in chat. Support for images, documents, and other file types with preview capabilities.
            </Paragraph>
            <Card title="File Types Supported" size="small">
              <Row gutter={[8, 8]}>
                <Col span={6}>
                  <Text strong>Images:</Text> JPG, PNG, GIF, WebP
                </Col>
                <Col span={6}>
                  <Text strong>Documents:</Text> PDF, DOC, DOCX, TXT
                </Col>
                <Col span={6}>
                  <Text strong>Media:</Text> MP4, MP3, WAV
                </Col>
                <Col span={6}>
                  <Text strong>Other:</Text> ZIP, RAR (with limits)
                </Col>
              </Row>
            </Card>
          </div>
        );

      case 'search':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>Advanced Search</Title>
            <Paragraph>
              Find messages quickly with powerful search capabilities including filters, date ranges, and content search.
            </Paragraph>
            <Card title="Search Features" size="small">
              <ul>
                <li>Full-text message search</li>
                <li>Filter by date range</li>
                <li>Search by specific users</li>
                <li>Filter by file type</li>
                <li>Search result highlighting</li>
                <li>Advanced filters panel</li>
              </ul>
            </Card>
          </div>
        );

      case 'rooms':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>Room Management</Title>
            <Paragraph>
              Create, manage, and organize chat rooms with different privacy settings and member permissions.
            </Paragraph>
            <Card title="Room Types" size="small">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card type="inner" title="Public Rooms" size="small">
                    <ul>
                      <li>Anyone can join</li>
                      <li>Visible in room list</li>
                      <li>Open discussions</li>
                    </ul>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card type="inner" title="Private Rooms" size="small">
                    <ul>
                      <li>Invitation only</li>
                      <li>Hidden from public list</li>
                      <li>Restricted access</li>
                    </ul>
                  </Card>
                </Col>
              </Row>
            </Card>
          </div>
        );

      case 'persistent':
        return (
          <div style={{ padding: '24px' }}>
            <Title level={3}>Persistent Chat Panel</Title>
            <Paragraph>
              A floating chat panel that can be positioned anywhere on the screen with notifications and advanced features.
            </Paragraph>
            <Card title="Panel Features" size="small">
              <ul>
                <li>Draggable positioning</li>
                <li>Minimize/maximize functionality</li>
                <li>Notification center</li>
                <li>Settings modal</li>
                <li>Video call integration</li>
                <li>Customizable appearance</li>
              </ul>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`chat-demo ${className}`} style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Demo Header */}
      <div style={{
        padding: '24px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)'
      }}>
        <Row gutter={[24, 16]} align="middle">
          <Col span={12}>
            <Title level={2} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              Stargety Oasis Chat System Demo
            </Title>
            <Text type="secondary">
              Phase 0: UX and Validation - Enhanced Chat Interface
            </Text>
          </Col>
          
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Text strong>Current User:</Text>
                <Button.Group size="small">
                  {Object.entries({
                    'user1': 'Alice',
                    'user2': 'Bob', 
                    'user3': 'Charlie',
                    'user4': 'David',
                    'user5': 'Eve',
                    'user6': 'Frank'
                  }).map(([userId, username]) => (
                    <Button
                      key={userId}
                      type={currentUser.id === userId ? 'primary' : 'default'}
                      onClick={() => handleUserSwitch(userId)}
                    >
                      {username}
                    </Button>
                  ))}
                </Button.Group>
              </Space>
              
              <Space>
                <Text strong>Demo Mode:</Text>
                <Switch
                  checkedChildren="Integrated"
                  unCheckedChildren="Standalone"
                  value={demoMode === 'integrated'}
                  onChange={(checked) => setDemoMode(checked ? 'integrated' : 'standalone')}
                />
              </Space>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Demo Navigation */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)'
      }}>
        <Tabs
          activeKey={currentDemo}
          onChange={handleDemoSelect}
          type="card"
          size="small"
        >
          {demoScenarios.map((scenario) => (
            <TabPane
              tab={
                <span>
                  {scenario.icon}
                  <span style={{ marginLeft: '8px' }}>{scenario.title}</span>
                </span>
              }
              key={scenario.id}
            >
              {renderDemoContent()}
            </TabPane>
          ))}
        </Tabs>
      </div>

      {/* Demo Content */}
      <div style={{ padding: '24px', minHeight: '400px' }}>
        {currentDemo === 'overview' && renderDemoContent()}
        
        {/* Standalone Chat Module */}
        {showChatPanel && currentDemo !== 'overview' && (
          <Card 
            title="Enhanced Chat Module" 
            extra={
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => antMessage.info('Chat module refreshed')}
              />
            }
            style={{ marginBottom: '24px' }}
          >
            <ChatModuleEnhanced
              defaultRoomId="general"
              currentUser={currentUser}
              showRoomList={true}
              showSearch={true}
            />
          </Card>
        )}

        {/* Persistent Chat Panel */}
        {showPersistentPanel && (
          <PersistentChatPanelEnhanced
            defaultRoomId="general"
            currentUser={currentUser}
            visible={true}
            onVideoCall={handleVideoCall}
            position="right"
            width={450}
            height="70vh"
            showRoomList={true}
            showSearch={true}
            showVideoCall={true}
            showNotifications={true}
          />
        )}
      </div>

      {/* Demo Instructions */}
      <div style={{
        padding: '24px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border-light)'
      }}>
        <Card title="How to Use This Demo" size="small">
          <ol>
            <li>
              <strong>Select a Demo Scenario:</strong> Choose from the tabs above to explore different features
            </li>
            <li>
              <strong>Switch Users:</strong> Use the user switcher to experience the chat from different perspectives
            </li>
            <li>
              <strong>Interact with Features:</strong> Click, type, and explore all the interactive elements
            </li>
            <li>
              <strong>Test Functionality:</strong> Try sending messages, adding reactions, uploading files, and more
            </li>
            <li>
              <strong>Explore Settings:</strong> Click the settings icon to customize the chat experience
            </li>
          </ol>
          
          <Divider />
          
          <Text type="secondary">
            <strong>Note:</strong> This is Phase 0 of the chat implementation - focusing on UX and validation with mock data. 
            All features are fully functional but use simulated data rather than real backend connections.
          </Text>
        </Card>
      </div>
    </div>
  );
};

export default ChatDemo;