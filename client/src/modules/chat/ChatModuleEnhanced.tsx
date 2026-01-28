import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Layout,
  Space,
  Button,
  Avatar,
  Typography,
  Spin,
  Empty,
  message as antMessage
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  SettingOutlined,
  SendOutlined
} from '@ant-design/icons';
import { Message, ChatRoom, User } from '../../types/chat';
import { MessageItem } from './components/MessageItem';
import { MessageEditor } from './components/MessageEditor';
import { ThreadView } from './components/ThreadView';
import { ChatRoomList } from './components/ChatRoomList';
import { FileUpload } from './components/FileUpload';
import { SearchBox } from './components/SearchBox';
import { useTheme } from '../../shared/ThemeContext';

const { Sider, Content, Header, Footer } = Layout;
const { Text, Title } = Typography;

interface ChatModuleEnhancedProps {
  className?: string;
  defaultRoomId?: string;
  currentUser?: User;
  showRoomList?: boolean;
  showSearch?: boolean;
}

// Mock data generators
const generateMockRooms = (): ChatRoom[] => [
  {
    id: 'general',
    name: 'General',
    description: 'General discussion for everyone',
    unreadCount: 3,
    tags: ['general'],
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
    unreadCount: 0,
    tags: ['team', 'development'],
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
    unreadCount: 7,
    tags: ['team', 'design'],
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

const generateMockMessages = (roomId: string): Message[] => [
  {
    id: '1',
    content: { text: 'Welcome to the enhanced chat system! 🎉' },
    author: { id: 'user1', username: 'Alice', avatar: '', online: true },
    authorId: 'user1',
    roomId,
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3600000),
    expiresAt: new Date(Date.now() + 28800000), // 8 hours from now
    type: 'text',
    reactions: [
      { id: 'reaction1', emoji: '👍', userId: 'user2', user: { id: 'user2', username: 'Bob', avatar: '', online: true }, createdAt: new Date(Date.now() - 1800000) },
      { id: 'reaction2', emoji: '🎉', userId: 'user3', user: { id: 'user3', username: 'Charlie', avatar: '', online: false }, createdAt: new Date(Date.now() - 1200000) }
    ],
    attachments: [],
    isEdited: false,
    threadId: undefined,
    parentId: undefined
  },
  {
    id: '2',
    content: { text: 'Thanks Alice! This looks amazing. Love the new features.' },
    author: { id: 'user2', username: 'Bob', avatar: '', online: true },
    authorId: 'user2',
    roomId,
    createdAt: new Date(Date.now() - 1800000),
    updatedAt: new Date(Date.now() - 1800000),
    expiresAt: new Date(Date.now() + 28800000),
    type: 'text',
    reactions: [
      { id: 'reaction3', emoji: '❤️', userId: 'user1', user: { id: 'user1', username: 'Alice', avatar: '', online: true }, createdAt: new Date(Date.now() - 900000) }
    ],
    attachments: [],
    isEdited: false,
    threadId: undefined,
    parentId: undefined
  },
  {
    id: '3',
    content: { text: 'The threaded conversations are going to be so useful for organizing discussions!' },
    author: { id: 'user4', username: 'David', avatar: '', online: true },
    authorId: 'user4',
    roomId,
    createdAt: new Date(Date.now() - 900000),
    updatedAt: new Date(Date.now() - 900000),
    expiresAt: new Date(Date.now() + 28800000),
    type: 'text',
    reactions: [],
    attachments: [],
    isEdited: false,
    threadId: undefined,
    parentId: undefined
  },
  {
    id: '4',
    content: { text: 'I agree! And the file upload feature looks great too.' },
    author: { id: 'user5', username: 'Eve', avatar: '', online: false },
    authorId: 'user5',
    roomId,
    createdAt: new Date(Date.now() - 600000),
    updatedAt: new Date(Date.now() - 600000),
    expiresAt: new Date(Date.now() + 28800000),
    type: 'text',
    reactions: [],
    attachments: [],
    isEdited: false,
    threadId: undefined,
    parentId: undefined
  }
];

export const ChatModuleEnhanced: React.FC<ChatModuleEnhancedProps> = ({
  className = '',
  defaultRoomId = 'general',
  currentUser = { id: 'user1', username: 'Alice', avatar: '', online: true },
  showRoomList = true,
  showSearch = true
}) => {
  // State management
  const [rooms, setRooms] = useState<ChatRoom[]>(generateMockRooms());
  const [currentRoomId, setCurrentRoomId] = useState(defaultRoomId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab] = useState('messages');
  const [showThread, setShowThread] = useState(false);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers] = useState<string[]>(['user1', 'user2', 'user4', 'user6']);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Current room
  const currentRoom = useMemo(() => 
    rooms.find(room => room.id === currentRoomId), 
    [rooms, currentRoomId]
  );

  // Current messages
  const currentMessages = useMemo(() => 
    searchResults.length > 0 ? searchResults : messages,
    [messages, searchResults]
  );

  // Load messages for current room
  useEffect(() => {
    if (currentRoomId) {
      const mockMessages = generateMockMessages(currentRoomId);
      setMessages(mockMessages);
      setSearchResults([]);
    }
  }, [currentRoomId]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, scrollToBottom]);

  // Handle room selection
  const handleRoomSelect = useCallback((roomId: string) => {
    setCurrentRoomId(roomId);
    setShowThread(false);
    setNewMessage('');
    setSelectedFiles([]);
    setSearchResults([]);
  }, []);

  // Handle room creation
  const handleRoomCreate = useCallback((roomData: Partial<ChatRoom>) => {
    const newRoom: ChatRoom = {
      id: `room-${Date.now()}`,
      name: roomData.name || 'New Room',
      description: roomData.description || '',
      unreadCount: 0,
      tags: roomData.tags || [],
      isPrivate: roomData.isPrivate || false,
      createdBy: currentUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [currentUser, ...rooms[0]?.members?.slice(0, 2) || []]
    };
    
    setRooms(prev => [...prev, newRoom]);
    antMessage.success('Room created successfully!');
  }, [currentUser, rooms]);

  // Handle room update
  const handleRoomUpdate = useCallback((roomId: string, roomData: Partial<ChatRoom>) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, ...roomData, updatedAt: new Date() }
        : room
    ));
    antMessage.success('Room updated successfully!');
  }, []);

  // Handle room delete
  const handleRoomDelete = useCallback((roomId: string) => {
    setRooms(prev => prev.filter(room => room.id !== roomId));
    if (currentRoomId === roomId) {
      setCurrentRoomId(rooms[0]?.id || 'general');
    }
    antMessage.success('Room deleted successfully!');
  }, [currentRoomId, rooms]);

  // Handle room leave
  const handleRoomLeave = useCallback((roomId: string) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, members: room.members?.filter(member => member.id !== currentUser.id) }
        : room
    ));
    antMessage.success('Left room successfully!');
  }, [currentUser]);

  // Handle search
  const handleSearch = useCallback((params: { query: string; userId?: string; startDate?: Date; endDate?: Date; fileType?: string }) => {
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      const results = messages.filter(message =>
        message.content.text?.toLowerCase().includes(params.query.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  }, [messages]);

  // Handle message send
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: { text: newMessage.trim() },
      author: currentUser,
      authorId: currentUser.id,
      roomId: currentRoomId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 28800000),
      type: 'text',
      reactions: [],
      attachments: selectedFiles.map(file => ({
        id: `file-${Date.now()}-${file.name}`,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        uploadedAt: new Date()
      })),
      isEdited: false,
      threadId: showThread ? threadMessages[0]?.id : undefined,
      parentId: showThread ? threadMessages[0]?.id : undefined
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setSelectedFiles([]);
    setShowThread(false);
    
    // Simulate response
    setTimeout(() => {
      const responses = [
        "Great point!",
        "I agree with that.",
        "Thanks for sharing!",
        "Interesting perspective!",
        "👍"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const responseMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        content: { text: randomResponse },
        author: { id: 'user2', username: 'Bob', avatar: '', online: true },
        authorId: 'user2',
        roomId: currentRoomId,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 28800000),
        type: 'text',
        reactions: [],
        attachments: [],
        isEdited: false,
        threadId: undefined,
        parentId: undefined
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 1000 + Math.random() * 2000);
  }, [newMessage, selectedFiles, currentRoomId, currentUser, showThread, threadMessages]);

  // Handle message edit
  const handleMessageEdit = useCallback((messageId: string, content: string) => {
    setMessages(prev => prev.map(message => 
      message.id === messageId 
        ? { ...message, content: { text: content }, isEdited: true, editedAt: new Date() }
        : message
    ));
    antMessage.success('Message updated successfully!');
  }, []);

  // Handle message delete
  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId));
    antMessage.success('Message deleted successfully!');
  }, []);

  // Handle reply to message
  const handleReplyToMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setNewMessage(`@${message.author.username} ${message.content.text || ''}`);
    }
  }, [messages]);

  // Handle typing simulation
  useEffect(() => {
    if (newMessage) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [newMessage]);

  const { currentTheme } = useTheme();

  return (
    <Layout className={`chat-module-enhanced ${className}`} style={{ height: '100%' }}>
      {/* Room List Sidebar */}
      {showRoomList && (
        <Sider
          width={300}
          style={{
            backgroundColor: currentTheme.cssVariables['--color-bg-secondary'],
            borderRight: `1px solid ${currentTheme.cssVariables['--color-border-light']}`
          }}
        >
          <ChatRoomList
            rooms={rooms}
            currentUser={currentUser}
            currentRoomId={currentRoomId}
            onRoomSelect={handleRoomSelect}
            onRoomCreate={handleRoomCreate}
            onRoomUpdate={handleRoomUpdate}
            onRoomDelete={handleRoomDelete}
            onRoomLeave={handleRoomLeave}
          />
        </Sider>
      )}

      {/* Main Chat Area */}
      <Layout style={{ flex: 1, minHeight: 0 }}>
        {/* Header */}
        <Header style={{
          padding: '16px',
          borderBottom: `1px solid ${currentTheme.cssVariables['--color-border-light']}`,
          backgroundColor: currentTheme.cssVariables['--color-bg-secondary'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Space size="middle">
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ backgroundColor: currentTheme.cssVariables['--color-accent'] }}
            >
              {currentUser.username.charAt(0).toUpperCase()}
            </Avatar>
            <Space direction="vertical" size={0}>
              <Title level={4} style={{ margin: 0 }}>
                {currentRoom?.name || 'Chat'}
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {onlineUsers.length} users online
                {isTyping && ' • Someone is typing...'}
              </Text>
            </Space>
          </Space>

          <Space>
            {showSearch && (
              <SearchBox
                onSearch={handleSearch}
              />
            )}
            <Button
              type="text"
              icon={<SettingOutlined />}
            />
          </Space>
        </Header>

        {/* Content */}
        <Content style={{
          padding: '16px',
          overflow: 'auto',
          backgroundColor: currentTheme.cssVariables['--color-bg-primary']
        }}>
          {isSearching ? (
            <Space direction="vertical" style={{ width: '100%', textAlign: 'center', paddingTop: '40px' }}>
              <Spin size="large" />
              <Text type="secondary">Searching messages...</Text>
            </Space>
          ) : currentMessages.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary">
                  No messages yet. Start the conversation!
                </Text>
              }
            >
              <Button type="primary" icon={<PlusOutlined />}>
                Send a message
              </Button>
            </Empty>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {currentMessages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isCurrentUser={message.authorId === currentUser.id}
                  onEdit={handleMessageEdit}
                  onDelete={handleMessageDelete}
                  onReply={handleReplyToMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </Space>
          )}
        </Content>

        {/* Input Area */}
        <Footer style={{
          padding: '16px',
          borderTop: `1px solid ${currentTheme.cssVariables['--color-border-light']}`,
          backgroundColor: currentTheme.cssVariables['--color-bg-secondary']
        }}>
          {activeTab === 'messages' && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* File Upload */}
              <FileUpload
                roomId={currentRoomId}
                onFileUploaded={(attachment) => {
                  // Handle file upload completion
                  console.log('File uploaded:', attachment);
                }}
                maxFileSize={10}
                maxFiles={5}
              />

              {/* Message Input */}
              <Space.Compact style={{ width: '100%' }}>
                <MessageEditor
                  initialValue={newMessage}
                  onSave={handleSendMessage}
                  onCancel={() => setNewMessage('')}
                  placeholder="Type a message..."
                  multiline={true}
                  autoFocus={true}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() && selectedFiles.length === 0}
                >
                  Send
                </Button>
              </Space.Compact>
            </Space>
          )}

          {activeTab === 'thread' && threadMessages.length > 0 && (
            <ThreadView
              threadRootMessage={threadMessages[0]}
              threadMessages={threadMessages.slice(1)}
              currentUserId={currentUser.id}
              onReply={handleReplyToMessage}
            />
          )}
        </Footer>
      </Layout>
    </Layout>
  );
};