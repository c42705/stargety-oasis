import React, { useState, useCallback, useMemo } from 'react';
import { 
  List, 
  Avatar, 
  Typography, 
  Space, 
  Button, 
  Input, 
  Card,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  SendOutlined, 
  MessageOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { Message, User } from '../../../types/chat';
import { MessageEditor } from './MessageEditor';

const { Text } = Typography;

interface ThreadViewProps {
  messageId: string;
  messages: Message[];
  currentUser: User;
  onReply: (messageId: string, content: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  className?: string;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  messageId,
  messages,
  currentUser,
  onReply,
  onAddReaction,
  onRemoveReaction,
  className = ''
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Filter messages that belong to this thread
  const threadMessages = useMemo(() => {
    return messages.filter(msg => msg.threadId === messageId || msg.parentId === messageId);
  }, [messages, messageId]);

  // Get the root message (the one this thread is replying to)
  const rootMessage = useMemo(() => {
    return messages.find(msg => msg.id === messageId);
  }, [messages, messageId]);

  const handleSendReply = useCallback(() => {
    if (!replyContent.trim()) return;
    
    onReply(messageId, replyContent.trim());
    setReplyContent('');
    setIsReplying(false);
  }, [messageId, replyContent, onReply]);

  const handleCancelReply = useCallback(() => {
    setReplyContent('');
    setIsReplying(false);
  }, []);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderThreadMessage = (message: Message) => (
    <div key={message.id} style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <Avatar
          size="small"
          src={message.author.avatar}
          icon={<UserOutlined />}
        >
          {message.author.username.charAt(0).toUpperCase()}
        </Avatar>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Text
              strong
              style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}
            >
              {message.author.username}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {formatTimestamp(message.createdAt)}
            </Text>
          </div>
          
          <Text style={{ fontSize: '13px', lineHeight: '1.4', wordBreak: 'break-word' }}>
            {message.content.text}
          </Text>
          
          {/* Reactions placeholder */}
          {message.reactions.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#999' }}>
              {message.reactions.length} reaction{message.reactions.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!expanded) {
    return (
      <Card 
        size="small" 
        style={{ 
          marginTop: '8px', 
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Thread ({threadMessages.length + 1} messages)
          </Text>
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => setExpanded(true)}
            style={{ fontSize: '10px' }}
          >
            View
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`thread-view ${className}`} style={{ width: '100%' }}>
      {/* Thread Header */}
      <Card 
        size="small" 
        style={{ 
          marginBottom: '12px', 
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
            <Text strong style={{ fontSize: '12px' }}>
              Conversation Thread
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              ({threadMessages.length + 1} messages)
            </Text>
          </div>
          
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => setExpanded(false)}
            style={{ fontSize: '10px' }}
          >
            Collapse
          </Button>
        </div>
        
        {/* Root Message Preview */}
        {rootMessage && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--color-bg-primary)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Avatar size="small" src={rootMessage.author.avatar} icon={<UserOutlined />}>
                {rootMessage.author.username.charAt(0).toUpperCase()}
              </Avatar>
              <Text style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {rootMessage.author.username} • {formatTimestamp(rootMessage.createdAt)}
              </Text>
            </div>
            <Text style={{ fontSize: '12px', lineHeight: '1.3' }}>
              {rootMessage.content.text}
            </Text>
          </div>
        )}
      </Card>

      {/* Thread Messages */}
      <div style={{ marginBottom: '12px' }}>
        {threadMessages.map(renderThreadMessage)}
      </div>

      {/* Reply Input */}
      {!isReplying ? (
        <Button
          type="text"
          size="small"
          icon={<MessageOutlined />}
          onClick={() => setIsReplying(true)}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            fontSize: '12px',
            color: 'var(--color-text-secondary)'
          }}
        >
          Reply to thread
        </Button>
      ) : (
        <div style={{ marginTop: '8px' }}>
          <MessageEditor
            initialValue={replyContent}
            onSave={handleSendReply}
            onCancel={handleCancelReply}
            placeholder="Reply to this thread..."
            multiline={false}
            maxLength={500}
            autoFocus={true}
          />
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />
    </div>
  );
};