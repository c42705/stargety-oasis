import React, { useState, useEffect, useRef, useCallback } from 'react';
import { List, Input, Button, Space, Typography, Badge, Avatar, Popover } from 'antd';
import { SendOutlined, SmileOutlined, UserOutlined } from '@ant-design/icons';
import { Smile, Laugh, Heart, ThumbsUp, ThumbsDown, PartyPopper, Frown } from 'lucide-react';

interface ChatModuleProps {
  className?: string;
  roomId?: string;
  currentUser?: string;
}

interface Message {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system';
}

export const ChatModule: React.FC<ChatModuleProps> = ({
  roomId = 'general',
  currentUser = 'Anonymous'
}) => {
  // State management
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'System',
      message: 'Welcome to the chat! Start a conversation...',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true); // Mock as always connected
  const [users] = useState<string[]>([currentUser, 'Alice', 'Bob']);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Common emoji icons for quick access
  const commonEmojiIcons = [
    { icon: <Smile size={16} />, label: 'smile' },
    { icon: <Laugh size={16} />, label: 'laugh' },
    { icon: <Heart size={16} />, label: 'heart' },
    { icon: <ThumbsUp size={16} />, label: 'thumbs-up' },
    { icon: <ThumbsDown size={16} />, label: 'thumbs-down' },
    { icon: <PartyPopper size={16} />, label: 'party' },
    { icon: <Frown size={16} />, label: 'sad' },
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mock connection - no socket needed for now
  useEffect(() => {
    // Simulate connection
    setIsConnected(true);

    // Add a welcome message when component mounts
    if (messages.length === 1) { // Only the initial system message
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          user: 'System',
          message: `Welcome ${currentUser}! You're now connected to ${roomId}.`,
          timestamp: new Date(),
          type: 'system'
        }]);
      }, 1000);
    }
  }, [roomId, currentUser, messages.length]);

  const sendMessage = useCallback(() => {
    if (!inputMessage.trim() || !isConnected) return;

    const message: Message = {
      id: Date.now().toString(),
      user: currentUser,
      message: inputMessage.trim(),
      timestamp: new Date(),
      type: 'user'
    };

    // Add message to local state (mock functionality)
    setMessages(prev => [...prev, message]);
    setInputMessage('');
    setShowEmojiPicker(false);

    // Simulate a response from another user occasionally
    if (Math.random() > 0.7) {
      setTimeout(() => {
        const responses = [
          "That's interesting!",
          "I agree!",
          "Good point!",
          "Thanks for sharing!",
          "👍",
          "😊"
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
    }
  }, [inputMessage, isConnected, currentUser]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    // Mock typing indicator (simplified for now)
    if (isConnected) {
      // Could implement typing indicator logic here if needed
    }
  }, [isConnected]);



  const addEmoji = useCallback((emojiLabel: string) => {
    setInputMessage(prev => prev + `:${emojiLabel}: `);
    setShowEmojiPicker(false);
  }, []);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Emoji picker content
  const emojiPickerContent = (
    <div style={{ padding: '8px' }}>
      <Space wrap>
        {commonEmojiIcons.map((emojiIcon) => (
          <Button
            key={emojiIcon.label}
            type="text"
            size="small"
            onClick={() => addEmoji(emojiIcon.label)}
            title={emojiIcon.label}
            style={{ padding: '4px' }}
          >
            {emojiIcon.icon}
          </Button>
        ))}
      </Space>
    </div>
  );

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg-primary)'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border-light)',
        backgroundColor: 'var(--color-bg-secondary)'
      }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            Chat - {roomId}
          </Typography.Title>
          <Space>
            <Badge
              status={isConnected ? 'success' : 'error'}
              text={isConnected ? 'Connected' : 'Disconnected'}
            />
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              {users.length} users online
            </Typography.Text>
          </Space>
        </Space>
      </div>

      {/* Messages List */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <List
          dataSource={messages}
          style={{ height: '100%', overflow: 'auto', padding: '8px' }}
          renderItem={(message) => (
            <List.Item style={{ border: 'none', padding: '8px 16px' }}>
              <List.Item.Meta
                avatar={
                  message.type !== 'system' ? (
                    <Avatar
                      size="small"
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: message.user === currentUser ? 'var(--color-accent)' : 'var(--color-bg-tertiary)'
                      }}
                    >
                      {message.user.charAt(0).toUpperCase()}
                    </Avatar>
                  ) : null
                }
                title={
                  message.type !== 'system' ? (
                    <Space>
                      <Typography.Text strong style={{ color: 'var(--color-text-primary)' }}>
                        {message.user}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
                        {formatTimestamp(message.timestamp)}
                      </Typography.Text>
                    </Space>
                  ) : null
                }
                description={
                  <Typography.Text
                    style={{
                      color: message.type === 'system' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                      fontStyle: message.type === 'system' ? 'italic' : 'normal'
                    }}
                  >
                    {message.message}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--color-border-light)',
        backgroundColor: 'var(--color-bg-secondary)'
      }}>
        <Space.Compact style={{ width: '100%' }}>
          <Popover
            content={emojiPickerContent}
            trigger="click"
            placement="topLeft"
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
          >
            <Button
              icon={<SmileOutlined />}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </Popover>

          <Input
            value={inputMessage}
            onChange={handleInputChange}
            onPressEnter={sendMessage}
            placeholder="Type a message..."
            disabled={!isConnected}
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          />

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            style={{
              backgroundColor: 'var(--color-accent)',
              borderColor: 'var(--color-accent)'
            }}
          />
        </Space.Compact>
      </div>
    </div>
  );
};

export default ChatModule;
