import React, { useState, useRef, useEffect } from 'react';
import { Button, Space, Typography, Divider, Collapse, Avatar, Input, Empty } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { Message as ModuleMessage } from '../../../types/chat';
import { Message as ReduxMessage } from '../../../redux/types/chat';
import { useAppDispatch } from '../../../redux/hooks';
import { chatThunks } from '../../../redux/slices/chatSlice';
import MessageItem from './MessageItem';

const { Text } = Typography;
const { TextArea } = Input;

// ThreadView accepts either module types or redux types for flexibility
type ThreadMessage = ModuleMessage | ReduxMessage;

interface ThreadViewProps {
  threadRootMessage: ThreadMessage;
  threadMessages: ThreadMessage[];
  currentUserId?: string;
  onReply?: (messageId: string) => void;
  onClose?: () => void;
  isExpanded?: boolean;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  threadRootMessage,
  threadMessages,
  currentUserId = 'current-user',
  onReply,
  onClose,
  isExpanded = false
}) => {
  const dispatch = useAppDispatch();
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await dispatch(chatThunks.sendMessage({
        roomId: threadRootMessage.roomId,
        content: replyContent.trim(),
        parentId: threadRootMessage.id,
        threadId: threadRootMessage.threadId || threadRootMessage.id
      })).unwrap();

      setReplyContent('');
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const replyCount = threadMessages.length;
  const lastReply = threadMessages[threadMessages.length - 1];

  if (!isExpanded) {
    return (
      <div className="thread-preview" style={{ marginTop: 8 }}>
        <Button
          type="text"
          size="small"
          icon={<MessageOutlined />}
          onClick={() => onReply?.(threadRootMessage.id)}
        >
          <Text type="secondary">
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            {lastReply && ` • Last reply ${new Date(lastReply.createdAt).toLocaleDateString()}`}
          </Text>
        </Button>
      </div>
    );
  }

  return (
    <div className="thread-view" style={{ 
      marginLeft: 48, 
      marginTop: 8, 
      padding: '12px 16px',
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      border: '1px solid #d9d9d9'
    }}>
      {/* Thread Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <MessageOutlined />
          <Text strong>Thread ({replyCount} {replyCount === 1 ? 'reply' : 'replies'})</Text>
        </Space>
        {onClose && (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        )}
      </div>

      {/* Thread Root Message */}
      <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e8e8e8' }}>
        <MessageItem
          message={threadRootMessage}
          isCurrentUser={threadRootMessage.authorId === currentUserId}
          onReply={onReply}
        />
      </div>

      {/* Thread Replies */}
      <div className="thread-replies" style={{ maxHeight: 400, overflowY: 'auto' }}>
        {threadMessages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No replies yet"
            style={{ padding: '20px 0' }}
          />
        ) : (
          threadMessages.map((message) => (
            <div key={message.id} style={{ marginBottom: 8 }}>
              <MessageItem
                message={message}
                isCurrentUser={message.authorId === currentUserId}
                onReply={onReply}
              />
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8e8e8' }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Write a reply..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isSubmitting}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendReply}
            disabled={!replyContent.trim() || isSubmitting}
            loading={isSubmitting}
          >
            Reply
          </Button>
        </Space.Compact>
      </div>
    </div>
  );
};

export default ThreadView;
