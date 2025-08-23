import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Smile, Laugh, Heart, ThumbsUp, ThumbsDown, PartyPopper, Frown } from 'lucide-react';
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

          <div ref={messagesEndRef} />
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
