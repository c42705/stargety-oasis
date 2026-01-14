import React, { useEffect, useRef, useState } from 'react';
import { Input, Button, message, Spin, Empty } from 'antd';
import { SendOutlined, SmileOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { chatThunks, setCurrentRoom, addMessage, selectMessagesByRoom, selectIsLoading, selectError } from '../redux/slices/chatSlice';
import { chatSocketService } from '../services/socket/ChatSocketService';
import { Message } from '../redux/types/chat';
import MessageItem from '../modules/chat/components/MessageItem';

const { TextArea } = Input;

interface MinimalChatPanelProps {
  roomId: string;
  currentUserId: string;
  currentUsername: string;
}

const MinimalChatPanel: React.FC<MinimalChatPanelProps> = ({ roomId, currentUserId }) => {
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectMessagesByRoom(roomId));
  const isLoading = useAppSelector(selectIsLoading(roomId));
  const error = useAppSelector(selectError);
  
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Common emojis for quick reactions
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

  // Join room and load messages on mount
  useEffect(() => {
    dispatch(setCurrentRoom(roomId));
    dispatch(chatThunks.loadMessages({ roomId, page: 1 }));
    
    // Join room via Socket.IO
    chatSocketService.joinRoom(roomId);

    // Listen for new messages
    const handleNewMessage = (...args: unknown[]) => {
      const [message] = args;
      if (message && typeof message === 'object' && 'roomId' in message && message.roomId === roomId) {
        dispatch(addMessage({ roomId, message: message as Message }));
      }
    };

    chatSocketService.on('chat:message', handleNewMessage);

    return () => {
      chatSocketService.leaveRoom(roomId);
      chatSocketService.off('chat:message');
    };
  }, [dispatch, roomId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      await dispatch(chatThunks.sendMessage({
        roomId,
        content: inputText.trim(),
      })).unwrap();
      setInputText('');
    } catch (err) {
      message.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReply = (messageId: string) => {
    // For MVP, just focus on input (can be enhanced later)
    setInputText(`Replying to message...`);
  };

  const handleEdit = (messageId: string, content: string) => {
    // Edit is handled by MessageItem component internally
  };

  const handleDelete = (messageId: string) => {
    // Delete is handled by MessageItem component internally
  };

  const toggleEmojiPicker = (messageId: string) => {
    if (selectedMessageId === messageId) {
      setShowEmojiPicker(!showEmojiPicker);
    } else {
      setSelectedMessageId(messageId);
      setShowEmojiPicker(true);
    }
  };

  if (isLoading && messages.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="Loading messages..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#f5f5f5' }}>
        {messages.length === 0 ? (
          <Empty description="No messages yet. Start the conversation!" />
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: '16px' }}>
                <MessageItem
                  message={msg}
                  isCurrentUser={msg.authorId === currentUserId}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
                {/* Emoji Picker */}
                {showEmojiPicker && selectedMessageId === msg.id && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {commonEmojis.map((emoji) => (
                      <Button
                        key={emoji}
                        type="text"
                        size="small"
                        onClick={() => {
                          dispatch(chatThunks.addReaction({ messageId: msg.id, emoji }));
                          setShowEmojiPicker(false);
                          setSelectedMessageId(null);
                        }}
                        style={{ fontSize: '20px', padding: '4px 8px' }}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: '16px', borderTop: '1px solid #e8e8e8', backgroundColor: 'white' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
          >
            Send
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 16px', backgroundColor: '#fff2f0', color: '#ff4d4f', fontSize: '12px' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default MinimalChatPanel;
