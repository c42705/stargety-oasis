import React, { useState, useEffect, useRef, useCallback } from 'react';
import { List, Input, Button, Space, Typography, Badge, Avatar, Popover, Card } from 'antd';
import { SendOutlined, SmileOutlined, UserOutlined, TeamOutlined, SettingOutlined } from '@ant-design/icons';
import { Smile, Laugh, Heart, ThumbsUp, ThumbsDown, PartyPopper, Frown } from 'lucide-react';
import { useAuth } from '../shared/AuthContext';

const { Text } = Typography;

interface PersistentChatPanelProps {
  className?: string;
  roomId?: string;
  onRoomChange?: (roomId: string) => void;
}

interface Message {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system';
  avatar?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  unreadCount: number;
  lastMessage?: string;
  lastActivity?: Date;
}

/**
 * Persistent Chat Panel Component
 * Real-time chat interface for the bottom-right panel
 */
export const PersistentChatPanel: React.FC<PersistentChatPanelProps> = ({
  className = '',
  roomId = 'general',
  onRoomChange
}) => {
  const { user } = useAuth();
  const currentUser = user?.displayName || user?.username || 'Anonymous';

  // State management
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'System',
      message: `Welcome to the chat, ${currentUser}! Start a conversation...`,
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected] = useState(true);
  const [activeRoom, setActiveRoom] = useState(roomId);
  const [chatRooms] = useState<ChatRoom[]>([
    { id: 'general', name: 'General', unreadCount: 0, lastMessage: 'Welcome to the chat!', lastActivity: new Date() },
    { id: 'team-alpha', name: 'Team Alpha', unreadCount: 2, lastMessage: 'Meeting at 3pm', lastActivity: new Date() },
    { id: 'team-beta', name: 'Team Beta', unreadCount: 0, lastMessage: 'Project update', lastActivity: new Date() },
    { id: 'random', name: 'Random', unreadCount: 1, lastMessage: 'Coffee break?', lastActivity: new Date() }
  ]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // Common emoji icons for quick access
  const commonEmojiIcons = [
    { icon: <Smile size={16} />, label: '😊', text: ':smile:' },
    { icon: <Laugh size={16} />, label: '😂', text: ':laugh:' },
    { icon: <Heart size={16} />, label: '❤️', text: ':heart:' },
    { icon: <ThumbsUp size={16} />, label: '👍', text: ':thumbs-up:' },
    { icon: <ThumbsDown size={16} />, label: '👎', text: ':thumbs-down:' },
    { icon: <PartyPopper size={16} />, label: '🎉', text: ':party:' },
    { icon: <Frown size={16} />, label: '😢', text: ':sad:' }
  ];

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle sending messages
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      user: currentUser,
      message: inputMessage.trim(),
      timestamp: new Date(),
      type: 'user',
      avatar: undefined // TODO: Add avatar support to User type
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // Simulate response (in real app, this would be handled by WebSocket/API)
    setTimeout(() => {
      const responses = [
        "That's interesting!",
        "I agree with that.",
        "Thanks for sharing!",
        "Good point!",
        "Let me think about that...",
        "Sounds good to me!"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        user: 'Alice',
        message: randomResponse,
        timestamp: new Date(),
        type: 'user'
      };
      
      setMessages(prev => [...prev, responseMessage]);
    }, 1000 + Math.random() * 2000);
  }, [inputMessage, currentUser]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  // Handle room change
  const handleRoomChange = useCallback((newRoomId: string) => {
    setActiveRoom(newRoomId);
    setShowRoomList(false);
    onRoomChange?.(newRoomId);
    
    // Clear messages and add welcome message for new room
    const roomName = chatRooms.find(r => r.id === newRoomId)?.name || newRoomId;
    setMessages([
      {
        id: Date.now().toString(),
        user: 'System',
        message: `Switched to ${roomName} chat room`,
        timestamp: new Date(),
        type: 'system'
      }
    ]);
  }, [chatRooms, onRoomChange]);

  // Render message item
  const renderMessage = (message: Message) => (
    <List.Item
      key={message.id}
      style={{
        padding: '8px 12px',
        borderBottom: 'none',
        backgroundColor: message.type === 'system' ? 'var(--color-bg-secondary)' : 'transparent'
      }}
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {message.type === 'user' && (
            <Avatar
              size="small"
              src={message.avatar}
              icon={<UserOutlined />}
              style={{ flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Text
                strong={message.type === 'user'}
                type={message.type === 'system' ? 'secondary' : undefined}
                style={{ fontSize: '12px' }}
              >
                {message.user}
              </Text>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </div>
            <Text style={{ fontSize: '13px', wordBreak: 'break-word' }}>
              {message.message}
            </Text>
          </div>
        </div>
      </div>
    </List.Item>
  );

  // Render room selector
  const renderRoomSelector = () => (
    <div style={{ padding: '8px 12px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Text strong style={{ fontSize: '12px' }}>Chat Rooms</Text>
        {chatRooms.map(room => (
          <div
            key={room.id}
            onClick={() => handleRoomChange(room.id)}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: room.id === activeRoom ? 'var(--color-primary-light)' : 'transparent',
              border: room.id === activeRoom ? '1px solid var(--color-primary)' : '1px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: '12px', fontWeight: room.id === activeRoom ? 500 : 400 }}>
                {room.name}
              </Text>
              {room.unreadCount > 0 && (
                <Badge count={room.unreadCount} size="small" />
              )}
            </div>
            {room.lastMessage && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {room.lastMessage}
              </Text>
            )}
          </div>
        ))}
      </Space>
    </div>
  );

  return (
    <div className={`persistent-chat-panel ${className}`} style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg-primary)'
    }}>
      {/* Chat Header */}
      <Card size="small" style={{ margin: '8px', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge status={isConnected ? 'success' : 'error'} />
            <Text strong style={{ fontSize: '14px' }}>
              {chatRooms.find(r => r.id === activeRoom)?.name || 'Chat'}
            </Text>
          </div>
          <Space size="small">
            <Popover
              content={renderRoomSelector()}
              title="Switch Room"
              trigger="click"
              open={showRoomList}
              onOpenChange={setShowRoomList}
              placement="topRight"
            >
              <Button
                type="text"
                icon={<TeamOutlined />}
                size="small"
                title="Switch Room"
              />
            </Popover>
            <Button
              type="text"
              icon={<SettingOutlined />}
              size="small"
              title="Chat Settings"
            />
          </Space>
        </div>
      </Card>

      {/* Messages Area */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        margin: '0 8px'
      }}>
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border-light)',
          borderRadius: '6px'
        }}>
          <List
            dataSource={messages}
            renderItem={renderMessage}
            style={{ padding: 0 }}
          />
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-secondary)' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onPressEnter={handleSendMessage}
            placeholder={`Message ${chatRooms.find(r => r.id === activeRoom)?.name || 'chat'}...`}
            disabled={!isConnected}
            style={{ fontSize: '13px' }}
          />
          <Popover
            content={
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
                {commonEmojiIcons.map((emoji, index) => (
                  <Button
                    key={index}
                    type="text"
                    size="small"
                    onClick={() => handleEmojiSelect(emoji.text)}
                    style={{ padding: '4px', minWidth: 'auto' }}
                  >
                    {emoji.label}
                  </Button>
                ))}
              </div>
            }
            title="Quick Emojis"
            trigger="click"
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
          >
            <Button
              icon={<SmileOutlined />}
              disabled={!isConnected}
              title="Add Emoji"
            />
          </Popover>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            title="Send Message"
          />
        </Space.Compact>
      </div>
    </div>
  );
};

export default PersistentChatPanel;
