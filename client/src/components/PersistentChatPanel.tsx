import React, { useState, useEffect, useRef, useCallback } from 'react';
import { List, Input, Button, Space, Typography, Badge, Avatar, Popover, Card } from 'antd';
import type { InputRef } from 'antd';
import { SendOutlined, SmileOutlined, UserOutlined, TeamOutlined, SettingOutlined } from '@ant-design/icons';
import { Smile, Laugh, Heart, ThumbsUp, ThumbsDown, PartyPopper, Frown } from 'lucide-react';
import { useAuth } from '../shared/AuthContext';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  chatActions,
  chatThunks,
  selectCurrentRoom,
  selectRooms,
  selectMessagesByRoom,
  selectTypingUsers,
  Message as ChatMessage,
  ChatRoom as ChatRoomType
} from '../redux/slices/chatSlice';
import { chatSocketService } from '../services/socket/ChatSocketService';

const { Text } = Typography;

interface PersistentChatPanelProps {
  className?: string;
  roomId?: string;
  onRoomChange?: (roomId: string) => void;
}

/**
 * Persistent Chat Panel Component
 * Real-time chat interface for the bottom-right panel
 * Uses Redux state and Socket.IO for real-time updates
 */
export const PersistentChatPanel: React.FC<PersistentChatPanelProps> = ({
  className = '',
  roomId = 'general',
  onRoomChange
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentUser = user?.displayName || user?.username || 'Anonymous';
  const userId = user?.id;

  // Redux state
  const currentRoom = useAppSelector(selectCurrentRoom) || roomId;
  const chatRooms = useAppSelector(selectRooms);
  const reduxMessages = useAppSelector(selectMessagesByRoom(currentRoom));
  const typingUsers = useAppSelector(selectTypingUsers(currentRoom));

  // Local state
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(chatSocketService.isConnected());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [reduxMessages, scrollToBottom]);

  // Initialize: fetch rooms and join default room
  useEffect(() => {
    // Ensure socket is connected (reconnect if needed after login)
    if (!chatSocketService.isConnected()) {
      chatSocketService.reconnect();
    }

    // Initial connection status check
    setIsConnected(chatSocketService.isConnected());

    dispatch(chatThunks.fetchRooms());
    dispatch(chatThunks.joinRoom(currentRoom));
    chatSocketService.joinRoom(currentRoom, currentUser);
    dispatch(chatThunks.loadMessages({ roomId: currentRoom }));

    // Check connection status periodically
    const connectionCheck = setInterval(() => {
      const connected = chatSocketService.isConnected();
      setIsConnected(connected);

      // Try to reconnect if disconnected
      if (!connected) {
        chatSocketService.reconnect();
      }
    }, 3000);

    return () => {
      clearInterval(connectionCheck);
      chatSocketService.leaveRoom(currentRoom);
    };
  }, [dispatch, currentRoom, currentUser]);

  // Handle sending messages via Socket.IO
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || !isConnected) return;

    // Send via Socket.IO for real-time delivery
    chatSocketService.sendMessage(currentRoom, inputMessage.trim(), currentUser, userId);

    // Also dispatch to Redux for API persistence
    dispatch(chatThunks.sendMessage({
      roomId: currentRoom,
      content: inputMessage.trim(),
      authorName: currentUser,
      authorId: userId
    }));

    setInputMessage('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    chatSocketService.sendTypingIndicator(currentRoom, false, currentUser);
  }, [inputMessage, currentRoom, currentUser, userId, isConnected, dispatch]);

  // Handle typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    // Send typing indicator
    chatSocketService.sendTypingIndicator(currentRoom, true, currentUser);

    // Clear previous timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      chatSocketService.sendTypingIndicator(currentRoom, false, currentUser);
    }, 2000);
  }, [currentRoom, currentUser]);

  // Stop keyboard events from propagating to game (Phaser.js captures spacebar, arrows, etc.)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  // Handle room change
  const handleRoomChange = useCallback((newRoomId: string) => {
    // Leave current room
    chatSocketService.leaveRoom(currentRoom);
    dispatch(chatThunks.leaveRoom(currentRoom));

    // Join new room
    dispatch(chatActions.setCurrentRoom(newRoomId));
    dispatch(chatThunks.joinRoom(newRoomId));
    chatSocketService.joinRoom(newRoomId, currentUser);
    dispatch(chatThunks.loadMessages({ roomId: newRoomId }));

    setShowRoomList(false);
    onRoomChange?.(newRoomId);
  }, [currentRoom, currentUser, dispatch, onRoomChange]);

  // Render message item using Redux ChatMessage type
  const renderMessage = (message: ChatMessage) => {
    const isSystemMessage = message.authorId === 'system';
    const timestamp = message.createdAt instanceof Date
      ? message.createdAt
      : new Date(message.createdAt);

    return (
      <List.Item
        key={message.id}
        style={{
          padding: '8px 12px',
          borderBottom: 'none',
          backgroundColor: isSystemMessage ? 'var(--color-bg-secondary)' : 'transparent'
        }}
      >
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {!isSystemMessage && (
              <Avatar
                size="small"
                src={message.author?.avatar}
                icon={<UserOutlined />}
                style={{ flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Text
                  strong={!isSystemMessage}
                  type={isSystemMessage ? 'secondary' : undefined}
                  style={{ fontSize: '12px' }}
                >
                  {message.author?.displayName || 'Anonymous'}
                </Text>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {message.isEdited && (
                  <Text type="secondary" style={{ fontSize: '10px', fontStyle: 'italic' }}>
                    (edited)
                  </Text>
                )}
              </div>
              <Text style={{ fontSize: '13px', wordBreak: 'break-word' }}>
                {message.content}
              </Text>
            </div>
          </div>
        </div>
      </List.Item>
    );
  };

  // Render room selector
  const renderRoomSelector = () => {
    // Use default rooms if none loaded from API
    const displayRooms = chatRooms.length > 0 ? chatRooms : [
      { id: 'general', name: 'General', unreadCount: 0 },
      { id: 'team-alpha', name: 'Team Alpha', unreadCount: 0 },
      { id: 'random', name: 'Random', unreadCount: 0 }
    ];

    return (
      <div style={{ padding: '8px 12px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text strong style={{ fontSize: '12px' }}>Chat Rooms</Text>
          {displayRooms.map(room => (
            <div
              key={room.id}
              onClick={() => handleRoomChange(room.id)}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: room.id === currentRoom ? 'var(--color-primary-light)' : 'transparent',
                border: room.id === currentRoom ? '1px solid var(--color-primary)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: '12px', fontWeight: room.id === currentRoom ? 500 : 400 }}>
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
  };

  // Get current room name
  const currentRoomName = chatRooms.find(r => r.id === currentRoom)?.name || currentRoom;

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
              {currentRoomName}
            </Text>
            {typingUsers.length > 0 && (
              <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people typing...`}
              </Text>
            )}
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
            dataSource={reduxMessages}
            renderItem={renderMessage}
            style={{ padding: 0 }}
            locale={{ emptyText: 'No messages yet. Start the conversation!' }}
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
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPressEnter={handleSendMessage}
            placeholder={`Message ${currentRoomName}...`}
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
