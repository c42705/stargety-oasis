import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Smile } from 'lucide-react';
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


  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventBus = useEventBus();

  // Common emojis for quick access
  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😮'];



  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);



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
      {/* Main Chat Area */}
      <div className="chat-main">
        <div className="chat-header">
          <h3>Chat - {roomId}</h3>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="user-count">{users.length} users online</span>
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
            <Smile size={20} />
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
            <Send size={20} />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
