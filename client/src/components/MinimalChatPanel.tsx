import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Layout, Input, Button, message, Spin, Empty, Space, List, Divider } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { chatThunks, setCurrentRoom, addMessage, selectMessagesByRoom, selectIsLoading, selectError } from '../redux/slices/chatSlice';
import { chatSocketService } from '../services/socket/ChatSocketService';
import { Message } from '../redux/types/chat';
import MessageItem from '../modules/chat/components/MessageItem';
import { useTheme } from '../shared/ThemeContext';

const { Content, Footer } = Layout;
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
  const { currentTheme } = useTheme();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Memoize theme-aware styles to prevent unnecessary recalculations
  const styles = useMemo(() => ({
    container: {
      height: '100%',
      backgroundColor: currentTheme.cssVariables['--color-bg-primary'],
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: currentTheme.cssVariables['--spacing-md'],
      backgroundColor: currentTheme.cssVariables['--color-bg-secondary'],
    },
    emojiPicker: {
      marginTop: currentTheme.cssVariables['--spacing-sm'],
      padding: currentTheme.cssVariables['--spacing-sm'],
      backgroundColor: currentTheme.cssVariables['--color-bg-elevated'],
      borderRadius: currentTheme.cssVariables['--border-radius'],
      boxShadow: currentTheme.cssVariables['--shadow-md'],
    },
    inputArea: {
      padding: currentTheme.cssVariables['--spacing-md'],
      borderTop: `1px solid ${currentTheme.cssVariables['--color-border-light']}`,
      backgroundColor: currentTheme.cssVariables['--color-bg-primary'],
    },
    errorArea: {
      padding: `${currentTheme.cssVariables['--spacing-sm']} ${currentTheme.cssVariables['--spacing-md']}`,
      backgroundColor: currentTheme.cssVariables['--color-error'],
      color: currentTheme.cssVariables['--color-text-inverse'],
      fontSize: '12px',
    },
  }), [currentTheme]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReply = () => {
    // For MVP, just focus on input (can be enhanced later)
    setInputText(`Replying to message...`);
  };

  const handleEdit = () => {
    // Edit is handled by MessageItem component internally
  };

  const handleDelete = () => {
    // Delete is handled by MessageItem component internally
  };

  if (isLoading && messages.length === 0) {
    return (
      <Layout style={{ height: '100%' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" tip="Loading messages..." />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      {/* Messages Area */}
      <Content style={styles.messagesArea}>
        {messages.length === 0 ? (
          <Empty description="No messages yet. Start the conversation!" />
        ) : (
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item key={msg.id} style={{ padding: 0, marginBottom: currentTheme.cssVariables['--spacing-md'] }}>
                <div style={{ width: '100%' }}>
                  <MessageItem
                    message={msg}
                    isCurrentUser={msg.authorId === currentUserId}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  {/* Emoji Picker */}
                  {showEmojiPicker && selectedMessageId === msg.id && (
                    <Space style={styles.emojiPicker} wrap>
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
                          style={{ fontSize: '20px' }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </Space>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
        <div ref={messagesEndRef} />
      </Content>

      {/* Input Area */}
      <Footer style={styles.inputArea}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
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
        </Space.Compact>
      </Footer>

      {error && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={styles.errorArea}>
            {error}
          </div>
        </>
      )}
    </Layout>
  );
};

export default MinimalChatPanel;
