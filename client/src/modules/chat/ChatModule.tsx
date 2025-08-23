import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Smile, Laugh, Heart, ThumbsUp, ThumbsDown, PartyPopper, Frown } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useEventBus } from '../../shared/EventBusContext';
import './ChatModule.css';

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
  className = '', 
  roomId = 'general',
  currentUser = 'Anonymous'
}) => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventBus = useEventBus();

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

  // Socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-room', { roomId, user: currentUser });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user-joined', (data: { user: string; users: string[] }) => {
      setUsers(data.users);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: 'System',
        message: `${data.user} joined the chat`,
        timestamp: new Date(),
        type: 'system'
      }]);
    });

    newSocket.on('user-left', (data: { user: string; users: string[] }) => {
      setUsers(data.users);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: 'System',
        message: `${data.user} left the chat`,
        timestamp: new Date(),
        type: 'system'
      }]);
    });

    newSocket.on('typing', (data: { user: string; isTyping: boolean }) => {
      setIsTyping(prev => {
        if (data.isTyping) {
          return prev.includes(data.user) ? prev : [...prev, data.user];
        } else {
          return prev.filter(user => user !== data.user);
        }
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, currentUser]);

  const sendMessage = useCallback(() => {
    if (!inputMessage.trim() || !socket || !isConnected) return;

    const message: Message = {
      id: Date.now().toString(),
      user: currentUser,
      message: inputMessage.trim(),
      timestamp: new Date(),
      type: 'user'
    };

    socket.emit('message', { roomId, message });
    setInputMessage('');
    setShowEmojiPicker(false);
  }, [inputMessage, socket, isConnected, roomId, currentUser]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    
    if (socket && isConnected) {
      socket.emit('typing', { roomId, user: currentUser, isTyping: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId, user: currentUser, isTyping: false });
      }, 1000);
    }
  }, [socket, isConnected, roomId, currentUser]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const addEmoji = useCallback((emojiLabel: string) => {
    setInputMessage(prev => prev + `:${emojiLabel}: `);
    setShowEmojiPicker(false);
  }, []);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-module ${className}`}>
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
              {commonEmojiIcons.map((emojiIcon) => (
                <button
                  key={emojiIcon.label}
                  className="emoji-button"
                  onClick={() => addEmoji(emojiIcon.label)}
                  title={emojiIcon.label}
                >
                  {emojiIcon.icon}
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

export default ChatModule;
