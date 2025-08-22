import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Lock, Plus, Circle, Send, Smile } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useEventBus } from '../../shared/EventBusContext';
import './ChatModule.css';

interface ChatMessage {
  id: string;
  message: string;
  user: string;
  timestamp: Date;
  type: 'message' | 'system' | 'emoji';
}

interface User {
  id: string;
  name: string;
  isOnline: boolean;
  lastSeen?: Date;
}

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  memberCount: number;
  unreadCount?: number;
  isActive?: boolean;
}

interface DirectMessage {
  id: string;
  username: string;
  displayName: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  unreadCount?: number;
  lastMessage?: string;
  timestamp?: string;
}

interface ChatModuleProps {
  serverUrl?: string;
  roomId?: string;
  currentUser: string;
  className?: string;
}

export const ChatModule: React.FC<ChatModuleProps> = ({
  serverUrl = 'http://localhost:3001',
  roomId = 'general',
  currentUser,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [selectedDM, setSelectedDM] = useState<string>('');
  const [currentRoomId, setCurrentRoomId] = useState(roomId);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventBus = useEventBus();

  // Common emojis for quick access
  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😮'];

  // Mock data for channels
  const mockChannels: Channel[] = [
    { id: 'general', name: 'general', type: 'public', memberCount: 3, unreadCount: 0, isActive: true },
    { id: 'random', name: 'random', type: 'public', memberCount: 2, unreadCount: 0 },
    { id: 'development', name: 'development', type: 'public', memberCount: 7, unreadCount: 2 },
    { id: 'design', name: 'design', type: 'public', memberCount: 1, unreadCount: 0 },
    { id: 'marketing', name: 'marketing', type: 'private', memberCount: 4, unreadCount: 1 },
    { id: 'leadership', name: 'leadership', type: 'private', memberCount: 3, unreadCount: 0 }
  ];

  // Mock data for direct messages
  const mockDirectMessages: DirectMessage[] = [
    {
      id: 'alice',
      username: 'alice.johnson',
      displayName: 'Alice Johnson',
      status: 'online',
      unreadCount: 2,
      lastMessage: 'Hey, can we discuss the project?',
      timestamp: '2 min ago'
    },
    {
      id: 'bob',
      username: 'bob.smith',
      displayName: 'Bob Smith',
      status: 'busy',
      unreadCount: 0,
      lastMessage: 'Thanks for the update!',
      timestamp: '1 hour ago'
    },
    {
      id: 'charlie',
      username: 'charlie.davis',
      displayName: 'Charlie Davis',
      status: 'away',
      unreadCount: 1,
      lastMessage: 'I\'ll be back in 30 minutes',
      timestamp: '3 hours ago'
    }
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Circle size={10} className="status-online" fill="currentColor" />;
      case 'busy': return <Circle size={10} className="status-busy" fill="currentColor" />;
      case 'away': return <Circle size={10} className="status-away" fill="currentColor" />;
      case 'offline': return <Circle size={10} className="status-offline" fill="currentColor" />;
      default: return <Circle size={10} className="status-offline" fill="currentColor" />;
    }
  };

  const handleChannelClick = (channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedDM('');
    setCurrentRoomId(channelId);
    // Clear messages when switching channels
    setMessages([]);
  };

  const handleDMClick = (dmId: string) => {
    setSelectedDM(dmId);
    setSelectedChannel('');
    setCurrentRoomId(`dm-${dmId}`);
    // Clear messages when switching to DM
    setMessages([]);
  };

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    eventBus.publish('chat:message', {
      message: message.message,
      user: message.user,
      timestamp: message.timestamp,
    });
  }, [eventBus]);

  const handleUserJoined = useCallback((user: string) => {
    setUsers(prev => {
      const existingUser = prev.find(u => u.name === user);
      if (existingUser) {
        return prev.map(u => u.name === user ? { ...u, isOnline: true } : u);
      }
      return [...prev, { id: Date.now().toString(), name: user, isOnline: true }];
    });

    addMessage({
      id: Date.now().toString(),
      message: `${user} joined the chat`,
      user: 'System',
      timestamp: new Date(),
      type: 'system',
    });

    eventBus.publish('chat:userJoined', { user });
  }, [addMessage, eventBus]);

  const handleUserLeft = useCallback((user: string) => {
    setUsers(prev => prev.map(u =>
      u.name === user ? { ...u, isOnline: false, lastSeen: new Date() } : u
    ));

    addMessage({
      id: Date.now().toString(),
      message: `${user} left the chat`,
      user: 'System',
      timestamp: new Date(),
      type: 'system',
    });

    eventBus.publish('chat:userLeft', { user });
  }, [addMessage, eventBus]);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(serverUrl, {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, user: currentUser });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat-message', (data: {
      id: string;
      message: string;
      user: string;
      timestamp: string;
      type?: string;
    }) => {
      addMessage({
        ...data,
        timestamp: new Date(data.timestamp),
        type: (data.type as 'message' | 'system' | 'emoji') || 'message',
      });
    });

    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    socket.on('user-typing', (data: { user: string; isTyping: boolean }) => {
      setIsTyping(prev => {
        if (data.isTyping && !prev.includes(data.user)) {
          return [...prev, data.user];
        } else if (!data.isTyping) {
          return prev.filter(user => user !== data.user);
        }
        return prev;
      });
    });

    socket.on('users-list', (usersList: string[]) => {
      setUsers(usersList.map(user => ({
        id: Date.now().toString() + user,
        name: user,
        isOnline: true,
      })));
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl, roomId, currentUser, addMessage, handleUserJoined, handleUserLeft]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(() => {
    if (!inputMessage.trim() || !socketRef.current || !isConnected) return;

    const messageData = {
      id: Date.now().toString(),
      message: inputMessage.trim(),
      user: currentUser,
      timestamp: new Date().toISOString(),
      roomId,
    };

    socketRef.current.emit('send-message', messageData);
    setInputMessage('');
    setShowEmojiPicker(false);

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketRef.current.emit('typing', { user: currentUser, isTyping: false });
  }, [inputMessage, currentUser, roomId, isConnected]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    // Typing indicator
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing', { user: currentUser, isTyping: true });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing', { user: currentUser, isTyping: false });
        }
      }, 1000);
    }
  }, [currentUser, isConnected]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const addEmoji = useCallback((emoji: string) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-module ${className}`}>
      {/* Channels Sidebar */}
      <div className="channels-sidebar">
        {/* Channels Section */}
        <div className="channels-section">
          <div className="section-header">
            <h4>Channels</h4>
            <button className="add-button" title="Add Channel">
              <Plus size={14} />
            </button>
          </div>

          <div className="channels-list">
            {mockChannels.map((channel) => (
              <div
                key={channel.id}
                className={`channel-item ${selectedChannel === channel.id ? 'selected' : ''}`}
                onClick={() => handleChannelClick(channel.id)}
              >
                <div className="channel-info">
                  <span className="channel-icon">
                    {channel.type === 'private' ? <Lock size={14} /> : <Hash size={14} />}
                  </span>
                  <span className="channel-name">{channel.name}</span>
                  <span className="member-count">{channel.memberCount}</span>
                </div>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="unread-badge">{channel.unreadCount}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="direct-messages-section">
          <div className="section-header">
            <h4>Direct Messages</h4>
            <button className="add-button" title="New Message">
              <Plus size={14} />
            </button>
          </div>

          <div className="dm-list">
            {mockDirectMessages.map((dm) => (
              <div
                key={dm.id}
                className={`dm-item ${selectedDM === dm.id ? 'selected' : ''}`}
                onClick={() => handleDMClick(dm.id)}
              >
                <div className="dm-avatar">
                  <div className="avatar-circle">
                    {dm.displayName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="status-indicator">
                    {getStatusIcon(dm.status)}
                  </span>
                </div>

                <div className="dm-info">
                  <div className="dm-header">
                    <span className="dm-name">{dm.displayName}</span>
                    {dm.timestamp && (
                      <span className="dm-timestamp">{dm.timestamp}</span>
                    )}
                  </div>
                  {dm.lastMessage && (
                    <div className="dm-preview">{dm.lastMessage}</div>
                  )}
                </div>

                {dm.unreadCount && dm.unreadCount > 0 && (
                  <span className="unread-badge">{dm.unreadCount}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        <div className="chat-header">
          <h3>
            {selectedChannel ? `# ${selectedChannel}` :
             selectedDM ? mockDirectMessages.find(dm => dm.id === selectedDM)?.displayName :
             `# ${currentRoomId}`}
          </h3>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢' : '🔴'}
            </span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="chat-content">
          <div className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.type} ${
                message.user === currentUser ? 'own-message' : ''
              }`}
            >
              {message.type !== 'system' && (
                <div className="message-header">
                  <span className="username">{message.user}</span>
                  <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                </div>
              )}
              <div className="message-content">{message.message}</div>
            </div>
          ))}

          {isTyping.length > 0 && (
            <div className="typing-indicator">
              {isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="users-sidebar">
          <h4>Online Users ({users.filter(u => u.isOnline).length})</h4>
          <div className="users-list">
            {users.map((user) => (
              <div key={user.id} className={`user ${user.isOnline ? 'online' : 'offline'}`}>
                <span className="user-status">
                  {user.isOnline ? '🟢' : '⚫'}
                </span>
                <span className="username">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chat-input-container">
        {showEmojiPicker && (
          <div className="emoji-picker">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                className="emoji-button"
                onClick={() => addEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="input-row">
          <button
            className="emoji-toggle"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😀
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="message-input"
          />

          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="send-button"
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
