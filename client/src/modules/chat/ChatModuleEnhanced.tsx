import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Layout, 
  Tabs, 
  Space, 
  Button, 
  Badge, 
  Avatar, 
  Typography, 
  Card,
  Spin,
  Empty,
  message as antMessage
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
  EllipsisOutlined
} from '@ant-design/icons';
import { Message, ChatRoom, User, Reaction } from '../../types/chat';
import { MessageItem } from './components/MessageItem';
import { MessageEditor } from './components/MessageEditor';
import { ReactionButton } from './components/ReactionButton';
import { ThreadView } from './components/ThreadView';
import { ChatRoomList } from './components/ChatRoomList';
import { FileUpload } from './components/FileUpload';
import { SearchBox } from './components/SearchBox';

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
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
  const [activeTab, setActiveTab] = useState('messages');
  const [showThread, setShowThread] = useState(false);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>(['user1', 'user2', 'user4', 'user6']);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setEditingMessage(null);
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

  // Handle search results
  const handleSearchResults = useCallback((results: Message[]) => {
    setSearchResults(results);
  }, []);

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
    setEditingMessage(null);
    antMessage.success('Message updated successfully!');
  }, []);

  // Handle message delete
  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId));
    antMessage.success('Message deleted successfully!');
  }, []);

  // Handle reaction add
  const handleReactionAdd = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(message => {
      if (message.id === messageId) {
        const existingReaction = message.reactions?.find(r => r.emoji === emoji && r.userId === currentUser.id);
        if (existingReaction) {
          return message;
        }
        return {
          ...message,
          reactions: [...(message.reactions || []), { id: `reaction-${Date.now()}`, emoji, userId: currentUser.id, user: currentUser, createdAt: new Date() }]
        };
      }
      return message;
    }));
  }, [currentUser]);

  // Handle reaction remove
  const handleReactionRemove = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(message => {
      if (message.id === messageId) {
        return {
          ...message,
          reactions: message.reactions?.filter(r => !(r.emoji === emoji && r.userId === currentUser.id)) || []
        };
      }
      return message;
    }));
  }, [currentUser]);

  // Handle file select
  const handleFileSelect = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  // Handle reply to message
  const handleReplyToMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setNewMessage(`@${message.author.username} ${message.content.text || ''}`);
      setReplyToMessageId(messageId);
    }
  }, [messages]);

  // Handle thread view
  const handleThreadView = useCallback((message: Message) => {
    setShowThread(true);
    setThreadMessages([message]);
    setActiveTab('thread');
  }, []);

  // Handle typing simulation
  useEffect(() => {
    if (newMessage) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [newMessage]);

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-module-enhanced ${className}`} style={{ height: '100%', display: 'flex' }}>
      {/* Room List Sidebar */}
      {showRoomList && (
        <Sider 
          width={300} 
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            borderRight: '1px solid var(--color-border-light)'
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
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-border-light)',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar 
              size="small" 
              icon={<UserOutlined />}
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {currentUser.username.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                {currentRoom?.name || 'Chat'}
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {onlineUsers.length} users online
                {isTyping && ' • Someone is typing...'}
              </Text>
            </div>
          </div>
          
          <Space>
            {showSearch && (
              <SearchBox
                onSearch={handleSearch}
              />
            )}
            <Button
              type="text"
              icon={<SettingOutlined />}
              style={{ color: 'var(--color-text-secondary)' }}
            />
          </Space>
        </div>

        {/* Content */}
        <Content style={{ 
          padding: '16px', 
          overflow: 'auto', 
          backgroundColor: 'var(--color-bg-primary)'
        }}>
          {isSearching ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">Searching messages...</Text>
              </div>
            </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            </div>
          )}
        </Content>

        {/* Input Area */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--color-border-light)',
          backgroundColor: 'var(--color-bg-secondary)'
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
        </div>
      </Layout>
    </div>
  );
};